import { ApiProperty } from '@nestjs/swagger';
import { IsAlphanumeric, IsEmail, IsNotEmpty } from 'class-validator';

export class SignupDto {
  @IsEmail()
  @ApiProperty({ default: 'mail@example.com' })
  email: string;
  @IsNotEmpty()
  @IsAlphanumeric()
  @ApiProperty({ default: 'login' })
  login: string;
  @IsNotEmpty()
  @ApiProperty({ default: 'nickname' })
  nickname: string;
  @IsNotEmpty()
  @ApiProperty({ default: 'password' })
  password: string;
}
