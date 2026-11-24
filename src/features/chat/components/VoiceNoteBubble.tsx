'use client';

import React, { useState, useRef, useEffect } from 'react';
import MessageStatusTick from './MessageStatusTick';

interface VoiceNoteBubbleProps {
  audioUrl: string;
  duration?: number;
  waveform?: number[];
  senderUsername?: string;
  senderAvatar?: string;
  isMe?: boolean;
  timestamp?: string;
  status?: string;
  readReceiptsEnabled?: boolean;
}

export const VoiceNoteBubble: React.FC<VoiceNoteBubbleProps> = ({
  audioUrl,
  duration = 0,
  waveform = [],
  senderAvatar,
  isMe = false,
  timestamp,
  status = 'sent',
  readReceiptsEnabled = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate fallback waveform if empty
  const defaultBars = [
    0.3, 0.6, 0.4, 0.8, 0.5, 0.9, 0.7, 0.4, 0.6, 0.8,
    0.3, 0.5, 0.7, 0.9, 0.6, 0.4, 0.8, 0.5, 0.7, 0.3,
    0.5, 0.8, 0.6, 0.4, 0.7, 0.5, 0.8, 0.4,
  ];
  const bars = waveform && waveform.length > 0 ? waveform : defaultBars;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.playbackRate = playbackSpeed;
      audio.play().catch((err) => console.warn('Audio play error:', err));
      setIsPlaying(true);
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleScrub = (idx: number) => {
    const audio = audioRef.current;
    if (!audio || totalDuration === 0) return;
    const ratio = idx / bars.length;
    const targetTime = ratio * totalDuration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const playedProgressRatio = totalDuration > 0 ? currentTime / totalDuration : 0;

  return (
    <div className="wa-voice-note select-none">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Sender Avatar */}
      {senderAvatar && (
        <img
          src={senderAvatar}
          alt="Avatar"
          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
        />
      )}

      {/* Play/Pause Action Button */}
      <button
        onClick={togglePlay}
        className="wa-play-btn"
        aria-label={isPlaying ? 'Pause' : 'Play voice note'}
      >
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>

      {/* Waveform Scrubber & Timer */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="wa-waveform" title="Click to seek">
          {bars.map((amplitude, idx) => {
            const barRatio = idx / bars.length;
            const isPlayed = barRatio <= playedProgressRatio;
            const heightPx = Math.max(4, Math.round(amplitude * 22));

            return (
              <div
                key={idx}
                className={`wa-waveform-bar ${isPlayed ? 'played' : ''}`}
                style={{ height: `${heightPx}px` }}
                onClick={() => handleScrub(idx)}
              />
            );
          })}
        </div>

        <div className="flex justify-between items-center text-[0.72rem] text-[var(--wa-text-secondary)] mt-1">
          <span>{isPlaying ? formatSecs(currentTime) : formatSecs(totalDuration)}</span>
          <div className="flex items-center gap-1.5">
            {/* Speed Toggle Pill */}
            <button onClick={cycleSpeed} className="wa-speed-pill" title="Playback speed">
              {playbackSpeed}x
            </button>
            {timestamp && <span className="opacity-80">{timestamp}</span>}
            {isMe && <MessageStatusTick status={status} readReceiptsEnabled={readReceiptsEnabled} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceNoteBubble;
