import { ApiProperty } from '@nestjs/swagger';

export class NewCategoryDto {
  @ApiProperty()
  name: string;
}

export class EditCategoryDto {
  @ApiProperty()
  name: string;
}
