import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { MoreHorizontal, ChevronUp, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { settingsService } from '@/services/settings';
import { adminService } from '@/services/admins';
import { cmsService } from '@/services/cms';
import type {
  // UpdateTradingChannelsDto, // 暫時停用 - 交易渠道功能未開放
  // TradingChannel, // 暫時停用 - 交易渠道功能未開放
  IpWhitelistConfig,
  UpdateIpWhitelistConfigDto,
} from '@/types/settings';
import type { Admin, QueryAdminsParams } from '@/types/admin';
import type {
  TradingPerformanceEntry,
  TradingPerformancePayload,
} from '@/types/cms';
import { cn } from '@/lib/utils';
import { formatTaiwanDateTime } from '@/lib/date-utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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
import { EditAdminDialog } from '@/components/admins/edit-admin-dialog';

export const SettingsPage = () => {
  const { api } = useAuth();
  const queryClient = useQueryClient();

  // 管理員帳號狀態
  const [adminSorting, setAdminSorting] = useState<SortingState>([]);
  const [adminPagination, setAdminPagination] = useState({ page: 1, pageSize: 10 });
  const [adminSearch, setAdminSearch] = useState('');
  const [deleteAdminDialogOpen, setDeleteAdminDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const [editAdminDialogOpen, setEditAdminDialogOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<Admin | null>(null);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // 交易渠道狀態 - 暫時停用
  // const [tradingChannels, setTradingChannels] = useState<TradingChannel[]>([]);

  // 託管模式狀態 - 暫時停用
  // const [managedModeEnabled, setManagedModeEnabled] = useState(false);

  // IP白名單配置狀態
  const [ipWhitelistConfig, setIpWhitelistConfig] = useState<IpWhitelistConfig>({
    enabled: false,
    ips: [],
    description: ''
  });
  const [ipWhitelistError, setIpWhitelistError] = useState<string | null>(null);
  const [ipWhitelistSuccess, setIpWhitelistSuccess] = useState<string | null>(null);

  // 交易時長/盈利率管理狀態
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState<TradingPerformanceEntry | null>(null);
  const [performanceFormData, setPerformanceFormData] = useState({
    tradeDuration: '0',
    winRate: '0'
  });
  const [performanceFormErrors, setPerformanceFormErrors] = useState<Record<string, string>>({});

  // 获取交易渠道設置 - 暫時停用
  // const { data: tradingChannelsData } = useQuery({
  //   queryKey: ['settings', 'trading-channels'],
  //   queryFn: () => settingsService.getTradingChannels(api),
  //   onSuccess: (data) => {
  //     if (data && data.length > 0) {
  //       setTradingChannels(data);
  //     } else {
  //       setTradingChannels([
  //         { name: 'Binance', enabled: true },
  //         { name: 'Coinbase', enabled: false },
  //       ]);
  //     }
  //   },
  // });

  // 获取託管模式設置 - 暫時停用
  // const { data: managedModeData } = useQuery({
  //   queryKey: ['settings', 'managed-mode'],
  //   queryFn: async () => {
  //     const response = await api.get('/admin/settings/trading/managed-mode');
  //     return response.data.data;
  //   },
  //   onSuccess: (data) => {
  //     if (data) {
  //       setManagedModeEnabled(data.enabled ?? false);
  //     }
  //   },
  // });

  // 獲取IP白名單配置
  const {
    data: ipWhitelistConfigData,
    isLoading: ipWhitelistLoading,
    error: ipWhitelistQueryError
  } = useQuery({
    queryKey: ['settings', 'ip-whitelist-config'],
    queryFn: () => settingsService.getIpWhitelistConfig(api),
  });

  useEffect(() => {
    console.log('IP白名單配置数据更新:', { ipWhitelistConfigData, ipWhitelistLoading });
    if (ipWhitelistConfigData) {
      const config = {
        enabled: ipWhitelistConfigData.enabled ?? false,
        ips: ipWhitelistConfigData.ips || [],
        description: ipWhitelistConfigData.description || ''
      };
      console.log('设置IP白名單配置为:', config);
      setIpWhitelistConfig(config);
      setIpWhitelistError(null);
    }
  }, [ipWhitelistConfigData, ipWhitelistLoading]);

  useEffect(() => {
    if (ipWhitelistQueryError) {
      const message =
        ipWhitelistQueryError instanceof Error
          ? ipWhitelistQueryError.message
          : 'IP白名單配置載入失敗，請稍後再試';
      setIpWhitelistError(message);
    } else {
      setIpWhitelistError(null);
    }
  }, [ipWhitelistQueryError]);

  useEffect(() => {
    if (!ipWhitelistSuccess) return;
    const timer = window.setTimeout(() => setIpWhitelistSuccess(null), 3000);
    return () => window.clearTimeout(timer);
  }, [ipWhitelistSuccess]);

  // 管理員列表查詢
  const adminQueryParams: QueryAdminsParams = {
    page: adminPagination.page,
    pageSize: adminPagination.pageSize,
    search: adminSearch || undefined,
    sortBy: adminSorting[0]?.id as any,
    sortOrder: adminSorting[0]?.desc ? 'desc' : 'asc',
  };

  const { data: adminsData, isLoading: adminsLoading, error: adminsError } = useQuery({
    queryKey: ['admins', adminQueryParams],
    queryFn: () => adminService.list(api, adminQueryParams),
  });

  // 调试：打印管理员数据
  useEffect(() => {
    console.log('管理员数据更新:', { adminsData, adminsLoading, adminsError });
    if (adminsData) {
      console.log('管理员列表数据结构:', {
        data: adminsData.data,
        total: adminsData.total,
        page: adminsData.page,
        totalPages: adminsData.totalPages
      });
    }
  }, [adminsData, adminsLoading, adminsError]);

  // 獲取交易時長/盈利率配置
  const {
    data: tradingPerformance = [],
    isLoading: tradingPerformanceLoading
  } = useQuery({
    queryKey: ['settings', 'trading-performance'],
    queryFn: () => cmsService.listTradingPerformance(api)
  });

  // Mutations
  const deleteAdminMutation = useMutation({
    mutationFn: (id: string) => adminService.delete(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setDeleteAdminDialogOpen(false);
      setAdminToDelete(null);
    },
  });

  // 交易渠道更新 - 暫時停用
  // const updateTradingChannelsMutation = useMutation({
  //   mutationFn: (data: UpdateTradingChannelsDto) =>
  //     settingsService.updateTradingChannels(api, data),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['settings', 'trading-channels'] });
  //     alert('交易渠道設置已更新');
  //   },
  // });

  // 託管模式更新 - 暫時停用
  // const updateManagedModeMutation = useMutation({
  //   mutationFn: async (enabled: boolean) => {
  //     await api.put('/admin/settings/trading/managed-mode', { enabled });
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['settings', 'managed-mode'] });
  //     setManagedModeEnabled(managedModeEnabled);
  //     alert('託管模式設置已更新');
  //   },
  // });

  // IP白名單配置更新
  const updateIpWhitelistConfigMutation = useMutation({
    mutationFn: (data: UpdateIpWhitelistConfigDto) =>
      settingsService.updateIpWhitelistConfig(api, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'ip-whitelist-config'] });
      setIpWhitelistError(null);
      setIpWhitelistSuccess('IP白名單配置已更新');
      setIpWhitelistConfig({
        enabled: data.enabled ?? false,
        ips: data.ips || [],
        description: data.description || ''
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || '更新失敗，請稍後再試';
      setIpWhitelistSuccess(null);
      setIpWhitelistError(message);
    },
  });

  // 交易時長/盈利率管理 Mutations
  const createPerformanceMutation = useMutation({
    mutationFn: (payload: TradingPerformancePayload) => cmsService.createTradingPerformance(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'trading-performance'] });
      setPerformanceDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '新增失敗，請稍後再試';
      setPerformanceFormErrors({ general: message });
    }
  });

  const updatePerformanceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TradingPerformancePayload }) =>
      cmsService.updateTradingPerformance(api, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'trading-performance'] });
      setPerformanceDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '更新失敗，請稍後再試';
      setPerformanceFormErrors({ general: message });
    }
  });

  const deletePerformanceMutation = useMutation({
    mutationFn: (id: string) => cmsService.deleteTradingPerformance(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'trading-performance'] });
    }
  });

  const isPerformanceSubmitting =
    createPerformanceMutation.isPending || updatePerformanceMutation.isPending;

  // 管理員表格欄位
  const adminColumns: ColumnDef<Admin>[] = [
    {
      accessorKey: 'username',
      header: '用戶名',
      cell: ({ row }) => <div className="font-medium">{row.getValue('username')}</div>,
    },
    {
      accessorKey: 'displayName',
      header: '顯示名稱',
      cell: ({ row }) => row.getValue('displayName') || '-',
    },
    {
      accessorKey: 'isActive',
      header: '狀態',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive');
        return (
          <Badge variant={isActive ? 'success' : 'destructive'}>
            {isActive ? '啟用' : '停用'}
          </Badge>
        );
      },
      meta: {
        minWidth: '90px',
      },
    },
    {
      accessorKey: 'lastLoginAt',
      header: '最後登入',
      cell: ({ row }) => {
        const date = row.getValue('lastLoginAt') as string | null;
        return date ? formatTaiwanDateTime(date) : '從未登入';
      },
    },
    {
      accessorKey: 'lastLoginIp',
      header: '登入IP',
      cell: ({ row }) => {
        const ip = row.getValue('lastLoginIp') as string | null;
        return <div className="font-mono text-sm">{ip || '-'}</div>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: '創建時間',
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as string;
        return formatTaiwanDateTime(date);
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const admin = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">打開菜單</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(admin.id)}>
                複製管理員 ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setAdminToEdit(admin);
                  setIsCreatingAdmin(false);
                  setEditAdminDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                編輯
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  setAdminToDelete(admin);
                  setDeleteAdminDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // 管理員表格實例
  const adminTable = useReactTable({
    data: adminsData?.data || [],
    columns: adminColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setAdminSorting,
    state: {
      sorting: adminSorting,
    },
    manualPagination: true,
    pageCount: adminsData?.totalPages || 0,
  });

  // IP白名單配置處理函數
  const handleIpWhitelistSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // 驗證IP列表
    const ips = ipWhitelistConfig.ips.filter(ip => ip.trim() !== '');

    updateIpWhitelistConfigMutation.mutate({
      config: {
        enabled: ipWhitelistConfig.enabled,
        ips,
        description: ipWhitelistConfig.description?.trim() || undefined
      }
    });
  };

  const handleIpListChange = (value: string) => {
    // 將textarea的值按行分割成IP數組
    const ips = value.split('\n').map(ip => ip.trim()).filter(ip => ip !== '');
    setIpWhitelistConfig(prev => ({ ...prev, ips }));
    setIpWhitelistError(null);
    setIpWhitelistSuccess(null);
  };

  // 交易時長/盈利率管理處理函數
  const handlePerformanceDialogOpenChange = (open: boolean) => {
    setPerformanceDialogOpen(open);
    if (!open) {
      setEditingPerformance(null);
      setPerformanceFormErrors({});
      setPerformanceFormData({ tradeDuration: '0', winRate: '0' });
    }
  };

  const handleCreatePerformance = () => {
    setEditingPerformance(null);
    setPerformanceFormErrors({});
    setPerformanceFormData({ tradeDuration: '0', winRate: '0' });
    setPerformanceDialogOpen(true);
  };

  const handleEditPerformance = (entry: TradingPerformanceEntry) => {
    setEditingPerformance(entry);
    setPerformanceFormErrors({});
    setPerformanceFormData({
      tradeDuration: String(entry.tradeDuration),
      winRate: entry.winRate.toString()
    });
    setPerformanceDialogOpen(true);
  };

  const validatePerformanceForm = () => {
    const errors: Record<string, string> = {};

    const duration = Number(performanceFormData.tradeDuration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 300) {
      errors.tradeDuration = '交易時長必須是 1~300 的整數（單位：秒）';
    }

    const winRate = Number(performanceFormData.winRate);
    if (Number.isNaN(winRate) || winRate < 0 || winRate > 100) {
      errors.winRate = '盈利率需在 0-100 之間';
    }

    return errors;
  };

  const handlePerformanceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validatePerformanceForm();

    if (Object.keys(errors).length > 0) {
      setPerformanceFormErrors(errors);
      return;
    }

    const payload: TradingPerformancePayload = {
      tradeDuration: Number(performanceFormData.tradeDuration),
      winRate: Number(performanceFormData.winRate)
    };

    if (editingPerformance) {
      updatePerformanceMutation.mutate({ id: editingPerformance.id, payload });
    } else {
      createPerformanceMutation.mutate(payload);
    }
  };

  const handlePerformanceDelete = (entry: TradingPerformanceEntry) => {
    if (deletePerformanceMutation.isPending) return;
    const confirmed = window.confirm(`確認刪除交易時長 ${entry.tradeDuration} 秒的配置嗎？`);
    if (confirmed) {
      deletePerformanceMutation.mutate(entry.id);
    }
  };

  // 交易渠道處理函數 - 暫時停用
  // const handleUpdateTradingChannels = () => {
  //   updateTradingChannelsMutation.mutate({ channels: tradingChannels });
  // };

  // const addTradingChannel = () => {
  //   setTradingChannels([
  //     ...tradingChannels,
  //     { name: '', enabled: false },
  //   ]);
  // };

  // const removeTradingChannel = (index: number) => {
  //   setTradingChannels(tradingChannels.filter((_, i) => i !== index));
  // };

  // const updateTradingChannel = (index: number, updates: Partial<TradingChannel>) => {
  //   const updated = [...tradingChannels];
  //   updated[index] = { ...updated[index], ...updates };
  //   setTradingChannels(updated);
  // };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">系統設置</h1>
        <p className="text-muted-foreground">管理系統配置和参数</p>
      </div>

      <Tabs defaultValue="admin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admin">管理員帳號</TabsTrigger>
          <TabsTrigger value="ip-whitelist">IP白名單</TabsTrigger>
          <TabsTrigger value="trading-performance">交易時長/盈利率</TabsTrigger>
          {/* 暫時停用 - 交易渠道功能未開放 */}
          {/* <TabsTrigger value="trading">交易渠道</TabsTrigger> */}
          {/* 暫時停用 - 託管模式功能未開放 */}
          {/* <TabsTrigger value="managed-mode">託管模式</TabsTrigger> */}
        </TabsList>

        {/* 管理員帳號設置 */}
        <TabsContent value="admin">
    <Card>
      <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>管理員帳號管理</CardTitle>
              <CardDescription>
                    管理系統管理員帳號，可以新增、編輯和刪除管理員
              </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setAdminToEdit(null);
                    setIsCreatingAdmin(true);
                    setEditAdminDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新增管理員
                </Button>
              </div>
      </CardHeader>
      <CardContent>
              <div className="mb-4">
                  <Input
                  type="text"
                  placeholder="搜索管理員..."
                  value={adminSearch}
                  onChange={(e) => {
                    setAdminSearch(e.target.value);
                    setAdminPagination({ ...adminPagination, page: 1 });
                  }}
                  className="max-w-sm"
                  />
                </div>
              {adminsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">載入中...</div>
                </div>
              ) : adminsError ? (
                <div className="text-red-600">載入失敗: {(adminsError as Error).message}</div>
              ) : (
                <>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        {adminTable.getHeaderGroups().map((headerGroup) => (
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
                        {adminTable.getRowModel().rows?.length ? (
                          adminTable.getRowModel().rows.map((row) => (
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
                            <TableCell colSpan={adminColumns.length} className="h-24 text-center">
                              沒有找到管理員
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      共 {adminsData?.total || 0} 個管理員，第 {adminsData?.page || 0} / {adminsData?.totalPages || 0} 頁
                    </div>
                    <div className="flex gap-2">
                <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdminPagination({ ...adminPagination, page: adminPagination.page - 1 })}
                        disabled={adminPagination.page === 1}
                >
                        上一頁
                </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdminPagination({ ...adminPagination, page: adminPagination.page + 1 })}
                        disabled={adminPagination.page >= (adminsData?.totalPages || 0)}
                      >
                        下一頁
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交易渠道設置 - 暫時停用 */}
        {/* <TabsContent value="trading">
          <Card>
            <CardHeader>
              <CardTitle>交易渠道設置</CardTitle>
              <CardDescription>
                配置可用的交易渠道和 API 密钥
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {tradingChannels.map((channel, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="space-y-2 flex-1">
                            <Label>渠道名稱</Label>
                            <Input
                              value={channel.name}
                              onChange={(e) =>
                                updateTradingChannel(index, { name: e.target.value })
                              }
                              placeholder="如: Binance, Coinbase"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.enabled}
                              onCheckedChange={(checked) =>
                                updateTradingChannel(index, { enabled: checked })
                              }
                            />
                            <Label>啟用</Label>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeTradingChannel(index)}
                        >
                          刪除
                        </Button>
                      </div>
                      {channel.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                              type="password"
                              value={channel.apiKey || ''}
                              onChange={(e) =>
                                updateTradingChannel(index, { apiKey: e.target.value })
                              }
                              placeholder="輸入 API Key"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>API Secret</Label>
                            <Input
                              type="password"
                              value={channel.apiSecret || ''}
                              onChange={(e) =>
                                updateTradingChannel(index, { apiSecret: e.target.value })
                              }
                              placeholder="輸入 API Secret"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex space-x-2">
                <Button onClick={addTradingChannel} variant="outline">
                  添加渠道
                </Button>
                <Button
                  onClick={handleUpdateTradingChannels}
                  disabled={updateTradingChannelsMutation.isPending}
                >
                  {updateTradingChannelsMutation.isPending ? '保存中...' : '保存設置'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent> */}

        {/* 託管模式設置 - 暫時停用 */}
        {/* <TabsContent value="managed-mode">
          <Card>
            <CardHeader>
              <CardTitle>託管模式設置</CardTitle>
              <CardDescription>
                啟用后，系統内所有用戶产生的交易都將被标记为托管交易
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="system-managed-mode">系統託管模式</Label>
                  <p className="text-sm text-muted-foreground">
                    啟用后，所有交易都將标记为托管交易，用于区分系統托管和手动交易
                  </p>
                </div>
                <Switch
                  id="system-managed-mode"
                  checked={managedModeEnabled}
                  onCheckedChange={(checked) => {
                    setManagedModeEnabled(checked);
                    updateManagedModeMutation.mutate(checked);
                  }}
                  disabled={updateManagedModeMutation.isPending}
                />
              </div>
              {updateManagedModeMutation.isPending && (
                <p className="text-sm text-muted-foreground">更新中...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent> */}


        {/* IP白名單配置 */}
        <TabsContent value="ip-whitelist">
          <Card>
            <CardHeader>
              <CardTitle>IP白名單配置</CardTitle>
              <CardDescription>
                設置允許登入的IP地址，支持單個IP（如 192.168.1.1）或CIDR格式（如 192.168.1.0/24）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ipWhitelistLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  正在載入IP白名單配置...
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleIpWhitelistSubmit}>
                  {ipWhitelistSuccess ? (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
                      {ipWhitelistSuccess}
                    </div>
                  ) : null}

                  {ipWhitelistError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {ipWhitelistError}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between pb-4 border-b">
                    <div className="space-y-0.5">
                      <Label htmlFor="ip-whitelist-enabled">啟用IP白名單</Label>
                      <p className="text-sm text-muted-foreground">
                        啟用後，只有白名單中的IP地址才能登入管理後台
                      </p>
                    </div>
                    <Switch
                      id="ip-whitelist-enabled"
                      checked={ipWhitelistConfig.enabled}
                      onCheckedChange={(checked) => {
                        setIpWhitelistConfig(prev => ({ ...prev, enabled: checked }));
                        setIpWhitelistError(null);
                        setIpWhitelistSuccess(null);
                      }}
                      disabled={updateIpWhitelistConfigMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ip-whitelist-description">描述</Label>
                    <Input
                      id="ip-whitelist-description"
                      value={ipWhitelistConfig.description || ''}
                      onChange={event => {
                        setIpWhitelistConfig(prev => ({ ...prev, description: event.target.value }));
                        setIpWhitelistError(null);
                        setIpWhitelistSuccess(null);
                      }}
                      placeholder="例如：生產環境白名單"
                      disabled={updateIpWhitelistConfigMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      選填，用於說明此白名單的用途
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ip-whitelist-ips">IP地址列表</Label>
                    <textarea
                      id="ip-whitelist-ips"
                      value={ipWhitelistConfig.ips.join('\n')}
                      onChange={event => handleIpListChange(event.target.value)}
                      rows={10}
                      className="min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="每行一個IP地址，例如：&#10;127.0.0.1&#10;192.168.1.0/24&#10;10.0.0.1"
                      disabled={updateIpWhitelistConfigMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      每行輸入一個IP地址，支持單個IP或CIDR格式（如 192.168.1.0/24）
                    </p>
                    {ipWhitelistConfig.ips.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        當前已配置 {ipWhitelistConfig.ips.length} 個IP地址
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={updateIpWhitelistConfigMutation.isPending}>
                      {updateIpWhitelistConfigMutation.isPending ? '儲存中…' : '保存IP白名單配置'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交易時長/盈利率管理 */}
        <TabsContent value="trading-performance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>交易時長/盈利率管理</CardTitle>
                  <CardDescription>
                    配置不同交易時長對應的盈利率，用於系統交易邏輯
                  </CardDescription>
                </div>
                <Button onClick={handleCreatePerformance}>
                  <Plus className="mr-2 h-4 w-4" />
                  新增配置
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tradingPerformanceLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  正在載入交易時長配置...
                </div>
              ) : tradingPerformance.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  暫無交易時長配置，點擊右上角按鈕新增一條吧。
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-40">交易時長 (秒)</TableHead>
                          <TableHead className="w-32">盈利率 (%)</TableHead>
                          <TableHead className="w-40">更新時間</TableHead>
                          <TableHead className="w-32 text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tradingPerformance.map(entry => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.tradeDuration}</TableCell>
                            <TableCell>{entry.winRate.toFixed(2)}%</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatTaiwanDateTime(entry.updatedAt)}
                            </TableCell>
                            <TableCell className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => handleEditPerformance(entry)}>
                                <Pencil className="mr-1 h-4 w-4" />
                                編輯
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handlePerformanceDelete(entry)}
                                disabled={deletePerformanceMutation.isPending}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                刪除
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Admin Confirmation Dialog */}
      <Dialog open={deleteAdminDialogOpen} onOpenChange={setDeleteAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              您確定要刪除管理員 "{adminToDelete?.displayName || adminToDelete?.username}" 嗎？
              此操作無法撤銷。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAdminDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => adminToDelete && deleteAdminMutation.mutate(adminToDelete.id)}
              disabled={deleteAdminMutation.isPending}
            >
              {deleteAdminMutation.isPending ? '刪除中...' : '確認刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <EditAdminDialog
        admin={adminToEdit}
        open={editAdminDialogOpen}
        onOpenChange={setEditAdminDialogOpen}
        isCreating={isCreatingAdmin}
      />

      {/* Trading Performance Dialog */}
      <Dialog open={performanceDialogOpen} onOpenChange={handlePerformanceDialogOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handlePerformanceSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingPerformance ? '編輯交易時長配置' : '新增交易時長配置'}
              </DialogTitle>
            </DialogHeader>

            {performanceFormErrors.general && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {performanceFormErrors.general}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="performance-duration">交易時長 (秒)</Label>
              <Input
                id="performance-duration"
                type="number"
                min={1}
                max={300}
                value={performanceFormData.tradeDuration}
                onChange={event =>
                  setPerformanceFormData(prev => ({
                    ...prev,
                    tradeDuration: event.target.value
                  }))
                }
                disabled={isPerformanceSubmitting}
              />
              {performanceFormErrors.tradeDuration ? (
                <p className="text-sm text-destructive">
                  {performanceFormErrors.tradeDuration}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">可設置 1~300 的整數，單位為秒</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="performance-winRate">盈利率 (%)</Label>
              <Input
                id="performance-winRate"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={performanceFormData.winRate}
                onChange={event =>
                  setPerformanceFormData(prev => ({
                    ...prev,
                    winRate: event.target.value
                  }))
                }
                disabled={isPerformanceSubmitting}
              />
              {performanceFormErrors.winRate ? (
                <p className="text-sm text-destructive">{performanceFormErrors.winRate}</p>
              ) : (
                <p className="text-xs text-muted-foreground">範圍 0-100，可保留兩位小數</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={isPerformanceSubmitting}
                onClick={() => handlePerformanceDialogOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={isPerformanceSubmitting}>
                {isPerformanceSubmitting ? '提交中…' : editingPerformance ? '保存修改' : '創建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
