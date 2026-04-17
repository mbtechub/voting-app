'use client';

import { useMemo, useState, useEffect } from 'react';

type CartItem = {
  electionId: number;
  electionTitle?: string | null;
  candidateId: number;
  candidateName?: string | null;
  voteQty: number;
  pricePerVote: number;
  subTotal: number;
  photoUrl?: string | null;
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

function isPaidLikeStatus(status?: string) {
  const s = (status || '').toUpperCase();
  return s === 'PAID' || s === 'SUCCESS' || s === 'PARTIALLY_APPLIED';
}

export default function CartClient({ cart: initial }: { cart?: CartResponse }) {

  // ✅ ALL HOOKS FIRST

  const [cart, setCart] = useState<CartResponse | null>(() => {
    if (!initial) return null;
    return { ...initial, items: initial.items ?? [] };
  });

  const [loadingInit, setLoadingInit] = useState(!initial);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  // ✅ LOAD CART IF NEEDED
  useEffect(() => {
    if (initial) return;

    const cartUuid =
      typeof window !== 'undefined'
        ? localStorage.getItem('cartUuid')
        : null;

    if (!cartUuid) {
      setLoadingInit(false);
      return;
    }

    fetch(`/api/public/cart/${cartUuid}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setCart({
          ...data,
          items: data?.items ?? [],
        });
      })
      .catch(() => {})
      .finally(() => setLoadingInit(false));
  }, [initial]);

  // ✅ SAFE HOOKS

  const status = (cart?.status || '').toUpperCase();

  const paidLike = useMemo(() => isPaidLikeStatus(status), [status]);
  const isPayable = useMemo(() => status === 'PENDING', [status]);

  const hasItems = (cart?.items?.length ?? 0) > 0;

  // ✅ FIX: MOVE grouped UP (CRITICAL)
  const grouped = useMemo(() => {
    const map = new Map<number, CartItem[]>();

    for (const item of cart?.items ?? []) {
      if (!map.has(item.electionId)) {
        map.set(item.electionId, []);
      }
      map.get(item.electionId)!.push(item);
    }

    return Array.from(map.entries());
  }, [cart?.items]);

  // ✅ HANDLE PAYMENT REDIRECT
  useEffect(() => {
    if (!cart) return;

    if (isPaidLikeStatus(cart.status)) {
      localStorage.removeItem('cartUuid');
      localStorage.setItem('cartCount', '0');
      window.dispatchEvent(new Event('cartUpdated'));
      window.location.assign('/vote');
    }
  }, [cart?.status]);

  // ✅ NOW SAFE TO GUARD

  if (!cart && loadingInit) {
    return <div className="p-6">Loading cart...</div>;
  }

  if (!cart) {
    return <div className="p-6">No cart found.</div>;
  }

  const c = cart;

  // 👉 continue rest of your file unchanged
  function syncCart(data: CartResponse) {
    const items = data.items ?? [];

    setCart({ ...data, items });

    localStorage.setItem('cartCount', String(items.length));
    window.dispatchEvent(new Event('cartUpdated'));
  }

  async function updateQty(item: CartItem, nextQty: number) {
    if (nextQty < 1) return;

    const key = `${item.electionId}:${item.candidateId}`;
    setBusyKey(key);

    try {
      const res = await fetch(`/api/cart/${c.cartUuid}/item`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: item.electionId,
          candidateId: item.candidateId,
          voteQty: nextQty,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Update failed');
      }

      const data = await res.json();
      syncCart(data);

    } catch (e: any) {
      setErr(e.message || 'Something went wrong');
    } finally {
      setBusyKey(null);
    }
  }

  async function removeItem(item: CartItem) {
    const key = `${item.electionId}:${item.candidateId}`;
    setBusyKey(key);
    setErr(null);

    try {
      const res = await fetch(`/api/cart/${c.cartUuid}/item`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: item.electionId,
          candidateId: item.candidateId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to remove item');
      }

      const fresh = await fetch(`/api/public/cart/${c.cartUuid}`, {
        cache: 'no-store',
      });

      const freshData = await fresh.json();
      syncCart(freshData);

    } catch (e: any) {
      setErr(e.message || 'Something went wrong');
    } finally {
      setBusyKey(null);
    }
  }

  async function clearCart() {
    if (!hasItems) return;

    if (!confirm('Are you sure you want to clear all votes?')) return;

    setClearing(true);

    try {
      await fetch(`/api/cart/${c.cartUuid}/clear`, { method: 'DELETE' });

      localStorage.removeItem('cartUuid');
      localStorage.setItem('cartCount', '0');
      window.dispatchEvent(new Event('cartUpdated'));

      window.location.assign('/vote');
    } finally {
      setClearing(false);
    }
  }

  async function pay() {
    setErr(null);

    if (!email.trim()) {
      return setErr('Email is required');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartUuid: c.cartUuid, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Payment failed');
      }

      window.location.assign(
        data.authorization_url || data?.data?.authorization_url
      );

    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {grouped.length > 1 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          You are voting across multiple polls. All selections will be paid together.
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {!hasItems && (
        <div className="text-center text-gray-500 py-10">
          Your cart is empty
        </div>
      )}

      {hasItems && grouped.map(([pollId, items]) => (
        <div key={pollId} className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">
            🗳️ {items[0].electionTitle || `Poll ${pollId}`}
          </h2>

          {items.map((i) => {
            const key = `${i.electionId}:${i.candidateId}`;
            const busy = busyKey === key;
            const name = i.candidateName || `Nominee ${i.candidateId}`;

            return (
              <div key={key} className="rounded-2xl border bg-white p-4 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  {i.photoUrl ? (
                    <img src={i.photoUrl} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center font-semibold text-gray-600">
                      {name[0]}
                    </div>
                  )}

                  <div>
                    <div className="font-semibold text-gray-900">{name}</div>

                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => updateQty(i, i.voteQty - 1)} disabled={busy || i.voteQty <= 1} className="w-8 h-8 rounded-lg border">−</button>

                      <input
                        type="number"
                        min={1}
                        value={i.voteQty}
                        onChange={(e) => {
                          const num = Number(e.target.value);
                          if (!Number.isNaN(num) && num >= 1) {
                            updateQty(i, num);
                          }
                        }}
                        disabled={busy}
                        className="w-14 h-8 rounded-lg border text-center text-sm"
                      />

                      <button onClick={() => updateQty(i, i.voteQty + 1)} disabled={busy} className="w-8 h-8 rounded-lg bg-black text-white">+</button>

                      <button onClick={() => removeItem(i)} disabled={busy} className="text-xs text-red-600 ml-2">Remove</button>
                    </div>
                  </div>
                </div>

                <div className="font-semibold">{money(i.subTotal)}</div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="rounded-2xl border bg-white p-4 shadow-sm flex justify-between">
        <span>Total</span>
        <span className="text-lg font-semibold">{money(c.totalAmount)}</span>
      </div>

      <button
        onClick={clearCart}
        disabled={clearing || !hasItems}
        className="w-full rounded-xl border border-red-300 text-red-600 py-3 font-semibold"
      >
        {clearing ? 'Clearing...' : 'Clear Cart'}
      </button>

      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border px-4 py-3"
        />

        <button
          onClick={pay}
          disabled={!hasItems || loading || paidLike || clearing}
          className="w-full rounded-xl bg-black text-white py-3 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Pay with Paystack'}
        </button>
      </div>
    </div>
  );
}