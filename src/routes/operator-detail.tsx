import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowLeft, ChevronUp, ChevronDown, Pencil, RefreshCw } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { adminService } from '@/services/admins';
import { transactionService } from '@/services/transactions';
import type { Admin } from '@/types/admin';
import type { Transaction, TradeDirection, TransactionStatus, AccountType } from '@/types/transaction';
import { cn } from '@/lib/utils';
import { formatTaiwanDateTime } from '@/lib/date-utils';
import { EditAdminDialog } from '@/components/admins/edit-admin-dialog';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const OperatorDetailPage = () => {
  const { operatorId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { api } = useAuth();
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editOperatorDialogOpen, setEditOperatorDialogOpen] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // 獲取操作員詳情
  const fetchAdmin = useCallback(async () => {
    if (!api || !operatorId) return;
    try {
      setIsLoading(true);
      const data = await adminService.getById(api, operatorId);
      setAdmin(data);
    } catch (error: any) {
      console.error('Failed to fetch admin:', error);
      toast({
        title: '錯誤',
        description: error?.response?.data?.message || '取得操作員詳情失敗',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, operatorId, toast]);

  // 獲取交易數據
  const fetchTransactions = useCallback(async () => {
    if (!api || !operatorId) return;
    try {
      setIsLoadingTransactions(true);
      // 注意：這裡假設後端支持通過 userId 或 adminId 篩選交易
      // 如果後端不支持，可能需要調整查詢參數
      const response = await transactionService.list(api, {
        page: 1,
        limit: 1000,
        // 如果後端支持通過 userId 篩選，可以使用 operatorId
        // 否則可能需要其他方式獲取該操作員的交易
      });
      // 過濾出屬於該操作員的交易（如果後端不支持篩選）
      const filtered = response.data?.filter(txn => txn.userId === operatorId) || [];
      setTransactions(filtered);
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
      toast({
        title: '錯誤',
        description: error?.response?.data?.message || '取得交易數據失敗',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [api, operatorId, toast]);

  useEffect(() => {
    fetchAdmin();
    fetchTransactions();
  }, [fetchAdmin, fetchTransactions]);

  // 表格欄位
  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      accessorKey: 'orderNumber',
      header: '訂單號',
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue('orderNumber')}</div>
      ),
    },
    {
      accessorKey: 'assetType',
      header: '交易對',
      cell: ({ row }) => <Badge variant="outline">{row.getValue('assetType')}</Badge>,
      meta: { minWidth: '120px' }
    },
    {
      accessorKey: 'direction',
      header: '方向',
      cell: ({ row }) => {
        const direction = row.getValue('direction') as TradeDirection;
        return (
          <Badge variant={direction === 'CALL' ? 'success' : 'destructive'}>
            {direction === 'CALL' ? '看漲' : '看跌'}
          </Badge>
        );
      },
      meta: {
        minWidth: '90px',
      },
    },
    {
      accessorKey: 'accountType',
      header: '帳戶類型',
      cell: ({ row }) => {
        const type = row.getValue('accountType') as AccountType;
        return <Badge variant="secondary">{type === 'DEMO' ? '模擬' : '真實'}</Badge>;
      },
    },
    {
      accessorKey: 'entryTime',
      header: '入場時間',
      cell: ({ row }) => {
        const entryTime = row.getValue('entryTime') as string;
        return (
          <div className="text-sm">
            {formatTaiwanDateTime(entryTime)}
          </div>
        );
      },
    },
    {
      id: 'exitTime',
      header: '出場時間',
      cell: ({ row }) => {
        const entryTime = row.original.entryTime;
        const duration = row.original.duration;
        const status = row.original.status;

        // 如果交易還在進行中，顯示「進行中」
        if (status === 'PENDING') {
          return <div className="text-sm text-muted-foreground">進行中</div>;
        }

        // 計算出場時間 = 入場時間 + 交易秒數
        const exitTime = new Date(new Date(entryTime).getTime() + duration * 1000);
        return (
          <div className="text-sm">
            {formatTaiwanDateTime(exitTime.toISOString())}
          </div>
        );
      },
    },
    {
      accessorKey: 'duration',
      header: '交易秒數',
      cell: ({ row }) => {
        const duration = row.getValue('duration') as number;
        return <div className="text-right">{duration} 秒</div>;
      },
    },
    {
      accessorKey: 'investAmount',
      header: '投資金額',
      cell: ({ row }) => {
        const amount = row.getValue('investAmount') as number;
        return <div className="text-right">${Math.floor(amount).toLocaleString()}</div>;
      },
    },
    {
      accessorKey: 'entryPrice',
      header: '入場價',
      cell: ({ row }) => {
        const price = row.getValue('entryPrice') as number;
        return (
          <div className="text-right">
            ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        );
      },
    },
    {
      accessorKey: 'exitPrice',
      header: '出場價',
      cell: ({ row }) => {
        const price = row.getValue('exitPrice') as number | null;
        return (
          <div className="text-right">
            {price
              ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'returnRate',
      header: '收益率',
      cell: ({ row }) => {
        const rate = row.getValue('returnRate') as number;
        return <div className="text-right">{rate.toFixed(2)}%</div>;
      },
    },
    {
      accessorKey: 'actualReturn',
      header: '實際收益',
      cell: ({ row }) => {
        const returnValue = row.getValue('actualReturn') as number;
        const isPositive = returnValue >= 0;
        return (
          <div className={cn('text-right font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
            {isPositive ? '+' : ''}${returnValue.toFixed(2)}
          </div>
        );
      },
    },
    {
      id: 'profitLoss',
      header: '盈利/虧損',
      cell: ({ row }) => {
        const returnValue = row.original.actualReturn;
        const status = row.original.status;

        // 如果交易還在進行中，顯示「進行中」
        if (status === 'PENDING') {
          return <Badge variant="default">進行中</Badge>;
        }

        // 根據實際收益判斷盈利/虧損
        if (returnValue > 0) {
          return <Badge variant="success" className="bg-green-500 text-white">盈利</Badge>;
        } else if (returnValue < 0) {
          return <Badge variant="destructive" className="text-white">虧損</Badge>;
        } else {
          return <Badge variant="secondary">持平</Badge>;
        }
      },
      meta: {
        minWidth: '90px',
      },
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: ({ row }) => {
        const status = row.getValue('status') as TransactionStatus;
        const statusConfig = {
          PENDING: { label: '進行中', variant: 'default' as const },
          SETTLED: { label: '已結算', variant: 'success' as const },
          CANCELED: { label: '已取消', variant: 'destructive' as const },
        };
        const config = statusConfig[status] || { label: status, variant: 'default' as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
      meta: {
        minWidth: '95px',
      },
    },
  ], []);

  // 表格實例
  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: '/operators' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">載入中...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: '/operators' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">操作員不存在</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalProfit = transactions.reduce((sum, txn) => sum + (txn.actualReturn || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={() => navigate({ to: '/operators' })} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
          <h1 className="text-3xl font-bold">{admin.displayName || admin.username} - 交易流水</h1>
          <p className="text-muted-foreground">查看並管理此操作員的交易記錄</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOperatorDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            編輯操作員
          </Button>
          <Button variant="outline" onClick={() => { fetchAdmin(); fetchTransactions(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重新整理
          </Button>
        </div>
      </div>

      {/* 操作員信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>操作員資訊</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">用戶名</p>
              <p className="font-medium">{admin.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">顯示名稱</p>
              <p className="font-medium">{admin.displayName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">狀態</p>
              <Badge variant={admin.isActive ? 'success' : 'destructive'}>
                {admin.isActive ? '啟用' : '停用'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">最後登入</p>
              <p className="font-medium">
                {admin.lastLoginAt
                  ? formatTaiwanDateTime(admin.lastLoginAt)
                  : '從未登入'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">登入IP</p>
              <p className="font-medium font-mono text-sm">{admin.lastLoginIp || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">建立時間</p>
              <p className="font-medium">
                {formatTaiwanDateTime(admin.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">總交易筆數</p>
              <p className="font-medium text-lg">{transactions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">總收益</p>
              <p className={cn('font-medium text-lg', totalProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                {totalProfit >= 0 ? '+' : ''}${Math.abs(totalProfit).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 交易流水表格 */}
      <Card>
        <CardHeader>
          <CardTitle>交易流水</CardTitle>
          <CardDescription>共 {transactions.length} 筆交易記錄</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">載入中...</div>
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const meta = header.column.columnDef.meta as { minWidth?: string } | undefined;
                        return (
                          <TableHead
                            key={header.id}
                            style={meta?.minWidth ? { minWidth: meta.minWidth } : undefined}
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                className={cn(
                                  'whitespace-nowrap',
                                  header.column.getCanSort()
                                    ? 'cursor-pointer select-none flex items-center gap-2'
                                    : ''
                                )}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                                {header.column.getCanSort() && (
                                  <span className="ml-2 flex-shrink-0">
                                    {header.column.getIsSorted() === 'asc' ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : header.column.getIsSorted() === 'desc' ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : null}
                                  </span>
                                )}
                              </div>
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => {
                          const meta = cell.column.columnDef.meta as { minWidth?: string } | undefined;
                          return (
                            <TableCell
                              key={cell.id}
                              style={meta?.minWidth ? { minWidth: meta.minWidth } : undefined}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        沒有找到交易記錄
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 編輯操作員對話框 */}
      <EditAdminDialog
        admin={admin}
        open={editOperatorDialogOpen}
        onOpenChange={setEditOperatorDialogOpen}
      />
    </div>
  );
};
