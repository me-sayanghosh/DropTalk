'use client';

import React, { useState } from 'react';
import { Link2, Copy, RefreshCw, Check } from 'lucide-react';
import { api } from '../../../shared/utils/api';

interface WhatsAppInviteModalProps {
  roomId: string;
  roomName: string;
  initialCode?: string;
  onClose: () => void;
}

export const WhatsAppInviteModal: React.FC<WhatsAppInviteModalProps> = ({
  roomId,
  roomName,
  initialCode = '',
  onClose,
}) => {
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/invite/${inviteCode}`
    : `/invite/${inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const handleRevoke = async () => {
    try {
      setRevoking(true);
      setError(null);
      const res = await api.post(`/rooms/${roomId}/invite-code`, { regenerate: true });
      if (res.data?.inviteCode) {
        setInviteCode(res.data.inviteCode);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset invite link');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[var(--wa-panel-bg,#202c33)] border border-[var(--wa-border,rgba(255,255,255,0.1))] rounded-2xl shadow-2xl p-6 text-[var(--wa-text-primary,#e9edef)] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--wa-border,rgba(255,255,255,0.1))]">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-[var(--wa-green-primary,#00a884)]" />
            <h3 className="font-bold text-base">Invite to {roomName}</h3>
          </div>
          <button onClick={onClose} className="wa-icon-btn text-xs" title="Close">
            ✕
          </button>
        </div>

        <div className="py-4 space-y-4">
          <p className="text-xs text-[var(--wa-text-secondary,#8696a0)] leading-relaxed">
            Anyone with DropTalk can follow this link to join this group. Only share it with people you trust.
          </p>

          {/* Link box */}
          <div className="flex items-center justify-between p-3 bg-[var(--wa-panel-header,#111b21)] rounded-xl border border-[var(--wa-border,rgba(255,255,255,0.1))]">
            <span className="text-xs font-mono truncate mr-2 text-[var(--wa-green-primary,#00a884)]">
              {inviteUrl}
            </span>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[var(--wa-green-primary,#00a884)] hover:bg-[var(--wa-green-dark,#008069)] text-white text-xs font-semibold flex-shrink-0 transition-colors inline-flex items-center gap-1"
            >
              {copied ? <><Check size={13} /> Copied</> : 'Copy'}
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Actions */}
          <div className="pt-2 border-t border-[var(--wa-border,rgba(255,255,255,0.1))] space-y-2">
            <button
              onClick={handleCopy}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--wa-panel-header,#111b21)] hover:bg-[var(--wa-border,rgba(255,255,255,0.1))] text-xs font-medium text-left flex items-center gap-3 transition-colors"
            >
              <Copy size={15} className="text-[var(--wa-text-secondary,#8696a0)]" />
              <span>Copy link to clipboard</span>
            </button>

            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium text-left flex items-center gap-3 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} />
              <span>{revoking ? 'Resetting...' : 'Revoke link & create new one'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppInviteModal;
