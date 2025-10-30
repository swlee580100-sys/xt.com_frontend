import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createInitialAdmin() {
  const username = 'admin';
  const email = 'admin@crypto-sim.com';
  const password = 'Admin@123456';
  const displayName = '系统管理员';

  // 检查是否已存在
  const existing = await prisma.admin.findUnique({
    where: { username },
  });

  if (existing) {
    console.log('✓ 管理员账户已存在');
    console.log(`  用户名: ${username}`);
    console.log(`  邮箱: ${email}`);
    return;
  }

  // 创建管理员
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.create({
    data: {
      username,
      email,
      displayName,
      passwordHash,
      permissions: ['*'], // 全部权限
      isActive: true,
    },
  });

  console.log('✓ 成功创建管理员账户');
  console.log(`  用户名: ${username}`);
  console.log(`  邮箱: ${email}`);
  console.log(`  密码: ${password}`);
  console.log(`  ID: ${admin.id}`);
  console.log('\n请妥善保管管理员密码！');
}

createInitialAdmin()
  .catch((e) => {
    console.error('创建管理员失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
