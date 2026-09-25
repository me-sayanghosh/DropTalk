'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { connectSocket, disconnectSocket } from '../utils/socket';
import { api, getAccessToken, setTokens, clearTokens } from '../utils/api';
import { clearAllCryptoKeys } from '../utils/crypto';
import { User } from '../../types';
import BauhausLoadingScreen from '../components/ui/BauhausLoadingScreen';

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
    let isSubscribed = true;
    const token = getAccessToken();
    setAccessToken(token);

    if (!token) {
      setBootstrapped(true);
      return;
    }

    // Safety fallback: maximum 1.5 seconds loading screen
    const safetyTimer = setTimeout(() => {
      setBootstrapped(true);
    }, 1500);

    api
      .get<{ user: User }>('/auth/me', { timeout: 2500 })
      .then((r) => r.data)
      .then((data) => {
        if (!isSubscribed) return;
        if (data?.user) {
          setUser(data.user);
          setAccessToken(token);
          connectSocket(token);
        }
      })
      .catch((err) => {
        console.warn('[auth] session verification notice:', err?.response?.data?.error || err.message);
        if (err?.response?.status === 401) {
          clearTokens();
          clearAllCryptoKeys();
          if (isSubscribed) {
            setAccessToken(null);
            setUser(null);
          }
        }
      })
      .finally(() => {
        clearTimeout(safetyTimer);
        setBootstrapped(true);
      });

    return () => {
      isSubscribed = false;
    };
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
      <BauhausLoadingScreen
        title="DROPTALK WORKSPACE"
        subtitle="ESTABLISHING ENCRYPTED SESSION // PLEASE WAIT"
        stamp="BOOTSTRAP"
      />
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
