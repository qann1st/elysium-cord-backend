import { v4 as uuidv4 } from 'uuid';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { TransporterService } from '../transporter/transporter.service';
import { USER_SELECT } from 'src/shared/constants';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private transporterService: TransporterService,
  ) {}

  async signUp(signUpDto: SignupDto) {
    const email = signUpDto.email.toLowerCase();
    const login = signUpDto.login.toLowerCase();

    const userExists = await this.prisma.user.findFirst({
      where: { OR: [{ email: email }, { login: login }] },
    });

    if (userExists) {
      throw new BadRequestException('User already exists');
    }

    const approveCode = uuidv4();

    this.transporterService.sendMail({
      to: email,
      subject: 'Подтверждение учетной записи',
      html: `<p>Чтобы подтвердить свою учетную запись, перейдите по ссылке: ${process.env.FRONTEND_URL}/approve/${approveCode}</p>`,
    });

    const newUser = await this.prisma.user.create({
      data: {
        ...signUpDto,
        password: signUpDto.password,
        approveCode,
        email,
        login,
      },
    });

    const payload = {
      id: newUser.id,
      email: newUser.email,
    };

    return await this.updateRefreshToken(newUser.id, payload);
  }

  async signIn(data: SigninDto) {
    if (!data.email && !data.login) {
      throw new BadRequestException('Email or login is required');
    }

    const email = data.email?.toLowerCase();
    const login = data.login?.toLowerCase();
    const loginData = {
      email,
      login,
    };

    const user = await this.prisma.user.findFirst({
      where: loginData,
    });

    if (!user) throw new BadRequestException('User does not exist');
    const passwordMatches = data.password !== user.password;

    if (!passwordMatches)
      throw new BadRequestException('Password is incorrect');

    const payload = {
      id: user.id,
      email: user.email,
    };

    return await this.updateRefreshToken(user.id, payload);
  }

  async approveAccount(approveCode: string) {
    const userApproveCodeExists = await this.prisma.user.findUnique({
      where: { approveCode },
    });

    if (userApproveCodeExists == null) {
      throw new BadRequestException('Approve code not exists');
    }

    await this.prisma.user.update({
      where: { approveCode },
      data: { approveCode: null, isEmailApproved: true },
    });

    return { success: true };
  }

  async logout(userId: number, refreshToken: string) {
    const token = await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });

    return { success: !!token };
  }

  async removeAllRefreshTokens(userId: number) {
    const update = await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
      },
    });

    return { success: !!update };
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const auth = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        token: refreshToken,
      },
    });

    if (!auth) throw new ForbiddenException('Access Denied');

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    const payload = {
      id: user.id,
      email: user.email,
    };

    await this.logout(user.id, refreshToken);
    return await this.updateRefreshToken(user.id, payload);
  }

  // async hashData(data: string) {
  //   const salt = await bcrypt.genSalt(10);
  //   return bcrypt.hash(data, salt);
  // }

  async updateRefreshToken(userId: number, payload: any) {
    const tokens = await this.getTokens(payload);

    const existingToken = await this.prisma.refreshToken.findFirst({
      where: { userId },
    });

    if (existingToken) {
      await this.prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { token: tokens.refreshToken },
      });
    } else {
      await this.prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          user: { connect: { id: userId } },
        },
      });
    }

    return tokens;
  }

  private getConfProp(key: string) {
    return this.configService.get<string>(key);
  }

  async getTokens(payload: any) {
    const [accessToken, refreshToken, socketToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.getConfProp('JWT_ACCESS_SECRET'),
        expiresIn: this.getConfProp('JWT_ACCESS_EXPIRES') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.getConfProp('JWT_REFRESH_SECRET'),
        expiresIn: this.getConfProp('JWT_REFRESH_EXPIRES') || '15d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.getConfProp('JWT_ACCESS_SECRET'),
        expiresIn: '10y',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      socketToken,
    };
  }

  async getUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    return user;
  }
}
