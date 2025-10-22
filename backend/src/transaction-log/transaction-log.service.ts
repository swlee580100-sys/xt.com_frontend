import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, TransactionStatus, TradeDirection } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { generateOrderNumber } from '../common/utils/order-number.generator';

@Injectable()
export class TransactionLogService {
  private readonly logger = new Logger(TransactionLogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {}

  /**
   * 创建新的交易记录
   */
  async createTransaction(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    // 验证用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查账户余额是否足够
    const balance = Number(user.accountBalance);
    if (balance < dto.investAmount) {
      throw new BadRequestException(
        `账户余额不足。当前余额: ${balance}, 需要: ${dto.investAmount}`,
      );
    }

    // 获取当前市场价格（这里需要从市场数据服务获取）
    const currentPrice = await this.getCurrentPrice(dto.assetType);

    // 生成唯一订单号
    const orderNumber = generateOrderNumber();

    // 计算时间
    const entryTime = new Date();
    const expiryTime = new Date(entryTime.getTime() + dto.duration * 1000);

    // 计算点差（简化处理，实际应该从配置或市场数据获取）
    const spread = currentPrice * 0.0001; // 0.01% 点差

    // 创建交易记录
    const transaction = await this.prisma.transactionLog.create({
      data: {
        userId,
        orderNumber,
        assetType: dto.assetType,
        direction: dto.direction,
        entryTime,
        expiryTime,
        duration: dto.duration,
        entryPrice: currentPrice,
        currentPrice: currentPrice,
        spread,
        investAmount: dto.investAmount,
        returnRate: dto.returnRate,
        actualReturn: 0, // 初始为 0，结算时计算
        status: TransactionStatus.PENDING,
      },
    });

    // 扣除投资金额
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        accountBalance: {
          decrement: dto.investAmount,
        },
      },
    });

    this.logger.log(
      `交易创建成功: ${orderNumber}, 用户: ${userId}, 资产: ${dto.assetType}`,
    );

    return this.mapToResponseDto(transaction);
  }

  /**
   * 获取用户的交易记录列表
   */
  async getUserTransactions(
    userId: string,
    query: QueryTransactionsDto,
  ): Promise<{
    data: TransactionResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, assetType, direction, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionLogWhereInput = {
      userId,
      ...(assetType && { assetType }),
      ...(direction && { direction }),
      ...(status && { status }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transactionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transactionLog.count({ where }),
    ]);

    return {
      data: transactions.map((t) => this.mapToResponseDto(t)),
      total,
      page,
      limit,
    };
  }

  /**
   * 根据订单号获取交易详情
   */
  async getTransactionByOrderNumber(
    orderNumber: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transactionLog.findUnique({
      where: { orderNumber },
    });

    if (!transaction) {
      throw new NotFoundException(`订单 ${orderNumber} 不存在`);
    }

    return this.mapToResponseDto(transaction);
  }

  /**
   * 更新交易的当前价格
   */
  async updateCurrentPrice(
    orderNumber: string,
    currentPrice: number,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transactionLog.update({
      where: { orderNumber },
      data: { currentPrice },
    });

    return this.mapToResponseDto(transaction);
  }

  /**
   * 结算交易
   */
  async settleTransaction(orderNumber: string): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transactionLog.findUnique({
      where: { orderNumber },
    });

    if (!transaction) {
      throw new NotFoundException(`订单 ${orderNumber} 不存在`);
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(`订单 ${orderNumber} 已经结算或取消`);
    }

    // 获取最新的市场价格作为出场价
    const exitPrice = await this.getCurrentPrice(transaction.assetType);

    // 计算盈亏
    const isWin = this.calculateIsWin(
      transaction.direction,
      Number(transaction.entryPrice),
      exitPrice,
    );

    // 计算实得金额
    const investAmount = Number(transaction.investAmount);
    const returnRate = Number(transaction.returnRate);

    let actualReturn: number;
    if (isWin) {
      // 赢了：返还本金 + 收益
      actualReturn = investAmount * (1 + returnRate);
    } else {
      // 输了：损失全部本金
      actualReturn = -investAmount;
    }

    // 更新交易记录
    const updatedTransaction = await this.prisma.transactionLog.update({
      where: { orderNumber },
      data: {
        exitPrice,
        currentPrice: exitPrice,
        actualReturn,
        status: TransactionStatus.SETTLED,
        settledAt: new Date(),
      },
    });

    // 更新用户账户
    await this.updateUserAccountAfterSettle(
      transaction.userId,
      investAmount,
      actualReturn,
      isWin,
    );

    this.logger.log(
      `交易已结算: ${orderNumber}, 结果: ${isWin ? '盈利' : '亏损'}, 实得: ${actualReturn}`,
    );

    return this.mapToResponseDto(updatedTransaction);
  }

  /**
   * 取消交易（只能取消未结算的）
   */
  async cancelTransaction(orderNumber: string): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transactionLog.findUnique({
      where: { orderNumber },
    });

    if (!transaction) {
      throw new NotFoundException(`订单 ${orderNumber} 不存在`);
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(`订单 ${orderNumber} 不能取消`);
    }

    // 取消交易，退还本金
    const updatedTransaction = await this.prisma.transactionLog.update({
      where: { orderNumber },
      data: {
        status: TransactionStatus.CANCELED,
        actualReturn: 0,
      },
    });

    // 退还投资金额
    await this.prisma.user.update({
      where: { id: transaction.userId },
      data: {
        accountBalance: {
          increment: Number(transaction.investAmount),
        },
      },
    });

    this.logger.log(`交易已取消: ${orderNumber}`);

    return this.mapToResponseDto(updatedTransaction);
  }

  /**
   * 自动结算过期的交易
   */
  async autoSettleExpiredTransactions(): Promise<number> {
    const now = new Date();

    // 查找所有过期且未结算的交易
    const expiredTransactions = await this.prisma.transactionLog.findMany({
      where: {
        status: TransactionStatus.PENDING,
        expiryTime: {
          lte: now,
        },
      },
    });

    this.logger.log(`发现 ${expiredTransactions.length} 笔过期交易需要结算`);

    let settledCount = 0;
    for (const transaction of expiredTransactions) {
      try {
        await this.settleTransaction(transaction.orderNumber);
        settledCount++;
      } catch (error) {
        this.logger.error(
          `自动结算失败: ${transaction.orderNumber}`,
          (error as Error).stack,
        );
      }
    }

    this.logger.log(`自动结算完成: ${settledCount}/${expiredTransactions.length}`);
    return settledCount;
  }

  /**
   * 获取用户统计数据
   */
  async getUserStatistics(userId: string) {
    const [totalTransactions, winTransactions, user] = await Promise.all([
      this.prisma.transactionLog.count({
        where: { userId, status: TransactionStatus.SETTLED },
      }),
      this.prisma.transactionLog.count({
        where: {
          userId,
          status: TransactionStatus.SETTLED,
          actualReturn: { gt: 0 },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          accountBalance: true,
          totalProfitLoss: true,
          winRate: true,
          totalTrades: true,
        },
      }),
    ]);

    const winRate =
      totalTransactions > 0 ? (winTransactions / totalTransactions) * 100 : 0;

    return {
      accountBalance: Number(user?.accountBalance || 0),
      totalProfitLoss: Number(user?.totalProfitLoss || 0),
      winRate: Number(winRate.toFixed(2)),
      totalTrades: user?.totalTrades || 0,
      settledTrades: totalTransactions,
      winningTrades: winTransactions,
      losingTrades: totalTransactions - winTransactions,
    };
  }

  // ========== 私有辅助方法 ==========

  /**
   * 获取当前市场价格
   */
  private async getCurrentPrice(assetType: string): Promise<number> {
    // TODO: 从市场数据服务获取实时价格
    // 暂时返回模拟价格
    const mockPrices: Record<string, number> = {
      BTC: 65000,
      ETH: 3500,
      ADA: 0.45,
      SOL: 150,
    };

    return mockPrices[assetType] || 100;
  }

  /**
   * 判断交易是否盈利
   */
  private calculateIsWin(
    direction: TradeDirection,
    entryPrice: number,
    exitPrice: number,
  ): boolean {
    if (direction === TradeDirection.CALL) {
      // 买涨：出场价 > 入场价
      return exitPrice > entryPrice;
    } else {
      // 买跌：出场价 < 入场价
      return exitPrice < entryPrice;
    }
  }

  /**
   * 结算后更新用户账户
   */
  private async updateUserAccountAfterSettle(
    userId: string,
    investAmount: number,
    actualReturn: number,
    isWin: boolean,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const currentBalance = Number(user.accountBalance);
    const currentProfitLoss = Number(user.totalProfitLoss);
    const currentTotalTrades = user.totalTrades;
    const currentWinRate = Number(user.winRate);

    // 计算新的余额（实得可能是负数）
    const newBalance = currentBalance + investAmount + actualReturn;

    // 计算新的总盈亏
    const newProfitLoss = currentProfitLoss + actualReturn;

    // 计算新的交易次数
    const newTotalTrades = currentTotalTrades + 1;

    // 计算新的胜率
    const winTrades = await this.prisma.transactionLog.count({
      where: {
        userId,
        status: TransactionStatus.SETTLED,
        actualReturn: { gt: 0 },
      },
    });
    const newWinRate = (winTrades / newTotalTrades) * 100;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        accountBalance: newBalance,
        totalProfitLoss: newProfitLoss,
        totalTrades: newTotalTrades,
        winRate: newWinRate,
      },
    });
  }

  /**
   * 映射到响应 DTO
   */
  private mapToResponseDto(transaction: any): TransactionResponseDto {
    return {
      id: transaction.id,
      userId: transaction.userId,
      orderNumber: transaction.orderNumber,
      assetType: transaction.assetType,
      direction: transaction.direction,
      entryTime: transaction.entryTime,
      expiryTime: transaction.expiryTime,
      duration: transaction.duration,
      entryPrice: Number(transaction.entryPrice),
      currentPrice: transaction.currentPrice ? Number(transaction.currentPrice) : null,
      exitPrice: transaction.exitPrice ? Number(transaction.exitPrice) : null,
      spread: Number(transaction.spread),
      investAmount: Number(transaction.investAmount),
      returnRate: Number(transaction.returnRate),
      actualReturn: Number(transaction.actualReturn),
      status: transaction.status,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      settledAt: transaction.settledAt,
    };
  }
}
