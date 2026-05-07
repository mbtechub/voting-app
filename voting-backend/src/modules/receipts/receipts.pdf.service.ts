import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { ReceiptsService } from './receipts.service';
import QRCode from 'qrcode';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

function sha256Hex(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
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

  async generatePdf(reference: string) {
    const snap = await this.receiptsService.getSnapshotDto(reference);
    if (!snap) throw new NotFoundException('Receipt snapshot not found');

    const template = fs.readFileSync(
      path.join(__dirname, 'templates/receipt.html'),
      'utf8',
    );

    const frontendBaseUrl = this.normalizeBaseUrl(
      this.requireEnv('FRONTEND_BASE_URL'),
    );

    const verifyUrl = `${frontendBaseUrl}/receipt/${encodeURIComponent(reference)}`;

    const qr = await QRCode.toDataURL(verifyUrl);

    const logo = this.requireEnv('RECEIPT_LOGO_URL');

    const itemsHtml = (snap.items || [])
      .map(
        (i: any) => `
        <tr>
          <td>${i.poll?.title || ''}</td>
          <td>${i.nominee?.name || ''}</td>
          <td>${i.voteQty}</td>
          <td class="right">NGN ${Number(i.subTotal || 0).toLocaleString()}</td>
        </tr>
      `,
      )
      .join('');

    const html = template
      .replace(/{{logo}}/g, logo)
      .replace('{{qr}}', qr)
      .replace('{{status}}', snap.payment?.status || 'UNKNOWN')
      .replace('{{reference}}', reference)
      .replace('{{amount}}', snap.payment?.amount || 0)
      .replace('{{paidAt}}', snap.payment?.paidAt || '')
      .replace('{{cartUuid}}', snap.cart?.cartUuid || '')
      .replace('{{cartTotal}}', snap.cart?.totalAmount || 0)
      .replace('{{items}}', itemsHtml)
      .replace('{{itemsTotal}}', snap.summary?.itemsTotal || 0)
      .replace('{{appliedTotal}}', snap.summary?.appliedTotal || 0)
      .replace('{{skippedTotal}}', snap.summary?.skippedTotal || 0);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    const pdfUint8 = await page.pdf({
  format: 'A4',
  printBackground: true,
});

const pdf = Buffer.from(pdfUint8);

    await browser.close();

    const pdfHash = sha256Hex(pdf);

    return {
      pdf,
      pdfHash,
    };
  }
}