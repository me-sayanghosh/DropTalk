'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../shared/utils/api';
import { Room } from '../../../types';

interface WhatsAppNewChatModalProps {
  currentUserId: string;
  onClose: () => void;
  onStartDM: (userId: string) => void;
  onGroupCreated: (room: Room) => void;
}

export const WhatsAppNewChatModal: React.FC<WhatsAppNewChatModalProps> = ({
  currentUserId,
  onClose,
  onStartDM,
  onGroupCreated,
}) => {
  const [tab, setTab] = useState<'dm' | 'group'>('dm');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Group form state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search users
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const res = await api.get(`/auth/users/search?q=${encodeURIComponent(q)}`);
        const users = (res.data?.users || []).filter(
          (u: any) => (u.id || u._id)?.toString() !== currentUserId.toString()
        );
        setSearchResults(users);
      } catch (err) {
        console.warn('Search failed:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search, currentUserId]);

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = groupName.trim();
    if (!trimmed) {
      setError('Group name is required');
      return;
    }

    try {
      setCreatingGroup(true);
      setError(null);
      const res = await api.post('/rooms/create-group', {
        name: trimmed,
        groupDescription: groupDescription.trim(),
        participantIds: selectedParticipants,
      });

      if (res.data?.room) {
        onGroupCreated(res.data.room);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[var(--wa-panel-bg,#202c33)] border border-[var(--wa-border,rgba(255,255,255,0.1))] rounded-2xl shadow-2xl p-6 text-[var(--wa-text-primary,#e9edef)] max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--wa-border,rgba(255,255,255,0.1))]">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h3 className="font-bold text-base">New Conversation</h3>
          </div>
          <button onClick={onClose} className="wa-icon-btn text-xs" title="Close">
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 my-3 border-b border-[var(--wa-border,rgba(255,255,255,0.1))] pb-2">
          <button
            onClick={() => { setTab('dm'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              tab === 'dm'
                ? 'bg-[var(--wa-green-primary,#00a884)] text-white'
                : 'text-[var(--wa-text-secondary,#8696a0)] hover:bg-[var(--wa-panel-header,#111b21)]'
            }`}
          >
            Direct Message
          </button>
          <button
            onClick={() => { setTab('group'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              tab === 'group'
                ? 'bg-[var(--wa-green-primary,#00a884)] text-white'
                : 'text-[var(--wa-text-secondary,#8696a0)] hover:bg-[var(--wa-panel-header,#111b21)]'
            }`}
          >
            New Group
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        {/* TAB 1: DIRECT MESSAGE */}
        {tab === 'dm' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search by name or @username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-[var(--wa-panel-header,#111b21)] border border-[var(--wa-border,rgba(255,255,255,0.1))] rounded-xl px-4 py-2.5 text-xs text-[var(--wa-text-primary,#e9edef)] outline-none focus:border-[var(--wa-green-primary,#00a884)]"
              />
              {loadingSearch && (
                <div className="absolute right-3 top-3 w-3.5 h-3.5 border-2 border-[var(--wa-green-primary,#00a884)] border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 divide-y divide-[var(--wa-border,rgba(255,255,255,0.06))]">
              {searchResults.length > 0 ? (
                searchResults.map((u) => {
                  const uid = u.id || u._id;
                  return (
                    <div
                      key={uid}
                      onClick={() => {
                        onStartDM(uid);
                        onClose();
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--wa-panel-header,#111b21)] cursor-pointer transition-colors"
                    >
                      {u.profileImage ? (
                        <img src={u.profileImage} alt={u.username} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--wa-panel-header,#111b21)] flex items-center justify-center font-bold text-xs text-[var(--wa-green-primary,#00a884)]">
                          {(u.name || u.username).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-[var(--wa-text-primary,#e9edef)] truncate">
                          {u.name || u.username}
                        </div>
                        <div className="text-[0.7rem] text-[var(--wa-text-secondary,#8696a0)]">
                          @{u.username}
                        </div>
                      </div>
                      <span className="text-xs text-[var(--wa-green-primary,#00a884)] font-semibold">
                        Chat →
                      </span>
                    </div>
                  );
                })
              ) : search.trim() ? (
                <p className="text-xs text-center py-6 text-[var(--wa-text-secondary,#8696a0)]">
                  No users found matching "{search}"
                </p>
              ) : (
                <p className="text-xs text-center py-6 text-[var(--wa-text-secondary,#8696a0)]">
                  Type a username or name to find someone to chat with.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: NEW GROUP */}
        {tab === 'group' && (
          <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col min-h-0 space-y-3">
            <div>
              <label className="text-[0.7rem] font-semibold text-[var(--wa-text-secondary,#8696a0)] uppercase mb-1 block">
                Group Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Weekend Project, Family"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={60}
                className="w-full bg-[var(--wa-panel-header,#111b21)] border border-[var(--wa-border,rgba(255,255,255,0.1))] rounded-xl px-4 py-2.5 text-xs text-[var(--wa-text-primary,#e9edef)] outline-none focus:border-[var(--wa-green-primary,#00a884)]"
              />
            </div>

            <div>
              <label className="text-[0.7rem] font-semibold text-[var(--wa-text-secondary,#8696a0)] uppercase mb-1 block">
                Description (Optional)
              </label>
              <textarea
                placeholder="What is this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={2}
                maxLength={300}
                className="w-full bg-[var(--wa-panel-header,#111b21)] border border-[var(--wa-border,rgba(255,255,255,0.1))] rounded-xl px-4 py-2 text-xs text-[var(--wa-text-primary,#e9edef)] outline-none focus:border-[var(--wa-green-primary,#00a884)] resize-none"
              />
            </div>

            {/* Add participants search */}
            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-[0.7rem] font-semibold text-[var(--wa-text-secondary,#8696a0)] uppercase mb-1 block">
                Add Participants ({selectedParticipants.length} selected)
              </label>
              <input
                type="text"
                placeholder="Search contacts to add..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--wa-panel-header,#111b21)] border border-[var(--wa-border,rgba(255,255,255,0.1))] rounded-xl px-3 py-1.5 text-xs text-[var(--wa-text-primary,#e9edef)] outline-none mb-2"
              />
              <div className="flex-1 overflow-y-auto space-y-1 max-h-36 border border-[var(--wa-border,rgba(255,255,255,0.1))] rounded-xl p-2 bg-[var(--wa-panel-header,#111b21)]">
                {searchResults.map((u) => {
                  const uid = u.id || u._id;
                  const isSelected = selectedParticipants.includes(uid);
                  return (
                    <div
                      key={uid}
                      onClick={() => toggleParticipant(uid)}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[var(--wa-panel-bg,#202c33)] cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 accent-[var(--wa-green-primary,#00a884)] cursor-pointer"
                        />
                        <span className="font-medium truncate">{u.name || u.username}</span>
                        <span className="text-[0.68rem] text-[var(--wa-text-secondary,#8696a0)]">@{u.username}</span>
                      </div>
                    </div>
                  );
                })}
                {searchResults.length === 0 && (
                  <p className="text-[0.7rem] text-center py-3 text-[var(--wa-text-secondary,#8696a0)]">
                    {search ? 'No users matching search' : 'Search above to find and select participants'}
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={creatingGroup || !groupName.trim()}
                className="w-full py-2.5 rounded-full bg-[var(--wa-green-primary,#00a884)] hover:bg-[var(--wa-green-dark,#008069)] text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingGroup ? 'Creating Group...' : 'Create WhatsApp Group'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default WhatsAppNewChatModal;
