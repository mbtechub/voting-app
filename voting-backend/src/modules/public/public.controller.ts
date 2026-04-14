import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PublicService } from './public.service';
import { PublicReceiptService } from './public-receipt.service';
import { Express } from 'express';
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly receiptService: PublicReceiptService,
  ) {}

  // GET /api/public/elections
  @Get('elections')
  listActiveElections() {
    return this.publicService.listActiveElections();
  }

  // GET /api/public/elections/:electionId/candidates
  @Get('elections/:electionId/candidates')
  listElectionCandidates(
    @Param('electionId', ParseIntPipe) electionId: number,
  ) {
    return this.publicService.listElectionCandidates(electionId);
  }

  /**
   * GET /api/public/receipt/:refOrCartUuid
   * - Accepts Paystack reference OR cart UUID
   * - Returns authoritative receipt based on VOTE_LOGS
   */
  @Get('receipt/:refOrCartUuid')
  getReceipt(@Param('refOrCartUuid') refOrCartUuid: string) {
    return this.receiptService.getReceipt(refOrCartUuid.trim());
  }

  /**
   * GET /api/public/receipt/:refOrCartUuid/pdf
   * Returns a PDF receipt (Paystack reference OR cart UUID).
   *
   * Notes:
   * - Uses `import type { Response }` to avoid TS1272
   * - Sets Content-Length + cache-control for reliability
   * - Defaults to inline viewing (change to attachment if you prefer)
   */
  @Get('receipt/:refOrCartUuid/pdf')
  async getReceiptPdf(
    @Param('refOrCartUuid') refOrCartUuid: string,
    @Res() res: Response,
  ) {
    const { reference, buffer } = await this.receiptService.getReceiptPdf(
      refOrCartUuid.trim(),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="receipt-${reference}.pdf"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).send(buffer);
  }
}
