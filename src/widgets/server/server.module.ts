import { Module } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RedisService } from 'src/shared/redis/redis.service';
import { ServerController } from './server.controller';
import { ServerGateway } from './server.gateway';
import { ServerService } from './server.service';

@Module({
  controllers: [ServerController],
  providers: [ServerService, PrismaService, RedisService, ServerGateway],
})
export class ServerModule {}
