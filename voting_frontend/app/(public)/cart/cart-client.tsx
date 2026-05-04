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

  // LOAD CART
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

  const status = (cart?.status || '').toUpperCase();

  const paidLike = useMemo(() => isPaidLikeStatus(status), [status]);
  const isPayable = useMemo(() => status === 'PENDING', [status]);
  const hasItems = (cart?.items?.length ?? 0) > 0;

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

  // ✅ FIXED: REMOVE BAD REDIRECT
  useEffect(() => {
    if (!cart) return;

    if (isPaidLikeStatus(cart.status)) {
      localStorage.removeItem('cartUuid');
      localStorage.setItem('cartCount', '0');
      window.dispatchEvent(new Event('cartUpdated'));

      // ❌ DO NOT REDIRECT HERE
      // Let Paystack → backend → receipt handle navigation
    }
  }, [cart?.status]);

  if (!cart && loadingInit) {
    return <div className="p-6">Loading cart...</div>;
  }

  if (!cart) {
    return <div className="p-6">No cart found.</div>;
  }

  const c = cart;

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
      {/* UI unchanged */}
    </div>
  );
}