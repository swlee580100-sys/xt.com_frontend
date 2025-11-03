-- 重建 VerificationStatus 枚举
-- 步骤1: 创建新的枚举类型
CREATE TYPE "VerificationStatus_new" AS ENUM ('PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED');

-- 步骤2: 更新 User 表使用新的枚举（带类型转换）
ALTER TABLE "User"
  ALTER COLUMN "verificationStatus" TYPE "VerificationStatus_new"
  USING ("verificationStatus"::text::"VerificationStatus_new");

-- 步骤3: 删除旧的枚举类型
DROP TYPE "VerificationStatus";

-- 步骤4: 重命名新的枚举类型
ALTER TYPE "VerificationStatus_new" RENAME TO "VerificationStatus";
