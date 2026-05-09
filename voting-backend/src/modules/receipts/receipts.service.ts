import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Receipt } from './entities/receipt.entity';

type Snapshot = Record<string, any>;

function sha256Hex(input: string) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

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

  // ===============================
  // ✅ SAFE LOB → BUFFER
  // ===============================
  private streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (!stream || typeof stream.on !== 'function') {
        return reject(new Error('Invalid LOB stream'));
      }

      const chunks: Buffer[] = [];

      stream.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  // ===============================
  // ✅ GET STORED PDF (CACHE)
  // ===============================
  async getStoredPdf(reference: string) {
    const row = await this.receiptsRepo.findOne({
      where: { reference },
      select: ['pdfBlob', 'pdfHash'],
    });

    if (!row || !row.pdfBlob) return null;

    let pdfBuffer: Buffer;

    try {
      if (Buffer.isBuffer(row.pdfBlob)) {
        pdfBuffer = row.pdfBlob;
      } else {
        pdfBuffer = await this.streamToBuffer(row.pdfBlob as any);
      }
    } catch (e) {
      console.error('LOB READ ERROR:', e);
      return null;
    }

    if (!pdfBuffer || pdfBuffer.length === 0) return null;

    return {
      pdfBlob: pdfBuffer,
      pdfHash: row.pdfHash,
    };
  }

  // ===============================
  // ✅ STORE PDF (RACE SAFE)
  // ===============================
  async storePdf(reference: string, pdf: Buffer, hash: string) {
    const r = await this.receiptsRepo.findOne({
      where: { reference },
      select: ['receiptId', 'pdfBlob', 'pdfHash'],
    });

    if (!r) return;

    if (r.pdfBlob) return; // already cached

    r.pdfBlob = pdf;
    r.pdfHash = r.pdfHash ?? hash;
    (r as any).pdfGeneratedAt = new Date();

    await this.receiptsRepo.save(r);
  }

  // ===============================
  // 🔥 NEW: PUPPETEER ENV SWITCH
  // ===============================
 async launchBrowser() {
  const env = process.env.APP_ENV;

  // ===============================
  // ✅ LOCAL (Windows / Dev)
  // ===============================
  if (env === 'local') {
    const puppeteer = await import('puppeteer');

    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  // ===============================
  // ✅ PRODUCTION (Render)
  // ===============================
  const chromium = (await import('@sparticuz/chromium')).default;
  const puppeteer = await import('puppeteer-core');

  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

  // ===============================
  // EXISTING LOGIC (UNCHANGED)
  // ===============================

  async createIfMissingTx(
    manager: EntityManager,
    input: {
      reference: string;
      paymentId: number;
      cartId: number;
      status: string;
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

    const normalizedSnapshot = normalizeSnapshot(input.snapshot);

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

    if (isFinalStatus(existing.status)) {
      if (!existing.pdfHash && input.pdfHash) {
        existing.pdfHash = input.pdfHash;
        return repo.save(existing);
      }
      return existing;
    }

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

    return repo.save(existing);
  }

  async createIfMissing(input: any): Promise<Receipt | null> {
    return this.createIfMissingTx(this.receiptsRepo.manager, input);
  }

 async getSnapshotDto(reference: string): Promise<any | null> {
  const r = await this.findByReference(reference);
   console.log('RAW SNAPSHOT:', r?.snapshotJson); // 👈 ADD THIS
  if (!r?.snapshotJson) return null;

  let snapshot: any = {};

  try {
    snapshot =
      typeof r.snapshotJson === 'string'
        ? JSON.parse(r.snapshotJson)
        : r.snapshotJson;
  } catch {
    return null;
  }

  const items = Array.isArray(snapshot.items) ? snapshot.items : [];

  const normalizedItems = items.map((it: any) => {
    const pollTitle =
      it.poll?.title ||
      it.pollTitle ||
      it.electionTitle ||
      it.title ||
      'Unknown Poll';

    const nomineeName =
      it.nominee?.name ||
      it.nomineeName ||
      it.candidateName ||
      it.name ||
      'Unknown Nominee';

    return {
      ...it,

      // 🔥 FORCE STRUCTURE FOR FRONTEND
      poll: { title: String(pollTitle) },
      nominee: { name: String(nomineeName) },

      voteQty: Number(it.voteQty || 0),
      subTotal: Number(it.subTotal || 0),
    };
  });

  return {
    ...snapshot,
    items: normalizedItems,
  };
}

  async updatePdfHash(reference: string, pdfHash: string): Promise<void> {
    const r = await this.findByReference(reference);
    if (!r) return;

    if (r.pdfHash) return;
    r.pdfHash = pdfHash;
    await this.receiptsRepo.save(r);
  }
}