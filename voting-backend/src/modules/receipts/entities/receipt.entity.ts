import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'RECEIPTS' })
@Index('UX_RECEIPTS_REFERENCE', ['reference'], { unique: true })
export class Receipt {
  @PrimaryGeneratedColumn({ name: 'RECEIPT_ID', type: 'number' })
  receiptId: number;

  @Column({ name: 'REFERENCE', type: 'varchar2', length: 80 })
  reference: string;

  @Column({ name: 'PAYMENT_ID', type: 'number' })
  paymentId: number;

  @Column({ name: 'CART_ID', type: 'number' })
  cartId: number;

  // ✅ FIXED: allow full lifecycle
  @Column({ name: 'STATUS', type: 'varchar2', length: 30 })
  status: 'INITIATED' | 'SUCCESS' | 'PARTIALLY_APPLIED' | 'FAILED';

  @Column({ name: 'AMOUNT', type: 'number', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'CURRENCY', type: 'varchar2', length: 10, default: 'NGN' })
  currency: string;

  @Column({ name: 'SNAPSHOT_JSON', type: 'clob' })
  snapshotJson: string;

  @Column({ name: 'SNAPSHOT_HASH', type: 'varchar2', length: 64 })
  snapshotHash: string;

  @Column({ name: 'PDF_VERSION', type: 'varchar2', length: 20, default: 'v1' })
  pdfVersion: string;

  @Column({ name: 'PDF_HASH', type: 'varchar2', length: 64, nullable: true })
  pdfHash?: string | null;

  // ===============================
  // ✅ NEW: PDF CACHING (CRITICAL)
  // ===============================

  @Column({
    name: 'PDF_BLOB',
    type: 'blob',
    nullable: true,
  })
  pdfBlob?: Buffer;

  @Column({
    name: 'PDF_GENERATED_AT',
    type: 'date',
    nullable: true,
  })
  pdfGeneratedAt?: Date;

  @Column({ name: 'CREATED_AT', type: 'date', default: () => 'SYSDATE' })
  createdAt: Date;
}