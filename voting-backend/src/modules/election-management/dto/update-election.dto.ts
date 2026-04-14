import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateElectionDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultVotePrice?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  status?: string;
}