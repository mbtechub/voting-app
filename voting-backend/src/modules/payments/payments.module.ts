// src/modules/payments/payments.module.ts
// ===================================================
// PURPOSE:
// Registers entities used by PaymentsService during:
// - payment initiation
// - Paystack webhook processing
// - vote application
// - payment reconciliation jobs
// ===================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentReconciliationService } from './payment-reconciliation.service';

import { ReceiptsModule } from '../receipts/receipts.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

import { Payment } from './entities/payment.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Election } from '../elections/entities/election.entity';
import { VoteLog } from '../votes/entities/vote-log.entity';
import { ElectionResult } from '../votes/entities/election-result.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Cart,
      CartItem,
      Election,
      VoteLog,
      ElectionResult,
    ]),

    // Receipt generation
    ReceiptsModule,

    // Required for webhook-related payment recovery
    WebhooksModule,
  ],

  controllers: [
    PaymentsController,
  ],

  providers: [
    PaymentsService,
    PaymentReconciliationService,
  ],

  exports: [
    PaymentsService,
    PaymentReconciliationService,
  ],
})
export class PaymentsModule {}