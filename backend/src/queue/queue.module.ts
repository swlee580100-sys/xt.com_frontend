import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { QueueService } from './queue.service';
import { QueueHealthIndicator } from './queue.health';
import { NotificationProcessor } from './processors/notification.processor';
import { MarketDataProcessor } from './processors/market-data.processor';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    MailModule,
    PrismaModule,
    BullModule.registerQueue(
      {
        name: 'notifications'
      },
      {
        name: 'market-data'
      }
    )
  ],
  providers: [QueueService, QueueHealthIndicator, NotificationProcessor, MarketDataProcessor],
  exports: [QueueService, QueueHealthIndicator]
})
export class QueueModule {}
