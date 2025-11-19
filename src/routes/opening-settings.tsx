/**
 * Opening Settings Page
 * 開盤設置頁面
 */

import { useState, useCallback, useEffect, memo, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, Play, Square, Trash2, Edit, RefreshCw, AlertTriangle } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

export function OpeningSettingsPage() {
  const navigate = useNavigate();
  const { api, tokens, user } = useAuth();
  const { toast } = useToast();
  const accessToken = tokens?.accessToken ?? null;
  const adminId = user?.id ?? null;

  const [sessions, setSessions] = useState<MarketSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
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
  const [hideOrderNumber, setHideOrderNumber] = useState(true);
  const [quickUpdatingIds, setQuickUpdatingIds] = useState<Set<string>>(new Set());
  const [globalOutcomeControl, setGlobalOutcomeControl] =
    useState<'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE' | 'RANDOM'>('INDIVIDUAL');
  const [confirmGlobalOpen, setConfirmGlobalOpen] = useState(false);
  const [pendingGlobalMode, setPendingGlobalMode] =
    useState<'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE' | 'RANDOM' | null>(null);
  const [desiredOutcomes, setDesiredOutcomes] = useState<Record<string, 'WIN' | 'LOSE'>>({});
  const [recentFinished, setRecentFinished] = useState<Transaction[]>([]);

  const allowedStatuses = new Set<MarketSessionStatus>(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELED']);
  const filterActiveTrades = useCallback(
    (trades: Transaction[]) =>
      trades.filter(trade => trade.accountType === 'REAL' && trade.status === 'PENDING'),
    []
  );

  // 獲取大盤列表
  const fetchSessions = useCallback(async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const params: GetMarketSessionsParams = {
        page: currentPage,
        limit: 20
      };
      if (statusFilter === 'ACTIVE') {
        params.status = 'ACTIVE';
      }

      const response = await marketSessionService.admin.getSessions(api, params);
      const all = (response.marketSessions || []).filter(session => allowedStatuses.has(session.status));
      const filtered =
        statusFilter === 'ACTIVE'
          ? all.filter(s => s.status === 'ACTIVE')
          : all.filter(s => s.status !== 'ACTIVE');
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
        title: '錯誤',
        description: error.response?.data?.message || '取得大盤列表失敗',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, currentPage, statusFilter, toast]);

  // 獨立取得 ACTIVE 大盤數量，避免因列表篩選造成提示橫幅閃爍
  const fetchActiveCount = useCallback(async () => {
    if (!api) return;
    try {
      const resp = await marketSessionService.admin.getSessions(api, { status: 'ACTIVE', page: 1, limit: 1 });
      const list = resp.marketSessions || [];
      setActiveCount(list.length);
    } catch (e) {
      // 靜默失敗，不影響主流程
    }
  }, [api]);

  useEffect(() => {
    fetchSessions();
    fetchActiveCount();
  }, [fetchSessions, fetchActiveCount]);

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
        title: '錯誤',
        description: error.response?.data?.message || '取得真實交易失敗',
        variant: 'destructive'
      });
    } finally {
      setIsTradeLoading(false);
    }
  }, [api, toast, filterActiveTrades]);

  useEffect(() => {
    fetchActiveTrades();
  }, [fetchActiveTrades]);

  // 每秒輪詢更新真實交易（避免閃爍：不切換 loading、只做差異更新）
  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const response = await transactionService.list(api, {
          page: 1,
          limit: 100,
          status: 'PENDING',
          accountType: 'REAL'
        });
        const incoming = filterActiveTrades(response.data || []);
        // 收集本輪「已到期」但仍在 PENDING 列表中的訂單，放到本地已結束池
        const nowTsCollect = Date.now();
        const justFinished = incoming.filter(t => new Date(t.expiryTime).getTime() - nowTsCollect <= 0);
        if (justFinished.length > 0) {
          setRecentFinished(prev => {
            const map = new Map(prev.map(x => [x.id, x]));
            for (const t of justFinished) {
              map.set(t.id, t);
            }
            // 依到期時間倒序輸出，最多保留 200 筆
            const merged = Array.from(map.values()).sort((a, b) => {
              return new Date(b.expiryTime).getTime() - new Date(a.expiryTime).getTime();
            });
            return merged.slice(0, 200);
          });
        }
        // 差異合併，避免整表閃爍
        setActiveRealTrades(prev => {
          // 建立映射以便比對
          const prevMap = new Map(prev.map(t => [t.id, t]));
          const nextList: Transaction[] = [];
          let changed = prev.length !== incoming.length;
          // 保持時間倒序（與交易流水一致的直覺）
          const sortedIncoming = [...incoming].sort((a, b) => {
            const at = new Date(a.entryTime).getTime();
            const bt = new Date(b.entryTime).getTime();
            return bt - at;
          });
          for (const t of sortedIncoming) {
            const old = prevMap.get(t.id);
            if (!old) {
              changed = true;
              nextList.push(t);
              continue;
            }
            // 針對會顯示的欄位做淺比較，若一致則沿用舊引用，避免不必要重繪
            const same =
              old.orderNumber === t.orderNumber &&
              old.userName === t.userName &&
              old.assetType === t.assetType &&
              old.direction === t.direction &&
              old.accountType === t.accountType &&
              Number(old.entryPrice) === Number(t.entryPrice) &&
              Number(old.investAmount) === Number(t.investAmount) &&
              old.entryTime === t.entryTime &&
              old.expiryTime === t.expiryTime;
            nextList.push(same ? old : t);
            if (!same) changed = true;
          }
          if (!changed) return prev;
          return nextList;
        });
        // 自動結算：到期時依照 switch 設定結算
        const nowTs = Date.now();
        for (const t of incoming) {
          const remain = new Date(t.expiryTime).getTime() - nowTs;
          if (remain <= 0 && !quickUpdatingIds.has(t.id)) {
            try {
              setQuickUpdatingIds(prev => new Set(prev).add(t.id));
              const outcome = desiredOutcomes[t.id] || 'WIN';
              const exit = computeExitPrice(t, outcome);
              const socket = tradingSocketRef.current;
              if (socket) {
                await socket.forceSettle(t.id, exit);
              } else {
                await transactionService.settle(api, t.orderNumber, { exitPrice: exit });
              }
            } catch (e) {
              console.error('Auto settle failed', e);
            } finally {
              setQuickUpdatingIds(prev => {
                const next = new Set(prev);
                next.delete(t.id);
                return next;
              });
            }
          }
        }
      } catch {
        // 靜默失敗，避免干擾使用者；有 socket 時依賴 socket 更新
      }
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [api, filterActiveTrades, desiredOutcomes]);

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
        title: '交易監控錯誤',
        description: error?.message || '即時交易連線出現問題',
        variant: 'destructive'
      });
    });

    const offConnectError = socket.on('connect_error', err => {
      toast({
        title: '交易監控連線失敗',
        description: err?.message || '請稍後再試',
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
        title: '錯誤',
        description: '請輸入有效的平倉價格',
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
        throw new Error('目前無法連線交易服務');
      }
      toast({
        title: '成功',
        description: '交易結果已更新'
      });
      setResultDialogOpen(false);
      setTradeToEdit(null);
      fetchActiveTrades();
    } catch (error: any) {
      console.error('Failed to settle trade:', error);
      const message = error?.response?.data?.message || error?.message || '更新交易結果失敗';
      toast({
        title: '錯誤',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingResult(false);
    }
  };

  // 全局輸贏控制（作用於所有倒數中的訂單）
  const applyGlobalOutcomeControl = async (mode: typeof globalOutcomeControl) => {
    if (!mode || mode === 'INDIVIDUAL') return;
    const nowTs = Date.now();
    const targets = activeRealTrades.filter(t => new Date(t.expiryTime).getTime() - nowTs > 0);
    setDesiredOutcomes(prev => {
      const next = { ...prev };
      for (const t of targets) {
        next[t.id] =
          mode === 'ALL_WIN' ? 'WIN' :
          mode === 'ALL_LOSE' ? 'LOSE' :
          Math.random() < 0.5 ? 'WIN' : 'LOSE';
      }
      return next;
    });
  };

  // 設定單筆期望輸贏（不立即結算，到期時依設定自動結算）
  const handleQuickSetOutcome = async (trade: Transaction, outcome: 'WIN' | 'LOSE') => {
    setDesiredOutcomes(prev => ({ ...prev, [trade.id]: outcome }));
    toast({
      title: '已設定',
      description: `此訂單將在到期時結算為${outcome === 'WIN' ? '贏' : '輸'}`
    });
  };

  // 開啟大盤
  const handleStartSession = async (session: MarketSession) => {
    if (!api) return;

    // 僅允許同時一個進行中的大盤
    const alreadyActive = sessions.some(s => s.status === 'ACTIVE' && s.id !== session.id);
    if (alreadyActive) {
      toast({
        title: '無法開啟',
        description: '已有進行中的大盤，請先關閉後再開啟另一個大盤',
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await marketSessionService.admin.startSession(api, session.id);
      toast({
        title: '成功',
        description: `大盤已開啟，建立了 ${result.subMarketsCreated} 個小盤`
      });
      fetchSessions();
    } catch (error: any) {
      console.error('Failed to start session:', error);
      toast({
        title: '錯誤',
        description: error.response?.data?.message || '開啟大盤失敗',
        variant: 'destructive'
      });
    }
  };

  // 關閉大盤
  const handleStopSession = async (session: MarketSession) => {
    if (!api) return;

    if (!confirm(`確定要關閉大盤「${session.name}」嗎？`)) {
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
        title: '錯誤',
        description: error.response?.data?.message || '關閉大盤失敗',
        variant: 'destructive'
      });
    }
  };

  // 刪除大盤
  const handleDeleteSession = async (session: MarketSession) => {
    if (!api) return;

    if (!confirm(`確定要刪除大盤「${session.name}」嗎？此操作不可恢復。`)) {
      return;
    }

    try {
      await marketSessionService.admin.deleteSession(api, session.id);
      toast({
        title: '成功',
        description: '大盤已刪除'
      });
      fetchSessions();
    } catch (error: any) {
      console.error('Failed to delete session:', error);
      toast({
        title: '錯誤',
        description: error.response?.data?.message || '刪除大盤失敗',
        variant: 'destructive'
      });
    }
  };

  // 編輯大盤
  const handleEditSession = (session: MarketSession) => {
    setSelectedSession(session);
    setIsEditDialogOpen(true);
  };

  // 新建大盤
  const handleCreateSession = () => {
    setSelectedSession(null);
    setIsEditDialogOpen(true);
  };

  // 獲取狀態標籤
  const getStatusBadge = (status: MarketSessionStatus) => {
    const variants: Record<MarketSessionStatus, { variant: any; label: string }> = {
      PENDING: { variant: 'secondary', label: '待開盤' },
      ACTIVE: { variant: 'default', label: '進行中' },
      COMPLETED: { variant: 'outline', label: '已完成' },
      CANCELED: { variant: 'destructive', label: '已取消' }
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 格式化時間
  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">開盤設置</h1>
          <p className="text-muted-foreground mt-2">管理進行中的訂單並控制玩家輸贏</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-muted-foreground">全局輸贏控制</span>
            <Select
              value={globalOutcomeControl}
              onValueChange={(val: any) => {
                if (val === 'INDIVIDUAL') {
                  setGlobalOutcomeControl('INDIVIDUAL');
                  return;
                }
                setPendingGlobalMode(val);
                setConfirmGlobalOpen(true);
              }}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="個別控制" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_LOSE">全輸（全部關閉）</SelectItem>
                <SelectItem value="ALL_WIN">全贏（全部開啟）</SelectItem>
                <SelectItem value="RANDOM">隨機</SelectItem>
                <SelectItem value="INDIVIDUAL">個別控制</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { fetchSessions(); fetchActiveCount(); }} variant="outline" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            重新整理
          </Button>
          <Button onClick={handleCreateSession}>
            <Plus className="w-4 h-4 mr-2" />
            建立大盤
        </Button>
        </div>
      </div>

      {/* 待開盤頁籤下方、標題區域下的固定提醒橫幅 */}
      {statusFilter === 'PENDING' && activeCount > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            目前已有進行中的大盤。同時間僅能啟用一個大盤。
          </span>
        </div>
      )}

      {/* 大盤列表 */}
          <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>大盤列表 ({pagination.total})</CardTitle>
          </div>
          {/* 橫幅改移至標題下方固定區域，避免在列表內閃爍 */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter(prev => (prev === 'PENDING' ? undefined : 'PENDING'));
                setCurrentPage(1);
              }}
              size="sm"
            >
              待開盤
            </Button>
            <Button
              variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter(prev => (prev === 'ACTIVE' ? undefined : 'ACTIVE'));
                setCurrentPage(1);
              }}
              size="sm"
            >
              進行中
            </Button>
          </div>
            </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">載入中...</div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暫無資料</div>
          ) : (
            <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                    <TableHead>名稱</TableHead>
                    <TableHead className="w-[120px]">進行中訂單</TableHead>
                    <TableHead className="w-[120px]">已結束訂單</TableHead>
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
                      <TableCell className="w-[120px]">0</TableCell>
                      <TableCell className="w-[120px]">0</TableCell>
                      <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate({ to: '/opening-settings/$sessionId', params: { sessionId: session.id } })}
                                >
                                  查看訂單
                                </Button>
                          {session.status !== 'ACTIVE' && (
                            <>
                                <Button
                                  variant="outline"
                                size="sm"
                                onClick={() => handleStartSession(session)}
                                disabled={sessions.some(s => s.status === 'ACTIVE')}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                開啟
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
                              關閉
                            </Button>
                          )}
                      </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                    </div>
                  )}

          {/* 分頁 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                共 {pagination.total} 筆，第 {pagination.page} / {pagination.totalPages} 頁
                                </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={currentPage <= 1}
                >
                  上一頁
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= pagination.totalPages}
                >
                  下一頁
                </Button>
                              </div>
                                        </div>
                            )}
                          </CardContent>
                          </Card>

      {statusFilter === 'ACTIVE' && (
        <ActiveRealTradesSection
          trades={activeRealTrades}
          finishedTrades={recentFinished}
          isLoading={isTradeLoading}
          onRefresh={fetchActiveTrades}
          onEdit={handleOpenResultDialog}
          formatTime={formatTime}
          hideOrderNumber={hideOrderNumber}
          onToggleHideOrderNumber={() => setHideOrderNumber(prev => !prev)}
          onQuickSetOutcome={handleQuickSetOutcome}
          quickUpdatingIds={quickUpdatingIds}
          sessionName={sessions.find(s => s.status === 'ACTIVE')?.name}
          desiredOutcomes={desiredOutcomes}
          setDesiredOutcomes={setDesiredOutcomes}
        />
      )}

      {/* 編輯/建立對話框 */}
      <EditMarketSessionDialog
        session={selectedSession}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          setIsEditDialogOpen(false);
          fetchSessions();
        }}
      />

      {/* 編輯交易結果 */}
      <Dialog
        open={confirmGlobalOpen}
        onOpenChange={(open) => {
          setConfirmGlobalOpen(open);
          if (!open) setPendingGlobalMode(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>套用全局輸贏控制</DialogTitle>
            <DialogDescription>
              此操作將批次套用到所有仍在倒數中的訂單。是否確認執行？
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm">
            模式：{pendingGlobalMode === 'ALL_WIN' ? '全贏' : pendingGlobalMode === 'ALL_LOSE' ? '全輸' : pendingGlobalMode === 'RANDOM' ? '隨機' : '個別控制'}
          </div>
          <DialogFooter className="sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmGlobalOpen(false);
                setPendingGlobalMode(null);
                // 回復顯示為個別控制，避免造成誤解
                setGlobalOutcomeControl('INDIVIDUAL');
              }}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                const mode = pendingGlobalMode || 'INDIVIDUAL';
                setConfirmGlobalOpen(false);
                setGlobalOutcomeControl(mode as any);
                await applyGlobalOutcomeControl(mode as any);
              }}
              disabled={!pendingGlobalMode || pendingGlobalMode === 'INDIVIDUAL'}
            >
              確認套用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>編輯交易結果</DialogTitle>
            <DialogDescription>
              為真實交易設定輸贏結果，系統會根據您輸入的平倉價格結算該訂單。
            </DialogDescription>
          </DialogHeader>

          {tradeToEdit ? (
          <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span>訂單號</span>
                  <span className="font-medium">{tradeToEdit.orderNumber}</span>
            </div>
                <div className="flex justify-between mt-1">
                  <span>資產</span>
                  <span>{tradeToEdit.assetType}</span>
            </div>
                <div className="flex justify-between mt-1">
                  <span>方向</span>
                  <span>{tradeToEdit.direction}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>下注金額</span>
                  <span>
                    $
                    {typeof tradeToEdit.investAmount === 'number'
                      ? tradeToEdit.investAmount.toFixed(2)
                      : Number(tradeToEdit.investAmount || 0).toFixed(2)}
                  </span>
                </div>
            </div>

              <div className="space-y-2">
                <Label>結果</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={resultForm.outcome === 'WIN' ? 'default' : 'outline'}
                    onClick={() => handleOutcomeToggle('WIN')}
                  >
                    勝利 (WIN)
                  </Button>
                  <Button
                    type="button"
                    variant={resultForm.outcome === 'LOSE' ? 'default' : 'outline'}
                    onClick={() => handleOutcomeToggle('LOSE')}
                  >
                    失敗 (LOSE)
                  </Button>
              </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="exit-price">平倉價格</Label>
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
                  將根據平倉價格與入場價格的關係自動判定輸贏結果。您可根據市場實際情況調整此數值。
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
              {isSubmittingResult ? '儲存中...' : '儲存結果'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ActiveRealTradesSectionProps {
  trades: Transaction[];
  finishedTrades: Transaction[];
  isLoading: boolean;
  onRefresh: () => void;
  onEdit: (trade: Transaction) => void;
  formatTime: (dateString: string) => string;
  hideOrderNumber: boolean;
  onToggleHideOrderNumber: () => void;
  onQuickSetOutcome: (trade: Transaction, outcome: 'WIN' | 'LOSE') => void;
  quickUpdatingIds: Set<string>;
  sessionName?: string;
  desiredOutcomes: Record<string, 'WIN' | 'LOSE'>;
  setDesiredOutcomes: React.Dispatch<React.SetStateAction<Record<string, 'WIN' | 'LOSE'>>>;
}

const ActiveRealTradesSection = memo(
  ({ trades, finishedTrades, isLoading, onRefresh, onEdit, formatTime, hideOrderNumber, onToggleHideOrderNumber, onQuickSetOutcome, quickUpdatingIds, sessionName, desiredOutcomes, setDesiredOutcomes }: ActiveRealTradesSectionProps) => {
    const [now, setNow] = useState<number>(() => Date.now());
    const [durationFilter, setDurationFilter] =
      useState<'ALL' | 30 | 60 | 90 | 120 | 150 | 180 | 'FINISHED'>('ALL');
    const [outcomeControl, setOutcomeControl] =
      useState<'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE' | 'RANDOM'>('INDIVIDUAL');

    useEffect(() => {
      const t = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(t);
    }, []);

    const getRemainingSeconds = (expiryTime?: string | null) => {
      if (!expiryTime) return 0;
      const diff = new Date(expiryTime).getTime() - now;
      return Math.max(0, Math.floor(diff / 1000));
    };

    const getDurationSeconds = (entryTime?: string | null, expiryTime?: string | null) => {
      if (!entryTime || !expiryTime) return 0;
      const diff = new Date(expiryTime).getTime() - new Date(entryTime).getTime();
      return Math.max(0, Math.round(diff / 1000));
    };

    const allowedDurations = [30, 60, 90, 120, 150, 180] as const;

    const filteredTrades =
      durationFilter === 'FINISHED'
        ? [...finishedTrades].sort(
            (a, b) =>
              new Date(b.expiryTime).getTime() - new Date(a.expiryTime).getTime()
          )
        : trades.filter(trade => {
            const remain = getRemainingSeconds(trade.expiryTime);
            const dur = getDurationSeconds(trade.entryTime, trade.expiryTime);
            if (durationFilter === 'ALL') {
              return remain > 0;
            }
            return remain > 0 && dur === durationFilter;
          });

    const applyOutcomeControl = (mode: typeof outcomeControl) => {
      if (mode === 'INDIVIDUAL') return;
      const targets = filteredTrades.filter(t => getRemainingSeconds(t.expiryTime) > 0);
      setDesiredOutcomes(prev => {
        const next = { ...prev };
        for (const t of targets) {
          next[t.id] =
            mode === 'ALL_WIN' ? 'WIN' :
            mode === 'ALL_LOSE' ? 'LOSE' :
            Math.random() < 0.5 ? 'WIN' : 'LOSE';
        }
        return next;
      });
    };

    return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{sessionName ? `「${sessionName}」交易流水` : '交易流水'}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              查看並控制該大盤的進行中訂單與歷史訂單
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
              <Checkbox checked={hideOrderNumber} onCheckedChange={onToggleHideOrderNumber} />
              隱藏訂單號
            </label>
            <Badge variant="outline">{filteredTrades.length} 筆</Badge>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              重新整理
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={durationFilter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setDurationFilter('ALL')}
            >
              全部
            </Button>
            {allowedDurations.map(sec => (
              <Button
                key={sec}
                size="sm"
                variant={durationFilter === sec ? 'default' : 'outline'}
                onClick={() => setDurationFilter(sec)}
              >
                {sec}s
              </Button>
            ))}
            <Button
              size="sm"
              variant={durationFilter === 'FINISHED' ? 'default' : 'outline'}
              onClick={() => setDurationFilter('FINISHED')}
            >
              已結束
            </Button>
          </div>
          {durationFilter !== 'FINISHED' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">輸贏控制</span>
              <Select
                value={outcomeControl}
                onValueChange={async (val: any) => {
                  setOutcomeControl(val);
                  await applyOutcomeControl(val);
                }}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="個別控制" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_LOSE">全輸</SelectItem>
                  <SelectItem value="ALL_WIN">全贏</SelectItem>
                  <SelectItem value="RANDOM">隨機</SelectItem>
                  <SelectItem value="INDIVIDUAL">個別控制</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">載入真實交易中...</div>
        ) : trades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">暫無進行中的真實交易</div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {!hideOrderNumber && <TableHead>訂單號</TableHead>}
                  <TableHead>用戶</TableHead>
                  <TableHead>交易對</TableHead>
                  <TableHead>方向</TableHead>
                  <TableHead>下注秒數</TableHead>
                  <TableHead>入場價</TableHead>
                  <TableHead>投資金額</TableHead>
                  <TableHead>入場時間</TableHead>
                  <TableHead>到期時間</TableHead>
                  <TableHead className="text-right">輸 → 贏</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map(trade => (
                  <TableRow key={trade.id}>
                    {!hideOrderNumber && (
                      <TableCell className="font-mono text-sm">{trade.orderNumber}</TableCell>
                    )}
                    <TableCell className="font-medium">{trade.userName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{trade.assetType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={trade.direction === 'CALL' ? 'success' : 'destructive'} className="whitespace-nowrap">
                        {trade.direction === 'CALL' ? '看漲' : '看跌'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getDurationSeconds(trade.entryTime, trade.expiryTime)}s</TableCell>
                    <TableCell className="font-medium">
                      ${typeof trade.entryPrice === 'number'
                        ? trade.entryPrice.toFixed(2)
                        : Number(trade.entryPrice || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${typeof trade.investAmount === 'number'
                        ? trade.investAmount.toFixed(2)
                        : Number(trade.investAmount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm">{formatTime(trade.entryTime)}</TableCell>
                    <TableCell className="text-sm">
                      {formatTime(trade.expiryTime)}
                      <span className="ml-2 text-xs text-muted-foreground">
                        （倒數：{getRemainingSeconds(trade.expiryTime)} 秒）
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">輸</span>
                        <Switch
                          disabled={quickUpdatingIds.has(trade.id)}
                          checked={(desiredOutcomes[trade.id] || 'LOSE') === 'WIN'}
                          onCheckedChange={(checked) => {
                            setOutcomeControl('INDIVIDUAL');
                            setDesiredOutcomes(prev => ({ ...prev, [trade.id]: checked ? 'WIN' : 'LOSE' }));
                          }}
                          aria-label="切換輸贏"
                        />
                        <span className="text-xs text-muted-foreground">贏</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ActiveRealTradesSection.displayName = 'ActiveRealTradesSection';
