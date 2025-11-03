import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 开始更新交易记录的用户名...\n');

  // 获取所有没有用户名的交易记录
  const transactions = await prisma.transactionLog.findMany({
    where: {
      OR: [
        { userName: null },
        { userName: '' },
      ],
    },
    include: {
      user: {
        select: {
          displayName: true,
        },
      },
    },
  });

  console.log(`📝 找到 ${transactions.length} 条需要更新的交易记录\n`);

  let updated = 0;
  let failed = 0;

  // 批量更新
  for (const transaction of transactions) {
    try {
      await prisma.transactionLog.update({
        where: { id: transaction.id },
        data: { userName: transaction.user.displayName },
      });
      updated++;

      if (updated % 50 === 0) {
        console.log(`   已更新 ${updated} 条...`);
      }
    } catch (error) {
      console.error(`❌ 更新交易 ${transaction.id} 失败:`, error);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 更新完成:');
  console.log(`   ✅ 成功更新: ${updated} 条`);
  if (failed > 0) {
    console.log(`   ❌ 失败: ${failed} 条`);
  }
  console.log('='.repeat(60));

  // 验证更新结果
  const remainingNull = await prisma.transactionLog.count({
    where: {
      OR: [
        { userName: null },
        { userName: '' },
      ],
    },
  });

  if (remainingNull > 0) {
    console.log(`\n⚠️  仍有 ${remainingNull} 条记录的用户名为空`);
  } else {
    console.log('\n✅ 所有交易记录都已填充用户名！');
  }
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
