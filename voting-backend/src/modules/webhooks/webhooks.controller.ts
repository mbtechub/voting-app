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

import { Param } from '@nestjs/common';


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
  @Post('payments/reconcile/:reference')
async reconcilePayment(
  @Param('reference') reference: string,
) {
  return this.webhooksService.reconcileReference(
    reference,
  );
}
}