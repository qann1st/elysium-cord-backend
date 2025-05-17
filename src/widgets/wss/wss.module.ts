import { Module } from '@nestjs/common';

import { ConsoleLogger } from '@nestjs/common';

import { RedisService } from 'src/shared/redis/redis.service';
import { WssController } from './wss.controller';
import { WssGateway } from './wss.gateway';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Module({
  imports: [],
  providers: [
    WssGateway,
    {
      provide: ConsoleLogger,
      useValue: new ConsoleLogger('Websocket'),
    },
    PrismaService,
    RedisService,
  ],
  exports: [WssGateway],
  controllers: [WssController],
})
export class WssModule {}
