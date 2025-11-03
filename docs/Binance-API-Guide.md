# Binance API Guide

## 📡 Binance API 介紹
Binance（幣安）提供公開 API，讓開發者無需帳號即可存取即時市場數據，也可透過私有 API 進行帳戶管理與交易操作。

---

## 🔑 API 類型

### 1. **Public API（公開）**
- ✅ 無需 API 金鑰  
- ✅ 可直接存取市場數據  
- ✅ 取得 K 線圖、ticker、深度數據等  

### 2. **Private API（私有）**
- 🔐 需要 API 金鑰與簽名  
- 🔐 可查詢帳戶資訊、執行交易、下單、取消訂單等  

---

## 📊 主要端點

### 🕒 K 線圖數據 (KLine / Candlestick)
`GET /api/v3/klines`

**參數：**
| 參數 | 說明 | 範例 |
|------|------|------|
| `symbol` | 交易對，如 `BTCUSDT`、`ETHUSDT` | `BTCUSDT` |
| `interval` | 時間間隔（1m, 5m, 15m, 1h, 1d 等） | `1h` |
| `limit` | 返回數量（最多 1000） | `500` |
| `startTime` | 開始時間（毫秒） | 可選 |
| `endTime` | 結束時間（毫秒） | 可選 |

**範例請求：**
```javascript
fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=500')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

---

### 📈 24 小時 Ticker 統計  
`GET /api/v3/ticker/24hr`

**參數：**
| 參數 | 說明 | 範例 |
|------|------|------|
| `symbol` | 交易對（可選，不填為全部交易對） | `BTCUSDT` |

**範例請求：**
```javascript
fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

---

### 📊 深度數據 (Order Book)
`GET /api/v3/depth`

**參數：**
| 參數 | 說明 | 範例 |
|------|------|------|
| `symbol` | 交易對 | `BTCUSDT` |
| `limit` | 深度等級（5, 10, 20, 50, 100, 500, 1000, 5000） | `100` |

**範例請求：**
```javascript
fetch('https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=100')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

---

### 💱 最新價格 (Latest Price)
`GET /api/v3/ticker/price`

**參數：**
| 參數 | 說明 | 範例 |
|------|------|------|
| `symbol` | 交易對（可選，不填為全部） | `BTCUSDT` |

**範例請求：**
```javascript
fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

---

## 🔧 在 TypeScript 中使用

### 基本函數

```typescript
// 獲取 K 線圖數據
async function getKlines(symbol: string, interval: string, limit: number = 500) {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('取得 K 線數據失敗:', error);
    return null;
  }
}

// 使用範例
const btcKlines = await getKlines('BTCUSDT', '1h', 500);
console.log(btcKlines);
```

---

### 完整型別定義範例

```typescript
interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
  ignore: string;
}
```

---

## 📚 參考資料
- 官方文件：https://binance-docs.github.io/apidocs/spot/en/#public-rest-api  
- API 狀態檢查：https://api.binance.com/api/v3/ping  
- 時間同步端點：https://api.binance.com/api/v3/time  
