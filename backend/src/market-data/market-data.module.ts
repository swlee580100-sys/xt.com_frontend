import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { MarketDataService } from './market-data.service';
import { RealtimeModule } from '../realtime/realtime.module';
// QueueModule 暂时注释
// import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [HttpModule, RealtimeModule], // QueueModule 暂时移除
  providers: [MarketDataService],
  exports: [MarketDataService]
})
export class MarketDataModule {}
