export class TradingPerformanceResponseDto {
  id: string;
  tradeDuration: number;
  winRate: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(performance: {
    id: string;
    tradeDuration: number;
    winRate: any;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = performance.id;
    this.tradeDuration = performance.tradeDuration;
    this.winRate = Number(performance.winRate);
    this.createdAt = performance.createdAt;
    this.updatedAt = performance.updatedAt;
  }
}
