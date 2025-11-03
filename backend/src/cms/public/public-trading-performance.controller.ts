import { Controller, Get } from '@nestjs/common';

import { Public } from '../../common/decorators/public.decorator';
import { TradingPerformanceService } from '../trading-performance/trading-performance.service';
import { TradingPerformanceResponseDto } from '../trading-performance/dto/trading-performance-response.dto';

@Controller('public/cms/trading-performance')
export class PublicTradingPerformanceController {
  constructor(private readonly tradingPerformanceService: TradingPerformanceService) {}

  @Get()
  @Public()
  async findAll(): Promise<TradingPerformanceResponseDto[]> {
    return this.tradingPerformanceService.findAll();
  }
}
