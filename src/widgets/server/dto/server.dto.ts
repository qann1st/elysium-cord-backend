import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryDto } from 'src/widgets/category/dto/category.dto';
import { UserInChannelDto } from 'src/widgets/user/dto/user-in-channel.dto';
import { RoleDto } from './role.dto';
import { UserDto } from 'src/widgets/user/dto/user.dto';

export class MinifiedChannelDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  categoryId: number;
}

export class ServerMemberShipDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  user: UserInChannelDto;
  @ApiProperty({ type: [RoleDto] })
  roles: RoleDto[];
  @ApiProperty()
  isOwner: boolean;
  @ApiProperty()
  joinedServer: Date;
  @ApiPropertyOptional()
  channel: MinifiedChannelDto;
  @ApiProperty()
  isServerMuted: boolean;
  @ApiProperty()
  userServerName: string;
  @ApiProperty()
  isServerDeafen: boolean;
}

export class ServerUsersDto {
  @ApiProperty({ type: [ServerMemberShipDto] })
  online: ServerMemberShipDto[];
  @ApiProperty({ type: [ServerMemberShipDto] })
  offline: ServerMemberShipDto[];
  @ApiProperty()
  total: number;
}

export class ServerDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
  @ApiProperty()
  avatar: string;
  @ApiProperty()
  name: string;
  @ApiProperty({ type: [CategoryDto] })
  categories: CategoryDto[];
  @ApiProperty({ type: [String] })
  connectServerLinks: string[];
}

export class BannedUsersDto {
  @ApiProperty({ type: [UserDto] })
  bannedUsers: UserDto;
}
