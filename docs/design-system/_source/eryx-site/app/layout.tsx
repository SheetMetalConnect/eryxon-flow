import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ERYX - System Integration for Metal Manufacturing',
  description: 'ERYX brings enterprise-grade system integration to small and mid-sized metal manufacturers through managed UMH implementation.',
  keywords: 'metal manufacturing, system integration, UMH, unified namespace, manufacturing automation',
  openGraph: {
    title: 'ERYX - System Integration for Metal Manufacturing',
    description: 'Enterprise-grade system integration for metal manufacturers',
    images: ['/images/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ERYX - System Integration for Metal Manufacturing',
    description: 'Enterprise-grade system integration for metal manufacturers',
    images: ['/images/twitter-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <div className="min-h-screen bg-white">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}