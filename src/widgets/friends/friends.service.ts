import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { UserDto } from '../user/dto/user.dto';
import { FriendsGateway } from './friends.gateway';
import {
  CHANNEL_SELECT,
  USER_SELECT,
  USER_SELECT_WITH_FRIENDS,
} from 'src/shared/constants';

@Injectable()
export class FriendsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly friendsGateway: FriendsGateway,
  ) {}

  async getFriendsAll(
    user: UserDto,
    page: number,
    limit: number,
    fieldName: string,
  ) {
    if (!page || !limit) {
      throw new BadRequestException('Page or limit are required');
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const friends = await this.prismaService.user.findUnique({
      where: { id: user.id },
      select: {
        [fieldName]: {
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          select: USER_SELECT,
        },
      },
    });

    const total = await this.prismaService.user.count({
      where: {
        id: user.id,
        [fieldName]: {
          some: {},
        },
      },
    });

    return {
      [fieldName]: friends[fieldName],
      total,
    };
  }

  async requestFriend(user: UserDto, requestLogin: string) {
    const requestFriend = await this.prismaService.user.findUnique({
      where: { login: requestLogin },
      select: USER_SELECT_WITH_FRIENDS,
    });

    if (!requestFriend) {
      throw new NotFoundException('Request friend not found');
    }

    if (requestFriend.login === user.login) {
      throw new BadRequestException('You can not add yourself as a friend');
    }

    const requestFriendAlreadyHasYou = requestFriend.friends.some(
      (friend) => friend.id === user.id,
    );

    if (requestFriendAlreadyHasYou) {
      throw new BadRequestException(
        'Request friend already has you in friends',
      );
    }

    const userWithFriends = await this.prismaService.user.findUnique({
      where: { id: user.id },
      select: USER_SELECT_WITH_FRIENDS,
    });

    const requestFriendAlreadyHasYouRequest =
      userWithFriends.friendsOutgoingRequests.some(
        (friend) => friend.id === requestFriend.id,
      );

    if (requestFriendAlreadyHasYouRequest) {
      throw new BadRequestException(
        'Request friend already has you in requests',
      );
    }

    const updatedRequestFriend = await this.prismaService.user.update({
      where: { id: requestFriend.id },
      data: {
        friendsIncomingRequests: {
          connect: { id: user.id },
        },
      },
      select: USER_SELECT_WITH_FRIENDS,
    });

    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        friendsOutgoingRequests: {
          connect: { id: requestFriend.id },
        },
      },
      select: USER_SELECT,
    });

    this.friendsGateway.sendFriendEmit(
      { friendsOutgoingRequests: updatedRequestFriend.friendsOutgoingRequests },
      {
        emitId: updatedRequestFriend.id,
        event: 'requestFriend',
      },
    );

    return updatedUser;
  }

  async acceptFriend(user: UserDto, acceptLogin: string) {
    const acceptFriend = await this.prismaService.user.findUnique({
      where: { login: acceptLogin },
      select: { friends: true, login: true, id: true },
    });

    const userWithFriends = await this.prismaService.user.findUnique({
      where: { id: user.id },
      select: USER_SELECT_WITH_FRIENDS,
    });

    const hasAcceptFriend = userWithFriends.friendsIncomingRequests.some(
      (friend) => acceptFriend.id === friend.id,
    );

    if (hasAcceptFriend) {
      throw new BadRequestException('Friend not exists in incoming requests');
    }

    const updatedAcceptFriend = await this.prismaService.user.update({
      where: { id: acceptFriend.id },
      data: {
        friendsOutgoingRequests: {
          disconnect: { id: user.id },
        },
        friends: {
          connect: { id: user.id },
        },
      },
      select: USER_SELECT_WITH_FRIENDS,
    });

    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        friendsIncomingRequests: {
          disconnect: { id: acceptFriend.id },
        },
        friends: {
          connect: { id: acceptFriend.id },
        },
      },
      select: USER_SELECT,
    });

    const channel = await this.prismaService.channel.create({
      data: {
        users: { connect: [{ id: user.id }, { id: acceptFriend.id }] },
      },
      select: CHANNEL_SELECT,
    });

    this.friendsGateway.sendFriendEmit(
      {
        friends: updatedAcceptFriend.friends,
        friendsOutgoingRequests: updatedAcceptFriend.friendsOutgoingRequests,
        channel,
      },
      { emitId: updatedAcceptFriend.id, event: 'acceptFriend' },
    );

    return { user: updatedUser, channel };
  }

  async rejectFriend(user: UserDto, rejectLogin: string) {
    const rejectFriend = await this.prismaService.user.findUnique({
      where: { login: rejectLogin },
      select: { friends: true, login: true, id: true },
    });

    const userWithFriends = await this.prismaService.user.findUnique({
      where: { id: user.id },
      select: USER_SELECT_WITH_FRIENDS,
    });

    const hasRejectFriend = userWithFriends.friendsOutgoingRequests.some(
      (friend) => rejectFriend.id === friend.id,
    );

    if (hasRejectFriend) {
      throw new BadRequestException('Friend not exists in incoming requests');
    }

    const updatedRejectFriend = await this.prismaService.user.update({
      where: { id: rejectFriend.id },
      data: {
        friendsOutgoingRequests: {
          disconnect: { id: user.id },
        },
        friends: {
          connect: { id: user.id },
        },
      },
      select: USER_SELECT_WITH_FRIENDS,
    });

    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        friendsOutgoingRequests: {
          disconnect: { id: rejectFriend.id },
        },
        friends: {
          connect: { id: rejectFriend.id },
        },
      },
      select: USER_SELECT,
    });

    this.friendsGateway.sendFriendEmit(
      {
        friends: updatedRejectFriend.friends,
        friendsOutgoingRequests: updatedRejectFriend.friendsOutgoingRequests,
      },
      { emitId: updatedRejectFriend.id, event: 'rejectFriend' },
    );

    return updatedUser;
  }
}
