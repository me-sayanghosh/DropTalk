import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join DropTalk — Create Account & Enter Encrypted Workspace',
  description: 'Create an account or sign in to DropTalk. Access end-to-end encrypted messaging channels, direct messages, and voice/video rooms with zero tracking.',
  alternates: {
    canonical: '/join',
  },
  openGraph: {
    title: 'Join DropTalk — Encrypted Team Chat Workspace',
    description: 'Sign up or log in to DropTalk to join secure constructivist channels and encrypted rooms.',
    url: 'https://drop-talk.vercel.app/join',
  },
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
