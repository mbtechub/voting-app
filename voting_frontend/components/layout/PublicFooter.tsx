import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-white mt-16">
      
      {/* Top Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">

        {/* Brand */}
        <div>
          <h3 className="text-lg font-bold tracking-tight">Voting</h3>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            A secure digital polling platform for participating in elections,
            casting votes, and verifying receipts with confidence.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-slate-300">
            Navigation
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <Link href="/vote" className="hover:text-white transition">
                Home
              </Link>
            </li>
            <li>
              <Link href="/elections" className="hover:text-white transition">
                Polls
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-white transition">
                Cart
              </Link>
            </li>
            <li>
              <Link href="/receipt" className="hover:text-white transition">
                Verify Receipt
              </Link>
            </li>
          </ul>
        </div>

        {/* Platform */}
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-slate-300">
            Platform
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="hover:text-white transition cursor-default">
              How Voting Works
            </li>
            <li className="hover:text-white transition cursor-default">
              Security
            </li>
            <li className="hover:text-white transition cursor-default">
              Support
            </li>
          </ul>
        </div>

        {/* Admin */}
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-slate-300">
            Admin
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <Link
                href="/admin/login"
                className="hover:text-white transition"
              >
                Admin Login
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-slate-800 text-center text-xs sm:text-sm text-slate-500 py-5 px-4">
        © {new Date().getFullYear()} Voting Platform. All rights reserved.
      </div>
    </footer>
  );
}