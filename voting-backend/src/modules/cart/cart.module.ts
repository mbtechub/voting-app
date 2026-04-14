import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { SequenceService } from '../../common/sequence.service';

// ✅ Import entity modules so TypeORM loads metadata
import { ElectionsModule } from '../elections/elections.module';
import { CandidatesModule } from '../candidates/candidates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem]),
    ElectionsModule,
    CandidatesModule,
  ],
  controllers: [CartController],
  providers: [CartService, SequenceService],
  exports: [CartService],
})
export class CartModule {}
