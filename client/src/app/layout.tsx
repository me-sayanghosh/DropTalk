import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'DropTalk — Constructivist Workspace Messaging',
  description: 'A feature-based modular real-time chat application with E2EE, Gemini AI summaries, WebRTC calls, and presence tracking.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='28' cy='50' r='20' fill='%23D02020'/><rect x='48' y='30' width='22' height='40' fill='%231040C0'/><polygon points='82,70 70,30 94,30' fill='%23F0C020'/></svg>",
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
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='28' cy='50' r='20' fill='%23D02020'/><rect x='48' y='30' width='22' height='40' fill='%231040C0'/><polygon points='82,70 70,30 94,30' fill='%23F0C020'/></svg>" />
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
