import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateTradingPerformanceDto } from './dto/create-trading-performance.dto';
import { UpdateTradingPerformanceDto } from './dto/update-trading-performance.dto';
import { TradingPerformanceResponseDto } from './dto/trading-performance-response.dto';

@Injectable()
export class TradingPerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<TradingPerformanceResponseDto[]> {
    const items = await this.prisma.tradingPerformance.findMany({
      orderBy: { tradeDuration: 'asc' }
    });
    return items.map(item => new TradingPerformanceResponseDto(item));
  }

  async findOne(id: string): Promise<TradingPerformanceResponseDto> {
    const item = await this.prisma.tradingPerformance.findUnique({
      where: { id }
    });

    if (!item) {
      throw new NotFoundException(`交易表现记录 ${id} 不存在`);
    }

    return new TradingPerformanceResponseDto(item);
  }

  async create(dto: CreateTradingPerformanceDto): Promise<TradingPerformanceResponseDto> {
    const item = await this.prisma.tradingPerformance.create({
      data: {
        tradeDuration: dto.tradeDuration,
        winRate: new Prisma.Decimal(dto.winRate)
      }
    });
    return new TradingPerformanceResponseDto(item);
  }

  async update(
    id: string,
    dto: UpdateTradingPerformanceDto
  ): Promise<TradingPerformanceResponseDto> {
    try {
      const item = await this.prisma.tradingPerformance.update({
        where: { id },
        data: {
          tradeDuration: dto.tradeDuration,
          winRate: dto.winRate !== undefined ? new Prisma.Decimal(dto.winRate) : undefined
        }
      });
      return new TradingPerformanceResponseDto(item);
    } catch (error) {
      this.handleNotFound(error, id);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.tradingPerformance.delete({
        where: { id }
      });
    } catch (error) {
      this.handleNotFound(error, id);
    }
  }

  private handleNotFound(error: unknown, id: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(`交易表现记录 ${id} 不存在`);
    }
    throw error;
  }
}
