import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserInChannelDto } from 'src/widgets/user/dto/user-in-channel.dto';

export class MessageDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
  @ApiProperty()
  content: string;
  @ApiProperty()
  author: UserInChannelDto;
  @ApiPropertyOptional()
  files: string[];
  @ApiProperty()
  isEdited: boolean;
  @ApiPropertyOptional()
  repliedMessage: MessageDto | null;
}
