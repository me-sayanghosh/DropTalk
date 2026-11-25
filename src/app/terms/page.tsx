'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useNavigation } from '../../shared/context/NavigationContext';

export default function TermsOfServicePage() {
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
            <span>DropTalk Terms</span>
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/chat"
            className="px-4 py-2 bg-[#00a884] text-[#111b21] rounded-full font-semibold hover:bg-[#02906f] transition-colors"
          >
            Open DropTalk
          </Link>
          <Link href="/privacy" className="text-[#8696a0] hover:text-[#e9edef] transition-colors">
            Privacy Policy
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-6 py-12 leading-relaxed">
        {/* Hero Section */}
        <div className="mb-12 border-b border-[#222d34] pb-8">
          <div className="inline-block px-3 py-1 bg-[#182229] border border-[#00a884]/40 text-[#00a884] rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
            User Agreement & Service Terms
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-[#e9edef] tracking-tight mb-4">
            DropTalk Terms of Service
          </h1>
          <p className="text-lg text-[#8696a0]">
            Last updated: November 24, 2026 • Please read these terms carefully before accessing DropTalk Web or Mobile.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-10 text-[#d1d7db]">
          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">1.</span> Acceptance of Terms
            </h2>
            <p className="text-[#8696a0]">
              By registering an account, accessing, or using DropTalk (including our Web applications, Mobile applications, 
              APIs, and WebSocket gateways), you agree to be bound by these Terms of Service. If you do not agree to these terms, 
              you must immediately cease using the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">2.</span> Our Services & Encryption Architecture
            </h2>
            <p className="text-[#8696a0] mb-3">
              DropTalk provides high-performance real-time messaging, audio/video calling, and collaboration tools. 
              Certain channels and direct messages utilize client-side End-to-End Encryption (E2EE). 
            </p>
            <p className="text-[#8696a0]">
              Because private keys are generated and held exclusively on client devices (e.g. within browser Web Crypto IndexedDB storage), 
              you acknowledge that DropTalk operators cannot decrypt your messages, recover lost cryptographic private keys, 
              or restore encrypted content if all your trusted devices are wiped or de-authenticated.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">3.</span> Acceptable Use Policy
            </h2>
            <p className="text-[#8696a0] mb-3">
              You agree not to misuse DropTalk services or help anyone else do so. Prohibited behaviors include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#8696a0] pl-2">
              <li>Sending unsolicited automated communications (bulk spam, phishing, scams).</li>
              <li>Impersonating another person, team member, or workspace administrator.</li>
              <li>Distributing malicious code, ransomware, malware, or exploiting WebSocket/API vulnerabilities.</li>
              <li>Harassing, threatening, or stalking other users, or violating a user’s block settings.</li>
              <li>Attempting to bypass access controls, role hierarchies (owner/moderator/member), or rate limiters.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">4.</span> Account Security & Responsibilities
            </h2>
            <p className="text-[#8696a0]">
              You are responsible for maintaining the confidentiality of your authentication tokens and email account 
              used for OTP login. You are also responsible for all activity that occurs under your account. Notify DropTalk 
              immediately if you suspect any unauthorized access to your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">5.</span> Termination & Account Erasure
            </h2>
            <p className="text-[#8696a0]">
              You may terminate your agreement with DropTalk at any time by deleting your account via Settings &gt; Privacy &gt; Delete Account. 
              We reserve the right to suspend or terminate accounts that repeatedly violate our Acceptable Use Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">6.</span> Disclaimers & Limitation of Liability
            </h2>
            <p className="text-[#8696a0]">
              DropTalk is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. 
              In no event shall DropTalk Inc. or its contributors be liable for indirect, incidental, special, consequential, 
              or punitive damages resulting from your use of or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#e9edef] mb-3 flex items-center gap-2">
              <span className="text-[#00a884]">7.</span> Contact Information
            </h2>
            <p className="text-[#8696a0]">
              For legal inquiries or questions regarding these terms, please contact{' '}
              <a href="mailto:legal@droptalk.app" className="text-[#00a884] underline">
                legal@droptalk.app
              </a>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[#222d34] flex flex-col sm:flex-row items-center justify-between text-xs text-[#8696a0] gap-4">
          <p>© 2026 DropTalk Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[#00a884] transition-colors">Privacy Policy</Link>
            <Link href="/settings/privacy" className="hover:text-[#00a884] transition-colors">Privacy Settings</Link>
            <Link href="/chat" className="hover:text-[#00a884] transition-colors">Messenger</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
