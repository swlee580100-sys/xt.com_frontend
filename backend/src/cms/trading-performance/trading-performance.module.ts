import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { TradingPerformanceController } from './trading-performance.controller';
import { TradingPerformanceService } from './trading-performance.service';

@Module({
  imports: [PrismaModule],
  controllers: [TradingPerformanceController],
  providers: [TradingPerformanceService],
  exports: [TradingPerformanceService]
})
export class TradingPerformanceModule {}
