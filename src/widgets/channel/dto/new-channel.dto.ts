import { ApiProperty } from '@nestjs/swagger';

export class NewChannelDto {
  @ApiProperty()
  type: 'voice' | 'text';
  @ApiProperty()
  name: string;
}

export class EditChannelDto {
  @ApiProperty()
  name: string;
}
