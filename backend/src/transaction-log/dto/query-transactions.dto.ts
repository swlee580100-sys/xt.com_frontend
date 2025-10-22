import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TradeDirection, TransactionStatus } from '@prisma/client';

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
