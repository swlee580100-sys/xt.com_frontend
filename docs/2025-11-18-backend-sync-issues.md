# 2025-11-18 後端聯調待確認事項

本文檔記錄前端客服管理模組與後端 API 聯調時需要確認的問題。

## 1. 對話未讀數量欄位問題 ⚠️ 高優先級

### 問題描述
前端在顯示對話列表時，需要顯示每個對話的未讀訊息數量（紅色圓點徽章），但目前後端返回的對話數據中 `adminUnreadCount` 欄位為 `undefined`。

### 當前狀況
- 前端期望欄位：`adminUnreadCount`（管理員未讀數量）
- 後端實際返回：`undefined`
- 影響：無法在對話列表中顯示未讀訊息紅色圓點徽章

### 需要確認
1. **後端 API 返回的欄位名稱是什麼？**
   - 是否為 `unreadCount`？
   - 是否為 `adminUnread`？
   - 是否為其他名稱？
   - 或者後端目前尚未實現此欄位？

2. **API 端點**：`GET /admin/support/conversations`
   - 請確認返回的對話對象中，未讀數量欄位的確切名稱
   - 請確認該欄位是否區分管理員未讀（`adminUnreadCount`）和用戶未讀（`userUnreadCount`）

3. **預期數據結構**：
```typescript
{
  id: string;
  userId: string;
  userName: string;
  status: ConversationStatus;
  adminUnreadCount: number;  // 管理員未讀數量
  userUnreadCount: number;   // 用戶未讀數量
  lastMessageAt?: string;
  // ... 其他欄位
}
```

### 前端臨時處理
目前前端已添加數據映射邏輯，嘗試多種可能的欄位名稱：
- `adminUnreadCount`
- `unreadCount`
- `adminUnread`
- `unread`

如果以上欄位都不存在，則默認為 `0`。

---

## 2. 標記已讀功能確認

### 問題描述
當管理員點擊進入對話時，前端會調用 Socket.IO 的 `markAsRead` 方法標記對話為已讀，但需要確認後端是否正確處理。

### 需要確認
1. **Socket.IO 事件**：`support:read`
   - 後端是否正確處理此事件？
   - 標記已讀後，是否會更新對話的 `adminUnreadCount`？
   - 是否會觸發 `support:messages-read` 事件通知前端？

2. **API 端點**（如果有的話）：
   - 是否有 REST API 端點可以標記對話為已讀？
   - 例如：`POST /admin/support/conversations/:id/read`

3. **未讀數量更新**：
   - 標記已讀後，`GET /admin/support/unread-count` 返回的總未讀數量是否會即時更新？
   - 對話列表中的 `adminUnreadCount` 是否會即時更新？

---

## 3. 對話狀態更新確認

### 問題描述
當管理員點擊「處理完畢」按鈕時，前端會調用 `POST /admin/support/conversations/:id/close`，但需要確認後端返回的數據是否包含更新後的狀態。

### 需要確認
1. **API 響應**：
   - 關閉對話後，返回的對話對象中 `status` 是否正確更新為 `CLOSED`？
   - 是否需要前端重新獲取對話列表，還是後端會通過 Socket.IO 推送更新？

2. **Socket.IO 事件**：
   - 關閉對話後，是否會觸發 `support:conversation-status` 事件？
   - 事件數據格式是否為：`{ conversationId: string, status: string }`

---

## 4. 對話列表篩選確認

### 問題描述
前端需要根據對話狀態（`PENDING`、`ACTIVE`、`CLOSED`）篩選對話列表。

### 需要確認
1. **API 參數**：
   - `GET /admin/support/conversations` 是否支持 `status` 查詢參數？
   - 如果不支持，前端是否需要獲取所有對話後在前端篩選？

2. **狀態值對應**：
   - 後端使用的狀態值是否與前端一致？
   - 前端使用：`PENDING`、`ACTIVE`、`CLOSED`
   - 後端是否使用相同值，還是使用 `IN_PROGRESS`、`RESOLVED` 等？

---

## 5. 數據格式確認

### 需要確認的欄位映射

| 前端期望欄位 | 後端實際欄位 | 狀態 |
|------------|------------|------|
| `adminUnreadCount` | ❓ 待確認 | ⚠️ 未確認 |
| `userUnreadCount` | ❓ 待確認 | ⚠️ 未確認 |
| `status` | ❓ 待確認 | ⚠️ 未確認 |
| `assignedAdminId` | ❓ 待確認 | ⚠️ 未確認 |
| `assignedAdminName` | ❓ 待確認 | ⚠️ 未確認 |

### 對話對象完整結構確認
請後端提供實際返回的對話對象範例：
```json
{
  "id": "xxx",
  "userId": "xxx",
  "userName": "xxx",
  "status": "xxx",
  "adminUnreadCount": 0,  // 或實際欄位名稱
  "userUnreadCount": 0,   // 或實際欄位名稱
  "lastMessageAt": "2025-11-18T09:27:00Z",
  "assignedAdminId": "xxx",
  "assignedAdminName": "xxx",
  "createdAt": "xxx",
  "updatedAt": "xxx"
}
```

---

## 6. Socket.IO 連接確認

### 當前狀況
- Socket.IO 連接地址：`http://47.237.31.83:3000/support`
- 連接狀態：✅ 已成功連接

### 需要確認
1. **事件名稱一致性**：
   - 前端監聽：`support:message`、`support:conversation-status`、`support:messages-read` 等
   - 後端發送的事件名稱是否一致？

2. **事件數據格式**：
   - 請提供各事件的實際數據格式範例

---

## 測試建議

### 測試場景 1：未讀數量顯示
1. 創建一個有未讀訊息的對話
2. 調用 `GET /admin/support/conversations`
3. 檢查返回的對話對象中，未讀數量欄位的名稱和值
4. 確認前端是否能正確顯示紅色圓點徽章

### 測試場景 2：標記已讀
1. 點擊進入有未讀訊息的對話
2. 前端發送 `support:read` 事件
3. 檢查後端是否正確處理
4. 檢查 `adminUnreadCount` 是否更新為 0
5. 檢查總未讀數量是否減少

### 測試場景 3：處理完畢
1. 點擊「處理完畢」按鈕
2. 檢查對話狀態是否更新為 `CLOSED`
3. 檢查對話是否從「進行中」分頁移到「處理完畢」分頁

---

## 聯繫方式

如有問題，請聯繫前端開發團隊進行確認。

**最後更新時間**：2025-11-18

