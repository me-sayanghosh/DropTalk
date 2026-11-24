import { Router, Request, Response } from 'express';
import { requireAuth } from '../../shared/middleware/auth';
import { Status } from './status.model';
import { User } from '../auth/user.model';
import { getIO } from '../../shared/socket/index';

export const statusRouter = Router();

statusRouter.post('/create', requireAuth, async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const { mediaUrl, mediaType = 'image', caption = '' } = req.body;
    if (!mediaUrl) {
      return res.status(400).json({ error: 'mediaUrl is required' });
    }

    const newStatus = await Status.create({
      user: currentUserId,
      mediaUrl,
      mediaType,
      caption: String(caption).slice(0, 500),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const populated = await Status.findById(newStatus._id).populate('user', 'username name profileImage');
    const clientPayload = populated ? populated.toClient() : newStatus.toClient();

    try {
      const io = getIO();
      if (io) {
        io.emit('status:new', clientPayload);
      }
    } catch {
      // Ignore if socket not initialized
    }

    return res.status(201).json({ status: clientPayload });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create status' });
  }
});

statusRouter.get('/feed', requireAuth, async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const currentUser = await User.findById(currentUserId);
    const blockedList = (currentUser?.privacySettings?.blockedUsers || []).map((id: any) => id.toString());

    const activeStatuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate('user', 'username name profileImage')
      .populate('viewers.user', 'username name profileImage');

    // Filter out statuses from blocked users or users who blocked current user
    const filtered = activeStatuses.filter((s: any) => {
      const userId = s.user?._id?.toString() || s.user?.toString();
      return !blockedList.includes(userId);
    });

    return res.json({
      statuses: filtered.map((s) => s.toClient()),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch status feed' });
  }
});

statusRouter.post('/:id/view', requireAuth, async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    const alreadyViewed = status.viewers.some(
      (v: any) => (v.user?._id?.toString() || v.user?.toString()) === currentUserId.toString()
    );

    if (!alreadyViewed) {
      status.viewers.push({
        user: currentUserId,
        viewedAt: new Date(),
      } as any);
      await status.save();
    }

    return res.json({ success: true, viewersCount: status.viewers.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to record view' });
  }
});

statusRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    if (status.user.toString() !== currentUserId.toString()) {
      return res.status(403).json({ error: 'You can only delete your own status' });
    }

    await status.deleteOne();
    return res.json({ success: true, message: 'Status deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete status' });
  }
});
