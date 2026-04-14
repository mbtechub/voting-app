'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import AdminSidebar from '@/app/admin/(protected)/_components/admin-sidebar';

export default function AdminMobileSidebarToggle() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [open, mounted]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const overlay =
    mounted &&
    createPortal(
      <div
        className={`fixed inset-0 z-[9999] lg:hidden ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-slate-950/45 transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />

        <div
          id="admin-mobile-menu"
          className={`absolute left-0 top-0 h-full
          w-[50vw] max-w-[420px] min-w-[280px]
          flex flex-col
          border-r border-slate-200 bg-slate-50 shadow-2xl
          transition-transform duration-300 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="border-b border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">

                {/* ✅ LOGO (ENV + FALLBACK) */}
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-11 w-11 rounded-2xl object-contain bg-white p-1"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">
                    VP
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900">
                    Voting Platform
                  </p>
                  <p className="text-sm text-slate-500">Admin Console</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                aria-label="Close admin menu"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <AdminSidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
          aria-label="Open admin menu"
          aria-expanded={open}
          aria-controls="admin-mobile-menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {overlay}
    </>
  );
}