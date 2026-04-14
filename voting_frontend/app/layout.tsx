import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

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
    default: 'Voting Platform',
    template: '%s | Voting Platform',
  },
  description:
    'Secure digital polling platform for participating in polls, casting votes, and receiving verifiable receipts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          'min-h-screen bg-slate-50 text-slate-900 antialiased',
          'font-sans',
        ].join(' ')}
      >
        <div className="relative flex min-h-screen flex-col overflow-x-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.08),_transparent_30%)]" />
          {children}
        </div>
      </body>
    </html>
  );
}