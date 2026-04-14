import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

import { Payment } from '../payments/entities/payment.entity';
import { VoteLog } from '../votes/entities/vote-log.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Election } from '../elections/entities/election.entity';

import { WebhookEvent } from './entities/webhook-event.entity';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      VoteLog,
      Cart,
      CartItem,
      Election,
      WebhookEvent, // ✅ add webhook event logging entity
    ]),
    ReceiptsModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
