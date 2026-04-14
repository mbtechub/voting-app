'use client';

import Link from "next/link";
import { useState } from "react";
import ViewCartButton from '@/components/public/ViewCartButton';

export default function PublicHeader() {
  const [open, setOpen] = useState(false);

  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL;

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">

        {/* Logo */}
        <Link
          href="/vote"
          className="flex items-center gap-2 font-bold text-lg text-slate-900"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-8 w-8 object-contain rounded-md"
            />
          ) : (
            // fallback (your old VP)
            <span className="bg-blue-600 text-white px-2 py-1 rounded-lg">
              VP
            </span>
          )}

          <span>Voting</span>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
          <Link href="/vote" className="hover:text-black">
            Home
          </Link>

          <Link href="/elections" className="hover:text-black">
            Polls
          </Link>

          <Link href="/receipt" className="hover:text-black">
            Verify Receipt
          </Link>

          <ViewCartButton />

          <Link
            href="/vote"
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
          >
            Start Voting
          </Link>
        </nav>

        {/* Mobile Right */}
        <div className="flex items-center gap-2 md:hidden">
          <ViewCartButton />

          <button
            onClick={() => setOpen(!open)}
            className="border rounded-lg p-2 active:scale-95 transition"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-slate-200 px-4 pb-4 pt-3 flex flex-col gap-3 text-sm font-medium text-slate-700">
          <Link href="/vote" onClick={closeMenu}>
            Home
          </Link>

          <Link href="/elections" onClick={closeMenu}>
            Polls
          </Link>

          <Link href="/receipt" onClick={closeMenu}>
            Verify Receipt
          </Link>

          <Link href="/cart" onClick={closeMenu}>
            Cart
          </Link>

          <Link href="/admin/login" onClick={closeMenu}>
            Admin
          </Link>
        </div>
      )}
    </header>
  );
}