import { IsIn } from 'class-validator';

export class SetElectionStatusDto {
  @IsIn(['DRAFT', 'ACTIVE', 'ENDED', 'DISABLED'])
  status!: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'DISABLED';
}