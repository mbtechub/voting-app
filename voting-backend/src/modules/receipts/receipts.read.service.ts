import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ReceiptsService } from './receipts.service';

import { Payment } from '../payments/entities/payment.entity';
import { Cart } from '../cart/entities/cart.entity';
import { VoteLog } from '../votes/entities/vote-log.entity';
import { Candidate } from '../candidates/entities/candidate.entity';

type ReceiptItemDto = {
  cartItemId: number | null;
  voteLogId: number;
  election: { electionId: number; title: string };
  candidate: { candidateId: number; name: string };
  voteQty: number;
  pricePerVote: number;
  subTotal: number;
  outcome: {
    applyStatus: string;
    skipReason: string | null;
    createdAt: Date;
  };
};

function isFinalishStatus(status?: string | null) {
  const s = (status || '').toUpperCase();
  return s === 'SUCCESS' || s === 'PARTIALLY_APPLIED' || s === 'FAILED';
}

@Injectable()
export class ReceiptsReadService {
  constructor(
    private readonly receiptsService: ReceiptsService,

    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,

    @InjectRepository(VoteLog)
    private readonly voteLogRepo: Repository<VoteLog>,

    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
  ) {}

  async getReceiptByReference(reference: string) {
    const pdfUrl = `/api/public/receipt/${encodeURIComponent(reference)}/pdf`;

    // 1️⃣ Snapshot-first (immutable)
    // ✅ If snapshot exists AND is FINAL => return it (immutable rule)
    // ✅ If snapshot exists but is NOT final (e.g. INITIATED) => rebuild from DB and attempt upsert
    const snapshot = await this.receiptsService.getSnapshotDto(reference);

    if (snapshot) {
      const snapStatus = (snapshot?.payment?.status || '').toUpperCase();
      if (isFinalishStatus(snapStatus)) {
        return { ...snapshot, pdfUrl };
      }
      // Not final → fall through to rebuild
    }

    // 2️⃣ Load payment + cart
    const payment = await this.paymentRepo.findOne({
      where: { paystackRef: reference },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const cart = await this.cartRepo.findOne({
      where: { cartId: payment.cartId },
    });
    if (!cart) throw new NotFoundException('Cart not found');

    // 3️⃣ Load vote logs
    const voteLogs = await this.voteLogRepo.find({
      where: { reference },
      order: { voteLogId: 'ASC' as any },
    });

    // 4️⃣ Load candidates (real names)
    const candidateIds = Array.from(new Set(voteLogs.map((v) => v.candidateId)));

    const candidates = candidateIds.length
      ? await this.candidateRepo.find({
          where: { candidateId: In(candidateIds) },
        })
      : [];

    const candidateMap = new Map<number, Candidate>(
      candidates.map((c) => [c.candidateId, c]),
    );

    // 5️⃣ Build receipt items
    const items: ReceiptItemDto[] = [];

    let itemsTotal = 0;
    let appliedTotal = 0;
    let skippedTotal = 0;

    for (const vl of voteLogs) {
      const subTotal = Number(vl.subTotal || 0);
      itemsTotal += subTotal;

      if ((vl.applyStatus || '').toUpperCase() === 'APPLIED') appliedTotal += subTotal;
      if ((vl.applyStatus || '').toUpperCase() === 'SKIPPED') skippedTotal += subTotal;

      const candidate = candidateMap.get(vl.candidateId);

      items.push({
        cartItemId: vl.cartItemId ?? null,
        voteLogId: vl.voteLogId,
        election: {
          electionId: vl.electionId,
          title: `Election ${vl.electionId}`, // optional: enrich later from ELECTIONS
        },
        candidate: {
          candidateId: vl.candidateId,
          name: candidate?.name ?? 'Unknown Candidate',
        },
        voteQty: vl.voteQty,
        pricePerVote: vl.pricePerVote,
        subTotal: vl.subTotal,
        outcome: {
          applyStatus: vl.applyStatus,
          skipReason: vl.skipReason ?? null,
          createdAt: vl.createdAt,
        },
      });
    }

    // 6️⃣ Final receipt DTO (same shape + pdfUrl)
    const receiptDto = {
      lookupKey: reference,
      receiptId: reference,
      payment: {
        paystackRef: payment.paystackRef,
        status: payment.status,
        amount: payment.amount,
        paidAt: payment.paidAt,
      },
      cart: {
        cartId: cart.cartId,
        cartUuid: cart.cartUuid,
        status: cart.status,
        totalAmount: cart.totalAmount,
      },
      items,
      summary: {
        itemsTotal,
        appliedTotal,
        skippedTotal,
      },
      pdfUrl,
    };

    // 7️⃣ Backfill/Update RECEIPTS (legacy-safe, idempotent)
    // ✅ With OPTION 1, ReceiptsService must enforce immutability:
    // - If existing receipt is FINAL => this call must become a no-op (except pdfHash if null)
    // - If existing receipt is INITIATED => update it to final snapshot/status
    await this.receiptsService.createIfMissing({
      reference,
      paymentId: payment.paymentId,
      cartId: cart.cartId,
      status: payment.status as any,
      amount: Number(payment.amount),
      currency: 'NGN',
      pdfVersion: 'v1',
      pdfHash: null,
      snapshot: receiptDto,
    });

    // Always return rebuilt receipt DTO
    return receiptDto;
  }
}
