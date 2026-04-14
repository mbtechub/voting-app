import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import PDFDocument from 'pdfkit';

type ReceiptHeaderRow = {
  PAYMENT_ID: number;
  CART_ID: number;
  PAYSTACK_REF: string;
  PAYMENT_AMOUNT: number;
  PAYMENT_STATUS: string;
  PAID_AT: Date | null;
  CART_UUID: string;
  CART_STATUS: string;
  CART_TOTAL: number;
};

type ReceiptItemRow = {
  CART_ITEM_ID: number | null;
  VOTE_LOG_ID: number;
  ELECTION_ID: number;
  ELECTION_TITLE: string;
  CANDIDATE_ID: number;
  CANDIDATE_NAME: string;
  VOTE_QTY: number;
  PRICE_PER_VOTE: number;
  SUB_TOTAL: number;
  APPLY_STATUS: string;
  SKIP_REASON: string | null;
  CREATED_AT: Date;
};

@Injectable()
export class PublicReceiptService {
  constructor(private readonly dataSource: DataSource) {}

  async getReceipt(key: string) {
    const cleanedKey = (key || '').trim();

    const header = await this.findReceiptHeader(cleanedKey);
    if (!header) {
      throw new NotFoundException('Receipt not found');
    }

    // ✅ Authoritative: derive items from vote logs for this reference
    const items = await this.findReceiptItemsByReference(header.PAYSTACK_REF);

    const itemsTotal = items.reduce((s, i) => s + Number(i.SUB_TOTAL || 0), 0);

    const appliedTotal = items.reduce((s, i) => {
      if ((i.APPLY_STATUS || '').toUpperCase() === 'APPLIED')
        return s + Number(i.SUB_TOTAL || 0);
      return s;
    }, 0);

    const skippedTotal = items.reduce((s, i) => {
      if ((i.APPLY_STATUS || '').toUpperCase() === 'SKIPPED')
        return s + Number(i.SUB_TOTAL || 0);
      return s;
    }, 0);

    return {
      lookupKey: cleanedKey,
      receiptId: header.PAYSTACK_REF,
      payment: {
        paystackRef: header.PAYSTACK_REF,
        status: header.PAYMENT_STATUS,
        amount: Number(header.PAYMENT_AMOUNT),
        paidAt: header.PAID_AT ? new Date(header.PAID_AT).toISOString() : null,
      },
      cart: {
        cartId: Number(header.CART_ID),
        cartUuid: header.CART_UUID,
        status: header.CART_STATUS,
        totalAmount: Number(header.CART_TOTAL),
      },
      items: items.map((i) => ({
        cartItemId: i.CART_ITEM_ID != null ? Number(i.CART_ITEM_ID) : null,
        voteLogId: Number(i.VOTE_LOG_ID),
        election: { electionId: Number(i.ELECTION_ID), title: i.ELECTION_TITLE },
        candidate: { candidateId: Number(i.CANDIDATE_ID), name: i.CANDIDATE_NAME },
        voteQty: Number(i.VOTE_QTY),
        pricePerVote: Number(i.PRICE_PER_VOTE),
        subTotal: Number(i.SUB_TOTAL),
        outcome: {
          applyStatus: i.APPLY_STATUS,
          skipReason: i.SKIP_REASON,
          createdAt: i.CREATED_AT ? new Date(i.CREATED_AT).toISOString() : null,
        },
      })),
      summary: {
        itemsTotal,
        appliedTotal,
        skippedTotal,
      },
    };
  }

  /**
   * ✅ Generates a PDF receipt buffer.
   * Controller will stream this as application/pdf.
   */
  async getReceiptPdf(key: string): Promise<{ reference: string; buffer: Buffer }> {
    const receipt = await this.getReceipt(key);

    const reference = receipt.payment.paystackRef;
    const buffer = await this.buildPdfBuffer(receipt);

    return { reference, buffer };
  }

  private async buildPdfBuffer(receipt: any): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // ---- Header ----
    doc.fontSize(18).text('Vote Receipt', { align: 'left' });
    doc.moveDown(0.5);

    doc.fontSize(10).text(`Reference: ${receipt.payment.paystackRef}`);
    doc.text(`Payment status: ${receipt.payment.status}`);
    doc.text(`Amount: NGN ${this.money(receipt.payment.amount)}`);
    doc.text(`Paid at: ${this.formatDate(receipt.payment.paidAt)}`);
    doc.moveDown(0.8);

    // ---- Cart ----
    doc.fontSize(12).text('Cart', { underline: true });
    doc.fontSize(10);
    doc.text(`Cart UUID: ${receipt.cart.cartUuid}`);
    doc.text(`Cart status: ${receipt.cart.status}`);
    doc.text(`Cart total: NGN ${this.money(receipt.cart.totalAmount)}`);
    doc.moveDown(0.8);

    // ---- Items ----
    doc.fontSize(12).text('Votes', { underline: true });
    doc.moveDown(0.3);

    // Table-like layout
    doc.fontSize(9);
    doc.text('Election / Candidate', 50, doc.y, { continued: true });
    doc.text('Qty', 310, doc.y, { continued: true });
    doc.text('Price', 350, doc.y, { continued: true });
    doc.text('SubTotal', 410, doc.y, { continued: true });
    doc.text('Outcome', 480, doc.y);
    doc.moveDown(0.3);

    const lineYStart = doc.y;
    doc.moveTo(50, lineYStart).lineTo(545, lineYStart).stroke();
    doc.moveDown(0.4);

    for (const it of receipt.items) {
      const label = `${it.election.title} / ${it.candidate.name}`;
      const outcome =
        (it.outcome.applyStatus || '').toUpperCase() === 'APPLIED'
          ? 'APPLIED'
          : 'SKIPPED';

      doc.text(this.truncate(label, 45), 50, doc.y, { continued: true });
      doc.text(String(it.voteQty), 310, doc.y, { continued: true });
      doc.text(this.money(it.pricePerVote), 350, doc.y, { continued: true });
      doc.text(this.money(it.subTotal), 410, doc.y, { continued: true });
      doc.text(outcome, 480, doc.y);

      if (
        (it.outcome.applyStatus || '').toUpperCase() === 'SKIPPED' &&
        it.outcome.skipReason
      ) {
        doc.fontSize(8).text(`Reason: ${it.outcome.skipReason}`, 60);
        doc.fontSize(9);
      }

      doc.moveDown(0.4);

      // page break safety
      if (doc.y > 740) {
        doc.addPage();
      }
    }

    doc.moveDown(0.6);

    // ---- Summary ----
    doc.fontSize(12).text('Summary', { underline: true });
    doc.fontSize(10);
    doc.text(`Items total: NGN ${this.money(receipt.summary.itemsTotal)}`);
    doc.text(`Applied total: NGN ${this.money(receipt.summary.appliedTotal)}`);
    doc.text(`Skipped total: NGN ${this.money(receipt.summary.skippedTotal)}`);

    doc.moveDown(1.2);
    doc
      .fontSize(8)
      .text(
        'This receipt is generated from the authoritative vote logs for this payment reference.',
      );

    doc.end();
    return done;
  }

  private truncate(s: string, max: number) {
    if (!s) return '';
    return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
  }

  private money(n: number) {
    const v = Number(n || 0);
    return v.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private formatDate(d: any) {
    if (!d) return '-';
    try {
      const dt = d instanceof Date ? d : new Date(d);
      return isNaN(dt.getTime()) ? String(d) : dt.toISOString();
    } catch {
      return String(d);
    }
  }

  private async findReceiptHeader(key: string): Promise<ReceiptHeaderRow | null> {
    const sql = `
      SELECT
        p.PAYMENT_ID,
        p.CART_ID,
        p.PAYSTACK_REF,
        p.AMOUNT AS PAYMENT_AMOUNT,
        p.STATUS AS PAYMENT_STATUS,
        p.PAID_AT,
        c.CART_UUID,
        c.STATUS AS CART_STATUS,
        c.TOTAL_AMOUNT AS CART_TOTAL
      FROM PAYMENTS p
      JOIN CARTS c ON c.CART_ID = p.CART_ID
      WHERE p.PAYSTACK_REF = :1 OR c.CART_UUID = :2
      ORDER BY p.CREATED_AT DESC
      FETCH FIRST 1 ROWS ONLY
    `;

    const rows = await this.dataSource.query(sql, [key, key]);
    return rows?.[0] ?? null;
  }

  // ✅ IMPORTANT:
  // Use vote logs as the authoritative source of what happened for this payment reference.
  // This supports partial apply, retries, and per-item outcomes.
  private async findReceiptItemsByReference(ref: string): Promise<ReceiptItemRow[]> {
    const sql = `
      SELECT
        vl.CART_ITEM_ID,
        vl.VOTE_LOG_ID,
        vl.ELECTION_ID,
        e.TITLE AS ELECTION_TITLE,
        vl.CANDIDATE_ID,
        ca.NAME AS CANDIDATE_NAME,
        vl.VOTE_QTY,
        vl.PRICE_PER_VOTE,
        vl.SUB_TOTAL,
        vl.APPLY_STATUS,
        vl.SKIP_REASON,
        vl.CREATED_AT
      FROM VOTE_LOGS vl
      JOIN ELECTIONS e ON e.ELECTION_ID = vl.ELECTION_ID
      JOIN CANDIDATES ca ON ca.CANDIDATE_ID = vl.CANDIDATE_ID
      WHERE vl.REFERENCE = :1
      ORDER BY vl.VOTE_LOG_ID ASC
    `;

    return this.dataSource.query(sql, [ref]);
  }
}
