import WebhooksClient from './webhooks-client';

export const dynamic = 'force-dynamic';

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Payment Events
        </div>

        <h1 className="mt-4 text-3xl font-bold">Webhook Events</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
          Review recent Paystack webhook activity, signature validation,
          processing outcomes, and recorded errors from one monitoring view.
        </p>
      </div>

      <WebhooksClient />
    </div>
  );
}