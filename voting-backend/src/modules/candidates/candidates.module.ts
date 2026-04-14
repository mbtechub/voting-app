// src/modules/candidates/candidates.module.ts
// PURPOSE: Registers Candidate entity with TypeORM so other modules can query it.

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate } from './entities/candidate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Candidate])],
  exports: [TypeOrmModule],
})
export class CandidatesModule {}
