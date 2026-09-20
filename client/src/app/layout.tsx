import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  display: 'swap',
});

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
    <html lang="en" className={outfit.variable}>
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='28' cy='50' r='20' fill='%23D02020'/><rect x='48' y='30' width='22' height='40' fill='%231040C0'/><polygon points='82,70 70,30 94,30' fill='%23F0C020'/></svg>" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
