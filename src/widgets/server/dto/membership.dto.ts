import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditMembershipDto {
  @ApiPropertyOptional()
  userServerName: string;
  @ApiPropertyOptional()
  addRoleId: number;
  @ApiPropertyOptional()
  removeRoleId: number;
  @ApiPropertyOptional()
  isServerMuted: boolean;
  @ApiPropertyOptional()
  isServerDeafen: boolean;
}
