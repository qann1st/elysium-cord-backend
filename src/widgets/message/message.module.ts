import { Module } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RedisService } from 'src/shared/redis/redis.service';
import { MessageController } from './message.controller';
import { MessageGateway } from './message.gateway';
import { MessageService } from './message.service';

@Module({
  controllers: [MessageController],
  providers: [PrismaService, MessageService, RedisService, MessageGateway],
})
export class MessageModule {}
