import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminSidebar from './_components/admin-sidebar';
import AdminFooter from '@/components/admin/AdminFooter';
import AdminDesktopLogoutButton from '@/components/admin/AdminDesktopLogoutButton';
import AdminMobileSidebarToggle from '@/components/admin/AdminMobileSidebarToggle';
import { AdminAuthProvider } from '@/lib/auth/AdminAuthContext';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  // 🔒 HARD AUTH GATE (SERVER SIDE)
  if (!token) {
    redirect('/admin/login');
  }

  return (
    <AdminAuthProvider>
      <div className="h-screen overflow-hidden bg-slate-50">
        <div className="relative h-full">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_24%)]" />

          <div className="h-full lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* SIDEBAR */}
            <aside className="hidden h-full overflow-y-auto overflow-x-hidden border-r border-slate-200/80 bg-white/90 backdrop-blur lg:block">
              <div className="flex min-h-full flex-col p-4 sm:p-5">
                <div className="mb-5 rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow-xl shadow-blue-950/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-bold tracking-wide backdrop-blur">
                      VP
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tracking-[0.18em] text-blue-50">
                        VOTING PLATFORM
                      </p>
                      <p className="mt-1 text-xs text-blue-100/80">
                        Admin Console
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-100/70">
                      Workspace
                    </p>
                  </div>
                </div>

                <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden">
                  {/* 🔥 NOW USES CONTEXT (no internal fetch anymore) */}
                  <AdminSidebar />
                </div>
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="min-w-0 h-full overflow-y-auto overflow-x-hidden">
              <div className="flex min-h-full flex-col">
                {/* HEADER */}
                <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/75">
                  <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                      <AdminMobileSidebarToggle />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          Voting Platform Admin
                        </p>
                        <p className="hidden text-xs text-slate-500 sm:block">
                          Manage polls, nominees, payments, results, and admin
                          activity
                        </p>
                      </div>
                    </div>

                    <div className="hidden shrink-0 lg:flex">
                      {/* 🔥 Already optimized logout */}
                      <AdminDesktopLogoutButton />
                    </div>
                  </div>
                </div>

                {/* PAGE CONTENT */}
                <div className="flex-1">
                  <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                    <div className="rounded-[28px] border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur-sm sm:p-4 lg:p-5">
                      <div className="min-w-0 rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6 lg:p-8">
                        {children}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8 lg:pb-8">
                  <AdminFooter />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </AdminAuthProvider>
  );
}