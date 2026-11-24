'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../shared/utils/api';
import Link from 'next/link';
import { AlertTriangle, Lock } from 'lucide-react';

interface GroupPreview {
  id: string;
  name: string;
  groupIcon?: string;
  groupDescription?: string;
  membersCount: number;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params?.code as string;

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupPreview | null>(null);

  useEffect(() => {
    if (!inviteCode) return;
    async function fetchPreview() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/rooms/invite/${inviteCode}`);
        setGroup(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Invalid or expired invite link');
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, [inviteCode]);

  const handleJoin = async () => {
    try {
      setJoining(true);
      setError(null);
      const res = await api.post(`/rooms/join/${inviteCode}`);
      const roomId = res.data?.room?.id || group?.id;
      if (roomId) {
        router.push(`/channels/${roomId}`);
      } else {
        router.push('/chat');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push(`/login?redirect=/invite/${inviteCode}`);
      } else {
        setError(err.response?.data?.error || 'Failed to join group');
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--wa-bg-deep,#111b21)] flex flex-col items-center justify-center p-4">
      {/* WhatsApp-style Header Bar */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <Link href="/chat" className="flex items-center gap-2 text-[var(--wa-green-primary,#00a884)] font-bold text-lg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span>DropTalk</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-[var(--wa-panel-bg,#202c33)] rounded-2xl shadow-2xl border border-[var(--wa-border,rgba(255,255,255,0.1))] p-8 flex flex-col items-center text-center">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[var(--wa-green-primary,#00a884)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--wa-text-secondary,#8696a0)]">Loading group details...</p>
          </div>
        ) : error ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-lg font-bold text-[var(--wa-text-primary,#e9edef)]">Link Expired or Invalid</h2>
            <p className="text-xs text-[var(--wa-text-secondary,#8696a0)] max-w-xs">{error}</p>
            <Link
              href="/chat"
              className="mt-4 px-6 py-2.5 rounded-full bg-[var(--wa-panel-header,#202c33)] hover:bg-[var(--wa-border,rgba(255,255,255,0.1))] text-xs font-semibold text-[var(--wa-text-primary,#e9edef)] transition-colors"
            >
              Return to Chats
            </Link>
          </div>
        ) : group ? (
          <>
            {/* Group Icon */}
            <div className="relative mb-4">
              {group.groupIcon ? (
                <img
                  src={group.groupIcon}
                  alt={group.name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[var(--wa-green-primary,#00a884)] shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[var(--wa-panel-header,#202c33)] border-2 border-[var(--wa-green-primary,#00a884)] flex items-center justify-center font-bold text-3xl text-[var(--wa-green-primary,#00a884)] shadow-lg">
                  {group.name ? group.name.slice(0, 2).toUpperCase() : 'GP'}
                </div>
              )}
            </div>

            {/* Group Name & Description */}
            <h1 className="text-xl font-bold text-[var(--wa-text-primary,#e9edef)] mb-1">{group.name}</h1>
            <p className="text-xs text-[var(--wa-text-secondary,#8696a0)] mb-4">
              Group · {group.membersCount} {group.membersCount === 1 ? 'participant' : 'participants'}
            </p>

            {group.groupDescription && (
              <div className="w-full bg-[var(--wa-panel-header,#111b21)] rounded-xl p-3 mb-6 text-xs text-[var(--wa-text-primary,#e9edef)] leading-relaxed text-left whitespace-pre-wrap">
                {group.groupDescription}
              </div>
            )}

            {/* Join Button */}
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 px-6 rounded-full bg-[var(--wa-green-primary,#00a884)] hover:bg-[var(--wa-green-dark,#008069)] text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {joining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Joining Group...</span>
                </>
              ) : (
                <span>Join Group</span>
              )}
            </button>

            <Link
              href="/chat"
              className="mt-3 text-xs text-[var(--wa-text-secondary,#8696a0)] hover:text-[var(--wa-green-primary,#00a884)] transition-colors"
            >
              Cancel and return to DropTalk
            </Link>
          </>
        ) : null}
      </div>

      {/* Security notice */}
      <div className="mt-6 flex items-center gap-1.5 text-xs text-[var(--wa-text-secondary,#8696a0)]">
        <Lock size={13} />
        <span>End-to-end encrypted group chat</span>
      </div>
    </div>
  );
}
