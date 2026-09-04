import { useState } from 'react';
import { formatCardTime } from '../../../shared/utils/dateUtils.js';

export function NotificationsMainView({
  notifications = [],
  unreadCount = 0,
  filter = 'all',
  onSelectFilter,
  onMarkRead,
  onDeleteNotif,
  onMarkAllRead,
  onClearAll,
  onNavigateToRoom,
  onBack,
}) {
  const [search, setSearch] = useState('');
  const [localFilter, setLocalFilter] = useState(filter);

  const activeFilter = onSelectFilter ? filter : localFilter;
  const handleSelectFilter = (newFilter) => {
    if (onSelectFilter) {
      onSelectFilter(newFilter);
    } else {
      setLocalFilter(newFilter);
    }
  };

  const filterCounts = {
    all: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    mention: notifications.filter((n) => n.type === 'mention').length,
    dm: notifications.filter((n) => n.type === 'dm').length,
    system: notifications.filter((n) => n.type === 'system' || n.type === 'info').length,
  };

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'unread' && n.read) return false;
    if (activeFilter === 'mention' && n.type !== 'mention') return false;
    if (activeFilter === 'dm' && n.type !== 'dm') return false;
    if (activeFilter === 'system' && (n.type !== 'system' && n.type !== 'info')) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) ||
      n.message?.toLowerCase().includes(q)
    );
  });

  function getTypeIcon(type) {
    switch (type) {
      case 'mention':
        return (
          <span className="notif-icon-badge mention">
            @
          </span>
        );
      case 'dm':
        return (
          <span className="notif-icon-badge dm">
            💬
          </span>
        );
      case 'call':
        return (
          <span className="notif-icon-badge call">
            📞
          </span>
        );
      default:
        return (
          <span className="notif-icon-badge info">
            📢
          </span>
        );
    }
  }

  const effectiveUnread = unreadCount || filterCounts.unread;

  return (
    <div className="notif-main-view">
      {/* Header Bar */}
      <header className="chat-header">
        <div className="header-left">
          {onBack && (
            <button
              className="mobile-back-btn"
              onClick={onBack}
              title="Back to Channels"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <div className="header-avatar-badge" style={{ background: 'var(--color-yellow)', color: 'var(--color-black)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div className="header-room-info">
            <h2 className="header-room-name">Notifications</h2>
            {effectiveUnread > 0 && (
              <span className="notif-header-unread-tag">{effectiveUnread} unread</span>
            )}
          </div>
        </div>

        <div className="header-right">
          {effectiveUnread > 0 && onMarkAllRead && (
            <button
              className="button-secondary-pill"
              onClick={onMarkAllRead}
              title="Mark all notifications as read"
            >
              Check Read
            </button>
          )}
          {notifications.length > 0 && onClearAll && (
            <button
              className="button-secondary-pill notif-clear-btn"
              onClick={onClearAll}
              title="Clear all notifications"
            >
              Clear All
            </button>
          )}
        </div>
      </header>

      {/* Embedded Controls: Search Bar & Filter Tabs */}
      <div className="notif-controls-wrapper">
        <div className="notif-search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="notif-search-clear" onClick={() => setSearch('')}>&times;</button>
          )}
        </div>

        <div className="notif-tabs">
          <button
            className={`notif-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleSelectFilter('all')}
          >
            <span>All</span>
            <span className="notif-tab-count">{filterCounts.all}</span>
          </button>
          <button
            className={`notif-tab ${activeFilter === 'unread' ? 'active' : ''}`}
            onClick={() => handleSelectFilter('unread')}
          >
            <span>Unread</span>
            {filterCounts.unread > 0 && (
              <span className="notif-tab-count unread">{filterCounts.unread}</span>
            )}
          </button>
          <button
            className={`notif-tab ${activeFilter === 'mention' ? 'active' : ''}`}
            onClick={() => handleSelectFilter('mention')}
          >
            <span>Mentions</span>
            <span className="notif-tab-count">{filterCounts.mention}</span>
          </button>
          <button
            className={`notif-tab ${activeFilter === 'dm' ? 'active' : ''}`}
            onClick={() => handleSelectFilter('dm')}
          >
            <span>DMs</span>
            <span className="notif-tab-count">{filterCounts.dm}</span>
          </button>
          <button
            className={`notif-tab ${activeFilter === 'system' ? 'active' : ''}`}
            onClick={() => handleSelectFilter('system')}
          >
            <span>System</span>
            <span className="notif-tab-count">{filterCounts.system}</span>
          </button>
        </div>
      </div>

      {/* Main List Body */}
      <div className="notif-feed-list">
        {filtered.length === 0 ? (
          <div className="notif-empty-card">
            <div className="notif-empty-icon-wrap">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h4>No Notifications Found</h4>
            <p>You're all caught up! New mentions, direct messages, and call alerts will appear here.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const timeStr = formatCardTime(item.createdAt);

            return (
              <div
                key={item.id}
                className={`notif-card-item ${!item.read ? 'unread' : ''}`}
                onClick={() => {
                  if (!item.read) onMarkRead?.(item.id);
                  if (item.roomId) onNavigateToRoom?.(item.roomId);
                }}
              >
                <div className="notif-card-left">
                  {getTypeIcon(item.type)}
                </div>

                <div className="notif-card-content">
                  <div className="notif-card-header">
                    <span className="notif-item-title">{item.title}</span>
                    <span className="notif-item-time">{timeStr}</span>
                  </div>

                  <p className="notif-item-body">{item.message}</p>

                  <div className="notif-card-footer">
                    {!item.read && (
                      <span className="notif-unread-dot">● New</span>
                    )}

                    <div className="notif-card-actions">
                      {!item.read && (
                        <button
                          className="notif-btn-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead?.(item.id);
                          }}
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        className="notif-btn-action delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNotif?.(item.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

