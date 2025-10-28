import { IsNumber, IsPositive } from 'class-validator';

export class SettleTransactionDto {
  @IsNumber()
  @IsPositive()
  exitPrice!: number; // 出场价格（前端传入）
}
