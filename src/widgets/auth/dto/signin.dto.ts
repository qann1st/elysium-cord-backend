import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class SigninDto {
  @ApiPropertyOptional({ default: 'mail@example.com' })
  @IsOptional()
  email?: string;
  @ApiPropertyOptional({ default: 'login' })
  @IsOptional()
  login?: string;
  @ApiProperty({ default: 'password' })
  password: string;
}
