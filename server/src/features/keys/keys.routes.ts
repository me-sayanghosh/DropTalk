import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth';
import { Room } from '../rooms/room.model';

const router = Router();

router.use(requireAuth);

router.post('/:roomId/keys', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { encryptedKey, targetUserId } = req.body || {};

    if (!encryptedKey) return res.status(400).json({ error: 'encryptedKey required' });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    const isMember = room.members.some((m) => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'not a member' });

    const effectiveUserId = targetUserId || req.user.id;
    if (targetUserId && targetUserId !== req.user.id) {
      const selfMember = room.members.find((m) => m.user.toString() === req.user.id);
      if (!selfMember || (selfMember.role !== 'owner' && selfMember.role !== 'moderator')) {
        return res.status(403).json({ error: 'only owner or moderator can store keys for other members' });
      }
    }

    const keyId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const existingIdx = room.encryptedKeys.findIndex((ek) => ek.user.toString() === effectiveUserId);
    if (existingIdx >= 0) {
      room.encryptedKeys[existingIdx].key = encryptedKey;
      room.encryptedKeys[existingIdx].keyId = keyId;
    } else {
      room.encryptedKeys.push({ user: effectiveUserId, key: encryptedKey, keyId });
    }

    await room.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('[keys] store error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:roomId/keys', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    const isMember = room.members.some((m) => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'not a member' });

    const myKeys = room.encryptedKeys
      .filter((ek) => ek.user.toString() === req.user.id)
      .map((ek) => ({ key: ek.key, keyId: ek.keyId }));
    res.json({ encryptedKeys: myKeys });
  } catch (err) {
    console.error('[keys] fetch error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:roomId/keys/all', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    const isMember = room.members.some((m) => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'not a member' });

    const keys = room.encryptedKeys.map((ek) => ({
      user: ek.user.toString(),
      key: ek.key,
    }));

    res.json({ keys });
  } catch (err) {
    console.error('[keys] fetch-all error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
