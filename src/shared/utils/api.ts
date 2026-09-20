import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE, STORAGE_KEYS } from './constants';

export const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: string | PromiseLike<string>) => void;
  reject: (reason?: any) => void;
}> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token || undefined);
  });
  failedQueue = [];
}

function hardLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.LAST_SEEN);
    localStorage.removeItem(STORAGE_KEYS.RSA_KEYS);
    localStorage.removeItem(STORAGE_KEYS.ROOM_KEYS);
    window.dispatchEvent(new Event('app:hard-logout'));
    window.location.href = '/join';
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const errMsg = error.response?.data?.error || '';

      if (errMsg.includes('reuse detected')) {
        hardLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) : null;
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });

        if (data.error && data.error.includes('reuse detected')) {
          processQueue(new Error(data.error), null);
          hardLogout();
          return Promise.reject(error);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
        }
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        const refreshErrMsg = refreshError.response?.data?.error || '';
        if (refreshErrMsg.includes('reuse detected')) {
          processQueue(refreshError, null);
          hardLogout();
          return Promise.reject(refreshError);
        }
        processQueue(refreshError, null);
        hardLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
}
