import { Router } from 'express';
import mongoose from 'mongoose';
import { Message } from './message.model';
import { Room } from '../rooms/room.model';
import { User } from '../auth/user.model';
import { requireAuth } from '../../shared/middleware/auth';
import { cacheService } from '../../shared/cache/cache.service';
import { getIO } from '../../shared/socket/index';
import { checkSocketRateLimit } from '../../shared/middleware/rateLimit';
import { createNotification } from '../notifications/notifications.service';

const router = Router();
const slowModeMap = new Map();

function parseMentions(text: string) {
  const matches = text.match(/@(\w+)/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

async function resolveMentionIds(usernames: string[], senderId: string) {
  if (usernames.length === 0) return [];
  const users = await User.find({ username: { $in: usernames } }).select('_id').lean();
  return users.map((u) => u._id).filter((id) => id.toString() !== senderId);
}

router.use(requireAuth);

router.get('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { after, before, limit } = req.query;

    const cacheKey = `msgs:${roomId}:${req.user.id}`;
    if (!after && !before && (!limit || parseInt(limit as string, 10) === 50)) {
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return res.json({ messages: cached });
      }
    }
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    if (room.type === 'private') {
      const isMember = room.members.some((m) => m.user.toString() === req.user.id);
      if (!isMember) return res.status(403).json({ error: 'not a member of this private room' });
    }

    const query: any = { room: roomId };
    if (after) {
      if (!mongoose.Types.ObjectId.isValid(after as string)) {
        return res.status(400).json({ error: 'invalid after parameter' });
      }
      query._id = { $gt: new mongoose.Types.ObjectId(after as string) };
    } else if (before) {
      if (!mongoose.Types.ObjectId.isValid(before as string)) {
        return res.status(400).json({ error: 'invalid before parameter' });
      }
      query._id = { $lt: new mongoose.Types.ObjectId(before as string) };
    }

    const cap = Math.min(parseInt(limit as string, 10) || 50, 500);
    let messages;
    if (after) {
      // Polling new messages: return chronologically ascending
      messages = await Message.find(query)
        .populate('sender', 'username profileImage')
        .sort({ _id: 1 })
        .limit(cap);
    } else {
      // Initial load or loading older: fetch newest first, then reverse for chronological order
      messages = await Message.find(query)
        .populate('sender', 'username profileImage')
        .sort({ _id: -1 })
        .limit(cap);
      messages = messages.reverse();
    }

    const filtered = messages.filter((m) => {
      if (m.deletedFor && m.deletedFor.some((id) => id.toString() === req.user.id)) {
        return false;
      }
      return true;
    });

    const replyToIds = filtered.filter((m) => m.replyTo).map((m) => m.replyTo);
    let replyToMap: Record<string, any> = {};
    if (replyToIds.length > 0) {
      const replyToMsgs = await Message.find({ _id: { $in: replyToIds } }).populate('sender', 'username').lean();
      for (const rm of replyToMsgs) {
        replyToMap[rm._id.toString()] = {
          id: rm._id.toString(),
          senderUsername: (rm.sender as any)?.username || 'unknown',
          text: rm.text ? rm.text.substring(0, 100) : '',
        };
      }
    }

    const clientMsgs = filtered.map((m) => ({
      ...m.toClient(),
      replyToData: replyToMap[m._id.toString()] || null,
    }));

    if (!after && !before && (!limit || parseInt(limit as string, 10) === 50)) {
      cacheService.set(cacheKey, clientMsgs, 60);
    }

    res.json({
      messages: clientMsgs,
      hasMore: filtered.length === cap,
    });
  } catch (err: any) {
    console.error('[messages] fetch error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rooms/:roomId/messages - Send a message via REST API (Full WebSocket fallback)
router.post('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { text = '', attachments = [], clientMsgId, replyTo, parentMessage, forwardedFrom } = req.body || {};
    const trimmedText = typeof text === 'string' ? text.trim() : '';

    if (!roomId || (!trimmedText && (!attachments || attachments.length === 0))) {
      return res.status(400).json({ error: 'message text or attachment required' });
    }

    const allowed = await checkSocketRateLimit(req.user.id, 'message', { windowMs: 60000, max: 60 });
    if (!allowed) return res.status(429).json({ error: 'rate limit exceeded, slow down' });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    let member = room.members.find((m) => m.user.toString() === req.user.id);
    if (!member) {
      if (room.type === 'public') {
        room.members.push({ user: req.user.id, role: 'member', joinedAt: new Date(), muted: false });
        await room.save();
        member = room.members.find((m) => m.user.toString() === req.user.id);
      } else {
        return res.status(403).json({ error: 'not a member of this room' });
      }
    }

    if (member && member.muted) {
      return res.status(403).json({ error: 'you are muted in this room' });
    }

    if (room.slowMode > 0 && member && member.role !== 'owner' && member.role !== 'moderator') {
      const slowKey = `${roomId}:${req.user.id}`;
      const lastSent = slowModeMap.get(slowKey);
      const now = Date.now();
      if (lastSent && now - lastSent < room.slowMode * 1000) {
        const remainingSec = Math.ceil((room.slowMode * 1000 - (now - lastSent)) / 1000);
        return res.status(429).json({
          error: `Slow mode active. Please wait ${remainingSec} seconds before sending another message.`,
        });
      }
      slowModeMap.set(slowKey, now);
    }

    if (room.isDM && room.dmStatus === 'pending') {
      if (room.dmInitiator?.toString() !== req.user.id) {
        return res.status(403).json({ error: 'DM request is pending acceptance' });
      }
      const existingCount = await Message.countDocuments({ room: roomId });
      if (existingCount > 0) {
        return res.status(403).json({ error: 'Wait for the recipient to accept your DM request' });
      }
    }

    if (clientMsgId) {
      const existing = await Message.findOne({ clientMsgId }).populate('sender', 'username profileImage').lean();
      if (existing) {
        const payload = {
          ...existing,
          id: (existing as any)._id.toString(),
          roomId: (existing as any).room.toString(),
          senderId: (existing as any).sender?._id?.toString() || (existing as any).sender.toString(),
          sender: {
            id: (existing as any).sender?._id?.toString() || req.user.id,
            username: (existing as any).sender?.username || req.user.username,
          },
          senderUsername: (existing as any).sender?.username || req.user.username,
        };
        return res.json({ ok: true, message: payload });
      }
    }

    // Resolve @mentions
    const mentionedUsernames = parseMentions(trimmedText);
    const mentionIds = await resolveMentionIds(mentionedUsernames, req.user.id);

    const msg = await Message.create({
      room: roomId,
      sender: req.user.id,
      text: trimmedText,
      attachments: Array.isArray(attachments) ? attachments : [],
      clientMsgId: clientMsgId || null,
      replyTo: replyTo || null,
      parentMessage: parentMessage || null,
      forwardedFrom: forwardedFrom || null,
      mentions: mentionIds,
    });

    const payload = {
      ...msg.toClient(),
      sender: { id: req.user.id, username: req.user.username },
      senderUsername: req.user.username,
      replyTo: msg.replyTo ? msg.replyTo.toString() : null,
    };

    // Invalidate room cache
    cacheService.delete(`msgs:${roomId}:*`);

    // Broadcast via Socket.IO if attached
    const io = getIO();
    if (io) {
      io.to(roomId).emit('message:new', { roomId, message: payload });
      if (parentMessage) {
        io.to(roomId).emit('message:thread-reply', {
          roomId,
          parentMessageId: parentMessage,
          reply: payload,
        });
      }

      const memberIds = (room.members || [])
        .map((m) => (m.user ? m.user.toString() : ''))
        .filter((id) => id && id !== req.user.id);
      const mentionIdStrings = new Set(mentionIds.map((id) => id.toString()));

      for (const memberId of memberIds) {
        io.to(`user:${memberId}`).emit('message:new', { roomId, message: payload });

        if (!mentionIdStrings.has(memberId)) {
          createNotification({
            userId: memberId,
            actorId: req.user.id,
            type: room.isDM ? 'dm' : 'channel',
            title: room.isDM ? `New DM from @${req.user.username}` : `#${room.name}: @${req.user.username}`,
            message: trimmedText ? trimmedText.substring(0, 100) : 'Sent an attachment',
            link: '/chat',
            roomId,
            messageId: msg._id,
          }).catch((e) => console.error('[notification] error:', e.message));
        }
      }

      for (const mentionedId of mentionIds) {
        io.to(`user:${mentionedId.toString()}`).emit('message:mention', {
          roomId,
          messageId: msg._id.toString(),
          fromUsername: req.user.username,
          text: trimmedText.substring(0, 120),
          roomName: room.name,
        });
        createNotification({
          userId: mentionedId,
          actorId: req.user.id,
          type: 'mention',
          title: `@${req.user.username} mentioned you in #${room.name}`,
          message: trimmedText.substring(0, 100),
          link: '/chat',
          roomId,
          messageId: msg._id,
        }).catch((e) => console.error('[mention notification] error:', e.message));
      }
    }

    res.status(201).json({ ok: true, message: payload });
  } catch (err: any) {
    if (err.code === 11000 && req.body?.clientMsgId) {
      const existing = await Message.findOne({ clientMsgId: req.body.clientMsgId }).populate('sender', 'username profileImage').lean();
      if (existing) {
        const payload = {
          ...existing,
          id: (existing as any)._id.toString(),
          roomId: (existing as any).room.toString(),
          senderId: (existing as any).sender?._id?.toString() || (existing as any).sender.toString(),
          sender: {
            id: (existing as any).sender?._id?.toString() || req.user.id,
            username: (existing as any).sender?.username || req.user.username,
          },
          senderUsername: (existing as any).sender?.username || req.user.username,
        };
        return res.json({ ok: true, message: payload });
      }
    }
    console.error('[messages] post error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/rooms/:roomId/messages/search?q=query - Search messages within a room
router.get('/:roomId/messages/search', async (req, res) => {
  try {
    const { roomId } = req.params;
    const q = (req.query.q as string)?.trim();
    if (!q) return res.json({ messages: [] });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    if (room.type === 'private') {
      const isMember = room.members.some((m) => m.user.toString() === req.user.id);
      if (!isMember) return res.status(403).json({ error: 'not a member of this private room' });
    }

    const reg = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const messages = await Message.find({
      room: roomId,
      text: reg,
      deleted: false,
    })
      .populate('sender', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(30);

    const filtered = messages.filter(
      (m) => !(m.deletedFor || []).some((id) => id.toString() === req.user.id)
    );

    res.json({
      messages: filtered.map((m) => ({
        ...m.toClient(),
        sender: {
          id: (m.sender as any)?._id?.toString() || (m.sender as any)?.toString(),
          username: (m.sender as any)?.username || 'User',
          profileImage: (m.sender as any)?.profileImage || '',
        },
      })),
    });
  } catch (err) {
    console.error('[messages] search error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/backfill', requireAuth, async (req, res) => {
  try {
    const { rooms } = req.body || {};
    if (!Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ error: 'rooms array required' });
    }
    const capped = rooms.slice(0, 20);
    const results = await backfillMessages(req.user.id, capped);
    res.json({ backfill: results });
  } catch (err) {
    console.error('[messages] backfill error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

export async function backfillMessages(userId, rooms) {
  const results = {};
  const validRooms = rooms.filter((r) => {
    if (!r.roomId || !r.after) return false;
    try {
      new mongoose.Types.ObjectId(r.roomId);
      new mongoose.Types.ObjectId(r.after);
      return true;
    } catch {
      return false;
    }
  });

  if (validRooms.length === 0) return results;

  const roomIds = validRooms.map((r) => {
    try { return new mongoose.Types.ObjectId(r.roomId); } catch { return null; }
  }).filter(Boolean);

  const roomDocs = await Room.find({ _id: { $in: roomIds } }).lean();

  const accessibleIds = new Set();
  for (const doc of roomDocs) {
    if (doc.type === 'private') {
      const isMember = doc.members.some((m) => m.user.toString() === userId);
      if (!isMember) continue;
    }
    accessibleIds.add(doc._id.toString());
  }

  const queries = validRooms
    .filter((r) => accessibleIds.has(r.roomId.toString()))
    .map(async (r) => {
      try {
        const afterObjId = new mongoose.Types.ObjectId(r.after);
        const roomIdObj = new mongoose.Types.ObjectId(r.roomId);
        const messages = await Message.find({
          room: roomIdObj,
          _id: { $gt: afterObjId },
        })
          .sort({ _id: 1 })
          .limit(100)
          .lean();
        results[r.roomId.toString()] = messages.map((m) => ({
          id: m._id.toString(),
          roomId: m.room.toString(),
          senderId: m.sender.toString(),
          clientMsgId: m.clientMsgId || null,
          text: m.text,
          parentMessage: m.parentMessage ? m.parentMessage.toString() : null,
          replyTo: m.replyTo ? m.replyTo.toString() : null,
          deletedFor: (m.deletedFor || []).map(id => id.toString()),
          deleted: m.deleted,
          reported: m.reported,
          reactions: (m.reactions || []).map((rx) => ({
            emoji: rx.emoji,
            users: rx.users.map((u) => u.toString()),
          })),
          createdAt: m.createdAt,
        }));
      } catch {
        results[r.roomId.toString()] = [];
      }
    });

  await Promise.all(queries);
  return results;
}
