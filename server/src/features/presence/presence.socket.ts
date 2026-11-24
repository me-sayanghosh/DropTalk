import { User } from '../auth/user.model';
import { Room } from '../rooms/room.model';
import { Message } from '../messages/message.model';
import {
  getPresenceMap,
  setTyping,
  removeTyping,
} from './presence.service';
import { setLastRead } from '../messages/readReceipts.service';

export function registerPresenceHandlers(socket, io, { joined }) {
  socket.on('user:typing', async ({ roomId }) => {
    try {
      if (!joined.has(roomId)) return;

      // If DM room, check blocking
      const room = (await Room.findById(roomId).select('isDM members').lean()) as any;
      if (room?.isDM) {
        const partner = (room.members || []).find((m: any) => m.user.toString() !== socket.user.id);
        if (partner) {
          const partnerId = partner.user.toString();
          const [sender, receiver] = await Promise.all([
            User.findById(socket.user.id).select('privacySettings').lean() as any,
            User.findById(partnerId).select('privacySettings').lean() as any,
          ]);
          const blockedByReceiver = (receiver?.privacySettings?.blockedUsers || []).some(
            (id: any) => id.toString() === socket.user.id
          );
          const blockedBySender = (sender?.privacySettings?.blockedUsers || []).some(
            (id: any) => id.toString() === partnerId
          );
          if (blockedByReceiver || blockedBySender) {
            return; // Suppress typing event if blocked
          }
        }
      }

      await setTyping(roomId, socket.user.id, 3000);
      socket.to(roomId).emit('user:typing', {
        roomId,
        user: {
          id: socket.user.id,
          username: socket.user.username,
          name: socket.user.name || socket.user.username,
          profileImage: socket.user.profileImage || '',
        },
      });
    } catch (err: any) {
      console.error('[socket] user:typing error:', err.message);
    }
  });

  socket.on('user:stopped-typing', async ({ roomId }) => {
    try {
      if (!joined.has(roomId)) return;

      // If DM room, check blocking
      const room = (await Room.findById(roomId).select('isDM members').lean()) as any;
      if (room?.isDM) {
        const partner = (room.members || []).find((m: any) => m.user.toString() !== socket.user.id);
        if (partner) {
          const partnerId = partner.user.toString();
          const [sender, receiver] = await Promise.all([
            User.findById(socket.user.id).select('privacySettings').lean() as any,
            User.findById(partnerId).select('privacySettings').lean() as any,
          ]);
          const blockedByReceiver = (receiver?.privacySettings?.blockedUsers || []).some(
            (id: any) => id.toString() === socket.user.id
          );
          const blockedBySender = (sender?.privacySettings?.blockedUsers || []).some(
            (id: any) => id.toString() === partnerId
          );
          if (blockedByReceiver || blockedBySender) {
            return;
          }
        }
      }

      await removeTyping(roomId, socket.user.id);
      socket.to(roomId).emit('user:stopped-typing', {
        roomId,
        userId: socket.user.id,
      });
    } catch (err: any) {
      console.error('[socket] user:stopped-typing error:', err.message);
    }
  });

  socket.on('message:read', async ({ roomId, lastReadMessageId }) => {
    try {
      if (!joined.has(roomId)) return;

      // Check user's read receipts privacy setting
      const user = (await User.findById(socket.user.id).select('privacySettings').lean()) as any;
      const readReceiptsEnabled = user?.privacySettings?.readReceipts !== false;

      // Check if room is DM
      const room = (await Room.findById(roomId).select('isDM members').lean()) as any;

      // If user disabled read receipts and it's a 1-to-1 DM, do not emit read receipt
      if (!readReceiptsEnabled && room?.isDM) {
        return;
      }

      // If DM, also check if blocked
      if (room?.isDM) {
        const partner = (room.members || []).find((m: any) => m.user.toString() !== socket.user.id);
        if (partner) {
          const partnerUser = (await User.findById(partner.user).select('privacySettings').lean()) as any;
          const blocked = (partnerUser?.privacySettings?.blockedUsers || []).some(
            (id: any) => id.toString() === socket.user.id
          );
          if (blocked) return;
        }
      }

      await setLastRead(roomId, socket.user.id, lastReadMessageId);

      // Persist deliveryStatus 'read' in MongoDB
      if (lastReadMessageId) {
        try {
          await Message.updateMany(
            {
              room: roomId,
              _id: { $lte: lastReadMessageId },
              sender: { $ne: socket.user.id },
            },
            {
              $set: { deliveryStatus: 'read', readAt: new Date() },
              $addToSet: { readBy: { user: socket.user.id, readAt: new Date() } },
            }
          );
        } catch (dbErr: any) {
          console.error('[presence] error updating read deliveryStatus:', dbErr.message);
        }
      }

      socket.to(roomId).emit('message:read', {
        roomId,
        userId: socket.user.id,
        lastReadMessageId,
      });
    } catch (err: any) {
      console.error('[socket] message:read error:', err.message);
    }
  });

  socket.on('presence:request-map', async (ack) => {
    try {
      const map = await getPresenceMap();
      const enriched: Record<string, any> = {};

      const currentUser = (await User.findById(socket.user.id).select('privacySettings').lean()) as any;
      const currentBlockedSet = new Set(
        (currentUser?.privacySettings?.blockedUsers || []).map((id: any) => id.toString())
      );

      for (const [userId, pres] of Object.entries(map)) {
        if (userId === socket.user.id) {
          enriched[userId] = { ...(pres as any), username: socket.user.username };
          continue;
        }

        // If current user blocked this target user, hide their presence
        if (currentBlockedSet.has(userId)) {
          continue;
        }

        const user: any = await User.findById(userId).select('username privacySettings').lean();
        if (!user) continue;

        // If target user blocked current user, hide presence
        const hasBlockedCurrent = (user.privacySettings?.blockedUsers || []).some(
          (id: any) => id.toString() === socket.user.id
        );
        if (hasBlockedCurrent) {
          continue;
        }

        // WhatsApp privacy check: showOnlineStatus & online visibility
        const showOnline = user.privacySettings?.showOnlineStatus !== false;
        const onlineRule = user.privacySettings?.online || 'everyone';
        const lastSeenRule = user.privacySettings?.lastSeen || 'everyone';
        const isOnlineHidden = !showOnline || (onlineRule === 'same_as_last_seen' && lastSeenRule === 'nobody');

        if (isOnlineHidden) {
          continue;
        }

        enriched[userId] = { ...(pres as any), username: user?.username || 'unknown' };
      }
      ack?.(enriched);
    } catch (err: any) {
      console.error('[socket] presence:request-map error:', err.message);
      ack?.({});
    }
  });
}
