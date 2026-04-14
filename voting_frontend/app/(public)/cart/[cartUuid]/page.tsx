import Link from 'next/link';
import { publicFetch } from '@/lib/public-api';
import CartClient from './cart-client';

export const dynamic = 'force-dynamic';

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
  cartId: number;
  cartUuid: string;
  status: string;
  totalAmount: number;
  items: CartItem[];
};

export default async function CartPage({
  params,
}: {
  params: Promise<{ cartUuid: string }>;
}) {
  const { cartUuid: cartUuidRaw } = await params;
  const cartUuid = (cartUuidRaw || '').trim();

  if (!cartUuid) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-700">
          Missing cart UUID.
        </div>
      </main>
    );
  }

  let cart: CartResponse | null = null;

  try {
cart = await publicFetch<CartResponse>(`/api/public/cart/${cartUuid}`);  } catch (e) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-700">
          Failed to load cart.
        </div>
      </main>
    );
  }

  if (!cart) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-700">
          Cart not found.
        </div>
      </main>
    );
  }

  const firstPollId = cart.items?.[0]?.electionId;
  const continueHref = firstPollId ? `/vote/${firstPollId}` : '/vote';

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        
        {/* LEFT SIDE */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Your Selected Votes
          </h1>
          <p className="text-sm text-gray-600">
            Review your selections and proceed to payment.
          </p>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex gap-2 w-full sm:w-auto">
          <Link
            href={continueHref}
            className="flex-1 sm:flex-none text-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition"
          >
            ← Continue Voting
          </Link>

          <Link
            href="/vote"
            className="flex-1 sm:flex-none text-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            All Polls
          </Link>
        </div>
      </div>

      {/* EMPTY STATE */}
      {(!cart.items || cart.items.length === 0) && (
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-700 text-center">
          Your cart is empty.
          <div className="mt-4">
            <Link
              href="/vote"
              className="inline-block rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Browse Polls
            </Link>
          </div>
        </div>
      )}

      {/* CART CONTENT */}
      {cart.items && cart.items.length > 0 && (
        <CartClient cart={cart} />
      )}
    </main>
  );
}