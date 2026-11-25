'use client';

import React, { ReactNode, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '../shared/context/AuthContext';
import { ToastProvider } from '../shared/context/ToastContext';
import { NavigationProvider } from '../shared/context/NavigationContext';
import ToastContainer from '../shared/components/ui/ToastContainer';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { GOOGLE_CLIENT_ID } from '../shared/utils/constants';
import { requestNotificationPermission } from '../shared/utils/webNotifications';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    requestNotificationPermission().catch(() => {});
  }, []);
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com'}>
          <ToastProvider>
            <AuthProvider>
              <NavigationProvider>
                <ToastContainer />
                {children}
              </NavigationProvider>
            </AuthProvider>
          </ToastProvider>
        </GoogleOAuthProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
