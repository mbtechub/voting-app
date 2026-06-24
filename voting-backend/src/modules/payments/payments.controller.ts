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
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/rbac/roles.decorator';
import { Role } from '../../auth/rbac/roles.enum';
import { RolesGuard } from '../../auth/rbac/roles.guard';
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
  async initiatePaystack(
    @Body() body: { cartUuid: string; email: string },
  ) {
    const cartUuid = (body?.cartUuid || '').trim();
    const email = (body?.email || '').trim();

    if (!cartUuid) {
      throw new BadRequestException('cartUuid is required');
    }

    if (!email) {
      throw new BadRequestException('email is required');
    }

    return this.paymentsService.initiatePaystack(
      cartUuid,
      email,
    );
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

    if (!ref) {
      return res?.redirect(
        302,
        `${frontendBase}/payment/processing`,
      );
    }

    return res?.redirect(
      302,
      `${frontendBase}/receipt/${encodeURIComponent(ref)}`,
    );
  }

  // -------------------------------
  // Paystack webhook (HARDENED)
  // -------------------------------
  @Post('webhook/paystack')
  @HttpCode(200)
  async paystackWebhook(
    @Req() req: any,
    @Res() res: Response,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    if (!signature) {
      throw new UnauthorizedException(
        'Missing x-paystack-signature',
      );
    }

    if (!req?.rawBody) {
      throw new BadRequestException(
        'Missing rawBody for webhook verification',
      );
    }

    if (!req?.body) {
      throw new BadRequestException(
        'Missing webhook body',
      );
    }

    const event = (
      req.body?.event || ''
    ).toString();

    if (
      event &&
      event !== 'charge.success'
    ) {
      return res.status(200).json({
        received: true,
        ignored: true,
        event,
      });
    }

    await this.paymentsService.handlePaystackWebhook({
      rawBody: req.rawBody,
      body: req.body,
      signature,
    });

    return res.status(200).json({
      received: true,
    });
  }

    // -------------------------------
  // Admin recovery
  // Supports:
  // { paystackRef: "REF" }
  // OR
  // { paystackRefs: ["REF1","REF2"] }
  // -------------------------------
  @Post('recover')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async recoverByReference(
    @Body()
    body: {
      paystackRef?: string;
      paystackRefs?: string[];
    },
  ) {
    // Single reference
    if (body?.paystackRef) {
      return this.paymentsService.recoverPaymentByReference(
        body.paystackRef.trim(),
      );
    }

    // Multiple references
    if (
      body?.paystackRefs &&
      Array.isArray(body.paystackRefs)
    ) {
      const refs = body.paystackRefs
        .filter(
          (ref) =>
            typeof ref === 'string' &&
            ref.trim().length > 0,
        )
        .map((ref) => ref.trim());

      if (!refs.length) {
        throw new BadRequestException(
          'No valid paystackRefs supplied',
        );
      }

      if (refs.length > 200) {
        throw new BadRequestException(
          'Maximum 200 references per request',
        );
      }

      const results: any[] = [];

      for (const ref of refs) {
        try {
          const result =
            await this.paymentsService.recoverPaymentByReference(
              ref,
            );

          results.push({
            paystackRef: ref,
            success: true,
            result,
          });
        } catch (error: any) {
          results.push({
            paystackRef: ref,
            success: false,
            error:
              error?.message ??
              'Unknown error',
          });
        }
      }

      return {
        processed: refs.length,
        successful: results.filter(
          (r) => r.success,
        ).length,
        failed: results.filter(
          (r) => !r.success,
        ).length,
        results,
      };
    }

    throw new BadRequestException(
      'paystackRef or paystackRefs is required',
    );
  }

  // -------------------------------
  // Payment Recovery Dashboard
  // -------------------------------
 @Get('recovery/pending')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
async getPendingRecoveries() {;
}
}
