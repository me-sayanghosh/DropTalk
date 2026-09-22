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
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
