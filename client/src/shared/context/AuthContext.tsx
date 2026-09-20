'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { connectSocket, disconnectSocket } from '../utils/socket';
import { api, getAccessToken, setTokens, clearTokens } from '../utils/api';
import { clearAllCryptoKeys } from '../utils/crypto';
import { User } from '../../types';

export interface LoginParams {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (params: LoginParams) => void;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthCtx = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState<boolean>(false);

  useEffect(() => {
    const token = getAccessToken();
    setAccessToken(token);

    if (!token) {
      setBootstrapped(true);
      return;
    }

    api
      .get<{ user: User }>('/auth/me')
      .then((r) => r.data)
      .then((data) => {
        setUser(data.user);
        setAccessToken(token);
        connectSocket(token);
      })
      .catch(() => {
        clearTokens();
        clearAllCryptoKeys();
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setBootstrapped(true));
  }, []);

  function login({ accessToken: at, refreshToken: rt, user: u }: LoginParams) {
    setTokens(at, rt);
    setAccessToken(at);
    setUser(u);
    connectSocket(at);
  }

  function logout() {
    clearTokens();
    clearAllCryptoKeys();
    setAccessToken(null);
    setUser(null);
    disconnectSocket();
  }

  if (!bootstrapped) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B0F19',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3.5px solid #1E293B',
            borderTopColor: '#0052FF',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ marginTop: '16px', fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>
          Loading DropTalk...
        </p>
      </div>
    );
  }

  return (
    <AuthCtx.Provider value={{ user, token: accessToken, login, logout, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthCtx);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
