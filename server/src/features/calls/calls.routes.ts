import { Router } from 'express';
import mongoose from 'mongoose';
import { CallLog } from './callLog.model';
import { requireAuth } from '../../shared/middleware/auth';
import { createNotification } from '../notifications/notifications.service';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/calls/history
 * Fetch call logs for current user (caller or receiver).
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const logs = await CallLog.find({
      $or: [{ caller: userId }, { receiver: userId }],
      deletedFor: { $nin: [userObjId, userId] },
    })
      .sort({ createdAt: -1 })
      .populate('caller', 'username name profileImage')
      .populate('receiver', 'username name profileImage')
      .populate('room', 'name')
      .limit(100);

    const clientLogs = logs.map((l) => l.toClient(userId));
    res.json({ logs: clientLogs });
  } catch (err) {
    console.error('[calls] history error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/calls/log
 * Create a new call log entry.
 */
router.post('/log', async (req, res) => {
  try {
    const { receiverId, roomId, type = 'voice', status = 'completed', durationSeconds = 0 } = req.body;
    const callerId = req.user.id;

    if (type && !['voice', 'video'].includes(type)) {
      return res.status(400).json({ error: "Invalid call type. Must be 'voice' or 'video'" });
    }

    if (status && !['completed', 'missed', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid call status' });
    }

    const parsedDuration = parseInt(durationSeconds, 10);
    if (isNaN(parsedDuration) || parsedDuration < 0) {
      return res.status(400).json({ error: 'durationSeconds must be a non-negative number' });
    }

    let validReceiver = null;
    if (receiverId && receiverId !== 'null' && receiverId !== 'undefined') {
      if (mongoose.Types.ObjectId.isValid(receiverId)) {
        validReceiver = receiverId;
      }
    }

    let validRoom = null;
    if (roomId && roomId !== 'null' && roomId !== 'undefined') {
      if (mongoose.Types.ObjectId.isValid(roomId)) {
        validRoom = roomId;
      }
    }

    if (!validReceiver && !validRoom) {
      return res.status(400).json({ error: 'Valid receiverId or roomId is required' });
    }

    const log = await CallLog.create({
      caller: callerId,
      receiver: validReceiver,
      room: validRoom,
      type: type === 'video' ? 'video' : 'voice',
      status: status || 'completed',
      durationSeconds: parsedDuration,
    });

    const populated = await CallLog.findById(log._id)
      .populate('caller', 'username name profileImage')
      .populate('receiver', 'username name profileImage')
      .populate('room', 'name');

    if (validReceiver && (log.status === 'missed' || log.status === 'rejected')) {
      const callTypeLabel = log.type === 'video' ? 'video call' : 'voice call';
      const callerName = req.user.username || 'Someone';
      const title = log.status === 'missed' ? `Missed ${callTypeLabel}` : `${callTypeLabel} declined`;
      const message = `${callerName} called you (${callTypeLabel}).`;

      createNotification({
        userId: validReceiver,
        actorId: callerId,
        type: 'system',
        title,
        message,
        link: '/calls',
      }).catch((e) => console.error('[calls] notification error:', e.message));
    }

    res.status(201).json({ log: populated.toClient(callerId) });
  } catch (err) {
    console.error('[calls] log error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/calls/log/:logId
 * Update call duration and status on call end.
 */
router.put('/log/:logId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { logId } = req.params;
    const { durationSeconds, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(logId)) {
      return res.status(400).json({ error: 'Invalid log ID' });
    }

    const log = await CallLog.findOne({
      _id: logId,
      $or: [{ caller: userId }, { receiver: userId }],
    });

    if (!log) {
      return res.status(404).json({ error: 'Call log not found' });
    }

    if (durationSeconds !== undefined) {
      const parsed = parseInt(durationSeconds, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        log.durationSeconds = parsed;
      }
    }

    if (status && ['completed', 'missed', 'rejected', 'cancelled'].includes(status)) {
      log.status = status;
    }

    log.endedAt = new Date();
    await log.save();

    const populated = await CallLog.findById(log._id)
      .populate('caller', 'username name profileImage')
      .populate('receiver', 'username name profileImage')
      .populate('room', 'name');

    if (log.receiver && (log.status === 'missed' || log.status === 'rejected')) {
      const callTypeLabel = log.type === 'video' ? 'video call' : 'voice call';
      const callerName = req.user.username || 'Someone';
      const title = log.status === 'missed' ? `Missed ${callTypeLabel}` : `${callTypeLabel} declined`;
      const message = `${callerName} called you (${callTypeLabel}).`;
      const receiverId = (log.receiver as any)?._id || log.receiver;
      const callerId = (log.caller as any)?._id || log.caller;

      createNotification({
        userId: receiverId,
        actorId: callerId,
        type: 'system',
        title,
        message,
        link: '/calls',
      }).catch((e) => console.error('[calls] notification update error:', e.message));
    }

    res.json({ log: populated.toClient(userId) });
  } catch (err) {
    console.error('[calls] update error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/calls/history
 * Clear call history for current user.
 */
router.delete('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    await CallLog.updateMany(
      { $or: [{ caller: userId }, { receiver: userId }] },
      { $addToSet: { deletedFor: userObjId } }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[calls] clear error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/calls/history/:logId
 * Soft-delete a single call log entry for the current user.
 */
router.delete('/history/:logId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { logId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(logId)) {
      return res.status(400).json({ error: 'Invalid log ID' });
    }

    const log = await CallLog.findOne({
      _id: logId,
      $or: [{ caller: userId }, { receiver: userId }],
    });

    if (!log) {
      return res.status(404).json({ error: 'Call log not found' });
    }

    const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    await CallLog.findByIdAndUpdate(logId, {
      $addToSet: { deletedFor: userObjId },
    });

    res.json({ ok: true, logId });
  } catch (err) {
    console.error('[calls] single delete error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
