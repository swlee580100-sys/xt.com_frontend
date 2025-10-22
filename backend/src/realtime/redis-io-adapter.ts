import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Redis } from 'ioredis';

import { RedisService } from '../redis/redis.service';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor(
    app: INestApplicationContext,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService
  ) {
    super(app);
  }

  async connect(): Promise<void> {
    if (this.pubClient && this.subClient) {
      return;
    }

    const redisDb = this.configService.get<number>('redis.sessionDb');
    this.pubClient = this.redisService.getClient(redisDb);
    this.subClient = this.pubClient.duplicate();

    await Promise.all([this.pubClient.ping(), this.subClient.ping()]);

    this.logger.log(`Configured socket.io redis adapter on db ${redisDb}`);
  }

  createIOServer(port: number, options?: ServerOptions) {
    if (!this.pubClient || !this.subClient) {
      throw new Error('Redis adapter not connected');
    }

    const server = super.createIOServer(port, {
      cors: {
        origin: this.configService.get<string>('http.corsOrigin') ?? '*'
      },
      ...options
    });

    const redisAdapter = createAdapter(this.pubClient, this.subClient);
    server.adapter(redisAdapter);
    return server;
  }
}
