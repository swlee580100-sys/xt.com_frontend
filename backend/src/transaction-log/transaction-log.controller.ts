import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TransactionLogService } from './transaction-log.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import type { UserEntity } from '../auth/entities/user.entity';

@Controller('transactions')
export class TransactionLogController {
  constructor(private readonly transactionLogService: TransactionLogService) {}

  /**
   * 创建新交易
   * POST /transactions
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  createTransaction(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionLogService.createTransaction(user.id, dto);
  }

  /**
   * 获取当前用户的交易列表
   * GET /transactions
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  getUserTransactions(
    @CurrentUser() user: UserEntity,
    @Query() query: QueryTransactionsDto,
  ) {
    return this.transactionLogService.getUserTransactions(user.id, query);
  }

  /**
   * 获取当前用户的统计数据
   * GET /transactions/statistics
   */
  @UseGuards(JwtAuthGuard)
  @Get('statistics')
  getUserStatistics(@CurrentUser() user: UserEntity) {
    return this.transactionLogService.getUserStatistics(user.id);
  }

  /**
   * 根据订单号获取交易详情
   * GET /transactions/:orderNumber
   */
  @UseGuards(JwtAuthGuard)
  @Get(':orderNumber')
  getTransactionByOrderNumber(@Param('orderNumber') orderNumber: string) {
    return this.transactionLogService.getTransactionByOrderNumber(orderNumber);
  }

  /**
   * 手动结算交易（测试用）
   * POST /transactions/:orderNumber/settle
   */
  @UseGuards(JwtAuthGuard)
  @Post(':orderNumber/settle')
  settleTransaction(@Param('orderNumber') orderNumber: string) {
    return this.transactionLogService.settleTransaction(orderNumber);
  }

  /**
   * 取消交易
   * POST /transactions/:orderNumber/cancel
   */
  @UseGuards(JwtAuthGuard)
  @Post(':orderNumber/cancel')
  cancelTransaction(@Param('orderNumber') orderNumber: string) {
    return this.transactionLogService.cancelTransaction(orderNumber);
  }

  /**
   * 触发自动结算过期交易（管理员或定时任务使用）
   * POST /transactions/auto-settle
   */
  @Public()
  @Post('auto-settle')
  autoSettleExpiredTransactions() {
    return this.transactionLogService.autoSettleExpiredTransactions();
  }
}
