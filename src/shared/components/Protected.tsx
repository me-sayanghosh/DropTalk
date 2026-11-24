'use client';

import React, { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

import BauhausLoadingScreen from './ui/BauhausLoadingScreen';

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
      <BauhausLoadingScreen
        title="DROPTALK"
        subtitle="CHECKING SESSION"
        stamp="AUTH"
      />
    );
  }

  if (user.needsUsername) {
    return (
      <BauhausLoadingScreen
        title="DROPTALK"
        subtitle="REDIRECTING TO USERNAME SETUP"
        stamp="PROFILE"
      />
    );
  }

  return <>{children}</>;
}

export default Protected;
