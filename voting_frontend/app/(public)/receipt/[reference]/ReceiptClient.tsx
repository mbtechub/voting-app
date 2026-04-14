'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Receipt = {
  lookupKey: string;
  receiptId?: string;
  payment: {
    paystackRef: string;
    status: string;
    amount: number;
    paidAt: string | null;
  };
  cart: {
    cartId: number;
    cartUuid: string;
    status: string;
    totalAmount: number;
  };
  items: Array<{
    cartItemId: number | null;
    election: { electionId: number; title: string };
    candidate: { candidateId: number; name: string };
    voteQty: number;
    pricePerVote: number;
    subTotal: number;
    outcome: {
      applyStatus: string | null;
      skipReason: string | null;
      createdAt?: string | null;
    };
  }>;
  summary: {
    itemsTotal: number;
    appliedTotal: number;
    skippedTotal: number;
  };
};

type ElectionRow = { electionId: number; title: string };

function isFinalishStatus(status?: string | null) {
  const s = (status || '').toUpperCase();
  return s === 'SUCCESS' || s === 'PARTIALLY_APPLIED' || s === 'FAILED';
}

function formatMoney(n: number) {
  try {
    return Number(n || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  } catch {
    return String(n);
  }
}

function formatNaira(n: number) {
  return `₦${formatMoney(n)}`;
}

// ✅ FIXED — NO FALLBACK TO LOCALHOST
function getApiBase() {
  const v = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();

  if (!v) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
  }

  return v;
}

function coerceReceiptPayload(input: any): Receipt {
  if (!input || typeof input !== 'object') throw new Error('Invalid receipt payload');
  if (!input.payment || typeof input.payment !== 'object') {
    throw new Error('Receipt payload missing payment');
  }
  if (!input.cart || typeof input.cart !== 'object') {
    throw new Error('Receipt payload missing cart');
  }
  if (!Array.isArray(input.items)) throw new Error('Receipt payload missing items');
  if (!input.summary || typeof input.summary !== 'object') {
    throw new Error('Receipt payload missing summary');
  }
  return input as Receipt;
}

export default function ReceiptClient({
  apiBase,
  reference,
}: {
  apiBase?: string;
  reference: string;
}) {
  const stableReference = useMemo(() => (reference ?? '').trim(), [reference]);

  // ✅ SAFE RESOLUTION (NO LOCALHOST LEAK)
  const resolvedApiBase = useMemo(() => {
    const fromProp = (apiBase || '').trim();
    if (fromProp) return fromProp;
    return getApiBase();
  }, [apiBase]);

  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attemptView, setAttemptView] = useState(1);
  const [pollTitleById, setPollTitleById] = useState<Record<number, string>>({});

  const attemptsRef = useRef(0);
  const timerRef = useRef<any>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);

    cancelledRef.current = false;
    attemptsRef.current = 0;
    setAttemptView(1);
    setReceipt(null);
    setError(null);

    const maxAttempts = 30;

    if (!stableReference) {
      setLoading(false);
      setError('Missing receipt reference.');
      return;
    }

    setLoading(true);

    async function fetchReceipt() {
      if (cancelledRef.current) return;

      const url = `${resolvedApiBase}/api/public/receipt/${encodeURIComponent(stableReference)}`;

      try {
        const res = await fetch(url, { cache: 'no-store' });

        if (res.status === 404) {
          attemptsRef.current += 1;
          setAttemptView(Math.min(attemptsRef.current + 1, maxAttempts));

          if (attemptsRef.current >= maxAttempts) {
            setLoading(false);
            setError('Still processing your payment. Please refresh in a moment.');
            return;
          }

          timerRef.current = setTimeout(fetchReceipt, 2000);
          return;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Request failed (${res.status})`);
        }

        const json = await res.json().catch(() => null);
        const data = coerceReceiptPayload(json);

        if (cancelledRef.current) return;

        setReceipt(data);

        const status = (data?.payment?.status || '').toUpperCase();

        if (isFinalishStatus(status)) {
          setLoading(false);
          cancelledRef.current = true;
          if (timerRef.current) clearTimeout(timerRef.current);
          return;
        }

        attemptsRef.current += 1;
        setAttemptView(Math.min(attemptsRef.current + 1, maxAttempts));

        if (attemptsRef.current >= maxAttempts) {
          setLoading(false);
          return;
        }

        timerRef.current = setTimeout(fetchReceipt, 2000);
      } catch (e: any) {
        if (!cancelledRef.current) {
          setLoading(false);
          setError(e?.message || 'Something went wrong');
        }
      }
    }

    fetchReceipt();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stableReference, resolvedApiBase]);

  useEffect(() => {
    if (!receipt?.items?.length) return;

    let cancelled = false;

    async function loadPollTitles() {
      try {
        const res = await fetch(`${resolvedApiBase}/api/public/elections`, {
          cache: 'no-store',
        });
        const data = (await res.json().catch(() => ([]))) as ElectionRow[];
        if (!res.ok) return;

        const map: Record<number, string> = {};
        for (const e of data || []) {
          if (typeof e.electionId === 'number' && (e.title || '').trim()) {
            map[e.electionId] = e.title.trim();
          }
        }

        if (!cancelled) setPollTitleById(map);
      } catch {}
    }

    loadPollTitles();
    return () => {
      cancelled = true;
    };
  }, [receipt?.items?.length, resolvedApiBase]);

  useEffect(() => {
    if (!receipt) return;

    try {
      window.localStorage.removeItem('cartUuid');
    } catch {}
  }, [receipt]);

  const canShowPdf = useMemo(() => {
    return !!receipt?.payment?.paystackRef && isFinalishStatus(receipt?.payment?.status);
  }, [receipt]);

  const pdfHref = useMemo(() => {
    const ref = receipt?.payment?.paystackRef || stableReference;
    return `${resolvedApiBase}/api/public/receipt/${encodeURIComponent(ref)}/pdf`;
  }, [receipt, stableReference, resolvedApiBase]);
  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-base font-medium text-slate-900">Processing your payment…</p>
        <p className="mt-2 text-sm text-slate-600">
          Waiting for webhook confirmation. Attempt {attemptView}/30
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-base font-semibold text-red-700">Error</p>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!receipt) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Summary</h2>

          {canShowPdf ? (
            <a
              href={pdfHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              📄 Download PDF
            </a>
          ) : (
            <span className="text-sm text-slate-500">
              PDF available after confirmation
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-slate-500">Payment Status</p>
            <div className="mt-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  receipt.payment.status === 'SUCCESS'
                    ? 'bg-green-100 text-green-700'
                    : receipt.payment.status === 'PARTIALLY_APPLIED'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {receipt.payment.status || 'UNKNOWN'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-slate-500">Amount Paid</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatNaira(receipt.payment.amount ?? 0)}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-slate-500">Applied Total</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatNaira(receipt.summary.appliedTotal ?? 0)}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-slate-500">Skipped Total</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatNaira(receipt.summary.skippedTotal ?? 0)}
            </p>
          </div>
        </div>

        {receipt.payment.paidAt ? (
          <p className="mt-4 text-sm text-slate-600">
            Paid At:{' '}
            <span className="font-medium text-slate-900">
              {receipt.payment.paidAt}
            </span>
          </p>
        ) : null}

        <p className="mt-2 text-sm text-slate-600">
          Reference:{' '}
          <span className="font-medium text-slate-900">
            {receipt.payment.paystackRef || stableReference}
          </span>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Items</h2>

        <div className="mt-4 grid gap-4">
          {(receipt.items || []).map((it, idx) => {
            const pollTitle =
              (pollTitleById[it.election.electionId] || '').trim() ||
              (it.election.title || '').trim() ||
              `Poll #${it.election.electionId}`;

            return (
              <div
                key={`${it.cartItemId ?? 'vl'}-${idx}`}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="grid gap-2 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">Poll:</span>{' '}
                    {pollTitle}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Nominee:</span>{' '}
                    {it.candidate.name || `Nominee #${it.candidate.candidateId}`}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Votes:</span>{' '}
                    {it.voteQty}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Price:</span>{' '}
                    {formatNaira(it.pricePerVote)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Subtotal:</span>{' '}
                    {formatNaira(it.subTotal)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Outcome:</span>{' '}
                    <span
                      className={`ml-1 rounded-md px-2 py-1 text-xs font-semibold ${
                        it.outcome.applyStatus === 'APPLIED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {(it.outcome.applyStatus || 'UNKNOWN').toUpperCase()}
                    </span>
                    {it.outcome.skipReason ? (
                      <span className="text-red-700"> — {it.outcome.skipReason}</span>
                    ) : null}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}