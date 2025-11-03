import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminQueryTransactionsDto } from './dto/admin-query-transactions.dto';
import { TransactionLogService } from './transaction-log.service';

@Controller('admin/transactions')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class AdminTransactionLogController {
  constructor(private readonly transactionLogService: TransactionLogService) {}

  @Get()
  async getTransactions(@Query() query: AdminQueryTransactionsDto) {
    return this.transactionLogService.getAdminTransactions(query);
  }
}
