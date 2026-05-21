import {
  Controller,
  Post,
  Req,
} from '@nestjs/common';

import {
  SkipThrottle,
} from '@nestjs/throttler';

import { WebhooksService }
from './webhooks.service';


@Controller() // ✅ no prefix
export class WebhooksController {

  constructor(
    private readonly webhooksService:
      WebhooksService,
  ) {}

  // =====================================
  // PAYSTACK WEBHOOK
  // POST /api/payments/webhook
  // =====================================

  @SkipThrottle() // ✅ never throttle Paystack

  @Post(
    'payments/webhook',
  )

  async paystackWebhook(
    @Req()
    req: any,
  ) {
    return this.webhooksService
      .handlePaystackWebhook(
        req,
      );
  }
}