import { ApiProperty } from '@nestjs/swagger';
import { ChannelDto } from 'src/widgets/channel/dto/channel.dto';
import { UserDto } from 'src/widgets/user/dto/user.dto';

export class AcceptFriendDto {
  @ApiProperty({ type: () => UserDto })
  user: UserDto;
  @ApiProperty({ type: () => ChannelDto })
  channel: ChannelDto;
}
