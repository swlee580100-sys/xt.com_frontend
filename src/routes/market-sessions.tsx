/**
 * Market Sessions Management Page
 * 大小盘管理页面
 */

import { useState, useCallback, useEffect, memo, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
import { transactionService } from '@/services/transactions';
import TradeUpdatesSocket from '@/services/trade-updates';
import type {
  MarketSession,
  MarketSessionStatus,
  GetMarketSessionsParams
} from '@/types/market-session';
import type { Transaction } from '@/types/transaction';
import { EditMarketSessionDialog } from '@/components/market-sessions/edit-market-session-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

export default function MarketSessionsPage() {
  const navigate = useNavigate();
  const { api, tokens, user } = useAuth();
  const { toast } = useToast();
  const accessToken = tokens?.accessToken ?? null;
  const adminId = user?.id ?? null;

  const [sessions, setSessions] = useState<MarketSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<MarketSession | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MarketSessionStatus | undefined>('ACTIVE');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  const [activeRealTrades, setActiveRealTrades] = useState<Transaction[]>([]);
  const [isTradeLoading, setIsTradeLoading] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [tradeToEdit, setTradeToEdit] = useState<Transaction | null>(null);
  const [resultForm, setResultForm] = useState({ outcome: 'WIN', exitPrice: '' });
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const tradingSocketRef = useRef<TradeUpdatesSocket | null>(null);

  const allowedStatuses = new Set<MarketSessionStatus>([
    'PENDING',
    'ACTIVE'
  ]);
  const filterActiveTrades = useCallback(
    (trades: Transaction[]) =>
      trades.filter(trade => trade.accountType === 'REAL' && trade.status === 'PENDING'),
    []
  );

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
      const filtered = (response.marketSessions || []).filter(session =>
        allowedStatuses.has(session.status)
      );
      setSessions(filtered);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: filtered.length,
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

  const computeExitPrice = (trade: Transaction, outcome: 'WIN' | 'LOSE'): number => {
    const base = trade.entryPrice;
    const delta = Math.max(0.0001, Math.abs(trade.spread || 0) || Math.max(0.5, base * 0.001));
    if (trade.direction === 'CALL') {
      return outcome === 'WIN' ? base + delta : base - delta;
    }
    return outcome === 'WIN' ? base - delta : base + delta;
  };

  const fetchActiveTrades = useCallback(async () => {
    if (!api) return;
    try {
      setIsTradeLoading(true);
      const response = await transactionService.list(api, {
        page: 1,
        limit: 100,
        status: 'PENDING',
        accountType: 'REAL'
      });
      setActiveRealTrades(filterActiveTrades(response.data || []));
    } catch (error: any) {
      console.error('Failed to fetch real trades:', error);
      toast({
        title: '错误',
        description: error.response?.data?.message || '获取真实交易失败',
        variant: 'destructive'
      });
    } finally {
      setIsTradeLoading(false);
    }
  }, [api, toast, filterActiveTrades]);

  useEffect(() => {
    fetchActiveTrades();
  }, [fetchActiveTrades]);

  useEffect(() => {
    if (!accessToken || !adminId) return;

    const socket = new TradeUpdatesSocket(accessToken, adminId);
    tradingSocketRef.current = socket;
    setIsTradeLoading(true);
    socket.connect();

    const offInitial = socket.on<{ transactions?: Transaction[] }>('trading:initial-data', data => {
      setActiveRealTrades(filterActiveTrades(data?.transactions ?? []));
      setIsTradeLoading(false);
    });

    const offNew = socket.on<{ transaction?: Transaction }>('trading:new-transaction', data => {
      const trade = data?.transaction;
      if (!trade) return;
      setActiveRealTrades(prev => filterActiveTrades([trade, ...prev]));
    });

    const upsertTrade = (trade?: Transaction) => {
      if (!trade) return;
      setActiveRealTrades(prev => {
        const list = prev.filter(item => item.id !== trade.id);
        return trade.status === 'PENDING' && trade.accountType === 'REAL'
          ? filterActiveTrades([trade, ...list])
          : list;
      });
    };

    const offUpdated = socket.on<{ transaction?: Transaction }>('trading:transaction-updated', data => {
      upsertTrade(data?.transaction);
    });

    const offStatus = socket.on<{ transaction?: Transaction }>('trading:status-changed', data => {
      upsertTrade(data?.transaction);
    });

    const offError = socket.on<{ message?: string }>('trading:error', error => {
      toast({
        title: '交易监控错误',
        description: error?.message || '实时交易连接出现问题',
        variant: 'destructive'
      });
    });

    const offConnectError = socket.on('connect_error', err => {
      toast({
        title: '交易监控连接失败',
        description: err?.message || '请稍后再试',
        variant: 'destructive'
      });
      setIsTradeLoading(false);
    });

    return () => {
      offInitial();
      offNew();
      offUpdated();
      offStatus();
      offError();
      offConnectError();
      socket.disconnect();
      if (tradingSocketRef.current === socket) {
        tradingSocketRef.current = null;
      }
    };
  }, [accessToken, adminId, filterActiveTrades, toast]);

  const handleOpenResultDialog = (trade: Transaction) => {
    const defaultOutcome: 'WIN' | 'LOSE' = 'WIN';
    const defaultExitPrice = computeExitPrice(trade, defaultOutcome);
    setTradeToEdit(trade);
    setResultForm({
      outcome: defaultOutcome,
      exitPrice: defaultExitPrice.toFixed(4)
    });
    setResultDialogOpen(true);
  };

  const handleOutcomeToggle = (outcome: 'WIN' | 'LOSE') => {
    if (!tradeToEdit) return;
    setResultForm({
      outcome,
      exitPrice: computeExitPrice(tradeToEdit, outcome).toFixed(4)
    });
  };

  const handleSubmitResult = async () => {
    if (!api || !tradeToEdit) return;

    const parsedExit = Number(resultForm.exitPrice);
    if (Number.isNaN(parsedExit)) {
      toast({
        title: '错误',
        description: '请输入有效的平仓价格',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmittingResult(true);
      const socket = tradingSocketRef.current;
      if (socket) {
        await socket.forceSettle(tradeToEdit.id, parsedExit);
      } else if (api) {
        await transactionService.settle(api, tradeToEdit.orderNumber, {
          exitPrice: parsedExit
        });
      } else {
        throw new Error('当前无法连接交易服务');
      }
      toast({
        title: '成功',
        description: '交易结果已更新'
      });
      setResultDialogOpen(false);
      setTradeToEdit(null);
      fetchActiveTrades();
    } catch (error: any) {
      console.error('Failed to settle trade:', error);
      const message = error?.response?.data?.message || error?.message || '更新交易结果失败';
      toast({
        title: '错误',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingResult(false);
    }
  };

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

  const handleViewSubMarkets = (session: MarketSession) => {
    navigate({ to: '/market-sessions/$sessionId', params: { sessionId: session.id } });
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
  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

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

      {/* 大盘列表 */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>大盘列表 ({pagination.total})</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter(prev => (prev === 'PENDING' ? undefined : 'PENDING'));
                setCurrentPage(1);
              }}
              size="sm"
            >
              待开盘
            </Button>
            <Button
              variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter(prev => (prev === 'ACTIVE' ? undefined : 'ACTIVE'));
                setCurrentPage(1);
              }}
              size="sm"
            >
              进行中
            </Button>
          </div>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSubMarkets(session)}
                        >
                          查看小盘
                        </Button>
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

      <ActiveRealTradesSection
        trades={activeRealTrades}
        isLoading={isTradeLoading}
        onRefresh={fetchActiveTrades}
        onEdit={handleOpenResultDialog}
        formatTime={formatTime}
      />

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

      {/* 编辑交易结果 */}
      <Dialog
        open={resultDialogOpen}
        onOpenChange={open => {
          setResultDialogOpen(open);
          if (!open) {
            setTradeToEdit(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑交易结果</DialogTitle>
            <DialogDescription>
              为真实交易设置输赢结果，系统会根据您输入的平仓价格结算该订单。
            </DialogDescription>
          </DialogHeader>

          {tradeToEdit ? (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span>订单号</span>
                  <span className="font-medium">{tradeToEdit.orderNumber}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>资产</span>
                  <span>{tradeToEdit.assetType}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>方向</span>
                  <span>{tradeToEdit.direction}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>下注金额</span>
                  <span>
                    $
                    {typeof tradeToEdit.investAmount === 'number'
                      ? tradeToEdit.investAmount.toFixed(2)
                      : Number(tradeToEdit.investAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>结果</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={resultForm.outcome === 'WIN' ? 'default' : 'outline'}
                    onClick={() => handleOutcomeToggle('WIN')}
                  >
                    胜利 (WIN)
                  </Button>
                  <Button
                    type="button"
                    variant={resultForm.outcome === 'LOSE' ? 'default' : 'outline'}
                    onClick={() => handleOutcomeToggle('LOSE')}
                  >
                    失败 (LOSE)
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exit-price">平仓价格</Label>
                <Input
                  id="exit-price"
                  type="number"
                  step="0.0001"
                  value={resultForm.exitPrice}
                  onChange={event =>
                    setResultForm(prev => ({ ...prev, exitPrice: event.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  将根据平仓价格与入场价格的关系自动判定输赢结果。您可根据市场实际情况调整此数值。
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResultDialogOpen(false);
                setTradeToEdit(null);
              }}
              disabled={isSubmittingResult}
            >
              取消
            </Button>
            <Button type="button" onClick={handleSubmitResult} disabled={isSubmittingResult}>
              {isSubmittingResult ? '保存中...' : '保存结果'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ActiveRealTradesSectionProps {
  trades: Transaction[];
  isLoading: boolean;
  onRefresh: () => void;
  onEdit: (trade: Transaction) => void;
  formatTime: (dateString: string) => string;
}

const ActiveRealTradesSection = memo(
  ({ trades, isLoading, onRefresh, onEdit, formatTime }: ActiveRealTradesSectionProps) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>进行中的真实交易</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            仅展示账号类型为 REAL 且状态为 PENDING 的订单
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{trades.length} 条</Badge>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载真实交易中...</div>
        ) : trades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">暂无进行中的真实交易</div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>入场时间</TableHead>
                  <TableHead>下注金额</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map(trade => (
                  <TableRow key={trade.id}>
                    <TableCell>
                      <div className="font-medium">{trade.userName || '-'}</div>
                    </TableCell>
                    <TableCell className="text-sm">{formatTime(trade.entryTime)}</TableCell>
                    <TableCell>
                      ${typeof trade.investAmount === 'number'
                        ? trade.investAmount.toFixed(2)
                        : Number(trade.investAmount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm">{formatTime(trade.expiryTime)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onEdit(trade)}>
                        编辑结果
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
);

ActiveRealTradesSection.displayName = 'ActiveRealTradesSection';
