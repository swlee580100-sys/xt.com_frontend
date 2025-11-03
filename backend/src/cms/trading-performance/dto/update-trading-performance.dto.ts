import { PartialType } from '@nestjs/mapped-types';

import { CreateTradingPerformanceDto } from './create-trading-performance.dto';

export class UpdateTradingPerformanceDto extends PartialType(CreateTradingPerformanceDto) {}
