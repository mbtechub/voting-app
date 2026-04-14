import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <Link href="/vote" className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Voting Platform"
            className="h-8 w-auto"
          />
          <span className="text-lg font-semibold">Voting Platform</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/vote" className="hover:underline">
            Polls
          </Link>

          <Link href="/admin/login" className="hover:underline">
            Admin
          </Link>
        </nav>

      </div>
    </header>
  );
}