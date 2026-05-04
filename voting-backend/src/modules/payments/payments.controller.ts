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

    if (!ref) {
      return res?.redirect(302, `${frontendBase}/payment/processing`);
    }

    return res?.redirect(
      302,
      `${frontendBase}/receipt/${encodeURIComponent(ref)}`,
    );
  }

  // -------------------------------
  // Paystack webhook (DEBUG + HARDENED)
  // -------------------------------
  @Post('webhook/')
  @HttpCode(200)
  async paystackWebhook(
    @Req() req: any,
    @Res() res: Response,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    console.log('🔥🔥 PAYSTACK WEBHOOK HIT');

    try {
      console.log('➡️ Headers:', req.headers);
      console.log('➡️ Body:', req.body);

      // 1) Signature must exist
      if (!signature) {
        console.log('❌ Missing signature');
        throw new UnauthorizedException('Missing x-paystack-signature');
      }

      // 2) Raw body must exist
      if (!req?.rawBody) {
        console.log('❌ Missing rawBody');
        throw new BadRequestException('Missing rawBody for webhook verification');
      }

      // 3) Body must exist
      if (!req?.body) {
        console.log('❌ Missing body');
        throw new BadRequestException('Missing webhook body');
      }

      const event = (req.body?.event || '').toString();
      console.log('➡️ Event:', event);

      // Ignore non-payment events safely
      if (event && event !== 'charge.success') {
        console.log('⚠️ Ignored event:', event);
        return res.status(200).json({ received: true, ignored: true, event });
      }

      await this.paymentsService.handlePaystackWebhook({
        rawBody: req.rawBody,
        body: req.body,
        signature,
      });

      console.log('✅ Webhook processed successfully');

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('🔥 WEBHOOK ERROR:', err?.message);

      // Always return 200 so Paystack doesn’t spam retries
      return res.status(200).json({
        received: true,
        error: err?.message || 'Unknown error',
      });
    }
  }

  // -------------------------------
  // Admin recovery
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