/**
 * Market Sessions Management Page
 * 大小盘管理页面
 */

import { useState, useCallback, useEffect } from 'react';
import { Plus, Play, Square, Trash2, Edit, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { marketSessionService } from '@/services/market-sessions';
import type {
  MarketSession,
  MarketSessionStatus,
  GetMarketSessionsParams
} from '@/types/market-session';
import { EditMarketSessionDialog } from '@/components/market-sessions/edit-market-session-dialog';

export default function MarketSessionsPage() {
  const { api } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<MarketSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<MarketSession | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MarketSessionStatus | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });

  // 获取大盘列表
  const fetchSessions = useCallback(async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const params: GetMarketSessionsParams = {
        page: currentPage,
        limit: 20
      };
      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await marketSessionService.admin.getSessions(api, params);
      setSessions(response.marketSessions || []);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages
      });
    } catch (error: any) {
      console.error('Failed to fetch market sessions:', error);
      setSessions([]);
      toast({
        title: '错误',
        description: error.response?.data?.message || '获取大盘列表失败',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, currentPage, statusFilter, toast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 开启大盘
  const handleStartSession = async (session: MarketSession) => {
    if (!api) return;

    try {
      const result = await marketSessionService.admin.startSession(api, session.id);
      toast({
        title: '成功',
        description: `大盘已开启，创建了 ${result.subMarketsCreated} 个小盘`
      });
      fetchSessions();
    } catch (error: any) {
      console.error('Failed to start session:', error);
      toast({
        title: '错误',
        description: error.response?.data?.message || '开启大盘失败',
        variant: 'destructive'
      });
    }
  };

  // 关闭大盘
  const handleStopSession = async (session: MarketSession) => {
    if (!api) return;

    if (!confirm(`确定要关闭大盘「${session.name}」吗？`)) {
      return;
    }

    try {
      const result = await marketSessionService.admin.stopSession(api, session.id);
      toast({
        title: '成功',
        description: result.message
      });
      fetchSessions();
    } catch (error: any) {
      console.error('Failed to stop session:', error);
      toast({
        title: '错误',
        description: error.response?.data?.message || '关闭大盘失败',
        variant: 'destructive'
      });
    }
  };

  // 删除大盘
  const handleDeleteSession = async (session: MarketSession) => {
    if (!api) return;

    if (!confirm(`确定要删除大盘「${session.name}」吗？此操作不可恢复。`)) {
      return;
    }

    try {
      await marketSessionService.admin.deleteSession(api, session.id);
      toast({
        title: '成功',
        description: '大盘已删除'
      });
      fetchSessions();
    } catch (error: any) {
      console.error('Failed to delete session:', error);
      toast({
        title: '错误',
        description: error.response?.data?.message || '删除大盘失败',
        variant: 'destructive'
      });
    }
  };

  // 编辑大盘
  const handleEditSession = (session: MarketSession) => {
    setSelectedSession(session);
    setIsEditDialogOpen(true);
  };

  // 新建大盘
  const handleCreateSession = () => {
    setSelectedSession(null);
    setIsEditDialogOpen(true);
  };

  // 获取状态标签
  const getStatusBadge = (status: MarketSessionStatus) => {
    const variants: Record<MarketSessionStatus, { variant: any; label: string }> = {
      PENDING: { variant: 'secondary', label: '待开盘' },
      ACTIVE: { variant: 'default', label: '进行中' },
      COMPLETED: { variant: 'outline', label: '已完成' },
      CANCELED: { variant: 'destructive', label: '已取消' }
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">大小盘管理</h1>
          <p className="text-muted-foreground mt-2">管理交易时段和小盘配置</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchSessions} variant="outline" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleCreateSession}>
            <Plus className="w-4 h-4 mr-2" />
            创建大盘
          </Button>
        </div>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === undefined ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter(undefined);
                setCurrentPage(1);
              }}
            >
              全部
            </Button>
            <Button
              variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter('PENDING');
                setCurrentPage(1);
              }}
            >
              待开盘
            </Button>
            <Button
              variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter('ACTIVE');
                setCurrentPage(1);
              }}
            >
              进行中
            </Button>
            <Button
              variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter('COMPLETED');
                setCurrentPage(1);
              }}
            >
              已完成
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 大盘列表 */}
      <Card>
        <CardHeader>
          <CardTitle>大盘列表 ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">加载中...</div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>开盘时间</TableHead>
                  <TableHead>结束时间</TableHead>
                  <TableHead>资产类型</TableHead>
                  <TableHead>小盘数量</TableHead>
                  <TableHead>创建者</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map(session => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.name}
                      {session.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {session.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell className="text-sm">{formatTime(session.startTime)}</TableCell>
                    <TableCell className="text-sm">{formatTime(session.endTime)}</TableCell>
                    <TableCell>{session.assetType || '-'}</TableCell>
                    <TableCell>
                      {session.subMarkets?.length || 0}
                      {session.subMarkets && session.subMarkets.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {session.subMarkets
                            .map(sm => `${sm.tradeDuration}s/${sm.profitRate}%`)
                            .join(', ')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{session.createdByName || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {session.status === 'PENDING' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartSession(session)}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              开启
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSession(session)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSession(session)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {session.status === 'ACTIVE' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStopSession(session)}
                          >
                            <Square className="w-4 h-4 mr-1" />
                            关闭
                          </Button>
                        )}
                        {(session.status === 'COMPLETED' || session.status === 'CANCELED') && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSession(session)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                共 {pagination.total} 条，第 {pagination.page} / {pagination.totalPages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={currentPage <= 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= pagination.totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑/创建对话框 */}
      <EditMarketSessionDialog
        session={selectedSession}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          setIsEditDialogOpen(false);
          fetchSessions();
        }}
      />
    </div>
  );
}
