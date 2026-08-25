import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { User } from '../../features/auth/user.model.js';
import redis, { usingFallback as redisUsingFallback } from '../config/redis.js';
import {
  setPresence,
  incrementPresence,
  decrementPresence,
  startHeartbeat,
} from '../../features/presence/presence.service.js';
import { registerRoomHandlers } from '../../features/rooms/rooms.socket.js';
import { registerMessageHandlers } from '../../features/messages/messages.socket.js';
import { registerPresenceHandlers } from '../../features/presence/presence.socket.js';
import { registerKeyHandlers } from '../../features/keys/keys.socket.js';
import { registerWebRTCHandlers } from './webrtc.socket.js';
import { CORS_ORIGINS } from '../utils/constants.js';

let ioInstance = null;

export function getIO() {
  return ioInstance;
}

export function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: CORS_ORIGINS, credentials: true },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  let pubClient, subClient;
  if (!redisUsingFallback) {
    pubClient = redis.duplicate();
    subClient = redis.duplicate();
    pubClient.on('error', (err) => console.error('[redis] pubClient error:', err.message));
    subClient.on('error', (err) => console.error('[redis] subClient error:', err.message));
    io.adapter(createAdapter(pubClient, subClient));
  }
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('missing token'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error('user not found'));
      socket.user = {
        id: user._id.toString(),
        username: user.username,
        name: user.name || user.username,
        profileImage: user.profileImage || '',
        publicKeyJwk: socket.handshake.auth?.publicKeyJwk || null,
      };
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const joined = new Set();

    // Join personal socket room so targeted events (mentions, DMs, notifications) work
    socket.join(`user:${socket.user.id}`);

    setPresence(socket.user.id, { status: 'online', currentRoom: null }).catch(() => {});
    incrementPresence(socket.user.id, socket.id).catch(() => {});
    const heartbeatInterval = startHeartbeat(socket.user.id, socket.id);
    io.emit('presence:update', { userId: socket.user.id, status: 'online', currentRoom: null });

    registerRoomHandlers(socket, io, { joined });
    registerMessageHandlers(socket, io, { joined });
    registerPresenceHandlers(socket, io, { joined });
    registerKeyHandlers(socket, io, { joined });
    registerWebRTCHandlers(socket, io);

    socket.on('disconnect', async () => {
      try {
        clearInterval(heartbeatInterval);
        for (const roomId of joined) {
          socket.to(roomId).emit('room:user-left', { roomId, userId: socket.user.id });
        }
        const remaining = await decrementPresence(socket.user.id, socket.id).catch(() => 0);
        if (remaining === 0) {
          io.emit('presence:update', { userId: socket.user.id, status: 'offline', currentRoom: null });
        } else {
          const { clearUserCurrentRoom } = await import('../../features/presence/presence.service.js');
          clearUserCurrentRoom(socket.user.id).catch(() => {});
        }
      } catch (err) {
        console.error('[socket] disconnect error:', err.message);
      }
    });
  });

  console.log('[socket] attached');

  const close = () =>
    Promise.all([
      new Promise((resolve) => io.close(resolve)),
      pubClient ? pubClient.quit().catch(() => pubClient.disconnect()) : Promise.resolve(),
      subClient ? subClient.quit().catch(() => subClient.disconnect()) : Promise.resolve(),
    ]);

  return { io, close };
}
