import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'https://drop-talk.vercel.app'),
  title: {
    default: 'DropTalk — Constructivist Workspace Messaging',
    template: '%s | DropTalk',
  },
  description: 'A feature-based modular real-time chat application with E2EE, Gemini AI summaries, WebRTC calls, and presence tracking.',
  applicationName: 'DropTalk',
  authors: [{ name: 'DropTalk Team' }],
  keywords: ['DropTalk', 'chat', 'messaging', 'Bauhaus', 'Constructivist', 'E2EE', 'encrypted chat', 'realtime', 'WebRTC'],
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
    title: 'DropTalk — Constructivist Workspace Messaging',
    description: 'A feature-based modular real-time chat application with E2EE, Gemini AI summaries, WebRTC calls, and presence tracking.',
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
    title: 'DropTalk — Constructivist Workspace Messaging',
    description: 'A feature-based modular real-time chat application with E2EE, Gemini AI summaries, WebRTC calls, and presence tracking.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
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
