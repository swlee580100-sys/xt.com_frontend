import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError
} from '@nestjs/terminus';
import type { Queue } from 'bullmq';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    @InjectQueue('market-data') private readonly marketDataQueue: Queue
  ) {
    super();
  }

  async isHealthy(key = 'queues'): Promise<HealthIndicatorResult> {
    try {
      await Promise.all([
        this.notificationsQueue.getJobCounts(),
        this.marketDataQueue.getJobCounts()
      ]);
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError('Queue check failed', this.getStatus(key, false, error as Record<string, any>));
    }
  }
}
