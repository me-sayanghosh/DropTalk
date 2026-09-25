import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'https://drop-talk.vercel.app'),
  title: {
    default: 'DropTalk — Secure Constructivist Workspace Messaging & E2EE Team Chat',
    template: '%s | DropTalk',
  },
  description: 'DropTalk is a high-performance constructivist team messaging workspace engineered with end-to-end RSA/AES encryption, instant WebSockets, and WebRTC calls.',
  applicationName: 'DropTalk',
  authors: [{ name: 'DropTalk Team', url: 'https://drop-talk.vercel.app' }],
  creator: 'DropTalk Team',
  publisher: 'DropTalk',
  category: 'Communication',
  keywords: [
    'DropTalk',
    'DropTalk chat',
    'encrypted chat app',
    'end to end encrypted messaging',
    'E2EE team chat',
    'secure workspace messaging',
    'Bauhaus design system',
    'Constructivist chat',
    'WebRTC video calls',
    'realtime WebSockets chat',
    'Slack alternative',
    'Discord alternative for teams',
    'open source encrypted messaging',
    'AES-256 chat',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'DropTalk — Secure Constructivist Workspace Messaging',
    description: 'A high-performance constructivist team messaging workspace engineered with end-to-end RSA/AES encryption, instant WebSockets, and WebRTC calls.',
    url: 'https://drop-talk.vercel.app',
    siteName: 'DropTalk',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DropTalk — Constructivist Workspace Messaging',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DropTalk — Secure Constructivist Workspace Messaging',
    description: 'High-performance constructivist team messaging with end-to-end RSA/AES encryption, instant WebSockets, and WebRTC calls.',
    images: ['/og-image.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://drop-talk.vercel.app/#website',
      url: 'https://drop-talk.vercel.app',
      name: 'DropTalk',
      description: 'Secure Constructivist Workspace Messaging & E2EE Team Chat',
      publisher: {
        '@id': 'https://drop-talk.vercel.app/#organization',
      },
      inLanguage: 'en-US',
    },
    {
      '@type': 'Organization',
      '@id': 'https://drop-talk.vercel.app/#organization',
      name: 'DropTalk',
      url: 'https://drop-talk.vercel.app',
      logo: {
        '@type': 'ImageObject',
        url: 'https://drop-talk.vercel.app/icon-512.png',
        width: 512,
        height: 512,
      },
      sameAs: ['https://github.com'],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://drop-talk.vercel.app/#application',
      name: 'DropTalk',
      applicationCategory: 'CommunicationApplication',
      operatingSystem: 'Web, Windows, macOS, Linux, iOS, Android',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description: 'DropTalk is a high-performance constructivist team messaging workspace engineered with end-to-end RSA/AES encryption, instant WebSockets, and WebRTC calls.',
      featureList: [
        'End-to-End Encryption (RSA-OAEP & AES-GCM)',
        'Instant WebSocket Real-Time Delivery',
        'Encrypted Peer-to-Peer WebRTC Audio and Video Calls',
        'Structured Threaded Discussions',
        'Offline Message Synchronization & Queueing',
        'Role-Based Channel Moderation and Access Control',
        'Constructivist Bauhaus User Interface',
      ],
      screenshot: 'https://drop-talk.vercel.app/og-image.png',
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://drop-talk.vercel.app/#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is DropTalk?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'DropTalk is a constructivist team messaging workspace built for high speed, absolute privacy, and zero cognitive clutter. It features client-side end-to-end encryption (RSA-OAEP and AES-GCM), real-time WebSockets, and WebRTC audio/video calls.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does DropTalk protect message privacy with E2EE?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "DropTalk generates cryptographic keys client-side inside the user's browser. Private room communications are encrypted using AES-GCM 256-bit keys exchanged via RSA-OAEP. Server nodes and intermediaries never have access to private keys or plaintext messages.",
          },
        },
        {
          '@type': 'Question',
          name: 'How does DropTalk compare to Slack or Discord?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Unlike Slack and Discord, which store unencrypted messages accessible to third parties and tracking algorithms, DropTalk prioritizes mathematical privacy, client-side encryption, high-contrast constructivist ergonomics, and zero ad telemetry.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is DropTalk free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, DropTalk is free for creating accounts, joining public channels, creating private rooms, and hosting peer-to-peer audio and video calls.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does DropTalk support voice and video calls?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, DropTalk has native peer-to-peer WebRTC voice and video rooms built in, allowing low-latency, encrypted audio/video meetings directly within channels.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        {/* Auto-recover from stale chunks or server restarts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function tryReload() {
                  try {
                    var key = '__droptalk_stale_chunk_reload__';
                    var last = sessionStorage.getItem(key);
                    var now = Date.now();
                    if (!last || now - Number(last) > 8000) {
                      sessionStorage.setItem(key, String(now));
                      window.location.reload();
                    }
                  } catch (e) {}
                }

                // Catch script/link tag load failures (404/MIME errors) in capture phase
                window.addEventListener('error', function(e) {
                  if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
                    var src = e.target.src || e.target.href || '';
                    if (src.indexOf('/_next/static/') !== -1) {
                      tryReload();
                    }
                  }
                }, true);

                // Catch dynamic import ChunkLoadErrors
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e.reason && (e.reason.message || String(e.reason));
                  if (reason && (reason.indexOf('ChunkLoadError') !== -1 || reason.indexOf('Loading chunk') !== -1)) {
                    tryReload();
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
