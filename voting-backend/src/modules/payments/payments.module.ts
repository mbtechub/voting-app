// src/modules/payments/payments.module.ts
// ===================================================
// PURPOSE:
// Registers entities used by PaymentsService during:
// - payment initiation
// - Paystack webhook finalization (VoteLog + ElectionResult updates)
// ===================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { ReceiptsModule } from '../receipts/receipts.module';

import { Payment } from './entities/payment.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Election } from '../elections/entities/election.entity';
import { VoteLog } from '../votes/entities/vote-log.entity';
import { ElectionResult } from '../votes/entities/election-result.entity';

@Module({
  imports: [
    // ✅ Entities used inside PaymentsService transactions
    TypeOrmModule.forFeature([
      Payment,
      Cart,
      CartItem,
      Election,
      VoteLog,
      ElectionResult,
    ]),

    // ✅ Makes ReceiptsService available for DI
    ReceiptsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],

  // Optional but fine to keep
  exports: [PaymentsService],
})
export class PaymentsModule {}
