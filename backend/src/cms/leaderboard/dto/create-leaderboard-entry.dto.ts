import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

import { LeaderboardType } from '@prisma/client';

export class CreateLeaderboardEntryDto {
  @IsEnum(LeaderboardType)
  type!: LeaderboardType;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsString()
  country!: string;

  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  tradeCount!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  winRate!: number;

  @IsNumber()
  @Min(0)
  volume!: number;

  @IsNumber()
  @Min(0)
  totalVolume!: number;

  @IsNumber()
  @Min(0)
  highestTrade!: number;

  @IsNumber()
  @Min(0)
  lowestTrade!: number;
}
