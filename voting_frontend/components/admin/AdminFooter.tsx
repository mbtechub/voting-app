'use client';

export default function AdminFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
      <p className="font-medium text-slate-600">Secure Polling Admin System</p>

      <div className="mt-2 space-y-1">
        <p>Admin Console for poll, payment, receipt, and results management</p>
        <p>Built for secure internal operations and role-based access control</p>
        <p>© {new Date().getFullYear()} Voting Platform. All rights reserved.</p>
      </div>
    </footer>
  );
}