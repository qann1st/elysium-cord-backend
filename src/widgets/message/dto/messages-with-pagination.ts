import { ApiProperty } from '@nestjs/swagger';
import { MessageDto } from './message.dto';

export class MessagesWithPagination {
  @ApiProperty({ type: [MessageDto] })
  messages: MessageDto[];
  @ApiProperty()
  total: number;
}
