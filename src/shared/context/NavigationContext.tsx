'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { NavigationDirection } from '../utils/animations';

interface NavigationContextValue {
  direction: NavigationDirection;
  setDirection: (dir: NavigationDirection) => void;
  navigateForward: (href: string) => void;
  navigateBack: (fallbackHref?: string) => void;
  historyStack: string[];
}

const NavigationContext = createContext<NavigationContextValue>({
  direction: 1,
  setDirection: () => {},
  navigateForward: () => {},
  navigateBack: () => {},
  historyStack: [],
});

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [direction, setDirection] = useState<NavigationDirection>(1);
  const stackRef = useRef<string[]>([pathname]);
  const manualDirRef = useRef<NavigationDirection | null>(null);

  // Detect browser back/forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      manualDirRef.current = -1;
      setDirection(-1);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Track pathname changes to infer forward vs back if not explicitly set
  useEffect(() => {
    const stack = stackRef.current;
    const last = stack[stack.length - 1];
    if (last === pathname) return;

    if (manualDirRef.current !== null) {
      setDirection(manualDirRef.current);
      manualDirRef.current = null;
      if (stack.length >= 2 && stack[stack.length - 2] === pathname) {
        stack.pop();
      } else {
        stack.push(pathname);
      }
      return;
    }

    // Check if returning to a previous route in stack
    const prevIdx = stack.lastIndexOf(pathname);
    if (prevIdx !== -1 && prevIdx < stack.length - 1) {
      setDirection(-1);
      stackRef.current = stack.slice(0, prevIdx + 1);
    } else {
      setDirection(1);
      stack.push(pathname);
      if (stack.length > 30) {
        stack.shift();
      }
    }
  }, [pathname]);

  const navigateForward = useCallback(
    (href: string) => {
      manualDirRef.current = 1;
      setDirection(1);
      router.push(href);
    },
    [router]
  );

  const navigateBack = useCallback(
    (fallbackHref = '/') => {
      manualDirRef.current = -1;
      setDirection(-1);
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push(fallbackHref);
      }
    },
    [router]
  );

  return (
    <NavigationContext.Provider
      value={{
        direction,
        setDirection,
        navigateForward,
        navigateBack,
        historyStack: stackRef.current,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}
