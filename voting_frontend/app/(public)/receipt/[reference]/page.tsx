import ReceiptClient from './ReceiptClient';

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const decoded = decodeURIComponent(reference || '');

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">

        {/* HEADER CARD (UPGRADED) */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            
            {/* LEFT */}
            <div className="flex items-center gap-3">
              <img
                src={process.env.NEXT_PUBLIC_LOGO_URL}
                className="h-10"
                alt="logo"
              />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  Payment Receipt
                </h1>
                <p className="text-xs text-slate-500">
                  Secure Payment Confirmation
                </p>
              </div>
            </div>

            {/* RIGHT */}
            <div className="text-sm text-slate-600">
              Ref:{' '}
              <span className="font-semibold text-slate-900 break-all">
                {decoded}
              </span>
            </div>

          </div>
        </div>

        {/* CLIENT RECEIPT */}
        <ReceiptClient
          apiBase={process.env.NEXT_PUBLIC_API_BASE_URL || ''}
          reference={decoded}
        />

      </div>
    </main>
  );
}