import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { UserDto } from '../user/dto/user.dto';
import { MessageService } from './message.service';
import { NewMessageDto } from './dto/new-message.dto';
import { MessageDto } from './dto/message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { MessagesWithPagination } from './dto/messages-with-pagination';

@Controller('channel')
@ApiTags('Channel')
@UseGuards(AccessTokenGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('/:channelId/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получение сообщений в канале' })
  @ApiParam({ name: 'channelId', type: () => Number })
  @ApiQuery({ name: 'page', type: () => Number })
  @ApiQuery({ name: 'limit', type: () => Number })
  @ApiOkResponse({
    type: MessagesWithPagination,
  })
  getMessages(
    @Param('channelId') channelId: string,
    @Query() { page, limit }: { page: string; limit: string },
    @CurrentUser() user: UserDto,
  ) {
    return this.messageService.getMessages(
      Number(page),
      Number(limit),
      Number(channelId),
      user,
    );
  }

  @Post('/:channelId/message')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Отправка сообщения в чат' })
  @ApiParam({ name: 'channelId', type: () => Number })
  @ApiOkResponse({
    type: () => MessageDto,
  })
  sendMessage(
    @Param('channelId') channelId: string,
    @CurrentUser() user: UserDto,
    @Body(ValidationPipe) data: NewMessageDto,
  ) {
    return this.messageService.sendMessage(user, data, Number(channelId));
  }

  @Patch('/:channelId/message/:messageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Изменение сообщения в чате' })
  @ApiParam({ name: 'channelId', type: () => Number })
  @ApiParam({ name: 'messageId', type: () => Number })
  @ApiOkResponse({
    type: () => MessageDto,
  })
  editMessage(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: UserDto,
    @Body(ValidationPipe) data: EditMessageDto,
  ) {
    return this.messageService.editMessage(
      user,
      Number(messageId),
      Number(channelId),
      data,
    );
  }

  @Delete('/:channelId/message/:messageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удаление сообщения в чате' })
  @ApiParam({ name: 'channelId', type: () => Number })
  @ApiParam({ name: 'messageId', type: () => Number })
  @ApiOkResponse({
    type: () => MessageDto,
  })
  deleteMessage(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: UserDto,
  ) {
    return this.messageService.deleteMessage(
      user,
      Number(messageId),
      Number(channelId),
    );
  }
}
