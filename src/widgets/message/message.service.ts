import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CHANNEL_SELECT,
  MESSAGE_SELECT,
  SERVER_SELECT,
} from 'src/shared/constants';

import { PrismaService } from 'src/shared/prisma/prisma.service';
import { UserDto } from '../user/dto/user.dto';
import { NewMessageDto } from './dto/new-message.dto';
import { MessageGateway } from './message.gateway';
import { EditMessageDto } from './dto/edit-message.dto';

@Injectable()
export class MessageService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  async getMessages(
    page: number,
    limit: number,
    channelId: number,
    user: UserDto,
  ) {
    if (!page || !limit) {
      throw new BadRequestException('Page or limit are required');
    }

    if (!channelId) {
      throw new BadRequestException('Channel id are required');
    }

    const channel = await this.prismaService.channel.findUnique({
      where: { id: channelId },
      select: CHANNEL_SELECT,
    });

    if (!channel) {
      throw new BadRequestException('Channel not found');
    }

    if (channel.isServerChannel) {
      const server = await this.prismaService.server.findUnique({
        where: { id: channel.serverId },
        select: SERVER_SELECT,
      });

      const hasUserInServer = server.users.some(
        (serverUser) => serverUser.user.id === user.id,
      );

      if (!hasUserInServer) {
        throw new BadRequestException('User not in channel');
      }
    } else {
      const hasUserInChannel = channel.users.some(
        (channelUser) => channelUser.id === user.id,
      );

      if (!hasUserInChannel) {
        throw new BadRequestException('User not in channel');
      }
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const messages = await this.prismaService.message.findMany({
      where: { channelId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: MESSAGE_SELECT,
    });

    const total = await this.prismaService.message.count({
      where: { channelId },
    });

    return {
      messages,
      total,
    };
  }

  async sendMessage(user: UserDto, data: NewMessageDto, channelId: number) {
    const channel = await this.prismaService.channel.findUnique({
      where: { id: channelId },
      select: CHANNEL_SELECT,
    });

    if (channel.isServerChannel) {
      const server = await this.prismaService.server.findUnique({
        where: { id: channel.serverId },
        select: SERVER_SELECT,
      });

      const hasUserInServer = server.users.some(
        (serverUser) => serverUser.user.id === user.id,
      );

      if (!hasUserInServer) {
        throw new BadRequestException('User not in channel');
      }
    } else {
      const hasUserInChannel = channel.users.some(
        (channelUser) => channelUser.id === user.id,
      );

      if (!hasUserInChannel) {
        throw new BadRequestException('User not in channel');
      }
    }

    const message = await this.prismaService.message.create({
      data: {
        content: data.content,
        author: { connect: { id: user.id } },
        repliedMessage: data.repliedMessageId && {
          connect: { id: data.repliedMessageId },
        },
        channel: { connect: { id: channelId } },
        files: data.files,
      },
      select: MESSAGE_SELECT,
    });

    await this.prismaService.channel.update({
      where: { id: channelId },
      data: { messages: { connect: { id: message.id } } },
    });

    if (channel.isServerChannel) {
      await this.messageGateway.sendToRoomMessage(channel.serverId, message);
    } else {
      channel.users.forEach(async (user) => {
        await this.messageGateway.sendMessage(message, user.id);
      });
    }

    return message;
  }

  async editMessage(
    user: UserDto,
    messageId: number,
    channelId: number,
    { content }: EditMessageDto,
  ) {
    const channel = await this.prismaService.channel.findUnique({
      where: { id: channelId },
      select: CHANNEL_SELECT,
    });

    if (channel.isServerChannel) {
      const server = await this.prismaService.server.findUnique({
        where: { id: channel.serverId },
        select: SERVER_SELECT,
      });

      const hasUserInServer = server.users.some(
        (serverUser) => serverUser.user.id === user.id,
      );

      if (!hasUserInServer) {
        throw new BadRequestException('User not in channel');
      }
    } else {
      const hasUserInChannel = channel.users.some(
        (channelUser) => channelUser.id === user.id,
      );

      if (!hasUserInChannel) {
        throw new BadRequestException('User not in channel');
      }
    }

    const message = await this.prismaService.message.findUnique({
      where: { id: messageId },
      select: MESSAGE_SELECT,
    });

    if (message.author.id !== user.id) {
      throw new BadRequestException('You are not the author of this message');
    }

    await this.prismaService.message.update({
      where: { id: messageId },
      data: { content, isEdited: true },
      select: MESSAGE_SELECT,
    });

    if (channel.isServerChannel) {
      await this.messageGateway.editInRoomMessage(channel.serverId, message);
    } else {
      channel.users.forEach(async (user) => {
        await this.messageGateway.editMessage(message, user.id);
      });
    }

    return message;
  }

  async deleteMessage(user: UserDto, messageId: number, channelId: number) {
    const channel = await this.prismaService.channel.findUnique({
      where: { id: channelId },
      select: CHANNEL_SELECT,
    });

    if (channel.isServerChannel) {
      const server = await this.prismaService.server.findUnique({
        where: { id: channel.serverId },
        select: SERVER_SELECT,
      });

      const hasUserInServer = server.users.some(
        (serverUser) => serverUser.user.id === user.id,
      );

      if (!hasUserInServer) {
        throw new BadRequestException('User not in channel');
      }
    } else {
      const hasUserInChannel = channel.users.some(
        (channelUser) => channelUser.id === user.id,
      );

      if (!hasUserInChannel) {
        throw new BadRequestException('User not in channel');
      }
    }

    const message = await this.prismaService.message.findUnique({
      where: { id: messageId },
      select: MESSAGE_SELECT,
    });

    if (message.author.id !== user.id) {
      throw new BadRequestException('You are not the author of this message');
    }

    await this.prismaService.message.delete({
      where: { id: messageId },
      select: MESSAGE_SELECT,
    });

    await this.prismaService.channel.update({
      where: { id: channelId },
      data: { messages: { disconnect: { id: message.id } } },
    });

    if (channel.isServerChannel) {
      await this.messageGateway.deleteInRoomMessage(channel.serverId, message);
    } else {
      channel.users.forEach(async (user) => {
        await this.messageGateway.deleteMessage(message, user.id);
      });
    }

    return message;
  }
}
