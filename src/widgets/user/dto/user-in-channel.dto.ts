import { ApiProperty } from '@nestjs/swagger';

export class UserInChannelDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  nickname: string;
  @ApiProperty()
  avatar: string;
  @ApiProperty()
  isMuted: boolean;
  @ApiProperty()
  isDeafen: boolean;
  @ApiProperty()
  isOnline: boolean;
  @ApiProperty()
  isStreaming: boolean;
  @ApiProperty()
  bio: string;
  @ApiProperty()
  login: string;
}
