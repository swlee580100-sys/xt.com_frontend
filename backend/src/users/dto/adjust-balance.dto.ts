import { IsEnum, IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';

export enum BalanceType {
  DEMO = 'demo',
  REAL = 'real',
}

export enum AdjustmentType {
  ADD = 'add',
  SUBTRACT = 'subtract',
  SET = 'set',
}

export class AdjustBalanceDto {
  @IsEnum(BalanceType)
  balanceType!: BalanceType;

  @IsEnum(AdjustmentType)
  adjustmentType!: AdjustmentType;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
