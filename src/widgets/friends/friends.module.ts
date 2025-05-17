import { Module } from '@nestjs/common';

import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RedisService } from 'src/shared/redis/redis.service';
import { FriendsController } from './friends.controller';
import { FriendsGateway } from './friends.gateway';
import { FriendsService } from './friends.service';

@Module({
  controllers: [FriendsController],
  providers: [FriendsGateway, RedisService, PrismaService, FriendsService],
})
export class FriendsModule {}
