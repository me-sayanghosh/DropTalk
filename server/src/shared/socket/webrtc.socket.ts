/**
 * WebRTC Signaling Socket Handlers
 */
export function registerWebRTCHandlers(socket, io) {
  // Initiate a call to a target user or room
  socket.on('webrtc:call-initiate', async ({ targetUserId, roomId, isVideo }, ack) => {
    try {
      if (!targetUserId && !roomId) throw new Error('targetUserId or roomId required');

      let effectiveTargetUserId = targetUserId;
      if (!effectiveTargetUserId && roomId) {
        const { Room } = await import('../../features/rooms/room.model');
        const room = await Room.findById(roomId);
        if (room?.isDM) {
          const partner = room.members.find((m) => m.user.toString() !== socket.user.id);
          if (partner) {
            effectiveTargetUserId = partner.user.toString();
          }
        }
      }

      if (effectiveTargetUserId) {
        const { User } = await import('../../features/auth/user.model');
        const [targetUser, callerUser] = await Promise.all([
          User.findById(effectiveTargetUserId),
          User.findById(socket.user.id),
        ]);

        if (
          targetUser &&
          (targetUser.privacySettings?.blockedUsers || []).some(
            (id: any) => id.toString() === socket.user.id
          )
        ) {
          return ack?.({ ok: false, error: 'User is unavailable' });
        }

        if (
          callerUser &&
          (callerUser.privacySettings?.blockedUsers || []).some(
            (id: any) => id.toString() === effectiveTargetUserId
          )
        ) {
          return ack?.({ ok: false, error: 'You have blocked this user' });
        }
      }

      const payload = {
        fromUserId: socket.user.id,
        fromUsername: socket.user.name || socket.user.username,
        profileImage: socket.user.profileImage || socket.user.avatar || null,
        roomId: roomId || null,
        isVideo: !!isVideo,
      };

      if (targetUserId) {
        socket.to(`user:${targetUserId}`).emit('webrtc:call-incoming', payload);
      } else if (roomId) {
        socket.to(roomId).emit('webrtc:call-incoming', payload);
      }

      ack?.({ ok: true });
    } catch (err: any) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // Accept incoming call
  socket.on('webrtc:call-accept', async ({ toUserId, roomId }, ack) => {
    try {
      let effectiveToUserId = toUserId;
      if (!effectiveToUserId && roomId) {
        const { Room } = await import('../../features/rooms/room.model');
        const room = await Room.findById(roomId);
        if (room?.isDM) {
          const partner = room.members.find((m) => m.user.toString() !== socket.user.id);
          if (partner) {
            effectiveToUserId = partner.user.toString();
          }
        }
      }

      if (effectiveToUserId) {
        const { User } = await import('../../features/auth/user.model');
        const [toUser, currentUser] = await Promise.all([
          User.findById(effectiveToUserId),
          User.findById(socket.user.id),
        ]);
        if (
          toUser &&
          (toUser.privacySettings?.blockedUsers || []).some(
            (id: any) => id.toString() === socket.user.id
          )
        ) {
          return ack?.({ ok: false, error: 'User is unavailable' });
        }
        if (
          currentUser &&
          (currentUser.privacySettings?.blockedUsers || []).some(
            (id: any) => id.toString() === effectiveToUserId
          )
        ) {
          return ack?.({ ok: false, error: 'You have blocked this user' });
        }
      }

      const payload = {
        acceptedBy: socket.user.id,
        acceptedUsername: socket.user.username,
        roomId: roomId || null,
      };

      if (toUserId) {
        socket.to(`user:${toUserId}`).emit('webrtc:call-accepted', payload);
      } else if (roomId) {
        socket.to(roomId).emit('webrtc:call-accepted', payload);
      }

      ack?.({ ok: true });
    } catch (err: any) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // Reject incoming call
  socket.on('webrtc:call-reject', ({ toUserId, roomId }, ack) => {
    try {
      const payload = {
        rejectedBy: socket.user.id,
        roomId: roomId || null,
      };

      if (toUserId) {
        socket.to(`user:${toUserId}`).emit('webrtc:call-rejected', payload);
      } else if (roomId) {
        socket.to(roomId).emit('webrtc:call-rejected', payload);
      }

      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // Relay WebRTC Offer (SDP)
  socket.on('webrtc:offer', (data: any, ack?: any) => {
    try {
      if (!data || typeof data !== 'object') {
        ack?.({ ok: false, error: 'Invalid payload' });
        return;
      }
      const { toUserId, roomId, offer } = data;
      if (!offer || typeof offer !== 'object') {
        ack?.({ ok: false, error: 'Valid SDP offer object is required' });
        return;
      }
      if (!toUserId && !roomId) {
        ack?.({ ok: false, error: 'toUserId or roomId is required' });
        return;
      }
      const payload = {
        fromUserId: socket.user?.id,
        offer,
        roomId: roomId || null,
      };
      if (toUserId) {
        socket.to(`user:${toUserId}`).emit('webrtc:offer', payload);
      } else if (roomId) {
        socket.to(roomId).emit('webrtc:offer', payload);
      }
      ack?.({ ok: true });
    } catch (err: any) {
      console.warn('[webrtc:offer] signal error:', err?.message || err);
      ack?.({ ok: false, error: err?.message || 'Offer relay failed' });
    }
  });

  // Relay WebRTC Answer (SDP)
  socket.on('webrtc:answer', (data: any, ack?: any) => {
    try {
      if (!data || typeof data !== 'object') {
        ack?.({ ok: false, error: 'Invalid payload' });
        return;
      }
      const { toUserId, roomId, answer } = data;
      if (!answer || typeof answer !== 'object') {
        ack?.({ ok: false, error: 'Valid SDP answer object is required' });
        return;
      }
      if (!toUserId && !roomId) {
        ack?.({ ok: false, error: 'toUserId or roomId is required' });
        return;
      }
      const payload = {
        fromUserId: socket.user?.id,
        answer,
        roomId: roomId || null,
      };
      if (toUserId) {
        socket.to(`user:${toUserId}`).emit('webrtc:answer', payload);
      } else if (roomId) {
        socket.to(roomId).emit('webrtc:answer', payload);
      }
      ack?.({ ok: true });
    } catch (err: any) {
      console.warn('[webrtc:answer] signal error:', err?.message || err);
      ack?.({ ok: false, error: err?.message || 'Answer relay failed' });
    }
  });

  // Relay ICE Candidate
  socket.on('webrtc:ice-candidate', (data: any, ack?: any) => {
    try {
      if (!data || typeof data !== 'object') {
        ack?.({ ok: false, error: 'Invalid payload' });
        return;
      }
      const { toUserId, roomId, candidate } = data;
      if (!candidate || typeof candidate !== 'object') {
        ack?.({ ok: false, error: 'Valid candidate object is required' });
        return;
      }
      if (!toUserId && !roomId) {
        ack?.({ ok: false, error: 'toUserId or roomId is required' });
        return;
      }
      const payload = {
        fromUserId: socket.user?.id,
        candidate,
        roomId: roomId || null,
      };
      if (toUserId) {
        socket.to(`user:${toUserId}`).emit('webrtc:ice-candidate', payload);
      } else if (roomId) {
        socket.to(roomId).emit('webrtc:ice-candidate', payload);
      }
      ack?.({ ok: true });
    } catch (err: any) {
      console.warn('[webrtc:ice-candidate] signal error:', err?.message || err);
      ack?.({ ok: false, error: err?.message || 'ICE candidate relay failed' });
    }
  });

  // End Call
  socket.on('webrtc:call-end', (data: any, ack?: any) => {
    try {
      if (!data) {
        ack?.({ ok: false, error: 'No data provided' });
        return;
      }
      const { toUserId, roomId } = data;
      const payload = {
        endedBy: socket.user.id,
        roomId: roomId || null,
      };
      if (toUserId) {
        socket.to(`user:${toUserId}`).emit('webrtc:call-ended', payload);
      } else if (roomId) {
        socket.to(roomId).emit('webrtc:call-ended', payload);
      }
      ack?.({ ok: true });
    } catch (err: any) {
      console.warn('[webrtc:call-end] signal error:', err?.message || err);
      ack?.({ ok: false, error: err?.message || 'Call end relay failed' });
    }
  });
}
