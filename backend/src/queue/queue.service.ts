import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

interface NotificationJob {
  template: string;
  payload: Record<string, unknown>;
  recipient: string;
}

interface MarketDataJob {
  symbol: string;
  type: 'trade' | 'kline' | 'ticker';
  payload: Record<string, unknown>;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('notifications') private readonly notificationsQueue: Queue<NotificationJob>,
    @InjectQueue('market-data') private readonly marketDataQueue: Queue<MarketDataJob>
  ) {}

  async enqueueNotification(job: NotificationJob): Promise<void> {
    await this.notificationsQueue.add('send-notification', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });
    this.logger.debug(`Notification job queued with template ${job.template}`);
  }

  async enqueueMarketData(job: MarketDataJob): Promise<void> {
    await this.marketDataQueue.add(job.type, job, {
      removeOnComplete: true,
      removeOnFail: false
    });
    this.logger.verbose(`Market data job queued for ${job.symbol} [${job.type}]`);
  }
}
