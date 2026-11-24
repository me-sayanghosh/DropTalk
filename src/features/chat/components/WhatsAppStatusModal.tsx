'use client';

import React, { useState, useRef } from 'react';
import { StatusStory, User } from '../../../types';
import { api } from '../../../shared/utils/api';

interface WhatsAppStatusModalProps {
  currentUser: User;
  statusStories: StatusStory[];
  onClose: () => void;
  onOpenStoryIndex: (index: number) => void;
  onRefreshFeed: () => Promise<void>;
  onUploadFile?: (file: File) => Promise<any>;
}

export const WhatsAppStatusModal: React.FC<WhatsAppStatusModalProps> = ({
  currentUser,
  statusStories,
  onClose,
  onOpenStoryIndex,
  onRefreshFeed,
  onUploadFile,
}) => {
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myId = (currentUser.id || (currentUser as any)._id)?.toString();

  // Separate own statuses and contacts' statuses
  const myStatuses = statusStories.filter(
    (s) => (s.user?.id || (s.user as any)?._id)?.toString() === myId
  );
  const contactStatuses = statusStories.filter(
    (s) => (s.user?.id || (s.user as any)?._id)?.toString() !== myId
  );

  const handleFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !onUploadFile) return;

    try {
      setIsUploading(true);
      setError(null);
      const uploaded = await onUploadFile(selectedFile);
      if (!uploaded?.url) {
        throw new Error('Failed to upload status media');
      }

      const mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';
      await api.post('/status/create', {
        mediaUrl: uploaded.url,
        mediaType,
        caption: caption.trim(),
      });

      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
      await onRefreshFeed();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to post status');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteStatus = async (statusId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this status update?')) return;
    try {
      await api.delete(`/status/${statusId}`);
      await onRefreshFeed();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete status');
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
            <span className="text-xl">⭕</span>
            <h3 className="font-bold text-base">Status Updates</h3>
          </div>
          <button onClick={onClose} className="wa-icon-btn text-xs" title="Close">
            ✕
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* 1. MY STATUS ROW */}
          <div className="p-3 bg-[var(--wa-panel-header,#111b21)] rounded-xl border border-[var(--wa-border,rgba(255,255,255,0.1))]">
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                onClick={() => {
                  if (myStatuses.length > 0) {
                    const firstIdx = statusStories.findIndex((s) => s.id === myStatuses[0].id);
                    if (firstIdx >= 0) onOpenStoryIndex(firstIdx);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className={`relative flex-shrink-0 ${myStatuses.length > 0 ? 'wa-status-ring-container' : ''}`}>
                  {currentUser.profileImage ? (
                    <img src={currentUser.profileImage} alt="Me" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[var(--wa-panel-bg,#202c33)] flex items-center justify-center font-bold text-sm text-[var(--wa-green-primary,#00a884)]">
                      {currentUser.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {myStatuses.length === 0 && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--wa-green-primary,#00a884)] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[var(--wa-panel-header,#111b21)]">
                      +
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">My status</div>
                  <div className="text-xs text-[var(--wa-text-secondary,#8696a0)] truncate">
                    {myStatuses.length > 0
                      ? `${myStatuses.length} active updates · Tap to view`
                      : 'Disappears after 24 hours'}
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files)}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-[var(--wa-green-primary,#00a884)] hover:bg-[var(--wa-green-dark,#008069)] text-white text-xs font-semibold flex-shrink-0 transition-colors"
                title="Add new status update"
              >
                + Add Update
              </button>
            </div>

            {/* List of own active statuses with delete buttons */}
            {myStatuses.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--wa-border,rgba(255,255,255,0.06))] space-y-2">
                <div className="text-[0.68rem] uppercase font-semibold text-[var(--wa-text-secondary,#8696a0)]">
                  Your Current Updates
                </div>
                {myStatuses.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1">
                    <span className="truncate max-w-[200px] text-[var(--wa-text-primary,#e9edef)]">
                      {s.caption || (s.mediaType === 'video' ? 'Video update' : 'Photo update')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.7rem] text-[var(--wa-text-secondary,#8696a0)]">
                        👁 {s.viewers?.length || 0}
                      </span>
                      <button
                        onClick={(e) => handleDeleteStatus(s.id, e)}
                        className="text-red-400 hover:text-red-300 text-xs px-1"
                        title="Delete update"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STATUS UPLOAD PREVIEW FORM */}
          {selectedFile && previewUrl && (
            <form onSubmit={handleCreateStatus} className="p-3 bg-[var(--wa-panel-header,#111b21)] rounded-xl border border-[var(--wa-green-primary,#00a884)]/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--wa-green-primary,#00a884)]">
                  New Status Preview
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="text-xs text-[var(--wa-text-secondary,#8696a0)] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="rounded-lg overflow-hidden max-h-48 bg-black/20 flex items-center justify-center">
                {selectedFile.type.startsWith('video') ? (
                  <video src={previewUrl} controls className="max-h-48 w-full object-contain" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-48 w-full object-contain" />
                )}
              </div>

              <input
                type="text"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={500}
                className="w-full bg-[var(--wa-panel-bg,#202c33)] border border-[var(--wa-border,rgba(255,255,255,0.1))] rounded-lg px-3 py-2 text-xs text-[var(--wa-text-primary,#e9edef)] outline-none focus:border-[var(--wa-green-primary,#00a884)]"
              />

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-2 rounded-lg bg-[var(--wa-green-primary,#00a884)] hover:bg-[var(--wa-green-dark,#008069)] text-white font-bold text-xs shadow transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUploading ? 'Posting Status...' : 'Post to WhatsApp Status'}
              </button>
            </form>
          )}

          {/* 2. RECENT UPDATES FROM CONTACTS */}
          <div>
            <div className="text-xs uppercase font-bold text-[var(--wa-text-secondary,#8696a0)] mb-2 px-1">
              Recent updates ({contactStatuses.length})
            </div>

            {contactStatuses.length > 0 ? (
              <div className="space-y-1 divide-y divide-[var(--wa-border,rgba(255,255,255,0.06))]">
                {contactStatuses.map((s) => {
                  const author: any = s.user || {};
                  const globalIdx = statusStories.findIndex((item) => item.id === s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => onOpenStoryIndex(globalIdx >= 0 ? globalIdx : 0)}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--wa-panel-header,#111b21)] cursor-pointer transition-colors"
                    >
                      <div className="wa-status-ring-container flex-shrink-0">
                        {author.profileImage ? (
                          <img src={author.profileImage} alt={author.username} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[var(--wa-panel-header,#111b21)] flex items-center justify-center font-bold text-xs text-[var(--wa-green-primary,#00a884)]">
                            {(author.name || author.username || 'User').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-[var(--wa-text-primary,#e9edef)] truncate">
                          {author.name || author.username || 'User'}
                        </div>
                        <div className="text-[0.7rem] text-[var(--wa-text-secondary,#8696a0)] truncate">
                          {s.caption || (s.mediaType === 'video' ? 'Video' : 'Photo')} · {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <span className="text-xs text-[var(--wa-green-primary,#00a884)]">
                        View →
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-center py-6 text-[var(--wa-text-secondary,#8696a0)]">
                No recent status updates from your contacts.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppStatusModal;
