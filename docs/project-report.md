# XT.com 前端 — 專案工程報告

## 概覽
- 名稱：`@crypto-sim/frontend`
- 技術棧：Vite、React 18、TypeScript、TailwindCSS、Radix UI、TanStack（Router/Query/Table）
- 目的：後台管理儀表板，涵蓋市場數據、用戶、操作員、CMS、開盤設置、客服與交易等模組。
- 入口：`index.html` → `src/main.tsx` → `src/routes/router.tsx`（TanStack Router）

## 目錄結構
- `src/`
  - `components/`：UI 元件（Radix + Tailwind）、版型（`layout/*`）與功能對話框。
  - `config/`：應用程式組態（`env.ts` 定義 API/WS URL、Sentry DSN）。
  - `constants/`：常數（例如 `trading-pairs.ts`）。
  - `hooks/`：自訂 hooks（`useAuth`、`useToast`、`useBinancePrice`）。
  - `lib/`：核心程式庫（`api-client.ts` 封裝 Axios、Token 刷新與攔截器）。
  - `providers/`：全域 Context（`auth-provider`、`query-client`、`toast-provider`）。
  - `routes/`：頁面路由（儀表板、用戶、操作員、CMS、設定等）。
  - `services/`：API 服務封裝（users、market、transactions、admins、settings、support、cms、ip-whitelist）。
  - `styles/`：全域樣式（`globals.css`，搭配 Tailwind tokens）。
  - `types/`：領域型別（auth、user、operator、admin、transaction、settings、cms、support）。
  - `utils/`：工具（如 `storage.ts`，負責使用者與 Token 持久化）。
- `public/`：靜態資源。
- `docs/`：產品說明與此報告。
- 工具設定：`vite.config.ts`、`tailwind.config.ts`、`postcss.config.cjs`、`tsconfig*.json`、ESLint/Prettier。

## 應用架構
- 路由：採 TanStack Router，`app-layout` 為受保護區塊；`beforeLoad` 未登入導向 `/login`；已登入訪問 `/login` 則導向 `/`。
- 版型：`AppShell` 包覆私有路由，提供共用 `header`/`sidebar`。
- 狀態/資料：
  - 伺服器狀態由 TanStack Query 管理（`QueryProvider`）。
  - 認證狀態由 `AuthProvider` 管理（使用者與 Tokens，並透過 `storage` 持久化）。
  - 通知由 `ToastProvider` 提供。
- 資料存取：
  - `lib/api-client.ts` 產生 Axios 實例，具備：
    - 以儲存的 Token 設定 Bearer Authorization。
    - 401 觸發刷新流程（`/auth/refresh`）。
    - 403 觸發 `onForbidden`（顯示提示，延遲自動登出）。
  - `services/*` 提供各資源的呼叫封裝。
- 主題/UI：
  - 使用 Tailwind 與 CSS 變數（`tailwind.config.ts`），`components/ui/*` 提供設計系統元件，並使用 Radix primitives。

## 主要路由（除 `/login` 外皆為私有）
- `/` 儀表板（Dashboard）
- `/market-data` 市場數據
- `/orders` 交易
- `/users` 用戶；`/users/$userId` 用戶詳情
- `/operators` 操作員；`/operators/$operatorId` 操作員詳情
- `/opening-settings` 開盤設置
- `/customer-service` 客服管理
- `/cms` 內容管理（CMS）
- `/settings` 系統設定
- `/login` 公開的登入頁

## 認證流程
- `AuthProvider` 提供 `{ user, tokens, isAuthenticated, login, logout, api }`。
- 登入：`POST {apiUrl}/admin/auth/login` → 儲存 `AuthTokens` 與正規化後的 `User`。
- Token 刷新：遇 401 自動以 `refreshToken` 呼叫 `POST {apiUrl}/auth/refresh`。
- Forbidden：403 以繁體中文顯示提示，5 秒後自動登出。
- 持久化：`utils/storage.ts` 將 `user` 與 `tokens` 存於瀏覽器儲存。

## 組態與環境變數
- `src/config/env.ts`：
  - `VITE_API_URL` → `appConfig.apiUrl`（預設 `http://localhost:3000/api`）
  - `VITE_WS_URL` → `appConfig.wsUrl`（預設 `ws://localhost:3000`）
  - `VITE_SENTRY_DSN` → `appConfig.sentryDsn`（預設空字串）
- `.env` 範例（於專案根目錄建立）：
  - `VITE_API_URL=https://your-api.example.com/api`
  - `VITE_WS_URL=wss://your-api.example.com`
  - `VITE_SENTRY_DSN=...`

## 工具與腳本
- `package.json` 腳本：
  - `dev`：啟動 Vite 開發伺服器。
  - `build`：產出正式版建置。
  - `preview`：預覽建置結果。
  - `lint`：以 ESLint 檢查 `src`（含 TS/React 插件）。
  - `typecheck`：`tsc --noEmit` 型別檢查。
- 開發依賴：Vite 5、TypeScript 5、ESLint + Prettier、TailwindCSS 3、`@vitejs/plugin-react`。

## UI／樣式
- TailwindCSS 自訂色票與動畫 keyframes。
- 設計系統元件位於 `components/ui/*`（input、select、button、table、badge、dialog、tabs、switch、toast、card、label 等）。
- 全域樣式於 `styles/globals.css`，引入 Tailwind layers 與 CSS 變數。

## 重要功能（依 2025-11-10 文檔）
- CMS：分享文案設置（含恢復預設）、入金地址設置。
- 客服管理：側邊欄入口、對話清單、訊息回覆（含圖片/影片）、交易摘要與倒數。
- 開盤設置：大盤策略（全贏/全輸/隨機/強制方向/個別用戶）；雙欄 UI；單用戶策略覆寫；在全贏/全輸下方向同步；對話框更輕量並支援直向滾動。
- 介面改進：側邊欄可收合、用戶詳情頁含統計與編輯、對話框體驗優化。

## 開發流程
1. 安裝依賴：`npm ci` 或 `npm install`。
2. 設定環境：建立 `.env` 並填入 `VITE_API_URL`（以及 WS/Sentry 視需求）。
3. 啟動開發：`npm run dev`（預設開啟 `http://localhost:5173`）。
4. 品質檢查：`npm run lint`／`npm run typecheck`。
5. 打包建置：`npm run build` → 產出於 `dist/`；以 `npm run preview` 預覽。

## 品質與錯誤處理
- 集中式 Axios 攔截器與刷新隊列，避免重複刷新風暴。
- 以 TanStack Router `beforeLoad` 保護路由並做導向控制。
- 使用繁體中文的提示訊息，處理逾時/權限問題的使用者溝通。

## 後續建議
- 補充 README（快速開始、部署指引，如 Nginx 設定與容器化）。
- 建立基本 E2E（Playwright/Cypress）：覆蓋登入與關鍵路由。
- 於路由模組導入 API／錯誤邊界（Error Boundary）模式。
- 若有需求接入 Sentry（`appConfig.sentryDsn`）。
- 補齊 `services/*` 的 API 規格與回應契約文件。

---
更新時間：2025-11-18
