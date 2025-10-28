import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  Min,
  Max,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { TradeDirection, AccountType } from '@prisma/client';

export enum TransactionType {
  ENTRY = 'entryPrice',
  EXIT = 'exitPrice',
}

export class UnifiedTransactionDto {
  @IsEnum(TransactionType, {
    message: 'type must be either "entryPrice" or "exitPrice"',
  })
  type!: TransactionType; // 交易类型：entryPrice=入场, exitPrice=出场

  @IsNumber({}, { message: 'price must be a number' })
  @IsPositive({ message: 'price must be positive' })
  price!: number; // 价格（入场价格或出场价格）

  // 出场时必填，入场时不需要
  @ValidateIf((o) => o.type === TransactionType.EXIT)
  @IsString({ message: 'orderNumber must be a string when type is exitPrice' })
  orderNumber?: string; // 订单号（仅在 exitPrice 时需要）

  // 以下字段仅在入场时需要
  @ValidateIf((o) => o.type === TransactionType.ENTRY)
  @IsString({ message: 'assetType is required when type is entryPrice' })
  assetType?: string; // 资产类型，如 BTC, ETH

  @ValidateIf((o) => o.type === TransactionType.ENTRY)
  @IsEnum(TradeDirection, {
    message: 'direction must be either CALL or PUT when type is entryPrice',
  })
  direction?: TradeDirection; // CALL=买涨, PUT=买跌

  @ValidateIf((o) => o.type === TransactionType.ENTRY)
  @IsNumber({}, { message: 'duration must be a number when type is entryPrice' })
  @IsPositive({ message: 'duration must be positive when type is entryPrice' })
  duration?: number; // 时长（秒）

  @ValidateIf((o) => o.type === TransactionType.ENTRY)
  @IsNumber(
    {},
    { message: 'investAmount must be a number when type is entryPrice' },
  )
  @IsPositive({
    message: 'investAmount must be positive when type is entryPrice',
  })
  investAmount?: number; // 投入金额

  @ValidateIf((o) => o.type === TransactionType.ENTRY)
  @IsNumber({}, { message: 'returnRate must be a number when type is entryPrice' })
  @Min(0, { message: 'returnRate must be at least 0 when type is entryPrice' })
  @Max(10, { message: 'returnRate must be at most 10 when type is entryPrice' })
  returnRate?: number; // 报酬率，如 0.85 表示 85%

  @ValidateIf((o) => o.type === TransactionType.ENTRY)
  @IsEnum(AccountType, {
    message: 'accountType must be either DEMO or REAL when type is entryPrice',
  })
  @IsOptional()
  accountType?: AccountType; // 账户类型 (DEMO=虚拟, REAL=真实)，默认 DEMO
}
