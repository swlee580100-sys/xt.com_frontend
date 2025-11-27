export type TradeDirection = 'CALL' | 'PUT';
export type TransactionStatus = 'PENDING' | 'SETTLED' | 'CANCELED';
export type AccountType = 'DEMO' | 'REAL';

export interface Transaction {
  id: string;
  userId: string;
  userName?: string;  // 用戶名
  orderNumber: string;
  marketSessionId?: string | null;   // 所屬大盤ID（可選）
  marketSessionName?: string | null; // 所屬大盤名稱（可選）
  accountType: AccountType;
  assetType: string;
  direction: TradeDirection;
  entryTime: string;
  expiryTime: string;
  duration: number;
  entryPrice: number;
  currentPrice: number | null;
  exitPrice: number | null;
  spread: number;
  investAmount: number;
  returnRate: number;
  actualReturn: number;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  isManaged?: boolean; // 是否在托管狀態下产生的交易
}

export interface PaginatedTransactionsResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface QueryTransactionsParams {
  page?: number;
  limit?: number;
  assetType?: string;
  direction?: TradeDirection;
  status?: TransactionStatus;
  accountType?: AccountType;
  userId?: string;
  username?: string;
  managedMode?: boolean;
  marketSessionId?: string; // 大盤ID，用於篩選指定大盤的交易
  orderNumber?: string;
  from?: string;
  to?: string;
}

export interface SettleTransactionDto {
  exitPrice: number;
}

export interface ForceSettleDto {
  exitPrice?: number;
  result?: 'WIN' | 'LOSE';
  reason?: string;
}

export interface CreateTransactionDto {
  userId: string;
  assetType: string;
  direction: TradeDirection;
  duration: number;
  entryPrice: number;
  investAmount: number;
  returnRate: number; // 报酬率（0-10），如 0.85 表示 85%
  accountType?: AccountType; // 默认 DEMO
  entryTime?: string; // ISO 8601 格式，默认当前时间
  exitPrice?: number; // 出场价格，如果提供则创建已结算的交易
  status?: TransactionStatus; // 默认 PENDING
  autoSettle?: boolean; // 是否自动结算（当提供 exitPrice 时），默认 true
  reason?: string; // 创建原因（用于审计）
  marketSessionId?: string | null; // 大盤ID（可選）
}

export interface UpdateTransactionDto {
  assetType?: string;
  direction?: TradeDirection;
  duration?: number;
  entryPrice?: number;
  exitPrice?: number | null;
  investAmount?: number;
  returnRate?: number;
  accountType?: AccountType;
  entryTime?: string;
  status?: TransactionStatus;
  actualReturn?: number; // 實際收益
}
