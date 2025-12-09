import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bulk Email Sender',
  description: 'Professional bulk email sender with templates, personalization, scheduling, and detailed analytics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
