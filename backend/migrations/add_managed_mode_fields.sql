-- 添加托管模式相关字段
-- 在 User 表中添加 isManagedModeEnabled 字段
ALTER TABLE "User" 
ADD COLUMN "isManagedModeEnabled" BOOLEAN NOT NULL DEFAULT false;

-- 在 TransactionLog 表中添加 isManaged 字段
ALTER TABLE "TransactionLog" 
ADD COLUMN "isManaged" BOOLEAN NOT NULL DEFAULT false;

-- 添加注释
COMMENT ON COLUMN "User"."isManagedModeEnabled" IS '是否启用托管模式';
COMMENT ON COLUMN "TransactionLog"."isManaged" IS '是否在托管状态下产生的交易';

