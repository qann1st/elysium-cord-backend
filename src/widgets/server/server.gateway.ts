import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SERVER_MEMBER_SELECT } from 'src/shared/constants';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RedisService } from 'src/shared/redis/redis.service';

@WebSocketGateway(3050, { cors: true })
export class ServerGateway {
  @WebSocketServer() server: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @SubscribeMessage('joinBackgroundServers')
  async joinBackgroundServers(
    @ConnectedSocket() client: Socket,
    @MessageBody() { serverIds }: { serverIds: number[] },
  ) {
    serverIds.forEach((id) => client.join(`server-background-${id}`));
  }

  @SubscribeMessage('leaveBackgroundServers')
  async leaveBackgroundServers(
    @ConnectedSocket() client: Socket,
    @MessageBody() { serverIds }: { serverIds: number[] },
  ) {
    serverIds.forEach((id) => client.leave(`server-background-${id}`));
  }

  @SubscribeMessage('joinServer')
  async joinServer(
    @ConnectedSocket() client: Socket,
    @MessageBody() { serverId }: { serverId: number },
  ) {
    const recipientId = await this.redisService.get(client.id);

    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: Number(recipientId) }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      return;
    }

    client.join(`server-${serverId}`);
  }

  @SubscribeMessage('leaveServer')
  async leaveServer(
    @MessageBody() { serverId }: { serverId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const recipientId = await this.redisService.get(client.id);

    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: Number(recipientId) }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      return;
    }

    client.leave(`server-${serverId}`);
  }

  @SubscribeMessage('userChannelState')
  async userChannelState(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    {
      isMuted,
      isDeafen,
      isStreaming,
      serverId,
      channelId,
    }: {
      isMuted: boolean;
      isDeafen: boolean;
      isStreaming: boolean;
      serverId: number;
      channelId: number;
    },
  ) {
    const recipientId = await this.redisService.get(client.id);
    if (!recipientId) return;

    if (isMuted != null || isDeafen != null) {
      await this.prisma.user.update({
        where: { id: Number(recipientId) },
        data: { isMuted: !!isMuted, isDeafen: !!isDeafen },
      });
    }

    if (isStreaming != null) {
      await this.prisma.user.update({
        where: { id: Number(recipientId) },
        data: { isStreaming },
      });
    }

    if (channelId) {
      const channel = await this.prisma.channel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          categoryId: true,
        },
      });

      const membership = await this.prisma.serverMembership.findFirst({
        where: { user: { id: Number(recipientId) }, server: { id: serverId } },
        select: SERVER_MEMBER_SELECT,
      });

      this.broadcastToServer(serverId, 'userChannelState', {
        user: membership,
        channel,
      });
    }
  }

  broadcastToServer(serverId: number, event: string, data: any) {
    this.server.to(`server-${serverId}`).emit(event, data);
  }

  broadcastToBackgroundServer(serverId: number, event: string, data: any) {
    this.server.to(`server-background-${serverId}`).emit(event, data);
  }

  async broadcastToUser(userId: number, event: string, data: any) {
    const userSocket = await this.redisService.get(String(userId));
    this.server.to(userSocket).emit(event, data);
  }
}
