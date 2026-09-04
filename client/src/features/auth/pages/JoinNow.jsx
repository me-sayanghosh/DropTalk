import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, ShieldCheck, Sparkles, KeyRound, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext.jsx';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
const rawGoogleId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const isRealGoogleId = rawGoogleId && !rawGoogleId.includes('YOUR_GOOGLE_CLIENT_ID') && !rawGoogleId.includes('dummy') && !rawGoogleId.includes('example');

export default function JoinNow() {
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login } = useAuth();
  const nav = useNavigate();
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // Google Login Hook
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setErr('');
      setInfo('');
      setBusy(true);
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const googleUser = await res.json();
        if (!googleUser || !googleUser.email) {
          throw new Error('Failed to retrieve profile details from Google account.');
        }

        const backendRes = await fetch(`${API}/auth/google-direct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: googleUser.email,
            name: googleUser.name || '',
            picture: googleUser.picture || '',
            googleId: googleUser.sub || '',
          }),
        });
        const data = await backendRes.json();
        if (!backendRes.ok) throw new Error(data.error || 'Google sign-in failed on server');

        login({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
        if (data.user.needsUsername) {
          nav('/set-username');
        } else {
          nav('/chat');
        }
      } catch (e) {
        setErr(e.message);
      } finally {
        setBusy(false);
      }
    },
    onError: () => setErr('Google Sign-In was cancelled or blocked by browser settings.'),
  });

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Google OAuth Sign-In
  async function handleGoogleSuccess(credentialResponse) {
    setErr('');
    setInfo('');
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      if (data.user.needsUsername) {
        nav('/set-username');
      } else {
        nav('/chat');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Handle Request OTP
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setErr('');
    setInfo('');

    if (!email || !email.includes('@')) {
      setErr('Please enter a valid email address.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      setStep('otp');
      setResendCooldown(30);
      setInfo(`Verification code sent to ${email}`);
      setTimeout(() => inputRefs[0].current?.focus(), 150);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Handle OTP digit changes with auto-advance
  function handleDigitChange(index, val) {
    if (val.length > 1) {
      // Pasted full OTP code
      const cleaned = val.replace(/\D/g, '').slice(0, 6);
      if (cleaned.length > 0) {
        const nextDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          nextDigits[i] = cleaned[i] || '';
        }
        setOtpDigits(nextDigits);
        const nextFocus = Math.min(cleaned.length, 5);
        inputRefs[nextFocus].current?.focus();
        if (cleaned.length === 6) {
          verifyOtpCode(cleaned);
        }
      }
      return;
    }

    const nextDigits = [...otpDigits];
    nextDigits[index] = val;
    setOtpDigits(nextDigits);

    // Auto-advance to next input
    if (val && index < 5) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 6 digits are entered
    const fullCode = nextDigits.join('');
    if (fullCode.length === 6) {
      verifyOtpCode(fullCode);
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }

  // Handle Verify OTP
  async function verifyOtpCode(codeToVerify) {
    const code = codeToVerify || otpDigits.join('');
    if (code.length < 6) {
      setErr('Please enter all 6 digits of the verification code.');
      return;
    }

    setErr('');
    setInfo('');
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      login({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      if (data.user.needsUsername) {
        nav('/set-username');
      } else {
        nav('/chat');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bauhaus-auth-page">
      {/* Background Constructivist Elements */}
      <div className="bauhaus-auth-bg-circle" />
      <div className="bauhaus-auth-bg-square" />
      <div className="bauhaus-auth-bg-triangle" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bauhaus-auth-card"
      >
        {/* Top Primary Color Bar */}
        <div className="bauhaus-auth-top-bar">
          <span className="b-bar-red" />
          <span className="b-bar-blue" />
          <span className="b-bar-yellow" />
        </div>

        {/* Logo & Header */}
        <div className="bauhaus-auth-header">
          <div className="bauhaus-logo-shapes">
            <span className="b-circle" />
            <span className="b-square" />
            <span className="b-triangle" />
          </div>
          <h1 className="bauhaus-auth-title">
            JOIN DROPTALK
          </h1>
          <p className="bauhaus-auth-subtitle">
            CONSTRUCTIVIST MESSAGING // AUTHENTICATION
          </p>
        </div>

        {/* ── Method 1: Google OAuth Login ── */}
        <div className="bauhaus-auth-google-wrap">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (isRealGoogleId) {
                try {
                  handleGoogleLogin();
                } catch (e) {
                  setErr('Google sign-in initialized. If popup is blocked, please check browser settings or use Email OTP.');
                }
              } else {
                setErr('Google Client ID not detected in environment. Using Email OTP authentication below.');
              }
            }}
            className="bauhaus-btn bauhaus-btn-outline w-full justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>CONTINUE WITH GOOGLE</span>
          </button>
        </div>

        {/* Divider */}
        <div className="bauhaus-divider">
          <div className="bauhaus-divider-line" />
          <span className="bauhaus-divider-text">OR VIA EMAIL OTP</span>
          <div className="bauhaus-divider-line" />
        </div>

        {/* Status Messages */}
        {err && (
          <div className="bauhaus-alert-error">
            <ShieldCheck size={18} className="flex-shrink-0" />
            <span>{err}</span>
          </div>
        )}

        {info && (
          <div className="bauhaus-alert-success">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{info}</span>
          </div>
        )}

        {/* ── Method 2: Email OTP Flow ── */}
        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.form
              key="step-email"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSendOtp}
              className="bauhaus-auth-form"
            >
              <div className="bauhaus-form-group">
                <label className="bauhaus-label">
                  EMAIL ADDRESS
                </label>
                <div className="bauhaus-input-wrap">
                  <Mail size={18} className="bauhaus-input-icon" />
                  <input
                    type="email"
                    placeholder="ENTER YOUR WORK EMAIL..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    required
                    className="bauhaus-input has-icon"
                  />
                </div>
              </div>

              <button
                disabled={busy}
                type="submit"
                className="bauhaus-btn bauhaus-btn-red w-full justify-center lg"
              >
                {busy ? (
                  'TRANSMITTING CODE…'
                ) : (
                  <>
                    <span>SEND VERIFICATION CODE</span>
                    <ArrowRight size={18} strokeWidth={3} />
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="bauhaus-auth-form"
            >
              <div className="bauhaus-otp-notice">
                <p>
                  ENTER THE 6-DIGIT CODE TRANSMITTED TO:<br />
                  <strong>{email}</strong>
                </p>
              </div>

              {/* 6 Digit OTP Inputs */}
              <div className="bauhaus-otp-grid">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`bauhaus-otp-cell ${digit ? 'filled' : ''}`}
                  />
                ))}
              </div>

              <button
                disabled={busy}
                onClick={() => verifyOtpCode()}
                className="bauhaus-btn bauhaus-btn-blue w-full justify-center lg"
              >
                {busy ? (
                  'VERIFYING CRYPTO TOKEN…'
                ) : (
                  <>
                    <KeyRound size={18} strokeWidth={3} />
                    <span>VERIFY & ENTER</span>
                  </>
                )}
              </button>

              <div className="bauhaus-otp-actions">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setErr('');
                    setInfo('');
                  }}
                  className="bauhaus-link-btn"
                >
                  &larr; EDIT EMAIL
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || busy}
                  onClick={handleSendOtp}
                  className={`bauhaus-link-btn ${resendCooldown > 0 ? 'disabled' : ''}`}
                >
                  <RotateCcw size={13} />
                  <span>{resendCooldown > 0 ? `RESEND IN ${resendCooldown}S` : 'RESEND OTP'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
