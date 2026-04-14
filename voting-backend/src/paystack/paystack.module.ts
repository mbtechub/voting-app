import { Module } from '@nestjs/common';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { PaymentsModule } from '../modules/payments/payments.module';

@Module({
  imports: [PaymentsModule],           // ✅ makes PaymentsService available here
  controllers: [PaystackWebhookController],
})
export class PaystackModule {}
