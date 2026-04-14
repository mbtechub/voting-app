import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { createHash } from 'crypto';
import { ReceiptsReadService } from './receipts.read.service';
import { ReceiptsService } from './receipts.service';
import { ReceiptsPdfService } from './receipts.pdf.service';

@Controller('public/receipt')
export class ReceiptsPublicController {
  constructor(
    private readonly receiptsReadService: ReceiptsReadService,
    private readonly receiptsService: ReceiptsService,
    private readonly receiptsPdfService: ReceiptsPdfService,
  ) {}

  // ✅ VERIFY ENDPOINT
  @Get(':reference/verify')
  async verify(@Param('reference') reference: string) {
    const r = await this.receiptsService.findByReference(reference);
    if (!r) throw new NotFoundException('Receipt not found');

    const snapshotString: string =
      typeof r.snapshotJson === 'string'
        ? r.snapshotJson
        : JSON.stringify(r.snapshotJson);

    const computedSnapshotHash = createHash('sha256')
      .update(snapshotString)
      .digest('hex');

    const storedSnapshotHash = (r.snapshotHash || '').toLowerCase();
    const snapshotHashMatch =
      storedSnapshotHash === computedSnapshotHash.toLowerCase();

    let snapshot: any = {};
    try {
      snapshot = JSON.parse(snapshotString);
    } catch {
      snapshot = {};
    }

    const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
    const appliedCount = items.filter(
      (i: any) => i?.outcome?.applyStatus === 'APPLIED',
    ).length;

    const skippedCount = items.filter(
      (i: any) => i?.outcome?.applyStatus === 'SKIPPED',
    ).length;

    return {
      reference: r.reference,
      status: r.status,

      valid: snapshotHashMatch,
      snapshotHashMatch,
      snapshotHash: r.snapshotHash,

      cartUuid: snapshot?.cart?.cartUuid,
      totalAmount: snapshot?.cart?.totalAmount,
      itemsCount: items.length,
      appliedCount,
      skippedCount,

      pdfVersion: r.pdfVersion,
      pdfHashStored: !!r.pdfHash,
      createdAt: r.createdAt,
    };
  }

  // ✅ PDF ENDPOINT (with debug proof)
  @Get(':reference/pdf')
  async pdf(@Param('reference') reference: string, @Res() res: Response) {
    console.log('🔥 PDF ENDPOINT HIT:', reference, new Date().toISOString());

    const buildId = `build_${Date.now()}`;
    res.setHeader('X-Receipt-Build', buildId);

    const { pdf, pdfHash } =
      await this.receiptsPdfService.generatePdf(reference);

    const existing = await this.receiptsService.findByReference(reference);
    if (existing && !existing.pdfHash) {
      await this.receiptsService.updatePdfHash(reference, pdfHash);
    }

    // ✅ Disable caching completely
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="receipt_${reference}.pdf"`,
    );
    res.setHeader('X-Receipt-PDF-Hash', pdfHash);

    return res.send(pdf);
  }

  // ✅ GET RECEIPT JSON
  @Get(':reference')
  async getReceipt(@Param('reference') reference: string) {
    return this.receiptsReadService.getReceiptByReference(reference);
  }
}
