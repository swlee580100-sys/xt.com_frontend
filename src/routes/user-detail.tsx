import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Pencil,
  UserX,
  UserCheck,
  Plus
} from 'lucide-react';

import { TRADING_PAIRS } from '@/constants/trading-pairs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { userService } from '@/services/users';
import { transactionService } from '@/services/transactions';
import type { User } from '@/types/user';
import type {
  AccountType,
  TradeDirection,
  Transaction,
  TransactionStatus
} from '@/types/transaction';
import { cn } from '@/lib/utils';
import { formatTaiwanDateTime, formatTaiwanDate, formatTaiwanTime } from '@/lib/date-utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180] as const;

const calculateReturnRate = (duration: number) => (duration / 30) * 5;

const MOCK_USERS: User[] = [
  {
    id: 'user-001',
    email: 'alice@example.com',
    displayName: 'Alice Chen',
    phoneNumber: '0912-123-456',
    avatar: undefined,
    idCardFront: undefined,
    idCardBack: undefined,
    roles: ['user'],
    isActive: true,
    verificationStatus: 'VERIFIED',
    lastLoginAt: '2024-02-10T12:30:00Z',
    lastLoginIp: '192.168.1.15',
    createdAt: '2023-11-01T09:00:00Z',
    updatedAt: '2024-02-10T12:30:00Z',
    demoBalance: '15000',
    realBalance: '8000',
    totalProfitLoss: '2500',
    totalTrades: 128,
    winRate: '58.3'
  },
  {
    id: 'user-002',
    email: 'bob@example.com',
    displayName: 'Bob Lin',
    phoneNumber: '0913-222-888',
    avatar: undefined,
    idCardFront: undefined,
    idCardBack: undefined,
    roles: ['user'],
    isActive: true,
    verificationStatus: 'IN_REVIEW',
    lastLoginAt: '2024-02-09T05:12:00Z',
    lastLoginIp: '10.0.0.21',
    createdAt: '2023-12-18T11:30:00Z',
    updatedAt: '2024-02-02T08:10:00Z',
    demoBalance: '32000',
    realBalance: '12000',
    totalProfitLoss: '-850',
    totalTrades: 74,
    winRate: '46.2'
  },
  {
    id: 'user-003',
    email: 'cathy@example.com',
    displayName: 'Cathy Wu',
    phoneNumber: '0914-333-999',
    avatar: undefined,
    idCardFront: undefined,
    idCardBack: undefined,
    roles: ['user', 'vip'],
    isActive: false,
    verificationStatus: 'REJECTED',
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: '2023-10-05T15:00:00Z',
    updatedAt: '2023-12-20T10:45:00Z',
    demoBalance: '5000',
    realBalance: '0',
    totalProfitLoss: '-3200',
    totalTrades: 32,
    winRate: '31.2'
  }
];

export const UserDetailPage = () => {
  const { userId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { api } = useAuth();
  const { toast } = useToast();

  const [user, setUser] = useState<User | undefined>(undefined);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    assetType: '',
    direction: 'CALL' as TradeDirection,
    accountType: 'DEMO' as AccountType,
    entryPrice: '',
    investAmount: '',
    duration: '30',
    entryTime: '',
    status: 'PENDING' as TransactionStatus,
    isWin: true, // 輸贏狀態：true = 贏，false = 輸
    actualReturn: '' // 實際收益（手動輸入）
  });
  const [editForm, setEditForm] = useState({
    assetType: '',
    direction: 'CALL' as TradeDirection,
    accountType: 'DEMO' as AccountType,
    entryPrice: '',
    exitPrice: '',
    investAmount: '',
    duration: '30',
    entryTime: '',
    status: 'PENDING' as TransactionStatus,
    isWin: true, // 輸贏狀態：true = 贏，false = 輸
    actualReturn: '' // 實際收益（手動輸入）
  });

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      if (!userId) return;
      try {
        const data = await userService.getById(api, userId);
        if (mounted) {
          setUser(data);
        }
      } catch (error) {
        const fallback = MOCK_USERS.find(item => item.id === userId);
        if (mounted) {
          setUser(fallback);
        }
      }
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, [api, userId]);

  useEffect(() => {
    let cancelled = false;
    const loadTransactions = async () => {
      if (!api || !userId) return;
      try {
        setTransactionsLoading(true);
        const response = await transactionService.list(api, {
          page: 1,
          limit: 200,
          userId
        });
        if (!cancelled) {
          const items = Array.isArray(response?.data) ? response.data : [];
          setTransactions(items);
          setTransactionsError(null);
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error('Failed to fetch user transactions:', error);
          setTransactions([]);
          const message =
            error?.response?.data?.message ||
            error?.message ||
            '無法取得交易資料';
          setTransactionsError(message);
        }
      } finally {
        if (!cancelled) {
          setTransactionsLoading(false);
        }
      }
    };
    loadTransactions();
    return () => {
      cancelled = true;
    };
  }, [api, userId]);

  useEffect(() => {
    if (!transactionToEdit) return;

    const entryDate = new Date(transactionToEdit.entryTime);
    const entryLocal = new Date(entryDate.getTime() - entryDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    // 根據實際收益判斷輸贏：actualReturn > 0 為贏，否則為輸
    const isWin = transactionToEdit.actualReturn > 0;
    
    setEditForm({
      assetType: transactionToEdit.assetType,
      direction: transactionToEdit.direction,
      accountType: transactionToEdit.accountType,
      entryPrice: transactionToEdit.entryPrice.toString(),
      exitPrice: transactionToEdit.exitPrice?.toString() ?? '',
      investAmount: Math.floor(transactionToEdit.investAmount).toString(),
      duration: DURATION_OPTIONS.includes(transactionToEdit.duration)
        ? transactionToEdit.duration.toString()
        : '30',
      entryTime: entryLocal,
      status: transactionToEdit.status,
      isWin,
      actualReturn: transactionToEdit.actualReturn.toString()
    });
  }, [transactionToEdit]);

  const handleCreateTransaction = async () => {
    if (!userId || !api) return;

    const duration = parseInt(createForm.duration, 10) || 30;
    const entryTimeIso = new Date(createForm.entryTime).toISOString();
    // 計算報酬率：根據文檔，returnRate 是 0-10 的數值，如 0.85 表示 85%
    // calculateReturnRate 返回百分比數值（如 5, 10, 15），需要轉換為小數（如 0.05, 0.10, 0.15）
    const returnRatePercent = calculateReturnRate(duration);
    const returnRate = returnRatePercent / 100;

    try {
      console.log('創建訂單，參數:', {
        userId,
        assetType: createForm.assetType,
        direction: createForm.direction,
        duration,
        entryPrice: parseFloat(createForm.entryPrice),
        investAmount: parseInt(createForm.investAmount, 10) || 0,
        returnRate,
        accountType: createForm.accountType,
        entryTime: entryTimeIso,
      });

      // 計算實際收益：根據輸贏狀態和投資金額計算
      const investAmount = parseInt(createForm.investAmount, 10) || 0;
      
      // 如果用戶手動輸入了實際收益，使用輸入值；否則根據輸贏狀態計算
      let actualReturn = 0;
      if (createForm.actualReturn !== '' && createForm.actualReturn !== '0') {
        actualReturn = parseFloat(createForm.actualReturn) || 0;
      } else {
        // 根據輸贏狀態計算：贏 = 投資金額 × (1 + 報酬率)，輸 = -投資金額
        actualReturn = createForm.isWin 
          ? investAmount * (1 + returnRate) 
          : -investAmount;
      }

      // 先創建交易
      const newTransaction = await transactionService.create(api, {
        userId,
        assetType: createForm.assetType,
        direction: createForm.direction,
        duration,
        entryPrice: parseFloat(createForm.entryPrice),
        investAmount,
        returnRate,
        accountType: createForm.accountType,
        entryTime: entryTimeIso,
        status: 'PENDING', // 先創建為進行中狀態
        reason: '管理端手動創建',
      });

      // 如果狀態是「已結算」，創建後立即強制結算
      if (createForm.status === 'SETTLED') {
        // 使用入場價作為出場價（新增訂單時沒有單獨的出場價欄位）
        const exitPrice = parseFloat(createForm.entryPrice);
        
        const result: 'WIN' | 'LOSE' = actualReturn > 0 ? 'WIN' : 'LOSE';
        
        await transactionService.forceSettle(api, newTransaction.orderNumber, {
          exitPrice,
          result,
          reason: '管理端手動創建並結算',
        });
      }

      console.log('創建成功，返回的交易:', newTransaction);

      // 重新載入交易列表 - 使用與初始載入相同的方式
      setTransactionsLoading(true);
      try {
        const response = await transactionService.list(api, {
          page: 1,
          limit: 200,
          userId
        });
        
        console.log('重新載入交易列表，完整響應:', response);
        const items = Array.isArray(response?.data) ? response.data : [];
        console.log('交易列表項目數:', items.length);
        console.log('交易列表項目:', items);
        setTransactions(items);
        setTransactionsError(null);
      } catch (listError: any) {
        console.error('重新載入交易列表失敗:', listError);
        // 即使重新載入失敗，也顯示創建成功（因為創建已經成功）
      } finally {
        setTransactionsLoading(false);
      }

      toast({
        title: '成功',
        description: `訂單創建成功，訂單號: ${newTransaction.orderNumber}`,
      });

      setCreateDialogOpen(false);
      setCreateForm({
        assetType: '',
        direction: 'CALL',
        accountType: 'DEMO',
        entryPrice: '',
        investAmount: '',
        duration: '30',
        entryTime: '',
        status: 'PENDING',
        isWin: true,
        actualReturn: ''
      });
    } catch (error: any) {
      console.error('創建訂單失敗:', error);
      console.error('錯誤詳情:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      toast({
        title: '錯誤',
        description: error?.response?.data?.message || error?.message || '創建訂單失敗',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTransaction = async () => {
    if (!transactionToEdit || !api) return;

    const duration = parseInt(editForm.duration, 10) || 30;
    const entryTimeIso = new Date(editForm.entryTime).toISOString();
    
    // 計算實際收益：根據輸贏狀態和投資金額計算
    const investAmount = parseInt(editForm.investAmount, 10) || 0;
    const returnRate = calculateReturnRate(duration) / 100; // 轉換為小數（如 0.05 表示 5%）
    
    // 如果用戶手動輸入了實際收益，使用輸入值；否則根據輸贏狀態計算
    let actualReturn = 0;
    if (editForm.actualReturn !== '' && editForm.actualReturn !== '0') {
      actualReturn = parseFloat(editForm.actualReturn) || 0;
    } else {
      // 根據輸贏狀態計算：贏 = 投資金額 × (1 + 報酬率)，輸 = -投資金額
      actualReturn = editForm.isWin 
        ? investAmount * (1 + returnRate) 
        : -investAmount;
    }

    try {
      // 如果狀態改為「已結算」，使用強制結算接口
      if (editForm.status === 'SETTLED') {
        // 計算出場價：如果沒有手動輸入，使用入場價
        const exitPrice = editForm.exitPrice 
          ? parseFloat(editForm.exitPrice) 
          : parseFloat(editForm.entryPrice);
        
        // 根據實際收益判斷輸贏結果
        const result: 'WIN' | 'LOSE' = actualReturn > 0 ? 'WIN' : 'LOSE';
        
        await transactionService.forceSettle(api, transactionToEdit.orderNumber, {
          exitPrice,
          result,
          reason: '管理端手動結算',
        });
      } else {
        // 其他情況使用更新接口
        await transactionService.update(api, transactionToEdit.orderNumber, {
          assetType: editForm.assetType,
          direction: editForm.direction,
          duration,
          entryPrice: parseFloat(editForm.entryPrice),
          exitPrice: editForm.exitPrice ? parseFloat(editForm.exitPrice) : null,
          investAmount,
          returnRate: calculateReturnRate(duration) / 100,
          accountType: editForm.accountType,
          entryTime: entryTimeIso,
          status: editForm.status,
          actualReturn,
        });
      }

      // 重新載入交易列表
      const response = await transactionService.list(api, {
        page: 1,
        limit: 200,
        userId
      });
      setTransactions(Array.isArray(response?.data) ? response.data : []);

      toast({
        title: '成功',
        description: '訂單更新成功',
      });

      setEditDialogOpen(false);
      setTransactionToEdit(null);
    } catch (error: any) {
      console.error('Failed to update transaction:', error);
      toast({
        title: '錯誤',
        description: error?.response?.data?.message || error?.message || '更新訂單失敗',
        variant: 'destructive',
      });
    }
  };

  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      accessorKey: 'orderNumber',
      header: '訂單號',
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('orderNumber')}</div>
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
        const isCall = direction === 'CALL';
        return (
          <Badge variant={isCall ? 'success' : 'destructive'}>
            {isCall ? '看漲' : '看跌'}
          </Badge>
        );
      },
      meta: { minWidth: '90px' }
    },
    {
      accessorKey: 'accountType',
      header: '交易類型',
      cell: ({ row }) => {
        const type = row.getValue('accountType') as AccountType;
        const isDemo = type === 'DEMO';
        return (
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-semibold',
              isDemo ? 'text-purple-600 border-purple-300 bg-purple-50' : 'text-orange-600 border-orange-300 bg-orange-50'
            )}
          >
            {isDemo ? '模擬交易' : '真實交易'}
          </Badge>
        );
      },
      meta: { minWidth: '120px' }
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
      meta: { minWidth: '120px' }
    },
    {
      accessorKey: 'duration',
      header: '秒數',
      cell: ({ row }) => <div className="text-right">{row.getValue('duration')} 秒</div>
    },
    {
      accessorKey: 'investAmount',
      header: '投資金額',
      cell: ({ row }) => (
        <div className="text-right">
          ${Number(row.getValue('investAmount')).toLocaleString()}
        </div>
      )
    },
    {
      accessorKey: 'entryPrice',
      header: '入場價',
      cell: ({ row }) => (
        <div className="text-right">
          $
          {Number(row.getValue('entryPrice')).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </div>
      )
    },
    {
      accessorKey: 'exitPrice',
      header: '出場價',
      cell: ({ row }) => {
        const price = row.getValue('exitPrice') as number | null;
        return (
          <div className="text-right">
            {price !== null
              ? `$${price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`
              : '-'}
          </div>
        );
      }
    },
    {
      accessorKey: 'returnRate',
      header: '預期盈利率',
      cell: ({ row }) => {
        const rate = Number(row.getValue('returnRate'));
        const percent = Number.isFinite(rate) ? (rate * 100).toFixed(2) : '-';
        return <div className="text-right">{percent === '-' ? '-' : `${percent}%`}</div>;
      }
    },
    {
      accessorKey: 'actualReturn',
      header: '實際收益',
      cell: ({ row }) => {
        const value = row.getValue('actualReturn') as number;
        return (
          <div className={cn('text-right font-medium', value >= 0 ? 'text-green-600' : 'text-red-600')}>
            {value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(2)}
          </div>
        );
      }
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: ({ row }) => {
        const status = row.getValue('status') as TransactionStatus;
        const mapping: Record<TransactionStatus, { label: string; variant: 'default' | 'success' | 'destructive' }> = {
          PENDING: { label: '進行中', variant: 'default' },
          SETTLED: { label: '已結算', variant: 'success' },
          CANCELED: { label: '已取消', variant: 'destructive' }
        };
        const config = mapping[status] || { label: status, variant: 'default' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
      meta: { minWidth: '95px' }
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const txn = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTransactionToEdit(txn);
              setEditDialogOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            編輯
          </Button>
        );
      }
    }
  ], []);

  const filteredTransactions = useMemo(() => {
    const keyword = orderSearch.trim().toLowerCase();
    if (!keyword) return transactions;
    return transactions.filter(txn =>
      txn.orderNumber.toLowerCase().includes(keyword)
    );
  }, [transactions, orderSearch]);

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting }
  });

  if (!user) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: '/users' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            找不到該用戶
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalProfit = transactions.reduce((acc, item) => acc + (item.actualReturn || 0), 0);
  const winCount = transactions.filter(item => item.actualReturn > 0).length;
  const winRate = transactions.length ? (winCount / transactions.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="outline" onClick={() => navigate({ to: '/users' })} className="mb-3">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
          <h1 className="text-3xl font-bold">{user.displayName}</h1>
          <p className="text-muted-foreground">
            查看並管理用戶 {user.email} 的交易流水
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setUser(prev => (prev ? { ...prev, isActive: !prev.isActive } : prev))
            }
          >
            {user.isActive ? (
              <>
                <UserX className="mr-2 h-4 w-4" />
                停用用戶
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                啟用用戶
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用戶資訊</CardTitle>
          <CardDescription>用戶基本資料與統計數據</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">郵箱</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">身份驗證狀態</p>
              <Badge
                variant={
                  user.verificationStatus === 'VERIFIED'
                    ? 'success'
                    : user.verificationStatus === 'REJECTED'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {user.verificationStatus === 'VERIFIED'
                  ? '通過'
                  : user.verificationStatus === 'REJECTED'
                    ? '失敗'
                    : user.verificationStatus === 'IN_REVIEW'
                      ? '審核中'
                      : '待提交'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">狀態</p>
              <Badge variant={user.isActive ? 'success' : 'destructive'}>
                {user.isActive ? '活躍' : '停用'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">模擬帳戶餘額</p>
              <p className="font-medium text-lg">${Number(user.demoBalance).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">真實帳戶餘額</p>
              <p className="font-medium text-lg">${Number(user.realBalance).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">總交易筆數</p>
              <p className="font-medium text-lg">{transactions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">勝率</p>
              <p className="font-medium text-lg">{winRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">累計盈虧</p>
              <p className={cn('font-medium text-lg', totalProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                {totalProfit >= 0 ? '+' : '-'}${Math.abs(totalProfit).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">最後登入</p>
              <p className="font-medium">
                {user.lastLoginAt
                  ? formatTaiwanDateTime(user.lastLoginAt)
                  : '尚未登入'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>交易流水</CardTitle>
            <CardDescription>
              {transactionsLoading
                ? '交易資料載入中…'
                : transactionsError
                ? `載入交易資料失敗：${transactionsError}`
                : `共 ${transactions.length} 筆記錄，可點擊右側按鈕編輯`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="搜尋訂單編號"
              value={orderSearch}
              onChange={event => setOrderSearch(event.target.value)}
              className="w-full lg:w-64"
            />
            <Button
              onClick={() => {
                const now = new Date();
                const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                  .toISOString()
                  .slice(0, 16);
                setCreateForm(prev => ({
                  ...prev,
                  entryTime: localTime,
                  status: 'PENDING',
                  isWin: true,
                  actualReturn: ''
                }));
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增訂單
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
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
                                  ? 'flex cursor-pointer select-none items-center gap-2'
                                  : ''
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
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
                {transactionsLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      交易資料載入中…
                    </TableCell>
                  </TableRow>
                ) : transactionsError ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                      {transactionsError}
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map(cell => {
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
                      尚無交易記錄
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯交易</DialogTitle>
            <DialogDescription>
              編輯交易詳情，可修改狀態、輸贏結果和實際收益
            </DialogDescription>
          </DialogHeader>
          {transactionToEdit ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-assetType">交易對</Label>
                  <Select
                    value={editForm.assetType}
                    onValueChange={value => setEditForm(prev => ({ ...prev, assetType: value }))}
                  >
                    <SelectTrigger id="edit-assetType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADING_PAIRS.map(pair => (
                        <SelectItem key={pair} value={pair}>
                          {pair}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-direction">方向</Label>
                  <Select
                    value={editForm.direction}
                    onValueChange={value =>
                      setEditForm(prev => ({ ...prev, direction: value as TradeDirection }))
                    }
                  >
                    <SelectTrigger id="edit-direction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CALL">看漲</SelectItem>
                      <SelectItem value="PUT">看跌</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-accountType">帳戶</Label>
                  <Select
                    value={editForm.accountType}
                    onValueChange={value =>
                      setEditForm(prev => ({ ...prev, accountType: value as AccountType }))
                    }
                  >
                    <SelectTrigger id="edit-accountType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEMO">模擬</SelectItem>
                      <SelectItem value="REAL">真實</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">狀態</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={value =>
                      setEditForm(prev => ({ ...prev, status: value as TransactionStatus }))
                    }
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">進行中</SelectItem>
                      <SelectItem value="SETTLED">已結算</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-isWin">輸贏結果</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-isWin"
                      checked={editForm.isWin}
                      onCheckedChange={(checked) => {
                        // 當切換輸贏狀態時，自動計算實際收益
                        const investAmount = parseInt(editForm.investAmount, 10) || 0;
                        const returnRate = calculateReturnRate(parseInt(editForm.duration, 10) || 30) / 100;
                        const newActualReturn = checked 
                          ? investAmount * (1 + returnRate) 
                          : -investAmount;
                        setEditForm(prev => ({ 
                          ...prev, 
                          isWin: checked,
                          actualReturn: newActualReturn.toFixed(2)
                        }));
                      }}
                    />
                    <Label htmlFor="edit-isWin" className="cursor-pointer">
                      {editForm.isWin ? '贏' : '輸'}
                    </Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-actualReturn">實際收益</Label>
                  <Input
                    id="edit-actualReturn"
                    type="number"
                    step="0.01"
                    value={editForm.actualReturn}
                    onChange={event => {
                      const value = event.target.value;
                      const numValue = parseFloat(value) || 0;
                      // 當手動輸入實際收益時，自動判斷輸贏狀態
                      setEditForm(prev => ({ 
                        ...prev, 
                        actualReturn: value,
                        isWin: numValue > 0
                      }));
                    }}
                    placeholder="自動計算或手動輸入"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-entryPrice">入場價</Label>
                  <Input
                    id="edit-entryPrice"
                    type="number"
                    value={editForm.entryPrice}
                    onChange={event =>
                      setEditForm(prev => ({ ...prev, entryPrice: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-exitPrice">出場價</Label>
                  <Input
                    id="edit-exitPrice"
                    type="number"
                    value={editForm.exitPrice}
                    onChange={event =>
                      setEditForm(prev => ({ ...prev, exitPrice: event.target.value }))
                    }
                    placeholder="留空為尚未結束"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-investAmount">投資金額</Label>
                  <Input
                    id="edit-investAmount"
                    type="number"
                    min={1}
                    step={1}
                    value={editForm.investAmount}
                    onChange={event => {
                      const value = event.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setEditForm(prev => ({ ...prev, investAmount: value }));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">交易秒數</Label>
                  <Select
                    value={editForm.duration}
                    onValueChange={value => setEditForm(prev => ({ ...prev, duration: value }))}
                  >
                    <SelectTrigger id="edit-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(duration => (
                        <SelectItem key={duration} value={duration.toString()}>
                          {duration} 秒 (盈利率 {calculateReturnRate(duration)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-entryTime">入場時間</Label>
                  <Input
                    id="edit-entryTime"
                    type="datetime-local"
                    value={editForm.entryTime}
                    onChange={event =>
                      setEditForm(prev => ({ ...prev, entryTime: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>出場時間（自動計算）</Label>
                  <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                    {editForm.entryTime && editForm.duration
                      ? formatTaiwanDateTime(
                          new Date(
                            new Date(editForm.entryTime).getTime() + parseInt(editForm.duration, 10) * 1000
                          ).toISOString()
                        )
                      : '-'}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateTransaction}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Transaction Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增訂單</DialogTitle>
            <DialogDescription>
              為用戶創建新的交易訂單
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-assetType">交易對</Label>
                <Select
                  value={createForm.assetType}
                  onValueChange={value => setCreateForm(prev => ({ ...prev, assetType: value }))}
                >
                  <SelectTrigger id="create-assetType">
                    <SelectValue placeholder="選擇交易對" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADING_PAIRS.map(pair => (
                      <SelectItem key={pair} value={pair}>
                        {pair}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-direction">方向</Label>
                <Select
                  value={createForm.direction}
                  onValueChange={value =>
                    setCreateForm(prev => ({ ...prev, direction: value as TradeDirection }))
                  }
                >
                  <SelectTrigger id="create-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">看漲</SelectItem>
                    <SelectItem value="PUT">看跌</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-accountType">帳戶</Label>
                <Select
                  value={createForm.accountType}
                  onValueChange={value =>
                    setCreateForm(prev => ({ ...prev, accountType: value as AccountType }))
                  }
                >
                  <SelectTrigger id="create-accountType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEMO">模擬</SelectItem>
                    <SelectItem value="REAL">真實</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-status">狀態</Label>
                <Select
                  value={createForm.status}
                  onValueChange={value =>
                    setCreateForm(prev => ({ ...prev, status: value as TransactionStatus }))
                  }
                >
                  <SelectTrigger id="create-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">進行中</SelectItem>
                    <SelectItem value="SETTLED">已結算</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-duration">交易秒數</Label>
                <Select
                  value={createForm.duration}
                  onValueChange={value => setCreateForm(prev => ({ ...prev, duration: value }))}
                >
                  <SelectTrigger id="create-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(duration => (
                      <SelectItem key={duration} value={duration.toString()}>
                        {duration} 秒 (盈利率 {calculateReturnRate(duration)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-isWin">輸贏結果</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="create-isWin"
                    checked={createForm.isWin}
                    onCheckedChange={(checked) => {
                      // 當切換輸贏狀態時，自動計算實際收益
                      const investAmount = parseInt(createForm.investAmount, 10) || 0;
                      const returnRate = calculateReturnRate(parseInt(createForm.duration, 10) || 30) / 100;
                      const newActualReturn = checked 
                        ? investAmount * (1 + returnRate) 
                        : -investAmount;
                      setCreateForm(prev => ({ 
                        ...prev, 
                        isWin: checked,
                        actualReturn: newActualReturn.toFixed(2)
                      }));
                    }}
                  />
                  <Label htmlFor="create-isWin" className="cursor-pointer">
                    {createForm.isWin ? '贏' : '輸'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-entryPrice">入場價</Label>
                <Input
                  id="create-entryPrice"
                  type="number"
                  step="0.01"
                  value={createForm.entryPrice}
                  onChange={event =>
                    setCreateForm(prev => ({ ...prev, entryPrice: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-investAmount">投資金額</Label>
                <Input
                  id="create-investAmount"
                  type="number"
                  min={1}
                  step={1}
                  value={createForm.investAmount}
                  onChange={event => {
                    const value = event.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setCreateForm(prev => ({ ...prev, investAmount: value }));
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-entryTime">入場時間</Label>
                <Input
                  id="create-entryTime"
                  type="datetime-local"
                  value={createForm.entryTime}
                  onChange={event =>
                    setCreateForm(prev => ({ ...prev, entryTime: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>出場時間（自動計算）</Label>
                <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                  {createForm.entryTime && createForm.duration
                    ? formatTaiwanDateTime(
                        new Date(
                          new Date(createForm.entryTime).getTime() + parseInt(createForm.duration, 10) * 1000
                        ).toISOString()
                      )
                    : '-'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-actualReturn">實際收益</Label>
              <Input
                id="create-actualReturn"
                type="number"
                step="0.01"
                value={createForm.actualReturn}
                onChange={event => {
                  const value = event.target.value;
                  const numValue = parseFloat(value) || 0;
                  // 當手動輸入實際收益時，自動判斷輸贏狀態
                  setCreateForm(prev => ({ 
                    ...prev, 
                    actualReturn: value,
                    isWin: numValue > 0
                  }));
                }}
                placeholder="自動計算或手動輸入"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreateTransaction}
              disabled={
                !createForm.assetType ||
                !createForm.entryPrice ||
                !createForm.investAmount ||
                !createForm.entryTime ||
                isNaN(parseFloat(createForm.entryPrice)) ||
                isNaN(parseInt(createForm.investAmount, 10))
              }
            >
              創建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
