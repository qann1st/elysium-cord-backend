import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { UserDto } from '../user/dto/user.dto';
import { AcceptFriendDto } from './dto/accept-friend.dto';
import { AcceptOrRequestOrRejectFriendDto } from './dto/accept-or-request-or-reject-friend.dto';
import {
  FriendsIncomingPaginationDto,
  FriendsOutgoingPaginationDto,
  FriendsPaginationDto,
} from './dto/friends-pagination-dto';
import { FriendsService } from './friends.service';

@Controller('friends')
@ApiTags('Friends')
@UseGuards(AccessTokenGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get('')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Получить друзей',
  })
  @ApiOkResponse({ type: () => FriendsPaginationDto })
  async getFriends(
    @CurrentUser() user: UserDto,
    @Query() { page, limit }: { page: string; limit: string },
  ) {
    return this.friendsService.getFriendsAll(
      user,
      Number(page),
      Number(limit),
      'friends',
    );
  }

  @Get('incoming-friends')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Получить входящие запросы в друзья',
  })
  @ApiOkResponse({ type: () => FriendsIncomingPaginationDto })
  async getIncomingFriends(
    @CurrentUser() user: UserDto,
    @Query() { page, limit }: { page: string; limit: string },
  ) {
    return this.friendsService.getFriendsAll(
      user,
      Number(page),
      Number(limit),
      'friendsIncomingRequests',
    );
  }

  @Get('outgoing-friends')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Получить исходящие запросы в друзья',
  })
  @ApiOkResponse({ type: () => FriendsOutgoingPaginationDto })
  async getOutgoingFriends(
    @CurrentUser() user: UserDto,
    @Query() { page, limit }: { page: string; limit: string },
  ) {
    return this.friendsService.getFriendsAll(
      user,
      Number(page),
      Number(limit),
      'friendsOutgoingRequests',
    );
  }

  @Post('/request-friend')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Отправить запрос в друзья другому пользователю',
  })
  @ApiOkResponse({ type: () => UserDto })
  async requestFriend(
    @CurrentUser() user: UserDto,
    @Body(ValidationPipe) data: AcceptOrRequestOrRejectFriendDto,
  ) {
    return this.friendsService.requestFriend(user, data.login);
  }

  @Post('/accept-friend')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Принять запрос в друзья от другого пользователя',
  })
  @ApiOkResponse({ type: () => AcceptFriendDto })
  async acceptFriend(
    @CurrentUser() user: UserDto,
    @Body(ValidationPipe) data: AcceptOrRequestOrRejectFriendDto,
  ) {
    return this.friendsService.acceptFriend(user, data.login);
  }

  @Post('/reject-friend')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Отправить запрос в друзья другому пользователю',
  })
  @ApiOkResponse({ type: () => UserDto })
  async rejectFriend(
    @CurrentUser() user: UserDto,
    @Body(ValidationPipe) data: AcceptOrRequestOrRejectFriendDto,
  ) {
    return this.friendsService.rejectFriend(user, data.login);
  }
}
