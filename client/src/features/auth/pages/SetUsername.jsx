import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext.jsx';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function SetUsername() {
  const [username, setUsername] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const nav = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed to set username');
      setUser(data.user);
      nav('/chat');
    } catch (e) {
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
          <Link to="/chat" className="bauhaus-link-btn">
            SKIP FOR NOW &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
