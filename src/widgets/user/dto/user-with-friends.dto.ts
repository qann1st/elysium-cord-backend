import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';

export class UserWithFriendsDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
  @ApiProperty()
  email: string;
  @ApiProperty()
  login: string;
  @ApiProperty()
  nickname: string;
  @ApiProperty()
  avatar: string;
  @ApiProperty()
  isOnline: boolean;
  @ApiProperty()
  bio: string;
  @ApiProperty({ type: () => [UserDto] })
  friends: UserDto[];
  @ApiProperty({ type: () => [UserDto] })
  friendsIncomingRequests: UserDto[];
  @ApiProperty({ type: () => [UserDto] })
  friendsOutgoingRequests: UserDto[];
  @ApiProperty()
  isMuted: boolean;
  @ApiProperty()
  isDeafen: boolean;
  @ApiProperty()
  isStreaming: boolean;
}
