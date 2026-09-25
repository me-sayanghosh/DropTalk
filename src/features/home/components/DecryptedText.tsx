'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const DEFAULT_CIPHER_CHARS = '0123456789ABCDEF!@#$%&*<>{}[]/\\+=~_?';

export interface DecryptedTextProps {
  texts: string[];
  rotationInterval?: number;
  scrambleDuration?: number;
  speed?: number;
  characters?: string;
  sequential?: boolean;
  pauseOnHover?: boolean;
  showCursor?: boolean;
  className?: string;
  onWordChange?: (word: string, index: number) => void;
}

interface SlotState {
  char: string;
  isScrambling: boolean;
  isResolved: boolean;
  isJustLocked: boolean;
  isLead: boolean;
  isCollapsing: boolean;
  isEntering: boolean;
}

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  texts,
  rotationInterval = 3000,
  scrambleDuration = 750,
  speed = 36,
  characters = DEFAULT_CIPHER_CHARS,
  sequential = true,
  pauseOnHover = true,
  showCursor = true,
  className = '',
  onWordChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Initial SSR state uses the first text rendered cleanly
  const initialWord = texts[0] || '';
  const [slots, setSlots] = useState<SlotState[]>(() =>
    initialWord.split('').map((char) => ({
      char,
      isScrambling: false,
      isResolved: true,
      isJustLocked: false,
      isLead: false,
      isCollapsing: false,
      isEntering: false,
    }))
  );

  const animFrameRef = useRef<number | null>(null);
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);
  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;

  const currentWord = texts[currentIndex] || '';

  // Helper to pick random cipher character
  const getRandomChar = useCallback(() => {
    return characters[Math.floor(Math.random() * characters.length)];
  }, [characters]);

  // Decryption transition runner
  const runDecryption = useCallback(
    (targetWord: string, sourceWord: string, onComplete?: () => void) => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      setIsDecrypting(true);
      const startTime = performance.now();
      const numSlots = Math.max(sourceWord.length, targetWord.length);
      const baseDelay = 120; // Initial scramble pause before first letters resolve
      const effectiveDuration = Math.max(scrambleDuration, baseDelay + 200);

      // Track last change time per slot to control glyph flicker speed
      const lastChangeTimes = new Array(numSlots).fill(0);
      const currentChars = new Array(numSlots).fill('');
      const lockedFlags = new Array(numSlots).fill(false);
      const justLockedTimers: { [key: number]: number } = {};

      const animateFrame = (now: number) => {
        const elapsed = now - startTime;
        let allTargetResolved = true;

        // Determine which slot is the active leading resolve head
        let leadIndex = -1;
        for (let i = 0; i < targetWord.length; i++) {
          const resolveAt = sequential
            ? baseDelay + (i / targetWord.length) * (effectiveDuration - baseDelay)
            : effectiveDuration;
          if (elapsed < resolveAt) {
            leadIndex = i;
            allTargetResolved = false;
            break;
          }
        }

        const newSlots: SlotState[] = [];

        for (let i = 0; i < numSlots; i++) {
          const targetChar = i < targetWord.length ? targetWord[i] : null;

          // Extra characters from a previous longer word collapse & vanish
          if (targetChar === null) {
            const collapseDuration = 200;
            const isCollapsing = elapsed >= collapseDuration;
            if (!isCollapsing) {
              if (now - lastChangeTimes[i] >= speed) {
                currentChars[i] = getRandomChar();
                lastChangeTimes[i] = now;
              }
              newSlots.push({
                char: currentChars[i] || getRandomChar(),
                isScrambling: true,
                isResolved: false,
                isJustLocked: false,
                isLead: false,
                isCollapsing: false,
                isEntering: false,
              });
            }
            continue;
          }

          // Spaces are kept unchanged without scrambling
          if (targetChar === ' ') {
            newSlots.push({
              char: ' ',
              isScrambling: false,
              isResolved: true,
              isJustLocked: false,
              isLead: false,
              isCollapsing: false,
              isEntering: false,
            });
            continue;
          }

          const resolveAt = sequential
            ? baseDelay + (i / targetWord.length) * (effectiveDuration - baseDelay)
            : effectiveDuration;

          if (elapsed < resolveAt) {
            // Actively scrambling
            if (now - lastChangeTimes[i] >= speed || !currentChars[i]) {
              currentChars[i] = getRandomChar();
              lastChangeTimes[i] = now;
            }

            newSlots.push({
              char: currentChars[i],
              isScrambling: true,
              isResolved: false,
              isJustLocked: false,
              isLead: i === leadIndex,
              isCollapsing: false,
              isEntering: i >= sourceWord.length,
            });
          } else {
            // Resolved into target character
            const isNewLock = !lockedFlags[i];
            if (isNewLock) {
              lockedFlags[i] = true;
              justLockedTimers[i] = now;
            }

            const justLocked = justLockedTimers[i] && now - justLockedTimers[i] < 300;

            newSlots.push({
              char: targetChar,
              isScrambling: false,
              isResolved: true,
              isJustLocked: Boolean(justLocked),
              isLead: false,
              isCollapsing: false,
              isEntering: false,
            });
          }
        }

        setSlots(newSlots);

        if (allTargetResolved && elapsed >= effectiveDuration) {
          // Final cleanup & snap
          setSlots(
            targetWord.split('').map((char) => ({
              char,
              isScrambling: false,
              isResolved: true,
              isJustLocked: false,
              isLead: false,
              isCollapsing: false,
              isEntering: false,
            }))
          );
          setIsDecrypting(false);
          if (onComplete) onComplete();
        } else {
          animFrameRef.current = requestAnimationFrame(animateFrame);
        }
      };

      animFrameRef.current = requestAnimationFrame(animateFrame);
    },
    [getRandomChar, scrambleDuration, sequential, speed]
  );

  // Transition to next index
  const advanceToWord = useCallback(
    (nextIdx: number) => {
      const targetWord = texts[nextIdx];
      const sourceWord = texts[currentIndexRef.current];
      if (!targetWord) return;

      runDecryption(targetWord, sourceWord, () => {
        setCurrentIndex(nextIdx);
        if (onWordChange) {
          onWordChange(targetWord, nextIdx);
        }
      });
    },
    [texts, runDecryption, onWordChange]
  );

  // Next word handler
  const handleNext = useCallback(() => {
    const nextIdx = (currentIndexRef.current + 1) % texts.length;
    advanceToWord(nextIdx);
  }, [texts.length, advanceToWord]);

  // Click advances to next word immediately with decrypt animation
  const handleClick = useCallback(() => {
    if (texts.length <= 1) {
      // Re-trigger decrypt on same word
      runDecryption(currentWord, currentWord);
    } else {
      handleNext();
    }
  }, [texts.length, currentWord, handleNext, runDecryption]);

  // Hover re-scramble
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (!isDecrypting) {
      runDecryption(currentWord, currentWord);
    }
  }, [currentWord, isDecrypting, runDecryption]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Main rotation timer
  useEffect(() => {
    isMountedRef.current = true;

    if (texts.length <= 1) return;
    if (pauseOnHover && isHovered) return;

    rotationTimerRef.current = setTimeout(() => {
      handleNext();
    }, rotationInterval);

    return () => {
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
      }
    };
  }, [currentIndex, isHovered, pauseOnHover, rotationInterval, texts.length, handleNext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
      }
    };
  }, []);

  return (
    <span
      className={`cipher-text-container ${className}`}
      onClick={handleClick}
      onMouseEnter={pauseOnHover ? handleMouseEnter : undefined}
      onMouseLeave={pauseOnHover ? handleMouseLeave : undefined}
      title="Click to decrypt next movement"
    >
      {/* Screen reader accessible plain text */}
      <span className="cipher-text-sr-only" aria-live="polite">
        {currentWord}
      </span>

      {/* Visual cyber scramble characters */}
      <span className="cipher-char-wrapper" aria-hidden="true">
        {slots.map((slot, idx) => {
          let charClass = 'cipher-char';
          if (slot.isScrambling) charClass += ' is-scrambling';
          if (slot.isResolved) charClass += ' is-resolved';
          if (slot.isJustLocked) charClass += ' just-locked';
          if (slot.isLead) charClass += ' is-lead';
          if (slot.isCollapsing) charClass += ' is-collapsing';
          if (slot.isEntering) charClass += ' is-entering';

          return (
            <span key={idx} className={charClass}>
              {slot.char}
            </span>
          );
        })}
      </span>

      {/* Cyber decrypt cursor */}
      {showCursor && (
        <span
          className={`cipher-cursor ${isDecrypting ? 'is-active' : 'is-idle'}`}
          aria-hidden="true"
        >
          {isDecrypting ? '█' : '▌'}
        </span>
      )}
    </span>
  );
};

export default DecryptedText;
