import { IsEnum, IsNumber, IsPositive, IsString, Min, Max, IsOptional } from 'class-validator';
import { TradeDirection, AccountType } from '@prisma/client';

export class CreateTransactionDto {
  @IsString()
  assetType!: string; // 资产类型，如 BTC, ETH

  @IsEnum(TradeDirection)
  direction!: TradeDirection; // CALL=买涨, PUT=买跌

  @IsNumber()
  @IsPositive()
  duration!: number; // 时长（秒）

  @IsNumber()
  @IsPositive()
  investAmount!: number; // 投入金额

  @IsNumber()
  @Min(0)
  @Max(10)
  returnRate!: number; // 报酬率，如 0.85 表示 85%

  @IsEnum(AccountType)
  @IsOptional()
  accountType?: AccountType; // 账户类型 (DEMO=虚拟, REAL=真实)，默认 DEMO
}
