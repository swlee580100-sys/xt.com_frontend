# 2025-11-19 聯調說明（前後端硬需求精簡版）

目的：對齊最新「開盤設置／交易流水」行為，列出後端硬需求，便於快速聯調。

前端頁面與關鍵行為
- 分頁：PENDING(待開盤) / ACTIVE(進行中) / CLOSED(已閉盤)
- 待開盤：名稱、描述、預設輸贏、操作（查看訂單／啟用／編輯／刪除）
- 進行中：名稱、開盤時間(=startTime)、進行中訂單數、已結束訂單數、操作（閉盤）
- 已閉盤：名稱、開盤時間、結束時間、已結束訂單數、操作（查看訂單）
- 規則
  - 同時間僅允許一個 ACTIVE；若已有 ACTIVE，待開盤的「啟用」需 disabled
  - 啟用成功後自動切換至「進行中」分頁
  - 已閉盤不可重新啟用；僅 PENDING 顯示「啟用」
  - 文案：開啟→「啟用」、關閉→「閉盤」
- 全局輸贏控制 Select：只在進行中分頁且存在 ACTIVE 時顯示；僅設定期望值，不即時結算

後端硬需求（接口）
- 交易列表／詳情需含大盤欄位
  - `GET /transactions`、`GET /transactions/:orderNumber`
  - 回傳新增欄位：`marketSessionId: string | null`、`marketSessionName: string | null`
- 依大盤查詢已結束訂單（建議）
  - `GET /transactions/by-session/:sessionId?status=SETTLED&page&limit&from&to&direction&assetType&username`
  - 用途：大盤內頁或「已結束」分頁的歷史查詢，取代前端暫存限制
- 大盤清單／詳情
  - `GET /admin/market-sessions?status=...`、`GET /admin/market-sessions/:id`
  - 狀態：`PENDING` | `ACTIVE` | `COMPLETED` | `CANCELED`
  - 欄位：`startTime`（開盤=啟用時間）、`endTime`（閉盤）
- 大盤啟停
  - 啟用：`POST /admin/market-sessions/:id/start`（針對 PENDING）
  - 閉盤：`POST /admin/market-sessions/:id/stop`
- 大盤訂單統計（列表顯示數字，推薦）
  - 批次：`GET /admin/market-sessions/order-stats?ids=uuid1,uuid2,...`
  - 回傳：`stats: Array<{ sessionId: string, pendingCount: number, settledCount: number }>`
  - 定義：`pendingCount`=狀態`PENDING`筆數（不含已結束）；`settledCount`=狀態`SETTLED`筆數；皆以`marketSessionId`綁定
  - 容錯：若 404，前端改用本地計數（已實作 fallback）

資料定義要點
- Transaction
  - 必含：`status` in `PENDING|SETTLED|CANCELED`；`entryTime`、`expiryTime`、`entryPrice`、`spread`
  - 必含：`marketSessionId`、`marketSessionName`
- MarketSession
  - 必含：`id`、`name`、`status` in `PENDING|ACTIVE|COMPLETED|CANCELED`
  - 必含：`startTime`（開盤）／`endTime`（閉盤）
  - 建議：`initialResult` in `WIN|LOSE|PENDING`（對應 全贏/全輸/個別控制）

驗收要點
- 待開盤「啟用」在存在任一 ACTIVE 時為 disabled；啟用後自動切到「進行中」
- 進行中：全局控制僅在有 ACTIVE 時顯示；進行中/已結束訂單數來源為後端 stats（404 時落回本地）
- 過濾：「全部/30/60/90/120/150/180」僅顯示 remain>0 且 `status=PENDING` 的訂單；「已結束」顯示本地 recentFinished
- 已閉盤：只顯示「已結束訂單數」，不顯示「進行中訂單」

補充
- 如需 OpenAPI（Swagger）範例或型別，請告知要覆蓋之接口，我會提供最小可用範例。 
