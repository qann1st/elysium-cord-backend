import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class AcceptOrRequestOrRejectFriendDto {
  @ApiProperty()
  @IsNotEmpty()
  login: string;
}
