import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RedisService } from 'src/shared/redis/redis.service';
import { OnlineGateway } from './online.gateway';

@Module({
  imports: [JwtModule.register({})],
  providers: [PrismaService, RedisService, OnlineGateway],
})
export class OnlineModule {}
