export type ReceiptPaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'PARTIALLY_APPLIED';

export type ReceiptApplyStatus = 'APPLIED' | 'SKIPPED';

export class ReceiptLineDto {
  electionId: number;
  electionTitle: string;
  candidateId: number;
  candidateName: string;

  voteQty: number;
  pricePerVote: number;
  subTotal: number;

  applyStatus: ReceiptApplyStatus;
  skipReason?: string | null;
  appliedAt?: string | null;
}

export class ReceiptDto {
  reference: string;
  paymentStatus: ReceiptPaymentStatus;
  amount: number; // in NGN (or kobo -> normalize consistently)
  paidAt?: string | null;

  cartId: number;
  cartUuid: string;
  cartStatus: string;
  cartTotalAmount: number;

  lines: ReceiptLineDto[];
}
