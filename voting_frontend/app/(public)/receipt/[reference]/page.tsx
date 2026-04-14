import ReceiptClient from './ReceiptClient';

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const decoded = decodeURIComponent(reference || '');

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Payment Receipt
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Reference: <span className="font-semibold text-slate-900">{decoded}</span>
        </p>
      </div>

      <ReceiptClient apiBase="" reference={decoded} />
    </main>
  );
}