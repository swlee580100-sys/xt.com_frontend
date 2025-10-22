import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly clients = new Map<number, Redis>();

  constructor(private readonly configService: ConfigService) {}

  getClient(db?: number): Redis {
    const targetDb = db ?? this.configService.get<number>('redis.sessionDb') ?? 0;
    const existingClient = this.clients.get(targetDb);
    if (existingClient) {
      return existingClient;
    }

    const client = new Redis(this.buildOptions(targetDb));
    this.clients.set(targetDb, client);
    return client;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      Array.from(this.clients.values()).map(async client => {
        try {
          await client.quit();
        } catch {
          client.disconnect();
        }
      })
    );
  }

  private buildOptions(db: number): RedisOptions {
    return {
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      username: this.configService.get<string>('redis.username') || undefined,
      password: this.configService.get<string>('redis.password') || undefined,
      db
    };
  }
}
