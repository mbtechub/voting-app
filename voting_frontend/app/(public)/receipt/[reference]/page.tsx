import ReceiptClient from './ReceiptClient';

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ reference?: string }>; // ✅ allow undefined safely
}) {
  const resolvedParams = await params;

  const reference = resolvedParams?.reference || '';
  const decoded = decodeURIComponent(reference);

  // ✅ HARD GUARD — prevents /receipt from breaking
  if (!decoded) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Invalid Receipt
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            No payment reference was provided.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Payment Receipt
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Reference:{' '}
          <span className="font-semibold text-slate-900">
            {decoded}
          </span>
        </p>
      </div>

      <ReceiptClient apiBase="" reference={decoded} />
    </main>
  );
}