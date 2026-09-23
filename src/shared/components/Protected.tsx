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
        <div className="bauhaus-loading-shapes" style={{ marginBottom: '1.25rem' }}>
          <span className="shape-circle" />
          <span className="shape-square" />
          <span className="shape-triangle" />
        </div>
        <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          AUTHENTICATING SECURE SESSION…
        </span>
      </div>
    );
  }

  if (user.needsUsername) {
    return (
      <div className="lazy-suspense-fallback">
        <div className="bauhaus-loading-shapes" style={{ marginBottom: '1.25rem' }}>
          <span className="shape-circle" />
          <span className="shape-square" />
          <span className="shape-triangle" />
        </div>
        <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          SETTING UP ACCOUNT…
        </span>
      </div>
    );
  }

  return <>{children}</>;
}

export default Protected;
