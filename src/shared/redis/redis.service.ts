import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  onModuleInit() {
    const envPort = process.env.REDIS_PORT;

    this.redisClient = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: envPort ? Number(process.env.REDIS_PORT) : 6379,
    });
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await this.redisClient.set(key, value);
    } catch {}
  }

  async get(key: string): Promise<string> {
    try {
      return await this.redisClient.get(key);
    } catch {}
  }

  async del(key: string): Promise<number> {
    try {
      return await this.redisClient.del(key);
    } catch {}
  }

  async hset(key: string, value: any) {
    try {
      return await this.redisClient.hset(key, value);
    } catch {}
  }

  async hget(key: string, field: string) {
    try {
      return await this.redisClient.hget(key, field);
    } catch {}
  }

  async hgetall(key: string) {
    try {
      return await this.redisClient.hgetall(key);
    } catch {}
  }

  onModuleDestroy() {
    this.redisClient.quit();
  }
}
