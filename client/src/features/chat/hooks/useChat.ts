import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import {
  getSocket,
  sendOffline,
  setLastSeenMessage,
  getLastSeenMessages,
  onReconnect,
  api,
  playNotificationSound,
  showDesktopNotification,
  STORAGE_KEYS,
} from '../../../shared/utils';
import {
  getPublicKeyJwk,
  encryptRoomKey,
  decryptRoomKey,
  generateRoomKey,
  encryptText,
  decryptText,
  storeRoomKey,
  getRoomKey,
  clearRoomKey,
} from '../../../shared/utils/crypto';
import { cacheManager } from '../../../shared/utils/cacheManager';
import { Room, Message, RoomMember, PresenceEntry, TypingUser, RoomType } from '../../../types';

export interface MentionAlert {
  roomId: string;
  roomName: string;
  fromUsername: string;
  text: string;
  messageId?: string;
}

export default function useChat() {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState<Room[]>(() => cacheManager.getRoomsCache() || []);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [online, setOnline] = useState<any[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showPresence, setShowPresence] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceEntry & { username?: string }>>({});
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>({});
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [threadCounts, setThreadCounts] = useState<Record<string, number>>({});
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const [keyStatus, setKeyStatus] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState('');
  const [memberRooms, setMemberRooms] = useState<Set<string>>(new Set());
  const [pendingRooms, setPendingRooms] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [replyToData, setReplyToData] = useState<Record<string, any>>({});
  const [membersMap, setMembersMap] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<any>(null);
  // unreadCounts: { [roomId]: number } — resets to 0 when room is opened
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  // mentionAlerts: [{ roomId, roomName, fromUsername, text, messageId }]
  const [mentionAlerts, setMentionAlerts] = useState<MentionAlert[]>([]);

  const socketRef = useRef<any>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const isTypingRef = useRef(false);
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const decryptedMessagesRef = useRef(decryptedMessages);
  useEffect(() => {
    decryptedMessagesRef.current = decryptedMessages;
  }, [decryptedMessages]);
  const currentRoomRef = useRef<string | null>(null);
  useEffect(() => {
    currentRoomRef.current = currentRoom?.id || null;
  }, [currentRoom]);

  const isPrivate = currentRoom?.type === 'private';
  const hasKey = isPrivate && currentRoom?.id ? !!getRoomKey(currentRoom.id) : false;

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const m of members) {
      if (m.username) {
        map[m.user] = m.username;
      }
    }
    setMembersMap(map);
  }, [members]);

  useEffect(() => {
    const map: Record<string, any> = {};
    for (const m of messages) {
      if (m.replyTo && m.replyToData) {
        map[m.replyTo] = m.replyToData;
      }
    }
    setReplyToData(map);
  }, [messages]);

  const fetchRooms = useCallback(() => {
    api
      .get('/rooms')
      .then((r) => {
        const fetchedRooms = r.data.rooms || [];
        setRooms(fetchedRooms);
        cacheManager.setRoomsCache(fetchedRooms);
        setMemberRooms(new Set(r.data.memberships || []));
        setPendingRooms(new Set(r.data.pending || []));
        if (fetchedRooms.length > 0 && !currentRoomRef.current) {
          const firstMemberRoom = fetchedRooms.find((room: Room) => (r.data.memberships || []).includes(room.id));
          selectRoom(firstMemberRoom || fetchedRooms[0]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  async function maybeDecrypt(roomId: string, message: Message) {
    const aesKey = getRoomKey(roomId);
    if (!aesKey || !message.text || message.deleted) return;
    try {
      const text = await decryptText(aesKey, message.text);
      setDecryptedMessages((prev) => ({ ...prev, [message.id]: text }));
    } catch {
      setDecryptedMessages((prev) => ({ ...prev, [message.id]: '[decryption failed]' }));
    }
  }

  async function initiateKeyExchange(roomId: string) {
    const socket = getSocket();
    if (!socket) return;

    const publicKeyJwk = await getPublicKeyJwk();
    socket.emit('room:key-request', { roomId, publicKeyJwk }, async (resp: any) => {
      if (!resp?.ok) return;
      if (resp.hasKey) {
        try {
          const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.RSA_KEYS) : null;
          if (!stored) return;
          const { privateKeyJwk } = JSON.parse(stored);
          const privKey = await window.crypto.subtle.importKey(
            'jwk',
            privateKeyJwk,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['decrypt']
          );
          for (const enc of resp.encryptedKeys) {
            try {
              const aesKey = await decryptRoomKey(privKey, enc.key);
              storeRoomKey(roomId, aesKey);
              setKeyStatus('ready');
              return;
            } catch {
              /* try next key */
            }
          }
          setKeyStatus('error');
        } catch (err) {
          console.error('key decrypt failed:', err);
          setKeyStatus('error');
        }
      } else {
        setKeyStatus('waiting');
      }
    });
  }

  async function handleKeyReceive({ roomId, encryptedKey }: any) {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.RSA_KEYS) : null;
      if (!stored) return;
      const { privateKeyJwk } = JSON.parse(stored);
      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        privateKeyJwk,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
      );
      const aesKey = await decryptRoomKey(privateKey, encryptedKey);
      storeRoomKey(roomId, aesKey);
      setKeyStatus('ready');

      if (roomId === currentRoomRef.current) {
        setMessages((prev) => {
          for (const msg of prev) {
            if (!msg.deleted && msg.text && !decryptedMessagesRef.current[msg.id]) {
              maybeDecrypt(roomId, msg);
            }
          }
          return prev;
        });
      }

      const socket = getSocket();
      if (socket) {
        const pubJwk = await getPublicKeyJwk();
        if (pubJwk) {
          const myEncrypted = await encryptRoomKey(pubJwk, aesKey);
          socket.emit('room:key-store', { roomId, encryptedKey: myEncrypted });
        }
      }
    } catch (err) {
      console.error('key receive decrypt failed:', err);
    }
  }

  async function setupPrivateRoom(room: Room) {
    const roomId = room.id;
    if (getRoomKey(roomId)) {
      setKeyStatus('ready');
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    socket.off('room:key-receive');
    socket.once('room:key-receive', handleKeyReceive);
    initiateKeyExchange(roomId);
  }

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    if (currentRoomRef.current) {
      socket.emit('room:join', { roomId: currentRoomRef.current });
    }

    onReconnect(() => {
      if (currentRoomRef.current) {
        getSocket()?.emit('room:join', { roomId: currentRoomRef.current });
      }
    });

    socket.on('message:new', ({ roomId, message }: { roomId: string; message: Message }) => {
      const senderId = (message as any).senderId || (typeof message.sender === 'object' ? message.sender.id : message.sender);
      const isMine = senderId === userRef.current?.id;

      if (!isMine) {
        playNotificationSound();
        const username = typeof message.sender === 'object' ? message.sender.username : message.senderUsername;
        showDesktopNotification(username ? `@${username}` : 'New message', {
          body: message.text || 'Sent an attachment',
        });
      }

      // Update lastMessage preview for room card
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? {
                ...r,
                lastMessage: {
                  ...message,
                  text: message.text || (message.attachments?.length ? 'Sent an attachment' : ''),
                  senderUsername: (typeof message.sender === 'object' ? message.sender.username : message.senderUsername) || 'User',
                  createdAt: message.createdAt || new Date().toISOString(),
                },
              }
            : r
        )
      );

      if (roomId === currentRoomRef.current) {
        if (message.parentMessage) {
          const parentId = typeof message.parentMessage === 'string' ? message.parentMessage : message.parentMessage.id;
          setThreadCounts((prev) => ({
            ...prev,
            [parentId]: (prev[parentId] || 0) + 1,
          }));
        } else {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
          if (currentRoomRef.current && getRoomKey(currentRoomRef.current) && message.text) {
            maybeDecrypt(currentRoomRef.current, message);
          }
        }
        setLastSeenMessage(roomId, message.id);
      } else {
        // Increment unread count for rooms not currently open
        setUnreadCounts((prev) => ({ ...prev, [roomId]: (prev[roomId] || 0) + 1 }));
      }
    });

    // @mention notifications
    socket.on('message:mention', (alert: MentionAlert) => {
      setMentionAlerts((prev) => [alert, ...prev].slice(0, 50));
      // Also bump unread count for the mentioned room if not active
      if (alert.roomId !== currentRoomRef.current) {
        setUnreadCounts((prev) => ({ ...prev, [alert.roomId]: (prev[alert.roomId] || 0) + 1 }));
      }
    });

    socket.on('room:online', ({ roomId, online: onlineUsers, members: roomMembers }: any) => {
      if (roomId === currentRoomRef.current) {
        setOnline(onlineUsers);
        if (roomMembers) setMembers(roomMembers);
      }
    });

    socket.on('message:edited', ({ roomId, messageId, text, edited, editedAt }: any) => {
      if (roomId === currentRoomRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, text, edited, editedAt } : m))
        );
      }
    });

    socket.on('message:pinned', ({ roomId, pinnedMessages }: any) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, pinnedMessages } : r))
      );
    });

    socket.on('message:unpinned', ({ roomId, pinnedMessages }: any) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, pinnedMessages } : r))
      );
    });

    socket.on('message:deleted', ({ roomId, messageId }: any) => {
      if (roomId === currentRoomRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, deleted: true, text: '' } : m))
        );
        setDecryptedMessages((prev) => {
          const n = { ...prev };
          delete n[messageId];
          return n;
        });
      }
    });

    socket.on('message:deleted-for-me', ({ roomId, messageId }: any) => {
      if (roomId === currentRoomRef.current) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    });

    socket.on('message:reaction', ({ roomId, messageId, reactions }: any) => {
      if (roomId === currentRoomRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
        );
      }
    });

    socket.on('room:user-kicked', ({ roomId, userId }: any) => {
      if (roomId === currentRoomRef.current) {
        setMembers((prev) => prev.filter((m) => m.user !== userId));
      }
    });

    socket.on('room:kicked', ({ roomId }: any) => {
      if (roomId === currentRoomRef.current) {
        setCurrentRoom(null);
        setMessages([]);
        setOnline([]);
        setMembers([]);
        setTypingUsers([]);
        setThreadMessage(null);
        setThreadCounts({});
        setDecryptedMessages({});
        setKeyStatus(null);
        setReplyTo(null);
        clearRoomKey(roomId);
        fetchRooms();
      }
    });

    socket.on('user:typing', ({ roomId, user: typingUser }: any) => {
      if (roomId === currentRoomRef.current && typingUser.id !== userRef.current?.id) {
        setTypingUsers((prev) => {
          if (prev.find((u) => u.userId === typingUser.id || (u as any).id === typingUser.id)) return prev;
          return [...prev, { userId: typingUser.id, username: typingUser.username }];
        });
      }
    });

    socket.on('user:stopped-typing', ({ roomId, userId }: any) => {
      if (roomId === currentRoomRef.current) {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== userId && (u as any).id !== userId));
      }
    });

    socket.on('message:read', ({ roomId, userId, lastReadMessageId }: any) => {
      if (roomId === currentRoomRef.current) {
        setReadReceipts((prev) => ({ ...prev, [userId]: lastReadMessageId }));
        if (userId === userRef.current?.id) {
          setLastSeenMessage(roomId, lastReadMessageId);
        }
      }
    });

    socket.on('presence:update', ({ userId, status, currentRoom: room }: any) => {
      setPresenceMap((prev) => ({
        ...prev,
        [userId]: { status, currentRoom: room, username: prev[userId]?.username || userId.slice(0, 8) },
      }));
    });

    socket.on('room:key-share-request', async ({ roomId, requesterId, requesterPublicKeyJwk }: any) => {
      const aesKey = getRoomKey(roomId);
      if (!aesKey || !requesterPublicKeyJwk) return;
      try {
        const encryptedKey = await encryptRoomKey(requesterPublicKeyJwk, aesKey);
        socket.emit('room:key-share', {
          roomId,
          targetUserId: requesterId,
          encryptedKey,
        });
      } catch (err) {
        console.error('[crypto] key share failed:', err);
      }
    });

    socket.on('room:request-granted', ({ roomId, userId }: any) => {
      if (userId === userRef.current?.id) {
        setMemberRooms((prev) => new Set([...prev, roomId]));
        setPendingRooms((prev) => {
          const next = new Set(prev);
          next.delete(roomId);
          return next;
        });
        fetchRooms();
      }
    });

    socket.on('room:request-denied', ({ roomId, userId }: any) => {
      if (userId === userRef.current?.id) {
        setPendingRooms((prev) => {
          const next = new Set(prev);
          next.delete(roomId);
          return next;
        });
      }
    });

    socket.on('room:auto-join', ({ roomId }: any) => {
      const room = rooms.find((r) => r.id === roomId);
      if (room) selectRoom(room);
    });

    return () => {
      socket.off('message:new');
      socket.off('room:online');
      socket.off('message:deleted');
      socket.off('message:deleted-for-me');
      socket.off('message:reaction');
      socket.off('room:user-kicked');
      socket.off('room:kicked');
      socket.off('user:typing');
      socket.off('user:stopped-typing');
      socket.off('message:read');
      socket.off('presence:update');
      socket.off('room:key-receive');
      socket.off('room:key-share-request');
      socket.off('room:request-granted');
      socket.off('room:request-denied');
      socket.off('room:auto-join');
      socket.off('message:mention');
    };
  }, [user, rooms]);

  useEffect(() => {
    onReconnect(async () => {
      const lastSeen = getLastSeenMessages();
      const roomsToBackfill = Object.entries(lastSeen)
        .filter(([, msgId]) => msgId)
        .map(([roomId, after]) => ({ roomId, after }));

      if (roomsToBackfill.length === 0) return;

      try {
        const res = await api.post('/rooms/backfill', { rooms: roomsToBackfill });
        const backfill = res.data.backfill || {};

        for (const [roomId, newMsgs] of Object.entries<any>(backfill)) {
          if (!newMsgs || newMsgs.length === 0) continue;

          if (roomId === currentRoomRef.current) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const unique = newMsgs.filter((m: Message) => !existingIds.has(m.id));
              return [...prev, ...unique];
            });

            for (const msg of newMsgs) {
              if (getRoomKey(roomId) && !msg.deleted && msg.text) {
                maybeDecrypt(roomId, msg);
              }
            }
          }

          const lastNew = newMsgs[newMsgs.length - 1];
          setLastSeenMessage(roomId, lastNew.id);
        }
      } catch {
        // backfill failed, will retry on next reconnect
      }
    });

    const socket = getSocket();
    if (!socket) return;
    socket.emit('presence:request-map', (map: any) => {
      if (map) {
        const enriched: any = {};
        for (const [userId, pres] of Object.entries<any>(map)) {
          enriched[userId] = { ...pres, username: pres.username || userId.slice(0, 8) };
        }
        setPresenceMap(enriched);
      }
    });
  }, []);

  async function selectRoom(room: Room | null) {
    if (!room) return;
    const socket = socketRef.current;
    if (currentRoom && socket) socket.emit('room:leave', { roomId: currentRoom.id });
    setCurrentRoom(room);

    // Instant Stale-While-Revalidate message rendering
    const cachedMsgs = cacheManager.getRoomMessages(room.id);
    if (cachedMsgs && cachedMsgs.length > 0) {
      setMessages(cachedMsgs);
    } else {
      setMessages([]);
    }

    setOnline([]);
    setMembers([]);
    setTypingUsers([]);
    setReadReceipts({});
    setThreadMessage(null);
    setThreadCounts({});
    setDecryptedMessages({});
    setKeyStatus(null);
    setReplyTo(null);
    // Clear unread count for this room
    setUnreadCounts((prev) => {
      const n = { ...prev };
      delete n[room.id];
      return n;
    });

    const isMember = memberRooms.has(room.id);
    if (room.type === 'private' && !isMember) return;

    try {
      const res = await api.get(`/rooms/${room.id}/messages`);
      let msgs = res.data.messages || [];

      // Persist to cache
      cacheManager.setRoomMessages(room.id, msgs);

      if (room.type === 'private') {
        await setupPrivateRoom(room);
      }

      setMessages(msgs);

      if (msgs.length > 0) {
        setLastSeenMessage(room.id, msgs[msgs.length - 1].id);
      }

      if (room.type === 'private' && getRoomKey(room.id)) {
        for (const msg of msgs) {
          if (!msg.deleted && msg.text) {
            maybeDecrypt(room.id, msg);
          }
        }
      }

      if (socket) {
        socket.emit('room:join', { roomId: room.id }, (resp: any) => {
          if (resp?.ok) {
            setOnline(resp.online);
            if (resp.members) setMembers(resp.members);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load room messages:', e);
    }
  }

  function leaveRoom(room: Room) {
    const socket = socketRef.current;
    if (socket) socket.emit('room:leave', { roomId: room.id });
    if (currentRoom?.id === room.id) {
      setCurrentRoom(null);
      setMessages([]);
      setOnline([]);
      setMembers([]);
      setTypingUsers([]);
      setThreadMessage(null);
      setDecryptedMessages({});
      setKeyStatus(null);
      setReplyTo(null);
    }
  }

  function handleRequestJoin(room: Room) {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('room:request-join', { roomId: room.id }, (resp: any) => {
      if (resp?.ok) {
        setPendingRooms((prev) => new Set([...prev, room.id]));
      }
    });
  }

  async function createRoom(name: string, type: RoomType, inactivityMinutes?: number) {
    const body: any = { name, type };
    if (type === 'ephemeral' && inactivityMinutes) body.inactivityMinutes = inactivityMinutes;
    const res = await api.post('/rooms', body);
    const data = res.data;
    setRooms((prev) => (prev.find((r) => r.id === data.room.id) ? prev : [...prev, data.room]));

    if (type === 'private') {
      try {
        const aesKey = await generateRoomKey();
        storeRoomKey(data.room.id, aesKey);
        const pubJwk = await getPublicKeyJwk();
        if (pubJwk) {
          const encrypted = await encryptRoomKey(pubJwk, aesKey);
          const socket = getSocket();
          if (socket) {
            socket.emit('room:key-store', { roomId: data.room.id, encryptedKey: encrypted });
          }
        }
        setKeyStatus('ready');
      } catch (err) {
        console.error('key generation failed:', err);
      }
    }

    selectRoom(data.room).catch(() => {});
  }

  async function send(text?: string, attachments: any[] = []) {
    if (!currentRoom) return;
    let textToSend = text || '';

    if (isPrivate && hasKey && textToSend) {
      try {
        const aesKey = getRoomKey(currentRoom.id);
        if (aesKey) {
          textToSend = await encryptText(aesKey, text || '');
        }
      } catch (err) {
        console.error('encrypt failed:', err);
        return;
      }
    }

    const clientMsgId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const payload: any = {
      roomId: currentRoom.id,
      text: textToSend,
      attachments: attachments || [],
      clientMsgId,
    };
    if (replyTo) {
      payload.replyTo = replyTo.id;
    }
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('room:join', { roomId: currentRoom.id });
    }
    sendOffline('message:send', payload);
    setReplyTo(null);
    if (isTypingRef.current) {
      const s = getSocket();
      if (s) s.emit('user:stopped-typing', { roomId: currentRoom.id });
      isTypingRef.current = false;
    }
  }

  function handleTyping() {
    if (!currentRoom) return;
    const socket = getSocket();
    if (!socket) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('user:typing', { roomId: currentRoom.id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('user:stopped-typing', { roomId: currentRoom.id });
      isTypingRef.current = false;
    }, 3000);
  }

  function deleteMessage(messageId: string) {
    if (!currentRoom) return;
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('message:delete', { roomId: currentRoom.id, messageId });
  }

  function deleteForMe(messageId: string) {
    if (!currentRoom) return;
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('message:delete-for-me', { roomId: currentRoom.id, messageId });
  }

  function handleReadReceipt(messageId: string) {
    if (!currentRoom) return;
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('message:read', { roomId: currentRoom.id, lastReadMessageId: messageId });
  }

  function handleReact(messageId: string, emoji: string) {
    if (!currentRoom) return;
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('message:react', { roomId: currentRoom.id, messageId, emoji });
  }

  function editMessage(messageId: string, newText: string) {
    if (!currentRoom || !messageId || !newText?.trim()) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('message:edit', { roomId: currentRoom.id, messageId, text: newText.trim() });
    }
  }

  function pinMessage(messageId: string) {
    if (!currentRoom || !messageId) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('message:pin', { roomId: currentRoom.id, messageId });
    }
  }

  function unpinMessage(messageId: string) {
    if (!currentRoom || !messageId) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('message:unpin', { roomId: currentRoom.id, messageId });
    }
  }

  async function forwardMessage(target: any, message: Message) {
    const socket = getSocket();
    if (!socket || !target || !message) return;

    const username = typeof message.sender === 'object' ? message.sender.username : message.senderUsername;
    const forwardedFrom = {
      senderUsername: username || membersMap?.[(message as any).senderId] || 'User',
      roomName: currentRoom?.name || 'chat',
    };

    if (target.type === 'channel') {
      socket.emit('message:send', {
        roomId: target.id,
        text: message.text || '',
        attachments: message.attachments || [],
        forwardedFrom,
      });
    } else {
      await api.post('/dm/send', {
        toUserId: target.id,
        text: message.text
          ? `[Forwarded from @${forwardedFrom.senderUsername}]: ${message.text}`
          : `[Forwarded attachment from @${forwardedFrom.senderUsername}]`,
      });
    }
  }

  async function loadOlderMessages() {
    if (!currentRoom || messages.length === 0) return;
    const oldestId = messages[0].id;
    try {
      const res = await api.get(`/rooms/${currentRoom.id}/messages?before=${oldestId}&limit=50`);
      const older = res.data.messages || [];
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    }
  }

  function refreshMembers() {
    if (!currentRoom) return;
    api.get(`/rooms/${currentRoom.id}/members`).then((r) => setMembers(r.data.members || []));
  }

  const displayMessages = messages.map((m) => {
    if (decryptedMessages[m.id]) {
      return { ...m, text: decryptedMessages[m.id] };
    }
    return m;
  });

  const markRoomAsRead = useCallback((roomId: string) => {
    setUnreadCounts((prev) => ({ ...prev, [roomId]: 0 }));
    setMentionAlerts((prev) => prev.filter((a) => a.roomId !== roomId));
  }, []);

  const clearRoomMessages = useCallback((roomId: string) => {
    if (currentRoomRef.current === roomId) {
      setMessages([]);
    }
  }, []);

  return {
    user,
    logout,
    rooms,
    setRooms,
    currentRoom,
    messages,
    displayMessages,
    online,
    members,
    showMembers,
    setShowMembers,
    showPresence,
    setShowPresence,
    typingUsers,
    presenceMap,
    readReceipts,
    threadMessage,
    setThreadMessage,
    threadCounts,
    decryptedMessages,
    keyStatus,
    currentInput,
    setCurrentInput,
    memberRooms,
    pendingRooms,
    replyTo,
    setReplyTo,
    replyToData,
    membersMap,
    toast,
    setToast,
    unreadCounts,
    mentionAlerts,
    setMentionAlerts,
    messagesContainerRef,
    isPrivate: currentRoom?.type === 'private',
    hasKey: currentRoom?.id ? !!getRoomKey(currentRoom.id) : false,
    selectRoom,
    leaveRoom,
    handleRequestJoin,
    createRoom,
    send,
    handleTyping,
    deleteMessage,
    deleteForMe,
    handleReadReceipt,
    handleReact,
    refreshMembers,
    editMessage,
    pinMessage,
    unpinMessage,
    forwardMessage,
    loadOlderMessages,
    markRoomAsRead,
    clearRoomMessages,
  };
}
