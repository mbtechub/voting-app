import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'PAYMENTS' })
export class Payment {
  @PrimaryGeneratedColumn({ name: 'PAYMENT_ID', type: 'number' })
  paymentId: number;

  @Column({ name: 'CART_ID', type: 'number' })
  cartId: number;

  // ✅ matches your DB column PAYSTACK_REF
  @Column({ name: 'PAYSTACK_REF', type: 'varchar2', length: 100 })
  paystackRef: string;

  // ✅ NUMBER(12,2)
  @Column({ name: 'AMOUNT', type: 'number', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'STATUS', type: 'varchar2', length: 30, nullable: true })
  status: string | null;

  // ✅ CLOB
  @Column({ name: 'RAW_RESPONSE', type: 'clob', nullable: true })
  rawResponse: string | null;

  // ✅ DATE
  @Column({ name: 'PAID_AT', type: 'date', nullable: true })
  paidAt: Date | null;

  // ✅ DATE
  @Column({ name: 'CREATED_AT', type: 'date', nullable: true })
  createdAt: Date | null;
}
