import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminSidebar from './_components/admin-sidebar';
import AdminFooter from '@/components/admin/AdminFooter';
import AdminDesktopLogoutButton from '@/components/admin/AdminDesktopLogoutButton';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-5 rounded-2xl bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-4 text-white shadow-sm sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold backdrop-blur">
                  VP
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-wide">
                    VOTING PAGE
                  </p>
                  <p className="text-xs text-blue-100">Admin Console</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <AdminSidebar />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex flex-col">
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            <div className="mb-4 hidden lg:flex justify-end">
              <AdminDesktopLogoutButton />
            </div>

            {children}
          </div>

          <div className="px-4 pb-6 sm:px-6 lg:px-8">
            <AdminFooter />
          </div>
        </main>
      </div>
    </div>
  );
}