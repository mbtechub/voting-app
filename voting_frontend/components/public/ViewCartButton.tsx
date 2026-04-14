'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';

export default function ViewCartButton() {
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [cartUuid, setCartUuid] = useState<string | null>(null);

 async function loadCart() {
  try {
    const uuid = localStorage.getItem('cartUuid');
    setCartUuid(uuid);

    // always reset first
    setCount(0);

    // no cart → nothing to load
    if (!uuid) return;

    const res = await fetch(`/api/public/cart/${uuid}`, {
      cache: 'no-store',
    });

    // if cart no longer exists → clean state
    if (!res.ok) {
      localStorage.removeItem('cartUuid');
      localStorage.setItem('cartCount', '0');
      setCount(0);
      return;
    }

    const data = await res.json();

    // ✅ YOUR RULE: count = number of nominees (items)
    const itemCount = data.items?.length || 0;

    setCount(itemCount);

    // sync storage
    localStorage.setItem('cartCount', String(itemCount));

    // if cart is empty → remove uuid (prevents ghost cart)
    if (itemCount === 0) {
      localStorage.removeItem('cartUuid');
    }

    // pulse animation
    setPulse(true);
    setTimeout(() => setPulse(false), 400);

  } catch {
    setCount(0);
  }
}

  function goToCart() {
    if (!cartUuid) {
      return alert('No active cart yet.');
    }

    window.location.assign(`/cart/${cartUuid}`);
  }

  useEffect(() => {
    loadCart();

    const onFocus = () => loadCart();
    const onCartUpdate = () => loadCart();

    window.addEventListener('focus', onFocus);
    window.addEventListener('cartUpdated', onCartUpdate);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('cartUpdated', onCartUpdate);
    };
  }, []);

  return (
    <button
      onClick={goToCart}
      className="relative flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium bg-white shadow-sm hover:shadow-md hover:border-gray-400 active:scale-[0.97] transition-all duration-200"
    >
      {/* ICON */}
      <ShoppingCart size={16} className="text-gray-700" />

      {/* TEXT */}
      <span className="text-gray-900 font-medium">Vote Cart</span>

      {/* BADGE */}
      {count > 0 && (
        <span
          className={`absolute -top-2 -right-2 z-10 min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-lg ring-2 ring-white ${
            pulse ? 'animate-ping-once' : ''
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}