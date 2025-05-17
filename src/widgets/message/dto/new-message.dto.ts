import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NewMessageDto {
  @ApiProperty()
  content: string;
  @ApiPropertyOptional()
  repliedMessageId: number;
  @ApiPropertyOptional()
  files: string[];
}
