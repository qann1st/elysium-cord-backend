import { ApiProperty } from '@nestjs/swagger';
import { ChannelDto } from 'src/widgets/channel/dto/channel.dto';

export class CategoryDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty({ type: () => [ChannelDto] })
  channels: ChannelDto[];
}
