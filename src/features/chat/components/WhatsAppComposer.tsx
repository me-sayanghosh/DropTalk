'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon, FileText, MapPin } from 'lucide-react';
import useAudioRecorder from '../hooks/useAudioRecorder';

interface WhatsAppComposerProps {
  onSendMessage: (text: string, attachments?: any[], location?: any, isVoiceNote?: boolean, voiceMeta?: any) => void;
  onTyping?: () => void;
  replyToMessage?: any;
  onClearReply?: () => void;
  disabled?: boolean;
  disabledNotice?: string;
  onUploadFile?: (file: File) => Promise<any>;
}

export const WhatsAppComposer: React.FC<WhatsAppComposerProps> = ({
  onSendMessage,
  onTyping,
  replyToMessage,
  onClearReply,
  disabled = false,
  disabledNotice,
  onUploadFile,
}) => {
  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const {
    isRecording,
    recordingDuration,
    waveformAmplitudes,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Auto-grow textarea
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(120, el.scrollHeight)}px`;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    adjustHeight();
    onTyping?.();
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || disabled || isUploading) return;

    onSendMessage(trimmed, attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onClearReply?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !onUploadFile) return;
    setIsUploading(true);
    setShowAttachMenu(false);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploaded = await onUploadFile(file);
        if (uploaded) {
          setAttachments((prev) => [...prev, uploaded]);
        }
      }
    } catch (err: any) {
      console.error('[composer] upload failed:', err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Clipboard paste handling (Ctrl+V / Cmd+V images)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !onUploadFile) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileUpload({ 0: file, length: 1, item: () => file } as any);
          break;
        }
      }
    }
  };

  // Location share
  const handleShareLocation = () => {
    setShowAttachMenu(false);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const locationPayload = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          name: 'Current Location',
          address: `Lat: ${pos.coords.latitude.toFixed(4)}, Long: ${pos.coords.longitude.toFixed(4)}`,
        };
        onSendMessage('', [], locationPayload);
      },
      (err) => {
        alert(`Location access failed: ${err.message}`);
      }
    );
  };

  // Voice recording completion
  const handleStopAndSendAudio = async () => {
    const blob = await stopRecording();
    if (!blob || !onUploadFile) return;

    setIsUploading(true);
    try {
      const audioFile = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type });
      const uploaded = await onUploadFile(audioFile);
      if (uploaded) {
        onSendMessage(
          '',
          [uploaded],
          undefined,
          true,
          {
            voiceDuration: recordingDuration,
            voiceWaveform: waveformAmplitudes,
          }
        );
      }
    } catch (err: any) {
      console.error('[composer] voice upload failed:', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (disabled) {
    return (
      <div className="wa-composer-container justify-center items-center py-4 bg-[var(--wa-panel-header)] border-t border-[var(--wa-border)] text-[var(--wa-text-secondary)] text-sm italic select-none">
        {disabledNotice || 'Only admins can send messages'}
      </div>
    );
  }

  return (
    <div className="flex flex-col relative bg-[var(--wa-panel-header)]">
      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* Quoted Reply Banner */}
      {replyToMessage && (
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--wa-panel-bg)] border-b border-[var(--wa-border)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-8 bg-[var(--wa-green-primary)] rounded-full flex-shrink-0" />
            <div className="flex flex-col text-xs min-w-0">
              <span className="font-semibold text-[var(--wa-green-primary)]">
                Replying to @{replyToMessage.senderUsername || 'User'}
              </span>
              <span className="truncate text-[var(--wa-text-secondary)]">
                {replyToMessage.text || 'Attachment'}
              </span>
            </div>
          </div>
          <button onClick={onClearReply} className="wa-icon-btn text-xs" title="Cancel reply">
            ✕
          </button>
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-[var(--wa-panel-bg)] overflow-x-auto border-b border-[var(--wa-border)]">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative group rounded bg-black/5 p-1 flex-shrink-0">
              <span className="text-xs truncate max-w-[120px] block px-1 text-[var(--wa-text-primary)]">
                {att.filename}
              </span>
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Attachment Popup Menu */}
      {showAttachMenu && (
        <div className="wa-attachment-popover animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div
            className="wa-attachment-item"
            onClick={() => imageInputRef.current?.click()}
          >
            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center">
              📷
            </div>
            <span>Photos & Videos</span>
          </div>

          <div
            className="wa-attachment-item"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
              📄
            </div>
            <span>Document</span>
          </div>

          <div
            className="wa-attachment-item"
            onClick={handleShareLocation}
          >
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
              📍
            </div>
            <span>Location</span>
          </div>
        </div>
      )}

      {/* Bottom Composer Bar */}
      <div className="wa-composer-container">
        {isRecording ? (
          /* Live Audio Recording State */
          <div className="wa-recording-bar">
            <div className="wa-recording-dot" />
            <span className="font-semibold text-sm">{formatSecs(recordingDuration)}</span>

            {/* Waveform Visualization Bars */}
            <div className="flex-1 flex items-center gap-1 h-6 px-2 overflow-hidden">
              {waveformAmplitudes.map((amp, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-[var(--wa-danger)] rounded-full transition-all"
                  style={{ height: `${Math.max(4, Math.round(amp * 22))}px` }}
                />
              ))}
            </div>

            {/* Cancel Button */}
            <button
              onClick={cancelRecording}
              className="wa-icon-btn text-[var(--wa-danger)] hover:bg-red-500/10"
              title="Cancel recording"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>

            {/* Send Recorded Voice Note Button */}
            <button
              onClick={handleStopAndSendAudio}
              className="wa-play-btn bg-[var(--wa-green-primary)]"
              title="Send voice note"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        ) : (
          /* Normal Composer Input */
          <>
            {/* Emoji Trigger */}
            <button
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="wa-icon-btn"
              title="Emoji"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>

            {/* Attachment Trigger */}
            <button
              onClick={() => setShowAttachMenu((prev) => !prev)}
              className="wa-icon-btn"
              title="Attach"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            {/* Textarea */}
            <div className="wa-composer-input-box">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                rows={1}
                placeholder="Type a message"
                className="wa-composer-textarea"
              />
            </div>

            {/* Send or Push-to-Talk Mic Button */}
            {text.trim().length > 0 || attachments.length > 0 ? (
              <button
                onClick={handleSend}
                disabled={isUploading}
                className="wa-icon-btn text-[var(--wa-green-primary)] hover:text-[var(--wa-green-dark)] font-bold"
                title="Send (Enter)"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="wa-icon-btn text-[var(--wa-text-secondary)] hover:text-[var(--wa-green-primary)]"
                title="Hold or tap to record voice note"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppComposer;
