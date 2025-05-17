import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RedisService } from 'src/shared/redis/redis.service';

@WebSocketGateway(3050, {
  cors: true,
})
export class FriendsGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly redisService: RedisService) {}

  async sendFriendEmit(data: any, options: { emitId: number; event: string }) {
    const socketRequestFriend = await this.redisService.get(
      options.emitId.toString(),
    );

    if (!socketRequestFriend) return;

    this.server.to(socketRequestFriend).emit(options.event, { ...data });
  }
}
