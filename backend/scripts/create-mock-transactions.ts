import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// 常用的加密货币交易对
const ASSET_TYPES = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'ADAUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'DOTUSDT',
  'MATICUSDT',
  'LINKUSDT',
];

// 交易方向
const DIRECTIONS = ['CALL', 'PUT'];

// 交易状态
const STATUSES = ['PENDING', 'SETTLED', 'CANCELED'];

// 账户类型
const ACCOUNT_TYPES = ['DEMO', 'REAL'];

// 交易持续时间（秒）
const DURATIONS = [60, 180, 300, 600, 900, 1800, 3600]; // 1分钟到1小时

/**
 * 生成随机数
 */
function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 随机选择数组中的一个元素
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 生成随机价格（基于资产类型）
 */
function generatePrice(assetType: string): number {
  const priceRanges: Record<string, [number, number]> = {
    BTCUSDT: [30000, 70000],
    ETHUSDT: [1500, 4000],
    BNBUSDT: [200, 600],
    SOLUSDT: [20, 200],
    ADAUSDT: [0.3, 1.5],
    XRPUSDT: [0.4, 1.2],
    DOGEUSDT: [0.05, 0.3],
    DOTUSDT: [4, 30],
    MATICUSDT: [0.5, 2.5],
    LINKUSDT: [5, 30],
  };

  const [min, max] = priceRanges[assetType] || [1, 100];
  return random(min, max);
}

/**
 * 生成订单号
 */
function generateOrderNumber(): string {
  const timestamp = Date.now();
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TXN${timestamp}${randomPart}`;
}

/**
 * 生成随机日期（过去30天内）
 */
function randomDate(daysAgo: number = 30): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const timestamp = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(timestamp);
}

/**
 * 生成单条交易记录
 */
function generateTransaction(userId: string, userName: string, index: number): any {
  const assetType = randomChoice(ASSET_TYPES);
  const direction = randomChoice(DIRECTIONS);
  const status = randomChoice(STATUSES);
  const accountType = randomChoice(ACCOUNT_TYPES);
  const duration = randomChoice(DURATIONS);

  // 生成时间
  const entryTime = randomDate(30);
  const expiryTime = new Date(entryTime.getTime() + duration * 1000);
  const settledAt = status === 'SETTLED' ? expiryTime : null;

  // 生成价格
  const entryPrice = generatePrice(assetType);
  const priceChange = random(-0.05, 0.05); // -5% 到 +5% 的价格变动
  const exitPrice = status === 'SETTLED' ? entryPrice * (1 + priceChange) : null;
  const currentPrice = status === 'PENDING' ? entryPrice * (1 + random(-0.02, 0.02)) : exitPrice;

  // 投资金额
  const investAmount = accountType === 'DEMO'
    ? random(100, 10000)
    : random(10, 1000);

  // 价差（点差）
  const spread = entryPrice * 0.001; // 0.1% 点差

  // 收益率（根据方向和价格变动计算）
  let returnRate = 0;
  if (status === 'SETTLED' && exitPrice) {
    const actualPriceChange = (exitPrice - entryPrice) / entryPrice;
    // CALL: 看涨，价格上涨则盈利
    // PUT: 看跌，价格下跌则盈利
    const directionMultiplier = direction === 'CALL' ? 1 : -1;
    const result = actualPriceChange * directionMultiplier;

    if (result > 0) {
      // 盈利：70-90% 收益率
      returnRate = random(0.7, 0.9);
    } else {
      // 亏损：损失全部投资
      returnRate = -1;
    }
  }

  // 实际收益
  const actualReturn = investAmount * returnRate;

  return {
    userId,
    userName, // 添加用户名
    orderNumber: `${generateOrderNumber()}_${index}`,
    assetType,
    direction,
    entryTime,
    expiryTime,
    duration,
    entryPrice: new Decimal(entryPrice.toFixed(8)),
    currentPrice: currentPrice ? new Decimal(currentPrice.toFixed(8)) : null,
    exitPrice: exitPrice ? new Decimal(exitPrice.toFixed(8)) : null,
    spread: new Decimal(spread.toFixed(8)),
    investAmount: new Decimal(investAmount.toFixed(2)),
    returnRate: new Decimal(returnRate.toFixed(4)),
    actualReturn: new Decimal(actualReturn.toFixed(2)),
    status,
    accountType,
    settledAt,
  };
}

async function main() {
  console.log('🚀 开始生成模拟交易数据...\n');

  // 获取所有活跃用户
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, email: true, displayName: true },
  });

  if (users.length === 0) {
    console.log('❌ 没有找到活跃用户，请先创建用户');
    return;
  }

  console.log(`✅ 找到 ${users.length} 个活跃用户\n`);

  const TRANSACTIONS_PER_USER_MIN = 20;
  const TRANSACTIONS_PER_USER_MAX = 50;
  let totalCreated = 0;

  // 为每个用户生成交易记录
  for (const user of users) {
    const transactionCount = Math.floor(
      random(TRANSACTIONS_PER_USER_MIN, TRANSACTIONS_PER_USER_MAX)
    );

    console.log(`📝 为用户 ${user.displayName} (${user.email}) 生成 ${transactionCount} 条交易...`);

    const transactions = [];
    for (let i = 0; i < transactionCount; i++) {
      transactions.push(generateTransaction(user.id, user.displayName, totalCreated + i));
    }

    // 批量插入
    try {
      await prisma.transactionLog.createMany({
        data: transactions,
        skipDuplicates: true,
      });

      totalCreated += transactionCount;
      console.log(`   ✅ 成功创建 ${transactionCount} 条交易记录`);
    } catch (error) {
      console.error(`   ❌ 创建失败:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 统计信息:`);
  console.log(`   ✅ 总共创建: ${totalCreated} 条交易记录`);
  console.log(`   👥 涉及用户: ${users.length} 个`);
  console.log(`   📈 平均每用户: ${Math.floor(totalCreated / users.length)} 条交易`);
  console.log('='.repeat(60));

  // 统计各状态数量
  const statusCounts = await prisma.transactionLog.groupBy({
    by: ['status'],
    _count: true,
  });

  console.log('\n📊 交易状态分布:');
  for (const { status, _count } of statusCounts) {
    console.log(`   ${status}: ${_count} 条`);
  }

  // 统计各资产类型数量
  const assetCounts = await prisma.transactionLog.groupBy({
    by: ['assetType'],
    _count: true,
  });

  console.log('\n📊 资产类型分布:');
  for (const { assetType, _count } of assetCounts) {
    console.log(`   ${assetType}: ${_count} 条`);
  }

  console.log('\n✅ 数据生成完成！');
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
