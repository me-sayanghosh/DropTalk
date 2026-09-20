'use client';

import React, { useState, useMemo } from 'react';
import { api } from '../../../shared/utils';
import PendingRequests from './PendingRequests';
import { Room, RoomMember, User } from '../../../types';

interface ChannelMembersPageProps {
  room: Room;
  members: RoomMember[];
  online: User[];
  currentUserId?: string;
  onBack: () => void;
  onMemberUpdate?: () => void;
  onOpenProfile?: (user: any) => void;
  onDMUser?: (userId: string, username?: string) => void;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  owner: { bg: '#F0C020', text: '#121212', border: '#121212' },
  moderator: { bg: '#1040C0', text: '#FFFFFF', border: '#121212' },
  member: { bg: '#E4E9F2', text: '#121212', border: '#121212' },
};

export default function ChannelMembersPage({
  room,
  members,
  online,
  currentUserId,
  onBack,
  onMemberUpdate,
  onOpenProfile,
  onDMUser,
}: ChannelMembersPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'online' | 'mods'>('all');
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const onlineIds = useMemo(() => {
    return new Set(online.map((u: any) => u.id || u._id));
  }, [online]);

  const selfMember = members.find((m) => m.user === currentUserId);
  const canModerate = selfMember && (selfMember.role === 'owner' || selfMember.role === 'moderator');
  const isOwner = selfMember?.role === 'owner';

  const onlineCount = useMemo(() => {
    return members.filter((m) => onlineIds.has(m.user)).length;
  }, [members, onlineIds]);

  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        const username = m.username || m.user;
        const matchesSearch = username.toLowerCase().includes(searchQuery.toLowerCase().trim());
        if (!matchesSearch) return false;

        const isOnline = onlineIds.has(m.user);
        if (filterTab === 'online') return isOnline;
        if (filterTab === 'mods') return m.role === 'owner' || m.role === 'moderator';
        return true;
      })
      .sort((a, b) => {
        // Sort: Current user first, then online first, then by role (owner > moderator > member)
        if (a.user === currentUserId) return -1;
        if (b.user === currentUserId) return 1;

        const aOnline = onlineIds.has(a.user) ? 1 : 0;
        const bOnline = onlineIds.has(b.user) ? 1 : 0;
        if (aOnline !== bOnline) return bOnline - aOnline;

        const roleOrder: Record<string, number> = { owner: 3, moderator: 2, member: 1 };
        const aRole = roleOrder[a.role] || 1;
        const bRole = roleOrder[b.role] || 1;
        if (aRole !== bRole) return bRole - aRole;

        return (a.username || '').localeCompare(b.username || '');
      });
  }, [members, searchQuery, filterTab, onlineIds, currentUserId]);

  async function kick(userId: string, ban = false) {
    const msg = ban ? 'Ban this member? They will not be able to rejoin.' : 'Kick this member from the channel?';
    if (!confirm(msg)) return;
    setActionBusy(userId);
    try {
      await api.post(`/rooms/${room.id}/members/${userId}/kick`, { ban });
      onMemberUpdate?.();
    } catch (err) {
      console.error('Kick failed:', err);
    } finally {
      setActionBusy(null);
    }
  }

  async function toggleMute(userId: string) {
    setActionBusy(userId);
    try {
      await api.post(`/rooms/${room.id}/members/${userId}/mute`);
      onMemberUpdate?.();
    } catch (err) {
      console.error('Mute failed:', err);
    } finally {
      setActionBusy(null);
    }
  }

  async function setRole(userId: string, role: string) {
    setActionBusy(userId);
    try {
      await api.post(`/rooms/${room.id}/members/${userId}/role`, { role });
      onMemberUpdate?.();
    } catch (err) {
      console.error('Set role failed:', err);
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="channel-members-page">
      {/* Top Banner with Navigation */}
      <div className="cmp-header">
        <div className="cmp-header-left">
          <button
            type="button"
            className="cmp-back-btn"
            onClick={onBack}
            title="Return to channel messages"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Chat</span>
          </button>
          <div className="cmp-title-group">
            <h1 className="cmp-channel-title">
              <span className="cmp-hash">#</span>{room.name}
              <span className="cmp-sub">Members Directory</span>
            </h1>
            {room.topic && <p className="cmp-topic">{room.topic}</p>}
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="cmp-stats-row">
          <div className="cmp-stat-badge cmp-stat-total">
            <span className="cmp-stat-icon">👥</span>
            <span className="cmp-stat-num">{members.length}</span>
            <span className="cmp-stat-label">Total</span>
          </div>
          <div className="cmp-stat-badge cmp-stat-online">
            <span className="cmp-online-pulse-dot" />
            <span className="cmp-stat-num">{onlineCount}</span>
            <span className="cmp-stat-label">Online</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="cmp-toolbar">
        <div className="cmp-search-box">
          <svg className="cmp-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search members by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="cmp-clear-search"
              onClick={() => setSearchQuery('')}
            >
              &times;
            </button>
          )}
        </div>

        <div className="cmp-filter-tabs">
          <button
            type="button"
            className={`cmp-tab ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All ({members.length})
          </button>
          <button
            type="button"
            className={`cmp-tab ${filterTab === 'online' ? 'active' : ''}`}
            onClick={() => setFilterTab('online')}
          >
            <span className="cmp-tab-dot online" />
            Online ({onlineCount})
          </button>
          <button
            type="button"
            className={`cmp-tab ${filterTab === 'mods' ? 'active' : ''}`}
            onClick={() => setFilterTab('mods')}
          >
            Admins &amp; Mods ({members.filter((m) => m.role === 'owner' || m.role === 'moderator').length})
          </button>
        </div>
      </div>

      {/* Admin Join Requests (if private channel) */}
      {room.type === 'private' && canModerate && (
        <div className="cmp-pending-section">
          <PendingRequests
            roomId={room.id}
            isAdmin={true}
            onRequestHandled={onMemberUpdate}
          />
        </div>
      )}

      {/* Members Grid / List */}
      <div className="cmp-content-area">
        {filteredMembers.length === 0 ? (
          <div className="cmp-empty-state">
            <div className="cmp-empty-icon">🔍</div>
            <h3>No members found</h3>
            <p>No channel members matched your search "{searchQuery}".</p>
          </div>
        ) : (
          <div className="cmp-members-grid">
            {filteredMembers.map((m) => {
              const isOnline = onlineIds.has(m.user);
              const isSelf = m.user === currentUserId;
              const canActOn = canModerate && !isSelf && m.role !== 'owner' &&
                !(selfMember?.role === 'moderator' && m.role === 'moderator');
              const initial = (m.username || m.user || 'U')[0].toUpperCase();
              const roleTheme = ROLE_COLORS[m.role] || ROLE_COLORS.member;

              return (
                <div key={m.user} className={`cmp-member-card ${isOnline ? 'is-online' : 'is-offline'} ${isSelf ? 'is-self' : ''}`}>
                  {/* Left: Avatar with Green Status Dot */}
                  <div className="cmp-avatar-wrap">
                    <div
                      className="cmp-avatar"
                      onClick={() => onOpenProfile?.({ id: m.user, username: m.username })}
                      title="View profile"
                    >
                      <span>{initial}</span>
                    </div>

                    {/* Green Dot beside / on the user avatar */}
                    {isOnline ? (
                      <span className="cmp-status-dot online" title="Online now" />
                    ) : (
                      <span className="cmp-status-dot offline" title="Offline" />
                    )}
                  </div>

                  {/* Center: Member Info */}
                  <div className="cmp-member-info">
                    <div className="cmp-name-row">
                      <span
                        className="cmp-username"
                        onClick={() => onOpenProfile?.({ id: m.user, username: m.username })}
                        title="View profile"
                      >
                        @{m.username || m.user.slice(0, 10)}
                      </span>

                      {/* Online Status Label with Green Dot */}
                      <span className={`cmp-online-indicator-pill ${isOnline ? 'online' : 'offline'}`}>
                        <span className={`cmp-mini-dot ${isOnline ? 'online' : 'offline'}`} />
                        {isOnline ? 'Online' : 'Offline'}
                      </span>

                      {isSelf && <span className="cmp-self-badge">YOU</span>}
                    </div>

                    <div className="cmp-meta-row">
                      <span
                        className="cmp-role-badge"
                        style={{
                          backgroundColor: roleTheme.bg,
                          color: roleTheme.text,
                          borderColor: roleTheme.border,
                        }}
                      >
                        {m.role === 'owner' ? '★ OWNER' : m.role === 'moderator' ? '🛡 MODERATOR' : 'MEMBER'}
                      </span>

                      {m.muted && <span className="cmp-muted-badge">MUTED</span>}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="cmp-member-actions">
                    {!isSelf && onDMUser && (
                      <button
                        type="button"
                        className="cmp-action-btn cmp-dm-btn"
                        onClick={() => onDMUser(m.user, m.username)}
                        title={`Message @${m.username || 'user'} privately`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>Message</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="cmp-action-btn cmp-profile-btn"
                      onClick={() => onOpenProfile?.({ id: m.user, username: m.username })}
                      title="View user details"
                    >
                      Profile
                    </button>

                    {/* Moderation Actions */}
                    {canActOn && (
                      <div className="cmp-mod-actions">
                        {m.role === 'member' && isOwner && (
                          <button
                            type="button"
                            className="cmp-mod-btn"
                            onClick={() => setRole(m.user, 'moderator')}
                            disabled={actionBusy === m.user}
                            title="Promote to Moderator"
                          >
                            ▲ Promote
                          </button>
                        )}
                        {m.role === 'moderator' && isOwner && (
                          <button
                            type="button"
                            className="cmp-mod-btn"
                            onClick={() => setRole(m.user, 'member')}
                            disabled={actionBusy === m.user}
                            title="Demote to Member"
                          >
                            ▼ Demote
                          </button>
                        )}
                        <button
                          type="button"
                          className="cmp-mod-btn"
                          onClick={() => toggleMute(m.user)}
                          disabled={actionBusy === m.user}
                          title={m.muted ? 'Unmute user' : 'Mute user'}
                        >
                          {m.muted ? 'Unmute' : 'Mute'}
                        </button>
                        <button
                          type="button"
                          className="cmp-mod-btn danger"
                          onClick={() => kick(m.user, false)}
                          disabled={actionBusy === m.user}
                          title="Kick user"
                        >
                          Kick
                        </button>
                        <button
                          type="button"
                          className="cmp-mod-btn danger"
                          onClick={() => kick(m.user, true)}
                          disabled={actionBusy === m.user}
                          title="Ban user"
                        >
                          Ban
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
