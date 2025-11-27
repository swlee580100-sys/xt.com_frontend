# 环境配置说明

## 概述

本项目使用 Vite 的环境变量系统来管理不同环境的配置。

## 环境文件

### `.env.example`
示例配置文件，展示所有可用的环境变量。**会提交到 Git**。

### `.env.local`
本地开发环境配置。**不会提交到 Git**（已在 `.gitignore` 中配置）。

**用途**：
- 本地开发时使用
- 每个开发者可以有自己的配置

**示例**：
```bash
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

### `.env.production`
生产环境配置。**会提交到 Git**。

**用途**：
- 构建生产版本时使用 (`npm run build`)
- 使用相对路径，自动适配部署域名

**示例**：
```bash
VITE_API_URL=/api
VITE_WS_URL=
```

## 环境变量说明

| 变量名 | 说明 | 开发环境默认值 | 生产环境默认值 |
|--------|------|----------------|----------------|
| `VITE_API_URL` | API 服务器地址 | `http://localhost:3000/api` | `/api` |
| `VITE_WS_URL` | WebSocket 服务器地址 | `http://localhost:3000` | 当前域名 |
| `VITE_SENTRY_DSN` | Sentry 错误追踪 DSN | 空 | 空 |

## 使用方法

### 1. 本地开发

首次运行项目时，复制示例配置：

```bash
cp .env.example .env.local
```

然后根据你的本地环境修改 `.env.local`：

```bash
# 如果后端运行在不同端口
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080
```

### 2. 生产部署

**方式一：使用默认配置（推荐）**

生产环境会自动使用相对路径，无需修改：

```bash
npm run build
```

构建后的应用会：
- API 请求发送到 `当前域名/api`
- WebSocket 连接到 `当前域名`

**方式二：自定义生产配置**

如果需要指定不同的 API 服务器，修改 `.env.production`：

```bash
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=https://api.yourdomain.com
```

### 3. 其他环境

如果需要额外的环境（如测试、预发布），可以创建：

- `.env.staging` - 预发布环境
- `.env.test` - 测试环境

然后使用：

```bash
npm run build -- --mode staging
```

## 环境配置逻辑

配置文件 `src/config/env.ts` 会根据环境自动选择配置：

```typescript
// 开发环境
- VITE_API_URL 未设置 → http://localhost:3000/api
- VITE_WS_URL 未设置 → http://localhost:3000

// 生产环境
- VITE_API_URL 未设置 → /api（相对路径）
- VITE_WS_URL 未设置 → window.location.origin（当前域名）
```

## 常见场景

### 场景 1: 本地开发，后端在 localhost:3000
✅ 无需配置，使用默认值即可

### 场景 2: 本地开发，后端在不同端口
修改 `.env.local`:
```bash
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080
```

### 场景 3: 连接远程开发服务器
修改 `.env.local`:
```bash
VITE_API_URL=https://dev.yourdomain.com/api
VITE_WS_URL=https://dev.yourdomain.com
```

### 场景 4: 生产部署到 yourdomain.com
✅ 无需配置，会自动使用：
- API: `https://yourdomain.com/api`
- WS: `wss://yourdomain.com`

### 场景 5: 前后端分离部署
前端部署到 `app.yourdomain.com`，后端在 `api.yourdomain.com`

修改 `.env.production`:
```bash
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=https://api.yourdomain.com
```

## 验证配置

### 开发环境
```bash
npm run dev
```

打开浏览器控制台，查看网络请求：
- API 请求应该发送到配置的 `VITE_API_URL`
- WebSocket 连接应该到配置的 `VITE_WS_URL`

### 生产构建
```bash
npm run build
npm run preview
```

检查构建后的配置是否正确。

## 注意事项

1. **环境变量必须以 `VITE_` 开头**才能在客户端代码中使用
2. **修改 `.env` 文件后需要重启开发服务器**
3. **`.env.local` 不要提交到 Git**，每个开发者维护自己的配置
4. **生产环境优先使用相对路径**，便于部署到任何域名
5. **WebSocket URL 会自动处理 http/https 和 ws/wss 协议**

## 故障排查

### 问题：生产环境仍然请求 localhost

**原因**：可能使用了开发环境的构建

**解决**：
```bash
# 确保使用生产模式构建
npm run build

# 不要使用 npm run dev 进行生产部署
```

### 问题：无法连接 WebSocket

**检查**：
1. 确认 `VITE_WS_URL` 配置正确
2. 确认后端 WebSocket 服务已启动
3. 检查浏览器控制台的 WebSocket 连接日志

### 问题：API 请求 404

**检查**：
1. 确认 `VITE_API_URL` 配置正确
2. 确认后端 API 路径包含 `/api` 前缀
3. 检查浏览器网络面板的请求 URL

## 相关文件

- `src/config/env.ts` - 环境配置逻辑
- `.env.example` - 配置示例
- `.env.local` - 本地开发配置（不提交）
- `.env.production` - 生产环境配置
- `.gitignore` - Git 忽略规则

## 更多信息

- [Vite 环境变量文档](https://vitejs.dev/guide/env-and-mode.html)
