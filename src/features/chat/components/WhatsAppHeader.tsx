'use client';

import React, { useState } from 'react';
import { Timer } from 'lucide-react';

interface WhatsAppHeaderProps {
  title: string;
  subtitle?: string;
  avatar?: string;
  isOnline?: boolean;
  isTyping?: boolean;
  hasDisappearingTimer?: boolean;
  hasActiveStatus?: boolean;
  onBackMobile?: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onSearchClick?: () => void;
  onOpenInfo?: () => void;
  onStatusClick?: () => void;
}

export const WhatsAppHeader: React.FC<WhatsAppHeaderProps> = ({
  title,
  subtitle,
  avatar,
  isOnline = false,
  isTyping = false,
  hasDisappearingTimer = false,
  hasActiveStatus = false,
  onBackMobile,
  onVoiceCall,
  onVideoCall,
  onSearchClick,
  onOpenInfo,
  onStatusClick,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="wa-header">
      <div className="wa-header-left cursor-pointer" onClick={onOpenInfo}>
        {/* Mobile Back Button */}
        {onBackMobile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBackMobile();
            }}
            className="wa-icon-btn md:hidden mr-1"
            title="Back to chat list"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}

        {/* Avatar */}
        <div
          className="relative flex-shrink-0"
          onClick={(e) => {
            if (hasActiveStatus && onStatusClick) {
              e.stopPropagation();
              onStatusClick();
            }
          }}
        >
          {hasActiveStatus ? (
            <div className="wa-status-ring-container" title="View status story">
              {avatar ? (
                <img src={avatar} alt={title} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--wa-panel-search)] flex items-center justify-center font-bold text-xs text-[var(--wa-green-primary)]">
                  {title.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          ) : (
            <div>
              {avatar ? (
                <img src={avatar} alt={title} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--wa-panel-search)] flex items-center justify-center font-bold text-xs text-[var(--wa-green-primary)]">
                  {title.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contact Info & Subtitle */}
        <div className="wa-header-info">
          <div className="flex items-center gap-1.5">
            <span className="wa-header-title">{title}</span>
            {hasDisappearingTimer && (
              <span title="Disappearing messages active" className="text-[var(--wa-text-secondary)] inline-flex items-center">
                <Timer size={13} />
              </span>
            )}
          </div>
          <span className="wa-header-subtitle">
            {isTyping ? (
              <span className="text-[var(--wa-green-primary)] font-semibold">typing...</span>
            ) : isOnline ? (
              <span className="text-[var(--wa-green-primary)] font-semibold">online</span>
            ) : (
              subtitle || 'offline'
            )}
          </span>
        </div>
      </div>

      {/* Right Header Actions */}
      <div className="wa-header-actions relative">
        {onVideoCall && (
          <button onClick={onVideoCall} className="wa-icon-btn" title="Video call">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
        )}

        {onVoiceCall && (
          <button onClick={onVoiceCall} className="wa-icon-btn" title="Voice call">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
        )}

        {onSearchClick && (
          <button onClick={onSearchClick} className="wa-icon-btn" title="Search in chat">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        )}

        {/* More Menu Dropdown */}
        <button
          onClick={() => setShowMenu((prev) => !prev)}
          className="wa-icon-btn"
          title="Menu"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>

        {showMenu && (
          <div
            className="absolute right-0 top-12 bg-[var(--wa-panel-bg)] border border-[var(--wa-border)] rounded-lg shadow-xl py-1.5 z-40 min-w-[170px] text-sm text-[var(--wa-text-primary)]"
            onClick={() => setShowMenu(false)}
          >
            <button
              onClick={onOpenInfo}
              className="w-full text-left px-4 py-2 hover:bg-[var(--wa-panel-header)]"
            >
              Contact info
            </button>
            <button
              onClick={onOpenInfo}
              className="w-full text-left px-4 py-2 hover:bg-[var(--wa-panel-header)]"
            >
              Disappearing messages
            </button>
            <button
              onClick={onOpenInfo}
              className="w-full text-left px-4 py-2 hover:bg-[var(--wa-panel-header)]"
            >
              Media, links, and docs
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default WhatsAppHeader;
