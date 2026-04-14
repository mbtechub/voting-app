import Link from "next/link";

const quickLinks = [
  {
    title: "Active Polls",
    description: "Browse available polls and begin voting in just a few steps.",
    href: "/elections",
  },
  {
    title: "Verify Receipt",
    description: "Confirm the authenticity of your vote receipt anytime.",
    href: "/receipt",
  },
  {
    title: "View Cart",
    description: "Review selected nominees, vote quantities, and totals.",
    href: "/cart",
  },
  {
    title: "Admin Access",
    description: "Manage polls, payments, receipts, and platform activity.",
    href: "/admin/login",
  },
];

const steps = [
  {
    title: "Choose a Poll",
    description:
      "Explore available polls and open the one you want to participate in.",
  },
  {
    title: "Select Nominees",
    description:
      "Pick your preferred nominee and set the number of votes you want to cast.",
  },
  {
    title: "Pay Securely",
    description:
      "Complete your payment through a secure and reliable checkout flow.",
  },
  {
    title: "Get Your Receipt",
    description:
      "Receive a verifiable receipt immediately after successful payment.",
  },
];

const benefits = [
  "Secure payment flow",
  "Verifiable digital receipts",
  "Fast and simple voting process",
  "Mobile and desktop ready",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_35%)]" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-24">
          <div className="max-w-3xl text-white">
            <div className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
              Trusted digital polling experience
            </div>

            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              VOTING PAGE
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg">
              A modern polling platform built for secure participation, smooth
              navigation, transparent receipts, and a reliable experience across
              mobile and desktop.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/elections"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5"
              >
                Start Voting
              </Link>

              <Link
                href="/receipt"
                className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Verify Receipt
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {benefits.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-blue-50 backdrop-blur"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-xl">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur sm:p-6">
              <div className="rounded-3xl bg-white p-5 shadow-xl sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Platform Preview
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      Fast. Secure. Verifiable.
                    </h2>
                  </div>
                  <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    Live Ready
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Public Voting
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Browse polls, select nominees, and vote with ease.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Receipt Verification
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Confirm receipts instantly after payment completion.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Admin Management
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Secure access for managing polls, payments, and results.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Link
                    href="/elections"
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Explore Polls
                  </Link>
                  <Link
                    href="/cart"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Open Cart
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Quick Access
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Go exactly where you need
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            The landing page serves as the starting point for every user,
            whether they want to vote, verify a receipt, review a cart, or sign
            in as an administrator.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                •
              </div>

              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.description}
              </p>

              <div className="mt-6 text-sm font-semibold text-blue-700">
                Open page →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              How It Works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              A simple voting flow for everyone
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              The process is designed to remain clear, fast, and trustworthy for
              all users on both mobile and desktop devices.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="rounded-[2rem] bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-12 text-center text-white shadow-2xl sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
            Get Started
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Ready to participate?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
            Enter the platform, explore available polls, and complete your
            voting journey with confidence.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/elections"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
            >
              Go to Polls
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}