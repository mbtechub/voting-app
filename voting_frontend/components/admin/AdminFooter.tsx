'use client';

export default function AdminFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
      <p className="font-medium text-slate-600">
        Polling Admin System
      </p>

      <div className="mt-2 space-y-1">
        <p>
          Admin Console for poll, payment, receipt, and results management
        </p>

        <br />
        <hr />

        <p>
          © {new Date().getFullYear()} Business Automation Management System.
        </p>

        <a
          href="https://wa.me/2348085745206?text=Hello%20Mide%20Bash,%20I%20am%20contacting%20you%20from%20the%20LASU%20Awards%20Voting%20Website."
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-green-600 hover:text-green-700 hover:underline transition-colors"
        >
          Ayomide Obashola (Mide Bash)
        </a>
      </div>
    </footer>
  );
}