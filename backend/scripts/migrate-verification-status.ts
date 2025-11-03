import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 开始迁移验证状态...');

  // 将所有 UNVERIFIED 状态更新为 PENDING
  const result = await prisma.$executeRaw`
    UPDATE "User"
    SET "verificationStatus" = 'PENDING'
    WHERE "verificationStatus" = 'UNVERIFIED'
  `;

  console.log(`✅ 已更新 ${result} 个用户的验证状态从 UNVERIFIED 到 PENDING`);

  // 如果有 VERIFIED 的用户，保持不变（VERIFIED 在新枚举中仍然存在）
  const verifiedCount = await prisma.user.count({
    where: {
      verificationStatus: 'VERIFIED' as any,
    },
  });

  console.log(`ℹ️  有 ${verifiedCount} 个用户状态为 VERIFIED（保持不变）`);

  console.log('✅ 迁移完成！');
}

main()
  .catch((e) => {
    console.error('❌ 迁移失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
