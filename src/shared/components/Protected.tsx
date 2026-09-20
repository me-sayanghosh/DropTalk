'use client';

import React, { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/join');
    } else if (user.needsUsername) {
      router.replace('/set-username');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="lazy-suspense-fallback">
        <div className="lazy-spinner" />
        <span>Authenticating...</span>
      </div>
    );
  }

  if (user.needsUsername) {
    return (
      <div className="lazy-suspense-fallback">
        <div className="lazy-spinner" />
        <span>Setting up account...</span>
      </div>
    );
  }

  return <>{children}</>;
}

export default Protected;
