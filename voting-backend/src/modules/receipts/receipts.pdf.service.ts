import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { ReceiptsService } from './receipts.service';
import QRCode from 'qrcode';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';
import https from 'https';

function sha256Hex(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

function formatMoney(v: any) {
  return Number(v || 0).toLocaleString();
}

function formatDate(v: any) {
  if (!v) return '';
  try {
    return new Date(v).toISOString();
  } catch {
    return String(v);
  }
}

// ✅ NEW: Convert image URL → base64
function imageToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks: Uint8Array[] = [];

        res.on('data', (chunk) => chunks.push(chunk));

        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          resolve(`data:image/png;base64,${base64}`);
        });

        res.on('error', reject);
      })
      .on('error', reject);
  });
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

  private getTemplatePath(): string {
    const devPath = path.join(
      process.cwd(),
      'src/modules/receipts/templates/receipt.html',
    );

    const prodPath = path.join(
      process.cwd(),
      'dist/modules/receipts/templates/receipt.html',
    );

    if (fs.existsSync(devPath)) return devPath;
    if (fs.existsSync(prodPath)) return prodPath;

    throw new Error(
      `Receipt template not found.\nChecked:\n- ${devPath}\n- ${prodPath}`,
    );
  }

  async generatePdf(reference: string) {
    try {
      const snap = await this.receiptsService.getSnapshotDto(reference);
      if (!snap) throw new NotFoundException('Receipt snapshot not found');

      const templatePath = this.getTemplatePath();
      const template = fs.readFileSync(templatePath, 'utf8');

      const frontendBaseUrl = this.normalizeBaseUrl(
        this.requireEnv('FRONTEND_BASE_URL'),
      );

      const verifyUrl = `${frontendBaseUrl}/receipt/${encodeURIComponent(reference)}`;

      const qr = await QRCode.toDataURL(verifyUrl);

      // ✅ FIX: Convert logo to base64
      const logoUrl = this.requireEnv('RECEIPT_LOGO_URL');
      let logo: string;

      try {
        logo = await imageToBase64(logoUrl);
      } catch (err) {
        console.warn('⚠️ Logo fetch failed, using fallback:', err);
        logo = logoUrl; // fallback (still tries URL)
      }

      const status =
        snap.payment?.status ||
        (Number(snap.summary?.appliedTotal || 0) > 0
          ? 'SUCCESS'
          : 'PENDING');

      const statusClass =
        status === 'SUCCESS'
          ? 'success'
          : status === 'FAILED'
          ? 'failed'
          : 'pending';

      const itemsHtml = (snap.items || [])
        .map(
          (i: any) => `
          <tr>
            <td>${i.poll?.title || ''}</td>
            <td>${i.nominee?.name || ''}</td>
            <td>${i.voteQty || 0}</td>
            <td class="right">₦${formatMoney(i.subTotal)}</td>
          </tr>
        `,
        )
        .join('');

      const html = template
        .replace(/{{logo}}/g, logo)
        .replace('{{qr}}', qr)
        .replace('{{status}}', status)
        .replace('{{statusClass}}', statusClass)
        .replace('{{reference}}', reference)
        .replace(
          '{{amount}}',
          formatMoney(
            snap.payment?.amount ?? snap.summary?.itemsTotal ?? 0,
          ),
        )
        .replace('{{paidAt}}', formatDate(snap.payment?.paidAt))
        .replace('{{cartUuid}}', snap.cart?.cartUuid || '')
        .replace(
          '{{cartTotal}}',
          formatMoney(snap.cart?.totalAmount ?? 0),
        )
        .replace('{{items}}', itemsHtml)
        .replace(
          '{{itemsTotal}}',
          formatMoney(snap.summary?.itemsTotal ?? 0),
        )
        .replace(
          '{{appliedTotal}}',
          formatMoney(snap.summary?.appliedTotal ?? 0),
        )
        .replace(
          '{{skippedTotal}}',
          formatMoney(snap.summary?.skippedTotal ?? 0),
        );

      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });

      try {
        const page = await browser.newPage();

        await page.setDefaultNavigationTimeout(0);

        await page.setContent(html, {
          waitUntil: 'domcontentloaded',
        });

        const pdfUint8 = await page.pdf({
          format: 'A4',
          printBackground: true,
        });

        const pdf = Buffer.from(pdfUint8);
        const pdfHash = sha256Hex(pdf);

        return {
          pdf,
          pdfHash,
        };
      } finally {
        await browser.close();
      }
    } catch (err) {
      console.error('PDF GENERATION ERROR:', err);
      throw err;
    }
  }
}