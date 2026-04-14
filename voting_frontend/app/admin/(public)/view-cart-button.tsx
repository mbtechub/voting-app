'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CartItem = {
  voteQty?: number;
};

type CartResponse = {
  status?: string;
  items?: CartItem[];
};

export default function ViewCartButton() {
  const [cartUuid, setCartUuid] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);
  const [visible, setVisible] = useState(false);

  async function loadCart() {
    try {
      const stored = localStorage.getItem('cartUuid');

      // 🔥 HARD RESET FIRST (prevents stale UI)
      setCount(0);
      setVisible(false);

      if (!stored) {
        return;
      }

      const id = stored.trim();
      if (!id) return;

      setCartUuid(id);

      const res = await fetch(`/api/cart/${id}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        // 🔥 If fetch fails → hide cart
        setVisible(false);
        return;
      }

      const cart: CartResponse = await res.json();

      const status = (cart.status || '').toUpperCase();

      // 🔥 AUTO CLEAR PAID CART
      if (
        status === 'PAID' ||
        status === 'SUCCESS' ||
        status === 'PARTIALLY_APPLIED'
      ) {
        localStorage.removeItem('cartUuid');
        localStorage.removeItem('cartCount');
        setVisible(false);
        setCount(0);
        return;
      }

      const totalVotes = (cart.items || []).reduce(
        (sum, i) => sum + Number(i.voteQty || 0),
        0
      );

      // 🔥 SYNC EVERYTHING
      setCount(totalVotes);
      setVisible(totalVotes > 0);

      // 🔥 KEEP STORAGE CONSISTENT
      localStorage.setItem('cartCount', String(totalVotes));

    } catch (err) {
      console.error('Cart load failed:', err);

      // 🔥 DO NOT SHOW CART ON ERROR
      setVisible(false);
      setCount(0);
    }
  }

  useEffect(() => {
    loadCart();

    // 🔥 MULTIPLE TRIGGERS FOR RELIABILITY
    const handleUpdate = () => loadCart();
    const handleFocus = () => loadCart();

    window.addEventListener('cartUpdated', handleUpdate);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('cartUpdated', handleUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (!cartUuid || !visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link href={`/cart/${cartUuid}`}>
        <button className="relative rounded-full bg-blue-600 text-white px-5 py-3 shadow-lg hover:bg-blue-700 transition">
          View Cart
          {count > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-white text-blue-600 text-xs font-bold px-2 py-0.5">
              {count}
            </span>
          )}
        </button>
      </Link>
    </div>
  );
}