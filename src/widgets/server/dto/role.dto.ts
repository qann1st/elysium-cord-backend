import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServerMemberShipDto } from './server.dto';

export class RoleDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  color: string;
  @ApiProperty()
  permissions: string[];
  @ApiProperty()
  isDefault: boolean;
  @ApiProperty({ type: [ServerMemberShipDto] })
  memberships: ServerMemberShipDto[];
  @ApiProperty()
  order: number;
}

export class NewRoleDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  color: string;
}

export class EditRoleDto {
  @ApiPropertyOptional()
  name: string;
  @ApiPropertyOptional()
  color: string;
  @ApiProperty()
  permissions: string[];
}

export class SwapRoleDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  order: number;
}

export class SwapRolesDto {
  @ApiProperty({ type: [SwapRoleDto] })
  roles: SwapRoleDto[];
}
