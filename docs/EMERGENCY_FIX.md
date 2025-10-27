# 生产环境紧急修复指南

## 问题描述
生产环境注册接口报错: `Null constraint violation on the fields: (phoneNumber)`

原因: 生产环境代码和数据库状态不匹配

## 临时修复方案(5分钟内解决)

### 选项A: 修改数据库约束(推荐,最快)

SSH 登录到生产服务器,执行:

```bash
# 连接到数据库
psql -h localhost -U postgres -d crypto_sim

# 执行以下 SQL
ALTER TABLE "User" ALTER COLUMN "phoneNumber" DROP NOT NULL;

# 退出
\q
```

这样 `phoneNumber` 就可以为 NULL,注册接口立即恢复正常。

### 选项B: 为所有用户设置默认手机号

```bash
# 连接到数据库
psql -h localhost -U postgres -d crypto_sim

# 为现有用户设置临时手机号
UPDATE "User"
SET "phoneNumber" = 'temp_' || id
WHERE "phoneNumber" IS NULL;

# 如果表中还没有 phoneNumber 列,先添加
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

# 退出
\q
```

## 长期解决方案

### 1. 更新 Prisma Schema

确保 `phoneNumber` 可选:

```prisma
model User {
  // ...
  phoneNumber  String?  @unique  // 可选且唯一
  // ...
}
```

### 2. 重新生成 Prisma Client

```bash
cd /path/to/backend
npx prisma generate
```

### 3. 重新构建并部署

```bash
# 构建 Docker 镜像
docker build -t crypto-sim-backend .

# 重启容器
docker-compose restart backend
```

## 验证修复

测试注册接口:

```bash
curl -X POST http://47.237.31.83:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test123@example.com",
    "password": "password123",
    "displayName": "测试用户"
  }'
```

应该返回成功响应(201 Created)。

## 当前代码状态

本地代码已经更新:
- ✅ `RegisterDto`: phoneNumber 改为可选
- ✅ `AuthService`: 没有 phoneNumber 时自动生成临时值
- ✅ TypeScript 编译通过

需要部署这些更新到生产环境。

## 联系信息

如果需要帮助,请提供:
1. 数据库访问权限
2. 服务器 SSH 访问权限
3. Docker 日志输出
