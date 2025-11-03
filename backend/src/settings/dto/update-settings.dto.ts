import { IsString, IsNotEmpty, ValidateNested, IsObject, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsObject()
  @IsNotEmpty()
  value!: any; // JSON 值

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSettingsBatchDto {
  @ValidateNested({ each: true })
  @Type(() => UpdateSettingDto)
  settings!: UpdateSettingDto[];
}

// 管理员账号设置
export class UpdateAdminAccountDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsOptional()
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

export class UpdateTradingChannelsDto {
  channels!: TradingChannel[];
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

export class UpdateCustomerServiceDto {
  @IsObject()
  config!: CustomerServiceConfig;
}

// 延迟设置
export interface LatencyConfig {
  // 交易延迟（毫秒）
  tradingDelay: number;
  // API 调用延迟（毫秒）
  apiDelay: number;
  // 价格更新延迟（毫秒）
  priceUpdateDelay: number;
  // 结算延迟（毫秒）
  settlementDelay: number;
}

export class UpdateLatencyDto {
  @IsObject()
  config!: LatencyConfig;
}

