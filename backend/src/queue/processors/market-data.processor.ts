import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';

interface MarketDataJob {
  symbol: string;
  type: 'trade' | 'kline' | 'ticker';
  payload: Record<string, unknown>;
}

@Processor('market-data')
export class MarketDataProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketDataProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<MarketDataJob>) {
    this.logger.debug(`Processing market data job ${job.id} (${job.name})`);

    if (job.name === 'ticker') {
      const price = Number(job.data.payload?.price ?? 0);
      const change24h = Number(job.data.payload?.change24h ?? 0);

      if (Number.isNaN(price)) {
        this.logger.warn(`Invalid price for symbol ${job.data.symbol}`);
        return;
      }

      await this.prisma.marketSnapshot.create({
        data: {
          symbol: job.data.symbol,
          price,
          change24h,
          source: 'binance',
          raw: job.data.payload as any
        }
      });
    }
  }
}
