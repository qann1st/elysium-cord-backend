import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServerMemberShipDto } from './server.dto';

export class ServerMinifiedDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  avatar: string;
  @ApiPropertyOptional()
  categoryId: number;
  @ApiPropertyOptional()
  channelId: number;
  @ApiProperty({ type: [ServerMemberShipDto] })
  firstUsersInChannels: ServerMemberShipDto[];
  @ApiPropertyOptional()
  totalUsersInChannels: number;
}

export class ServerMinifiedWithPaginationDto {
  @ApiProperty({ type: [ServerMinifiedDto] })
  servers: ServerMinifiedDto[];
  @ApiProperty()
  total: number;
}
