import { ApiProperty } from '@nestjs/swagger';
import { ServerDto } from './server.dto';

export class ServerWithPagination {
  @ApiProperty({ type: [ServerDto] })
  servers: ServerDto[];
  @ApiProperty()
  total: number;
}
