import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import * as mediasoup from 'mediasoup';

import { ConsoleLogger } from '@nestjs/common';
import { Worker, WorkerSettings } from 'mediasoup/node/lib/types';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RedisService } from 'src/shared/redis/redis.service';
import { IClientQuery, IMsMessage, IWorkerInfo } from './wss.interfaces';
import { WssRoom } from './wss.room';
import { SERVER_MEMBER_SELECT } from 'src/shared/constants';

const mediasoupSettings = {
  workerPool: 2,
  workerSettings: {
    // dtlsCertificateFile: process.env.WORKER_CERT_FULLCHAIN,
    // dtlsPrivateKeyFile: process.env.WORKER_CERT_PRIVKEY,
    logLevel: 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
      'rtx',
      'bwe',
      'score',
      'simulcast',
      'svc',
      'sctp',
    ],
    rtcMinPort: 10000,
    rtcMaxPort: 59999,
    disableLiburing: false,
  },
};

@WebSocketGateway(3050, {
  cors: true,
  allowEIO3: true,
})
export class WssGateway {
  @WebSocketServer()
  public server: Server;

  public rooms: Map<string, WssRoom> = new Map();
  private clients = new Map<string, { lastHeartbeat: number }>();

  public workers: {
    [index: number]: {
      clientsCount: number;
      roomsCount: number;
      pid: number;
      worker: Worker;
    };
  };

  constructor(
    private readonly logger: ConsoleLogger,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {
    this.createWorkers();
    this.monitorConnections();
  }

  get workersInfo() {
    this.updateWorkerStats();

    return Object.fromEntries(
      Object.entries(this.workers).map((w) => {
        return [
          w[1].pid,
          {
            workerIndex: parseInt(w[0], 10),
            clientsCount: w[1].clientsCount,
            roomsCount: w[1].roomsCount,
          },
        ];
      }),
    ) as { [pid: string]: IWorkerInfo };
  }

  /**
   * Создает воркеры медиасупа.
   * @returns {Promise<void>} Promise<void>
   */
  private async createWorkers(): Promise<void> {
    const promises = [];
    for (let i = 0; i < mediasoupSettings.workerPool; i++) {
      promises.push(
        mediasoup.createWorker(
          mediasoupSettings.workerSettings as WorkerSettings,
        ),
      );
    }

    this.workers = (await Promise.all(promises)).reduce(
      (acc, worker, index) => {
        acc[index] = {
          clientsCount: 0,
          roomsCount: 0,
          pid: worker.pid,
          worker,
        };

        return acc;
      },
      {},
    );
  }

  /**
   * Обновляет инфу о количество пользователей на веркере.
   * @returns {void} void
   */
  public updateWorkerStats(): void {
    const data: {
      [index: number]: { clientsCount: number; roomsCount: number };
    } = {};

    this.rooms.forEach((room) => {
      if (data[room.workerIndex]) {
        data[room.workerIndex].clientsCount += room.clientsCount;
        data[room.workerIndex].roomsCount += 1;
      } else {
        data[room.workerIndex] = {
          clientsCount: room.clientsCount,
          roomsCount: 1,
        };
      }
    });

    Object.entries(this.workers).forEach(([index]) => {
      const info = data[index];
      if (info) {
        this.workers[index].clientsCount = info.clientsCount;
        this.workers[index].roomsCount = info.roomsCount;
      } else {
        this.workers[index].clientsCount = 0;
        this.workers[index].roomsCount = 0;
      }
    });
  }

  /**
   * Возвращает номер воркер с наименьшим количеством участников.
   * @returns {number} number
   */
  private getOptimalWorkerIndex(): number {
    return parseInt(
      Object.entries(this.workers).reduce((prev, curr) => {
        if (prev[1].clientsCount < curr[1].clientsCount) {
          return prev;
        }
        return curr;
      })[0],
      10,
    );
  }

  private async getClientQuery(
    client: Socket,
    session_id: string,
  ): Promise<IClientQuery> {
    const user = await this.redisService.get(client.id);

    return {
      device: client.handshake.query.device as string,
      user_id: user,
      session_id: session_id,
    };
  }

  @SubscribeMessage('ping')
  async ping(@ConnectedSocket() client: Socket) {
    client.emit('pong');
    const userId = await this.redisService.get(client.id);
    this.clients.set(userId, { lastHeartbeat: Date.now() });
  }

  monitorConnections() {
    setInterval(() => {
      const now = Date.now();
      this.clients.forEach((data, userId) => {
        if (now - data.lastHeartbeat > 10000) {
          this.prisma.channel
            .findFirst({
              where: {
                usersInCall: { some: { user: { id: Number(userId) } } },
              },
            })
            .then(async (channel) => {
              if (!channel) return;
              const room = this.rooms.get(String(channel.id));
              await room.removeClient(userId);
              this.clients.delete(userId);

              const membership = await this.prisma.serverMembership.findFirst({
                where: {
                  user: { id: Number(userId) },
                  server: { id: channel.serverId },
                },
                select: SERVER_MEMBER_SELECT,
              });

              await this.prisma.channel.update({
                where: { id: channel.id },
                data: {
                  usersInCall: { disconnect: { id: membership.id } },
                },
              });
            });
        }
      });
    }, 5000);
  }

  @SubscribeMessage('joinRoom')
  public async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { channelId }: { channelId: string },
  ) {
    try {
      const query = await this.getClientQuery(client, channelId);

      const findChannel = await this.prisma.channel.findUnique({
        where: { id: Number(channelId) },
        select: {
          serverId: true,
        },
      });

      const channelsWhereUser = await this.prisma.channel.findMany({
        where: {
          usersInCall: {
            some: { user: { id: Number(query.user_id) } },
          },
        },
      });

      const membership = await this.prisma.serverMembership.findFirst({
        where: {
          user: { id: Number(query.user_id) },
          server: { id: findChannel.serverId },
        },
        select: SERVER_MEMBER_SELECT,
      });

      if (channelsWhereUser.length > 0) {
        await Promise.all(
          await channelsWhereUser.map(async (channel) => {
            return await this.prisma.channel.update({
              where: { id: channel.id },
              data: {
                usersInCall: {
                  disconnect: { id: membership.id },
                },
              },
            });
          }),
        );
      }

      const transaction = await this.prisma.$transaction([
        this.prisma.channel.update({
          where: { id: Number(channelId) },
          select: {
            id: true,
            categoryId: true,
            isVoice: true,
            isServerChannel: true,
            serverId: true,
            usersInCall: true,
            name: true,
          },
          data: {
            usersInCall: { connect: { id: Number(membership.id) } },
          },
        }),
      ]);

      const channel = transaction[0];

      if (!channel.isVoice) {
        return;
      }

      if (channel.isServerChannel) {
        this.server.to(`server-${channel.serverId}`).emit('joinedChannel', {
          channel: {
            id: channel.id,
            categoryId: channel.categoryId,
            name: channel.name,
          },
          membership: {
            ...membership,
            channel: {
              id: channel.id,
              name: channel.name,
            },
          },
        });

        const firstChannelServerWithUsers = await this.prisma.channel.findFirst(
          {
            where: { serverId: channel.serverId, usersInCall: { some: {} } },
            select: { usersInCall: { select: SERVER_MEMBER_SELECT } },
          },
        );
        this.server
          .to(`server-background-${channel.serverId}`)
          .emit('firstUsersInChannel', {
            serverId: channel.serverId,
            firstUsersInChannels:
              firstChannelServerWithUsers?.usersInCall.slice(0, 5),
            totalUsersInChannels:
              firstChannelServerWithUsers?.usersInCall.length,
          });
      }

      let room = this.rooms.get(channelId);

      if (!room) {
        this.updateWorkerStats();

        const index = this.getOptimalWorkerIndex();

        room = new WssRoom(
          this.workers[index].worker,
          index,
          channelId,
          this.logger,
          this.server,
          this.prisma,
        );

        await room.load();

        this.rooms.set(channelId, room);

        this.logger.log(`room ${channelId} created`);
      }

      await room.addClient(query, client);

      return true;
    } catch (error) {
      this.logger.error(
        error.message,
        error.stack,
        'WssGateway - handleConnection',
      );
    }
  }

  @SubscribeMessage('leaveRoom')
  public async leaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { channelId }: { channelId: string },
  ) {
    try {
      const { user_id, session_id } = await this.getClientQuery(
        client,
        channelId,
      );

      const findChannel = await this.prisma.channel.findUnique({
        where: { id: Number(channelId) },
        select: {
          serverId: true,
        },
      });

      if (!findChannel) {
        return;
      }

      const membership = await this.prisma.serverMembership.findFirst({
        where: {
          user: { id: Number(user_id) },
          server: { id: findChannel.serverId },
        },
        select: SERVER_MEMBER_SELECT,
      });

      const transaction = await this.prisma.$transaction([
        this.prisma.channel.update({
          where: { id: Number(channelId) },
          select: {
            id: true,
            categoryId: true,
            isVoice: true,
            isServerChannel: true,
            serverId: true,
            usersInCall: true,
            name: true,
          },
          data: {
            usersInCall: { disconnect: { id: Number(membership.id) } },
          },
        }),
      ]);

      const channel = transaction[0];

      if (channel.isServerChannel) {
        this.server.to(`server-${channel.serverId}`).emit('leavedChannel', {
          channel: {
            id: channel.id,
            categoryId: channel.categoryId,
            name: channel.name,
          },
          membership: {
            ...membership,
            channel: { id: channel.id, name: channel.name },
          },
        });

        const firstChannelServerWithUsers = await this.prisma.channel.findFirst(
          {
            where: { serverId: channel.serverId, usersInCall: { some: {} } },
            select: { usersInCall: { select: SERVER_MEMBER_SELECT } },
          },
        );
        this.server
          .to(`server-background-${channel.serverId}`)
          .emit('firstUsersInChannel', {
            serverId: channel.serverId,
            firstUsersInChannels:
              firstChannelServerWithUsers?.usersInCall.slice(0, 5),
            totalUsersInChannels:
              firstChannelServerWithUsers?.usersInCall.length,
          });
      }

      const room = this.rooms.get(session_id);

      await room.removeClient(user_id);

      if (!room.clientsCount) {
        room.close();
        this.rooms.delete(session_id);
      }

      return true;
    } catch (error) {
      this.logger.error(
        error.message,
        error.stack,
        'WssGateway - handleDisconnect',
      );
    }
  }

  // public async handleConnection(client: Socket) {
  //   try {
  //     const query = this.getClientQuery(client);

  //     let room = this.rooms.get(query.session_id);

  //     if (!room) {
  //       this.updateWorkerStats();

  //       const index = this.getOptimalWorkerIndex();

  //       room = new WssRoom(
  //         this.workers[index].worker,
  //         index,
  //         query.session_id,
  //         this.logger,
  //         this.server,
  //       );

  //      await room.load();

  //       this.rooms.set(query.session_id, room);

  //       this.logger.log(`room ${query.session_id} created`);
  //     }

  //     await room.addClient(query, client);

  //     return true;
  //   } catch (error) {
  //     this.logger.error(
  //       error.message,
  //       error.stack,
  //       'WssGateway - handleConnection',
  //     );
  //   }
  // }

  // public async handleDisconnect(client: Socket) {
  //   try {
  //     const { user_id, session_id } = this.getClientQuery(client);

  //     const room = this.rooms.get(session_id);

  //     await room.removeClient(user_id);

  //     if (!room.clientsCount) {
  //       room.close();
  //       this.rooms.delete(session_id);
  //     }

  //     return true;
  //   } catch (error) {
  //     this.logger.error(
  //       error.message,
  //       error.stack,
  //       'WssGateway - handleDisconnect',
  //     );
  //   }
  // }

  @SubscribeMessage('mediaRoomClients')
  public async roomClients(
    @ConnectedSocket() client: Socket,
    @MessageBody() { channelId }: { channelId: string },
  ) {
    try {
      const { session_id } = await this.getClientQuery(client, channelId);

      const room = this.rooms.get(session_id);

      return {
        clientsIds: room.clientsIds,
        producerAudioIds: room.audioProducerIds,
        producerVideoIds: room.videoProducerIds,
      };
    } catch (error) {
      this.logger.error(error.message, error.stack, 'WssGateway - roomClients');
    }
  }

  @SubscribeMessage('mediaRoomInfo')
  public async roomInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody() { channelId }: { channelId: string },
  ) {
    try {
      const { session_id } = await this.getClientQuery(client, channelId);

      const room = this.rooms.get(session_id);

      return room.stats;
    } catch (error) {
      this.logger.error(error.message, error.stack, 'WssGateway - roomInfo');
    }
  }

  @SubscribeMessage('media')
  public async media(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    { channelId, action, data }: { channelId: string } & IMsMessage,
  ) {
    try {
      const { user_id, session_id } = await this.getClientQuery(
        client,
        channelId,
      );

      const room = this.rooms.get(session_id);

      return await room.speakMsClient(user_id, { action, data });
    } catch (error) {
      this.logger.error(error.message, error.stack, 'WssGateway - media');
    }
  }

  @SubscribeMessage('mediaReconfigure')
  public async roomReconfigure(
    @ConnectedSocket() client: Socket,
    @MessageBody() { channelId }: { channelId: string },
  ) {
    try {
      const { session_id } = await this.getClientQuery(client, channelId);

      const room = this.rooms.get(session_id);

      if (room) {
        await this.reConfigureMedia(room);
      }

      return true;
    } catch (error) {
      this.logger.error(
        error.message,
        error.stack,
        'WssGateway - roomReconfigure',
      );
    }
  }

  /**
   * Меняет воркер у комнаты.
   * @param {WssRoom} room комната
   * @returns {Promise<void>} Promise<void>
   */
  public async reConfigureMedia(room: WssRoom): Promise<void> {
    try {
      this.updateWorkerStats();

      const index = this.getOptimalWorkerIndex();

      await room.reConfigureMedia(this.workers[index].worker, index);
    } catch (error) {
      this.logger.error(
        error.message,
        error.stack,
        'WssGateway - reConfigureMedia',
      );
    }
  }
}
