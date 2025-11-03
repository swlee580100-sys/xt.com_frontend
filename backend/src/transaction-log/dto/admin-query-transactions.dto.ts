import { IsOptional, IsString } from 'class-validator';

import { QueryTransactionsDto } from './query-transactions.dto';

export class AdminQueryTransactionsDto extends QueryTransactionsDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
