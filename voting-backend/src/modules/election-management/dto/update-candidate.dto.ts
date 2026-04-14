import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCandidateDto {

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  photoUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  votePrice?: number;
}