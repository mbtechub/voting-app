import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateElectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsDateString()
  startDate!: string; // ISO string

  @IsDateString()
  endDate!: string; // ISO string

  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultVotePrice?: number; // NUMBER(10,2)

  @IsString()
  @IsOptional()
  @MaxLength(20)
  status?: string; // DRAFT | ACTIVE | ENDED | DISABLED
}