import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  X,
  CheckCircle,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { transactionService } from '@/services/transactions';
import type {
  Transaction,
  QueryTransactionsParams,
  SettleTransactionDto,
} from '@/types/transaction';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const TransactionsPage = () => {
  const { api } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [filters, setFilters] = useState<{
    assetType?: string;
    direction?: string;
    status?: string;
    accountType?: string;
    username?: string;
    managedMode?: boolean;
  }>({});
  
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [transactionToAction, setTransactionToAction] = useState<Transaction | null>(null);
  const [exitPrice, setExitPrice] = useState('');

  // Query params
  const queryParams: QueryTransactionsParams = {
    page: pagination.page,
    limit: pagination.limit,
    assetType: filters.assetType || undefined,
    direction: filters.direction as any,
    status: filters.status as any,
    accountType: filters.accountType as any,
    username: filters.username || undefined,
    managedMode: filters.managedMode,
  };

  // Fetch transactions
  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: () => transactionService.list(api, queryParams),
  });

  // Mutations
  const settleMutation = useMutation({
    mutationFn: ({ orderNumber, exitPrice }: { orderNumber: string; exitPrice: number }) =>
      transactionService.settle(api, orderNumber, { exitPrice }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSettleDialogOpen(false);
      setTransactionToAction(null);
      setExitPrice('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (orderNumber: string) => transactionService.cancel(api, orderNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setCancelDialogOpen(false);
      setTransactionToAction(null);
    },
  });

  // Table columns
  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'orderNumber',
      header: '订单号',
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue('orderNumber')}</div>
      ),
    },
    {
      accessorKey: 'userName',
      header: '用户',
      cell: ({ row }) => {
        const userName = row.getValue('userName') as string | undefined;
        return <div className="font-medium">{userName || '-'}</div>;
      },
    },
    {
      accessorKey: 'assetType',
      header: '交易对',
      cell: ({ row }) => <Badge variant="outline">{row.getValue('assetType')}</Badge>,
    },
    {
      accessorKey: 'direction',
      header: '方向',
      cell: ({ row }) => {
        const direction = row.getValue('direction') as string;
        return (
          <Badge variant={direction === 'CALL' ? 'success' : 'destructive'}>
            {direction === 'CALL' ? '看涨' : '看跌'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'accountType',
      header: '账户类型',
      cell: ({ row }) => {
        const accountType = row.getValue('accountType') as string;
        return (
          <Badge variant={accountType === 'REAL' ? 'warning' : 'secondary'}>
            {accountType === 'REAL' ? '真实' : '模拟'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'entryPrice',
      header: '入场价',
      cell: ({ row }) => {
        const price = parseFloat(row.getValue('entryPrice'));
        return <div className="font-medium">${price.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: 'exitPrice',
      header: '出场价',
      cell: ({ row }) => {
        const price = row.getValue('exitPrice') as number | null;
        return price ? <div className="font-medium">${price.toFixed(2)}</div> : <span className="text-muted-foreground">-</span>;
      },
    },
    {
      accessorKey: 'investAmount',
      header: '投资金额',
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('investAmount'));
        return <div className="font-medium">${amount.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: 'returnRate',
      header: '收益率',
      cell: ({ row }) => {
        const rate = parseFloat(row.getValue('returnRate'));
        return <div>{(rate * 100).toFixed(2)}%</div>;
      },
    },
    {
      accessorKey: 'actualReturn',
      header: '实际收益',
      cell: ({ row }) => {
        const returnValue = parseFloat(row.getValue('actualReturn'));
        const isPositive = returnValue >= 0;
        return (
          <div className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}${returnValue.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' }> = {
          PENDING: { label: '进行中', variant: 'warning' },
          SETTLED: { label: '已结算', variant: 'success' },
          CANCELED: { label: '已取消', variant: 'destructive' },
        };
        const config = statusConfig[status] || { label: status, variant: 'default' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: 'isManaged',
      header: '托管',
      cell: ({ row }) => {
        const isManaged = row.original.isManaged;
        if (isManaged) {
          return <Badge variant="default">托管</Badge>;
        }
        return <span className="text-sm text-muted-foreground">-</span>;
      },
    },
    {
      accessorKey: 'entryTime',
      header: '入场时间',
      cell: ({ row }) => {
        const date = row.getValue('entryTime') as string;
        return <div className="text-sm">{new Date(date).toLocaleString('zh-CN')}</div>;
      },
    },
    {
      accessorKey: 'expiryTime',
      header: '到期时间',
      cell: ({ row }) => {
        const date = row.getValue('expiryTime') as string;
        return <div className="text-sm">{new Date(date).toLocaleString('zh-CN')}</div>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const transaction = row.original;
        const canAction = transaction.status === 'PENDING';

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">打开菜单</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(transaction.orderNumber)}
              >
                复制订单号
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canAction && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setTransactionToAction(transaction);
                      setExitPrice(transaction.currentPrice?.toFixed(2) || '');
                      setSettleDialogOpen(true);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    结算交易
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setTransactionToAction(transaction);
                      setCancelDialogOpen(true);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    取消交易
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Table instance
  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    manualPagination: true,
    pageCount: Math.ceil((data?.total || 0) / (data?.limit || 20)),
  });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>交易流水</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">加载失败: {(error as Error).message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>交易流水</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex gap-2 flex-wrap">
            <Input
              type="text"
              placeholder="用户名"
              value={filters.username || ''}
              onChange={(e) => setFilters({ ...filters, username: e.target.value || undefined })}
              className="w-40"
            />
            <Input
              type="text"
              placeholder="资产对 (如 BTC, ETH)"
              value={filters.assetType || ''}
              onChange={(e) => setFilters({ ...filters, assetType: e.target.value || undefined })}
              className="w-48"
            />
            <select
              value={filters.direction || ''}
              onChange={(e) => setFilters({ ...filters, direction: e.target.value || undefined })}
              className="px-3 py-2 border rounded-md w-32"
            >
              <option value="">全部方向</option>
              <option value="CALL">看涨</option>
              <option value="PUT">看跌</option>
            </select>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="px-3 py-2 border rounded-md w-32"
            >
              <option value="">全部状态</option>
              <option value="PENDING">进行中</option>
              <option value="SETTLED">已结算</option>
              <option value="CANCELED">已取消</option>
            </select>
            <select
              value={filters.accountType || ''}
              onChange={(e) => setFilters({ ...filters, accountType: e.target.value || undefined })}
              className="px-3 py-2 border rounded-md w-32"
            >
              <option value="">全部账户</option>
              <option value="DEMO">模拟账户</option>
              <option value="REAL">真实账户</option>
            </select>
            <select
              value={filters.managedMode === undefined ? '' : filters.managedMode ? 'true' : 'false'}
              onChange={(e) => {
                const value = e.target.value;
                setFilters({
                  ...filters,
                  managedMode: value === '' ? undefined : value === 'true',
                });
              }}
              className="px-3 py-2 border rounded-md w-32"
            >
              <option value="">全部托管</option>
              <option value="true">托管</option>
              <option value="false">非托管</option>
            </select>
            {(filters.assetType || filters.direction || filters.status || filters.accountType || filters.username || filters.managedMode !== undefined) && (
              <Button
                variant="outline"
                onClick={() => setFilters({})}
              >
                清除筛选
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">加载中...</div>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder ? null : (
                              <div
                                className={
                                  header.column.getCanSort()
                                    ? 'cursor-pointer select-none flex items-center gap-2'
                                    : ''
                                }
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                                {header.column.getCanSort() && (
                                  <span className="ml-2">
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
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          没有找到交易记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  共 {data?.total || 0} 条记录，第 {data?.page || 0} / {Math.ceil((data?.total || 0) / (data?.limit || 20))} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= Math.ceil((data?.total || 0) / (data?.limit || 20))}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Settle Transaction Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>结算交易</DialogTitle>
            <DialogDescription>
              请输入出场价格来结算订单 "{transactionToAction?.orderNumber}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">出场价格</label>
              <Input
                type="number"
                step="0.01"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder="请输入出场价格"
              />
            </div>
            {transactionToAction && (
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>入场价格: ${transactionToAction.entryPrice.toFixed(2)}</div>
                <div>当前价格: ${transactionToAction.currentPrice?.toFixed(2) || '未知'}</div>
                <div>方向: {transactionToAction.direction === 'CALL' ? '看涨' : '看跌'}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (transactionToAction && exitPrice) {
                  settleMutation.mutate({
                    orderNumber: transactionToAction.orderNumber,
                    exitPrice: parseFloat(exitPrice),
                  });
                }
              }}
              disabled={settleMutation.isPending || !exitPrice}
            >
              {settleMutation.isPending ? '结算中...' : '确认结算'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Transaction Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认取消</DialogTitle>
            <DialogDescription>
              您确定要取消订单 "{transactionToAction?.orderNumber}" 吗？
              此操作将退还投资本金，无法撤销。
            </DialogDescription>
          </DialogHeader>
          {transactionToAction && (
            <div className="space-y-1 text-sm text-muted-foreground py-4">
              <div>订单号: {transactionToAction.orderNumber}</div>
              <div>投资金额: ${transactionToAction.investAmount.toFixed(2)}</div>
              <div>资产类型: {transactionToAction.assetType}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (transactionToAction) {
                  cancelMutation.mutate(transactionToAction.orderNumber);
                }
              }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? '取消中...' : '确认取消'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

