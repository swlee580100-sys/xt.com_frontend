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
    this.createdAt = entry.createdAt;
    this.updatedAt = entry.updatedAt;
  }
}
