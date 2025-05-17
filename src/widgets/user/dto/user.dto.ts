import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
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
  @ApiProperty()
  isMuted: boolean;
  @ApiProperty()
  isDeafen: boolean;
  @ApiProperty()
  isStreaming: boolean;
}
