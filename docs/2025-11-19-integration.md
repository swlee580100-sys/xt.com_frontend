# 2025-11-19 聯調說明（前後端整合需求彙總）

本文彙整目前「開盤設置／交易流水」相關的前端行為與後端介面需求，請後端協助提供或確認接口與欄位，便於完成聯調與上線。

## 1. 背景與目標
- 新後台已加入：
  - 大盤管理（僅允許同時一個進行中的大盤）
  - 「交易流水」區塊：可在大盤頁面直接控制每筆訂單的「輸／贏」期望值，並在倒數結束時自動依期望值結算
  - 分頁：全部/30s/60s/90s/120s/150s/180s/已結束（已結束需可看見「剛倒數結束」的訂單）
- 目標：確保前端能正確顯示交易對應之大盤資訊，並在需要時可查詢特定大盤下的已結束訂單。

## 2. 當前問題摘要
1) 交易流水的大盤欄位沒有顯示值  
   - 前端欄位：`marketSessionId?`、`marketSessionName?`  
   - 問題：交易列表 API 回傳中無對應欄位，導致「大盤」欄顯示為 `-`。  
   - 需求：後端在交易列表/詳情回傳加入對應欄位（見第 3 節）。

2) 「已結束」分頁需顯示剛倒數結束的訂單  
   - 目前前端以本地快取（recentFinished）暫存剛到期的 PENDING 訂單，避免它在立刻被結算後「瞬間消失」。  
   - 需求（建議）：提供按大盤查詢已結束（SETTLED）訂單的接口，長期可查歷史（見第 3.3 節）。

## 3. 後端接口需求

### 3.1 交易列表（新增大盤欄位）
- 路徑（現有）：`GET /transactions`
- 查詢參數（範例）：  
  - `page`、`limit`  
  - `status` in {`PENDING`,`SETTLED`,`CANCELED`}  
  - `accountType` in {`REAL`,`DEMO`}  
  - `assetType`（可選）  
  - `direction`（可選）  
  - `username`（可選）
- 回傳（新增欄位）：  
  - `marketSessionId: string | null`  
  - `marketSessionName: string | null`
- 目的：前端在「交易流水」列表顯示「大盤」一欄，並可後續依大盤篩選或導覽。

### 3.2 交易詳情（可選強化）
- 路徑（現有）：`GET /transactions/:orderNumber`
- 回傳（新增欄位）：  
  - `marketSessionId: string | null`  
  - `marketSessionName: string | null`
- 目的：詳情面板或後續匯出報表需要。

### 3.3 依大盤查詢已結束訂單（建議新增）
- 路徑（新）：`GET /transactions/by-session/:sessionId`
- 查詢參數：  
  - `status=SETTLED`（固定或可選）  
  - `page`、`limit`  
  - `from`、`to`（可選，用於時間範圍篩選）  
  - 其他可選：`direction`、`assetType`、`username`
- 回傳：標準分頁格式 + 交易資料（同交易列表結構，含 `marketSessionId`、`marketSessionName`）
- 目的：在大盤內頁或「已結束」分頁（清理本地僅暫存的限制），可穩定查詢歷史記錄。

### 3.4 大盤清單 / 詳情（現況確認）
- 路徑（現有）：  
  - `GET /admin/market-sessions`（支援 `status=ACTIVE` 及一般分頁）  
  - `GET /admin/market-sessions/:id`
- 回傳：維持目前欄位即可（名稱、狀態、建立者／建立時間等）。  
  前端已改為啟停控制，不再要求 UI 上填「開盤/結束」時間，但若後端仍有內部時間紀錄，可保留用於統計。

### 3.5 待開盤可查看訂單詳情內頁（補充）
- 使用情境：在「待開盤」分頁中，管理員可能仍要查看該大盤的訂單詳情（若有預先建立或歷史留存資料）。  
- 需求建議：
  - 優先使用第 3.3 節的「依大盤查詢訂單」接口，允許 `status` 多值或可多次查詢：  
    - `status=PENDING`（尚未結算或準備中的訂單）  
    - `status=SETTLED`（歷史已結束）  
    - `status=CANCELED`（被取消）  
  - 或提供統一接口：`GET /transactions/by-session/:sessionId?status=...`，前端在內頁（詳情）切換狀態分頁查詢。  
  - 搭配 `GET /transactions/:orderNumber` 取得單筆詳情（含 `marketSessionId/name`）。

## 4. 前端期望的資料結構（重點欄位）

### 4.1 交易 Transaction（片段）
```ts
{
  id: string;
  orderNumber: string;
  userId: string;
  userName?: string;
  accountType: 'REAL' | 'DEMO';
  assetType: string;
  direction: 'CALL' | 'PUT';
  entryTime: string;   // ISO
  expiryTime: string;  // ISO
  entryPrice: number;
  exitPrice: number | null;
  spread: number;
  investAmount: number;
  status: 'PENDING' | 'SETTLED' | 'CANCELED';
  actualReturn: number;
  // 新增（請後端提供）
  marketSessionId?: string | null;
  marketSessionName?: string | null;
}
```

### 4.2 大盤 MarketSession（片段）
```ts
{
  id: string;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';
  createdAt: string; // ISO
  createdByName?: string | null;
}
```

## 5. 前端行為摘要（供後端理解）
- 交易列表區塊：  
  - 「輸贏控制」的切換只設定「期望結果」，不即時結算；倒數結束後（expiryTime <= now），前端才依期望結果送出結算請求。  
  - 「已結束」分頁需能看到剛倒數結束的訂單。若後端瞬間完成結算，前端也會先把「到期但仍回在 PENDING 清單內的訂單」暫存於本地 `recentFinished` 顯示。  
  - 長期建議：提供第 3.3 節的接口，讓「已結束」可直接查詢真實歷史。

## 6. 聯調檢查清單
- [ ] `GET /transactions` 回傳含 `marketSessionId`、`marketSessionName`
- [ ] （可選）`GET /transactions/:orderNumber` 回傳含大盤欄位
- [ ] （建議）`GET /transactions/by-session/:sessionId` 可查 `status=SETTLED`
- [ ] `GET /admin/market-sessions?status=ACTIVE` 可穩定取得當前進行中的大盤

## 7. 測試案例（摘要）
1) 建立一個大盤並啟用，產生多筆不同秒數訂單，切換期望結果：  
   - 到期前不應結算；到期瞬間依期望結果結算。  
   - 「已結束」分頁可立即看到該筆（本地暫存）或透過第 3.3 節接口查到。
2) 交易列表回傳含 `marketSessionName`：  
   - 前端「大盤」欄正常顯示名稱。
3) 切換全局／分頁輸贏控制：  
   - 僅更新 switch 狀態；不應造成列表瞬間清空。

## 8. 問題追蹤
- 交易列表缺少大盤欄位 → 影響 UI 顯示（顯示為 `-`）  
- 已結束分頁需穩定依大盤查詢歷史 → 建議新增接口（3.3）

## 9. 時間線建議
- D+0：後端確認是否能於交易回傳中加入 `marketSessionId` / `marketSessionName`  
- D+1：提供按大盤查詢已結束交易接口（若評估可行）  
- D+2：前端切換「已結束」分頁資料源為後端接口（取代暫存）

---
如需我提供 OpenAPI（Swagger）草案或更精細的回傳範例，請告知，我可以補上規格檔。 
