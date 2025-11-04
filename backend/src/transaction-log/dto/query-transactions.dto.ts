import { IsOptional, IsEnum, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { TradeDirection, TransactionStatus, AccountType } from '@prisma/client';

export class QueryTransactionsDto {
  @IsOptional()
  @IsString()
  assetType?: string;

  @IsOptional()
  @IsEnum(TradeDirection)
  direction?: TradeDirection;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isManaged?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
