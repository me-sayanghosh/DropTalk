'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  Lock,
  MessageSquare,
  Radio,
  GitBranch,
  SmilePlus,
  Shield,
  Eye,
  RefreshCw,
  KeyRound,
  ArrowRight,
  Check,
  Plus,
  Minus,
} from 'lucide-react';
import SlotReelText from '../components/SlotReelText';
import {
  E2EEIllustration,
  RealTimeIllustration,
  AIAssistantIllustration,
  ThreadRepliesIllustration,
  ReactionsIllustration,
  ModerationIllustration,
  PresenceIllustration,
  OfflineSyncIllustration,
  AccessControlIllustration,
  SecurityShieldIllustration,
} from '../components/Illustrations';

const fadeUp: any = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut', delay: i * 0.08 },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const FEATURES = [
  { icon: Lock, illustration: E2EEIllustration, shape: 'circle', color: '#D02020', title: 'End-to-End Encryption', desc: 'RSA-OAEP and AES-GCM keep your private room messages sealed from the server.' },
  { icon: MessageSquare, illustration: RealTimeIllustration, shape: 'square', color: '#1040C0', title: 'Real-Time Messaging', desc: 'Messages delivered instantly over WebSockets with automatic offline queue and backfill.' },
  { icon: Radio, illustration: AIAssistantIllustration, shape: 'triangle', color: '#F0C020', title: 'Audio & Video Calls', desc: 'Peer-to-peer WebRTC voice and video calls with encrypted low-latency streams.' },
  { icon: GitBranch, illustration: ThreadRepliesIllustration, shape: 'circle', color: '#1040C0', title: 'Thread Replies', desc: 'Keep conversations organized with side-panel threaded discussions on any message.' },
  { icon: SmilePlus, illustration: ReactionsIllustration, shape: 'square', color: '#F0C020', title: 'Message Reactions', desc: 'React with emoji to any message. Toggle reactions with a single click.' },
  { icon: Shield, illustration: ModerationIllustration, shape: 'triangle', color: '#D02020', title: 'Role-Based Moderation', desc: 'Owner and moderator roles with kick, ban, mute, and promote controls.' },
  { icon: Eye, illustration: PresenceIllustration, shape: 'circle', color: '#F0C020', title: 'Presence & Typing', desc: 'See who is online, where they are, and when they are typing in real time.' },
  { icon: RefreshCw, illustration: OfflineSyncIllustration, shape: 'square', color: '#D02020', title: 'Offline Synchronization', desc: 'Messages queued offline are sent automatically on reconnect with instant backfill.' },
  { icon: KeyRound, illustration: AccessControlIllustration, shape: 'triangle', color: '#1040C0', title: 'Access Control', desc: 'Private rooms with join requests, approval workflows, and banned-user enforcement.' },
];

const STEPS = [
  { num: '01', title: 'CREATE ACCOUNT', desc: 'Sign up with email or Google direct. Pick your handle.' },
  { num: '02', title: 'JOIN OR LAUNCH ROOMS', desc: 'Browse public spaces, request private access, or start your own channel.' },
  { num: '03', title: 'COMMUNICATE IN REAL TIME', desc: 'Instant WebSocket delivery with automatic AES-GCM 256-bit cryptography.' },
  { num: '04', title: 'STAY CONNECTED', desc: 'Catch up on threaded discussions, offline queues, and encrypted voice calls.' },
];

const STATS = [
  { value: '0.0ms', label: 'LATENCY OVERHEAD', sub: 'Instant socket broadcasts' },
  { value: '256-BIT', label: 'AES-GCM CRYPTO', sub: 'Client-side encrypted keys' },
  { value: '100%', label: 'DIRECT CONTROL', sub: 'Zero third-party tracking' },
  { value: '24/7', label: 'PERSISTENCE', sub: 'Heartbeat offline sync' },
];

const MOCK_MESSAGES = [
  { id: 1, sender: 'ALICE', text: 'Constructivist release deployed to production.', mine: false, color: '#D02020' },
  { id: 2, sender: 'BOB', text: 'Encryption handshake completed in 14ms.', mine: false, color: '#1040C0' },
  { id: 3, sender: 'YOU', text: 'Form follows function. The UI is exceptionally fast.', mine: true, color: '#F0C020' },
  { id: 4, sender: 'ALICE', text: 'Agreed. Pure geometry and zero clutter.', mine: false, color: '#D02020', reaction: { emoji: '📐', count: 4 } },
];

const SECURITY_ITEMS = [
  'JWT access tokens with refresh token rotation and reuse detection',
  'Bcrypt password hashing with strict salt rounds',
  'RSA-OAEP key exchange + AES-GCM encryption for private rooms',
  'Banned-user enforcement at the server and socket level',
  'Per-socket heartbeat presence with automatic stale-session cleanup',
];

const FAQS = [
  {
    q: 'What makes DropTalk different from Slack or Discord?',
    a: 'Unlike centralized corporate platforms that log conversations for advertising, AI scraping, and telemetry, DropTalk is engineered with client-side cryptographic keys (RSA-OAEP + AES-GCM 256-bit). Form follows function: zero cognitive clutter, brutalist speed, and verifiable mathematical privacy.',
  },
  {
    q: 'How does End-to-End Encryption (E2EE) work in DropTalk?',
    a: 'Cryptographic keys are generated directly in your web browser or client sandbox using the Web Crypto API. In private channels, messages are encrypted before touching the network. Even DropTalk servers cannot read or decrypt your private communications.',
  },
  {
    q: 'Can I make audio and video calls on DropTalk?',
    a: 'Yes. DropTalk features native peer-to-peer WebRTC voice and video channels. Media streams are transmitted directly between peers with encrypted low latency and zero middleman recording.',
  },
  {
    q: 'Is DropTalk free to use for teams and individuals?',
    a: 'Yes, DropTalk is free for creating accounts, launching public channels, establishing private encrypted rooms, and making real-time calls with zero subscription barriers.',
  },
  {
    q: 'Does DropTalk store offline messages?',
    a: 'DropTalk includes an offline synchronization engine. If your connection drops, outgoing messages queue locally and automatically reconcile upon reconnecting with zero lost packets.',
  },
];

function FeatureCard({ feature, index }: { feature: any; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const Icon = feature.icon;
  const Illustration = feature.illustration;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp}
      custom={index % 3}
      className="bauhaus-card group"
    >
      {/* Bauhaus Corner Shape Badge */}
      <div className="bauhaus-corner-badge">
        {feature.shape === 'circle' && <div className="b-shape-circle" style={{ backgroundColor: feature.color }} />}
        {feature.shape === 'square' && <div className="b-shape-square" style={{ backgroundColor: feature.color }} />}
        {feature.shape === 'triangle' && <div className="b-shape-triangle" style={{ borderBottomColor: feature.color }} />}
      </div>

      <div className="bauhaus-card-art">
        <Illustration />
      </div>

      <div className="bauhaus-card-meta">
        <div className="bauhaus-icon-box" style={{ borderColor: '#121212' }}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <h3 className="bauhaus-card-title">{feature.title}</h3>
      </div>

      <p className="bauhaus-card-desc">{feature.desc}</p>
    </motion.div>
  );
}

function MockChatDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bauhaus-mock-chat"
    >
      {/* Bauhaus Window Header */}
      <div className="bauhaus-mock-header">
        <div className="bauhaus-mock-controls">
          <span className="b-dot b-dot-red" />
          <span className="b-dot b-dot-blue" />
          <span className="b-dot b-dot-yellow" />
        </div>
        <div className="bauhaus-mock-title">DROPTALK // LIVE_SESSION</div>
        <div className="bauhaus-mock-badge">E2EE ACTIVE</div>
      </div>

      {/* Room subheader */}
      <div className="bauhaus-mock-channel-bar">
        <div className="bauhaus-channel-tag">
          <span className="b-tag-sym">#</span>
          <span className="b-tag-name">GENERAL_WORKSPACE</span>
        </div>
        <div className="bauhaus-presence-indicator">
          <span className="b-presence-dot" />
          <span>4 ONLINE</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="bauhaus-mock-feed">
        {MOCK_MESSAGES.map((msg, i) => (
          <motion.div
            key={msg.id}
            className={`bauhaus-msg-row ${msg.mine ? 'mine' : 'theirs'}`}
            initial={{ opacity: 0, x: msg.mine ? 20 : -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.35, delay: 0.2 + i * 0.15 }}
          >
            {!msg.mine && (
              <div className="bauhaus-msg-sender-tag" style={{ borderLeftColor: msg.color }}>
                {msg.sender}
              </div>
            )}
            <div className={`bauhaus-msg-box ${msg.mine ? 'b-box-mine' : 'b-box-theirs'}`}>
              <div className="bauhaus-msg-text">{msg.text}</div>
              {msg.reaction && (
                <div className="bauhaus-reaction-chip">
                  <span>{msg.reaction.emoji}</span>
                  <span className="count">{msg.reaction.count}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input row */}
      <div className="bauhaus-mock-input-row">
        <div className="bauhaus-mock-input-field">
          <span>Type constructivist message...</span>
        </div>
        <button className="bauhaus-mock-send-btn" aria-label="Send">
          <ArrowRight size={18} strokeWidth={3} />
        </button>
      </div>
    </motion.div>
  );
}

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="bauhaus-section border-t-4">
      <div className="bauhaus-section-header">
        <div className="bauhaus-section-tag">
          <span>06 // ARCHITECTURAL INTEL</span>
        </div>
        <h2 className="bauhaus-section-title">FREQUENTLY ASKED QUESTIONS</h2>
        <p className="bauhaus-section-subtitle">
          Everything you need to know about DropTalk encryption, architecture, and team workflows.
        </p>
      </div>

      <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {FAQS.map((faq, idx) => {
          const isOpen = openIdx === idx;
          const accentColor = idx % 3 === 0 ? '#D02020' : idx % 3 === 1 ? '#1040C0' : '#F0C020';
          return (
            <div
              key={idx}
              style={{
                border: '3px solid #121212',
                backgroundColor: '#FFFFFF',
                boxShadow: isOpen ? `6px 6px 0px ${accentColor}` : '4px 4px 0px #121212',
                transition: 'box-shadow 0.15s ease',
              }}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                style={{
                  width: '100%',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                aria-expanded={isOpen}
              >
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    letterSpacing: '0.01em',
                    color: '#121212',
                    paddingRight: '1rem',
                  }}
                >
                  {faq.q}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isOpen ? accentColor : '#F0F0F0',
                    color: isOpen && accentColor === '#F0C020' ? '#121212' : isOpen ? '#FFFFFF' : '#121212',
                    border: '2px solid #121212',
                    fontWeight: 900,
                  }}
                >
                  {isOpen ? <Minus size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                </span>
              </button>
              {isOpen && (
                <div
                  style={{
                    padding: '0 1.5rem 1.5rem 1.5rem',
                    borderTop: '2px dashed #E0E0E0',
                    paddingTop: '1rem',
                    fontSize: '0.95rem',
                    lineHeight: '1.65',
                    color: '#444444',
                    fontWeight: 500,
                  }}
                >
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="bauhaus-app">
      {/* ── Top Architectural Navigation ── */}
      <header className="bauhaus-nav">
        <div className="bauhaus-nav-container">
          <Link href="/" className="bauhaus-logo">
            {/* Geometric Bauhaus Logo Mark: Circle, Square, Triangle */}
            <div className="bauhaus-logo-shapes">
              <span className="b-circle" />
              <span className="b-square" />
              <span className="b-triangle" />
            </div>
            <span className="bauhaus-logo-text">DROPTALK</span>
          </Link>

          <div className="bauhaus-nav-actions">
            <Link href="/join" className="bauhaus-btn bauhaus-btn-outline sm">
              LOG IN
            </Link>
            <Link href="/join" className="bauhaus-btn bauhaus-btn-red sm">
              JOIN NOW
              <ArrowRight size={16} strokeWidth={3} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── 1. Hero Section (Bauhaus Split Composition) ── */}
      <section className="bauhaus-hero">
        <div className="bauhaus-hero-grid">
          {/* Left Column: Typography & Intent */}
          <div className="bauhaus-hero-left">
            <div className="bauhaus-stamp">
              <span className="bauhaus-stamp-num">01 //</span>
              <span className="bauhaus-stamp-text">CONSTRUCTIVIST MESSAGING</span>
            </div>

            <h1 className="bauhaus-hero-title">
              FORM FOLLOWS<br />
              <span className="bauhaus-hero-highlight">
                <SlotReelText
                  texts={['COMMUNICATION.', 'SECURITY.', 'PRECISION.', 'STRUCTURE.']}
                  rotationInterval={3000}
                  staggerDuration={0.035}
                  pauseOnHover={true}
                />
              </span>
            </h1>

            <p className="bauhaus-hero-lead">
              A high-velocity messaging workspace engineered with end-to-end RSA/AES cryptography,
              instant WebSockets, structured threads, and modular constructivist channels.
            </p>

            <div className="bauhaus-hero-cta-group">
              <Link href="/join" className="bauhaus-btn bauhaus-btn-red lg">
                START CHATTING
                <ArrowRight size={20} strokeWidth={3} />
              </Link>
              <a href="#features" className="bauhaus-btn bauhaus-btn-outline lg">
                VIEW BLUEPRINT
              </a>
            </div>

            {/* Geometric specs strip */}
            <div className="bauhaus-specs-bar">
              <div className="bauhaus-spec-item">
                <span className="spec-dot" style={{ backgroundColor: '#D02020' }} />
                <span>ENCRYPTION</span>
              </div>
              <div className="bauhaus-spec-item">
                <span className="spec-dot" style={{ backgroundColor: '#1040C0' }} />
                <span>SYNC</span>
              </div>
              <div className="bauhaus-spec-item">
                <span className="spec-dot" style={{ backgroundColor: '#F0C020' }} />
                <span>CALLS</span>
              </div>
            </div>
          </div>

          {/* Right Column: Bauhaus Constructivist Art Panel */}
          <div className="bauhaus-hero-right">
            <div className="bauhaus-art-poster">
              {/* Overlapping Primary Shapes */}
              <div className="bauhaus-art-circle" />
              <div className="bauhaus-art-square" />
              <div className="bauhaus-art-triangle" />
              <div className="bauhaus-art-line-1" />
              <div className="bauhaus-art-line-2" />

              {/* Floating Architectural Cards */}
              <div className="bauhaus-art-badge-1">
                <span className="b-num">256</span>
                <span className="b-lbl">BIT AES-GCM ENCRYPTION</span>
              </div>

              <div className="bauhaus-art-badge-2">
                <div className="b-pulse" />
                <span className="b-lbl">REAL-TIME SOCKETS ACTIVE</span>
              </div>

              <div className="bauhaus-art-center-card">
                <div className="b-center-header">
                  <span className="b-tag">BAUHAUS_OS</span>
                  <span className="b-code">v2.4.0</span>
                </div>
                <div className="b-center-body">
                  <div className="b-line b-line-red" />
                  <div className="b-line b-line-blue" />
                  <div className="b-line b-line-yellow" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Full-Width Yellow Stats Band ── */}
      <section className="bauhaus-stats-band">
        <div className="bauhaus-stats-grid">
          {STATS.map((st, i) => (
            <div key={i} className="bauhaus-stat-cell">
              <div className="bauhaus-stat-val">{st.value}</div>
              <div className="bauhaus-stat-label">{st.label}</div>
              <div className="bauhaus-stat-sub">{st.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Features Blueprint (3x3 Bauhaus Grid) ── */}
      <section id="features" className="bauhaus-section">
        <div className="bauhaus-section-header">
          <div className="bauhaus-section-tag">
            <span>02 // ARCHITECTURE</span>
          </div>
          <h2 className="bauhaus-section-title">ENGINEERED FOR SUPREME CLARITY</h2>
          <p className="bauhaus-section-subtitle">
            Every feature is constructed for speed, mathematical privacy, and zero cognitive overhead.
          </p>
        </div>

        <div className="bauhaus-features-grid">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </section>

      {/* ── 4. How It Works (Rotated Steps) ── */}
      <section className="bauhaus-section bauhaus-bg-canvas border-t-4">
        <div className="bauhaus-section-header">
          <div className="bauhaus-section-tag">
            <span>03 // EXECUTION</span>
          </div>
          <h2 className="bauhaus-section-title">THE WORKFLOW IN FOUR MOVEMENTS</h2>
          <p className="bauhaus-section-subtitle">
            From initial authentication to active encrypted channels in seconds.
          </p>
        </div>

        <div className="bauhaus-steps-grid">
          {STEPS.map((s, i) => (
            <div key={s.num} className="bauhaus-step-card">
              {/* 45° Rotated Diamond Number */}
              <div className="bauhaus-diamond-wrap">
                <div className="bauhaus-diamond" style={{ backgroundColor: i % 2 === 0 ? '#D02020' : '#1040C0' }}>
                  <span className="bauhaus-diamond-text">{s.num}</span>
                </div>
              </div>
              <div className="bauhaus-step-body">
                <h3 className="bauhaus-step-title">{s.title}</h3>
                <p className="bauhaus-step-desc">{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && <div className="bauhaus-step-connector" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Security & Trust (Primary Red Color Block) ── */}
      <section className="bauhaus-security-band">
        <div className="bauhaus-security-grid">
          <div className="bauhaus-security-content">
            <div className="bauhaus-stamp bauhaus-stamp-dark">
              <span className="bauhaus-stamp-num">04 //</span>
              <span className="bauhaus-stamp-text">MATHEMATICAL SECURITY</span>
            </div>

            <h2 className="bauhaus-security-title">
              UNCOMPROMISED PRIVACY BY DEFAULT
            </h2>

            <p className="bauhaus-security-desc">
              We eliminate trusted third parties from your private communications.
              Keys are generated client-side, stored in browser isolation, and never transmitted unencrypted.
            </p>

            <ul className="bauhaus-security-list">
              {SECURITY_ITEMS.map((item, idx) => (
                <li key={idx} className="bauhaus-security-item">
                  <div className="bauhaus-check-badge">
                    <Check size={16} strokeWidth={3.5} />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bauhaus-security-visual">
            <div className="bauhaus-shield-frame">
              <SecurityShieldIllustration />
              <div className="bauhaus-shield-banner">
                <span>VERIFIED CRYPTO SYSTEM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Live Interactive Preview (Bauhaus Blue Accent) ── */}
      <section className="bauhaus-section">
        <div className="bauhaus-section-header">
          <div className="bauhaus-section-tag">
            <span>05 // WORKSPACE PREVIEW</span>
          </div>
          <h2 className="bauhaus-section-title">THE CONSTRUCTIVIST CHAT EXPERIENCE</h2>
          <p className="bauhaus-section-subtitle">
            Tactile controls, deliberate contrast, and lightning-fast feedback.
          </p>
        </div>

        <MockChatDemo />
      </section>

      {/* ── 7. Architectural Intel (FAQ Section) ── */}
      <FaqSection />

      {/* ── 8. Final Call to Action (Bauhaus Yellow Block) ── */}
      <section className="bauhaus-cta-band">
        {/* Decorative corner geometric shapes */}
        <div className="bauhaus-cta-decor-circle" />
        <div className="bauhaus-cta-decor-square" />
        <div className="bauhaus-cta-decor-triangle" />

        <div className="bauhaus-cta-content">
          <div className="bauhaus-stamp bauhaus-stamp-dark">
            <span className="bauhaus-stamp-num">07 //</span>
            <span className="bauhaus-stamp-text">GET STARTED</span>
          </div>

          <h2 className="bauhaus-cta-title">
            READY TO COMMUNICATE WITH POWER AND CLARITY?
          </h2>

          <p className="bauhaus-cta-sub">
            Free forever for open channels. Instant setup with zero credit card requirements.
          </p>

          <div className="bauhaus-cta-actions">
            <Link href="/join" className="bauhaus-btn bauhaus-btn-red xl">
              CREATE FREE ACCOUNT
              <ArrowRight size={22} strokeWidth={3} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8. Stark Black Architectural Footer ── */}
      <footer className="bauhaus-footer">
        <div className="bauhaus-footer-grid">
          <div className="bauhaus-footer-brand">
            <div className="bauhaus-logo-shapes">
              <span className="b-circle" />
              <span className="b-square" />
              <span className="b-triangle" />
            </div>
            <span className="bauhaus-footer-title">DROPTALK</span>
            <p className="bauhaus-footer-tagline">
              Form follows function. Real-time constructivist messaging for teams that build.
            </p>
          </div>

          <div className="bauhaus-footer-links">
            <div className="bauhaus-footer-col">
              <h4>PLATFORM</h4>
              <Link href="/join">Channels</Link>
              <Link href="/join">Direct Messages</Link>
              <Link href="/join">Audio / Video Calls</Link>
              <a href="#faq">FAQ</a>
              <Link href="/join">Settings &amp; Security</Link>
            </div>
            <div className="bauhaus-footer-col">
              <h4>SECURITY</h4>
              <a href="#features">E2EE Protocol</a>
              <a href="#features">RSA-OAEP Exchange</a>
              <a href="#features">AES-GCM Encryption</a>
              <a href="#features">Data Privacy</a>
            </div>
            <div className="bauhaus-footer-col">
              <h4>SYSTEM</h4>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">Documentation</a>
              <a href="#features">System Status</a>
            </div>
          </div>
        </div>

        <div className="bauhaus-footer-bottom">
          <div className="bauhaus-footer-copy">
            &copy; {new Date().getFullYear()} DROPTALK. CONSTRUCTIVIST MESSAGING SYSTEM.
          </div>
          <div className="bauhaus-footer-palette-demo">
            <span className="p-dot" style={{ backgroundColor: '#D02020' }} title="Bauhaus Red" />
            <span className="p-dot" style={{ backgroundColor: '#1040C0' }} title="Bauhaus Blue" />
            <span className="p-dot" style={{ backgroundColor: '#F0C020' }} title="Bauhaus Yellow" />
            <span className="p-dot" style={{ backgroundColor: '#FFFFFF' }} title="Bauhaus White" />
            <span className="p-dot" style={{ backgroundColor: '#121212' }} title="Stark Black" />
          </div>
        </div>
      </footer>
    </div>
  );
}
