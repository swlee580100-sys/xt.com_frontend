import { LeaderboardType } from '@prisma/client';

export class LeaderboardEntryResponseDto {
  id: string;
  type: LeaderboardType;
  avatar?: string;
  country: string;
  name: string;
  tradeCount: number;
  winRate: number;
  volume: number;
  totalVolume: number;
  highestTrade: number;
  lowestTrade: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(entry: {
    id: string;
    type: LeaderboardType;
    avatar: string | null;
    country: string;
    name: string;
    tradeCount: number;
    winRate: any;
    volume: any;
    totalVolume: any;
    highestTrade: any;
    lowestTrade: any;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = entry.id;
    this.type = entry.type;
    this.avatar = entry.avatar ?? undefined;
    this.country = entry.country;
    this.name = entry.name;
    this.tradeCount = entry.tradeCount;
    this.winRate = Number(entry.winRate);
    this.volume = Number(entry.volume);
    this.totalVolume = Number(entry.totalVolume);
    this.highestTrade = Number(entry.highestTrade);
    this.lowestTrade = Number(entry.lowestTrade);
    this.createdAt = entry.createdAt;
    this.updatedAt = entry.updatedAt;
  }
}
