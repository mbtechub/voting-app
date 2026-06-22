import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

import Preloader from '@/components/ui/Preloader';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'LASU AWARDS',
    template: '%s | LASU AWARDS',
  },

  description:
    'Secure digital polling platform for participating in polls, casting votes, and receiving verifiable receipts.',

  keywords: [
    'LASU Awards',
    'LASU Voting',
    'LASU Poll',
    'Mr and Miss LASU',
    'Student Awards',
    'Online Voting',
  ],

  icons: {
    icon:
      'https://res.cloudinary.com/dsr0z4pr9/image/upload/v1780302268/nominees/k2e1tdugxdmbvmxb9zix.png',

    shortcut:
      'https://res.cloudinary.com/dsr0z4pr9/image/upload/v1780302268/nominees/k2e1tdugxdmbvmxb9zix.png',

    apple:
      'https://res.cloudinary.com/dsr0z4pr9/image/upload/v1780302268/nominees/k2e1tdugxdmbvmxb9zix.png',
  },

  openGraph: {
    title: 'LASU AWARDS',

    description:
      'Secure digital polling platform for participating in polls, casting votes, and receiving verifiable receipts.',

    type: 'website',

    siteName: 'LASU AWARDS',

    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LASU Awards Official Voting Platform',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',

    title: 'LASU AWARDS',

    description:
      'Secure digital polling platform for participating in polls, casting votes, and receiving verifiable receipts.',

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
      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          'min-h-screen bg-slate-50 text-slate-900 antialiased font-sans',
        ].join(' ')}
      >
        {/* GLOBAL PRELOADER */}
        <Preloader />

        <div className="relative flex min-h-screen flex-col overflow-x-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.08),_transparent_30%)]" />

          {children}
        </div>
      </body>
    </html>
  );
}