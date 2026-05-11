'use client';

import { useState } from 'react';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] =
    useState('');

  const [newPassword, setNewPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    if (loading) return;

    setError(null);

    if (
      newPassword !== confirmPassword
    ) {
      setError(
        'Passwords do not match.',
      );
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        '/api/admin/auth/change-password',
        {
          method: 'POST',

          credentials: 'include',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        },
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message ||
            'Password change failed',
        );
      }

      window.location.assign(
        '/admin/dashboard',
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Password change failed',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-slate-50 px-6 py-10">
      <div className="mx-auto grid min-h-[85vh] max-w-7xl items-center gap-10 lg:grid-cols-2 lg:px-8">

        {/* Left Branding Section */}
        <div className="hidden lg:block">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-10 text-white shadow-2xl">

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_35%)]" />

            <div className="relative">

              <div className="mb-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
                Security Update Required
              </div>

              <h1 className="text-4xl font-bold leading-tight">
                Change Your Password
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-blue-100">
                For security reasons, you must change your temporary password
                before accessing the admin dashboard.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">

                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm font-semibold">
                    Secure Authentication
                  </p>

                  <p className="mt-2 text-sm text-blue-100">
                    Your new password protects access to polls, receipts,
                    results, and administrative controls.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm font-semibold">
                    One-Time Setup
                  </p>

                  <p className="mt-2 text-sm text-blue-100">
                    After changing your password, you’ll continue directly into
                    your admin workspace.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="mb-8 text-center">

              {(() => {
                const logoUrl =
                  process.env.NEXT_PUBLIC_LOGO_URL;

                return (
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 shadow-md overflow-hidden">

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
                );
              })()}

              <h2 className="text-3xl font-bold text-slate-900">
                Change Password
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Create a new secure password to continue.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              <div>
                <label className="block text-sm font-medium text-slate-800">
                  Current Password
                </label>

                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) =>
                    setCurrentPassword(
                      e.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800">
                  New Password
                </label>

                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800">
                  Confirm Password
                </label>

                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="Confirm new password"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading
                  ? 'Updating Password...'
                  : 'Change Password'}
              </button>

            </form>
          </div>
        </div>

      </div>
    </main>
  );
}