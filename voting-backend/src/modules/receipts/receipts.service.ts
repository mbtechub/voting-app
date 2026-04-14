import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Receipt } from './entities/receipt.entity';

type Snapshot = Record<string, any>;

function sha256Hex(input: string) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

// Stable stringify so hash doesn’t change due to object key order
function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  const body = keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(',');
  return `{${body}}`;
}

function isFinalStatus(status?: string | null) {
  const s = (status || '').toUpperCase();
  return s === 'SUCCESS' || s === 'PARTIALLY_APPLIED';
}

/**
 * ✅ Ensure receipt snapshot contains Poll Title + Nominee Name
 *
 * We keep backend naming as election/candidate, but in snapshot we write:
 * - pollTitle
 * - nomineeName
 *
 * Works for both:
 * - item.electionTitle / item.pollTitle
 * - item.candidateName / item.nomineeName
 */
function normalizeSnapshot(snapshot: Snapshot): Snapshot {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;

  const items = Array.isArray(snapshot.items) ? snapshot.items : null;
  if (!items) return snapshot;

  const normalizedItems = items.map((it: any) => {
    if (!it || typeof it !== 'object') return it;

    const pollTitle =
      (it.pollTitle || it.electionTitle || it.title || '').toString().trim() ||
      undefined;

    const nomineeName =
      (it.nomineeName || it.candidateName || it.name || '').toString().trim() ||
      undefined;

    return {
      ...it,
      ...(pollTitle ? { pollTitle } : {}),
      ...(nomineeName ? { nomineeName } : {}),
    };
  });

  return { ...snapshot, items: normalizedItems };
}

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptsRepo: Repository<Receipt>,
  ) {}

  async findByReference(reference: string): Promise<Receipt | null> {
    return this.receiptsRepo.findOne({ where: { reference } });
  }

  /**
   * UPSERT (transactional) + IMMUTABILITY LOCK
   * - If missing: INSERT
   * - If exists and FINAL: freeze (only allow pdfHash set once if null)
   * - If exists and NOT final: UPDATE to latest snapshot (e.g., INITIATED -> SUCCESS)
   *
   * MUST be called inside the same DB transaction as webhook vote application.
   */
  async createIfMissingTx(
    manager: EntityManager,
    input: {
      reference: string;
      paymentId: number;
      cartId: number;
      status: string; // allow INITIATED/SUCCESS/PARTIALLY_APPLIED/etc (DB already has INITIATED)
      amount: number;
      currency?: string;
      snapshot: Snapshot;
      pdfVersion?: string;
      pdfHash?: string | null;
    },
  ): Promise<Receipt> {
    const repo = manager.getRepository(Receipt);

    const existing = await repo.findOne({
      where: { reference: input.reference },
    });

    // ✅ Ensure snapshot has pollTitle/nomineeName before hashing/saving
    const normalizedSnapshot = normalizeSnapshot(input.snapshot);

    // ✅ INSERT if missing
    if (!existing) {
      const snapshotStable = stableStringify(normalizedSnapshot);
      const snapshotHash = sha256Hex(snapshotStable);

      const receipt = repo.create({
        reference: input.reference,
        paymentId: input.paymentId,
        cartId: input.cartId,
        status: input.status as any,
        amount: input.amount,
        currency: input.currency ?? 'NGN',
        snapshotJson: JSON.stringify(normalizedSnapshot),
        snapshotHash,
        pdfVersion: input.pdfVersion ?? 'v1',
        pdfHash: input.pdfHash ?? null,
      });

      return repo.save(receipt);
    }

    // ✅ IMMUTABILITY LOCK: once final, never mutate snapshot/status/etc
    if (isFinalStatus(existing.status)) {
      // allow setting PDF hash once (NULL -> value) but never overwrite
      if (!existing.pdfHash && input.pdfHash) {
        existing.pdfHash = input.pdfHash;
        return repo.save(existing);
      }
      return existing;
    }

    // ✅ NOT final yet: update to latest (INITIATED -> SUCCESS / PARTIALLY_APPLIED)
    const snapshotStable = stableStringify(normalizedSnapshot);
    const snapshotHash = sha256Hex(snapshotStable);

    existing.paymentId = input.paymentId;
    existing.cartId = input.cartId;
    (existing as any).status = input.status as any;
    existing.amount = input.amount;
    existing.currency = input.currency ?? existing.currency ?? 'NGN';
    existing.snapshotJson = JSON.stringify(normalizedSnapshot);
    existing.snapshotHash = snapshotHash;
    existing.pdfVersion = input.pdfVersion ?? existing.pdfVersion ?? 'v1';

    // never wipe an existing pdfHash
    if (!existing.pdfHash && input.pdfHash) {
      existing.pdfHash = input.pdfHash;
    }

    return repo.save(existing);
  }

  /**
   * UPSERT (non-transactional) + IMMUTABILITY LOCK
   * - If missing: INSERT
   * - If exists and FINAL: freeze (only allow pdfHash set once if null)
   * - If exists and NOT final: UPDATE to latest snapshot
   *
   * Best-effort backfill for legacy receipts.
   */
  async createIfMissing(input: {
    reference: string;
    paymentId: number;
    cartId: number;
    status: string;
    amount: number;
    currency?: string;
    snapshot: Snapshot;
    pdfVersion?: string;
    pdfHash?: string | null;
  }): Promise<Receipt | null> {
    const existing = await this.receiptsRepo.findOne({
      where: { reference: input.reference },
    });

    // ✅ Ensure snapshot has pollTitle/nomineeName before hashing/saving
    const normalizedSnapshot = normalizeSnapshot(input.snapshot);

    // ✅ INSERT if missing
    if (!existing) {
      const snapshotStable = stableStringify(normalizedSnapshot);
      const snapshotHash = sha256Hex(snapshotStable);

      try {
        const receipt = this.receiptsRepo.create({
          reference: input.reference,
          paymentId: input.paymentId,
          cartId: input.cartId,
          status: input.status as any,
          amount: input.amount,
          currency: input.currency ?? 'NGN',
          snapshotJson: JSON.stringify(normalizedSnapshot),
          snapshotHash,
          pdfVersion: input.pdfVersion ?? 'v1',
          pdfHash: input.pdfHash ?? null,
        });

        return await this.receiptsRepo.save(receipt);
      } catch (e: any) {
        // another request created it concurrently
        if (String(e?.message || '').includes('ORA-00001')) {
          return await this.receiptsRepo.findOne({
            where: { reference: input.reference },
          });
        }
        throw e;
      }
    }

    // ✅ IMMUTABILITY LOCK: once final, never mutate snapshot/status/etc
    if (isFinalStatus(existing.status)) {
      // allow setting PDF hash once (NULL -> value) but never overwrite
      if (!existing.pdfHash && input.pdfHash) {
        existing.pdfHash = input.pdfHash;
        return await this.receiptsRepo.save(existing);
      }
      return existing;
    }

    // ✅ NOT final yet: update to latest (INITIATED -> SUCCESS / PARTIALLY_APPLIED)
    const snapshotStable = stableStringify(normalizedSnapshot);
    const snapshotHash = sha256Hex(snapshotStable);

    existing.paymentId = input.paymentId;
    existing.cartId = input.cartId;
    (existing as any).status = input.status as any;
    existing.amount = input.amount;
    existing.currency = input.currency ?? existing.currency ?? 'NGN';
    existing.snapshotJson = JSON.stringify(normalizedSnapshot);
    existing.snapshotHash = snapshotHash;
    existing.pdfVersion = input.pdfVersion ?? existing.pdfVersion ?? 'v1';

    if (!existing.pdfHash && input.pdfHash) {
      existing.pdfHash = input.pdfHash;
    }

    return await this.receiptsRepo.save(existing);
  }

  /**
   * Snapshot-first read helper: returns parsed snapshot JSON if present & valid.
   */
  async getSnapshotDto(reference: string): Promise<any | null> {
    const r = await this.findByReference(reference);
    if (!r?.snapshotJson) return null;
    try {
      return JSON.parse(r.snapshotJson);
    } catch {
      return null;
    }
  }

  /**
   * ✅ Persist PDF hash once generated (idempotent, never overwrite)
   */
  async updatePdfHash(reference: string, pdfHash: string): Promise<void> {
    const r = await this.findByReference(reference);
    if (!r) return;

    if (r.pdfHash) return; // never overwrite
    r.pdfHash = pdfHash;
    await this.receiptsRepo.save(r);
  }
}