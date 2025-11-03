import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardType } from '@prisma/client';

import { Public } from '../../common/decorators/public.decorator';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { LeaderboardEntryResponseDto } from '../leaderboard/dto/leaderboard-entry-response.dto';

@Controller('public/cms/leaderboard')
export class PublicLeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @Public()
  async findAll(@Query('type') type?: LeaderboardType): Promise<LeaderboardEntryResponseDto[]> {
    return this.leaderboardService.findAll(type);
  }
}
