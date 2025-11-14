/**
 * Market Session (大小盘) Types
 * 大盘、小盘、周期相关的类型定义
 */

// 枚举类型
export enum MarketResult {
  PENDING = 'PENDING',   // 待定
  WIN = 'WIN',           // 赢（用户角度）
  LOSE = 'LOSE'          // 输（用户角度）
}

export enum MarketSessionStatus {
  PENDING = 'PENDING',     // 待开盘
  ACTIVE = 'ACTIVE',       // 进行中
  COMPLETED = 'COMPLETED', // 已完成
  CANCELED = 'CANCELED'    // 已取消
}

export enum SubMarketStatus {
  PENDING = 'PENDING',     // 待开始
  ACTIVE = 'ACTIVE',       // 运行中
  COMPLETED = 'COMPLETED', // 已完成
  STOPPED = 'STOPPED'      // 已停止
}

export enum CycleStatus {
  PENDING = 'PENDING',     // 待开始
  RUNNING = 'RUNNING',     // 进行中
  COMPLETED = 'COMPLETED', // 已完成
  FAILED = 'FAILED'        // 失败
}

// 交易类型规则
export interface TradeTypeRule {
  assetType: string;
  durations: number[];
}

// 小盘周期
export interface SubMarketCycle {
  id: string;
  subMarketId: string;
  cycleNumber: number;
  startTime: string;
  endTime: string;
  status: CycleStatus;
  startPrice?: string | null;
  endPrice?: string | null;
  orderCount: number;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
}

// 小盘
export interface SubMarket {
  id: string;
  marketSessionId: string;
  name: string;
  tradeDuration: number;
  profitRate: number;
  status: SubMarketStatus;
  startTime?: string | null;
  endTime?: string | null;
  totalCycles: number;
  completedCycles: number;
  createdAt: string;
  updatedAt: string;
  cycles?: SubMarketCycle[];
}

// 大盘
export interface MarketSession {
  id: string;
  name: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  initialResult: MarketResult;
  actualResult?: MarketResult | null;
  status: MarketSessionStatus;
  tradeTypes?: TradeTypeRule[] | null;
  assetType?: string | null;
  createdById: string;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  subMarkets?: SubMarket[];
}

// API 请求类型
export interface CreateMarketSessionRequest {
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  initialResult?: MarketResult;
  assetType?: string;
  tradeTypes?: TradeTypeRule[];
}

export interface UpdateMarketSessionRequest {
  name?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  initialResult?: MarketResult;
  actualResult?: MarketResult;
  assetType?: string;
  tradeTypes?: TradeTypeRule[];
}

export interface GetMarketSessionsParams {
  status?: MarketSessionStatus;
  page?: number;
  limit?: number;
}

export interface GetCyclesParams {
  status?: CycleStatus;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

// API 响应类型
export interface MarketSessionListResponse {
  marketSessions: MarketSession[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CyclesListResponse {
  data: SubMarketCycle[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StartMarketSessionResponse {
  marketSession: MarketSession;
  subMarketsCreated: number;
}

export interface StopMarketSessionResponse {
  message: string;
  marketSession: MarketSession;
}
