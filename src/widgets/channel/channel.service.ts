import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { createWorker } from 'mediasoup';
import { Worker } from 'mediasoup/node/lib/Worker';
import { CHANNEL_SELECT } from 'src/shared/constants';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { UserDto } from '../user/dto/user.dto';
import {
  AppData,
  Consumer,
  Producer,
  Router,
  WebRtcTransport,
} from 'mediasoup/node/lib/types';

@Injectable()
export class ChannelService implements OnModuleInit {
  constructor(private readonly prismaService: PrismaService) {}

  private worker: Worker;
  private rooms: Map<
    number,
    {
      router: Router<AppData>;
      producerTransport?: WebRtcTransport<AppData>;
      producerTransportParams?: any;
      consumerTransport?: WebRtcTransport<AppData>;
      consumerTransportParams?: any;
      producer?: Producer<AppData>;
      consumer?: Consumer<AppData>;
    }
  > = new Map();

  async onModuleInit() {
    this.worker = await createWorker({
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'sctp'],
    });

    this.worker.on('died', () => {
      console.error('Mediasoup Worker упал, перезапустите сервер.');
    });
  }

  async getRtpCapabilites() {
    const router = await this.worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    });

    return router.rtpCapabilities;
  }

  async getChannels(user: UserDto) {
    const channel = await this.prismaService.channel.findMany({
      where: { users: { some: { id: user.id } }, isServerChannel: false },
      select: CHANNEL_SELECT,
    });

    return channel.map((channel) =>
      channel.isGroup
        ? channel
        : {
            ...channel,
            users: channel.users.filter((user) => user.id !== user.id),
          },
    );
  }

  async createRoom(channelId: number) {
    if (this.rooms.has(channelId)) {
      return;
    }

    const router = await this.worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    });

    this.rooms.set(channelId, {
      router,
      consumer: null,
      consumerTransport: null,
      producer: null,
      producerTransport: null,
    });
  }

  async getChannel(channelId: number) {
    if (!channelId) return;
    const channel = await this.prismaService.channel.findUnique({
      where: { id: channelId },
      select: CHANNEL_SELECT,
    });

    if (!channel) {
      throw new BadRequestException('Channel not found');
    }

    const editChannel = (data) =>
      this.rooms.set(channelId, { ...this.rooms.get(channelId), ...data });

    return {
      ...channel,
      users: channel.users.filter((user) => user.id !== user.id),
      ...this.rooms.get(channelId),
      editChannel,
    };
  }
}
