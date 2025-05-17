import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserEditDto {
  @ApiPropertyOptional()
  avatar?: string;
  @ApiPropertyOptional()
  nickname?: string;
  @ApiPropertyOptional()
  bio?: string;
}
