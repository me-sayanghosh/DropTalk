import type { Transition, Variants } from 'framer-motion';

export type NavigationDirection = 1 | -1;

export const SECTION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SECTION_SPRING: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 34,
  mass: 0.9,
};

export const FAST_EASE_TRANSITION: Transition = {
  duration: 0.24,
  ease: SECTION_EASE,
};

/**
 * Directional horizontal slide + opacity + subtle scale.
 * direction = 1 (opening / forward): enters from right, exits to left.
 * direction = -1 (backing / backward): enters from left, exits to right.
 */
export const directionalSlideVariants: Variants = {
  initial: (direction: NavigationDirection = 1) => ({
    opacity: 0,
    x: direction > 0 ? 36 : -36,
    scale: 0.985,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      x: { duration: 0.28, ease: SECTION_EASE },
      opacity: { duration: 0.22, ease: 'easeOut' },
      scale: { duration: 0.28, ease: SECTION_EASE },
    },
  },
  exit: (direction: NavigationDirection = 1) => ({
    opacity: 0,
    x: direction > 0 ? -28 : 28,
    scale: 0.985,
    transition: {
      x: { duration: 0.22, ease: SECTION_EASE },
      opacity: { duration: 0.18, ease: 'easeIn' },
      scale: { duration: 0.22, ease: SECTION_EASE },
    },
  }),
};

/**
 * Full-width mobile slide variants (for mobile sidebar <-> detail view).
 */
export const mobileSlideVariants: Variants = {
  initial: (direction: NavigationDirection = 1) => ({
    opacity: 0.4,
    x: direction > 0 ? '100%' : '-35%',
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: SECTION_EASE,
    },
  },
  exit: (direction: NavigationDirection = 1) => ({
    opacity: 0.4,
    x: direction > 0 ? '-35%' : '100%',
    transition: {
      duration: 0.26,
      ease: SECTION_EASE,
    },
  }),
};

/**
 * Subtle vertical fade + slide for page-level transitions.
 */
export const pageTransitionVariants: Variants = {
  initial: (direction: NavigationDirection = 1) => ({
    opacity: 0,
    x: direction > 0 ? 24 : -24,
    y: 6,
  }),
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.28,
      ease: SECTION_EASE,
    },
  },
  exit: (direction: NavigationDirection = 1) => ({
    opacity: 0,
    x: direction > 0 ? -20 : 20,
    y: -4,
    transition: {
      duration: 0.2,
      ease: SECTION_EASE,
    },
  }),
};

/**
 * Drawer slide-in/out variants (left or right edge).
 */
export const drawerSlideVariants: Variants = {
  initial: (side: 'left' | 'right' = 'right') => ({
    opacity: 0,
    x: side === 'right' ? '100%' : '-100%',
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.28,
      ease: SECTION_EASE,
    },
  },
  exit: (side: 'left' | 'right' = 'right') => ({
    opacity: 0,
    x: side === 'right' ? '100%' : '-100%',
    transition: {
      duration: 0.22,
      ease: SECTION_EASE,
    },
  }),
};

/**
 * Modal backdrop + panel variants.
 */
export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } },
};

export const modalPanelVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 14 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.24, ease: SECTION_EASE },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.18, ease: SECTION_EASE },
  },
};

/**
 * Collapsible inline bar (e.g. in-chat search, dropdowns).
 */
export const collapseBarVariants: Variants = {
  initial: { opacity: 0, height: 0, y: -6 },
  animate: {
    opacity: 1,
    height: 'auto',
    y: 0,
    transition: { duration: 0.22, ease: SECTION_EASE },
  },
  exit: {
    opacity: 0,
    height: 0,
    y: -6,
    transition: { duration: 0.18, ease: SECTION_EASE },
  },
};
