import { Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WebhooksService } from './webhooks.service';

@Controller() // ✅ no prefix, so we can match the exact path below
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // -------------------------------------------------
  // PAYSTACK WEBHOOK
  // POST /api/payments/webhook
  // -------------------------------------------------
  @Throttle({ default: { ttl: 60, limit: 60 } }) // ✅ allow up to 60/min per IP
  @Post('payments/webhook')
  async paystackWebhook(@Req() req: any) {
    return this.webhooksService.handlePaystackWebhook(req);
  }
}
