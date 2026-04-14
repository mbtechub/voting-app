import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  Body,
  Get,
  Query,
  BadRequestException,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  // -------------------------------
  // Initiate Paystack payment
  // Email is required so Paystack can send receipt/customer notifications
  // -------------------------------
  @Post('initiate')
  async initiatePaystack(@Body() body: { cartUuid: string; email: string }) {
    const cartUuid = (body?.cartUuid || '').trim();
    const email = (body?.email || '').trim();

    if (!cartUuid) {
      throw new BadRequestException('cartUuid is required');
    }

    if (!email) {
      throw new BadRequestException('email is required');
    }

    return this.paymentsService.initiatePaystack(cartUuid, email);
  }

  // -------------------------------
  // Browser callback (UX only)
  // Paystack redirects here after payment.
  // Webhook is still the ONLY vote authority.
  // -------------------------------
  @Get('callback')
  callback(
    @Query('reference') reference?: string,
    @Query('trxref') trxref?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const frontendBase =
      this.configService.get<string>('FRONTEND_BASE_URL') ||
      this.configService.get<string>('APP_BASE_URL') ||
      '';

    const ref = (reference || trxref || '').trim();

    // Safety fallback if we don't have any reference
    if (!ref) {
      return res?.redirect(302, `${frontendBase}/payment/processing`);
    }

    // Redirect user to frontend receipt page
    return res?.redirect(
      302,
      `${frontendBase}/receipt/${encodeURIComponent(ref)}`,
    );
  }

  // -------------------------------
  // Paystack webhook (HARDENED)
  // NOTE: We still always respond 200 quickly.
  // Paystack will retry on non-2xx, so we only use 401/400 for truly invalid calls.
  // -------------------------------
  @Post('webhook/paystack')
  @HttpCode(200)
  async paystackWebhook(
    @Req() req: any,
    @Res() res: Response,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    // 1) Signature must exist
    if (!signature) {
      throw new UnauthorizedException('Missing x-paystack-signature');
    }

    // 2) Raw body must exist (your middleware must have run)
    if (!req?.rawBody) {
      throw new BadRequestException('Missing rawBody for webhook verification');
    }

    // 3) Body must be JSON
    if (!req?.body) {
      throw new BadRequestException('Missing webhook body');
    }

    // 4) Optional: only accept charge.success (ignore others)
    const event = (req.body?.event || '').toString();
    if (event && event !== 'charge.success') {
      return res.status(200).json({ received: true, ignored: true, event });
    }

    await this.paymentsService.handlePaystackWebhook({
      rawBody: req.rawBody,
      body: req.body,
      signature,
    });

    return res.status(200).json({ received: true });
  }

  // -------------------------------
  // Admin recovery: re-run finalize by Paystack reference
  // -------------------------------
  @Post('recover')
  async recoverByReference(@Body() body: { paystackRef: string }) {
    const paystackRef = (body?.paystackRef || '').trim();

    if (!paystackRef) {
      throw new BadRequestException('paystackRef is required');
    }

    return this.paymentsService.recoverPaymentByReference(paystackRef);
  }
}