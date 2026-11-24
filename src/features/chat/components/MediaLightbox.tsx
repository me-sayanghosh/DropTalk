'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface MediaItem {
  url: string;
  filename?: string;
  fileType?: string;
  caption?: string;
  senderUsername?: string;
  createdAt?: string;
}

interface MediaLightboxProps {
  isOpen: boolean;
  mediaList: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  isOpen,
  mediaList,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
  }, [initialIndex, isOpen]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setZoomLevel(1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < mediaList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setZoomLevel(1);
    }
  }, [currentIndex, mediaList.length]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, z - 0.25));
  const handleZoomReset = () => setZoomLevel(1);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === '+' || e.key === '=') handleZoomIn();
      else if (e.key === '-') handleZoomOut();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || mediaList.length === 0) return null;

  const currentMedia = mediaList[currentIndex] || mediaList[0];
  const isVideo = currentMedia.fileType === 'video' || /\.(mp4|webm|mov)$/i.test(currentMedia.url);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = currentMedia.url;
    a.download = currentMedia.filename || 'download';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="wa-lightbox-overlay select-none" onClick={onClose}>
      {/* Top Header */}
      <div className="wa-lightbox-header" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-white">
            {currentMedia.senderUsername ? `@${currentMedia.senderUsername}` : currentMedia.filename || 'Media'}
          </span>
          <span className="text-xs text-neutral-400">
            {currentIndex + 1} of {mediaList.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isVideo && (
            <>
              <button
                onClick={handleZoomIn}
                className="wa-icon-btn text-white hover:bg-neutral-800"
                title="Zoom In (+)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>
              <button
                onClick={handleZoomOut}
                className="wa-icon-btn text-white hover:bg-neutral-800"
                title="Zoom Out (-)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>
              <button
                onClick={handleZoomReset}
                className="wa-icon-btn text-white hover:bg-neutral-800 text-xs font-bold"
                title="Reset Zoom"
              >
                1:1
              </button>
            </>
          )}

          <button
            onClick={handleDownload}
            className="wa-icon-btn text-white hover:bg-neutral-800"
            title="Download file"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="wa-icon-btn text-white hover:bg-neutral-800"
            title="Close (Esc)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Image/Video View */}
      <div className="wa-lightbox-content" onClick={(e) => e.stopPropagation()}>
        {/* Left Arrow */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 wa-icon-btn text-white bg-black/50 hover:bg-black/80 z-20 w-12 h-12"
            title="Previous (ArrowLeft)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Media Container */}
        {isVideo ? (
          <video
            src={currentMedia.url}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[80vh] rounded shadow-2xl"
          />
        ) : (
          <img
            src={currentMedia.url}
            alt={currentMedia.filename || 'Media'}
            className="wa-lightbox-img"
            style={{ transform: `scale(${zoomLevel})` }}
            onWheel={(e) => {
              if (e.deltaY < 0) handleZoomIn();
              else handleZoomOut();
            }}
          />
        )}

        {/* Right Arrow */}
        {currentIndex < mediaList.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 wa-icon-btn text-white bg-black/50 hover:bg-black/80 z-20 w-12 h-12"
            title="Next (ArrowRight)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Caption Footer */}
      {currentMedia.caption && (
        <div
          className="p-4 text-center text-white bg-black/60 text-sm backdrop-blur-sm max-w-2xl mx-auto rounded-t-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {currentMedia.caption}
        </div>
      )}
    </div>
  );
};

export default MediaLightbox;
