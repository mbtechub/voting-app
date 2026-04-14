'use client';

import { useMemo, useState } from 'react';

type CartItem = {
  electionId: number;
  electionTitle?: string | null;
  candidateId: number;
  candidateName?: string | null;
  voteQty: number;
  pricePerVote: number;
  subTotal: number;
};

type CartResponse = {
  cartUuid: string;
  status: string;
  totalAmount: number;
  items: CartItem[];
};

function money(n: number) {
  return `₦${Number(n || 0).toLocaleString()}`;
}

function isPaidLikeStatus(status: string) {
  const s = (status || '').toUpperCase();
  return s === 'PAID' || s === 'SUCCESS' || s === 'PARTIALLY_APPLIED';
}

export default function CartClient({ cart: initial }: { cart: CartResponse }) {
  const [cart, setCart] = useState<CartResponse>(initial);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const paidLike = useMemo(() => isPaidLikeStatus(cart.status), [cart.status]);

  const isPayable = useMemo(() => {
    const s = (cart.status || '').toUpperCase();
    return s === 'PENDING';
  }, [cart.status]);

  const canEdit = isPayable && !paidLike;

  const groupedByPoll = useMemo(() => {
    const map = new Map<
      number,
      { pollId: number; pollTitle: string; items: CartItem[] }
    >();

    for (const it of cart.items || []) {
      const pollTitle =
        (it.electionTitle || '').trim() || `Poll ${it.electionId}`;

      const existing = map.get(it.electionId);
      if (!existing) {
        map.set(it.electionId, {
          pollId: it.electionId,
          pollTitle,
          items: [it],
        });
      } else {
        existing.items.push(it);
      }
    }

    return Array.from(map.values());
  }, [cart.items]);

  async function updateQty(item: CartItem, nextQty: number) {
    setErr(null);
    if (!canEdit) return setErr(`Cart not editable (${cart.status})`);
    if (nextQty <= 0) return;

    const key = `${item.electionId}:${item.candidateId}`;
    setBusyKey(key);

    try {
      const res = await fetch(`/api/cart/${cart.cartUuid}/item`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          electionId: item.electionId,
          candidateId: item.candidateId,
          voteQty: nextQty,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Update failed');

      setCart(data);
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong.');
    } finally {
      setBusyKey(null);
    }
  }

  async function removeItem(item: CartItem) {
    setErr(null);
    if (!canEdit) return setErr(`Cart not editable (${cart.status})`);

    const key = `${item.electionId}:${item.candidateId}`;
    setBusyKey(key);

    try {
      const res = await fetch(`/api/cart/${cart.cartUuid}/item`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          electionId: item.electionId,
          candidateId: item.candidateId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Remove failed');

      setCart(data);
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong.');
    } finally {
      setBusyKey(null);
    }
  }

  async function clearCart() {
    if (!canEdit) return;
    if (!confirm('Clear cart?')) return;

    setClearing(true);
    try {
      for (const item of cart.items || []) {
        await fetch(`/api/cart/${cart.cartUuid}/item`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            electionId: item.electionId,
            candidateId: item.candidateId,
          }),
        });
      }

      localStorage.removeItem('cartUuid');
      window.location.assign('/vote');
    } finally {
      setClearing(false);
    }
  }

  async function pay() {
    setErr(null);

    if (!email.trim()) {
      return setErr('Email required');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartUuid: cart.cartUuid, email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Payment failed');

      window.location.assign(
        data.authorization_url || data.data?.authorization_url
      );
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
      {/* ERROR */}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* CART ITEMS */}
      <div className="space-y-5">
        {groupedByPoll.map((g) => (
          <div key={g.pollId} className="rounded-2xl border overflow-hidden">
            
            {/* POLL HEADER */}
            <div className="bg-gray-50 px-5 py-4 font-semibold">
              {g.pollTitle}
            </div>

            {/* ITEMS */}
            <div className="divide-y">
              {g.items.map((i) => {
                const key = `${i.electionId}:${i.candidateId}`;
                const busy = busyKey === key;

                return (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4"
                  >
                    {/* LEFT */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {i.candidateName || `Nominee ${i.candidateId}`}
                      </div>

                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        
                        {/* QTY CONTROL */}
                        <div className="flex items-center border rounded-xl overflow-hidden">
                          <button
                            onClick={() => updateQty(i, i.voteQty - 1)}
                            disabled={!canEdit || i.voteQty <= 1 || busy || clearing}
                            className="w-9 h-9 hover:bg-gray-100 disabled:opacity-50"
                          >
                            −
                          </button>

                          <div className="w-10 text-center font-semibold">
                            {i.voteQty}
                          </div>

                          <button
                            onClick={() => updateQty(i, i.voteQty + 1)}
                            disabled={!canEdit || busy || clearing}
                            className="w-9 h-9 hover:bg-gray-100 disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>

                        {/* REMOVE */}
                        <button
                          onClick={() => removeItem(i)}
                          disabled={!canEdit || busy || clearing}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>

                        {busy && (
                          <span className="text-xs text-gray-400">
                            Updating…
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PRICE */}
                    <div className="font-semibold text-right text-base">
                      {money(i.subTotal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* TOTAL */}
      <div className="flex items-center justify-between rounded-2xl border bg-gray-50 px-5 py-4">
        <span className="text-gray-700 font-medium">Total</span>
        <span className="text-lg font-semibold">
          {money(cart.totalAmount)}
        </span>
      </div>

      {/* PAYMENT */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
            disabled={paidLike || clearing}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={clearCart}
            disabled={!canEdit || clearing || loading || (cart.items || []).length === 0}
            className="rounded-xl border px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            {clearing ? 'Clearing…' : 'Clear cart'}
          </button>

          <button
            onClick={pay}
            disabled={
              loading ||
              paidLike ||
              !isPayable ||
              (cart.items || []).length === 0 ||
              clearing
            }
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Redirecting…' : 'Pay with Paystack'}
          </button>
        </div>

        <div className="text-sm text-gray-500">
          After payment, you’ll be redirected to your receipt page.
        </div>
      </div>
    </div>
  );
}