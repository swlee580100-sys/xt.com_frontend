# Crypto Sim Backend API 文档

## 基础信息

- **Base URL (本地)**: `http://localhost:3000/api`
- **Base URL (生产)**: `http://47.237.31.83:3000/api`
- **环境**: Development
- **版本**: 1.0.0

## 开发模式配置

当前系统配置为开发模式，已放宽以下安全限制以方便测试：

- **JWT 验证**: 已放宽 (`AUTH_SKIP_JWT_VERIFICATION=true`)
  - 支持不带 token 访问（自动使用默认用户）
  - 支持通过 query 参数 `?userId=xxx` 指定用户
  - 仍然支持标准的 Bearer token 方式（**推荐**）
- **Redis**: 已禁用 (`REDIS_ENABLED=false`)

### 认证方式说明

#### 生产环境（推荐方式）
所有需要认证的接口都需要在 HTTP Header 中携带 JWT token：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 开发环境（三种方式）

**方式 1：标准 Bearer Token（推荐，与生产环境一致）**
```javascript
fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
})
```

**方式 2：不带 Token（快速测试）**
```javascript
// 自动使用默认用户 (test@example.com)
fetch('http://localhost:3000/api/auth/me')
```

**方式 3：指定用户 ID**
```javascript
// 用于测试不同用户的数据
fetch('http://localhost:3000/api/auth/me?userId=854135be-c8d9-4dc4-b18a-39ddbde4e8fd')
```

⚠️ **重要**：虽然开发模式支持方式 2 和 3，但前端开发时建议使用**方式 1**，保持与生产环境一致。

## 目录

1. [认证接口](#认证接口)
2. [交易流水接口](#交易流水接口)
3. [前端集成示例](#前端集成示例)

---

## 认证接口

### 1. 用户注册

**POST** `/api/auth/register`

注册新用户账户。

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "用户名",
  "phoneNumber": "+86-13800138000",  // 必填且唯一
  "roles": ["trader"]  // 可选，默认为 ["trader"]
}
```

**响应** (201 Created):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "用户名",
    "phoneNumber": "+86-13800138000",
    "roles": ["trader"],
    "accountBalance": 10000.00000000,  // 旧字段，保留兼容性
    "demoBalance": 10000.00000000,     // 虚拟交易账户余额
    "realBalance": 0.00000000,         // 真实交易账户余额
    "totalProfitLoss": 0.00000000,
    "winRate": 0.00,
    "totalTrades": 0,
    "verificationStatus": "UNVERIFIED",
    "isActive": true,
    "createdAt": "2025-10-22T00:00:00.000Z"
  },
  "accessToken": "eyJhbGc...JWT_TOKEN",
  "refreshToken": "eyJhbGc...REFRESH_TOKEN"
}
```

### 2. 用户登录

**POST** `/api/auth/login`

使用邮箱和密码登录。

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "用户名",
    "phoneNumber": "+86-13800138000",
    "roles": ["trader"],
    "accountBalance": 9900.00000000,   // 旧字段，保留兼容性
    "demoBalance": 9900.00000000,      // 虚拟交易账户余额
    "realBalance": 5000.00000000,      // 真实交易账户余额
    "totalProfitLoss": -100.00000000,
    "winRate": 45.50,
    "totalTrades": 10,
    "verificationStatus": "VERIFIED"
  },
  "accessToken": "eyJhbGc...JWT_TOKEN",
  "refreshToken": "eyJhbGc...REFRESH_TOKEN"
}
```

### 3. 刷新令牌

**POST** `/api/auth/refresh`

使用刷新令牌获取新的访问令牌。

**请求体**:
```json
{
  "refreshToken": "eyJhbGc...REFRESH_TOKEN"
}
```

**响应** (200 OK):
```json
{
  "accessToken": "eyJhbGc...NEW_JWT_TOKEN",
  "refreshToken": "eyJhbGc...NEW_REFRESH_TOKEN"
}
```

### 4. 获取当前用户信息

**GET** `/api/auth/me`

获取当前登录用户的详细信息。

**Headers**:
```
Authorization: Bearer {accessToken}
```

**响应** (200 OK):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "用户名",
  "phoneNumber": "+86-13800138000",
  "roles": ["trader"],
  "accountBalance": 9900.00000000,   // 旧字段，保留兼容性
  "demoBalance": 9900.00000000,      // 虚拟交易账户余额
  "realBalance": 5000.00000000,      // 真实交易账户余额
  "totalProfitLoss": -100.00000000,
  "winRate": 45.50,
  "totalTrades": 10,
  "verificationStatus": "VERIFIED",
  "isActive": true,
  "lastLoginAt": "2025-10-22T00:00:00.000Z",
  "createdAt": "2025-10-22T00:00:00.000Z",
  "updatedAt": "2025-10-22T00:00:00.000Z"
}
```

### 5. 登出

**POST** `/api/auth/logout`

登出当前用户，撤销刷新令牌。

**Headers**:
```
Authorization: Bearer {accessToken}
```

**响应** (200 OK):
```json
{
  "success": true
}
```

---

## 交易流水接口

### 1. 统一交易接口（创建交易或结算交易）

**POST** `/api/transactions`

这是一个统一的交易接口，通过 `type` 字段区分是创建新交易（入场）还是结算交易（出场）。

**Headers**:
```
Authorization: Bearer {accessToken}
```

#### 1.1 创建新交易（入场）

当 `type` 为 `entryPrice` 时，创建新的交易订单（买涨/买跌）。

**请求体**:
```json
{
  "type": "entryPrice",         // 交易类型：entryPrice=入场
  "price": 65000,               // 入场价格
  "assetType": "BTC",           // 资产类型: BTC, ETH, ADA, SOL等
  "direction": "CALL",          // CALL=买涨, PUT=买跌
  "duration": 60,               // 时长（秒），如60秒
  "investAmount": 100,          // 投入金额
  "returnRate": 0.85,           // 报酬率，0.85表示85%
  "accountType": "DEMO"         // 可选，账户类型: DEMO=虚拟账户, REAL=真实账户，默认DEMO
}
```

**响应** (201 Created):
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "orderNumber": "TXN1729581234567ABC123",  // 自动生成的订单号
  "accountType": "DEMO",                     // 账户类型
  "assetType": "BTC",
  "direction": "CALL",
  "entryTime": "2025-10-22T09:00:00.000Z",   // 入场时间
  "expiryTime": "2025-10-22T09:01:00.000Z",  // 到期时间
  "duration": 60,
  "entryPrice": 65000.00000000,              // 入场价
  "currentPrice": 65000.00000000,            // 当前价
  "exitPrice": null,                         // 出场价（未结算时为null）
  "spread": 6.50000000,                      // 点差
  "investAmount": 100.00000000,              // 投入金额
  "returnRate": 0.8500,                      // 报酬率
  "actualReturn": 0.00000000,                // 实得（未结算时为0）
  "status": "PENDING",                       // PENDING=进行中
  "createdAt": "2025-10-22T09:00:00.000Z",
  "updatedAt": "2025-10-22T09:00:00.000Z",
  "settledAt": null
}
```

#### 1.2 结算交易（出场）

当 `type` 为 `exitPrice` 时，根据订单号结算指定的交易。

**请求体**:
```json
{
  "type": "exitPrice",                       // 交易类型：exitPrice=出场
  "price": 65100,                            // 出场价格
  "orderNumber": "TXN1729581234567ABC123"    // 要结算的订单号
}
```

**响应** (200 OK):
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "orderNumber": "TXN1729581234567ABC123",
  "accountType": "DEMO",
  "assetType": "BTC",
  "direction": "CALL",
  "entryTime": "2025-10-22T09:00:00.000Z",
  "expiryTime": "2025-10-22T09:01:00.000Z",
  "duration": 60,
  "entryPrice": 65000.00000000,
  "currentPrice": 65100.00000000,
  "exitPrice": 65100.00000000,         // 结算时的价格
  "spread": 6.50000000,
  "investAmount": 100.00000000,
  "returnRate": 0.8500,
  "actualReturn": 185.00000000,        // 盈利
  "status": "SETTLED",
  "createdAt": "2025-10-22T09:00:00.000Z",
  "updatedAt": "2025-10-22T09:01:05.000Z",
  "settledAt": "2025-10-22T09:01:05.000Z"
}
```

**盈亏计算规则**:
- **买涨(CALL)盈利**: 出场价 > 入场价 → 返还本金 + 收益 (investAmount * (1 + returnRate))
- **买涨(CALL)亏损**: 出场价 ≤ 入场价 → 损失本金 (actualReturn = -investAmount)
- **买跌(PUT)盈利**: 出场价 < 入场价 → 返还本金 + 收益
- **买跌(PUT)亏损**: 出场价 ≥ 入场价 → 损失本金

**错误响应**:
```json
// 余额不足（入场时）
{
  "statusCode": 400,
  "message": "虚拟账户余额不足。当前余额: 50, 需要: 100",
  "error": "Bad Request"
}

// 订单不存在（出场时）
{
  "statusCode": 404,
  "message": "订单 TXN1729581234567ABC123 不存在",
  "error": "Not Found"
}

// 订单已结算（出场时）
{
  "statusCode": 400,
  "message": "订单 TXN1729581234567ABC123 已经结算或取消",
  "error": "Bad Request"
}

// 用户不存在
{
  "statusCode": 404,
  "message": "用户不存在",
  "error": "Not Found"
}
```

### 2. 获取交易列表

**GET** `/api/transactions`

获取当前用户的交易记录列表，支持分页和筛选。

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Query Parameters**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20
- `assetType` (可选): 资产类型筛选，如 BTC
- `direction` (可选): 交易方向筛选，CALL 或 PUT
- `status` (可选): 状态筛选，PENDING/SETTLED/CANCELED
- `accountType` (可选): 账户类型筛选，DEMO 或 REAL

**示例请求**:
```
GET /api/transactions?page=1&limit=10&assetType=BTC&status=SETTLED&accountType=DEMO
```

**响应** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "user-uuid",
      "orderNumber": "TXN1729581234567ABC123",
      "accountType": "DEMO",
      "assetType": "BTC",
      "direction": "CALL",
      "entryTime": "2025-10-22T09:00:00.000Z",
      "expiryTime": "2025-10-22T09:01:00.000Z",
      "duration": 60,
      "entryPrice": 65000.00000000,
      "currentPrice": 65100.00000000,
      "exitPrice": 65100.00000000,
      "spread": 6.50000000,
      "investAmount": 100.00000000,
      "returnRate": 0.8500,
      "actualReturn": 185.00000000,      // 盈利: 本金100 + 收益85
      "status": "SETTLED",
      "createdAt": "2025-10-22T09:00:00.000Z",
      "updatedAt": "2025-10-22T09:01:05.000Z",
      "settledAt": "2025-10-22T09:01:05.000Z"
    }
  ],
  "total": 25,       // 总记录数
  "page": 1,         // 当前页
  "limit": 10        // 每页数量
}
```

### 3. 获取交易详情

**GET** `/api/transactions/:orderNumber`

根据订单号获取交易的详细信息。

**Headers**:
```
Authorization: Bearer {accessToken}
```

**示例请求**:
```
GET /api/transactions/TXN1729581234567ABC123
```

**响应** (200 OK):
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "orderNumber": "TXN1729581234567ABC123",
  "assetType": "BTC",
  "direction": "CALL",
  "entryTime": "2025-10-22T09:00:00.000Z",
  "expiryTime": "2025-10-22T09:01:00.000Z",
  "duration": 60,
  "entryPrice": 65000.00000000,
  "currentPrice": 65050.00000000,
  "exitPrice": null,
  "spread": 6.50000000,
  "investAmount": 100.00000000,
  "returnRate": 0.8500,
  "actualReturn": 0.00000000,
  "status": "PENDING",
  "createdAt": "2025-10-22T09:00:00.000Z",
  "updatedAt": "2025-10-22T09:00:30.000Z",
  "settledAt": null
}
```

**错误响应**:
```json
{
  "statusCode": 404,
  "message": "订单 TXN1729581234567ABC123 不存在",
  "error": "Not Found"
}
```

### 4. 取消交易

**POST** `/api/transactions/:orderNumber/cancel`

取消进行中的交易，退还本金（只能取消未结算的交易）。

**Headers**:
```
Authorization: Bearer {accessToken}
```

**示例请求**:
```
POST /api/transactions/TXN1729581234567ABC123/cancel
```

**响应** (200 OK):
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "orderNumber": "TXN1729581234567ABC123",
  "assetType": "BTC",
  "direction": "CALL",
  "entryTime": "2025-10-22T09:00:00.000Z",
  "expiryTime": "2025-10-22T09:01:00.000Z",
  "duration": 60,
  "entryPrice": 65000.00000000,
  "currentPrice": 65000.00000000,
  "exitPrice": null,
  "spread": 6.50000000,
  "investAmount": 100.00000000,
  "returnRate": 0.8500,
  "actualReturn": 0.00000000,        // 取消不计算盈亏
  "status": "CANCELED",
  "createdAt": "2025-10-22T09:00:00.000Z",
  "updatedAt": "2025-10-22T09:00:30.000Z",
  "settledAt": null
}
```

**错误响应**:
```json
{
  "statusCode": 400,
  "message": "订单 TXN1729581234567ABC123 不能取消",
  "error": "Bad Request"
}
```

### 6. 获取用户统计数据

**GET** `/api/transactions/statistics`

获取当前用户的交易统计数据。

**重要说明**：此接口返回的统计数据（totalProfitLoss、winRate、totalTrades等）**仅统计真实账户（REAL）的交易**，不包括虚拟账户（DEMO）的交易数据。

**Headers**:
```
Authorization: Bearer {accessToken}
```

**响应** (200 OK):
```json
{
  "accountBalance": 10500.00,        // 当前账户余额 (旧字段，保留兼容性)
  "demoBalance": 10500.00,           // 虚拟账户余额
  "realBalance": 5000.00,            // 真实账户余额
  "totalProfitLoss": 500.00,         // 总盈亏（仅真实账户）
  "winRate": 65.50,                  // 胜率 (%)（仅真实账户）
  "totalTrades": 20,                 // 总交易次数（仅真实账户）
  "settledTrades": 18,               // 已结算交易次数（仅真实账户）
  "winningTrades": 12,               // 盈利交易次数（仅真实账户）
  "losingTrades": 6                  // 亏损交易次数（仅真实账户）
}
```

### 7. 自动结算过期交易

**POST** `/api/transactions/auto-settle`

触发自动结算所有过期的交易（管理员或定时任务使用，已设置为 Public）。

**响应** (200 OK):
```json
15  // 返回结算成功的交易数量
```

---

## 数据模型

### User (用户)

```typescript
{
  id: string;                      // UUID
  email: string;                   // 邮箱（唯一）
  displayName: string;             // 显示名称
  phoneNumber: string;             // 电话号码（必填且唯一）
  passwordHash: string;            // 密码哈希
  refreshTokenHash?: string;       // 刷新令牌哈希
  roles: string[];                 // 角色数组 ["trader", "admin"]
  isActive: boolean;               // 是否激活
  lastLoginAt?: Date;              // 最后登录时间

  // 交易相关字段
  accountBalance: number;          // 账户余额（旧字段，保留兼容性）
  demoBalance: number;             // 虚拟交易账户余额，默认 10000
  realBalance: number;             // 真实交易账户余额，默认 0
  totalProfitLoss: number;         // 总盈亏（仅统计真实账户）
  winRate: number;                 // 胜率 (0-100)（仅统计真实账户）
  totalTrades: number;             // 交易次数（仅统计真实账户）
  verificationStatus: string;      // 身份状态: UNVERIFIED | VERIFIED

  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
}
```

### TransactionLog (交易流水)

```typescript
{
  id: string;                      // UUID
  userId: string;                  // 用户 ID
  orderNumber: string;             // 订单号（唯一）
  accountType: AccountType;        // 账户类型: DEMO=虚拟, REAL=真实

  // 交易资产和方向
  assetType: string;               // 资产类型: BTC, ETH, ADA, SOL等
  direction: TradeDirection;       // CALL=买涨, PUT=买跌

  // 时间相关
  entryTime: Date;                 // 入场时间
  expiryTime: Date;                // 到期时间
  duration: number;                // 时长（秒）

  // 价格相关
  entryPrice: number;              // 入场价
  currentPrice?: number;           // 当前价格
  exitPrice?: number;              // 出场价格
  spread: number;                  // 点差

  // 金额相关
  investAmount: number;            // 投入金额
  returnRate: number;              // 报酬率 (0.85 = 85%)
  actualReturn: number;            // 实得（可正可负）

  // 状态
  status: TransactionStatus;       // PENDING | SETTLED | CANCELED

  // 时间戳
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
  settledAt?: Date;                // 结算时间
}
```

### 枚举类型

```typescript
enum TradeDirection {
  CALL = "CALL",  // 买涨
  PUT = "PUT"     // 买跌
}

enum TransactionStatus {
  PENDING = "PENDING",      // 进行中
  SETTLED = "SETTLED",      // 已结算
  CANCELED = "CANCELED"     // 已取消
}

enum VerificationStatus {
  UNVERIFIED = "UNVERIFIED",  // 未验证
  VERIFIED = "VERIFIED"       // 已验证
}

enum AccountType {
  DEMO = "DEMO",  // 虚拟交易账户
  REAL = "REAL"   // 真实交易账户
}
```

---

## 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "statusCode": 400,
  "timestamp": "2025-10-22T09:00:00.000Z",
  "path": "/api/transactions",
  "message": "错误描述信息",
  "error": "Bad Request"
}
```

常见状态码：
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未认证或令牌无效
- `403 Forbidden`: 权限不足
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器内部错误

---

## 测试用例

### 完整交易流程示例

```bash
# 1. 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trader@example.com",
    "password": "password123",
    "displayName": "测试交易员"
  }'

# 2. 登录获取令牌
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trader@example.com",
    "password": "password123"
  }'

# 3. 创建交易（入场：买涨 BTC，60秒，投入100）
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "type": "entryPrice",
    "price": 65000,
    "assetType": "BTC",
    "direction": "CALL",
    "duration": 60,
    "investAmount": 100,
    "returnRate": 0.85,
    "accountType": "DEMO"
  }'

# 4. 查看交易列表
curl -X GET "http://localhost:3000/api/transactions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 5. 查看统计数据
curl -X GET http://localhost:3000/api/transactions/statistics \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 6. 结算交易（出场）
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "type": "exitPrice",
    "price": 65100,
    "orderNumber": "TXN1729581234567ABC123"
  }'

# 7. 再次查看统计数据（观察余额、盈亏、胜率变化）
curl -X GET http://localhost:3000/api/transactions/statistics \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 前端集成示例

### 1. API 封装（推荐）

创建一个统一的 API 客户端，自动处理 token：

```javascript
// api/client.js
const API_BASE_URL = 'http://47.237.31.83:3000/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // 获取 token
  getToken() {
    return localStorage.getItem('accessToken');
  }

  // 设置 token
  setToken(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  // 清除 token
  clearToken() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // 统一的请求方法
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 如果有 token，添加到 header
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // GET 请求
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // POST 请求
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // PUT 请求
  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // DELETE 请求
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
```

### 2. 认证相关 API

```javascript
// api/auth.js
import { apiClient } from './client';

export const authApi = {
  // 注册
  async register(email, password, displayName) {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      displayName,
    });

    // 自动保存 token
    apiClient.setToken(response.accessToken, response.refreshToken);
    return response;
  },

  // 登录
  async login(email, password) {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });

    // 保存 token
    apiClient.setToken(response.accessToken, response.refreshToken);
    return response;
  },

  // 获取当前用户信息
  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // 登出
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // 无论成功失败都清除本地 token
      apiClient.clearToken();
    }
  },

  // 刷新 token
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await apiClient.post('/auth/refresh', {
      refreshToken,
    });

    apiClient.setToken(response.accessToken, response.refreshToken);
    return response;
  },
};
```

### 3. 交易相关 API

```javascript
// api/transactions.js
import { apiClient } from './client';

export const transactionApi = {
  // 创建交易（入场）
  async createEntry(data) {
    const response = await apiClient.post('/transactions', {
      type: 'entryPrice',
      price: data.entryPrice,
      assetType: data.assetType,
      direction: data.direction,
      duration: data.duration,
      investAmount: data.investAmount,
      returnRate: data.returnRate,
      accountType: data.accountType,
    });
    return response.data;
  },

  // 结算交易（出场）
  async settleExit(orderNumber, exitPrice) {
    const response = await apiClient.post('/transactions', {
      type: 'exitPrice',
      price: exitPrice,
      orderNumber: orderNumber,
    });
    return response.data;
  },

  // 获取交易列表
  async list(params = {}) {
    const response = await apiClient.get('/transactions', params);
    return response.data;
  },

  // 获取交易详情
  async getByOrderNumber(orderNumber) {
    const response = await apiClient.get(`/transactions/${orderNumber}`);
    return response.data;
  },

  // 获取统计数据
  async getStatistics() {
    const response = await apiClient.get('/transactions/statistics');
    return response.data;
  },

  // 取消交易
  async cancel(orderNumber) {
    const response = await apiClient.post(`/transactions/${orderNumber}/cancel`);
    return response.data;
  },
};
```

### 4. 使用示例

#### React 示例

```jsx
import { useState, useEffect } from 'react';
import { authApi, transactionApi } from './api';

function App() {
  const [user, setUser] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // 登录
  const handleLogin = async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      setUser(response.user);
      console.log('登录成功:', response.user);
    } catch (error) {
      console.error('登录失败:', error.message);
    }
  };

  // 获取用户信息
  const fetchUserInfo = async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (error) {
      console.error('获取用户信息失败:', error.message);
    }
  };

  // 获取统计数据
  const fetchStatistics = async () => {
    try {
      const stats = await transactionApi.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('获取统计数据失败:', error.message);
    }
  };

  // 创建交易（入场）
  const handleCreateTransaction = async (currentPrice) => {
    try {
      const transaction = await transactionApi.createEntry({
        entryPrice: currentPrice,  // 前端传入当前价格
        assetType: 'BTC',
        direction: 'CALL',
        duration: 60,
        investAmount: 100,
        returnRate: 0.85,
        accountType: 'DEMO',
      });

      console.log('交易创建成功:', transaction);

      // 刷新交易列表和统计数据
      await fetchTransactions();
      await fetchStatistics();
    } catch (error) {
      console.error('创建交易失败:', error.message);
    }
  };

  // 结算交易（出场）
  const handleSettleTransaction = async (orderNumber, currentPrice) => {
    try {
      const result = await transactionApi.settleExit(orderNumber, currentPrice);
      console.log('交易结算成功:', result);

      // 刷新交易列表和统计数据
      await fetchTransactions();
      await fetchStatistics();
    } catch (error) {
      console.error('结算交易失败:', error.message);
    }
  };

  // 获取交易列表
  const fetchTransactions = async () => {
    try {
      const result = await transactionApi.list({ page: 1, limit: 10 });
      setTransactions(result.data);
    } catch (error) {
      console.error('获取交易列表失败:', error.message);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchUserInfo();
    fetchStatistics();
    fetchTransactions();
  }, []);

  return (
    <div>
      <h1>加密货币模拟交易</h1>

      {user && (
        <div>
          <h2>用户信息</h2>
          <p>邮箱: {user.email}</p>
          <p>显示名: {user.displayName}</p>
        </div>
      )}

      {statistics && (
        <div>
          <h2>统计数据</h2>
          <p>账户余额: {statistics.accountBalance}</p>
          <p>总盈亏: {statistics.totalProfitLoss}</p>
          <p>胜率: {statistics.winRate}%</p>
          <p>交易次数: {statistics.totalTrades}</p>
        </div>
      )}

      <button onClick={handleCreateTransaction}>
        创建买涨交易
      </button>

      <div>
        <h2>交易列表</h2>
        {transactions.map(tx => (
          <div key={tx.id}>
            <p>订单号: {tx.orderNumber}</p>
            <p>资产: {tx.assetType} | 方向: {tx.direction}</p>
            <p>投入: {tx.investAmount} | 状态: {tx.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
```

#### Vue 示例

```vue
<template>
  <div>
    <h1>加密货币模拟交易</h1>

    <div v-if="user">
      <h2>用户信息</h2>
      <p>邮箱: {{ user.email }}</p>
      <p>显示名: {{ user.displayName }}</p>
    </div>

    <div v-if="statistics">
      <h2>统计数据</h2>
      <p>账户余额: {{ statistics.accountBalance }}</p>
      <p>总盈亏: {{ statistics.totalProfitLoss }}</p>
      <p>胜率: {{ statistics.winRate }}%</p>
      <p>交易次数: {{ statistics.totalTrades }}</p>
    </div>

    <button @click="createTransaction">创建买涨交易</button>

    <div>
      <h2>交易列表</h2>
      <div v-for="tx in transactions" :key="tx.id">
        <p>订单号: {{ tx.orderNumber }}</p>
        <p>资产: {{ tx.assetType }} | 方向: {{ tx.direction }}</p>
        <p>投入: {{ tx.investAmount }} | 状态: {{ tx.status }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { authApi, transactionApi } from './api';

export default {
  setup() {
    const user = ref(null);
    const statistics = ref(null);
    const transactions = ref([]);

    const fetchUserInfo = async () => {
      try {
        user.value = await authApi.getMe();
      } catch (error) {
        console.error('获取用户信息失败:', error.message);
      }
    };

    const fetchStatistics = async () => {
      try {
        statistics.value = await transactionApi.getStatistics();
      } catch (error) {
        console.error('获取统计数据失败:', error.message);
      }
    };

    const fetchTransactions = async () => {
      try {
        const result = await transactionApi.list({ page: 1, limit: 10 });
        transactions.value = result.data;
      } catch (error) {
        console.error('获取交易列表失败:', error.message);
      }
    };

    const createTransaction = async () => {
      try {
        await transactionApi.create({
          assetType: 'BTC',
          direction: 'CALL',
          duration: 60,
          investAmount: 100,
          returnRate: 0.85,
        });

        await fetchTransactions();
        await fetchStatistics();
      } catch (error) {
        console.error('创建交易失败:', error.message);
      }
    };

    onMounted(() => {
      fetchUserInfo();
      fetchStatistics();
      fetchTransactions();
    });

    return {
      user,
      statistics,
      transactions,
      createTransaction,
    };
  },
};
</script>
```

### 5. 错误处理和 Token 刷新

```javascript
// api/client.js (增强版)
class ApiClient {
  // ... 其他方法

  async request(endpoint, options = {}) {
    try {
      const token = this.getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Token 过期，尝试刷新
      if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
        const newToken = await this.refreshToken();
        if (newToken) {
          // 使用新 token 重试
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
          });
          return await retryResponse.json();
        } else {
          // 刷新失败，跳转到登录页
          this.clearToken();
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      }

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return null;

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      this.setToken(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  }
}
```

---

## 注意事项

1. **开发模式**: 当前 `AUTH_SKIP_JWT_VERIFICATION=true`，JWT 验证被跳过，生产环境必须设置为 `false`

2. **价格数据**: 当前使用模拟价格，需要集成真实的市场数据源（如 Binance API）

3. **自动结算**: 需要配置定时任务（Cron Job）来自动调用 `/api/transactions/auto-settle` 结算过期交易

4. **数据库**: 使用 PostgreSQL + Prisma ORM，支持可视化管理工具 Prisma Studio (http://localhost:5555)

5. **并发处理**: 交易创建和结算操作需要考虑并发情况，建议添加数据库事务处理

6. **风控**: 建议添加：
   - 单笔交易金额限制
   - 每日交易次数限制
   - 最小持仓时间限制
   - 最大持仓金额限制

---

## 技术栈

- **框架**: NestJS
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **认证**: JWT + Passport
- **验证**: class-validator
- **WebSocket**: Socket.io (实时价格推送)
- **缓存**: Redis (可选)
- **队列**: BullMQ (可选)

---

## 后续开发建议

1. **实时价格推送**: 通过 WebSocket 推送实时价格和交易状态更新
2. **市场数据集成**: 集成 Binance/CoinGecko API 获取真实市场数据
3. **定时任务**: 实现自动结算过期交易的 Cron Job
4. **风控系统**: 添加交易限额、频率限制等风控规则
5. **通知系统**: 交易结算后发送邮件/短信通知
6. **管理后台**: 添加管理员接口，监控系统运行状态
7. **数据分析**: 添加用户行为分析、盈亏分析等报表功能
8. **安全加固**: 启用 JWT 验证、添加请求签名、IP 白名单等

---

生成时间: 2025-10-22
版本: v1.1.0
最后更新: 添加开发模式说明和前端集成示例
