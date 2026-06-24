'use client';

import { useEffect, useState } from 'react';

type RecoveryPayment = {
  paymentId: number;
  cartId: number;
  paystackRef: string;
  amount: number;
  status: string;
  createdAt: string;
};

export default function PaymentRecoveryClient() {
  const [payments, setPayments] = useState<
    RecoveryPayment[]
  >([]);
  const [loading, setLoading] =
    useState(false);
  const [recoveringRef, setRecoveringRef] =
    useState<string | null>(null);
  const [error, setError] = useState<
    string | null
  >(null);

  async function loadPayments() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        '/api/admin/payment-recovery/pending',
        {
          cache: 'no-store',
          credentials: 'include',
        },
      );

      const body = await res.json();

      if (!res.ok) {
        throw new Error(
          body?.message ??
            'Failed to load payments',
        );
      }

      if (Array.isArray(body)) {
        setPayments(body);
      } else if (
        Array.isArray(body?.data)
      ) {
        setPayments(body.data);
      } else {
        setPayments([]);
      }
    } catch (err: any) {
      setError(
        err?.message ??
          'Failed to load payments',
      );
    } finally {
      setLoading(false);
    }
  }

  async function recoverPayment(
    paystackRef: string,
  ) {
    try {
      setRecoveringRef(paystackRef);

      const res = await fetch(
        '/api/admin/payment-recovery/recover',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            paystackRef,
          }),
        },
      );

      const body = await res.json();

      if (!res.ok) {
        throw new Error(
          body?.message ??
            'Recovery failed',
        );
      }

      alert(
        `Recovery successful for ${paystackRef}`,
      );

      await loadPayments();
    } catch (err: any) {
      alert(
        err?.message ??
          'Recovery failed',
      );
    } finally {
      setRecoveringRef(null);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={loadPayments}
          disabled={loading}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? 'Refreshing...'
            : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold">
            Pending Recoveries (
            {payments.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-6">
            Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left whitespace-nowrap">
                    Payment ID
                  </th>

                  <th className="p-3 text-left whitespace-nowrap">
                    Cart ID
                  </th>

                  <th className="p-3 text-left whitespace-nowrap">
                    Reference
                  </th>

                  <th className="p-3 text-left whitespace-nowrap">
                    Amount
                  </th>

                  <th className="p-3 text-left whitespace-nowrap">
                    Status
                  </th>

                  <th className="p-3 text-left whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.paymentId}
                    className="border-t hover:bg-slate-50"
                  >
                    <td className="p-3 whitespace-nowrap">
                      {p.paymentId}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {p.cartId}
                    </td>

                    <td className="p-3 font-mono text-xs whitespace-nowrap">
                      {p.paystackRef}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      ₦
                      {Number(
                        p.amount,
                      ).toLocaleString()}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                        {p.status}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <button
                        onClick={() =>
                          recoverPayment(
                            p.paystackRef,
                          )
                        }
                        disabled={
                          recoveringRef ===
                          p.paystackRef
                        }
                        style={{
                          backgroundColor:
                            '#16a34a',
                          color: '#ffffff',
                          border:
                            '1px solid #15803d',
                        }}
                        className="rounded-lg px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {recoveringRef ===
                        p.paystackRef
                          ? 'Recovering...'
                          : 'Recover'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!payments.length && (
              <div className="p-6 text-center text-slate-500">
                No pending recoveries found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}