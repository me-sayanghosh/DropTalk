'use client';

import React, { useState } from 'react';
import { Clock, Link2, Lock } from 'lucide-react';
import { Room, User } from '../../../types';

interface ContactInfoDrawerProps {
  room?: Room | null;
  partner?: User | null;
  currentUserId: string;
  onClose: () => void;
  onUpdateDisappearingTimer?: (timer: 'off' | '24h' | '7d' | '90d') => void;
  onToggleAdminOnly?: (enabled: boolean) => void;
  onBlockUser?: (userId: string) => void;
  onUnblockUser?: (userId: string) => void;
  isBlocked?: boolean;
  onLeaveRoom?: () => void;
  onInviteLinkClick?: () => void;
}

export const ContactInfoDrawer: React.FC<ContactInfoDrawerProps> = ({
  room,
  partner,
  currentUserId,
  onClose,
  onUpdateDisappearingTimer,
  onToggleAdminOnly,
  onBlockUser,
  onUnblockUser,
  isBlocked = false,
  onLeaveRoom,
  onInviteLinkClick,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'media'>('info');

  const isGroup = !room?.isDM && room?.type !== 'ephemeral';
  const myMember = (room?.members || []).find((m) => m.user === currentUserId);
  const isAdmin = myMember?.role === 'owner' || myMember?.role === 'moderator';

  const name = isGroup ? room?.name : (partner?.name || partner?.username || 'User');
  const avatar = isGroup ? room?.groupIcon : partner?.profileImage;

  return (
    <aside className="wa-right-drawer animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="wa-header">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="wa-icon-btn" title="Close drawer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span className="font-semibold text-sm text-[var(--wa-text-primary)]">
            {isGroup ? 'Group info' : 'Contact info'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile Card */}
        <div className="flex flex-col items-center p-4 bg-[var(--wa-panel-header)] rounded-lg text-center">
          {avatar ? (
            <img src={avatar} alt={name || 'Avatar'} className="w-24 h-24 rounded-full object-cover mb-3" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[var(--wa-panel-search)] flex items-center justify-center font-bold text-2xl text-[var(--wa-green-primary)] mb-3">
              {name ? name.slice(0, 2).toUpperCase() : 'WA'}
            </div>
          )}
          <h3 className="font-bold text-base text-[var(--wa-text-primary)]">{name}</h3>
          {!isGroup && partner?.username && (
            <span className="text-xs text-[var(--wa-text-secondary)]">@{partner.username}</span>
          )}
        </div>

        {/* About / Description */}
        <div className="p-3 bg-[var(--wa-panel-header)] rounded-lg">
          <div className="text-xs font-semibold text-[var(--wa-green-primary)] uppercase mb-1">
            {isGroup ? 'Group Description' : 'About'}
          </div>
          <div className="text-sm text-[var(--wa-text-primary)] whitespace-pre-wrap">
            {isGroup
              ? (room?.groupDescription || 'No description provided.')
              : (partner?.customStatus?.text || 'Hey there! I am using DropTalk.')}
          </div>
        </div>

        {/* Disappearing Messages Setting */}
        {onUpdateDisappearingTimer && (
          <div className="p-3 bg-[var(--wa-panel-header)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-[var(--wa-text-primary)] flex items-center gap-1.5">
                <Clock size={15} /> Disappearing messages
              </span>
              <span className="text-xs text-[var(--wa-green-primary)] font-bold uppercase">
                {room?.disappearingTimer || 'off'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {(['off', '24h', '7d', '90d'] as const).map((timer) => (
                <button
                  key={timer}
                  onClick={() => onUpdateDisappearingTimer(timer)}
                  className={`py-1.5 rounded text-center font-semibold transition-colors ${
                    (room?.disappearingTimer || 'off') === timer
                      ? 'bg-[var(--wa-green-primary)] text-white'
                      : 'bg-[var(--wa-panel-bg)] text-[var(--wa-text-secondary)] hover:bg-[var(--wa-border)]'
                  }`}
                >
                  {timer}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Group Admin Permissions */}
        {isGroup && isAdmin && onToggleAdminOnly && (
          <div className="p-3 bg-[var(--wa-panel-header)] rounded-lg flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-[var(--wa-text-primary)]">
                Only admins can send
              </span>
              <span className="text-xs text-[var(--wa-text-secondary)]">
                Regular members can only read
              </span>
            </div>
            <input
              type="checkbox"
              checked={!!room?.onlyAdminsCanMessage}
              onChange={(e) => onToggleAdminOnly(e.target.checked)}
              className="w-5 h-5 accent-[var(--wa-green-primary)] cursor-pointer"
            />
          </div>
        )}

        {/* Group Invite Link */}
        {isGroup && onInviteLinkClick && (
          <button
            onClick={onInviteLinkClick}
            className="w-full p-3 bg-[var(--wa-panel-header)] rounded-lg flex items-center gap-3 text-sm text-[var(--wa-text-primary)] hover:bg-[var(--wa-border)] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--wa-green-primary)] text-white flex items-center justify-center font-bold">
              <Link2 size={16} />
            </div>
            <span className="font-semibold">Invite to group via link</span>
          </button>
        )}

        {/* Group Participants List */}
        {isGroup && room?.members && (
          <div className="p-3 bg-[var(--wa-panel-header)] rounded-lg space-y-2">
            <div className="text-xs font-semibold text-[var(--wa-text-secondary)] uppercase">
              {room.members.length} Participants
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {room.members.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1">
                  <span className="font-medium text-[var(--wa-text-primary)]">
                    {m.user === currentUserId ? 'You' : `User ${m.user.slice(-4)}`}
                  </span>
                  {(m.role === 'owner' || m.role === 'moderator') && (
                    <span className="text-[0.68rem] bg-[var(--wa-green-primary)]/15 text-[var(--wa-green-primary)] font-bold px-1.5 py-0.5 rounded">
                      Group Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* End-to-End Encryption Security Card */}
        <div className="p-3 bg-[var(--wa-panel-header)] rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--wa-green-primary)]/15 text-[var(--wa-green-primary)] flex items-center justify-center font-bold flex-shrink-0">
            <Lock size={15} />
          </div>
          <div className="text-xs text-[var(--wa-text-secondary)] leading-relaxed">
            Messages and calls are end-to-end encrypted. No one outside of this chat, not even DropTalk, can read or listen to them.
          </div>
        </div>

        {/* Block / Exit Actions */}
        <div className="pt-2">
          {!isGroup && partner && (
            <button
              onClick={() => {
                if (isBlocked) onUnblockUser?.(partner.id || (partner as any)._id);
                else onBlockUser?.(partner.id || (partner as any)._id);
              }}
              className="w-full py-2.5 px-4 rounded bg-red-500/10 text-red-500 font-semibold text-xs hover:bg-red-500/20 transition-colors"
            >
              {isBlocked ? 'Unblock Contact' : 'Block Contact'}
            </button>
          )}

          {isGroup && onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="w-full py-2.5 px-4 rounded bg-red-500/10 text-red-500 font-semibold text-xs hover:bg-red-500/20 transition-colors"
            >
              Exit Group
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default ContactInfoDrawer;
