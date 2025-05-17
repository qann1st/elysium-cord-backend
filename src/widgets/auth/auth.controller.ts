import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { JwtRefreshPayload } from './strategies/refresh-token.strategy';
import { TokensDto } from './dto/tokens.dto';

@Controller('/auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary:
      'Регистрация нового пользователя, и отсылка ему на почту письма с подтверждением',
  })
  @ApiCreatedResponse({ type: TokensDto })
  async signUp(
    @Res() res: Response,
    @Body(ValidationPipe) signUpDto: SignupDto,
  ) {
    const tokens = await this.authService.signUp(signUpDto);

    res.cookie('rt', tokens.refreshToken, {
      expires: new Date(Date.now() + 1296000000),
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.cookie('at', tokens.accessToken, {
      expires: new Date(Date.now() + 900000),
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    res.send({ socketToken: tokens.socketToken });
  }

  @HttpCode(HttpStatus.OK)
  @Post('/signin')
  @ApiBearerAuth('Authorization')
  @ApiOperation({
    summary:
      'Авторизация уже существующего пользователя с помощью почты или логина',
  })
  @ApiOkResponse({ type: TokensDto })
  async signIn(@Res() res: Response, @Body(ValidationPipe) user: SigninDto) {
    const tokens = await this.authService.signIn(user);

    res.cookie('rt', tokens.refreshToken, {
      expires: new Date(Date.now() + 1296000000),
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.cookie('at', tokens.accessToken, {
      expires: new Date(Date.now() + 900000),
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    res.send({ socketToken: tokens.socketToken });
  }

  @HttpCode(HttpStatus.OK)
  @Put('/approve/:code')
  @ApiOperation({
    summary:
      'Подтверждение почты пользователя, принимает код из письма который пришел пользователю на почту',
  })
  async approveAccount(@Res() res: Response, @Param('code') code: string) {
    await this.authService.approveAccount(code);

    res.end();
  }

  @UseGuards(RefreshTokenGuard)
  @Delete('/logout')
  @ApiOperation({
    summary: 'Разлогин из профиля и удаление куки',
  })
  async logout(
    @Res() res: Response,
    @CurrentUser() payload: JwtRefreshPayload,
  ) {
    await this.authService.logout(payload.id, payload.refreshToken);

    res.clearCookie('at');
    res.clearCookie('rt');

    return res.end();
  }

  @UseGuards(RefreshTokenGuard)
  @Post('/refresh')
  @ApiOperation({
    summary: 'Рефреш куки, когда accessToken просрочился',
  })
  async refreshTokens(
    @Res() res: Response,
    @CurrentUser() payload: JwtRefreshPayload,
  ) {
    const tokens = await this.authService.refreshTokens(
      payload.id,
      payload.refreshToken,
    );

    res.cookie('rt', tokens.refreshToken, {
      expires: new Date(Date.now() + 1296000000),
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.cookie('at', tokens.accessToken, {
      expires: new Date(Date.now() + 900000),
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    res.send({ socketToken: tokens.socketToken });
  }
}
