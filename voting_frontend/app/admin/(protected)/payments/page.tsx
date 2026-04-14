'use client';

import { useState } from 'react';

type ExplorerResponse = {
  query: string;
  matches: number;
  payments: Array<{
    payment: any;
    cart: any;
    items: any[];
    voteLogs: any[];
    receipt: any | null;
  }>;
};

type UiCartItem = {
  cartItemId: number;
  electionId: number;
  candidateId: number;
  voteQty: number;
  pricePerVote: number;
  subTotal: number;
};

type UiVoteLog = {
  voteLogId: number;
  reference: string;
  electionId: number;
  candidateId: number;
  voteQty: number;
  applyStatus: string;
  skipReason: string | null;
  createdAt: any;
  cartItemId?: number | null;
};

type UiReceipt = {
  receiptId: number;
  reference: string;
  snapshotHash: string | null;
  pdfHash: string | null;
  createdAt: any;
};

function toNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pick<T = any>(obj: any, keys: string[], fallback: T): T {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return fallback;
}

function normalizeCartItem(it: any): UiCartItem {
  return {
    cartItemId: toNum(pick(it, ['cartItemId', 'CART_ITEM_ID'], 0)),
    electionId: toNum(pick(it, ['electionId', 'ELECTION_ID'], 0)),
    candidateId: toNum(pick(it, ['candidateId', 'CANDIDATE_ID'], 0)),
    voteQty: toNum(pick(it, ['voteQty', 'VOTE_QTY'], 0)),
    pricePerVote: toNum(pick(it, ['pricePerVote', 'PRICE_PER_VOTE'], 0)),
    subTotal: toNum(pick(it, ['subTotal', 'SUB_TOTAL'], 0)),
  };
}

function normalizeVoteLog(vl: any): UiVoteLog {
  return {
    voteLogId: toNum(pick(vl, ['voteLogId', 'VOTE_LOG_ID'], 0)),
    reference: String(pick(vl, ['reference', 'REFERENCE'], '')),
    electionId: toNum(pick(vl, ['electionId', 'ELECTION_ID'], 0)),
    candidateId: toNum(pick(vl, ['candidateId', 'CANDIDATE_ID'], 0)),
    voteQty: toNum(pick(vl, ['voteQty', 'VOTE_QTY'], 0)),
    applyStatus: String(pick(vl, ['applyStatus', 'APPLY_STATUS'], '')),
    skipReason: pick(vl, ['skipReason', 'SKIP_REASON'], null),
    createdAt: pick(vl, ['createdAt', 'CREATED_AT'], null),
    cartItemId: pick(vl, ['cartItemId', 'CART_ITEM_ID'], null),
  };
}

function normalizeReceipt(r: any): UiReceipt | null {
  if (!r) return null;

  return {
    receiptId: toNum(pick(r, ['receiptId', 'RECEIPT_ID'], 0)),
    reference: String(pick(r, ['reference', 'REFERENCE'], '')),
    snapshotHash: pick(r, ['snapshotHash', 'SNAPSHOT_HASH'], null),
    pdfHash: pick(r, ['pdfHash', 'PDF_HASH'], null),
    createdAt: pick(r, ['createdAt', 'CREATED_AT'], null),
  };
}

function formatNaira(n: number) {
  return `₦${Number(n ?? 0).toLocaleString()}`;
}

function statusBadgeClass(status: string) {
  const s = String(status || '').toUpperCase();

  if (s === 'SUCCESS') return 'border-green-200 bg-green-100 text-green-700';
  if (s === 'PARTIALLY_APPLIED')
    return 'border-amber-200 bg-amber-100 text-amber-700';
  if (s === 'FAILED') return 'border-red-200 bg-red-100 text-red-700';
  if (s === 'INITIATED') return 'border-blue-200 bg-blue-100 text-blue-700';

  return 'border-slate-200 bg-slate-100 text-slate-700';
}

export default function AdminPaymentsPage() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExplorerResponse | null>(null);

  async function onSearch() {
    const query = q.trim();
    if (!query) {
      setError('Enter a reference / cart uuid / receipt ref');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(
        `/api/admin/payments/search?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        },
      );

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || `Failed (${res.status})`);

      setData(body as ExplorerResponse);
    } catch (e: any) {
      setError(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Payment Explorer
        </div>

        <h1 className="mt-4 text-3xl font-bold">Search Payments</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
          Search by Paystack reference, VOTE reference, receipt reference, or
          cart UUID to inspect payment, cart items, vote logs, and receipt
          details.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. VOTE_1769592044428_21697"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 lg:max-w-xl"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch();
            }}
          />

          <button
            onClick={onSearch}
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {data ? (
        <div className="space-y-5">
          <div className="text-sm text-slate-500">
            Matches: <span className="font-semibold text-slate-900">{data.matches}</span>{' '}
            • Query: <span className="font-semibold text-slate-900">{data.query}</span>
          </div>

          {data.payments.map((p, idx) => {
            const pay = p.payment || {};
            const cart = p.cart || {};

            const items: UiCartItem[] = (p.items || []).map(normalizeCartItem);
            const voteLogs: UiVoteLog[] = (p.voteLogs || []).map(normalizeVoteLog);
            const receipt: UiReceipt | null = normalizeReceipt(p.receipt);

            const paymentId = toNum(pick(pay, ['paymentId', 'PAYMENT_ID'], 0));
            const status = String(pick(pay, ['status', 'STATUS'], ''));
            const paystackRef = String(pick(pay, ['paystackRef', 'PAYSTACK_REF'], ''));
            const amount = toNum(pick(pay, ['amount', 'AMOUNT'], 0));

            const cartUuid = String(
              pick(
                cart,
                ['cartUuid', 'CART_UUID'],
                pick(pay, ['cartUuid', 'CART_UUID'], ''),
              ),
            );
            const cartId = toNum(
              pick(
                cart,
                ['cartId', 'CART_ID'],
                pick(pay, ['cartId', 'CART_ID'], 0),
              ),
            );
            const cartStatus = String(
              pick(
                cart,
                ['status', 'STATUS'],
                pick(pay, ['cartStatus', 'CART_STATUS'], ''),
              ),
            );
            const cartTotal = toNum(
              pick(
                cart,
                ['totalAmount', 'TOTAL_AMOUNT'],
                pick(pay, ['cartTotal', 'CART_TOTAL'], 0),
              ),
            );

            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Payment #{paymentId || '(unknown)'}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                          status,
                        )}`}
                      >
                        {status || 'UNKNOWN'}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-700">
                    <p>
                      <span className="font-medium text-slate-900">Paystack Ref:</span>{' '}
                      {paystackRef || '-'}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Amount:</span>{' '}
                      {formatNaira(amount)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Cart:</span>{' '}
                      {cartUuid || '-'} (ID: {cartId || '-'}) — {cartStatus || '-'}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Cart Total:</span>{' '}
                      {formatNaira(cartTotal)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-3">
                  <section className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-900">
                      Cart Items
                    </h3>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                Poll
                              </th>
                              <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                Nominee
                              </th>
                              <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                Votes
                              </th>
                              <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                Subtotal
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.length ? (
                              items.map((it) => (
                                <tr
                                  key={
                                    it.cartItemId || `${it.electionId}-${it.candidateId}`
                                  }
                                >
                                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                                    {it.electionId}
                                  </td>
                                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                                    {it.candidateId}
                                  </td>
                                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                                    {it.voteQty}
                                  </td>
                                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                                    {formatNaira(it.subTotal)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  className="px-4 py-4 text-sm text-slate-500"
                                  colSpan={4}
                                >
                                  No cart items
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-900">
                      Vote Logs
                    </h3>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                Status
                              </th>
                              <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                Poll
                              </th>
                              <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                Nominee
                              </th>
                              <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                Votes
                              </th>
                              <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                Reason
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {voteLogs.length ? (
                              voteLogs.map((vl) => (
                                <tr
                                  key={
                                    vl.voteLogId ||
                                    `${vl.reference}-${vl.electionId}-${vl.candidateId}`
                                  }
                                >
                                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                                    {vl.applyStatus}
                                  </td>
                                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                                    {vl.electionId}
                                  </td>
                                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                                    {vl.candidateId}
                                  </td>
                                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                                    {vl.voteQty}
                                  </td>
                                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                                    {vl.skipReason || '-'}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  className="px-4 py-4 text-sm text-slate-500"
                                  colSpan={5}
                                >
                                  No vote logs
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-900">
                      Receipt
                    </h3>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      {receipt ? (
                        <div className="space-y-2">
                          <p>
                            <span className="font-medium text-slate-900">
                              Reference:
                            </span>{' '}
                            {receipt.reference}
                          </p>
                          <p>
                            <span className="font-medium text-slate-900">
                              Snapshot Hash:
                            </span>{' '}
                            {receipt.snapshotHash || '-'}
                          </p>
                          <p>
                            <span className="font-medium text-slate-900">
                              PDF Hash:
                            </span>{' '}
                            {receipt.pdfHash || '-'}
                          </p>
                        </div>
                      ) : (
                        <p>No receipt found</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}