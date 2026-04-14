import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { createHash } from 'crypto';
import { ReceiptsService } from './receipts.service';
import QRCode from 'qrcode';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync } from 'fs';

function sha256Hex(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

@Injectable()
export class ReceiptsPdfService {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly configService: ConfigService,
  ) {}

  // ✅ Require env (no hardcoded localhost fallback)
  private requireEnv(name: string): string {
    const v = (this.configService.get<string>(name) || '').trim();
    if (!v) throw new Error(`Missing required env: ${name}`);
    return v;
  }

  private normalizeBaseUrl(url: string) {
    return url.replace(/\/$/, '');
  }

  private docToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      doc.on('data', (c: Buffer | string) =>
        chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)),
      );
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.end();
    });
  }

  async generatePdf(
    reference: string,
  ): Promise<{ pdf: Buffer; pdfHash: string }> {
    const snap = await this.receiptsService.getSnapshotDto(reference);
    if (!snap) throw new NotFoundException('Receipt snapshot not found');

    // ✅ Build verify URL from env ONLY
    const frontendBaseUrl = this.normalizeBaseUrl(
      this.requireEnv('FRONTEND_BASE_URL'),
    );
    const verifyUrl = `${frontendBaseUrl}/receipt/${encodeURIComponent(
      reference,
    )}`;

    // ✅ Generate QR as PNG buffer
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      margin: 1,
      scale: 6,
      errorCorrectionLevel: 'M',
    });

    // ✅ Save QR to temp file (pdfkit embeds reliably from file path)
    const qrPath = join(tmpdir(), `receipt-qr-${reference}.png`);
    writeFileSync(qrPath, qrBuffer);

    // ✅ Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const pageWidth = doc.page.width;
    const margin = 50;
    const qrSize = 110;

    // ✅ QR position (top-right)
    const qrX = pageWidth - qrSize - margin;
    const qrY = margin;

    // ✅ Embed QR from file path
    doc.image(qrPath, qrX, qrY, { width: qrSize, height: qrSize });
    doc.fontSize(9).text('Scan to verify', qrX, qrY + qrSize + 5, {
      width: qrSize,
      align: 'center',
    });

    // ✅ Header (full width)
    doc.fontSize(22).text('Voting Receipt', margin, margin);

    // ✅ Push content below QR area so it doesn’t clash
    doc.y = Math.max(doc.y + 10, qrY + qrSize + 40);

    const payment = snap.payment || {};
    const cart = snap.cart || {};
    const summary = snap.summary || {};

    // ✅ Summary (full width)
    doc.fontSize(10);
    doc.text(`Reference: ${reference}`);
    doc.text(`Status: ${payment.status ?? snap.status ?? 'UNKNOWN'}`);
    doc.text(`Amount: NGN ${payment.amount ?? ''}`);
    doc.text(`Paid At: ${payment.paidAt ?? ''}`);
    doc.moveDown();

    doc.text(`Cart UUID: ${cart.cartUuid ?? ''}`);
    doc.text(`Cart Total: NGN ${cart.totalAmount ?? ''}`);
    doc.moveDown(1.5);

    // ✅ Items
    doc.fontSize(14).text('Items', { underline: true });
    doc.moveDown(0.6);

    const items = Array.isArray(snap.items) ? snap.items : [];

    if (!items.length) {
      doc.fontSize(10).text('No items found in snapshot.');
    } else {
      items.forEach((it: any, idx: number) => {
        const electionTitle =
          it?.poll?.title ??
          it?.election?.title ??
          `Poll ${it?.poll?.pollId ?? it?.election?.electionId ?? ''}`;

        const nomineeName =
          it?.nominee?.name ??
          it?.candidate?.name ??
          `Nominee ${it?.nominee?.nomineeId ?? it?.candidate?.candidateId ?? ''}`;

        doc.fontSize(10).text(`${idx + 1}. ${electionTitle}`);
        doc.text(`   Nominee: ${nomineeName}`);
        doc.text(
          `   Votes: ${it?.voteQty ?? ''} | Price: ${it?.pricePerVote ?? ''} | Subtotal: ${it?.subTotal ?? ''}`,
        );
        doc.text(
          `   Outcome: ${it?.outcome?.applyStatus ?? ''}${
            it?.outcome?.skipReason ? ` (${it.outcome.skipReason})` : ''
          }`,
        );
        doc.moveDown(0.8);
      });
    }

    // ✅ Totals
    doc.moveDown(0.2);
    doc.fontSize(14).text('Totals', { underline: true });
    doc.moveDown(0.6);

    doc.fontSize(10);
    doc.text(`Items Total: NGN ${summary.itemsTotal ?? ''}`);
    doc.text(`Applied Total: NGN ${summary.appliedTotal ?? ''}`);
    doc.text(`Skipped Total: NGN ${summary.skippedTotal ?? ''}`);

    doc.moveDown(1.5);
    doc.fontSize(8).text(
      'This receipt is generated from an immutable snapshot.',
      { align: 'center' },
    );

    const pdf = await this.docToBuffer(doc);
    const pdfHash = sha256Hex(pdf);

    return { pdf, pdfHash };
  }
}