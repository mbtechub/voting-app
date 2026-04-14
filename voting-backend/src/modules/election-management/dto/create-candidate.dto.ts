import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCandidateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  photoUrl?: string | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  votePrice?: number; // overrides election default if present
}