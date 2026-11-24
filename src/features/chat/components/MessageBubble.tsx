'use client';

import React, { useState } from 'react';
import { Reply, Forward, Trash2, X } from 'lucide-react';
import { Message } from '../../../types';
import MessageStatusTick from './MessageStatusTick';
import VoiceNoteBubble from './VoiceNoteBubble';
import { formatDateSeparator } from '../../../shared/utils/dateUtils';

interface MessageBubbleProps {
  message: Message;
  meId: string;
  isGroup?: boolean;
  readReceiptsEnabled?: boolean;
  onReply?: (msg: Message) => void;
  onForward?: (msg: Message) => void;
  onReact?: (msgId: string, emoji: string) => void;
  onDelete?: (msgId: string) => void;
  onDeleteForMe?: (msgId: string) => void;
  onMediaClick?: (media: any) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  meId,
  isGroup = false,
  readReceiptsEnabled = true,
  onReply,
  onForward,
  onReact,
  onDelete,
  onDeleteForMe,
  onMediaClick,
}) => {
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const senderId = (message.senderId || (typeof message.sender === 'object' ? (message.sender as any)?.id : message.sender) || '').toString();
  const isMe = senderId === meId?.toString();
  const senderUsername = message.senderUsername || (typeof message.sender === 'object' ? (message.sender as any)?.username : '') || 'User';
  const senderAvatar = typeof message.sender === 'object' ? (message.sender as any)?.profileImage : '';

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m < 10 ? '0' : ''}${m} ${ampm}`;
  };

  const status = message.status || message.deliveryStatus || 'sent';

  return (
    <div
      className={`wa-bubble-container ${isMe ? 'out' : 'in'} group relative`}
      onMouseEnter={() => setShowReactionBar(true)}
      onMouseLeave={() => {
        setShowReactionBar(false);
        setShowMenu(false);
      }}
    >
      {/* Floating Emoji Quick Reaction Bar on Hover */}
      {showReactionBar && !message.deleted && (
        <div className={`wa-reaction-bar ${isMe ? 'out' : 'in'} animate-in fade-in zoom-in-95 duration-150`}>
          {QUICK_EMOJIS.map((emoji) => (
            <span
              key={emoji}
              className="wa-reaction-item"
              onClick={() => {
                onReact?.(message.id, emoji);
                setShowReactionBar(false);
              }}
              title={`React ${emoji}`}
            >
              {emoji}
            </span>
          ))}
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="text-xs text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] px-1 font-bold"
            title="More actions"
          >
            •••
          </button>
        </div>
      )}

      {/* Message Action Dropdown Menu */}
      {showMenu && (
        <div
          className={`absolute top-0 ${isMe ? 'right-0' : 'left-0'} mt-7 bg-[var(--wa-panel-bg)] border border-[var(--wa-border)] rounded-lg shadow-xl py-1 z-30 min-w-[140px] text-xs text-[var(--wa-text-primary)]`}
        >
          <button
            onClick={() => {
              onReply?.(message);
              setShowMenu(false);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--wa-panel-header)] flex items-center gap-2"
          >
            <Reply size={13} /> Reply
          </button>
          <button
            onClick={() => {
              onForward?.(message);
              setShowMenu(false);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--wa-panel-header)] flex items-center gap-2"
          >
            <Forward size={13} /> Forward
          </button>
          {isMe && !message.deleted && (
            <button
              onClick={() => {
                onDelete?.(message.id);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[var(--wa-panel-header)] text-red-500 flex items-center gap-2"
            >
              <Trash2 size={13} /> Delete for everyone
            </button>
          )}
          <button
            onClick={() => {
              onDeleteForMe?.(message.id);
              setShowMenu(false);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--wa-panel-header)] flex items-center gap-2"
          >
            <X size={13} /> Delete for me
          </button>
        </div>
      )}

      {/* The Bubble */}
      <div className={`wa-bubble ${isMe ? 'out' : 'in'}`}>
        {/* Forwarded Header */}
        {message.isForwarded && (
          <div className="flex items-center gap-1 text-[0.72rem] text-[var(--wa-text-secondary)] italic mb-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 14 20 9 15 4" />
              <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
            </svg>
            <span>Forwarded</span>
          </div>
        )}

        {/* Sender Name in Group Chat */}
        {isGroup && !isMe && (
          <div className="font-semibold text-[0.78rem] text-[var(--wa-green-primary)] mb-0.5 cursor-pointer hover:underline">
            ~{senderUsername}
          </div>
        )}

        {/* Quoted Reply Box */}
        {message.replyToData && (
          <div className="wa-quoted-reply">
            <div className="wa-quoted-sender">
              {message.replyToData.senderUsername ? `@${message.replyToData.senderUsername}` : 'Replied message'}
            </div>
            <div className="wa-quoted-text">{message.replyToData.text || 'Attachment'}</div>
          </div>
        )}

        {/* Deleted Message Notice */}
        {message.deleted ? (
          <div className="italic text-[var(--wa-text-secondary)] flex items-center gap-1.5 text-xs py-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <span>This message was deleted</span>
          </div>
        ) : (
          <>
            {/* Voice Note View */}
            {message.isVoiceNote && message.attachments?.[0]?.url ? (
              <VoiceNoteBubble
                audioUrl={message.attachments[0].url}
                duration={message.voiceDuration || 0}
                waveform={message.voiceWaveform || []}
                senderAvatar={senderAvatar}
                isMe={isMe}
                timestamp={formatTime(message.createdAt)}
                status={status}
                readReceiptsEnabled={readReceiptsEnabled}
              />
            ) : (
              <>
                {/* Media Gallery / Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mb-1.5 space-y-1">
                    {message.attachments.map((att, idx) => {
                      const isImg = att.fileType === 'image' || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.url);
                      const isVid = att.fileType === 'video' || /\.(mp4|webm|mov)$/i.test(att.url);

                      if (isImg) {
                        return (
                          <div
                            key={idx}
                            className="rounded overflow-hidden cursor-pointer max-w-sm max-h-72 bg-black/5"
                            onClick={() => onMediaClick?.(att)}
                          >
                            <img
                              src={att.url}
                              alt={att.filename || 'Attachment'}
                              className="w-full h-auto object-cover hover:opacity-95 transition-opacity"
                              loading="lazy"
                            />
                          </div>
                        );
                      }

                      if (isVid) {
                        return (
                          <div
                            key={idx}
                            className="rounded overflow-hidden cursor-pointer max-w-sm bg-black"
                            onClick={() => onMediaClick?.(att)}
                          >
                            <video src={att.url} controls className="w-full max-h-72 object-contain" />
                          </div>
                        );
                      }

                      // Document card
                      return (
                        <a
                          key={idx}
                          href={att.url}
                          download={att.filename}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--wa-border)] hover:bg-black/10 transition-colors"
                        >
                          <div className="w-10 h-10 rounded bg-[var(--wa-green-primary)] text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                            {att.filename?.split('.').pop()?.slice(0, 4) || 'DOC'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs truncate text-[var(--wa-text-primary)]">
                              {att.filename}
                            </div>
                            {att.size && (
                              <div className="text-[0.68rem] text-[var(--wa-text-secondary)]">
                                {(att.size / 1024).toFixed(1)} KB
                              </div>
                            )}
                          </div>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--wa-text-secondary)]">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Location Preview Card */}
                {message.location && (
                  <a
                    href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded overflow-hidden border border-[var(--wa-border)] mb-1.5 bg-black/5 hover:opacity-90"
                  >
                    <div className="h-28 bg-[var(--wa-panel-header)] flex items-center justify-center relative">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ea0038" strokeWidth="2.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="absolute bottom-1 right-2 text-[0.65rem] bg-black/60 text-white px-1.5 py-0.5 rounded">
                        Map
                      </span>
                    </div>
                    <div className="p-2 text-xs">
                      <div className="font-semibold text-[var(--wa-text-primary)]">
                        {message.location.name || 'Shared Location'}
                      </div>
                      <div className="text-[0.68rem] text-[var(--wa-text-secondary)] truncate">
                        {message.location.address || `${message.location.latitude.toFixed(4)}, ${message.location.longitude.toFixed(4)}`}
                      </div>
                    </div>
                  </a>
                )}

                {/* Text Content */}
                {message.text && (
                  <span className="select-text whitespace-pre-wrap">{message.text}</span>
                )}

                {/* Caption if provided */}
                {message.caption && (
                  <div className="text-xs text-[var(--wa-text-primary)] mt-1 whitespace-pre-wrap">
                    {message.caption}
                  </div>
                )}

                {/* Timestamp & Delivery Ticks */}
                <span className="wa-msg-meta">
                  {message.edited && <span className="text-[0.65rem] italic mr-1">edited</span>}
                  <span>{formatTime(message.createdAt)}</span>
                  {isMe && <MessageStatusTick status={status} readReceiptsEnabled={readReceiptsEnabled} />}
                </span>
              </>
            )}
          </>
        )}
      </div>

      {/* Reactions Display Pill underneath bubble */}
      {message.reactions && message.reactions.length > 0 && (
        <div
          className={`wa-reactions-pill ${isMe ? 'self-end mr-2' : 'self-start ml-2'}`}
          onClick={() => setShowReactionBar((prev) => !prev)}
        >
          {message.reactions.slice(0, 3).map((r, i) => (
            <span key={i}>{r.emoji}</span>
          ))}
          {message.reactions.reduce((sum, r) => sum + (r.users?.length || 1), 0) > 1 && (
            <span className="text-[0.68rem] font-bold text-[var(--wa-text-secondary)] ml-1">
              {message.reactions.reduce((sum, r) => sum + (r.users?.length || 1), 0)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
