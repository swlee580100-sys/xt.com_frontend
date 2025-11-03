import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Post, Put, Query } from '@nestjs/common';
import { LeaderboardType } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { LeaderboardService } from './leaderboard.service';
import { CreateLeaderboardEntryDto } from './dto/create-leaderboard-entry.dto';
import { UpdateLeaderboardEntryDto } from './dto/update-leaderboard-entry.dto';
import { LeaderboardEntryResponseDto } from './dto/leaderboard-entry-response.dto';

@Controller('admin/cms/leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @Roles('admin')
  async findAll(
    @Query('type', new ParseEnumPipe(LeaderboardType, { optional: true })) type?: LeaderboardType
  ): Promise<LeaderboardEntryResponseDto[]> {
    return this.leaderboardService.findAll(type);
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id') id: string): Promise<LeaderboardEntryResponseDto> {
    return this.leaderboardService.findOne(id);
  }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateLeaderboardEntryDto): Promise<LeaderboardEntryResponseDto> {
    return this.leaderboardService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeaderboardEntryDto
  ): Promise<LeaderboardEntryResponseDto> {
    return this.leaderboardService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.leaderboardService.remove(id);
    return { message: '交易排行榜记录已删除' };
  }
}
