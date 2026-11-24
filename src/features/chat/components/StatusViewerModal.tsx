'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatusStory } from '../../../types';

interface StatusViewerModalProps {
  isOpen: boolean;
  statuses: StatusStory[];
  initialIndex?: number;
  currentUserId: string;
  onClose: () => void;
  onRecordView?: (statusId: string) => void;
  onReplyToStatus?: (partnerId: string, replyText: string) => void;
}

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  isOpen,
  statuses,
  initialIndex = 0,
  currentUserId,
  onClose,
  onRecordView,
  onReplyToStatus,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewersSheet, setShowViewersSheet] = useState(false);

  const durationMs = 5000;
  const intervalStepMs = 50;

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
  }, [initialIndex, isOpen]);

  const currentStatus = statuses[currentIndex];

  // Record view on current status
  useEffect(() => {
    if (isOpen && currentStatus && onRecordView) {
      onRecordView(currentStatus.id);
    }
  }, [isOpen, currentStatus?.id, onRecordView]);

  const handleNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, statuses.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Timer loop for advancing progress bar
  useEffect(() => {
    if (!isOpen || isPaused || showViewersSheet) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (intervalStepMs / durationMs) * 100;
        if (next >= 100) {
          handleNext();
          return 0;
        }
        return next;
      });
    }, intervalStepMs);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, showViewersSheet, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === ' ') setIsPaused((p) => !p);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentStatus) return null;

  const isOwnStatus =
    (currentStatus.user?.id || (currentStatus.user as any)?._id)?.toString() === currentUserId;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !onReplyToStatus) return;
    const partnerId = (currentStatus.user?.id || (currentStatus.user as any)?._id)?.toString();
    if (partnerId) {
      onReplyToStatus(partnerId, `Replying to status: "${currentStatus.caption || 'Photo'}"\n\n${replyText.trim()}`);
      setReplyText('');
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Top Segmented Progress Bars */}
      <div className="absolute top-0 inset-x-0 p-3 z-30 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex gap-1.5 mb-3">
          {statuses.map((_, idx) => (
            <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* User Info & Close */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            {currentStatus.user?.profileImage ? (
              <img
                src={currentStatus.user.profileImage}
                alt={currentStatus.user.username}
                className="w-9 h-9 rounded-full object-cover border border-white/50"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[var(--wa-green-primary)] flex items-center justify-center font-bold text-xs">
                {currentStatus.user?.username?.slice(0, 2).toUpperCase() || 'ST'}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-sm">
                {isOwnStatus ? 'My status' : currentStatus.user?.name || currentStatus.user?.username}
              </span>
              <span className="text-[0.7rem] text-white/70">
                {new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="wa-icon-btn text-white hover:bg-white/20" title="Close (Esc)">
            ✕
          </button>
        </div>
      </div>

      {/* Main Status Media */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Left click area */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
        />

        {/* Media content */}
        {currentStatus.mediaType === 'video' ? (
          <video
            src={currentStatus.mediaUrl}
            autoPlay
            playsInline
            className="max-h-[85vh] max-w-[90vw] object-contain rounded"
          />
        ) : (
          <img
            src={currentStatus.mediaUrl}
            alt="Status"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded shadow-2xl"
          />
        )}

        {/* Right click area */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
        />
      </div>

      {/* Caption & Bottom Controls */}
      <div className="p-4 z-30 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center gap-3">
        {currentStatus.caption && (
          <p className="text-white text-center text-sm font-medium px-4 max-w-lg">
            {currentStatus.caption}
          </p>
        )}

        {isOwnStatus ? (
          /* Viewers counter for own status */
          <button
            onClick={() => setShowViewersSheet((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-white/90 bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full"
          >
            <span>👁</span>
            <span>{currentStatus.viewers?.length || 0} views</span>
          </button>
        ) : (
          /* Reply input for other users' statuses */
          <form
            onSubmit={handleSendReply}
            className="w-full max-w-md flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to status..."
              className="flex-1 bg-white/10 text-white placeholder-white/50 text-sm px-4 py-2 rounded-full outline-none border border-white/20 focus:border-[var(--wa-green-primary)]"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="w-9 h-9 rounded-full bg-[var(--wa-green-primary)] text-white flex items-center justify-center font-bold disabled:opacity-50"
            >
              ➤
            </button>
          </form>
        )}
      </div>

      {/* Viewers Bottom Sheet Modal for own statuses */}
      {showViewersSheet && isOwnStatus && (
        <div
          className="absolute inset-x-0 bottom-0 max-h-[60vh] bg-[var(--wa-panel-bg)] rounded-t-2xl z-40 p-4 text-[var(--wa-text-primary)] shadow-2xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--wa-border)]">
            <span className="font-bold text-sm">
              Viewed by {currentStatus.viewers?.length || 0}
            </span>
            <button
              onClick={() => setShowViewersSheet(false)}
              className="wa-icon-btn text-xs"
            >
              ✕
            </button>
          </div>
          <div className="divide-y divide-[var(--wa-border)] mt-2">
            {(currentStatus.viewers || []).map((v, i) => {
              const u = typeof v.user === 'object' ? v.user : null;
              return (
                <div key={i} className="flex items-center justify-between py-2.5 text-xs">
                  <span className="font-semibold">{u?.name || u?.username || 'User'}</span>
                  <span className="text-[var(--wa-text-secondary)]">
                    {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusViewerModal;
