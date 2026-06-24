import PaymentRecoveryClient from './payment-recovery-client';
export const dynamic = 'force-dynamic';

export default function PaymentRecoveryPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Payment Recovery
        </div>

        <h1 className="mt-4 text-3xl font-bold">
          Payment Recovery Dashboard
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
          Review INITIATED payments, investigate missing webhook
          processing, and manually recover successful Paystack
          transactions.
        </p>
      </div>

      <PaymentRecoveryClient />
    </div>
  );
}