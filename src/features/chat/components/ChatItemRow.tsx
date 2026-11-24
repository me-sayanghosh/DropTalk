'use client';

import React from 'react';
import MessageStatusTick from './MessageStatusTick';

interface ChatItemRowProps {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isActive?: boolean;
  isPinned?: boolean;
  hasActiveStatus?: boolean;
  statusViewed?: boolean;
  isDM?: boolean;
  isLastMsgMe?: boolean;
  lastMsgStatus?: string;
  onClick: () => void;
  onStatusClick?: (e: React.MouseEvent) => void;
}

export const ChatItemRow: React.FC<ChatItemRowProps> = ({
  name,
  avatar,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  isActive = false,
  isPinned = false,
  hasActiveStatus = false,
  statusViewed = false,
  isDM = false,
  isLastMsgMe = false,
  lastMsgStatus = 'sent',
  onClick,
  onStatusClick,
}) => {
  const defaultAvatar = (
    <div className="w-11 h-11 rounded-full bg-[var(--wa-panel-search)] border border-[var(--wa-border)] flex items-center justify-center font-bold text-sm text-[var(--wa-green-primary)] select-none">
      {name ? name.slice(0, 2).toUpperCase() : 'CH'}
    </div>
  );

  return (
    <div
      onClick={onClick}
      className={`wa-chat-item ${isActive ? 'active' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
    >
      {/* Avatar Container with Optional Circular Status Ring */}
      <div
        className="relative flex-shrink-0 cursor-pointer"
        onClick={(e) => {
          if (hasActiveStatus && onStatusClick) {
            e.stopPropagation();
            onStatusClick(e);
          }
        }}
      >
        {hasActiveStatus ? (
          <div className={`wa-status-ring-container ${statusViewed ? 'viewed' : ''}`} title="View status">
            {avatar ? (
              <img src={avatar} alt={name} className="w-11 h-11 rounded-full object-cover" />
            ) : (
              defaultAvatar
            )}
          </div>
        ) : (
          <div>
            {avatar ? (
              <img src={avatar} alt={name} className="w-11 h-11 rounded-full object-cover" />
            ) : (
              defaultAvatar
            )}
          </div>
        )}
      </div>

      {/* Chat Details */}
      <div className="wa-chat-item-content">
        <div className="wa-chat-item-top">
          <span className="wa-chat-item-name">{name}</span>
          {lastMessageTime && (
            <span className={`wa-chat-item-time ${unreadCount > 0 ? 'unread' : ''}`}>
              {lastMessageTime}
            </span>
          )}
        </div>

        <div className="wa-chat-item-bottom">
          <div className="wa-chat-item-preview">
            {isLastMsgMe && (
              <MessageStatusTick status={lastMsgStatus} />
            )}
            <span className="truncate">{lastMessage || (isDM ? 'Tap to start chatting' : 'Tap to join conversation')}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isPinned && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--wa-text-secondary)]">
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14l-1.5-6H6.5L5 17z" />
                <path d="M9 11V5a3 3 0 0 1 6 0v6" />
              </svg>
            )}
            {unreadCount > 0 && (
              <span className="wa-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatItemRow;
