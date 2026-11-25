'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, ArrowLeft } from 'lucide-react';
import { useNavigation } from '../../shared/context/NavigationContext';

export default function PrivacyPolicyPage() {
  const { navigateBack } = useNavigation();
  return (
    <div className="min-h-screen bg-[#0b141a] text-[#e9edef] font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#202c33] border-b border-[#313d45] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateBack('/')}
            className="p-2 rounded-lg text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition-colors"
            title="Go Back"
            aria-label="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#00a884] hover:opacity-90">
            <span className="w-8 h-8 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center font-extrabold text-lg">
              D
            </span>
            <span>DropTalk Privacy</span>
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/chat"
            className="px-4 py-2 bg-[#00a884] text-[#111b21] rounded-full font-semibold hover:bg-[#02906f] transition-colors"
          >
            Open DropTalk
          </Link>
          <Link href="/terms" className="text-[#8696a0] hover:text-[#e9edef] transition-colors">
            Terms of Service
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-6 py-12 leading-relaxed">
        {/* Hero Section */}
        <div className="mb-12 border-b border-[#222d34] pb-8">
          <div className="inline-block px-3 py-1 bg-[#182229] border border-[#00a884]/40 text-[#00a884] rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
            End-to-End Encrypted Privacy Architecture
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-[#e9edef] tracking-tight mb-4">
            DropTalk Privacy Policy
          </h1>
          <p className="text-lg text-[#8696a0]">
            Last updated: November 24, 2026 • Effective immediately across DropTalk Web, Desktop, and Mobile clients.
          </p>
        </div>

        {/* Privacy Guarantee Callout */}
        <div className="bg-[#182229] border border-[#00a884]/30 rounded-2xl p-6 mb-12 flex flex-col sm:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#00a884]/20 flex items-center justify-center text-[#00a884] shrink-0">
            <Lock size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#e9edef] mb-1">
              Zero-Knowledge Privacy: We cannot read your personal messages or listen to your calls
            </h3>
            <p className="text-sm text-[#8696a0]">
              DropTalk is engineered with client-side End-to-End Encryption (E2EE) using native Web Crypto 
              RSA-OAEP 2048-bit key exchange and AES-GCM 256-bit symmetric encryption. Your messages and call streams are 
              encrypted on your device before they ever touch the network and can only be decrypted by the intended recipient.
            </p>
          </div>
        </div>

        {/* Policy Sections */}
        <div className="space-y-10 text-[#d1d7db]">
          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">1.</span> Principles & Commitments
            </h2>
            <p className="mb-3 text-[#8696a0]">
              DropTalk was built on the premise that private conversations belong exclusively to the people having them. 
              We do not sell user data, we do not monetize your private conversations with advertisements, and our server infrastructure 
              operates under a strict zero-knowledge trust model for encrypted direct messages and private rooms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">2.</span> Information We Collect & How It Is Handled
            </h2>
            <div className="grid gap-4 mt-4">
              <div className="bg-[#111b21] p-5 rounded-xl border border-[#222d34]">
                <h3 className="font-semibold text-[#00a884] mb-1">Account & Identity Information</h3>
                <p className="text-sm text-[#8696a0]">
                  To create a DropTalk account, you provide an email address (for passwordless OTP verification) or authenticate via 
                  Google OAuth. You also choose a unique username handle and display name. Your email is encrypted and never exposed 
                  to other members unless you explicitly share it.
                </p>
              </div>

              <div className="bg-[#111b21] p-5 rounded-xl border border-[#222d34]">
                <h3 className="font-semibold text-[#00a884] mb-1">Messages & Media Content</h3>
                <p className="text-sm text-[#8696a0]">
                  Messages in private channels and 1-on-1 direct messages are encrypted on your local device before transmission. 
                  DropTalk servers store encrypted ciphertext solely to facilitate delivery and multi-device synchronization. 
                  Once delivered, messages in ephemeral or disappearing chats are automatically purged based on your configured timer.
                </p>
              </div>

              <div className="bg-[#111b21] p-5 rounded-xl border border-[#222d34]">
                <h3 className="font-semibold text-[#00a884] mb-1">Voice & Video Calling (WebRTC)</h3>
                <p className="text-sm text-[#8696a0]">
                  Voice and video calls utilize peer-to-peer WebRTC connections with DTLS-SRTP encryption. Audio and video streams 
                  flow directly between participants without passing through or being recorded on DropTalk servers. Only signaling metadata 
                  (call duration, timestamp, missed/completed status) is recorded in your personal call log.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">3.</span> Privacy Controls
            </h2>
            <p className="mb-4 text-[#8696a0]">
              You have granular, direct control over your visibility and security settings in DropTalk:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#8696a0] pl-2">
              <li>
                <strong className="text-[#e9edef]">Read Receipts (Blue Ticks):</strong> You can turn off read receipts at any time. 
                When disabled, you will not send or receive read confirmations for 1-to-1 direct messages.
              </li>
              <li>
                <strong className="text-[#e9edef]">Last Seen & Online Status:</strong> Choose whether teammates can see when you 
                were last active in the workspace or if you are currently online.
              </li>
              <li>
                <strong className="text-[#e9edef]">Profile Photo & Bio Visibility:</strong> Restrict profile picture display to 
                everyone or hide it for zero-footprint anonymity.
              </li>
              <li>
                <strong className="text-[#e9edef]">Disappearing Messages:</strong> Configure default disappearing message timers 
                (24 hours, 7 days, 90 days, or off) for new chats to keep your workspace self-cleaning.
              </li>
              <li>
                <strong className="text-[#e9edef]">Blocked Contacts:</strong> Block any user with one click. Blocked users cannot 
                send you direct messages, view your online status, or initiate voice/video calls.
              </li>
              <li>
                <strong className="text-[#e9edef]">Cryptographic Safety Verification:</strong> Verify the RSA safety numbers and 
                device fingerprints of conversation partners to guard against man-in-the-middle attacks.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">4.</span> Data Retention & Automatic Expiry
            </h2>
            <p className="text-[#8696a0]">
              DropTalk maintains minimum data retention standards. Ephemeral rooms and messages are automatically evicted from 
              MongoDB using native TTL indices upon expiration. Redis presence keys are ephemeral and automatically expire if a client 
              disconnects without a clean heartbeat.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">5.</span> GDPR, CCPA & Data Subject Rights
            </h2>
            <p className="mb-3 text-[#8696a0]">
              In compliance with global data protection laws (including the EU GDPR and California CCPA), DropTalk gives you full 
              sovereignty over your personal data:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-3">
              <div className="bg-[#111b21] p-4 rounded-xl border border-[#222d34]">
                <h4 className="font-bold text-[#e9edef] mb-1">Right to Access / Data Portability</h4>
                <p className="text-xs text-[#8696a0]">
                  Download a machine-readable JSON archive of your profile, room memberships, and activity metrics instantly 
                  from your Settings page under Privacy.
                </p>
              </div>
              <div className="bg-[#111b21] p-4 rounded-xl border border-[#222d34]">
                <h4 className="font-bold text-[#e9edef] mb-1">Right to Erasure (Delete Account)</h4>
                <p className="text-xs text-[#8696a0]">
                  Permanently delete your DropTalk account at any time. All cryptographic keys, authentication tokens, memberships, 
                  and user records are immediately purged.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">6.</span> Contacting Privacy Support
            </h2>
            <p className="text-[#8696a0]">
              If you have any questions or security disclosures regarding DropTalk&apos;s privacy practices or encryption protocols, 
              please reach out to our team at{' '}
              <a href="mailto:privacy@droptalk.app" className="text-[#00a884] underline">
                privacy@droptalk.app
              </a>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[#222d34] flex flex-col sm:flex-row items-center justify-between text-xs text-[#8696a0] gap-4">
          <p>© 2026 DropTalk Inc. All rights reserved. Zero-knowledge communication architecture.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-[#00a884] transition-colors">Terms of Service</Link>
            <Link href="/settings/privacy" className="hover:text-[#00a884] transition-colors">Privacy Settings</Link>
            <Link href="/chat" className="hover:text-[#00a884] transition-colors">Messenger</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
