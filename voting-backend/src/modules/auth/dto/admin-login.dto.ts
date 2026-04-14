import { IsOptional, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  /**
   * NEW (preferred): username OR email
   */
  @IsOptional()
  @IsString()
  identifier?: string;

  /**
   * Backward compatibility: existing clients may still send "email"
   */
  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
