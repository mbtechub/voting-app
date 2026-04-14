import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { createHash } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { ReceiptsService } from '../receipts/receipts.service';
import { VoteLog } from '../votes/entities/vote-log.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Election } from '../elections/entities/election.entity';
import { WebhookEvent } from './entities/webhook-event.entity';

type PaystackWebhookInput = {
  rawBody: Buffer;
  body: any;
  signature?: string;
};

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(WebhookEvent)
    private readonly webhookEventRepo: Repository<WebhookEvent>,

    private readonly dataSource: DataSource,
    private readonly receiptsService: ReceiptsService,
    private readonly configService: ConfigService,
  ) {}

  // ===================================================
  // Webhook event logging helpers
  // ===================================================
  private sha256HexBuf(buf: Buffer) {
    return createHash('sha256').update(buf).digest('hex');
  }

  private safeJsonStringify(value: any) {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  private getClientIp(req: any): string | null {
    const xff = (req?.headers?.['x-forwarded-for'] || '').toString();
    if (xff) return xff.split(',')[0].trim() || null;
    return (req?.ip || null) as string | null;
  }

  private async createOrGetWebhookEvent(input: {
    provider: string;
    route: string | null;
    ipAddress: string | null;
    eventName: string | null;
    reference: string | null;
    paystackTxId: number | null;
    signaturePresent: 'Y' | 'N';
    signatureValid: 'Y' | 'N';
    processed: 'Y' | 'N';
    processResult: string | null;
    errorMessage: string | null;
    requestHash: string;
    headersJson: string | null;
    payloadJson: string | null;
  }): Promise<WebhookEvent | null> {
    const requestHash = input.requestHash;

    try {
      await this.webhookEventRepo.insert({
        provider: input.provider,
        route: input.route,
        ipAddress: input.ipAddress,
        eventName: input.eventName,
        reference: input.reference,
        paystackTxId: input.paystackTxId,
        paymentId: null,
        cartId: null,
        signaturePresent: input.signaturePresent,
        signatureValid: input.signatureValid,
        processed: input.processed,
        processResult: input.processResult,
        errorMessage: input.errorMessage,
        requestHash,
        headersJson: input.headersJson,
        payloadJson: input.payloadJson,
      } as any);

      return await this.webhookEventRepo.findOne({ where: { requestHash } });
    } catch (e: any) {
      if (String(e?.message || '').includes('ORA-00001')) {
        return await this.webhookEventRepo.findOne({ where: { requestHash } });
      }
      return null;
    }
  }

  private async updateWebhookEvent(
    evt: WebhookEvent | null,
    patch: Partial<WebhookEvent>,
  ) {
    if (!evt) return;
    try {
      await this.webhookEventRepo.update(
        { webhookEventId: (evt as any).webhookEventId },
        patch as any,
      );
    } catch {
      // never break webhook flow due to logging update
    }
  }

  // ===================================================
  // ENTRY: called from controller with req
  // ===================================================
  async handlePaystackWebhook(req: any) {
    const startedAtMs = Date.now();

    const signature =
      (req?.get?.('x-paystack-signature') ||
        req?.headers?.['x-paystack-signature']) as string | undefined;

    const rawBody: Buffer =
      req?.rawBody && Buffer.isBuffer(req.rawBody)
        ? req.rawBody
        : Buffer.isBuffer(req?.body)
          ? req.body
          : Buffer.from(JSON.stringify(req?.body ?? {}));

    const requestHash = this.sha256HexBuf(rawBody);

    const route =
      (req?.originalUrl || req?.url || '').toString()?.trim() || null;
    const ipAddress = this.getClientIp(req);

    const eventName = (req?.body?.event || '').toString()?.trim() || null;
    const reference =
      (req?.body?.data?.reference || '').toString()?.trim() || null;

    const paystackTxId =
      typeof req?.body?.data?.id === 'number' ? req.body.data.id : null;

    const evt = await this.createOrGetWebhookEvent({
      provider: 'PAYSTACK',
      route,
      ipAddress,
      eventName,
      reference,
      paystackTxId,
      signaturePresent: signature ? 'Y' : 'N',
      signatureValid: 'N',
      processed: 'N',
      processResult: null,
      errorMessage: null,
      requestHash,
      headersJson: this.safeJsonStringify(req?.headers ?? null),
      payloadJson: rawBody.toString('utf8'),
    });

    const input: PaystackWebhookInput = {
      rawBody,
      body: req?.body,
      signature,
    };

    try {
      const result = await this.handlePaystackWebhookInternal(input);

      let paymentId: number | null = null;
      let cartId: number | null = null;

      if (reference) {
        const p = await this.paymentRepo.findOne({
          where: { paystackRef: reference },
          select: ['paymentId', 'cartId'] as any,
        });
        paymentId = (p as any)?.paymentId ?? null;
        cartId = (p as any)?.cartId ?? null;
      }

      await this.updateWebhookEvent(evt, {
        signatureValid: 'Y',
        processed: 'Y',
        processResult: result ?? 'OK',
        errorMessage: null,
        paymentId,
        cartId,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
      } as any);

      return { ok: true };
    } catch (err: any) {
      const msg = String(err?.message || err || 'Webhook error');

      let paymentId: number | null = null;
      let cartId: number | null = null;

      if (reference) {
        try {
          const p = await this.paymentRepo.findOne({
            where: { paystackRef: reference },
            select: ['paymentId', 'cartId'] as any,
          });
          paymentId = (p as any)?.paymentId ?? null;
          cartId = (p as any)?.cartId ?? null;
        } catch {
          // ignore
        }
      }

      const isSigError = msg.toLowerCase().includes('signature');

      await this.updateWebhookEvent(evt, {
        signatureValid: isSigError ? 'N' : 'Y',
        processed: 'N',
        processResult: isSigError ? 'INVALID_SIGNATURE' : 'ERROR',
        errorMessage: msg.slice(0, 1000),
        paymentId,
        cartId,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
      } as any);

      return { ok: true };
    }
  }

  // ===================================================
  // INTERNAL: Webhook entry point (HARDENED)
  // ===================================================
  private async handlePaystackWebhookInternal(
    input: PaystackWebhookInput,
  ): Promise<string> {
    this.assertValidPaystackSignature(input.rawBody, input.signature);

    const event = (input.body?.event || '').toString();
    if (event !== 'charge.success') return 'IGNORED_NON_SUCCESS_EVENT';

    const paystackRef: string | undefined = input.body?.data?.reference;
    if (!paystackRef) return 'IGNORED_NO_REFERENCE';

    const existing = await this.paymentRepo.findOne({
      where: { paystackRef },
      select: ['paymentId', 'cartId', 'status', 'paystackRef'],
    });

    if (existing) {
      const st = (existing.status || '').toUpperCase();
      if (st === 'SUCCESS' || st === 'PARTIALLY_APPLIED') return 'ALREADY_FINAL';
    }

    const verify = await this.verifyPaystackTransaction(paystackRef);
    const vData = verify?.data;

    if (!verify?.status) return 'VERIFY_FAILED';
    if ((vData?.status || '').toLowerCase() !== 'success')
      return 'VERIFY_NOT_SUCCESS';

    if ((vData?.currency || '').toUpperCase() !== 'NGN') {
      throw new ForbiddenException('Only NGN transactions are supported');
    }

    if ((vData?.reference || '') !== paystackRef) {
      throw new BadRequestException('Paystack reference mismatch');
    }

    await this.markPaymentSuccess(paystackRef, input.body, vData);
    return 'FINALIZED';
  }

  // ===================================================
  // Verify Paystack transaction by reference
  // ===================================================
  private async verifyPaystackTransaction(reference: string) {
    const secret = (this.configService.get<string>('PAYSTACK_SECRET_KEY') || '')
      .trim();
    if (!secret) {
      throw new BadRequestException('PAYSTACK_SECRET_KEY is not set');
    }

    const resp = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
      },
    );

    return resp.data;
  }

  // ===================================================
  // Signature validation (HEX-BYTE SAFE)
  // ===================================================
  private assertValidPaystackSignature(rawBody: Buffer, signature?: string) {
    const secret = (this.configService.get<string>('PAYSTACK_SECRET_KEY') || '')
      .trim();
    if (!secret) throw new BadRequestException('PAYSTACK_SECRET_KEY is not set');
    if (!signature)
      throw new UnauthorizedException('Missing x-paystack-signature');

    const hashHex = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    const a = Buffer.from(hashHex, 'hex');
    const b = Buffer.from(signature, 'hex');

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }
  }

  // ===================================================
  // Finalize payment + apply votes (TRANSACTIONAL)
  // ===================================================
  private async markPaymentSuccess(
    paystackRef: string,
    webhookPayload: any,
    verifiedData?: any,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager
        .createQueryBuilder(Payment, 'p')
        .setLock('pessimistic_write')
        .where('p.paystackRef = :paystackRef', { paystackRef })
        .getOne();

      if (!payment) {
        throw new NotFoundException(
          `Payment not found for PAYSTACK_REF: ${paystackRef}`,
        );
      }

      const currentStatus = String((payment as any).status || '').toUpperCase();
      if (currentStatus === 'SUCCESS' || currentStatus === 'PARTIALLY_APPLIED') {
        return payment;
      }

      const cart = await manager
        .createQueryBuilder(Cart, 'c')
        .setLock('pessimistic_write')
        .where('c.cartId = :cartId', { cartId: (payment as any).cartId })
        .getOne();

      if (!cart) {
        throw new NotFoundException(
          `Cart not found for cartId: ${(payment as any).cartId}`,
        );
      }

      // Amount validation (Paystack amount is kobo)
      if (verifiedData?.amount != null) {
        const expectedKobo = Math.round(Number((cart as any).totalAmount) * 100);
        const gotKobo = Number(verifiedData.amount);

        if (
          Number.isFinite(expectedKobo) &&
          Number.isFinite(gotKobo) &&
          expectedKobo !== gotKobo
        ) {
          (payment as any).rawResponse = JSON.stringify({
            reason: 'AMOUNT_MISMATCH',
            expectedKobo,
            gotKobo,
            webhookPayload,
            verifiedData,
          });

          await manager.save(Payment, payment);
          return payment;
        }
      }

      const items: CartItem[] = await manager
        .createQueryBuilder(CartItem, 'ci')
        .innerJoin('ci.cart', 'c')
        .where('c.cartId = :cartId', { cartId: (cart as any).cartId })
        .getMany();

      if (!items.length) {
        (payment as any).rawResponse = JSON.stringify({
          reason: 'NO_CART_ITEMS',
          webhookPayload,
          verifiedData,
        });
        await manager.save(Payment, payment);
        return payment;
      }

      const electionIds = Array.from(
        new Set((items as any[]).map((i) => i.electionId)),
      );

      const elections = electionIds.length
        ? await manager.find(Election, { where: { electionId: In(electionIds) } })
        : [];

      const electionMap = new Map<number, any>(
        elections.map((e: any) => [e.electionId, e]),
      );

      const now = new Date();
      let skippedCount = 0;
      let appliedTotal = 0;
      let skippedTotal = 0;

      for (const item of items as any[]) {
        const election = electionMap.get(item.electionId);

        const endedByStatus =
          String(election?.status || '').toUpperCase() === 'ENDED';
        const endedByDate =
          !!election?.endDate && new Date(election.endDate) <= now;

        const isValid = !!election && !endedByStatus && !endedByDate;

        if (!isValid) {
          await this.tryInsertVoteLog(manager, {
            cartId: (cart as any).cartId,
            paymentId: (payment as any).paymentId,
            reference: paystackRef,
            electionId: item.electionId,
            candidateId: item.candidateId,
            voteQty: item.voteQty,
            pricePerVote: item.pricePerVote,
            subTotal: item.subTotal,
            applyStatus: 'SKIPPED',
            skipReason: 'ELECTION_INVALID_OR_ENDED',
            createdAt: new Date(),
            cartItemId: item.cartItemId,
          });

          skippedCount++;
          skippedTotal += Number(item.subTotal || 0);
          continue;
        }

        const inserted = await this.tryInsertVoteLog(manager, {
          cartId: (cart as any).cartId,
          paymentId: (payment as any).paymentId,
          reference: paystackRef,
          electionId: item.electionId,
          candidateId: item.candidateId,
          voteQty: item.voteQty,
          pricePerVote: item.pricePerVote,
          subTotal: item.subTotal,
          applyStatus: 'APPLIED',
          skipReason: null,
          createdAt: new Date(),
          cartItemId: item.cartItemId,
        });

        if (!inserted) continue;

        await manager.query(
          `
          MERGE INTO ELECTION_RESULTS r
          USING (SELECT :1 AS election_id, :2 AS candidate_id FROM dual) s
          ON (r.election_id = s.election_id AND r.candidate_id = s.candidate_id)
          WHEN MATCHED THEN
            UPDATE SET r.vote_count = r.vote_count + :3
          WHEN NOT MATCHED THEN
            INSERT (election_id, candidate_id, vote_count)
            VALUES (:4, :5, :6)
          `,
          [
            item.electionId,
            item.candidateId,
            item.voteQty,
            item.electionId,
            item.candidateId,
            item.voteQty,
          ],
        );

        appliedTotal += Number(item.subTotal || 0);
      }

      const isPartial = skippedCount > 0;

      (payment as any).status = isPartial ? 'PARTIALLY_APPLIED' : 'SUCCESS';
      (payment as any).paidAt = (payment as any).paidAt ?? new Date();
      (payment as any).rawResponse =
        (payment as any).rawResponse ?? JSON.stringify(webhookPayload);

      await manager.save(Payment, payment);

      const cartStatus = String((cart as any).status || '').toUpperCase();
      if (cartStatus === 'PENDING') {
        (cart as any).status = isPartial ? 'PARTIALLY_APPLIED' : 'PAID';
        await manager.save(Cart, cart);
      } else {
        if (isPartial && cartStatus !== 'PARTIALLY_APPLIED') {
          (cart as any).status = 'PARTIALLY_APPLIED';
          await manager.save(Cart, cart);
        }
      }

      // ✅ Snapshot rows: Poll title + Nominee name + outcomes
      const detailRows = await manager.query(
        `
        SELECT
          ci.cart_item_id   AS "cartItemId",
          ci.election_id    AS "electionId",
          e.title           AS "electionTitle",
          ci.candidate_id   AS "candidateId",
          c.name            AS "candidateName",
          ci.vote_qty       AS "voteQty",
          ci.price_per_vote AS "pricePerVote",
          ci.sub_total      AS "subTotal",
          vl.apply_status   AS "applyStatus",
          vl.skip_reason    AS "skipReason",
          vl.created_at     AS "createdAt"
        FROM cart_items ci
        JOIN elections e
          ON e.election_id = ci.election_id
        JOIN candidates c
          ON c.candidate_id = ci.candidate_id
         AND c.election_id  = ci.election_id
        LEFT JOIN vote_logs vl
          ON vl.reference    = :1
         AND vl.cart_item_id = ci.cart_item_id
        WHERE ci.cart_id = :2
        ORDER BY ci.cart_item_id ASC
        `,
        [paystackRef, (cart as any).cartId],
      );

      const snapshotItems = (detailRows || []).map((r: any) => ({
        cartItemId: r.cartItemId ?? null,
        poll: {
          pollId: Number(r.electionId),
          title: (r.electionTitle || '').toString(),
        },
        nominee: {
          nomineeId: Number(r.candidateId),
          name: (r.candidateName || '').toString(),
        },
        voteQty: Number(r.voteQty || 0),
        pricePerVote: Number(r.pricePerVote || 0), // ✅ NUMBER (no ₦ here)
        subTotal: Number(r.subTotal || 0),         // ✅ NUMBER (no ₦ here)
        outcome: {
          applyStatus: r.applyStatus ?? null,
          skipReason: r.skipReason ?? null,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        },
      }));

      await this.receiptsService.createIfMissingTx(manager as any, {
        reference: paystackRef,
        paymentId: (payment as any).paymentId,
        cartId: (cart as any).cartId,
        status: isPartial ? 'PARTIALLY_APPLIED' : 'SUCCESS',
        amount: Number((payment as any).amount), // ✅ NUMBER (no ₦ here)
        currency: 'NGN',
        pdfVersion: 'v1',
        pdfHash: null,
        snapshot: {
          reference: paystackRef,
          status: isPartial ? 'PARTIALLY_APPLIED' : 'SUCCESS',
          paidAt:
            (payment as any).paidAt?.toISOString?.() ?? new Date().toISOString(),

          amount: Number((payment as any).amount), // ✅ NUMBER
          currency: 'NGN',

          cart: {
            cartId: Number((cart as any).cartId),
            cartUuid: (cart as any).cartUuid,
            totalAmount: Number((cart as any).totalAmount), // ✅ NUMBER
            status: (cart as any).status,
          },

          summary: {
            itemsTotal: Number((cart as any).totalAmount),
            appliedTotal: Number(appliedTotal || 0),
            skippedTotal: Number(skippedTotal || 0),
          },

          totals: {
            requestedTotal: Number((cart as any).totalAmount),
            appliedTotal: Number(appliedTotal || 0),
            skippedTotal: Number(skippedTotal || 0),
          },

          items: snapshotItems,

          paystack: {
            channel: verifiedData?.channel ?? null,
            customerEmail: verifiedData?.customer?.email ?? null,
          },
        },
      });

      return payment;
    });
  }

  private async tryInsertVoteLog(
    manager: any,
    payload: Partial<VoteLog>,
  ): Promise<boolean> {
    try {
      const log = manager.create(VoteLog, payload);
      await manager.save(VoteLog, log);
      return true;
    } catch (e: any) {
      if (String(e?.message || '').includes('ORA-00001')) return false;
      throw e;
    }
  }
}