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
import { MoreHorizontal, ChevronUp, ChevronDown, Pencil, UserX, UserCheck, Trash2, Plus, ArrowRight } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { adminService } from '@/services/admins';
import type { Admin, QueryAdminsParams } from '@/types/admin';
import { cn } from '@/lib/utils';
import { formatTaiwanDateTime } from '@/lib/date-utils';

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
import { CreateAdminDialog } from '@/components/admins/create-admin-dialog';
import { EditAdminDialog } from '@/components/admins/edit-admin-dialog';

export const OperatorsPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<Admin | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Query params
  const queryParams: QueryAdminsParams = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: search || undefined,
    sortBy: sorting[0]?.id as any,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
  };

  // Fetch admins
  const { data, isLoading, error } = useQuery({
    queryKey: ['admins', queryParams],
    queryFn: () => adminService.list(api, queryParams),
  });

  // Mutations
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return adminService.update(api, id, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast({
        title: '成功',
        description: '操作員已啟用',
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error?.response?.data?.message || '啟用操作員失敗',
        variant: 'destructive',
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return adminService.update(api, id, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast({
        title: '成功',
        description: '操作員已停用',
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error?.response?.data?.message || '停用操作員失敗',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.delete(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
      toast({
        title: '成功',
        description: '操作員已刪除',
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error?.response?.data?.message || '刪除操作員失敗',
        variant: 'destructive',
      });
    },
  });

  // Table columns
  const columns: ColumnDef<Admin>[] = [
    {
      accessorKey: 'username',
      header: '用戶名',
      cell: ({ row }) => <div className="font-medium">{row.getValue('username')}</div>,
    },
    {
      accessorKey: 'displayName',
      header: '顯示名稱',
      cell: ({ row }) => <div>{row.getValue('displayName') || '-'}</div>,
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
      id: 'view',
      header: '詳情',
      cell: ({ row }) => {
        const admin = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: `/operators/${admin.id}` })}
          >
            查看詳情
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      meta: {
        minWidth: '110px',
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
                複製操作員 ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setAdminToEdit(admin);
                setEditDialogOpen(true);
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                編輯
              </DropdownMenuItem>
              {admin.isActive ? (
                <DropdownMenuItem onClick={() => deactivateMutation.mutate(admin.id)}>
                  <UserX className="mr-2 h-4 w-4" />
                  停用操作員
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => activateMutation.mutate(admin.id)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  啟用操作員
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  setAdminToDelete(admin);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除操作員
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
          <CardTitle>操作員列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">載入失敗: {(error as Error).message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">操作員列表</h1>
          <p className="text-muted-foreground">管理操作員並查看他們的交易流水</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>操作員</CardTitle>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="搜索操作員..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="w-64"
                />
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增操作員
                </Button>
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
                            沒有找到操作員
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    共 {data?.total || 0} 個操作員，第 {data?.page || 0} / {data?.totalPages || 0} 頁
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
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              您確定要刪除操作員 "{adminToDelete?.displayName || adminToDelete?.username}" 嗎？
              此操作無法撤銷。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => adminToDelete && deleteMutation.mutate(adminToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '刪除中...' : '確認刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Admin Dialog */}
      <CreateAdminDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Admin Dialog */}
      <EditAdminDialog
        admin={adminToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
};
