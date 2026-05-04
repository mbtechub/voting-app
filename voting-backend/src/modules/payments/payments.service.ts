// src/modules/payments/payments.service.ts

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReceiptsService } from '../receipts/receipts.service';
import { Payment } from './entities/payment.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';

type PaystackWebhookInput = {
  rawBody: Buffer;
  body: any;
  signature?: string;
};

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly receiptsService: ReceiptsService,
  ) {}

  // ===================================================
  // INITIATE PAYMENT
  // ===================================================
  async initiatePaystack(cartUuid: string, email?: string) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new BadRequestException('PAYSTACK_SECRET_KEY is not set');
    }

    if (!process.env.FRONTEND_BASE_URL) {
      throw new BadRequestException('FRONTEND_BASE_URL is not set');
    }

    const cart = await this.dataSource
      .getRepository(Cart)
      .createQueryBuilder('c')
      .where('LOWER(TRIM(c.cartUuid)) = LOWER(TRIM(:cartUuid))', {
        cartUuid,
      })
      .getOne();

    if (!cart) throw new BadRequestException('Cart not found');

    if (cart.status !== 'PENDING') {
      throw new BadRequestException(`Cart not payable (${cart.status})`);
    }

    if (!cart.totalAmount || Number(cart.totalAmount) <= 0) {
      throw new BadRequestException('Invalid cart amount');
    }

    const paystackRef = `VOTE_${Date.now()}_${Math.floor(
      Math.random() * 100000,
    )}`;

    const payment = this.paymentRepo.create({
      cartId: cart.cartId,
      paystackRef,
      amount: Number(cart.totalAmount),
      status: 'INITIATED',
      createdAt: new Date(),
    });

    await this.paymentRepo.save(payment);

    const userEmail =
      (email && email.trim()) ||
      (process.env.PAYSTACK_DEFAULT_EMAIL || '').trim();

    if (!userEmail || !userEmail.includes('@')) {
      throw new BadRequestException('Valid email required');
    }

    const resp = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: userEmail,
        amount: Math.round(Number(cart.totalAmount) * 100),
        reference: paystackRef,
        callback_url: `${process.env.FRONTEND_BASE_URL}/receipt/${paystackRef}`,
        currency: 'NGN',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    return {
      reference: paystackRef,
      authorization_url: resp.data.data.authorization_url,
    };
  }

  // ===================================================
  // VERIFY TRANSACTION
  // ===================================================
  async verifyPaystackTransaction(reference: string) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new BadRequestException('PAYSTACK_SECRET_KEY is not set');
    }

    const resp = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference,
      )}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    return resp.data;
  }

  // ===================================================
  // WEBHOOK
  // ===================================================
  async handlePaystackWebhook(input: PaystackWebhookInput) {
    this.assertValidPaystackSignature(input.rawBody, input.signature);

    const event = input.body?.event;
    if (event !== 'charge.success') return;

    const ref = input.body?.data?.reference;
    if (typeof ref !== 'string') return;

    const existing = await this.paymentRepo.findOne({
      where: { paystackRef: ref },
    });

    const status = existing?.status;

    if (
      typeof status === 'string' &&
      ['SUCCESS', 'PARTIALLY_APPLIED'].includes(status)
    ) {
      return;
    }

    const verify = await this.verifyPaystackTransaction(ref);
    const vData = verify?.data;

    if (!verify?.status) return;
    if ((vData?.status || '').toLowerCase() !== 'success') return;

    if ((vData?.currency || '').toUpperCase() !== 'NGN') {
      throw new ForbiddenException('Only NGN supported');
    }

    if ((vData?.reference || '') !== ref) {
      throw new BadRequestException('Reference mismatch');
    }

    await this.markPaymentSuccess(ref, vData);
  }

  // ===================================================
  // SIGNATURE VALIDATION
  // ===================================================
  private assertValidPaystackSignature(
    rawBody: Buffer,
    signature?: string,
  ) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new BadRequestException('Missing Paystack key');
    }

    if (!signature) {
      throw new UnauthorizedException('Missing signature');
    }

    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    const a = Buffer.from(hash);
    const b = Buffer.from(signature);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  // ===================================================
  // FINALIZE PAYMENT (🔥 FINAL FIX)
  // ===================================================
  async markPaymentSuccess(ref: string, verifiedData: any) {
    await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { paystackRef: ref },
      });

      if (!payment) return;
      if (payment.status === 'SUCCESS') return;

      payment.status = 'SUCCESS';
      payment.paidAt = new Date();
      payment.rawResponse = JSON.stringify(verifiedData);
      await manager.save(payment);

      const cart = await manager.findOne(Cart, {
        where: { cartId: payment.cartId },
      });

      if (!cart) return;

      cart.status = 'PAID';
      await manager.save(cart);

      // ✅ FINAL FIX (NO QUERY BUILDER)
      const items = await manager.find(CartItem, {
  where: {
    cart: { cartId: cart.cartId },
  },
  relations: ['cart'],
});

      for (const item of items) {
        await manager.query(
          `
          MERGE INTO ELECTION_RESULTS r
          USING dual
          ON (r.election_id = :1 AND r.candidate_id = :2)
          WHEN MATCHED THEN
            UPDATE SET vote_count = r.vote_count + :3
          WHEN NOT MATCHED THEN
            INSERT (election_id, candidate_id, vote_count)
            VALUES (:1, :2, :3)
          `,
          [item.electionId, item.candidateId, item.voteQty],
        );

        await manager.query(
          `
          INSERT INTO VOTE_LOGS
          (REFERENCE, ELECTION_ID, CANDIDATE_ID, VOTE_QTY, STATUS)
          VALUES (:1, :2, :3, :4, 'APPLIED')
          `,
          [ref, item.electionId, item.candidateId, item.voteQty],
        );
      }

      try {
        if ('getReceiptByReference' in this.receiptsService) {
          await (this.receiptsService as any).getReceiptByReference(ref);
        }
      } catch (err: any) {
        console.warn('Receipt generation failed:', err?.message);
      }
    });
  }

  async recoverPaymentByReference(ref: string) {
    const verify = await this.verifyPaystackTransaction(ref);

    if (verify?.data?.status === 'success') {
      await this.markPaymentSuccess(ref, verify.data);
    }

    return { ok: true };
  }
}