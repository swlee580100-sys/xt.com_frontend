# 生产环境数据库迁移指南

## 当前状态

- **本地开发环境**: 已完成数据库迁移，包含所有新字段
- **生产环境**: 需要执行迁移，添加交易相关字段

## 需要添加的内容

### User 表新增字段
- `accountBalance` - 账户余额 (默认 10000)
- `totalProfitLoss` - 总盈亏 (默认 0)
- `winRate` - 胜率 (默认 0)
- `totalTrades` - 交易次数 (默认 0)
- `verificationStatus` - 身份状态 (默认 UNVERIFIED)

### 新增 TransactionLog 表
完整的交易流水记录表

## 方法 1: 使用 Prisma CLI（推荐）

### 步骤 1: SSH 到生产服务器

```bash
ssh user@47.237.31.83
```

### 步骤 2: 进入项目目录

```bash
cd /path/to/crypto-sim-backend/backend
```

### 步骤 3: 备份数据库（重要！）

```bash
# 备份数据库
pg_dump -U postgres -h localhost crypto_sim > backup_$(date +%Y%m%d_%H%M%S).sql

# 或者如果使用不同的用户名
pg_dump -U your_db_user -h localhost crypto_sim > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 步骤 4: 执行迁移

```bash
# 设置生产环境数据库连接（如果需要）
export DATABASE_URL="postgresql://user:password@localhost:5432/crypto_sim"

# 执行生产环境迁移
npx prisma migrate deploy

# 生成 Prisma Client
npx prisma generate
```

### 步骤 5: 重启应用

```bash
# 如果使用 PM2
pm2 restart crypto-sim-backend

# 如果使用 systemd
sudo systemctl restart crypto-sim-backend

# 如果使用 Docker
docker-compose restart backend
```

### 步骤 6: 验证

```bash
# 连接数据库验证
psql -U postgres -d crypto_sim

# 查看 User 表结构
\d "User"

# 查看 TransactionLog 表结构
\d "TransactionLog"

# 查看枚举类型
\dT+
```

---

## 方法 2: 手动执行 SQL（备选方案）

如果无法使用 Prisma CLI，可以直接执行 SQL：

### 步骤 1: 连接到生产数据库

```bash
# 本地连接
psql -U postgres -d crypto_sim

# 或远程连接
psql -h 47.237.31.83 -U your_db_user -d crypto_sim
```

### 步骤 2: 执行迁移 SQL

```sql
-- 从文件执行
\i /path/to/docs/production-migration.sql

-- 或者手动复制粘贴 SQL 内容执行
```

### 步骤 3: 验证迁移

```sql
-- 查看 User 表结构
\d "User"

-- 应该看到新增的字段：
-- accountBalance, totalProfitLoss, winRate, totalTrades, verificationStatus

-- 查看 TransactionLog 表
\d "TransactionLog"

-- 查看所有用户的新字段
SELECT id, email, "accountBalance", "totalProfitLoss", "winRate", "totalTrades", "verificationStatus"
FROM "User";
```

### 步骤 4: 更新 Prisma Client（在服务器上）

```bash
cd /path/to/crypto-sim-backend/backend
npx prisma generate
```

### 步骤 5: 重启应用

---

## 方法 3: 通过 GUI 工具执行

### 使用 pgAdmin、DBeaver 或 TablePlus

1. 连接到生产数据库
   - Host: `47.237.31.83`
   - Database: `crypto_sim`
   - Port: `5432`

2. 打开 SQL 编辑器

3. 复制 `docs/production-migration.sql` 的内容

4. 执行 SQL

5. 验证表结构

---

## 迁移检查清单

### 迁移前
- [ ] 备份生产数据库
- [ ] 确认当前数据库连接信息
- [ ] 测试迁移 SQL 在开发环境的副本上运行
- [ ] 通知团队即将进行数据库迁移
- [ ] 如有必要，暂停应用服务

### 迁移中
- [ ] 执行数据库迁移
- [ ] 验证表结构正确
- [ ] 检查新字段的默认值
- [ ] 验证索引已创建
- [ ] 验证外键约束已添加

### 迁移后
- [ ] 重新生成 Prisma Client
- [ ] 重启后端应用
- [ ] 测试 API 接口正常工作
- [ ] 验证现有用户数据完整
- [ ] 测试创建新交易功能
- [ ] 检查应用日志无错误
- [ ] 更新 API 文档版本

---

## 回滚方案（如果出现问题）

### 方式 1: 使用备份恢复

```bash
# 停止应用
pm2 stop crypto-sim-backend

# 恢复数据库
psql -U postgres -d crypto_sim < backup_20251022_150000.sql

# 重启应用
pm2 start crypto-sim-backend
```

### 方式 2: 手动删除新增内容

```sql
-- 删除 TransactionLog 表
DROP TABLE IF EXISTS "TransactionLog" CASCADE;

-- 删除枚举类型
DROP TYPE IF EXISTS "TradeDirection";
DROP TYPE IF EXISTS "TransactionStatus";
DROP TYPE IF EXISTS "VerificationStatus";

-- 删除 User 表新增字段
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "accountBalance",
  DROP COLUMN IF EXISTS "totalProfitLoss",
  DROP COLUMN IF EXISTS "winRate",
  DROP COLUMN IF EXISTS "totalTrades",
  DROP COLUMN IF EXISTS "verificationStatus";
```

---

## 常见问题

### Q1: 执行迁移时提示权限不足
**解决**: 确保使用具有 CREATE/ALTER 权限的数据库用户

```sql
-- 查看当前用户权限
\du

-- 授予权限（需要超级用户）
GRANT ALL PRIVILEGES ON DATABASE crypto_sim TO your_user;
```

### Q2: 枚举类型已存在
**解决**: 如果枚举类型已存在，跳过 CREATE TYPE 语句或使用 IF NOT EXISTS

```sql
DO $$ BEGIN
    CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
```

### Q3: 现有用户没有获得新字段
**解决**: 新字段都有默认值，应该自动应用。手动验证：

```sql
SELECT id, email, "accountBalance", "verificationStatus"
FROM "User"
LIMIT 5;
```

### Q4: Prisma Client 报错类型不匹配
**解决**: 重新生成 Prisma Client

```bash
cd backend
npx prisma generate
pm2 restart crypto-sim-backend
```

---

## 验证命令

### 验证 User 表字段

```sql
SELECT
  id,
  email,
  "displayName",
  "accountBalance",
  "totalProfitLoss",
  "winRate",
  "totalTrades",
  "verificationStatus",
  "createdAt"
FROM "User"
LIMIT 5;
```

### 验证 TransactionLog 表

```sql
-- 查看表结构
\d "TransactionLog"

-- 查看记录数
SELECT COUNT(*) FROM "TransactionLog";
```

### 验证索引

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('User', 'TransactionLog')
ORDER BY tablename, indexname;
```

---

## 联系信息

如遇问题，请联系：
- 开发者: [你的联系方式]
- 数据库管理员: [DBA 联系方式]

---

最后更新: 2025-10-22
版本: v1.0
