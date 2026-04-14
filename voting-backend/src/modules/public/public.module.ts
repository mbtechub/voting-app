import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PublicCartController } from './public-cart.controller';
import { PublicReceiptService } from './public-receipt.service';

import { Election } from '../elections/entities/election.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Election, Candidate]),
    CartModule,
  ],
  controllers: [PublicController, PublicCartController],
  providers: [PublicService, PublicReceiptService],
})
export class PublicModule {}
