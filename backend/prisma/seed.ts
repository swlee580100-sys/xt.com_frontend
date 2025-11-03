import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const adminPhone = process.env.SEED_ADMIN_PHONE ?? '+86-10000000000';

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      roles: ['admin', 'trader'],
      isActive: true
    },
    create: {
      email: adminEmail,
      displayName: 'Administrator',
      phoneNumber: adminPhone,
      passwordHash,
      roles: ['admin', 'trader'],
      isActive: true
    }
  });

  const testimonialCount = await prisma.testimonial.count();
  if (testimonialCount === 0) {
    await prisma.testimonial.createMany({
      data: [
        {
          name: '张伟',
          title: '资深交易员',
          rating: 5,
          content: '平台的模拟环境非常接近真实市场，让我可以放心测试策略并持续优化表现。'
        },
        {
          name: '李静',
          title: '量化研究员',
          rating: 4,
          content: '数据同步稳定、界面清晰，是团队日常打磨交易模型的重要工具。'
        },
        {
          name: '王强',
          title: '风控经理',
          rating: 5,
          content: '系统提供的复盘和实时监测功能帮助我们快速发现问题，效率大幅提升。'
        }
      ]
    });
  }

  const carouselCount = await prisma.carouselItem.count();
  if (carouselCount === 0) {
    await prisma.carouselItem.createMany({
      data: [
        {
          sortOrder: 1,
          content: '欢迎来到加密货币模拟平台，先从新手指南开始体验吧！'
        },
        {
          sortOrder: 2,
          content: '每日更新市场资讯，关注排行榜掌握顶尖交易策略。'
        },
        {
          sortOrder: 3,
          content: '开启模拟交易挑战赛，赢取专属徽章和奖励。'
        }
      ]
    });
  }

  const leaderboardCount = await prisma.leaderboardEntry.count();
  if (leaderboardCount === 0) {
    await prisma.leaderboardEntry.createMany({
      data: [
        {
          type: 'DAILY',
          avatar: 'https://example.com/avatars/user1.png',
          country: '中国',
          name: '陈睿',
          tradeCount: 48,
          winRate: 78.5,
          volume: 152345.67
        },
        {
          type: 'WEEKLY',
          avatar: 'https://example.com/avatars/user2.png',
          country: '新加坡',
          name: 'Grace Lee',
          tradeCount: 215,
          winRate: 71.2,
          volume: 982345.12
        },
        {
          type: 'MONTHLY',
          avatar: 'https://example.com/avatars/user3.png',
          country: '美国',
          name: 'Michael Chen',
          tradeCount: 845,
          winRate: 68.9,
          volume: 3156789.45
        }
      ]
    });
  }

  const performanceCount = await prisma.tradingPerformance.count();
  if (performanceCount === 0) {
    await prisma.tradingPerformance.createMany({
      data: [
        {
          tradeDuration: 5,
          winRate: 72.5
        },
        {
          tradeDuration: 15,
          winRate: 68.2
        },
        {
          tradeDuration: 60,
          winRate: 63.4
        }
      ]
    });
  }
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error('Failed to seed database', error);
    await prisma.$disconnect();
    process.exit(1);
  });
