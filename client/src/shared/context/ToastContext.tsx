'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ToastItem {
  id: string;
  title?: string;
  snippet?: string;
  message?: string;
  category?: string;
  type: string;
}

export type ToastPayload =
  | string
  | {
      title?: string;
      snippet?: string;
      message?: string;
      category?: string;
      type?: string;
    };

interface ToastContextType {
  showToast: (payload: ToastPayload, type?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((payload: ToastPayload, type: string = 'info', duration: number = 4500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const toastObj: ToastItem =
      typeof payload === 'object' && payload !== null
        ? {
            id,
            title: payload.title || 'Notification',
            snippet: payload.snippet || payload.message || '',
            category: payload.category || payload.type || type,
            type: payload.type || type,
          }
        : { id, message: payload, type };

    setToasts((prev) => [...prev, toastObj]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
