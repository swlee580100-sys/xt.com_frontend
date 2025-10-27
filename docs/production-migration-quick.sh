#!/bin/bash
# 生产环境快速迁移脚本
# 在生产服务器上执行此脚本

echo "=========================================="
echo "开始执行生产环境数据库迁移"
echo "=========================================="

# 数据库连接信息（请根据实际情况修改）
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="crypto_sim"
DB_USER="postgres"  # 或其他数据库用户

echo ""
echo "1. 创建 AccountType 枚举..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
DO $$ BEGIN
  CREATE TYPE "AccountType" AS ENUM ('DEMO', 'REAL');
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'AccountType 枚举已存在，跳过创建';
END $$;
EOF

echo ""
echo "2. 添加 User 表新字段..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT,
ADD COLUMN IF NOT EXISTS "demoBalance" DECIMAL(18,8) DEFAULT 10000,
ADD COLUMN IF NOT EXISTS "realBalance" DECIMAL(18,8) DEFAULT 0;
EOF

echo ""
echo "3. 复制现有余额到虚拟账户..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
UPDATE "User"
SET "demoBalance" = COALESCE("accountBalance", 10000)
WHERE "demoBalance" IS NULL OR "demoBalance" = 10000;
EOF

echo ""
echo "4. 为现有用户设置临时手机号..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
UPDATE "User"
SET "phoneNumber" = 'temp_' || id
WHERE "phoneNumber" IS NULL;
EOF

echo ""
echo "5. 设置 phoneNumber 为必填..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
ALTER TABLE "User"
ALTER COLUMN "phoneNumber" SET NOT NULL,
ALTER COLUMN "demoBalance" SET NOT NULL,
ALTER COLUMN "demoBalance" SET DEFAULT 10000,
ALTER COLUMN "realBalance" SET NOT NULL,
ALTER COLUMN "realBalance" SET DEFAULT 0;
EOF

echo ""
echo "6. 删除旧索引并创建唯一索引..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
DROP INDEX IF EXISTS "User_phoneNumber_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneNumber_key" ON "User"("phoneNumber");
EOF

echo ""
echo "7. 添加 TransactionLog 表字段..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
ALTER TABLE "TransactionLog"
ADD COLUMN IF NOT EXISTS "accountType" "AccountType" DEFAULT 'DEMO';

ALTER TABLE "TransactionLog"
ALTER COLUMN "accountType" SET NOT NULL,
ALTER COLUMN "accountType" SET DEFAULT 'DEMO';
EOF

echo ""
echo "8. 创建索引..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
CREATE INDEX IF NOT EXISTS "TransactionLog_userId_accountType_idx"
ON "TransactionLog"("userId", "accountType");
EOF

echo ""
echo "9. 验证迁移结果..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'phoneNumber' AND is_nullable = 'NO') as phone_required,
  EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'User' AND indexname = 'User_phoneNumber_key') as phone_unique,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'demoBalance') as demo_balance_exists,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'realBalance') as real_balance_exists,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'TransactionLog' AND column_name = 'accountType') as account_type_exists;

SELECT COUNT(*) as user_count FROM "User";
EOF

echo ""
echo "=========================================="
echo "迁移完成！"
echo "=========================================="
echo ""
echo "⚠️  重要提示："
echo "1. 现有用户的 phoneNumber 已设置为临时值 (temp_uuid)"
echo "2. 需要提示用户在下次登录时更新真实手机号"
echo "3. 新注册用户必须提供手机号"
echo ""
