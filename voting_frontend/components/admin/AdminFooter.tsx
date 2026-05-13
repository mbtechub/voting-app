'use client';

export default function AdminFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
      <p className="font-medium text-slate-600">Polling Admin System</p>

      <div className="mt-2 space-y-1">
        <p>Admin Console for poll, payment, receipt, and results management</p>
  <br />
  <hr />
        <p>© {new Date().getFullYear()} Business Automation Management System.</p>
        <p>Mide Bash</p>
      </div>
    </footer>
  );
}
