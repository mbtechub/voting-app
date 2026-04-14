'use client';

import { useMemo, useState, useEffect } from 'react';

type Nominee = {
  candidateId: number;
  name: string;
  photoUrl?: string | null;
};

type AddedCartState = {
  open: boolean;
  cartUuid: string;
};

function isNonEditableCartError(message: string) {
  const m = (message || '').toUpperCase();
  return (
    m.includes('CART IS NOT EDITABLE') ||
    m.includes('STATUS: PAID') ||
    m.includes('STATUS: SUCCESS') ||
    m.includes('STATUS: PARTIALLY_APPLIED')
  );
}

export default function VotePollListClient({
  electionId,
  nominees,
  disabled,
}: {
  electionId: number;
  nominees: Nominee[];
  disabled: boolean;
}) {
  const [qtyById, setQtyById] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCart, setAddedCart] = useState<AddedCartState>({
    open: false,
    cartUuid: '',
  });

  const selectedItems = useMemo(() => {
    return (nominees || [])
      .map((n) => ({
        candidateId: n.candidateId,
        name: n.name,
        voteQty: qtyById[n.candidateId] ?? 0,
      }))
      .filter((x) => x.voteQty > 0);
  }, [nominees, qtyById]);

  useEffect(() => {
    const totalVotes = selectedItems.reduce(
      (sum, item) => sum + item.voteQty,
      0
    );
    localStorage.setItem('selectedVoteCount', String(totalVotes));
  }, [selectedItems]);

  function inc(id: number) {
    setQtyById((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + 1,
    }));
  }

  function dec(id: number) {
    setQtyById((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) - 1),
    }));
  }

  function resetSelections() {
    setQtyById({});
  }

  async function createFreshCart() {
    const createRes = await fetch('/api/public/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        items: selectedItems.map((x) => ({
          electionId,
          candidateId: x.candidateId,
          voteQty: x.voteQty,
        })),
      }),
    });

    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok) {
      throw new Error(
        createData?.message || createData?.error || 'Failed to create cart'
      );
    }

    const cartUuid = createData?.cartUuid || '';
    if (!cartUuid) {
      throw new Error('Cart created but cartUuid missing in response');
    }

    window.localStorage.setItem('cartUuid', cartUuid);
    localStorage.setItem('selectedVoteCount', '0');

    return cartUuid;
  }

  async function addItemsToExistingCart(cartUuid: string) {
    for (const item of selectedItems) {
      const addRes = await fetch(`/api/cart/${cartUuid}/item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          electionId,
          candidateId: item.candidateId,
          voteQty: item.voteQty,
        }),
      });

      const addData = await addRes.json().catch(() => ({}));
      if (!addRes.ok) {
        throw new Error(
          addData?.message || addData?.error || 'Failed to add item to cart'
        );
      }
    }

    return cartUuid;
  }

  async function addToCart() {
    setError(null);

    if (disabled) return setError('This poll is not active.');
    if (selectedItems.length === 0)
      return setError('Select votes for at least one nominee.');

    setLoading(true);
    try {
      const existingCartUuid =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('cartUuid')
          : null;

      let finalCartUuid = existingCartUuid?.trim() || '';

      if (!finalCartUuid) {
        finalCartUuid = await createFreshCart();
      } else {
        try {
          finalCartUuid = await addItemsToExistingCart(finalCartUuid);
        } catch (e: any) {
          const message = e?.message || '';

          if (isNonEditableCartError(message)) {
            window.localStorage.removeItem('cartUuid');
            finalCartUuid = await createFreshCart();
          } else {
            throw e;
          }
        }
      }

      resetSelections();
      setAddedCart({ open: true, cartUuid: finalCartUuid });
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (!nominees || nominees.length === 0) {
    return (
      <div className="rounded-2xl border bg-white dark:bg-slate-900 p-6 text-sm text-gray-700 dark:text-gray-300 shadow-sm">
        No nominees found for this poll.
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* NOMINEE CARDS */}
      <div className="grid gap-4 sm:grid-cols-2">
        {nominees.map((n) => {
          const qty = qtyById[n.candidateId] ?? 0;
          const hasImage = !!n.photoUrl && n.photoUrl.trim() !== '';

          return (
            <div
              key={n.candidateId}
              className="rounded-2xl border bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition"
            >
              {/* HEADER */}
              <div className="flex items-center gap-3">
                {hasImage ? (
                  <img
                    src={n.photoUrl!}
                    className="w-12 h-12 rounded-xl object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget
                        .nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}

                <div
                  className={`w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center font-semibold text-gray-600 dark:text-gray-300 ${
                    hasImage ? 'hidden' : 'flex'
                  }`}
                >
                  {n.name?.[0]}
                </div>

                <div className="font-semibold text-gray-900 dark:text-white">
                  {n.name}
                </div>
              </div>

              {/* CONTROLS */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* DECREMENT */}
                  <button
                    onClick={() => dec(n.candidateId)}
                    disabled={disabled || qty === 0 || loading}
                    className="w-9 h-9 rounded-lg border dark:border-slate-700"
                  >
                    −
                  </button>

                  {/* INPUT FIELD */}
                  <input
                    type="number"
                    min={0}
                    value={qty === 0 ? '' : qty}
                    onChange={(e) => {
                      const val = e.target.value;

                      if (val === '') {
                        setQtyById((prev) => ({
                          ...prev,
                          [n.candidateId]: 0,
                        }));
                        return;
                      }

                      const num = Number(val);

                      if (!Number.isNaN(num) && num >= 0) {
                        setQtyById((prev) => ({
                          ...prev,
                          [n.candidateId]: num,
                        }));
                      }
                    }}
                    disabled={disabled || loading}
                    className="w-14 h-9 text-center rounded-lg border dark:border-slate-700 bg-transparent"
                  />

                  {/* INCREMENT */}
                  <button
                    onClick={() => inc(n.candidateId)}
                    disabled={disabled || loading}
                    className="w-9 h-9 rounded-lg bg-black text-white"
                  >
                    +
                  </button>
                </div>

                {qty > 0 && (
                  <div className="text-xs text-gray-500">
                    {qty} selected
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ACTION BAR */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Selected nominees:{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {selectedItems.length}
          </span>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={resetSelections}
            disabled={loading || selectedItems.length === 0}
            className="flex-1 rounded-xl border px-4 py-2 text-sm dark:border-slate-700"
          >
            Reset
          </button>

          <button
            onClick={addToCart}
            disabled={disabled || loading || selectedItems.length === 0}
            className="flex-1 rounded-xl bg-black px-5 py-2 text-sm text-white"
          >
            {loading ? 'Adding…' : 'Add to cart'}
          </button>
        </div>
      </div>

      {/* MODAL */}
      {addedCart.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Added to cart</h3>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setAddedCart({ open: false, cartUuid: '' })}
                className="flex-1 border px-4 py-2 rounded-xl dark:border-slate-700"
              >
                Continue
              </button>

              <button
                onClick={() =>
                  window.location.assign(`/cart/${addedCart.cartUuid}`)
                }
                className="flex-1 bg-black text-white px-4 py-2 rounded-xl"
              >
                View cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}