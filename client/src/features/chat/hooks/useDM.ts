import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { getSocket } from '../../../shared/utils';
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

  // Send a message in an accepted DM via the normal message socket
  const sendDMMessage = useCallback(
    (text: string) => {
      if (!currentDM || !text.trim()) return;
      const roomIdStr = (currentDM.id || currentDM._id)?.toString();
      const socket = getSocket();
      const clientMsgId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      socket?.emit(
        'message:send',
        { roomId: roomIdStr, text: text.trim(), clientMsgId },
        (ack: any) => {
          if (ack?.ok && ack.message) {
            setDmMessages((prev) => {
              if (prev.some((m) => m.id === ack.message.id || m._id === ack.message.id)) return prev;
              return [...prev, ack.message];
            });
            // Update lastMessage in conversations
            setConversations((prev) =>
              prev.map((c) =>
                (c.id?.toString() === roomIdStr || c._id?.toString() === roomIdStr)
                  ? { ...c, lastMessage: { text: ack.message.text, createdAt: ack.message.createdAt } }
                  : c
              )
            );
          }
        }
      );
    },
    [currentDM]
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
      const activeDmId = (currentDM?.id || currentDM?._id)?.toString();
      const targetRoomId = roomId?.toString();

      // Update conversation list preview
      setConversations((prev) =>
        prev.map((c) =>
          (c.id?.toString() === targetRoomId || c._id?.toString() === targetRoomId)
            ? { ...c, lastMessage: { text: message.text, createdAt: message.createdAt } }
            : c
        )
      );

      // If viewing this DM, append message dynamically
      if (activeDmId && targetRoomId === activeDmId) {
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === message.id || m._id === message.id)) return prev;
          return [...prev, message];
        });
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
