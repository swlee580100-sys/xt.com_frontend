# Binance 市场数据 API 使用指南

本文档专注于如何使用 Binance API 获取加密货币市场数据。

---

## 目录
1. [快速开始](#1-快速开始)
2. [API 基础信息](#2-api-基础信息)
3. [核心功能](#3-核心功能)
4. [完整代码示例](#4-完整代码示例)
5. [交易对配置](#5-交易对配置)
6. [实际应用场景](#6-实际应用场景)

---

## 1. 快速开始

### 最简单的调用方式

```typescript
// 直接调用 Binance API 获取 BTC 价格
const symbol = 'BTCUSDT';
const url = 'https://api.binance.com/api/v3/ticker/24hr?symbol=' + symbol;
const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url);

const response = await fetch(proxyUrl);
const data = await response.json();

console.log('BTC 当前价格:', data.lastPrice);
console.log('24h 涨跌幅:', data.priceChangePercent + '%');
```

---

## 2. API 基础信息

### 2.1 端点信息

| 项目 | 值 |
|------|-----|
| **Base URL** | `https://api.binance.com/api/v3` |
| **代理 URL** | `https://api.codetabs.com/v1/proxy?quest=` |
| **认证方式** | 无需认证（公开数据） |
| **费率限制** | 1200 请求/分钟 |
| **CORS** | 需要使用代理 |

### 2.2 为什么需要代理？

```typescript
// ❌ 直接调用会遇到 CORS 错误
fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT')
// Error: CORS policy blocked

// ✅ 通过代理调用
const url = 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT';
const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url);
fetch(proxyUrl) // 成功
```

---

## 3. 核心功能

### 3.1 获取 24 小时价格统计

这是最常用的 API，包含价格、涨跌幅、交易量等信息。

#### API 端点
```
GET /api/v3/ticker/24hr
```

#### 请求参数
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| symbol | STRING | YES | 交易对符号，如 BTCUSDT |

#### 完整示例

```typescript
async function getBinancePrice(symbol: string) {
  const baseUrl = 'https://api.binance.com/api/v3';
  const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=';

  const url = `${baseUrl}/ticker/24hr?symbol=${symbol}`;
  const response = await fetch(`${proxyUrl}${encodeURIComponent(url)}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// 使用
const ticker = await getBinancePrice('BTCUSDT');
console.log(ticker);
```

#### 响应结构

```json
{
  "symbol": "BTCUSDT",
  "priceChange": "-94.99999800",
  "priceChangePercent": "-95.960",
  "weightedAvgPrice": "0.29628482",
  "prevClosePrice": "0.10002000",
  "lastPrice": "50000.00000200",
  "lastQty": "200.00000000",
  "bidPrice": "49999.00000000",
  "bidQty": "100.00000000",
  "askPrice": "50001.00000200",
  "askQty": "100.00000000",
  "openPrice": "49900.00000000",
  "highPrice": "50500.00000000",
  "lowPrice": "49500.00000000",
  "volume": "8913.30000000",
  "quoteVolume": "15.30000000",
  "openTime": 1499783499040,
  "closeTime": 1499869899040,
  "firstId": 28385,
  "lastId": 28460,
  "count": 76
}
```

#### 重要字段说明

| 字段 | 说明 | 示例 |
|------|------|------|
| `symbol` | 交易对符号 | "BTCUSDT" |
| `lastPrice` | **当前价格** | "50000.00" |
| `priceChange` | 价格变化（绝对值） | "-94.99" |
| `priceChangePercent` | **24h 涨跌幅（%）** | "-95.960" |
| `openPrice` | 24h 开盘价 | "49900.00" |
| `highPrice` | 24h 最高价 | "50500.00" |
| `lowPrice` | 24h 最低价 | "49500.00" |
| `volume` | **24h 交易量（基础货币）** | "8913.30" |
| `quoteVolume` | 24h 交易量（报价货币） | "15.30" |

### 3.2 数据处理示例

```typescript
async function getFormattedMarketData(symbol: string) {
  const ticker = await getBinancePrice(symbol);

  // 解析价格
  const currentPrice = parseFloat(ticker.lastPrice);
  const openPrice = parseFloat(ticker.openPrice);

  // 计算涨跌幅
  const changePercent = ((currentPrice - openPrice) / openPrice) * 100;

  // 格式化交易量
  const volume = formatVolume(parseFloat(ticker.volume));

  return {
    symbol: ticker.symbol,
    price: currentPrice,
    change: changePercent.toFixed(2) + '%',
    high24h: parseFloat(ticker.highPrice),
    low24h: parseFloat(ticker.lowPrice),
    volume: volume
  };
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) {
    return (volume / 1e9).toFixed(1) + 'B';
  } else if (volume >= 1e6) {
    return (volume / 1e6).toFixed(1) + 'M';
  } else if (volume >= 1e3) {
    return (volume / 1e3).toFixed(1) + 'K';
  }
  return volume.toFixed(2);
}

// 使用示例
const data = await getFormattedMarketData('BTCUSDT');
console.log(data);
// {
//   symbol: 'BTCUSDT',
//   price: 50000,
//   change: '+2.00%',
//   high24h: 50500,
//   low24h: 49500,
//   volume: '8.9B'
// }
```

---

## 4. 完整代码示例

### 4.1 基础服务类

```typescript
export class BinanceMarketService {
  private baseUrl = 'https://api.binance.com/api/v3';
  private proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=';

  // 获取单个交易对的 24 小时价格统计
  async get24hrTicker(symbol: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/ticker/24hr?symbol=${symbol}`;
      const response = await fetch(`${this.proxyUrl}${encodeURIComponent(url)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`获取 ${symbol} 数据失败:`, error);
      throw error;
    }
  }

  // 获取多个交易对的数据
  async getMultipleTickers(symbols: string[]): Promise<any[]> {
    const promises = symbols.map(symbol => this.get24hrTicker(symbol));
    const results = await Promise.all(promises);
    return results;
  }

  // 获取格式化的市场数据
  async getMarketData(symbol: string) {
    const ticker = await this.get24hrTicker(symbol);

    const currentPrice = parseFloat(ticker.lastPrice);
    const openPrice = parseFloat(ticker.openPrice);
    const changePercent = ((currentPrice - openPrice) / openPrice) * 100;

    return {
      symbol: ticker.symbol,
      price: currentPrice,
      change: changePercent,
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      volume: this.formatVolume(parseFloat(ticker.volume))
    };
  }

  private formatVolume(volume: number): string {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toFixed(2);
  }
}

// 创建单例
export const binanceMarketService = new BinanceMarketService();
```

### 4.2 使用示例

```typescript
import { binanceMarketService } from './BinanceMarketService';

// 示例 1: 获取单个交易对
async function example1() {
  const btcData = await binanceMarketService.getMarketData('BTCUSDT');
  console.log('BTC 价格:', btcData.price);
  console.log('24h 涨跌:', btcData.change + '%');
}

// 示例 2: 获取多个交易对
async function example2() {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  const tickers = await binanceMarketService.getMultipleTickers(symbols);

  tickers.forEach(ticker => {
    console.log(`${ticker.symbol}: $${ticker.lastPrice}`);
  });
}

// 示例 3: 实时价格监控
async function example3() {
  setInterval(async () => {
    const data = await binanceMarketService.getMarketData('BTCUSDT');
    console.log(`[${new Date().toLocaleTimeString()}] BTC: $${data.price}`);
  }, 5000); // 每 5 秒更新一次
}
```

---

## 5. 交易对配置

### 5.1 交易对符号格式

Binance 交易对符号格式：**基础货币 + 报价货币**（无分隔符）

| 显示名称 | Binance 符号 | 说明 |
|---------|-------------|------|
| BTC/USDT | `BTCUSDT` | 比特币兑 USDT |
| ETH/USDT | `ETHUSDT` | 以太坊兑 USDT |
| BNB/USDT | `BNBUSDT` | BNB 兑 USDT |
| BTC/USD | `BTCUSD` | 比特币兑 USD |
| ETH/BTC | `ETHBTC` | 以太坊兑比特币 |

### 5.2 常用交易对列表

#### USDT 交易对（推荐）
```typescript
const usdtPairs = [
  'BTCUSDT',   // 比特币
  'ETHUSDT',   // 以太坊
  'BNBUSDT',   // BNB
  'SOLUSDT',   // Solana
  'XRPUSDT',   // Ripple
  'ADAUSDT',   // Cardano
  'DOGEUSDT',  // Dogecoin
  'LINKUSDT',  // Chainlink
];
```

#### 法币交易对
```typescript
const fiatPairs = [
  'BTCUSD',    // 比特币兑美元
  'ETHEUR',    // 以太坊兑欧元
  'BNBGBP',    // BNB 兑英镑
];
```

#### 加密货币交易对
```typescript
const cryptoPairs = [
  'ETHBTC',    // ETH/BTC
  'BNBBTC',    // BNB/BTC
  'SOLETH',    // SOL/ETH
];
```

### 5.3 交易对映射工具

```typescript
class SymbolMapper {
  private symbolMap: Record<string, string> = {
    'BTC/USDT': 'BTCUSDT',
    'ETH/USDT': 'ETHUSDT',
    'BNB/USDT': 'BNBUSDT',
    'SOL/USDT': 'SOLUSDT',
    // ... 更多映射
  };

  // 显示名称 -> Binance 符号
  toBinanceSymbol(displayName: string): string {
    return this.symbolMap[displayName] || displayName.replace('/', '');
  }

  // Binance 符号 -> 显示名称
  toDisplayName(binanceSymbol: string): string {
    // BTCUSDT -> BTC/USDT
    const match = binanceSymbol.match(/^(\w+)(USDT|USD|EUR|BTC|ETH|BNB)$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return binanceSymbol;
  }
}

const mapper = new SymbolMapper();
console.log(mapper.toBinanceSymbol('BTC/USDT')); // 'BTCUSDT'
console.log(mapper.toDisplayName('BTCUSDT'));    // 'BTC/USDT'
```

---

## 6. 实际应用场景

### 6.1 场景 1: 交易价格显示

```typescript
// 在交易页面显示实时价格
async function displayTradingPrice(assetType: string) {
  const symbol = assetType.replace('/', ''); // 'BTC/USDT' -> 'BTCUSDT'

  const updatePrice = async () => {
    try {
      const ticker = await binanceMarketService.get24hrTicker(symbol);
      const price = parseFloat(ticker.lastPrice);
      const change = parseFloat(ticker.priceChangePercent);

      // 更新 UI
      document.getElementById('price').textContent = `$${price.toLocaleString()}`;
      document.getElementById('change').textContent = `${change.toFixed(2)}%`;
      document.getElementById('change').className = change >= 0 ? 'positive' : 'negative';
    } catch (error) {
      console.error('更新价格失败:', error);
    }
  };

  // 立即更新一次
  await updatePrice();

  // 每 3 秒更新一次
  setInterval(updatePrice, 3000);
}

// 使用
displayTradingPrice('BTC/USDT');
```

### 6.2 场景 2: K 线图数据准备

```typescript
async function prepareChartData(symbol: string) {
  const ticker = await binanceMarketService.get24hrTicker(symbol);

  return {
    current: parseFloat(ticker.lastPrice),
    open: parseFloat(ticker.openPrice),
    high: parseFloat(ticker.highPrice),
    low: parseFloat(ticker.lowPrice),
    volume: parseFloat(ticker.volume),
    timestamp: ticker.closeTime
  };
}
```

### 6.3 场景 3: 价格涨跌提醒

```typescript
async function priceAlert(symbol: string, targetPrice: number) {
  console.log(`开始监控 ${symbol}，目标价格: $${targetPrice}`);

  const checkPrice = async () => {
    const ticker = await binanceMarketService.get24hrTicker(symbol);
    const currentPrice = parseFloat(ticker.lastPrice);

    console.log(`当前价格: $${currentPrice}`);

    if (currentPrice >= targetPrice) {
      console.log(`🎯 价格达到目标！${symbol} = $${currentPrice}`);
      return true; // 停止监控
    }

    return false;
  };

  const intervalId = setInterval(async () => {
    const shouldStop = await checkPrice();
    if (shouldStop) {
      clearInterval(intervalId);
    }
  }, 10000); // 每 10 秒检查一次
}

// 使用：当 BTC 达到 51000 时提醒
priceAlert('BTCUSDT', 51000);
```

### 6.4 场景 4: 市场排行榜

```typescript
async function getMarketRanking() {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

  const marketData = await Promise.all(
    symbols.map(async (symbol) => {
      const ticker = await binanceMarketService.get24hrTicker(symbol);
      return {
        symbol: symbol,
        price: parseFloat(ticker.lastPrice),
        change: parseFloat(ticker.priceChangePercent),
        volume: parseFloat(ticker.volume)
      };
    })
  );

  // 按涨跌幅排序
  marketData.sort((a, b) => b.change - a.change);

  console.log('📊 24h 涨幅排行：');
  marketData.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.symbol}: $${item.price.toLocaleString()} ` +
      `(${item.change > 0 ? '+' : ''}${item.change.toFixed(2)}%)`
    );
  });

  return marketData;
}

// 使用
await getMarketRanking();
```

### 6.5 场景 5: 交易入场/出场价格记录

```typescript
// 用于创建交易时获取入场价格
async function getEntryPrice(assetType: string): Promise<number> {
  const symbol = assetType.replace('/', '');
  const ticker = await binanceMarketService.get24hrTicker(symbol);
  return parseFloat(ticker.lastPrice);
}

// 用于结算交易时获取出场价格
async function getExitPrice(assetType: string): Promise<number> {
  const symbol = assetType.replace('/', '');
  const ticker = await binanceMarketService.get24hrTicker(symbol);
  return parseFloat(ticker.lastPrice);
}

// 完整交易流程
async function executeTradeWithBinancePrices() {
  const assetType = 'BTC/USDT';

  // 1. 获取入场价格
  const entryPrice = await getEntryPrice(assetType);
  console.log('入场价格:', entryPrice);

  // 2. 创建交易（伪代码）
  const trade = await createTrade({
    assetType,
    entryPrice,
    direction: 'CALL',
    investAmount: 100
  });

  // 3. 等待交易时长（例如 60 秒）
  await new Promise(resolve => setTimeout(resolve, 60000));

  // 4. 获取出场价格
  const exitPrice = await getExitPrice(assetType);
  console.log('出场价格:', exitPrice);

  // 5. 结算交易
  const result = await settleTrade(trade.orderNumber, exitPrice);
  console.log('盈亏:', result.profit);
}
```

---

## 7. 错误处理

### 7.1 常见错误

```typescript
async function fetchWithErrorHandling(symbol: string) {
  try {
    const ticker = await binanceMarketService.get24hrTicker(symbol);
    return ticker;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('400')) {
        console.error('❌ 无效的交易对符号:', symbol);
      } else if (error.message.includes('429')) {
        console.error('❌ 请求过于频繁，请稍后再试');
      } else if (error.message.includes('500')) {
        console.error('❌ Binance 服务器错误');
      } else {
        console.error('❌ 网络错误:', error.message);
      }
    }
    throw error;
  }
}
```

### 7.2 重试机制

```typescript
async function fetchWithRetry(
  symbol: string,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await binanceMarketService.get24hrTicker(symbol);
    } catch (error) {
      console.warn(`第 ${i + 1} 次尝试失败`);

      if (i === maxRetries - 1) {
        throw error; // 最后一次尝试失败，抛出错误
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
    }
  }
}

// 使用
const ticker = await fetchWithRetry('BTCUSDT', 3, 1000);
```

---

## 8. 性能优化

### 8.1 批量请求优化

```typescript
// ❌ 低效：串行请求
async function getDataSerial(symbols: string[]) {
  const results = [];
  for (const symbol of symbols) {
    const data = await binanceMarketService.get24hrTicker(symbol);
    results.push(data);
  }
  return results;
}

// ✅ 高效：并行请求
async function getDataParallel(symbols: string[]) {
  const promises = symbols.map(symbol =>
    binanceMarketService.get24hrTicker(symbol)
  );
  return await Promise.all(promises);
}

// 性能对比
const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];

console.time('串行');
await getDataSerial(symbols); // ~2000ms
console.timeEnd('串行');

console.time('并行');
await getDataParallel(symbols); // ~500ms
console.timeEnd('并行');
```

### 8.2 缓存机制

```typescript
class CachedBinanceService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheDuration = 3000; // 3 秒缓存

  async get24hrTicker(symbol: string): Promise<any> {
    const now = Date.now();
    const cached = this.cache.get(symbol);

    // 如果缓存存在且未过期
    if (cached && now - cached.timestamp < this.cacheDuration) {
      console.log(`✅ 使用缓存: ${symbol}`);
      return cached.data;
    }

    // 获取新数据
    console.log(`🌐 API 请求: ${symbol}`);
    const data = await binanceMarketService.get24hrTicker(symbol);

    // 更新缓存
    this.cache.set(symbol, { data, timestamp: now });

    return data;
  }
}

const cachedService = new CachedBinanceService();
```

---

## 9. React/Vue 集成示例

### 9.1 React Hook

```typescript
import { useState, useEffect } from 'react';
import { binanceMarketService } from './BinanceMarketService';

export function useBinancePrice(symbol: string, refreshInterval: number = 5000) {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPrice = async () => {
      try {
        const ticker = await binanceMarketService.get24hrTicker(symbol);

        if (isMounted) {
          setPrice(parseFloat(ticker.lastPrice));
          setChange(parseFloat(ticker.priceChangePercent));
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    fetchPrice();
    const intervalId = setInterval(fetchPrice, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [symbol, refreshInterval]);

  return { price, change, loading, error };
}

// 使用
function PriceDisplay() {
  const { price, change, loading } = useBinancePrice('BTCUSDT', 5000);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>${price?.toLocaleString()}</h2>
      <p className={change >= 0 ? 'positive' : 'negative'}>
        {change >= 0 ? '+' : ''}{change?.toFixed(2)}%
      </p>
    </div>
  );
}
```

### 9.2 Vue Composable

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { binanceMarketService } from './BinanceMarketService';

export function useBinancePrice(symbol: string, refreshInterval: number = 5000) {
  const price = ref<number | null>(null);
  const change = ref<number | null>(null);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  let intervalId: number;

  const fetchPrice = async () => {
    try {
      const ticker = await binanceMarketService.get24hrTicker(symbol);
      price.value = parseFloat(ticker.lastPrice);
      change.value = parseFloat(ticker.priceChangePercent);
      loading.value = false;
    } catch (err) {
      error.value = err as Error;
      loading.value = false;
    }
  };

  onMounted(() => {
    fetchPrice();
    intervalId = setInterval(fetchPrice, refreshInterval);
  });

  onUnmounted(() => {
    clearInterval(intervalId);
  });

  return { price, change, loading, error };
}

// 使用
// <script setup>
// const { price, change } = useBinancePrice('BTCUSDT', 5000);
// </script>
```

---

## 10. 常见问题 FAQ

### Q1: 为什么需要使用代理 URL？
**A**: Binance API 不支持跨域请求（CORS），浏览器会阻止直接调用。使用代理服务器转发请求可以绕过此限制。

### Q2: 代理服务稳定吗？
**A**: `api.codetabs.com` 是免费代理，稳定性一般。生产环境建议：
- 自建代理服务器
- 使用后端 API 转发
- 使用 CORS-anywhere 等服务

### Q3: 如何避免请求频率限制？
**A**: Binance 限制 1200 请求/分钟：
- 实现缓存机制（3-5 秒）
- 批量请求（Promise.all）
- 避免不必要的轮询

### Q4: 交易对符号不存在怎么办？
**A**: 会返回 400 错误。使用前验证交易对是否存在：
```typescript
const validSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
if (!validSymbols.includes(symbol)) {
  throw new Error('Invalid symbol');
}
```

### Q5: 价格数据延迟多少？
**A**: 24hr ticker 接口延迟约 1-3 秒。需要实时数据请使用 WebSocket。

---

## 11. 生产环境建议

### 11.1 自建代理服务器

```javascript
// Node.js Express 代理示例
const express = require('express');
const axios = require('axios');
const app = express();

app.get('/api/binance/ticker', async (req, res) => {
  const { symbol } = req.query;

  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### 11.2 环境变量配置

```typescript
// .env
VITE_BINANCE_API_URL=https://api.binance.com/api/v3
VITE_PROXY_URL=https://your-proxy.com/api/binance

// config.ts
export const config = {
  binanceApiUrl: import.meta.env.VITE_BINANCE_API_URL,
  proxyUrl: import.meta.env.VITE_PROXY_URL
};
```

---

## 12. 总结

### 关键要点
1. ✅ 使用代理 URL 解决 CORS 问题
2. ✅ `/api/v3/ticker/24hr` 是最常用的端点
3. ✅ 交易对符号格式：`BTCUSDT`（无分隔符）
4. ✅ 并行请求提升性能（Promise.all）
5. ✅ 实现缓存和重试机制
6. ✅ 生产环境使用自建代理

### 快速参考

```typescript
// 获取价格
const ticker = await binanceMarketService.get24hrTicker('BTCUSDT');
const price = parseFloat(ticker.lastPrice);

// 获取涨跌幅
const change = parseFloat(ticker.priceChangePercent);

// 实时更新
setInterval(async () => {
  const data = await binanceMarketService.getMarketData('BTCUSDT');
  console.log(`BTC: $${data.price} (${data.change}%)`);
}, 5000);
```

---

**文档版本**: 1.0
**最后更新**: 2025-10-31
**适用项目**: 所有需要集成 Binance 市场数据的项目
