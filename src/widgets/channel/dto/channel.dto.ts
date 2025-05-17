import { ApiProperty } from '@nestjs/swagger';
import { ServerMemberShipDto } from 'src/widgets/server/dto/server.dto';
import { UserInChannelDto } from 'src/widgets/user/dto/user-in-channel.dto';

export class ChannelDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
  @ApiProperty({ type: [UserInChannelDto] })
  users: UserInChannelDto[];
  @ApiProperty()
  isGroup: boolean;
  @ApiProperty()
  isActiveCall: boolean;
  @ApiProperty({ type: [ServerMemberShipDto] })
  usersInCall: ServerMemberShipDto[];
  @ApiProperty()
  callStart: Date;
  @ApiProperty()
  name: string;
  @ApiProperty()
  isServerChannel: boolean;
  @ApiProperty()
  isVoice: boolean;
  @ApiProperty()
  isText: boolean;
  @ApiProperty()
  serverId: number;
  @ApiProperty()
  categoryId: number;
}
