import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class CreateTradingPerformanceDto {
  @IsInt()
  @Min(0)
  tradeDuration!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  winRate!: number;
}
