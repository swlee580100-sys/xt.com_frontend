import { TradeDirection, TransactionStatus, AccountType } from '@prisma/client';

export class TransactionResponseDto {
  id!: string;
  userId!: string;
  orderNumber!: string;
  accountType!: AccountType;
  assetType!: string;
  direction!: TradeDirection;
  entryTime!: Date;
  expiryTime!: Date;
  duration!: number;
  entryPrice!: number;
  currentPrice!: number | null;
  exitPrice!: number | null;
  spread!: number;
  investAmount!: number;
  returnRate!: number;
  actualReturn!: number;
  status!: TransactionStatus;
  createdAt!: Date;
  updatedAt!: Date;
  settledAt!: Date | null;
}
