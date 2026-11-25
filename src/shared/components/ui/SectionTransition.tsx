'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  directionalSlideVariants,
  drawerSlideVariants,
  modalBackdropVariants,
  modalPanelVariants,
  pageTransitionVariants,
  type NavigationDirection,
} from '../../utils/animations';
import { useNavigation } from '../../context/NavigationContext';

interface SectionTransitionProps {
  sectionKey: string;
  direction?: NavigationDirection;
  className?: string;
  style?: React.CSSProperties;
  mode?: 'wait' | 'popLayout' | 'sync';
  children: React.ReactNode;
}

/**
 * Animates switching between sections with directional slide & fade.
 */
export const SectionTransition: React.FC<SectionTransitionProps> = ({
  sectionKey,
  direction = 1,
  className,
  style,
  mode = 'wait',
  children,
}) => {
  return (
    <AnimatePresence mode={mode} custom={direction} initial={false}>
      <motion.div
        key={sectionKey}
        custom={direction}
        variants={directionalSlideVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
        style={style}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

interface PageTransitionProps {
  routeKey: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Route-level directional transition using NavigationContext.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  routeKey,
  className,
  children,
}) => {
  const { direction } = useNavigation();

  return (
    <motion.div
      key={routeKey}
      custom={direction}
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
};

interface DrawerTransitionProps {
  isOpen: boolean;
  side?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
}

/**
 * Slide-in/out drawer wrapper.
 */
export const DrawerTransition: React.FC<DrawerTransitionProps> = ({
  isOpen,
  side = 'right',
  className,
  children,
}) => {
  return (
    <AnimatePresence custom={side}>
      {isOpen && (
        <motion.div
          custom={side}
          variants={drawerSlideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ModalTransitionProps {
  isOpen: boolean;
  onBackdropClick?: () => void;
  backdropClassName?: string;
  panelClassName?: string;
  children: React.ReactNode;
}

/**
 * Animated modal backdrop + panel wrapper.
 */
export const ModalTransition: React.FC<ModalTransitionProps> = ({
  isOpen,
  onBackdropClick,
  backdropClassName = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
  panelClassName,
  children,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={backdropClassName}
          onClick={(e) => {
            if (e.target === e.currentTarget && onBackdropClick) {
              onBackdropClick();
            }
          }}
        >
          <motion.div
            variants={modalPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={panelClassName}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
