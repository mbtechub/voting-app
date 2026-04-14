import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'WEBHOOK_EVENTS' })
@Index('UX_WEBHOOK_EVENTS_REQHASH', ['requestHash'], { unique: true })
export class WebhookEvent {
  @PrimaryGeneratedColumn({ name: 'WEBHOOK_EVENT_ID', type: 'number' })
  webhookEventId: number;

  @Column({ name: 'PROVIDER', type: 'varchar2', length: 30 })
  provider: string;

  @Column({ name: 'ROUTE', type: 'varchar2', length: 120, nullable: true })
  route?: string | null;

  @Column({ name: 'IP_ADDRESS', type: 'varchar2', length: 60, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'EVENT_NAME', type: 'varchar2', length: 60, nullable: true })
  eventName?: string | null;

  @Column({ name: 'REFERENCE', type: 'varchar2', length: 80, nullable: true })
  reference?: string | null;

  @Column({ name: 'PAYSTACK_TX_ID', type: 'number', nullable: true })
  paystackTxId?: number | null;

  @Column({ name: 'PAYMENT_ID', type: 'number', nullable: true })
  paymentId?: number | null;

  @Column({ name: 'CART_ID', type: 'number', nullable: true })
  cartId?: number | null;

  @Column({ name: 'SIGNATURE_PRESENT', type: 'char', length: 1, default: () => "'N'" })
  signaturePresent: 'Y' | 'N';

  @Column({ name: 'SIGNATURE_VALID', type: 'char', length: 1, default: () => "'N'" })
  signatureValid: 'Y' | 'N';

  @Column({ name: 'PROCESSED', type: 'char', length: 1, default: () => "'N'" })
  processed: 'Y' | 'N';

  @Column({ name: 'PROCESS_RESULT', type: 'varchar2', length: 40, nullable: true })
  processResult?: string | null;

  @Column({ name: 'ERROR_MESSAGE', type: 'varchar2', length: 1000, nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'REQUEST_HASH', type: 'varchar2', length: 64 })
  requestHash: string;

  @Column({ name: 'RECEIVED_AT', type: 'date', default: () => 'SYSDATE' })
  receivedAt: Date;

  @Column({ name: 'FINISHED_AT', type: 'date', nullable: true })
  finishedAt?: Date | null;

  @Column({ name: 'DURATION_MS', type: 'number', nullable: true })
  durationMs?: number | null;

  @Column({ name: 'HEADERS_JSON', type: 'clob', nullable: true })
  headersJson?: string | null;

  @Column({ name: 'PAYLOAD_JSON', type: 'clob', nullable: true })
  payloadJson?: string | null;
}
