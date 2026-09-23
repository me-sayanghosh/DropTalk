import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { getSocket, sendDMMessageHttp, isSocketConnected } from '../../../shared/utils';
import { cacheManager } from '../../../shared/utils/cacheManager';
import { API_BASE, STORAGE_KEYS } from '../../../shared/utils/constants';
import { Room, Message, DMConversation } from '../../../types';

function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function useDM() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>(() => cacheManager.getConversationsCache() || []);
  const [currentDM, setCurrentDM] = useState<Room | null>(null); // the room object
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const socketRef = useRef<any>(null);

  const dmMessagesRef = useRef<Message[]>(dmMessages);
  useEffect(() => {
    dmMessagesRef.current = dmMessages;
  }, [dmMessages]);

  // Fetch all DM conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dm/conversations`, {
        headers: { ...authHeader() },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const convos = data.conversations || [];
      setConversations(convos);
      cacheManager.setConversationsCache(convos);

      // Preload partner profiles & avatars into cache
      convos.forEach((c: any) => {
        if (c.partner?.id) {
          cacheManager.setUserProfile(c.partner.id, c.partner);
        }
      });

      setPendingCount(
        convos.filter(
          (c: any) => c.dmStatus === 'pending' && c.dmInitiator !== user?.id
        ).length
      );
      return convos;
    } catch (_) {
      return [];
    }
  }, [user?.id]);

  // Fetch messages for a DM conversation
  const fetchDMMessages = useCallback(async (roomId?: string | null) => {
    if (!roomId) return [];
    const roomIdStr = roomId.toString();
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/dm/${roomIdStr}/messages`, {
        headers: { ...authHeader() },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const msgs = data.messages || [];
      setDmMessages(msgs);
      cacheManager.setRoomMessages(roomIdStr, msgs);
      return msgs;
    } catch (err) {
      console.warn('Failed to fetch DM messages:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Open a DM conversation (Always fetch latest messages and join socket room)
  const openDM = useCallback(
    async (room: Room | null) => {
      if (!room) return;
      const roomIdStr = (room.id || room._id)?.toString();
      setCurrentDM(room);

      // Join socket room immediately so real-time events arrive
      const socket = getSocket();
      socket?.emit('room:join', { roomId: roomIdStr });

      // Fetch fresh messages
      await fetchDMMessages(roomIdStr);
    },
    [fetchDMMessages]
  );

  // Send a DM from a group chat message (POST /api/dm/send)
  const sendDMRequest = useCallback(async (toUserId: string, initialText: string) => {
    try {
      const res = await fetch(`${API_BASE}/dm/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ toUserId, text: initialText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send DM');
      await fetchConversations();
      return data.room;
    } catch (err: any) {
      console.error('[useDM] sendDMRequest error:', err.message);
      throw err;
    }
  }, [fetchConversations]);

  // Send a message in an accepted DM via dual transport (Socket.IO + HTTP fallback) with optimistic UI
  const sendDMMessage = useCallback(
    async (text: string) => {
      if (!currentDM || !text.trim()) return;
      const roomIdStr = (currentDM.id || (currentDM as any)._id)?.toString();
      const clientMsgId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      const tempId = `temp-${clientMsgId}`;

      // 1. Optimistic message rendering
      const optimisticMsg: Message = {
        id: tempId,
        room: roomIdStr,
        roomId: roomIdStr,
        text: text.trim(),
        sender: {
          id: user?.id || '',
          username: user?.username || 'You',
          profileImage: user?.profileImage,
        } as any,
        senderId: user?.id,
        senderUsername: user?.username || 'You',
        attachments: [],
        clientMsgId,
        status: 'sending',
        createdAt: new Date().toISOString(),
      };

      setDmMessages((prev) => [...prev, optimisticMsg]);

      // Optimistically update lastMessage preview in conversations list
      setConversations((prev) =>
        prev.map((c) =>
          c.id?.toString() === roomIdStr || c._id?.toString() === roomIdStr
            ? { ...c, lastMessage: { text: text.trim(), createdAt: optimisticMsg.createdAt } }
            : c
        )
      );

      // 2. Dual-transport delivery (Socket.IO with timeout -> HTTP REST API)
      try {
        const confirmedMsg = await sendDMMessageHttp(roomIdStr, {
          text: text.trim(),
          clientMsgId,
        });

        if (confirmedMsg) {
          setDmMessages((prev) => {
            const hasClientMatch = confirmedMsg.clientMsgId && prev.some((m) => m.clientMsgId === confirmedMsg.clientMsgId);
            if (hasClientMatch) {
              return prev.map((m) => (m.clientMsgId === confirmedMsg.clientMsgId ? confirmedMsg : m));
            }
            const hasTempMatch = prev.some((m) => m.id === tempId);
            if (hasTempMatch) {
              return prev.map((m) => (m.id === tempId ? confirmedMsg : m));
            }
            if (prev.some((m) => m.id === confirmedMsg.id || (m as any)._id === confirmedMsg.id)) return prev;
            return [...prev, confirmedMsg];
          });

          cacheManager.appendRoomMessage(roomIdStr, confirmedMsg);

          setConversations((prev) =>
            prev.map((c) =>
              c.id?.toString() === roomIdStr || c._id?.toString() === roomIdStr
                ? { ...c, lastMessage: { text: confirmedMsg.text, createdAt: confirmedMsg.createdAt } }
                : c
            )
          );
        }
      } catch (err) {
        console.error('[useDM] Failed to deliver DM:', err);
        setDmMessages((prev) =>
          prev.map((m) => (m.id === tempId || m.clientMsgId === clientMsgId ? { ...m, status: 'failed' } : m))
        );
      }
    },
    [currentDM, user]
  );

  // Accept a DM request
  const acceptDM = useCallback(
    async (roomId: string) => {
      const roomIdStr = roomId.toString();
      const res = await fetch(`${API_BASE}/dm/${roomIdStr}/accept`, {
        method: 'POST',
        headers: { ...authHeader() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept DM');
      setCurrentDM(data.room);
      setConversations((prev) =>
        prev.map((c) => (c.id?.toString() === roomIdStr ? { ...c, dmStatus: 'accepted' } : c))
      );
      setPendingCount((n) => Math.max(0, n - 1));
    },
    []
  );

  // Remove a DM conversation
  const removeDM = useCallback(
    async (roomId: string) => {
      const roomIdStr = roomId.toString();
      const res = await fetch(`${API_BASE}/dm/${roomIdStr}`, {
        method: 'DELETE',
        headers: { ...authHeader() },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove DM');
      }
      setConversations((prev) => prev.filter((c) => c.id?.toString() !== roomIdStr));
      const activeDmId = (currentDM?.id || currentDM?._id)?.toString();
      if (activeDmId === roomIdStr) {
        setCurrentDM(null);
        setDmMessages([]);
      }
      setPendingCount((n) => Math.max(0, n - 1));
    },
    [currentDM]
  );

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    function onMessageNew({ roomId, message }: { roomId: string; message: Message }) {
      const activeDmId = (currentDM?.id || (currentDM as any)?._id)?.toString();
      const targetRoomId = roomId?.toString();

      // Update conversation list preview
      setConversations((prev) =>
        prev.map((c) =>
          (c.id?.toString() === targetRoomId || c._id?.toString() === targetRoomId)
            ? { ...c, lastMessage: { text: message.text, createdAt: message.createdAt } }
            : c
        )
      );

      // If viewing this DM, append or replace message dynamically
      if (activeDmId && targetRoomId === activeDmId) {
        setDmMessages((prev) => {
          if (message.clientMsgId && prev.some((m) => m.clientMsgId === message.clientMsgId)) {
            return prev.map((m) => (m.clientMsgId === message.clientMsgId ? message : m));
          }
          if (prev.some((m) => m.id === message.id || (m as any)._id === message.id)) return prev;
          return [...prev, message];
        });
        cacheManager.appendRoomMessage(targetRoomId, message);
      }
    }

    function onDMNewRequest({ fromUserId }: { roomId: string; fromUserId: string; fromUsername: string }) {
      if (fromUserId === user?.id) return;
      fetchConversations();
    }

    function onDMAccepted({ roomId, acceptedBy }: { roomId: string; acceptedBy: string }) {
      const roomIdStr = roomId?.toString();
      setConversations((prev) =>
        prev.map((c) => (c.id?.toString() === roomIdStr ? { ...c, dmStatus: 'accepted' } : c))
      );
      const activeDmId = (currentDM?.id || currentDM?._id)?.toString();
      if (activeDmId === roomIdStr) {
        setCurrentDM((prev) => (prev ? { ...prev, dmStatus: 'accepted' } : prev));
      }
      if (acceptedBy !== user?.id) {
        setPendingCount((n) => Math.max(0, n - 1));
      }
    }

    function onDMRemoved({ roomId }: { roomId: string }) {
      const roomIdStr = roomId?.toString();
      setConversations((prev) => prev.filter((c) => c.id?.toString() !== roomIdStr));
      const activeDmId = (currentDM?.id || currentDM?._id)?.toString();
      if (activeDmId === roomIdStr) {
        setCurrentDM(null);
        setDmMessages([]);
      }
    }

    socket.on('message:new', onMessageNew);
    socket.on('dm:new-request', onDMNewRequest);
    socket.on('dm:accepted', onDMAccepted);
    socket.on('dm:removed', onDMRemoved);

    return () => {
      socket.off('message:new', onMessageNew);
      socket.off('dm:new-request', onDMNewRequest);
      socket.off('dm:accepted', onDMAccepted);
      socket.off('dm:removed', onDMRemoved);
    };
  }, [currentDM, user?.id, fetchConversations]);

  // Initial load
  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  // Polling fallback when WebSockets are disconnected (e.g. Vercel serverless)
  useEffect(() => {
    const activeDmId = (currentDM?.id || (currentDM as any)?._id)?.toString();
    if (!activeDmId) return;

    const interval = setInterval(async () => {
      if (isSocketConnected()) return;

      try {
        const currentMsgs = dmMessagesRef.current;
        const validMsgs = currentMsgs.filter((m) => m && !m.id?.startsWith('temp-'));
        const lastMsg = validMsgs[validMsgs.length - 1];
        const afterQuery = lastMsg?.id ? `?after=${lastMsg.id}` : '';
        const res = await fetch(`${API_BASE}/dm/${activeDmId}/messages${afterQuery}`, {
          headers: { ...authHeader() },
        });
        if (!res.ok) return;
        const data = await res.json();
        const incoming: Message[] = data.messages || [];

        if (incoming.length > 0) {
          setDmMessages((prev) => {
            const incomingClientIds = new Set(incoming.map((m) => m.clientMsgId).filter(Boolean));
            const updated = prev.map((m) => {
              if (m.clientMsgId && incomingClientIds.has(m.clientMsgId)) {
                return incoming.find((im) => im.clientMsgId === m.clientMsgId) || m;
              }
              return m;
            });

            const updatedIds = new Set(updated.map((m) => m.id));
            const newToAdd = incoming.filter((im) => !updatedIds.has(im.id));
            if (newToAdd.length === 0) return updated;
            return [...updated, ...newToAdd];
          });
        }
      } catch {
        // Polling silent fallback
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [currentDM]);

  // Periodically refresh conversations when socket is not connected
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (!isSocketConnected()) {
        fetchConversations();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [user, fetchConversations]);

  return {
    conversations,
    currentDM,
    setCurrentDM,
    dmMessages,
    loading,
    pendingCount,
    openDM,
    sendDMRequest,
    sendDMMessage,
    acceptDM,
    removeDM,
    fetchConversations,
  };
}
