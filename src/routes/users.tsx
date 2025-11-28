import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { MoreHorizontal, ChevronUp, ChevronDown, Pencil, UserX, UserCheck, Trash2, Key } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { userService } from '@/services/users';
import type { User, QueryUsersParams } from '@/types/user';
import { cn } from '@/lib/utils';
import { formatTaiwanDateTime } from '@/lib/date-utils';
import { appConfig } from '@/config/env';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EditUserDialog } from '@/components/users/edit-user-dialog';

export const UsersPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const registrationSortValue =
    sorting[0]?.id === 'createdAt'
      ? sorting[0]?.desc
        ? 'newest'
        : 'oldest'
      : 'none';

  const handleRegistrationSortChange = (value: 'none' | 'newest' | 'oldest') => {
    if (value === 'none') {
      setSorting([]);
      return;
    }
    setSorting([{ id: 'createdAt', desc: value === 'newest' }]);
  };

  // Query params
  const queryParams: QueryUsersParams = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: search || undefined,
    sortBy: sorting[0]?.id as any,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    verificationStatus: verificationFilter === 'all' ? undefined : verificationFilter
  };

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', queryParams],
    queryFn: () => userService.list(api, queryParams),
  });

  // Mutations
  const activateMutation = useMutation({
    mutationFn: (id: string) => userService.activate(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => userService.deactivate(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.delete(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      userService.resetPassword(api, id, { newPassword }),
    onSuccess: () => {
      toast({
        title: '成功',
        description: '密碼已重置',
      });
      setResetPasswordDialogOpen(false);
      setUserToResetPassword(null);
      setNewPassword('');
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error?.response?.data?.message || error?.message || '重置密碼失敗',
        variant: 'destructive',
      });
    },
  });

  // 構建圖片 URL 的輔助函數
  const buildImageUrl = (raw?: string | null): string | undefined => {
    if (!raw) return undefined;
    const val = String(raw);
    // 絕對網址
    if (/^https?:\/\//i.test(val)) {
      if (window.location.protocol === 'https:' && val.startsWith('http://')) {
        return val.replace(/^http:\/\//i, 'https://');
      }
      return val;
    }
    // 相對路徑：以 API 的 origin 作為基底
    try {
      const api = appConfig.apiUrl || '';
      let originBase: string;
      if (/^https?:\/\//i.test(api)) {
        const u = new URL(api);
        originBase = `${u.protocol}//${u.host}`;
      } else {
        originBase = window.location.origin;
      }
      const normalized = val.startsWith('/') ? val : `/${val}`;
      return `${originBase}${normalized}`;
    } catch {
      return val;
    }
  };

  // Table columns
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'email',
      header: '郵箱',
      cell: ({ row }) => <div className="font-medium">{row.getValue('email')}</div>,
    },
    {
      accessorKey: 'displayName',
      header: '顯示名稱',
      cell: ({ row }) => {
        const user = row.original;
        const avatarUrl = buildImageUrl(user.avatar);
        return (
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.displayName}
                className="h-10 w-10 rounded-full object-cover"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  if (el.src.startsWith('http://') && window.location.protocol === 'https:') {
                    el.src = el.src.replace('http://', 'https://');
                  } else {
                    el.style.display = 'none';
                  }
                }}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
                {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span>{user.displayName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'phoneNumber',
      header: '手機號碼',
      cell: ({ row }) => <div>{row.getValue('phoneNumber') || '-'}</div>,
      meta: {
        minWidth: '120px',
      },
    },
    {
      accessorKey: 'isActive',
      header: '狀態',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive');
        return (
          <Badge variant={isActive ? 'success' : 'destructive'}>
            {isActive ? '活躍' : '停用'}
          </Badge>
        );
      },
      meta: {
        minWidth: '90px',
      },
    },
    {
      accessorKey: 'verificationStatus',
      header: '身份驗證',
      cell: ({ row }) => {
        const status = row.getValue('verificationStatus') as string;
        const statusConfig = {
          PENDING: { label: '待審核', variant: 'secondary' as const },
          IN_REVIEW: { label: '審核中', variant: 'default' as const },
          VERIFIED: { label: '驗證成功', variant: 'success' as const },
          REJECTED: { label: '驗證失敗', variant: 'destructive' as const },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const };
        return (
          <Badge variant={config.variant}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'demoBalance',
      header: '模擬餘額',
      cell: ({ row }) => {
        const balance = parseFloat(row.getValue('demoBalance'));
        return <div className="text-right">${balance.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: 'realBalance',
      header: '真實餘額',
      cell: ({ row }) => {
        const balance = parseFloat(row.getValue('realBalance'));
        return <div className="text-right">${balance.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: '註冊時間',
      cell: ({ row }) => {
        const value = row.getValue('createdAt') as string | null;
        return value ? formatTaiwanDateTime(value) : '-';
      },
      meta: {
        minWidth: '160px'
      }
    },
    {
      id: 'view',
      header: '訂單詳情',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: `/users/${user.id}` })}
          >
            交易詳情
          </Button>
        );
      },
      meta: {
        minWidth: '120px',
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
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;

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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                複製用戶 ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setUserToEdit(user);
                setEditDialogOpen(true);
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                編輯
              </DropdownMenuItem>
              {user.isActive ? (
                <DropdownMenuItem onClick={() => deactivateMutation.mutate(user.id)}>
                  <UserX className="mr-2 h-4 w-4" />
                  停用用戶
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => activateMutation.mutate(user.id)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  激活用戶
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  setUserToResetPassword(user);
                  setResetPasswordDialogOpen(true);
                }}
              >
                <Key className="mr-2 h-4 w-4" />
                重置密碼
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  setUserToDelete(user);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除用戶
              </DropdownMenuItem>
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
    pageCount: data?.totalPages || 0,
  });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>用戶管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">載入失敗: {(error as Error).message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>用戶管理</CardTitle>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="搜索用戶..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="px-3 py-2 border rounded-md"
              />
              <Select
                value={registrationSortValue}
                onValueChange={(val) => handleRegistrationSortChange(val as 'none' | 'newest' | 'oldest')}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="註冊時間排序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">註冊時間（不排序）</SelectItem>
                  <SelectItem value="newest">註冊時間：新 ➜ 舊</SelectItem>
                  <SelectItem value="oldest">註冊時間：舊 ➜ 新</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as typeof statusFilter);
                  setPagination({ ...pagination, page: 1 });
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="active">活躍</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={verificationFilter}
                onValueChange={(value) => {
                  setVerificationFilter(value as typeof verificationFilter);
                  setPagination({ ...pagination, page: 1 });
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="身份驗證" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部身份驗證</SelectItem>
                  <SelectItem value="PENDING">待審核</SelectItem>
                  <SelectItem value="IN_REVIEW">審核中</SelectItem>
                  <SelectItem value="VERIFIED">驗證成功</SelectItem>
                  <SelectItem value="REJECTED">驗證失敗</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">載入中...</div>
            </div>
          ) : (
            <>
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
                          沒有找到用戶
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  共 {data?.total || 0} 個用戶，第 {data?.page || 0} / {data?.totalPages || 0} 頁
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                  >
                    上一頁
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= (data?.totalPages || 0)}
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              您確定要刪除用戶 "{userToDelete?.displayName}" ({userToDelete?.email}) 嗎？
              此操作無法撤銷。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '刪除中...' : '確認刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密碼</DialogTitle>
            <DialogDescription>
              為用戶 "{userToResetPassword?.displayName}" ({userToResetPassword?.email}) 設置新密碼
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密碼</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="請輸入新密碼"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordDialogOpen(false);
                setUserToResetPassword(null);
                setNewPassword('');
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (!userToResetPassword || !newPassword.trim()) {
                  toast({
                    title: '錯誤',
                    description: '請輸入新密碼',
                    variant: 'destructive',
                  });
                  return;
                }
                resetPasswordMutation.mutate({
                  id: userToResetPassword.id,
                  newPassword: newPassword.trim(),
                });
              }}
              disabled={resetPasswordMutation.isPending || !newPassword.trim()}
            >
              {resetPasswordMutation.isPending ? '重置中...' : '確認重置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <EditUserDialog
        user={userToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
};
