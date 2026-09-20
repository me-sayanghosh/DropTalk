'use client';

import React, { ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '../shared/context/AuthContext';
import { ToastProvider } from '../shared/context/ToastContext';
import ToastContainer from '../shared/components/ui/ToastContainer';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { GOOGLE_CLIENT_ID } from '../shared/utils/constants';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com'}>
        <ToastProvider>
          <AuthProvider>
            <ToastContainer />
            {children}
          </AuthProvider>
        </ToastProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}
