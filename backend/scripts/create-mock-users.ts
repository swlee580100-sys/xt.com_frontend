import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Mock 用户数据
const mockUsers = [
  {
    email: 'user001@example.com',
    displayName: '张三',
    password: 'Password123',
    phoneNumber: '13800138001',
    roles: ['trader'],
    demoBalance: 50000,
    realBalance: 1000,
  },
  {
    email: 'user002@example.com',
    displayName: '李四',
    password: 'Password123',
    phoneNumber: '13800138002',
    roles: ['trader'],
    demoBalance: 30000,
    realBalance: 500,
  },
  {
    email: 'user003@example.com',
    displayName: '王五',
    password: 'Password123',
    phoneNumber: '13800138003',
    roles: ['trader', 'vip'],
    demoBalance: 100000,
    realBalance: 5000,
  },
  {
    email: 'user004@example.com',
    displayName: '赵六',
    password: 'Password123',
    phoneNumber: '13800138004',
    roles: ['trader'],
    demoBalance: 20000,
    realBalance: 0,
  },
  {
    email: 'user005@example.com',
    displayName: '钱七',
    password: 'Password123',
    phoneNumber: '13800138005',
    roles: ['trader'],
    demoBalance: 75000,
    realBalance: 2000,
  },
  {
    email: 'user006@example.com',
    displayName: '孙八',
    password: 'Password123',
    phoneNumber: '13800138006',
    roles: ['trader'],
    demoBalance: 40000,
    realBalance: 800,
  },
  {
    email: 'user007@example.com',
    displayName: '周九',
    password: 'Password123',
    phoneNumber: '13800138007',
    roles: ['trader', 'vip'],
    demoBalance: 150000,
    realBalance: 10000,
  },
  {
    email: 'user008@example.com',
    displayName: '吴十',
    password: 'Password123',
    phoneNumber: '13800138008',
    roles: ['trader'],
    demoBalance: 60000,
    realBalance: 1500,
  },
  {
    email: 'user009@example.com',
    displayName: '郑十一',
    password: 'Password123',
    phoneNumber: '13800138009',
    roles: ['trader'],
    demoBalance: 35000,
    realBalance: 600,
  },
  {
    email: 'user010@example.com',
    displayName: '王十二',
    password: 'Password123',
    phoneNumber: '13800138010',
    roles: ['trader'],
    demoBalance: 45000,
    realBalance: 1200,
  },
];

// 随机生成最后登录时间（最近30天内）
function randomLoginTime(): Date {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const randomTime = thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo);
  return new Date(randomTime);
}

// 随机生成IP地址
function randomIP(): string {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

async function createMockUsers() {
  console.log('🚀 开始创建 Mock 用户...\n');

  const saltRounds = 12;
  let successCount = 0;
  let skipCount = 0;

  for (const userData of mockUsers) {
    try {
      // 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⏭️  跳过已存在的用户: ${userData.email}`);
        skipCount++;
        continue;
      }

      // 生成密码哈希
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // 创建用户
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          displayName: userData.displayName,
          phoneNumber: userData.phoneNumber,
          passwordHash,
          roles: userData.roles,
          demoBalance: userData.demoBalance,
          realBalance: userData.realBalance,
          accountBalance: userData.demoBalance, // 兼容旧字段
          isActive: true,
          verificationStatus: Math.random() > 0.5 ? 'VERIFIED' : 'UNVERIFIED',
          lastLoginAt: Math.random() > 0.3 ? randomLoginTime() : null, // 70% 的用户有登录记录
          lastLoginIp: Math.random() > 0.3 ? randomIP() : null, // 70% 的用户有登录IP
        },
      });

      console.log(`✅ 创建用户成功: ${user.email} (${user.displayName})`);
      successCount++;
    } catch (error) {
      console.error(`❌ 创建用户失败: ${userData.email}`, error);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 统计信息:`);
  console.log(`   ✅ 成功创建: ${successCount} 个用户`);
  console.log(`   ⏭️  跳过: ${skipCount} 个用户`);
  console.log(`   📝 总计: ${mockUsers.length} 个用户`);
  console.log('='.repeat(50));
  console.log('\n💡 提示: 所有用户的密码都是: Password123');
}

createMockUsers()
  .catch((e) => {
    console.error('❌ 脚本执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
