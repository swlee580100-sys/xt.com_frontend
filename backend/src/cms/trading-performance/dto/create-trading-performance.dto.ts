import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class CreateTradingPerformanceDto {
  @IsInt()
  @Min(0)
  tradeDuration!: number; // 交易时长（秒）

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(200)
  winRate!: number; // 利率范围 0-200
}
