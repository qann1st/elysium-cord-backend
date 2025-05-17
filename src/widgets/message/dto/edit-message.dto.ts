import { ApiProperty } from '@nestjs/swagger';

export class EditMessageDto {
  @ApiProperty()
  content: string;
}
