-- 步骤1: 添加新的枚举值
ALTER TYPE "VerificationStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "VerificationStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "VerificationStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- 步骤2: 更新现有数据（将 UNVERIFIED 改为 PENDING）
UPDATE "User"
SET "verificationStatus" = 'PENDING'
WHERE "verificationStatus" = 'UNVERIFIED';

-- 步骤3: 删除旧的枚举值（需要先确保没有数据使用它）
-- 注意: PostgreSQL 不支持直接删除枚举值，需要重建枚举
-- 这个操作比较复杂，我们先保留 UNVERIFIED，稍后通过 Prisma migrate 处理
