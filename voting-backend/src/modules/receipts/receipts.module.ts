import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Receipt } from './entities/receipt.entity';
import { ReceiptsService } from './receipts.service';
import { ReceiptsReadService } from './receipts.read.service';
import { ReceiptsPdfService } from './receipts.pdf.service';
import { ReceiptsPublicController } from './receipts.public.controller';

import { Payment } from '../payments/entities/payment.entity';
import { Cart } from '../cart/entities/cart.entity';
import { VoteLog } from '../votes/entities/vote-log.entity';
import { Candidate } from '../candidates/entities/candidate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Receipt,
      Payment,
      Cart,
      VoteLog,
      Candidate,
    ]),
  ],
  controllers: [ReceiptsPublicController],
  providers: [
    ReceiptsService,
    ReceiptsReadService,
    ReceiptsPdfService,
  ],
  exports: [
    ReceiptsService,
    ReceiptsReadService,
    ReceiptsPdfService,
  ],
})
export class ReceiptsModule {}
