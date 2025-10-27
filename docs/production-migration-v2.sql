-- =============================================
-- 生产环境数据库迁移脚本 V2
-- 功能: 添加用户电话号码、虚拟/真实账户余额、交易账户类型
-- 创建日期: 2025-10-26
-- =============================================

-- 1. 创建 AccountType 枚举类型
DO $$ BEGIN
  CREATE TYPE "AccountType" AS ENUM ('DEMO', 'REAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. 修改 User 表，添加新字段
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT,
ADD COLUMN IF NOT EXISTS "demoBalance" DECIMAL(18,8) NOT NULL DEFAULT 10000,
ADD COLUMN IF NOT EXISTS "realBalance" DECIMAL(18,8) NOT NULL DEFAULT 0;

-- 3. 如果已有用户，将 accountBalance 的值复制到 demoBalance
UPDATE "User"
SET "demoBalance" = "accountBalance"
WHERE "demoBalance" = 10000 AND "accountBalance" != 10000;

-- 4. 修改 TransactionLog 表，添加账户类型字段
ALTER TABLE "TransactionLog"
ADD COLUMN IF NOT EXISTS "accountType" "AccountType" NOT NULL DEFAULT 'DEMO';

-- 5. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "TransactionLog_userId_accountType_idx"
ON "TransactionLog"("userId", "accountType");

CREATE INDEX IF NOT EXISTS "User_phoneNumber_idx"
ON "User"("phoneNumber");

-- 6. 验证迁移结果
DO $$
DECLARE
  user_columns_count INTEGER;
  transaction_columns_count INTEGER;
BEGIN
  -- 检查 User 表的新字段
  SELECT COUNT(*) INTO user_columns_count
  FROM information_schema.columns
  WHERE table_name = 'User'
  AND column_name IN ('phoneNumber', 'demoBalance', 'realBalance');

  -- 检查 TransactionLog 表的新字段
  SELECT COUNT(*) INTO transaction_columns_count
  FROM information_schema.columns
  WHERE table_name = 'TransactionLog'
  AND column_name = 'accountType';

  IF user_columns_count = 3 AND transaction_columns_count = 1 THEN
    RAISE NOTICE '✓ 迁移成功完成！';
    RAISE NOTICE '  - User 表新增字段: phoneNumber, demoBalance, realBalance';
    RAISE NOTICE '  - TransactionLog 表新增字段: accountType';
    RAISE NOTICE '  - 索引已创建';
  ELSE
    RAISE WARNING '⚠ 迁移可能未完全成功，请检查表结构';
    RAISE NOTICE '  User 表新字段数: % (期望: 3)', user_columns_count;
    RAISE NOTICE '  TransactionLog 表新字段数: % (期望: 1)', transaction_columns_count;
  END IF;
END $$;

-- 7. 显示迁移后的表结构
\d "User"
\d "TransactionLog"

-- =============================================
-- 回滚脚本（如果需要）
-- =============================================
-- 注意: 仅在测试环境或确认需要回滚时执行

/*
-- 删除索引
DROP INDEX IF EXISTS "TransactionLog_userId_accountType_idx";
DROP INDEX IF EXISTS "User_phoneNumber_idx";

-- 删除 User 表的新字段
ALTER TABLE "User"
DROP COLUMN IF EXISTS "phoneNumber",
DROP COLUMN IF EXISTS "demoBalance",
DROP COLUMN IF EXISTS "realBalance";

-- 删除 TransactionLog 表的新字段
ALTER TABLE "TransactionLog"
DROP COLUMN IF EXISTS "accountType";

-- 删除 AccountType 枚举类型
DROP TYPE IF EXISTS "AccountType";
*/
