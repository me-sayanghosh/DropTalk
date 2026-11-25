'use client';

import React, { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { pageTransitionVariants } from '../shared/utils/animations';
import { useNavigation } from '../shared/context/NavigationContext';

function getRouteGroup(pathname: string): string {
  if (
    pathname === '/chat' ||
    pathname.startsWith('/channels') ||
    pathname.startsWith('/dm') ||
    pathname.startsWith('/calls') ||
    pathname.startsWith('/notifications')
  ) {
    return 'workspace';
  }
  if (pathname.startsWith('/settings')) {
    return 'settings';
  }
  return pathname;
}

let lastAnimatedGroup: string | null = null;

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const { direction } = useNavigation();
  const group = getRouteGroup(pathname);
  const shouldAnimateRef = useRef<boolean>(lastAnimatedGroup !== group);

  if (lastAnimatedGroup !== group) {
    lastAnimatedGroup = group;
  }

  return (
    <motion.div
      key={group}
      custom={direction}
      variants={pageTransitionVariants}
      initial={shouldAnimateRef.current ? 'initial' : false}
      animate="animate"
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
