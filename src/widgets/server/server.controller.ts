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
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CategoryDto } from '../category/dto/category.dto';
import { ChannelDto } from '../channel/dto/channel.dto';
import { EditChannelDto, NewChannelDto } from '../channel/dto/new-channel.dto';
import { UserDto } from '../user/dto/user.dto';
import { CreateServerDto } from './dto/create-server.dto';
import { EditMembershipDto } from './dto/membership.dto';
import { EditCategoryDto, NewCategoryDto } from './dto/new-category.dto';
import { EditRoleDto, NewRoleDto, RoleDto, SwapRolesDto } from './dto/role.dto';
import {
  ServerMinifiedDto,
  ServerMinifiedWithPaginationDto,
} from './dto/server-minified.dto';
import {
  BannedUsersDto,
  ServerDto,
  ServerMemberShipDto,
  ServerUsersDto,
} from './dto/server.dto';
import { ServerService } from './server.service';
import { EditServerDto } from './dto/edit-server.dto';

@UseGuards(AccessTokenGuard)
@Controller('servers')
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  @ApiTags('Server')
  @Get('')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Получить все сервера в которых состоит пользователь',
  })
  @ApiOkResponse({ type: () => ServerMinifiedWithPaginationDto })
  @ApiQuery({ name: 'page' })
  @ApiQuery({ name: 'limit' })
  getServers(
    @CurrentUser() user: UserDto,
    @Query() { page, limit }: { page: string; limit: string },
  ) {
    return this.serverService.getServers(user, Number(page), Number(limit));
  }

  @ApiTags('Server')
  @Get(':serverId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Получить сервер по его id',
  })
  @ApiParam({ name: 'serverId' })
  @ApiOkResponse({ type: () => ServerDto })
  getServer(@CurrentUser() user: UserDto, @Param('serverId') serverId: string) {
    return this.serverService.getServer(user, Number(serverId));
  }

  @ApiTags('Server')
  @Get(':serverId/user')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Получить своего membershipa внутри сервера по его id',
  })
  @ApiParam({ name: 'serverId' })
  @ApiOkResponse({ type: () => ServerMemberShipDto })
  getMembershipUserServer(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
  ) {
    return this.serverService.getMembershipUserServer(user, Number(serverId));
  }

  @ApiTags('Server')
  @Get(':serverId/users')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Получить пользователей внутри сервера',
  })
  @ApiParam({ name: 'serverId' })
  @ApiOkResponse({ type: () => ServerUsersDto })
  @ApiQuery({ name: 'page' })
  @ApiQuery({ name: 'limit' })
  getServerUsers(
    @Param('serverId') serverId: string,
    @Query() { page, limit }: { page: string; limit: string },
  ) {
    return this.serverService.getServerUsers(
      Number(serverId),
      Number(page),
      Number(limit),
    );
  }

  @ApiTags('Server')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Создать новый сервер',
  })
  @ApiCreatedResponse({ type: () => ServerMinifiedDto })
  createServer(
    @Body(ValidationPipe) data: CreateServerDto,
    @CurrentUser() user: UserDto,
  ) {
    return this.serverService.createServer(user, data);
  }

  @ApiTags('Server')
  @Post('/:serverId/link')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Создать ссылку-приглашение на сервер',
  })
  @ApiParam({ name: 'serverId' })
  @ApiOkResponse({ type: String })
  createServerLink(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
  ) {
    return this.serverService.createServerLink(user, Number(serverId));
  }

  @ApiTags('Server')
  @Post('/:code/join')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Подключиться к серверу по ссылке-приглашению',
  })
  @ApiParam({ name: 'code' })
  @ApiOkResponse({ type: ServerMinifiedDto })
  joinServer(@CurrentUser() user: UserDto, @Param('code') code: string) {
    return this.serverService.joinServer(user, code);
  }

  @ApiTags('Server')
  @Delete('/:serverId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Удалить сервер',
  })
  @ApiParam({ name: 'serverId' })
  @ApiCreatedResponse({ schema: { default: { serverId: 0 } } })
  deleteServer(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
  ) {
    return this.serverService.deleteServer(user, Number(serverId));
  }

  @ApiTags('Server')
  @Delete('/:serverId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Выйти с сервера',
  })
  @ApiParam({ name: 'serverId' })
  @ApiCreatedResponse({ schema: { default: { serverId: 0 } } })
  leaveServer(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
  ) {
    return this.serverService.leaveServer(user, Number(serverId));
  }

  @ApiTags('ServerRole')
  @Get('/:serverId/roles')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Получить все роли на сервере',
  })
  @ApiParam({ name: 'serverId' })
  @ApiOkResponse({ type: RoleDto })
  getRoles(@CurrentUser() user: UserDto, @Param('serverId') serverId: string) {
    return this.serverService.getRoles(user, Number(serverId));
  }

  @ApiTags('ServerRole')
  @Post('/:serverId/role')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Создать новую роль',
  })
  @ApiParam({ name: 'serverId' })
  @ApiOkResponse({ type: RoleDto })
  createRole(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Body(ValidationPipe) data: NewRoleDto,
  ) {
    return this.serverService.createRole(user, Number(serverId), data);
  }

  @ApiTags('ServerRole')
  @Patch('/:serverId/role/:roleId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Изменить роль',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'roleId' })
  @ApiOkResponse({ type: RoleDto })
  editRole(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('roleId') roleId: string,
    @Body(ValidationPipe) data: EditRoleDto,
  ) {
    return this.serverService.editRole(
      user,
      Number(serverId),
      Number(roleId),
      data,
    );
  }

  @ApiTags('ServerRole')
  @Patch('/:serverId/role/swap')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Свап ролей по order',
  })
  @ApiParam({ name: 'serverId' })
  @ApiOkResponse({ type: SwapRolesDto })
  swapRoles(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Body(ValidationPipe) data: SwapRolesDto,
  ) {
    return this.serverService.swapRoles(user, Number(serverId), data);
  }

  @ApiTags('ServerRole')
  @Delete('/:serverId/role/:roleId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Удалить роль',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'roleId' })
  @ApiOkResponse({ schema: { default: { roleId: 0 } } })
  deleteRole(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.serverService.deleteRole(
      user,
      Number(serverId),
      Number(roleId),
    );
  }

  @ApiTags('ServerChannel')
  @Post('/:serverId/channel/:categoryId')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Создать новый канал',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'categoryId' })
  @ApiCreatedResponse({ type: ChannelDto })
  createChannel(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
    @Body(ValidationPipe) data: NewChannelDto,
  ) {
    return this.serverService.createChannel(
      user,
      Number(serverId),
      Number(categoryId),
      data,
    );
  }

  @ApiTags('Server')
  @Patch('/:serverId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Изменить сервер',
  })
  @ApiParam({ name: 'serverId' })
  @ApiOkResponse({ type: ServerMinifiedDto })
  editServer(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Body(ValidationPipe) data: EditServerDto,
  ) {
    return this.serverService.editServer(user, Number(serverId), data);
  }

  @ApiTags('ServerChannel')
  @Patch('/:serverId/channel/:categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Изменить канал',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'categoryId' })
  @ApiOkResponse({ type: ChannelDto })
  editChannel(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
    @Body(ValidationPipe) data: EditChannelDto,
  ) {
    return this.serverService.editChannel(
      user,
      Number(serverId),
      Number(categoryId),
      data,
    );
  }

  @ApiTags('ServerChannel')
  @Delete('/:serverId/channel/:categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Удалить канал',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'categoryId' })
  @ApiOkResponse({ type: ChannelDto })
  deleteChannel(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.serverService.deleteChannel(
      user,
      Number(serverId),
      Number(categoryId),
    );
  }

  @ApiTags('ServerCategory')
  @Post('/:serverId/category')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Создать новую категорию',
  })
  @ApiParam({ name: 'serverId' })
  @ApiCreatedResponse({ type: CategoryDto })
  createCategory(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Body(ValidationPipe) data: NewCategoryDto,
  ) {
    return this.serverService.createCategory(user, Number(serverId), data);
  }

  @ApiTags('ServerCategory')
  @Post('/:serverId/category/:categoryId')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Изменить категорию',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'categoryId' })
  @ApiCreatedResponse({ type: CategoryDto })
  editCategory(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
    @Body(ValidationPipe) data: EditCategoryDto,
  ) {
    return this.serverService.editCategory(
      user,
      Number(serverId),
      Number(categoryId),
      data,
    );
  }

  @ApiTags('ServerCategory')
  @Delete('/:serverId/category/:categoryId')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Удалить категорию',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'categoryId' })
  @ApiCreatedResponse({ schema: { default: { categoryId: 0 } } })
  deleteCategory(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.serverService.deleteCategory(
      user,
      Number(serverId),
      Number(categoryId),
    );
  }

  @ApiTags('ServerMemberships')
  @Patch('/:serverId/membership/:membershipId')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Изменить пользователя на сервере',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'membershipId' })
  @ApiCreatedResponse({ type: ServerMemberShipDto })
  editMembership(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('membershipId') membershipId: string,
    @Body(ValidationPipe) data: EditMembershipDto,
  ) {
    return this.serverService.editMembership(
      user,
      Number(serverId),
      Number(membershipId),
      data,
    );
  }

  @ApiTags('ServerMemberships')
  @Delete('/:serverId/membership/:membershipId/kick')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Кикнуть пользователя с сервера',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'membershipId' })
  @ApiCreatedResponse({ type: ServerMemberShipDto })
  kickMembership(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.serverService.kickMembership(
      user,
      Number(serverId),
      Number(membershipId),
    );
  }

  @ApiTags('ServerMemberships')
  @Delete('/:serverId/membership/:membershipId/ban')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Забанить пользователя на сервере',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'membershipId' })
  @ApiCreatedResponse({ type: ServerMemberShipDto })
  banMembership(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.serverService.banMembership(
      user,
      Number(serverId),
      Number(membershipId),
    );
  }

  @ApiTags('ServerMemberships')
  @Delete('/:serverId/membership/:membershipId/unban')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Разбанить пользователя на сервере',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'membershipId' })
  @ApiCreatedResponse({ type: ServerMemberShipDto })
  unbanMembership(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.serverService.unbanMembership(
      user,
      Number(serverId),
      Number(membershipId),
    );
  }

  @ApiTags('ServerMemberships')
  @Delete('/:serverId/membership/:membershipId/kick-from-channel')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Кикнуть пользователя из канала',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'membershipId' })
  @ApiCreatedResponse({ type: ServerMemberShipDto })
  kickFromChannel(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.serverService.kickFromChannel(
      user,
      Number(serverId),
      Number(membershipId),
    );
  }

  @ApiTags('ServerMemberships')
  @Put('/:serverId/membership/:membershipId/move-to-channel/:channelId')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Переместить пользователя из канала в канал',
  })
  @ApiParam({ name: 'serverId' })
  @ApiParam({ name: 'membershipId' })
  @ApiParam({ name: 'channelId' })
  @ApiCreatedResponse({ type: ServerMemberShipDto })
  moveUserToChannel(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('membershipId') membershipId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.serverService.moveMembership(
      user,
      Number(serverId),
      Number(channelId),
      Number(membershipId),
    );
  }

  @ApiTags('Server')
  @Get('/:serverId/banned-users')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary: 'Получить забаненных пользователей',
  })
  @ApiParam({ name: 'serverId' })
  @ApiCreatedResponse({ type: BannedUsersDto })
  getBannedUsers(
    @CurrentUser() user: UserDto,
    @Param('serverId') serverId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.serverService.unbanMembership(
      user,
      Number(serverId),
      Number(membershipId),
    );
  }
}
