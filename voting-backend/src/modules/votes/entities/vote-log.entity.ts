import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'VOTE_LOGS' })
export class VoteLog {
  @PrimaryGeneratedColumn({ name: 'VOTE_LOG_ID', type: 'number' })
  voteLogId: number;

  @Column({ name: 'CART_ID', type: 'number' })
  cartId: number;

  @Column({ name: 'PAYMENT_ID', type: 'number' })
  paymentId: number;

  // matches DB column: REFERENCE
  @Column({ name: 'REFERENCE', type: 'varchar2', length: 100 })
  reference: string;

  @Column({ name: 'ELECTION_ID', type: 'number' })
  electionId: number;

  @Column({ name: 'CANDIDATE_ID', type: 'number' })
  candidateId: number;

  @Column({ name: 'VOTE_QTY', type: 'number' })
  voteQty: number;

  @Column({ name: 'PRICE_PER_VOTE', type: 'number', precision: 12, scale: 2 })
  pricePerVote: number;

  @Column({ name: 'SUB_TOTAL', type: 'number', precision: 12, scale: 2 })
  subTotal: number;

  @Column({ name: 'APPLY_STATUS', type: 'varchar2', length: 20 })
  applyStatus: string; // APPLIED | SKIPPED

  @Column({ name: 'SKIP_REASON', type: 'varchar2', length: 100, nullable: true })
  skipReason: string | null;

  // ✅ NEW — matches DB column
  @Column({ name: 'CART_ITEM_ID', type: 'number', nullable: true })
  cartItemId?: number | null;

  @Column({ name: 'CREATED_AT', type: 'date' })
  createdAt: Date;
}
