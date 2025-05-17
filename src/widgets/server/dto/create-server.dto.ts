import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServerDto {
  @ApiPropertyOptional()
  avatar?: string;
  @ApiProperty()
  name: string;
}
