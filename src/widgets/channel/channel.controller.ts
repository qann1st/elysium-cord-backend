import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { UserDto } from '../user/dto/user.dto';
import { ChannelService } from './channel.service';
import { ChannelDto } from './dto/channel.dto';

@Controller('/channel')
@ApiTags('Channel')
@UseGuards(AccessTokenGuard)
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get('/channels')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary:
      'Получение всех каналов (кроме серверных), в которых есть пользователь',
  })
  @ApiOkResponse({
    type: [ChannelDto],
  })
  async getChannels(@CurrentUser() user: UserDto) {
    return this.channelService.getChannels(user);
  }

  @Get('/:channelId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Получение канала по его айди',
  })
  @ApiParam({ name: 'channelId' })
  @ApiOkResponse({
    type: () => ChannelDto,
  })
  async getChannel(
    @CurrentUser() user: UserDto,
    @Param('channelId') channelId: string,
  ) {
    return this.channelService.getChannel(Number(channelId));
  }
}
