// src/modules/elections/elections.module.ts
// PURPOSE: Registers Election entity with TypeORM so other modules can query it.

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Election } from './entities/election.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Election])],
  exports: [TypeOrmModule], // ✅ makes Election repository available to other modules if needed
})
export class ElectionsModule {}
