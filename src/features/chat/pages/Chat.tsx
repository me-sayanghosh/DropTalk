'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import useChat from '../hooks/useChat';
import useDM from '../hooks/useDM';
import {
  Channels, MemberList, TypingIndicator, PresenceMap, ThreadPanel,
  PendingRequests, MessageList, MessageInput,
  DMPanel, DMChat, CreateChannelModal, UserProfileCard, ForwardModal, MessageSearchModal,
  PinnedMessagesModal, ChannelSettingsModal, CallOverlay, QuickSwitcherModal, KeyboardShortcutsModal,
  CallLogsPanel, CallLogsMainView, ChannelMembersPage,
} from '../components';
import NotificationDrawer from '../../notifications/NotificationDrawer';
import { useNotifications } from '../../notifications/useNotifications';
import { useWebRTC } from '../hooks/useWebRTC';
import { useCalls } from '../../calls/hooks/useCalls';
import { useTheme } from '../../../shared/hooks/useTheme';
import { NotificationsPanel } from '../../notifications/components/NotificationsPanel';
import { NotificationsMainView } from '../../notifications/components/NotificationsMainView';
import { formatBadgeCount } from '../../../shared/utils/dateUtils';
import { useToast } from '../../../shared/context/ToastContext';
import { NotificationItem, CallLog, Room, User } from '../../../types';
import NavRail from '../../../shared/components/NavRail';

export default function Chat() {
  const toastCtx = useToast();
  const showToast = toastCtx?.showToast;
  const [notifFilter, setNotifFilter] = useState('all');
  const {
    user, logout, rooms, roomsLoading, currentRoom, displayMessages, online, members,
    showMembers, setShowMembers, showPresence, setShowPresence,
    typingUsers, presenceMap, readReceipts, threadMessage, setThreadMessage,
    threadCounts, keyStatus, currentInput, setCurrentInput,
    memberRooms, pendingRooms, replyTo, setReplyTo, replyToData, membersMap,
    messagesContainerRef, isPrivate, hasKey, unreadCounts, mentionAlerts,
    selectRoom, leaveRoom, handleRequestJoin, createRoom,
    send, handleTyping, deleteMessage, deleteForMe, handleReadReceipt, handleReact, refreshMembers,
    editMessage, pinMessage, unpinMessage, forwardMessage, loadOlderMessages,
    markRoomAsRead, clearRoomMessages,
  } = useChat();

  const {
    conversations, currentDM, setCurrentDM, dmMessages, loading: dmLoading,
    pendingCount, openDM, sendDMRequest, sendDMMessage, acceptDM, removeDM, fetchConversations,
  } = useDM();

  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    removeNotificationsForRoom,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications(user);
  const {
    callState, callerInfo, localStream, remoteStream, isMuted, isVideoOff, isScreenSharing,
    startCall, acceptCall, rejectCall, endCall, toggleMute, toggleVideo, toggleScreenShare,
  } = useWebRTC(user, membersMap);

  const { callLogs, loading: callLogsLoading, addCallLog, clearCallHistory } = useCalls(user);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);

  const { theme, toggleTheme } = useTheme();

  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [showChannelSettingsModal, setShowChannelSettingsModal] = useState(false);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<any>(null);

  const getInitialTab = (): 'calls' | 'notifications' | 'dm' | 'chat' => {
    const p = pathname;
    if (p.startsWith('/calls')) return 'calls';
    if (p.startsWith('/notifications')) return 'notifications';
    if (p.startsWith('/dm')) return 'dm';
    return 'chat';
  };

  const getInitialMobileView = (): 'sidebar' | 'chat' => {
    const p = pathname;
    if (p.startsWith('/calls') || p.startsWith('/notifications')) return 'chat';
    return 'sidebar';
  };

  const [navRailTab, setNavRailTab] = useState<'calls' | 'notifications' | 'dm' | 'chat'>(getInitialTab);
  const [channelView, setChannelView] = useState<'chat' | 'members'>('chat');
  const [dmRequestToast, setDmRequestToast] = useState<string | null>(null);
  const [mobileActiveView, setMobileActiveView] = useState<'sidebar' | 'chat'>(getInitialMobileView);

  // Reset channel view to chat whenever room changes
  useEffect(() => {
    setChannelView('chat');
  }, [currentRoom?.id]);

  // Sync tab & mobile active view with URL location changes and reload
  useEffect(() => {
    const p = pathname;
    if (p.startsWith('/calls')) {
      setNavRailTab('calls');
      setMobileActiveView('chat');
    } else if (p.startsWith('/notifications')) {
      setNavRailTab('notifications');
      setMobileActiveView('chat');
    } else if (p.startsWith('/dm')) {
      setNavRailTab('dm');
    } else if (p.startsWith('/channels') || p === '/chat') {
      setNavRailTab('chat');
    }

    const tab = searchParams.get('tab');
    if (tab && ['calls', 'notifications', 'dm', 'chat'].includes(tab)) {
      setNavRailTab(tab as any);
    }
    if (searchParams.get('openCreate') === 'true') {
      setShowCreateModal(true);
    }
    if (searchParams.get('openSearch') === 'true') {
      setShowQuickSwitcher(true);
    }
  }, [pathname, searchParams]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickSwitcher((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-remove notifications for active channel room
  useEffect(() => {
    if (currentRoom?.id) {
      removeNotificationsForRoom(currentRoom.id);
    }
  }, [currentRoom?.id, removeNotificationsForRoom]);

  // Auto-remove notifications for active DM conversation
  useEffect(() => {
    if (currentDM?.id) {
      removeNotificationsForRoom(currentDM.id);
    }
  }, [currentDM?.id, removeNotificationsForRoom]);

  // Handle clicking a notification: mark read, auto-remove, and redirect to target chat
  async function handleSelectNotification(notif: NotificationItem) {
    if (!notif) return;

    // 1. Mark as read & auto-remove notification from list
    deleteNotification(notif.id);
    if (notif.roomId) {
      removeNotificationsForRoom(notif.roomId);
    }

    // 2. Redirect to chat where the message came from
    const notifRoomId = notif.roomId?.toString();
    const isDM = notif.type === 'dm' || (notifRoomId && notifRoomId.startsWith('dm-'));

    if (isDM) {
      setNavRailTab('dm');
      const freshConvos = await fetchConversations();
      const listToSearch = (freshConvos && freshConvos.length > 0) ? freshConvos : conversations;

      const targetDM = listToSearch.find(
        (c: any) =>
          c.id?.toString() === notifRoomId ||
          c._id?.toString() === notifRoomId ||
          c.partner?.id?.toString() === notif.actorId?.toString() ||
          c.partner?.id?.toString() === (notif.actor as any)?.id?.toString()
      );

      if (targetDM) {
        await openDM(targetDM);
      } else if (notifRoomId) {
        await openDM({ id: notifRoomId, partner: notif.actor || { id: notif.actorId || '', username: 'User' } } as any);
      }
    } else {
      setNavRailTab('chat');
      const targetRoom = rooms.find(
        (r: Room) => r.id?.toString() === notifRoomId || (r as any)._id?.toString() === notifRoomId
      );
      if (targetRoom) {
        selectRoom(targetRoom);
      }
    }
    setShowNotifDrawer(false);
  }

  // Handle "Message Privately" clicked on a group message
  async function handleDMUser(toUserId: string, toUsername?: string) {
    const myId = user?.id || (user as any)?._id;
    if (myId && String(toUserId) === String(myId)) {
      if (showToast) {
        showToast({
          title: 'Direct Message',
          message: 'You cannot start a direct message with yourself.',
          type: 'info',
          category: 'dm',
        });
      } else {
        setDmRequestToast('You cannot start a direct message with yourself.');
        setTimeout(() => setDmRequestToast(null), 3000);
      }
      return;
    }

    try {
      const dmText = `Hi! I want to message you privately.`;
      const room = await sendDMRequest(toUserId, dmText);
      // Switch to DM tab and open the conversation
      setNavRailTab('dm');
      openDM({ ...room, partner: { id: toUserId, username: toUsername || 'User' } });
      const successMsg = `DM request sent to @${toUsername || 'User'}`;
      if (showToast) {
        showToast({
          title: 'Direct Message',
          message: successMsg,
          type: 'success',
          category: 'dm',
        });
      } else {
        setDmRequestToast(successMsg);
        setTimeout(() => setDmRequestToast(null), 3000);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err.message || 'Failed to send DM request';
      if (showToast) {
        showToast({
          title: 'Direct Message Failed',
          message: errMsg,
          type: 'error',
          category: 'dm',
        });
      } else {
        setDmRequestToast(`Failed: ${errMsg}`);
        setTimeout(() => setDmRequestToast(null), 3000);
      }
    }
  }

  const handleStartCall = (toUserId: string | null, roomId: string, isVideo = false, userObj: any = null) => {
    let targetName = userObj?.name || userObj?.username;
    let targetProfileImage = userObj?.profileImage || userObj?.avatar;

    if (!targetName && toUserId && membersMap?.[toUserId]) {
      const m = membersMap[toUserId];
      targetName = typeof m === 'object' ? (m.name || m.username) : m;
      targetProfileImage = typeof m === 'object' ? (m.profileImage || m.avatar) : undefined;
    }
    if (!targetName && conversations) {
      const c = conversations.find((con: any) => con.partner?.id === toUserId || con.partner?.userId === toUserId);
      if (c) {
        targetName = c.partner?.name || c.partner?.username;
        targetProfileImage = c.partner?.profileImage || c.partner?.avatar;
      }
    }
    if (!targetName && callLogs) {
      const l = callLogs.find((log: any) => log.partner?.id === toUserId || log.receiverId === toUserId);
      if (l) {
        targetName = l.partner?.name || l.partner?.username;
        targetProfileImage = l.partner?.profileImage || l.partner?.avatar;
      }
    }
    if (!targetName && currentDM?.partner) {
      const p = currentDM.partner as any;
      if (p.id === toUserId || p._id === toUserId) {
        targetName = p.name || p.username;
        targetProfileImage = p.profileImage || p.avatar;
      }
    }

    if (toUserId) {
      addCallLog({ receiverId: toUserId, roomId, type: isVideo ? 'video' : 'voice', status: 'completed' });
    }
    startCall(toUserId, roomId, isVideo, targetName, targetProfileImage);
  };

  const handleSelectRoom = (room: Room) => {
    selectRoom(room);
    setMobileActiveView('chat');
  };

  const handleOpenDM = async (convo: any) => {
    await openDM(convo);
    setMobileActiveView('chat');
  };

  return (
    <div className={`chat-app-shell mobile-view-${mobileActiveView}`}>
      {/* Toast */}
      {dmRequestToast && (
        <div className="dm-toast">{dmRequestToast}</div>
      )}

      {/* 1. Left-most Nav Rail */}
      <NavRail
        activeTab={navRailTab}
        unreadCount={unreadCount}
        pendingCount={pendingCount}
        onCreateChannel={() => { setShowCreateModal(true); setNavRailTab('chat'); setMobileActiveView('sidebar'); }}
        onNotificationsClick={() => { router.push('/notifications'); setNavRailTab('notifications'); setMobileActiveView('chat'); }}
        onCallsClick={() => { router.push('/calls'); setNavRailTab('calls'); setMobileActiveView('chat'); }}
        onChannelsClick={() => { router.push('/channels'); setNavRailTab('chat'); setMobileActiveView('sidebar'); }}
        onDMClick={() => { router.push('/dm'); setNavRailTab('dm'); setMobileActiveView('sidebar'); }}
        onSearchClick={() => setShowQuickSwitcher(true)}
        onSettingsClick={() => router.push('/settings/profile')}
        onLogout={logout}
      />

      {/* 2. Sidebar — Channels, DM panel, Notifications, or Calls panel */}
      <aside className="sidebar">
        {navRailTab === 'notifications' ? (
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            activeFilter={notifFilter}
            onSelectFilter={(f: string) => setNotifFilter(f)}
            onMarkAllRead={markAllRead}
            onClearAll={clearAllNotifications}
          />
        ) : navRailTab === 'calls' ? (
          <CallLogsPanel
            logs={callLogs}
            loading={callLogsLoading}
            onSelectLog={(log: any) => { setSelectedCallLog(log); setMobileActiveView('chat'); }}
            onStartCall={handleStartCall}
            onClearHistory={clearCallHistory}
          />
        ) : navRailTab === 'dm' ? (
          <DMPanel
            conversations={conversations}
            currentDM={currentDM}
            onOpen={handleOpenDM}
            onSendRequest={(toUserId: string) => handleDMUser(toUserId)}
            userId={user?.id}
            loading={dmLoading}
            onOpenSearch={() => setShowQuickSwitcher(true)}
            onOpenNotifications={() => { router.push('/notifications'); setNavRailTab('notifications'); setMobileActiveView('chat'); }}
            unreadNotifCount={unreadCount}
          />
        ) : (
          <Channels
            rooms={rooms}
            current={currentRoom}
            onSelect={handleSelectRoom}
            onLeave={leaveRoom}
            onRequestJoin={handleRequestJoin}
            memberRooms={memberRooms}
            pendingRooms={pendingRooms}
            onOpenCreate={() => setShowCreateModal(true)}
            onOpenSearch={() => setShowQuickSwitcher(true)}
            onOpenNotifications={() => { router.push('/notifications'); setNavRailTab('notifications'); setMobileActiveView('chat'); }}
            unreadNotifCount={unreadCount}
            unreadCounts={unreadCounts}
            mentionAlerts={mentionAlerts}
            onMarkAsRead={markRoomAsRead}
            onClearChat={clearRoomMessages}
            loading={roomsLoading}
          />
        )}
      </aside>

      {/* 3. Main Chat Area */}
      <main className="main">
        {navRailTab === 'notifications' ? (
          /* Notifications Main View */
          <NotificationsMainView
            notifications={notifications}
            unreadCount={unreadCount}
            filter={notifFilter}
            onSelectFilter={(f: string) => setNotifFilter(f)}
            onMarkRead={markRead}
            onDeleteNotif={deleteNotification}
            onMarkAllRead={markAllRead}
            onClearAll={clearAllNotifications}
            onBack={() => { router.push('/channels'); setNavRailTab('chat'); setMobileActiveView('sidebar'); }}
            onNavigateToRoom={(roomId: string) => {
              const r = rooms.find((rm: Room) => rm.id === roomId);
              if (r) {
                selectRoom(r);
                setNavRailTab('chat');
              }
            }}
          />
        ) : navRailTab === 'calls' ? (
          /* Call Logs Main View */
          <CallLogsMainView
            logs={callLogs}
            selectedLog={selectedCallLog}
            onStartCall={handleStartCall}
            onClearHistory={clearCallHistory}
            onBack={() => { router.push('/channels'); setNavRailTab('chat'); setMobileActiveView('sidebar'); }}
          />
        ) : navRailTab === 'dm' ? (
          /* DM Main View */
          <DMChat
            room={currentDM}
            messages={dmMessages}
            userId={user?.id}
            loading={dmLoading}
            onAccept={acceptDM}
            onRemove={removeDM}
            onSend={sendDMMessage}
            onStartCall={handleStartCall}
            onBack={() => setMobileActiveView('sidebar')}
          />
        ) : (
          /* Group Chat View */
          <>
            <header className="chat-header">
              {currentRoom ? (
                <>
                  <div
                    className={`header-left header-clickable ${channelView === 'members' ? 'active' : ''}`}
                    onClick={() => setChannelView(prev => prev === 'members' ? 'chat' : 'members')}
                    title={channelView === 'members' ? 'Click to return to chat' : 'Click to view all channel members'}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setChannelView(prev => prev === 'members' ? 'chat' : 'members');
                      }
                    }}
                  >
                    <button
                      className="mobile-back-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileActiveView('sidebar');
                      }}
                      title="Back to Channels"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                    </button>
                    <div className="header-avatar-badge">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
                      </svg>
                    </div>
                    <div className="header-room-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 className="header-room-name">
                          {currentRoom.name}{' '}
                          <svg className="verified-badge-svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </h2>
                        <span className="header-members-hint-pill">
                          {channelView === 'members' ? '← Chat' : '👥 Members'}
                        </span>
                      </div>
                      <div className="header-room-meta">
                        {currentRoom.topic && (
                          <span className="header-topic-tag" title={currentRoom.topic}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="17" x2="12" y2="22"/>
                              <path d="M5 17h14l-1.5-6H6.5L5 17z"/>
                              <path d="M9 11V5a3 3 0 0 1 6 0v6"/>
                            </svg>{' '}
                            {currentRoom.topic}
                          </span>
                        )}
                        <span className="meta-pill">{currentRoom.category || 'General'}</span>
                        <span className="header-sep">&middot;</span>
                        <span className="dot online"></span>
                        <span>{online.length} online</span>
                        <span className="header-sep">&middot;</span>
                        <span>{members.length} members</span>
                        {currentRoom.slowMode > 0 && (
                          <span className="slowmode-tag">
                            &middot;{' '}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>{' '}
                            {currentRoom.slowMode}s slow mode
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="header-right">
                    <button
                      className="header-icon-btn"
                      onClick={() => handleStartCall(null, currentRoom.id, false)}
                      title="Voice Call Channel"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </button>
                    <button
                      className="header-icon-btn"
                      onClick={() => handleStartCall(null, currentRoom.id, true)}
                      title="Video Call Channel"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"/>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                    </button>
                    {members.some((m) => m.user === user?.id && (m.role === 'owner' || m.role === 'moderator')) && (
                      <button
                        className="header-icon-btn"
                        onClick={() => setShowChannelSettingsModal(true)}
                        title="Channel settings"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                      </button>
                    )}
                    <button
                      className="header-icon-btn"
                      onClick={() => setShowPinnedModal(true)}
                      title="Pinned messages"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="17" x2="12" y2="22"/>
                        <path d="M5 17h14l-1.5-6H6.5L5 17z"/>
                        <path d="M9 11V5a3 3 0 0 1 6 0v6"/>
                      </svg>
                      {(currentRoom.pinnedMessages?.length || 0) > 0 && (
                        <span className="notif-badge">{formatBadgeCount(currentRoom.pinnedMessages.length)}</span>
                      )}
                    </button>
                    <button
                      className="header-icon-btn"
                      onClick={() => setShowSearchModal(true)}
                      title="Search messages"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </button>
                  </div>
                </>
              ) : (
                <h2>Welcome to DropTalk</h2>
              )}
            </header>

            <div className="main-content">
              {currentRoom ? (
                channelView === 'members' ? (
                  <ChannelMembersPage
                    room={currentRoom}
                    members={members}
                    online={online}
                    currentUserId={user?.id || (user as any)?._id}
                    onBack={() => setChannelView('chat')}
                    onMemberUpdate={refreshMembers}
                    onOpenProfile={(u) => setSelectedProfileUser(u)}
                    onDMUser={handleDMUser}
                  />
                ) : (
                  <>
                    <div className="chat-area">
                      {isPrivate && keyStatus !== 'ready' && keyStatus !== null && (
                        <div className="encryption-notice">
                          {keyStatus === 'waiting' ? 'Exchanging E2EE keys...' : 'Encryption key error'}
                        </div>
                      )}
                      <div
                        className="messages-container"
                        ref={messagesContainerRef}
                        onScroll={(e: React.UIEvent<HTMLDivElement>) => {
                          if (e.currentTarget.scrollTop < 40) {
                            loadOlderMessages();
                          }
                        }}
                      >
                        <MessageList
                          messages={displayMessages}
                          meId={user?.id || (user as any)?._id}
                          onDelete={deleteMessage}
                          onDeleteForMe={deleteForMe}
                          members={members}
                          onRead={handleReadReceipt}
                          readReceipts={readReceipts}
                          onlineUserIds={online.map((u) => u.id)}
                          onOpenThread={setThreadMessage}
                          onReact={handleReact}
                          threadCounts={threadCounts}
                          onReply={setReplyTo}
                          replyToData={replyToData}
                          membersMap={membersMap}
                          onDMUser={handleDMUser}
                          onEdit={editMessage}
                          onPin={pinMessage}
                          onUnpin={unpinMessage}
                          onOpenForward={setForwardMsg}
                          pinnedMessages={currentRoom.pinnedMessages || []}
                        />

                      </div>
                      <TypingIndicator typingUsers={typingUsers} />
                      <MessageInput
                        onSend={send}
                        onTyping={handleTyping}
                        onTextChange={setCurrentInput}
                        replyTo={replyTo}
                        onClearReply={() => setReplyTo(null)}
                        membersMap={membersMap}
                        slowMode={currentRoom.slowMode || 0}
                      />
                    </div>
                    {threadMessage && (
                      <ThreadPanel
                        parentMessage={threadMessage}
                        roomId={currentRoom.id}
                        meId={user?.id}
                        isPrivate={isPrivate}
                        onClose={() => setThreadMessage(null)}
                      />
                    )}
                  </>
                )
              ) : roomsLoading ? (
                <div className="empty-state">
                  <div className="bauhaus-loading-shapes" style={{ marginBottom: '1.25rem' }}>
                    <span className="shape-circle" />
                    <span className="shape-square" />
                    <span className="shape-triangle" />
                  </div>
                  <h3 style={{ marginTop: '0.5rem' }}>LAUNCHING CHANNELS</h3>
                  <p>CONNECTING TO WORKSPACE // PLEASE WAIT</p>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h3>No conversation selected</h3>
                  <p>Select a conversation from the sidebar or start a new thread to collaborate.</p>
                  {rooms.length > 0 && (
                    <button className="primary-action-btn" onClick={() => selectRoom(rooms[0])}>
                      Join #{rooms[0].name}
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Notification Drawer Modal */}
      <NotificationDrawer
        isOpen={showNotifDrawer}
        onClose={() => setShowNotifDrawer(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClearAll={clearAllNotifications}
        onSelectNotification={handleSelectNotification}
      />

      {/* Create Channel Modal */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createRoom}
        />
      )}

      {/* User Profile Card Popover */}
      {selectedProfileUser && (
        <UserProfileCard
          user={selectedProfileUser}
          isOnline={online.some((o) => o.id === selectedProfileUser.id || (o as any)._id === selectedProfileUser.id)}
          currentUserId={user?.id || (user as any)?._id}
          onClose={() => setSelectedProfileUser(null)}
          onStartDM={(toUserId: string) => handleDMUser(toUserId, selectedProfileUser.username)}
          onMention={(username: string) => {
            setCurrentInput((prev) => (prev ? `${prev} @${username} ` : `@${username} `));
          }}
        />
      )}

      {/* Message Search Modal */}
      {showSearchModal && currentRoom && (
        <MessageSearchModal
          roomId={currentRoom.id}
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onJumpToMessage={(msgId: string) => {
            const el = document.getElementById(`msg-${msgId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      )}

      {/* Pinned Messages Modal */}
      {showPinnedModal && currentRoom && (
        <PinnedMessagesModal
          isOpen={showPinnedModal}
          onClose={() => setShowPinnedModal(false)}
          pinnedMessages={currentRoom.pinnedMessages || []}
          allMessages={displayMessages}
          onUnpin={unpinMessage}
          onJumpToMessage={(msgId: string) => {
            const el = document.getElementById(`msg-${msgId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      )}

      {/* Forward Message Modal */}
      {forwardMsg && (
        <ForwardModal
          message={forwardMsg}
          rooms={rooms}
          conversations={conversations}
          onClose={() => setForwardMsg(null)}
          onForward={forwardMessage}
        />
      )}

      {/* Channel Settings Modal */}
      {showChannelSettingsModal && currentRoom && (
        <ChannelSettingsModal
          room={currentRoom}
          onClose={() => setShowChannelSettingsModal(false)}
          onUpdated={(updatedRoom: Room) => {
            selectRoom(updatedRoom);
          }}
        />
      )}

      {/* WebRTC Call Overlay UI */}
      <CallOverlay
        callState={callState}
        callerInfo={callerInfo}
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEndCall={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
      />

      {/* Quick Switcher Modal (Ctrl + K) */}
      <QuickSwitcherModal
        isOpen={showQuickSwitcher}
        onClose={() => setShowQuickSwitcher(false)}
        rooms={rooms}
        conversations={conversations}
        onSelectChannel={(room: Room) => { setNavRailTab('chat'); selectRoom(room); }}
        onSelectDM={(convo: any) => { setNavRailTab('dm'); openDM(convo); }}
      />

      {/* Keyboard Shortcuts Modal (Ctrl + /) */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
