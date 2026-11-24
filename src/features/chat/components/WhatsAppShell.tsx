'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Room, User, Message, DMConversation, StatusStory } from '../../../types';
import WhatsAppHeader from './WhatsAppHeader';
import WhatsAppComposer from './WhatsAppComposer';
import MessageBubble from './MessageBubble';
import ChatItemRow from './ChatItemRow';
import ContactInfoDrawer from './ContactInfoDrawer';
import MediaLightbox from './MediaLightbox';
import StatusViewerModal from './StatusViewerModal';
import ScrollToBottom from './ScrollToBottom';
import { formatDateSeparator } from '../../../shared/utils/dateUtils';
import { api } from '../../../shared/utils/api';
import { getSocket } from '../../../shared/utils';

interface WhatsAppShellProps {
  currentUser: User;
  rooms: Room[];
  conversations: DMConversation[];
  activeRoom: Room | null;
  activeDM: DMConversation | null;
  messages: Message[];
  onlineUsers: string[];
  typingUsers: { userId: string; username: string }[];
  onSelectRoom: (room: Room) => void;
  onSelectDM: (dm: DMConversation) => void;
  onSendMessage: (text: string, attachments?: any[], location?: any, isVoiceNote?: boolean, voiceMeta?: any) => void;
  onSendTyping: () => void;
  onDeleteMessage: (messageId: string) => void;
  onDeleteForMe: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onStartCall: (toUserId: string | null, roomId: string, isVideo: boolean) => void;
  onCreateGroupModal?: () => void;
  onUploadFile?: (file: File) => Promise<any>;
}

export const WhatsAppShell: React.FC<WhatsAppShellProps> = ({
  currentUser,
  rooms,
  conversations,
  activeRoom,
  activeDM,
  messages,
  onlineUsers,
  typingUsers,
  onSelectRoom,
  onSelectDM,
  onSendMessage,
  onSendTyping,
  onDeleteMessage,
  onDeleteForMe,
  onReact,
  onStartCall,
  onCreateGroupModal,
  onUploadFile,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // Mobile state: 'sidebar' (chat list) or 'chat' (active conversation)
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'unread' | 'groups' | 'contacts'>('all');
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);

  // Status stories state
  const [statusStories, setStatusStories] = useState<StatusStory[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Lightbox state
  const [lightboxMedia, setLightboxMedia] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const myId = currentUser?.id || (currentUser as any)?._id;

  // Viewport breakpoint detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync mobile view with active room/DM selection
  useEffect(() => {
    if (activeRoom || activeDM) {
      setMobileView('chat');
    }
  }, [activeRoom?.id, activeDM?.id]);

  // Fetch status feed
  const fetchStatusFeed = async () => {
    try {
      const res = await api.get('/status/feed');
      if (res.data?.statuses) {
        setStatusStories(res.data.statuses);
      }
    } catch (err: any) {
      console.warn('[status] fetch feed error:', err.message);
    }
  };

  useEffect(() => {
    fetchStatusFeed();
    const socket = getSocket();
    if (socket) {
      socket.on('status:new', (newStatus: StatusStory) => {
        setStatusStories((prev) => [newStatus, ...prev.filter((s) => s.id !== newStatus.id)]);
      });
      return () => {
        socket.off('status:new');
      };
    }
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    }
  }, [messages.length]);

  // Handle mobile back to chat list
  const handleBackToSidebar = () => {
    setMobileView('sidebar');
    setShowRightDrawer(false);
  };

  // Combine and sort chat items (DMs + Group Channels)
  const combinedChatItems = useMemo(() => {
    const list: any[] = [];

    // Add DM conversations
    for (const c of conversations) {
      const partnerUser = c.partner;
      const lastMsg = c.lastMessage || c.room?.lastMessage;
      list.push({
        type: 'dm',
        id: c.id,
        name: partnerUser?.name || partnerUser?.username || 'User',
        avatar: partnerUser?.profileImage,
        lastMessage: lastMsg?.text || (lastMsg?.attachments?.length ? 'Attachment' : ''),
        lastMessageTime: lastMsg?.createdAt ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unreadCount: c.unreadCount || 0,
        rawTime: lastMsg?.createdAt ? new Date(lastMsg.createdAt).getTime() : 0,
        partner: partnerUser,
        room: c.room,
        dm: c,
      });
    }

    // Add group channels
    for (const r of rooms) {
      if (r.isDM) continue;
      const lastMsg = r.lastMessage;
      list.push({
        type: 'group',
        id: r.id,
        name: r.name,
        avatar: r.groupIcon,
        lastMessage: lastMsg?.text || (lastMsg?.attachments?.length ? 'Attachment' : ''),
        lastMessageTime: lastMsg?.createdAt ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unreadCount: r.unreadCount || 0,
        rawTime: lastMsg?.createdAt ? new Date(lastMsg.createdAt).getTime() : 0,
        room: r,
      });
    }

    // Sort newest message first
    list.sort((a, b) => b.rawTime - a.rawTime);

    // Apply search filter and tab filter
    return list.filter((item) => {
      if (searchFilter && !item.name.toLowerCase().includes(searchFilter.toLowerCase())) {
        return false;
      }
      if (activeTabFilter === 'unread' && item.unreadCount === 0) return false;
      if (activeTabFilter === 'groups' && item.type !== 'group') return false;
      if (activeTabFilter === 'contacts' && item.type !== 'dm') return false;
      return true;
    });
  }, [conversations, rooms, searchFilter, activeTabFilter]);

  // Active chat details
  const currentPartner = activeDM?.partner;
  const isCurrentOnline = currentPartner ? onlineUsers.includes(currentPartner.id || (currentPartner as any)._id) : false;
  const isCurrentTyping = currentPartner
    ? typingUsers.some((u) => u.userId === currentPartner.id || u.userId === (currentPartner as any)._id)
    : false;

  const currentChatTitle = activeDM
    ? (currentPartner?.name || currentPartner?.username || 'User')
    : (activeRoom?.name || 'Select a chat');

  const currentChatAvatar = activeDM ? currentPartner?.profileImage : activeRoom?.groupIcon;

  // Media lightbox trigger
  const handleOpenMedia = (mediaItem: any) => {
    // Gather all media items in current messages
    const allMedia: any[] = [];
    messages.forEach((m) => {
      (m.attachments || []).forEach((att) => {
        allMedia.push({
          url: att.url,
          filename: att.filename,
          fileType: att.fileType,
          senderUsername: m.senderUsername,
          createdAt: m.createdAt,
        });
      });
    });

    const foundIdx = allMedia.findIndex((item) => item.url === mediaItem.url);
    setLightboxMedia(allMedia.length > 0 ? allMedia : [mediaItem]);
    setLightboxIndex(foundIdx >= 0 ? foundIdx : 0);
    setIsLightboxOpen(true);
  };

  // Group messages by date with sticky pills
  const renderMessagesWithDatePills = () => {
    const elements: React.ReactNode[] = [];
    let lastDateStr = '';

    messages.forEach((msg, idx) => {
      const msgDate = msg.createdAt ? formatDateSeparator(msg.createdAt) : '';
      if (msgDate && msgDate !== lastDateStr) {
        elements.push(
          <div key={`date-${msgDate}-${idx}`} className="wa-date-pill">
            {msgDate}
          </div>
        );
        lastDateStr = msgDate;
      }

      elements.push(
        <MessageBubble
          key={msg.id || idx}
          message={msg}
          meId={myId}
          isGroup={!activeDM}
          readReceiptsEnabled={currentUser.privacySettings?.readReceipts !== false}
          onReply={(m) => setReplyMessage(m)}
          onForward={(m) => console.log('Forward', m)}
          onReact={onReact}
          onDelete={onDeleteMessage}
          onDeleteForMe={onDeleteForMe}
          onMediaClick={handleOpenMedia}
        />
      );
    });

    return elements;
  };

  return (
    <div className="wa-shell select-none">
      {/* ── 1. LEFT SIDEBAR (Chats List & Navigation) ── */}
      <div className={`wa-sidebar ${isMobile && mobileView === 'chat' ? 'mobile-hidden' : ''}`}>
        {/* Sidebar Header */}
        <div className="wa-header">
          <div className="flex items-center gap-3">
            {currentUser.profileImage ? (
              <img
                src={currentUser.profileImage}
                alt={currentUser.username}
                className="wa-header-avatar cursor-pointer"
                title="Profile Settings"
                onClick={() => router.push('/settings')}
              />
            ) : (
              <div
                className="wa-header-avatar flex items-center justify-center font-bold text-sm text-[var(--wa-green-primary)] cursor-pointer"
                onClick={() => router.push('/settings')}
              >
                {currentUser.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-sm text-[var(--wa-text-primary)]">
              DropTalk
            </span>
          </div>

          <div className="wa-header-actions">
            {/* Status Story Ring Trigger */}
            <button
              onClick={() => {
                if (statusStories.length > 0) {
                  setActiveStoryIndex(0);
                  setShowStatusModal(true);
                } else {
                  alert('No active status stories right now.');
                }
              }}
              className="wa-icon-btn relative"
              title="Status updates"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              {statusStories.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[var(--wa-green-primary)] rounded-full ring-2 ring-[var(--wa-panel-header)]" />
              )}
            </button>

            {/* New Group / Chat */}
            {onCreateGroupModal && (
              <button
                onClick={onCreateGroupModal}
                className="wa-icon-btn"
                title="New group"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </button>
            )}

            {/* Settings */}
            <button
              onClick={() => router.push('/settings')}
              className="wa-icon-btn"
              title="Settings"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Tabs */}
        <div className="p-2 border-b border-[var(--wa-border)] bg-[var(--wa-panel-bg)] space-y-2">
          <div className="flex items-center gap-2 bg-[var(--wa-panel-search)] px-3 py-1.5 rounded-lg border border-[var(--wa-border)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--wa-text-secondary)]">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search or start new chat"
              className="w-full bg-transparent border-none outline-none text-xs text-[var(--wa-text-primary)]"
            />
            {searchFilter && (
              <button onClick={() => setSearchFilter('')} className="text-xs text-[var(--wa-text-secondary)]">
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
            {(['all', 'unread', 'groups', 'contacts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTabFilter(tab)}
                className={`px-3 py-1 rounded-full font-medium capitalize transition-colors ${
                  activeTabFilter === tab
                    ? 'bg-[var(--wa-green-primary)]/15 text-[var(--wa-green-primary)] font-bold'
                    : 'bg-[var(--wa-panel-search)] text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--wa-border)]">
          {combinedChatItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--wa-text-secondary)]">
              No conversations found.
            </div>
          ) : (
            combinedChatItems.map((item) => (
              <ChatItemRow
                key={`${item.type}-${item.id}`}
                id={item.id}
                name={item.name}
                avatar={item.avatar}
                lastMessage={item.lastMessage}
                lastMessageTime={item.lastMessageTime}
                unreadCount={item.unreadCount}
                isActive={
                  item.type === 'dm'
                    ? activeDM?.id === item.id
                    : activeRoom?.id === item.id
                }
                isDM={item.type === 'dm'}
                hasActiveStatus={statusStories.some(
                  (s) => (s.user?.id || (s.user as any)?._id)?.toString() === item.partner?.id?.toString()
                )}
                onClick={() => {
                  if (item.type === 'dm') onSelectDM(item.dm);
                  else onSelectRoom(item.room);
                }}
                onStatusClick={() => {
                  const idx = statusStories.findIndex(
                    (s) => (s.user?.id || (s.user as any)?._id)?.toString() === item.partner?.id?.toString()
                  );
                  if (idx >= 0) {
                    setActiveStoryIndex(idx);
                    setShowStatusModal(true);
                  }
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* ── 2. MAIN CHAT VIEW (Active Conversation) ── */}
      <div className={`wa-main-area ${isMobile && mobileView === 'sidebar' ? 'mobile-hidden' : ''}`}>
        {activeRoom || activeDM ? (
          <>
            {/* WhatsApp Top Chat Header */}
            <WhatsAppHeader
              title={currentChatTitle}
              subtitle={activeDM ? (isCurrentOnline ? 'online' : 'offline') : `${activeRoom?.members?.length || 0} participants`}
              avatar={currentChatAvatar}
              isOnline={isCurrentOnline}
              isTyping={isCurrentTyping}
              hasDisappearingTimer={(activeRoom?.disappearingTimer || 'off') !== 'off'}
              onBackMobile={handleBackToSidebar}
              onVoiceCall={() => onStartCall(currentPartner?.id || null, (activeDM?.id || activeRoom?.id)!, false)}
              onVideoCall={() => onStartCall(currentPartner?.id || null, (activeDM?.id || activeRoom?.id)!, true)}
              onOpenInfo={() => setShowRightDrawer((prev) => !prev)}
            />

            {/* WhatsApp Doodle Wallpaper Messages Container */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-3 flex flex-col wa-doodle-bg relative"
            >
              {renderMessagesWithDatePills()}
              <ScrollToBottom containerRef={messagesContainerRef} />
            </div>

            {/* WhatsApp Composer */}
            <WhatsAppComposer
              onSendMessage={onSendMessage}
              onTyping={onSendTyping}
              replyToMessage={replyMessage}
              onClearReply={() => setReplyMessage(null)}
              disabled={activeRoom?.onlyAdminsCanMessage && !activeDM}
              onUploadFile={onUploadFile}
            />
          </>
        ) : (
          /* Empty Chat Splash */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--wa-text-secondary)] wa-doodle-bg select-none">
            <div className="w-16 h-16 rounded-full bg-[var(--wa-panel-bg)] border border-[var(--wa-border)] flex items-center justify-center text-3xl mb-4 shadow-sm">
              💬
            </div>
            <h2 className="text-xl font-bold text-[var(--wa-text-primary)] mb-2">DropTalk for Web</h2>
            <p className="text-xs max-w-sm leading-relaxed mb-6">
              Send and receive messages without keeping your phone online. Use DropTalk on your browser with zero-knowledge encryption.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[var(--wa-text-secondary)]">
              <span>🔒</span>
              <span>End-to-end encrypted</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. RIGHT CONTACT / GROUP INFO DRAWER ── */}
      {showRightDrawer && (activeRoom || activeDM) && (
        <ContactInfoDrawer
          room={activeRoom || activeDM?.room}
          partner={currentPartner}
          currentUserId={myId}
          onClose={() => setShowRightDrawer(false)}
          onUpdateDisappearingTimer={(timer) => {
            const roomId = activeDM?.id || activeRoom?.id;
            if (roomId) {
              api.put(`/rooms/${roomId}/disappearing-timer`, { disappearingTimer: timer });
            }
          }}
          onToggleAdminOnly={(enabled) => {
            if (activeRoom?.id) {
              api.put(`/rooms/${activeRoom.id}/permissions`, { onlyAdminsCanMessage: enabled });
            }
          }}
        />
      )}

      {/* ── 4. FULLSCREEN STATUS STORIES MODAL ── */}
      {showStatusModal && statusStories.length > 0 && activeStoryIndex !== null && (
        <StatusViewerModal
          isOpen={showStatusModal}
          statuses={statusStories}
          initialIndex={activeStoryIndex}
          currentUserId={myId}
          onClose={() => {
            setShowStatusModal(false);
            setActiveStoryIndex(null);
          }}
          onRecordView={(statusId) => api.post(`/status/${statusId}/view`)}
        />
      )}

      {/* ── 5. FULLSCREEN MEDIA LIGHTBOX ── */}
      {isLightboxOpen && (
        <MediaLightbox
          isOpen={isLightboxOpen}
          mediaList={lightboxMedia}
          initialIndex={lightboxIndex}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </div>
  );
};

export default WhatsAppShell;
