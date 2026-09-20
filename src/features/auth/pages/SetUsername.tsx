'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../shared/context/AuthContext';
import { API_BASE, STORAGE_KEYS } from '../../../shared/utils/constants';

export default function SetUsername() {
  const [username, setUsername] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) : '';
      const res = await fetch(`${API_BASE}/auth/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed to set username');
      setUser(data.user);
      router.push('/chat');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bauhaus-auth-page">
      <div className="bauhaus-auth-bg-circle" />
      <div className="bauhaus-auth-bg-square" />
      <div className="bauhaus-auth-bg-triangle" />

      <div className="bauhaus-auth-card">
        <div className="bauhaus-auth-top-bar">
          <span className="b-bar-yellow" />
          <span className="b-bar-red" />
          <span className="b-bar-blue" />
        </div>

        <div className="bauhaus-auth-header">
          <div className="bauhaus-logo-shapes">
            <span className="b-circle" />
            <span className="b-square" />
            <span className="b-triangle" />
          </div>
          <h1 className="bauhaus-auth-title">IDENTIFIER SETUP</h1>
          <p className="bauhaus-auth-subtitle">SELECT YOUR UNIQUE CONSTRUCTIVIST HANDLE</p>
        </div>

        <form onSubmit={handleSubmit} className="bauhaus-auth-form">
          <div className="bauhaus-form-group">
            <label className="bauhaus-label">USERNAME (3-24 CHARACTERS)</label>
            <input
              type="text"
              placeholder="e.g. walter_gropius"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_\-]+"
              required
              autoComplete="username"
              className="bauhaus-input"
            />
          </div>

          {err && (
            <div className="bauhaus-alert-error">
              <span>{err}</span>
            </div>
          )}

          <button type="submit" disabled={busy} className="bauhaus-btn bauhaus-btn-red w-full justify-center lg">
            {busy ? 'REGISTERING HANDLE…' : 'CONFIRM & ENTER WORKSPACE'}
          </button>
        </form>

        <div className="bauhaus-auth-footer-skip">
          <Link href="/chat" className="bauhaus-link-btn">
            SKIP FOR NOW &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
