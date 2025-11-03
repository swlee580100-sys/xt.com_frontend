import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { TradingPerformanceService } from './trading-performance.service';
import { CreateTradingPerformanceDto } from './dto/create-trading-performance.dto';
import { UpdateTradingPerformanceDto } from './dto/update-trading-performance.dto';
import { TradingPerformanceResponseDto } from './dto/trading-performance-response.dto';

@Controller('admin/cms/trading-performance')
export class TradingPerformanceController {
  constructor(private readonly tradingPerformanceService: TradingPerformanceService) {}

  @Get()
  @Roles('admin')
  async findAll(): Promise<TradingPerformanceResponseDto[]> {
    return this.tradingPerformanceService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id') id: string): Promise<TradingPerformanceResponseDto> {
    return this.tradingPerformanceService.findOne(id);
  }

  @Post()
  @Roles('admin')
  async create(
    @Body() dto: CreateTradingPerformanceDto
  ): Promise<TradingPerformanceResponseDto> {
    return this.tradingPerformanceService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTradingPerformanceDto
  ): Promise<TradingPerformanceResponseDto> {
    return this.tradingPerformanceService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.tradingPerformanceService.remove(id);
    return { message: '交易表现记录已删除' };
  }
}
