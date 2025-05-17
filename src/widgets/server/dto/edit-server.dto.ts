import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditServerDto {
  @ApiPropertyOptional()
  avatar?: string;
  @ApiPropertyOptional()
  name?: string;
}
