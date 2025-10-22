import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { TransactionLogService } from './transaction-log.service';
import { TransactionLogController } from './transaction-log.controller';

@Module({
  imports: [PrismaModule, MarketDataModule],
  controllers: [TransactionLogController],
  providers: [TransactionLogService],
  exports: [TransactionLogService],
})
export class TransactionLogModule {}
