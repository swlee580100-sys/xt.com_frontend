import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { RealtimeModule } from '../realtime/realtime.module';
// QueueModule 暂时注释
// import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10秒超时
      maxRedirects: 5,
    }),
    RealtimeModule
  ], // QueueModule 暂时移除
  controllers: [MarketDataController],
  providers: [MarketDataService],
  exports: [MarketDataService]
})
export class MarketDataModule {}
