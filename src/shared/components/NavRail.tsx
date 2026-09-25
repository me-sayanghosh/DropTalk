'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { formatBadgeCount } from '../utils/dateUtils';

export interface NavRailProps {
  activeTab?: 'chat' | 'dm' | 'calls' | 'notifications' | 'settings';
  unreadCount?: number;
  pendingCount?: number;
  onCreateChannel?: () => void;
  onNotificationsClick?: () => void;
  onCallsClick?: () => void;
  onChannelsClick?: () => void;
  onDMClick?: () => void;
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
}

export const NavRail: React.FC<NavRailProps> = ({
  activeTab,
  unreadCount = 0,
  pendingCount = 0,
  onCreateChannel,
  onNotificationsClick,
  onCallsClick,
  onChannelsClick,
  onDMClick,
  onSearchClick,
  onSettingsClick,
  onLogout,
}) => {
  const router = useRouter();

  const handleCreate = onCreateChannel || (() => router.push('/channels?openCreate=true'));
  const handleNotif = onNotificationsClick || (() => router.push('/notifications'));
  const handleCalls = onCallsClick || (() => router.push('/calls'));
  const handleChannels = onChannelsClick || (() => router.push('/channels'));
  const handleDM = onDMClick || (() => router.push('/dm'));
  const handleSearch = onSearchClick || (() => router.push('/channels?openSearch=true'));
  const handleSettings = onSettingsClick || (() => router.push('/settings/profile'));

  return (
    <nav className="nav-rail" aria-label="Main Navigation">
      {/* Top Section */}
      <div className="rail-top">
        <button
          className="rail-btn action-plus"
          onClick={handleCreate}
          title="Create New Channel"
          aria-label="Create New Channel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Notification Icon */}
        <button
          className={`rail-btn rail-btn--notif ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={handleNotif}
          title="Notifications"
          aria-label="Notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="rail-dm-badge rail-notif-badge">{formatBadgeCount(unreadCount)}</span>
          )}
        </button>
      </div>

      {/* Middle Section */}
      <div className="rail-middle">
        {/* Calls */}
        <button
          className={`rail-btn ${activeTab === 'calls' ? 'active' : ''}`}
          onClick={handleCalls}
          title="Calls & Call Logs"
          aria-label="Calls & Call Logs"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>

        {/* Group Channels (2x2 Grid) */}
        <button
          className={`rail-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={handleChannels}
          title="Group Channels"
          aria-label="Group Channels"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </button>

        {/* Direct Messages */}
        <button
          className={`rail-btn rail-btn--dm ${activeTab === 'dm' ? 'active' : ''}`}
          onClick={handleDM}
          title="Direct Messages"
          aria-label="Direct Messages"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {pendingCount > 0 && (
            <span className="rail-dm-badge">{formatBadgeCount(pendingCount)}</span>
          )}
        </button>
      </div>

      {/* Bottom Section */}
      <div className="rail-bottom">
        <button
          className={`rail-btn settings-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={handleSettings}
          title="Settings"
          aria-label="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {onLogout && (
          <button className="rail-btn logout-btn" onClick={onLogout} title="Log Out" aria-label="Log Out">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
      </div>
    </nav>
  );
};

export default NavRail;
