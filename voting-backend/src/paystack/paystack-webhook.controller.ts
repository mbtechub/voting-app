import { Controller, Post, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';

@Controller('paystack')
export class PaystackWebhookController {
  // ❌ intentionally disabled (we use /api/payments/webhook in modules/webhooks)

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Res() res: Response) {
    return res.send('ok');
  }
}
