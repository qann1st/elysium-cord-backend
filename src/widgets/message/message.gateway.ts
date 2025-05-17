import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RedisService } from 'src/shared/redis/redis.service';
import { MessageDto } from './dto/message.dto';

@WebSocketGateway(3050, {
  cors: true,
})
export class MessageGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly redisService: RedisService) {}

  async sendEventToUser(data: any, recipientId: number, event) {
    const recipientSocket = await this.redisService.get(recipientId.toString());

    this.server.to(recipientSocket).emit(event, data);
  }

  async sendToRoomMessage(roomId: number, message: MessageDto) {
    this.server.to(`server-${roomId}`).emit('newMessage', message);
  }

  async sendMessage(message: MessageDto, recipientId: number) {
    this.sendEventToUser(message, recipientId, 'newMessage');
  }

  async deleteInRoomMessage(roomId: number, message: MessageDto) {
    this.server.to(`server-${roomId}`).emit('deleteMessage', message.id);
  }

  async deleteMessage(message: MessageDto, recipientId: number) {
    this.sendEventToUser(message, recipientId, 'deleteMessage');
  }

  async editInRoomMessage(roomId: number, message: MessageDto) {
    this.server.to(`server-${roomId}`).emit('editMessage', message.id);
  }

  async editMessage(message: MessageDto, recipientId: number) {
    this.sendEventToUser(message, recipientId, 'editMessage');
  }
}
