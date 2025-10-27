-- ========================================
-- 生产环境数据库迁移脚本
-- 时间: 2025-10-22
-- 说明: 添加用户交易字段和交易流水表
-- ========================================

-- ==========================================
-- 迁移 1: 添加用户交易相关字段
-- ==========================================

-- 创建身份验证状态枚举
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED');

-- 在 User 表添加交易相关字段
ALTER TABLE "User"
  ADD COLUMN "accountBalance" DECIMAL(18,8) NOT NULL DEFAULT 10000,
  ADD COLUMN "totalProfitLoss" DECIMAL(18,8) NOT NULL DEFAULT 0,
  ADD COLUMN "totalTrades" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "winRate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- ==========================================
-- 迁移 2: 创建交易流水表
-- ==========================================

-- 创建交易方向枚举
CREATE TYPE "TradeDirection" AS ENUM ('CALL', 'PUT');

-- 创建交易状态枚举
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SETTLED', 'CANCELED');

-- 创建交易流水表
CREATE TABLE "TransactionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL,
    "expiryTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "entryPrice" DECIMAL(18,8) NOT NULL,
    "currentPrice" DECIMAL(18,8),
    "exitPrice" DECIMAL(18,8),
    "spread" DECIMAL(18,8) NOT NULL,
    "investAmount" DECIMAL(18,8) NOT NULL,
    "returnRate" DECIMAL(7,4) NOT NULL,
    "actualReturn" DECIMAL(18,8) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("id")
);

-- 创建索引
CREATE UNIQUE INDEX "TransactionLog_orderNumber_key" ON "TransactionLog"("orderNumber");
CREATE INDEX "TransactionLog_userId_status_idx" ON "TransactionLog"("userId", "status");
CREATE INDEX "TransactionLog_orderNumber_idx" ON "TransactionLog"("orderNumber");
CREATE INDEX "TransactionLog_assetType_createdAt_idx" ON "TransactionLog"("assetType", "createdAt");
CREATE INDEX "TransactionLog_entryTime_expiryTime_idx" ON "TransactionLog"("entryTime", "expiryTime");

-- 添加外键约束
ALTER TABLE "TransactionLog"
  ADD CONSTRAINT "TransactionLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ==========================================
-- 验证迁移
-- ==========================================

-- 查看 User 表结构
\d "User"

-- 查看 TransactionLog 表结构
\d "TransactionLog"

-- 查看所有枚举类型
\dT+

-- ==========================================
-- 完成
-- ==========================================
