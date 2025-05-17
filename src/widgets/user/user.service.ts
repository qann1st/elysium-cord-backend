import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { UserEditDto } from './dto/user-edit.dto';
import { USER_SELECT } from 'src/shared/constants';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async getUser(id: number) {
    if (!id) {
      throw new BadRequestException('Id is required');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async editUser(id: number, data: UserEditDto) {
    if (!id) {
      throw new BadRequestException('Id is required');
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    return updatedUser;
  }
}
