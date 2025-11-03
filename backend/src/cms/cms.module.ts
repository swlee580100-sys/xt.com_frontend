import { Module } from '@nestjs/common';

import { TestimonialsModule } from './testimonials/testimonials.module';
import { CarouselsModule } from './carousels/carousels.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { TradingPerformanceModule } from './trading-performance/trading-performance.module';

@Module({
  imports: [TestimonialsModule, CarouselsModule, LeaderboardModule, TradingPerformanceModule],
  exports: [TestimonialsModule, CarouselsModule, LeaderboardModule, TradingPerformanceModule]
})
export class CmsModule {}
