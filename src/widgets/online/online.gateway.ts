import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  SERVER_MEMBER_SELECT,
  USER_SELECT_WITH_FRIENDS,
} from 'src/shared/constants';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RedisService } from 'src/shared/redis/redis.service';
import { UserWithFriendsDto } from '../user/dto/user-with-friends.dto';

@WebSocketGateway(3050, {
  cors: true,
})
export class OnlineGateway {
  @WebSocketServer() server: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  private async getUserFromSocket(token: string) {
    if (!token) return null;

    try {
      const jwtUser = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      return jwtUser?.id ? jwtUser : null;
    } catch {}
  }

  private async updateUserStatus(userId: number, isOnline: boolean) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline, isStreaming: false },
      });
    } catch {}
  }

  private async notifyUserFriends(
    user: UserWithFriendsDto,
    event: string,
    data: any,
  ) {
    const friends = user?.friends ?? [];

    for (const friend of friends) {
      if (friend.isOnline) {
        const socketRequestFriend = await this.redisService.get(
          String(friend.id),
        );

        if (!socketRequestFriend) return;

        this.server.to(socketRequestFriend).emit(event, data);
      }
    }
  }

  async handleConnectionOrDisconnect(client: Socket, isOnline: boolean) {
    const token = client.handshake.auth['token'] ?? client.handshake.query.auth;
    const jwtUser = await this.getUserFromSocket(token);
    if (!jwtUser) return;

    const userId = jwtUser.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT_WITH_FRIENDS,
    });

    if (!user) {
      return;
    }

    if (isOnline) {
      await Promise.all([
        this.redisService.set(userId, client.id),
        this.redisService.set(client.id, userId),
      ]);
    } else {
      await Promise.all([
        this.redisService.del(userId),
        this.redisService.del(client.id),
      ]);
    }

    const servers = await this.prisma.server.findMany({
      where: { users: { some: { user: { id: user.id } } } },
      select: { users: { where: { user: { isOnline: true } } }, id: true },
    });

    await this.updateUserStatus(userId, isOnline);
    await this.notifyUserFriends(user, 'online', { id: userId, isOnline });

    Promise.all([
      servers.forEach((server) => {
        this.prisma.serverMembership
          .findFirst({
            where: { user: { id: userId }, server: { id: server.id } },
            select: SERVER_MEMBER_SELECT,
          })
          .then((membership) => {
            this.server.to(`server-${server.id}`).emit('online', membership);
          });
      }),
    ]);
  }

  async handleConnection(client: Socket) {
    await this.handleConnectionOrDisconnect(client, true);
  }

  async handleDisconnect(client: Socket) {
    await this.handleConnectionOrDisconnect(client, false);
  }
}
