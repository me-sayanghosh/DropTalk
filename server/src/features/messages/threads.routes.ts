import { Router } from 'express';
import { Message } from './message.model';
import { Room } from '../rooms/room.model';
import { requireAuth } from '../../shared/middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/:roomId/messages/:messageId/replies', async (req, res) => {
  try {
    const { roomId, messageId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    if (room.type === 'private') {
      const isMember = room.members.some((m) => m.user.toString() === req.user.id);
      if (!isMember) return res.status(403).json({ error: 'not a member of this private room' });
    }

    const parent = await Message.findOne({ _id: messageId, room: roomId });
    if (!parent) return res.status(404).json({ error: 'message not found' });

    const replies = await Message.find({ parentMessage: messageId })
      .populate('sender', 'username profileImage')
      .sort({ createdAt: 1 })
      .limit(100);

    const filtered = replies.filter(
      (m) => !(m.deletedFor || []).some((id) => id.toString() === req.user.id)
    );

    res.json({ replies: filtered.map((m) => m.toClient()) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.get('/:roomId/threads', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    if (room.type === 'private') {
      const isMember = room.members.some((m) => m.user.toString() === req.user.id);
      if (!isMember) return res.status(403).json({ error: 'not a member of this private room' });
    }

    const threads = await Message.aggregate([
      { $match: { room: room._id, parentMessage: null, deleted: { $ne: true } } },
      {
        $lookup: {
          from: 'messages',
          let: { parentId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$parentMessage', '$$parentId'] }, deleted: { $ne: true } } },
            { $sort: { createdAt: 1 } },
          ],
          as: 'replies',
        },
      },
      { $match: { 'replies.0': { $exists: true } } },
      {
        $addFields: {
          replyCount: { $size: '$replies' },
          lastReply: { $last: '$replies' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'senderUser',
        },
      },
      { $unwind: { path: '$senderUser', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'lastReply.sender',
          foreignField: '_id',
          as: 'lastReplySender',
        },
      },
      { $unwind: { path: '$lastReplySender', preserveNullAndEmptyArrays: true } },
      { $sort: { 'lastReply.createdAt': -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 1,
          id: '$_id',
          text: 1,
          sender: {
            id: '$sender',
            username: { $ifNull: ['$senderUser.username', 'User'] },
          },
          createdAt: 1,
          replyCount: 1,
          lastReply: {
            id: '$lastReply._id',
            text: '$lastReply.text',
            createdAt: '$lastReply.createdAt',
            senderUsername: { $ifNull: ['$lastReplySender.username', 'User'] },
          },
        },
      },
    ]);

    res.json({ threads });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
