/**
 * Binance 市場數據服务
 * 通过後端 API 代理访问 Binance API
 */

import { appConfig } from '@/config/env';

interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  high24h: number;
  low24h: number;
  volume: string;
  lastUpdate: number;
}

export class BinanceMarketService {
  private cache = new Map<string, { data: MarketData; timestamp: number }>();
  private cacheDuration = 3000; // 3秒缓存
  private apiUrl = appConfig.apiUrl;

  /**
   * 获取单個交易對的24小時價格统计
   */
  async get24hrTicker(symbol: string): Promise<BinanceTicker> {
    try {
      const url = `${this.apiUrl}/market/ticker/${symbol}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error(`获取 ${symbol} 數據失敗:`, error);
      throw error;
    }
  }

  /**
   * 获取多個交易對的數據（并行請求）
   */
  async getMultipleTickers(symbols: string[]): Promise<BinanceTicker[]> {
    const promises = symbols.map((symbol) => this.get24hrTicker(symbol));
    return await Promise.all(promises);
  }

  /**
   * 获取格式化的市場數據（带缓存）
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    const now = Date.now();
    const cached = this.cache.get(symbol);

    // 如果缓存存在且未过期
    if (cached && now - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    // 获取新數據
    const ticker = await this.get24hrTicker(symbol);
    const currentPrice = parseFloat(ticker.lastPrice);
    const openPrice = parseFloat(ticker.openPrice);
    const changePercent = ((currentPrice - openPrice) / openPrice) * 100;

    const marketData: MarketData = {
      symbol: ticker.symbol,
      price: currentPrice,
      change: parseFloat(ticker.priceChange),
      changePercent: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      volume: this.formatVolume(parseFloat(ticker.volume)),
      lastUpdate: ticker.closeTime,
    };

    // 更新缓存
    this.cache.set(symbol, { data: marketData, timestamp: now });

    return marketData;
  }

  /**
   * 获取多個交易對的格式化數據
   */
  async getMultipleMarketData(symbols: string[]): Promise<MarketData[]> {
    const promises = symbols.map((symbol) => this.getMarketData(symbol));
    return await Promise.all(promises);
  }

  /**
   * 格式化交易量
   */
  private formatVolume(volume: number): string {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toFixed(2);
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

// 創建单例
export const binanceMarketService = new BinanceMarketService();

/**
 * 交易對符号工具类
 */
export class SymbolMapper {
  private symbolMap: Record<string, string> = {
    'BTC/USDT': 'BTCUSDT',
    'ETH/USDT': 'ETHUSDT',
    'BNB/USDT': 'BNBUSDT',
    'SOL/USDT': 'SOLUSDT',
    'XRP/USDT': 'XRPUSDT',
    'ADA/USDT': 'ADAUSDT',
    'DOGE/USDT': 'DOGEUSDT',
    'LINK/USDT': 'LINKUSDT',
  };

  /**
   * 顯示名稱 -> Binance 符号
   */
  toBinanceSymbol(displayName: string): string {
    return this.symbolMap[displayName] || displayName.replace('/', '');
  }

  /**
   * Binance 符号 -> 顯示名稱
   */
  toDisplayName(binanceSymbol: string): string {
    const match = binanceSymbol.match(/^(\w+)(USDT|USD|EUR|BTC|ETH|BNB)$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return binanceSymbol;
  }

  /**
   * 获取所有支持的交易對
   */
  getAllSymbols(): string[] {
    return Object.values(this.symbolMap);
  }

  /**
   * 获取所有顯示名稱
   */
  getAllDisplayNames(): string[] {
    return Object.keys(this.symbolMap);
  }
}

export const symbolMapper = new SymbolMapper();
