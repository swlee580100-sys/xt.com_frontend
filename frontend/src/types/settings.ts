export interface Setting {
  id: string;
  key: string;
  value: any;
  category: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsByCategory {
  admin?: Setting[];
  trading?: Setting[];
  customer_service?: Setting[];
  latency?: Setting[];
  [key: string]: Setting[] | undefined;
}

// 管理员账号设置
export interface UpdateAdminAccountDto {
  username: string;
  password: string;
  displayName?: string;
}

// 交易渠道设置
export interface TradingChannel {
  name: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  config?: Record<string, any>;
}

export interface UpdateTradingChannelsDto {
  channels: TradingChannel[];
}

// 客服窗口设置
export interface CustomerServiceConfig {
  enabled: boolean;
  provider?: string; // 如 "custom", "tawk", "intercom"
  scriptUrl?: string;
  widgetId?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark';
  welcomeMessage?: string;
}

export interface UpdateCustomerServiceDto {
  config: CustomerServiceConfig;
}

// 延迟设置
export interface LatencyConfig {
  tradingDelay: number; // 交易延迟（毫秒）
  apiDelay: number; // API 调用延迟（毫秒）
  priceUpdateDelay: number; // 价格更新延迟（毫秒）
  settlementDelay: number; // 结算延迟（毫秒）
}

export interface UpdateLatencyDto {
  config: LatencyConfig;
}

