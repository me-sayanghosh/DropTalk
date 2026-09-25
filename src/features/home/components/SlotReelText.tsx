'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SlotReelTextProps {
  texts: string[];
  rotationInterval?: number;
  staggerDuration?: number;
  pauseOnHover?: boolean;
  className?: string;
  onNext?: (index: number) => void;
}

export const SlotReelText: React.FC<SlotReelTextProps> = ({
  texts,
  rotationInterval = 3000,
  staggerDuration = 0.035,
  pauseOnHover = true,
  className = '',
  onNext,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  const currentWord = texts[currentIndex] || '';

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const nextIdx = (prev + 1) % texts.length;
      if (onNext) onNext(nextIdx);
      return nextIdx;
    });
  }, [texts.length, onNext]);

  useEffect(() => {
    isMountedRef.current = true;

    if (texts.length <= 1) return;
    if (pauseOnHover && isHovered) return;

    timerRef.current = setTimeout(() => {
      handleNext();
    }, rotationInterval);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, isHovered, pauseOnHover, rotationInterval, texts.length, handleNext]);

  return (
    <motion.span
      className={`slot-reel-container ${className}`}
      onClick={handleNext}
      onMouseEnter={pauseOnHover ? () => setIsHovered(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setIsHovered(false) : undefined}
      title="Click to roll to next movement"
      layout="position"
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
    >
      {/* Screen reader plain text */}
      <span className="slot-reel-sr-only" aria-live="polite">
        {currentWord}
      </span>

      {/* Visual mechanical slot reel */}
      <span className="slot-reel-viewport" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={currentIndex}
            className="slot-reel-word"
            layout="position"
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            {currentWord.split('').map((char, charIdx) => (
              <span key={charIdx} className="slot-reel-char-mask">
                <motion.span
                  className="slot-reel-char"
                  initial={{ y: '105%', rotateX: -55, opacity: 0 }}
                  animate={{ y: '0%', rotateX: 0, opacity: 1 }}
                  exit={{ y: '-105%', rotateX: 55, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 24,
                    mass: 0.75,
                    delay: charIdx * staggerDuration,
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              </span>
            ))}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.span>
  );
};

export default SlotReelText;
