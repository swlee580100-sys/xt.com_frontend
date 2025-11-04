import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaderboardType, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeaderboardEntryDto } from './dto/create-leaderboard-entry.dto';
import { UpdateLeaderboardEntryDto } from './dto/update-leaderboard-entry.dto';
import { LeaderboardEntryResponseDto } from './dto/leaderboard-entry-response.dto';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(type?: LeaderboardType): Promise<LeaderboardEntryResponseDto[]> {
    const entries = await this.prisma.leaderboardEntry.findMany({
      where: type ? { type } : undefined,
      orderBy: [
        { type: 'asc' },
        { tradeCount: 'desc' }
      ]
    });

    return entries.map(entry => new LeaderboardEntryResponseDto(entry));
  }

  async findOne(id: string): Promise<LeaderboardEntryResponseDto> {
    const entry = await this.prisma.leaderboardEntry.findUnique({
      where: { id }
    });

    if (!entry) {
      throw new NotFoundException(`交易排行榜记录 ${id} 不存在`);
    }

    return new LeaderboardEntryResponseDto(entry);
  }

  async create(dto: CreateLeaderboardEntryDto): Promise<LeaderboardEntryResponseDto> {
    const entry = await this.prisma.leaderboardEntry.create({
      data: {
        type: dto.type,
        avatar: dto.avatar,
        country: dto.country,
        name: dto.name,
        tradeCount: dto.tradeCount,
        winRate: new Prisma.Decimal(dto.winRate),
        volume: new Prisma.Decimal(dto.volume),
        totalVolume: new Prisma.Decimal(dto.totalVolume),
        highestTrade: new Prisma.Decimal(dto.highestTrade),
        lowestTrade: new Prisma.Decimal(dto.lowestTrade)
      }
    });

    return new LeaderboardEntryResponseDto(entry);
  }

  async update(id: string, dto: UpdateLeaderboardEntryDto): Promise<LeaderboardEntryResponseDto> {
    try {
      const entry = await this.prisma.leaderboardEntry.update({
        where: { id },
        data: {
          ...dto,
          winRate: dto.winRate !== undefined ? new Prisma.Decimal(dto.winRate) : undefined,
          volume: dto.volume !== undefined ? new Prisma.Decimal(dto.volume) : undefined,
          totalVolume: dto.totalVolume !== undefined ? new Prisma.Decimal(dto.totalVolume) : undefined,
          highestTrade: dto.highestTrade !== undefined ? new Prisma.Decimal(dto.highestTrade) : undefined,
          lowestTrade: dto.lowestTrade !== undefined ? new Prisma.Decimal(dto.lowestTrade) : undefined
        }
      });

      return new LeaderboardEntryResponseDto(entry);
    } catch (error) {
      this.handleNotFound(error, id);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.leaderboardEntry.delete({
        where: { id }
      });
    } catch (error) {
      this.handleNotFound(error, id);
    }
  }

  private handleNotFound(error: unknown, id: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(`交易排行榜记录 ${id} 不存在`);
    }
    throw error;
  }
}
