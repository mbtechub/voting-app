import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { ReceiptsService } from './receipts.service';

import { Election } from '../elections/entities/election.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Cart } from '../cart/entities/cart.entity';
import { VoteLog } from '../votes/entities/vote-log.entity';
import { Candidate } from '../candidates/entities/candidate.entity';

type ReceiptItemDto = {
  cartItemId: number | null;
  voteLogId: number;

  election: {
    electionId: number;
    title: string;
  };

  candidate: {
    candidateId: number;
    name: string;
  };

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

  return (
    s === 'SUCCESS' ||
    s === 'PARTIALLY_APPLIED' ||
    s === 'FAILED'
  );
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

    // ✅ NEW
    @InjectRepository(Election)
    private readonly electionRepo: Repository<Election>,
  ) {}

  async getReceiptByReference(reference: string) {
    const pdfUrl =
      `/api/public/receipt/${encodeURIComponent(reference)}/pdf`;

    // 1️⃣ TEMP: BYPASS OLD SNAPSHOTS
// Old immutable snapshots may still contain:
// "Election 14"
// instead of real DB titles.
//
// So we force rebuild fresh receipt data
// directly from DB joins.

const snapshot =
  await this.receiptsService.getSnapshotDto(reference);


if (snapshot) {
  const snapStatus =
    (snapshot?.payment?.status || '').toUpperCase();

  if (isFinalishStatus(snapStatus)) {
    return {
      ...snapshot,
      pdfUrl,
    };
  }
}


    // 2️⃣ Load payment
    const payment = await this.paymentRepo.findOne({
      where: {
        paystackRef: reference,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // 3️⃣ Load cart
    const cart = await this.cartRepo.findOne({
      where: {
        cartId: payment.cartId,
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // 4️⃣ Load vote logs
    const voteLogs = await this.voteLogRepo.find({
      where: {
        reference,
      },
      order: {
        voteLogId: 'ASC' as any,
      },
    });

    // 5️⃣ Candidate IDs
    const candidateIds = Array.from(
      new Set(voteLogs.map((v) => v.candidateId)),
    );

    // 6️⃣ Election IDs
    const electionIds = Array.from(
      new Set(voteLogs.map((v) => v.electionId)),
    );

    // 7️⃣ Load candidates
    const candidates = candidateIds.length
      ? await this.candidateRepo.find({
          where: {
            candidateId: In(candidateIds),
          },
        })
      : [];

    // 8️⃣ Load elections
    const elections = electionIds.length
      ? await this.electionRepo.find({
          where: {
            electionId: In(electionIds),
          },
        })
      : [];

    // 9️⃣ Candidate map
    const candidateMap = new Map<number, Candidate>(
      candidates.map((c) => [c.candidateId, c]),
    );

    // 🔥 NEW — Election map
    const electionMap = new Map<number, Election>(
      elections.map((e) => [e.electionId, e]),
    );

    // 🔟 Build receipt items
    const items: ReceiptItemDto[] = [];

    let itemsTotal = 0;
    let appliedTotal = 0;
    let skippedTotal = 0;

    for (const vl of voteLogs) {
      const subTotal = Number(vl.subTotal || 0);

      itemsTotal += subTotal;

      if (
        (vl.applyStatus || '').toUpperCase() === 'APPLIED'
      ) {
        appliedTotal += subTotal;
      }

      if (
        (vl.applyStatus || '').toUpperCase() === 'SKIPPED'
      ) {
        skippedTotal += subTotal;
      }

      const candidate =
        candidateMap.get(vl.candidateId);

      const election =
        electionMap.get(vl.electionId);

      items.push({
        cartItemId: vl.cartItemId ?? null,

        voteLogId: vl.voteLogId,

        election: {
          electionId: vl.electionId,

          // ✅ REAL TITLE FROM DB
          title:
            election?.title ??
            `Election ${vl.electionId}`,
        },

        candidate: {
          candidateId: vl.candidateId,

          name:
            candidate?.name ??
            'Unknown Candidate',
        },

        voteQty: vl.voteQty,

        pricePerVote: vl.pricePerVote,

        subTotal: vl.subTotal,

        outcome: {
          applyStatus: vl.applyStatus,

          skipReason:
            vl.skipReason ?? null,

          createdAt: vl.createdAt,
        },
      });
    }

    // 1️⃣1️⃣ Final DTO
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

    // 1️⃣2️⃣ Snapshot backfill
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

    return receiptDto;
  }
}