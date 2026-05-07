import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { createHash } from 'crypto';
import { ReceiptsService } from './receipts.service';
import QRCode from 'qrcode';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync } from 'fs';
import axios from 'axios';

function sha256Hex(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

function formatMoney(v: any) {
  return Number(v || 0).toLocaleString();
}

@Injectable()
export class ReceiptsPdfService {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly configService: ConfigService,
  ) {}

  private requireEnv(name: string): string {
    const v = (this.configService.get<string>(name) || '').trim();
    if (!v) throw new Error(`Missing required env: ${name}`);
    return v;
  }

  private normalizeBaseUrl(url: string) {
    return url.replace(/\/$/, '');
  }

  private async getLogoBuffer(): Promise<Buffer | null> {
    try {
      const url = this.requireEnv('RECEIPT_LOGO_URL');
      const res = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(res.data);
    } catch (e: any) {
      console.error('Logo load failed:', e?.message);
      return null;
    }
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

  async generatePdf(reference: string) {
    const snap = await this.receiptsService.getSnapshotDto(reference);
    if (!snap) throw new NotFoundException('Receipt snapshot not found');

    // 🔥 DEBUG (remove later if you want)
    console.log('SNAPSHOT:', JSON.stringify(snap, null, 2));

    const frontendBaseUrl = this.normalizeBaseUrl(
      this.requireEnv('FRONTEND_BASE_URL'),
    );

    const verifyUrl = `${frontendBaseUrl}/receipt/${encodeURIComponent(reference)}`;

    const qrBuffer = await QRCode.toBuffer(verifyUrl);
    const qrPath = join(tmpdir(), `receipt-qr-${reference}.png`);
    writeFileSync(qrPath, qrBuffer);

    const logoBuffer = await this.getLogoBuffer();

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const pageWidth = doc.page.width;
    const margin = 50;
    const qrSize = 100;

    const qrX = pageWidth - qrSize - margin;
    const qrY = margin;

    // WATERMARK
    if (logoBuffer) {
      doc.opacity(0.05);
      doc.image(logoBuffer, pageWidth / 2 - 150, 250, { width: 300 });
      doc.opacity(1);
    }

    // QR
    doc.image(qrPath, qrX, qrY, { width: qrSize });
    doc.fontSize(8).fillColor('gray').text('Scan to verify', qrX, qrY + qrSize + 5, {
      width: qrSize,
      align: 'center',
    });

    // LOGO
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, margin, margin, { width: 50 });
      } catch {}
    }

    // TITLE
    doc
      .fontSize(20)
      .fillColor('#111')
      .text('Voting Receipt', margin + 60, margin + 12);

    doc.moveDown(2);

    const payment = snap.payment || {};
    const cart = snap.cart || {};
    const summary = snap.summary || {};

    // 🔥 FIXED DATA FALLBACK
    const status = payment.status || snap.status || 'UNKNOWN';
    const amount = payment.amount ?? snap.amount ?? 0;
    const paidAt = payment.paidAt ?? snap.paidAt ?? '';

    // STATUS BADGE (FIXED POSITION)
    const badgeY = doc.y;

    doc
      .roundedRect(margin, badgeY, 110, 20, 6)
      .fill(status === 'SUCCESS' ? '#DCFCE7' : '#FEE2E2');

    doc
      .fillColor(status === 'SUCCESS' ? '#166534' : '#991B1B')
      .fontSize(10)
      .text(status, margin + 10, badgeY + 5);

    doc.moveDown(2);
    doc.fillColor('#000');

    // INFO
    doc.fontSize(10);
    doc.text(`Reference: ${reference}`);
    doc.text(`Amount: NGN ${formatMoney(amount)}`);
    doc.text(`Paid At: ${paidAt}`);

    doc.moveDown();

    doc.text(`Cart UUID: ${cart.cartUuid ?? ''}`);
    doc.text(`Cart Total: NGN ${formatMoney(cart.totalAmount)}`);

    doc.moveDown(1.5);

    // DIVIDER
    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
    doc.moveDown();

    // ITEMS
    doc.fontSize(13).text('Items');
    doc.moveDown(0.5);

    const col1 = margin;
    const col2 = margin + 200;
    const col3 = margin + 340;
    const col4 = pageWidth - margin - 60;

    doc.font('Helvetica-Bold').fontSize(10);

    doc.text('Poll', col1);
    doc.text('Nominee', col2);
    doc.text('Votes', col3);
    doc.text('Total', col4);

    doc.moveDown(0.5);
    doc.font('Helvetica');

    const items = Array.isArray(snap.items) ? snap.items : [];

    items.forEach((it: any) => {
      const poll = it?.poll?.title ?? '';
      const nominee = it?.nominee?.name ?? '';

      doc.text(poll, col1, doc.y, { width: 180 });
      doc.text(nominee, col2, doc.y);
      doc.text(String(it.voteQty ?? ''), col3, doc.y);
      doc.text(`NGN ${formatMoney(it.subTotal)}`, col4, doc.y);

      doc.moveDown(0.5);
    });

    doc.moveDown(1);

    // DIVIDER
    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
    doc.moveDown();

    // TOTALS (RIGHT ALIGNED)
    doc.font('Helvetica-Bold').text('Totals', { align: 'right' });

    doc.font('Helvetica');

    doc.text(`Items Total: NGN ${formatMoney(summary.itemsTotal)}`, {
      align: 'right',
    });
    doc.text(`Applied Total: NGN ${formatMoney(summary.appliedTotal)}`, {
      align: 'right',
    });
    doc.text(`Skipped Total: NGN ${formatMoney(summary.skippedTotal)}`, {
      align: 'right',
    });

    doc.moveDown(2);

    doc
      .fontSize(8)
      .fillColor('gray')
      .text('This receipt is generated from an immutable snapshot.', {
        align: 'center',
      });

    const pdf = await this.docToBuffer(doc);
    const pdfHash = sha256Hex(pdf);

    return { pdf, pdfHash };
  }
}