import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from 'src/widgets/user/dto/user.dto';

export class FriendsPaginationDto {
  @ApiProperty({ type: [UserDto] })
  friends: UserDto[];
  @ApiProperty()
  total: number;
}

export class FriendsIncomingPaginationDto {
  @ApiProperty({ type: [UserDto] })
  friendsIncomingRequests: UserDto[];
  @ApiProperty()
  total: number;
}

export class FriendsOutgoingPaginationDto {
  @ApiProperty({ type: [UserDto] })
  friendsOutgoingRequests: UserDto[];
  @ApiProperty()
  total: number;
}
