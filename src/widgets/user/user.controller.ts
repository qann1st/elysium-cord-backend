import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { UserEditDto } from './dto/user-edit.dto';
import { UserDto } from './dto/user.dto';
import { UserService } from './user.service';

@ApiBearerAuth('Authorization')
@UseGuards(AccessTokenGuard)
@Controller('/users')
@ApiTags('User')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Получить своего пользователя',
  })
  @ApiOkResponse({ type: UserDto })
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Put('/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Изменение своего пользователя',
  })
  @ApiOkResponse({ type: UserDto })
  editMe(@CurrentUser() user: User, @Body(ValidationPipe) data: UserEditDto) {
    return this.userService.editUser(user.id, data);
  }
}
