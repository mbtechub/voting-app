import Link from 'next/link';

import {
  Vote,
  ShoppingCart,
  ShieldCheck,
} from 'lucide-react';

const quickLinks = [
  {
    title: 'Explore Polls',
    description:
      'Browse active polls and vote securely.',
    href: '/vote',
    icon: Vote,
  },

  {
    title: 'Vote Cart',
    description:
      'Review selected nominees and totals.',
    href: '/cart',
    icon: ShoppingCart,
  },

  {
    title: 'Admin Access',
    description:
      'Secure dashboard for platform management.',
    href: '/admin/login',
    icon: ShieldCheck,
  },
];

export default function Home() {
  const logoUrl =
    process.env.NEXT_PUBLIC_LOGO_URL;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 text-white">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">

          {/* TOP LOGO */}
          <div className="mb-16 flex items-center justify-between">

            <Link
              href="/"
              className="flex items-center gap-3"
            >

              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur">

                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-full w-full object-contain bg-white p-2"
                  />
                ) : (
                  <span className="text-lg font-bold text-white">
                    VP
                  </span>
                )}

              </div>

              <div>

                <h1 className="text-lg font-bold tracking-wide text-white">
                  LASU AWARDS
                </h1>

              </div>

            </Link>

            <Link
              href="/admin/login"
              className="hidden rounded-2xl border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 sm:inline-flex"
            >
              Admin Login
            </Link>

          </div>

          {/* HERO CONTENT */}
          <div className="max-w-3xl">

            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Vote with confidence.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg">
              A modern voting experience built for secure participation,
              transparent receipts, and smooth access across mobile and desktop.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">

              <Link
                href="/vote"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5"
              >
                Start Voting
              </Link>
              

              <Link
                href="/admin/login"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Admin Login
              </Link>

            </div>

          </div>

        </div>

      </section>

      {/* QUICK ACCESS */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">

        <div className="mb-10">

          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Quick Access
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need
          </h2>

        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">

          {quickLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >

              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

                <item.icon className="h-6 w-6" />

              </div>

              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.description}
              </p>

              <div className="mt-6 text-sm font-semibold text-blue-700">
                Open →
              </div>

            </Link>
          ))}

        </div>

      </section>

      {/* FOOTER */}
     <footer>
  <div className="border-t border-slate-200 text-center text-xs sm:text-sm text-slate-500 py-5 px-4">

    <p>
      © {new Date().getFullYear()} Business Automation Management System.
    </p>

    <br />

    <a
      href="https://wa.me/2348085745206?text=Hello%20Mide%20Bash,%20I%20am%20contacting%20you%20from%20the%20LASU%20Awards%20Voting%20Website."
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-green-600 hover:text-green-700 hover:underline transition-colors"
    >
      Ayomide Obashola (Mide Bash)
    </a>

  </div>
</footer>

    </main>
  );
}