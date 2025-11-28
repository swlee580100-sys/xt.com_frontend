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
import marketSessionService from '@/services/market-sessions';
import { transactionService } from '@/services/transactions';
import TradeUpdatesSocket from '@/services/trade-updates';
import type { AxiosInstance } from 'axios';
import { MarketSessionStatus } from '@/types/market-session';
import type {
  MarketSession,
  GetMarketSessionsParams
} from '@/types/market-session';
import type { Transaction } from '@/types/transaction';
import { EditMarketSessionDialog } from '@/components/market-sessions/edit-market-session-dialog';
import { cn } from '@/lib/utils';
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
  const [allSessions, setAllSessions] = useState<MarketSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [selectedSession, setSelectedSession] = useState<MarketSession | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // 三分頁：待開盤(PENDING) / 進行中(ACTIVE) / 已閉盤(CLOSED = COMPLETED + CANCELED)
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ACTIVE' | 'CLOSED'>('ACTIVE');
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
  const [resultForm, setResultForm] = useState<{ outcome: 'WIN' | 'LOSE'; exitPrice: string }>({ outcome: 'WIN', exitPrice: '' });
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const tradingSocketRef = useRef<TradeUpdatesSocket | null>(null);
  const [hideOrderNumber, setHideOrderNumber] = useState(true);
  const [quickUpdatingIds, setQuickUpdatingIds] = useState<Set<string>>(new Set());
  const [globalOutcomeControl, setGlobalOutcomeControl] =
    useState<'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE' | 'RANDOM'>('INDIVIDUAL');
  const [confirmGlobalOpen, setConfirmGlobalOpen] = useState(false);
  const [pendingGlobalMode, setPendingGlobalMode] =
    useState<'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE' | 'RANDOM' | null>(null);
  // 從 localStorage 恢復控制輸贏設定
  const loadDesiredOutcomesFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem('opening-settings-desired-outcomes');
      if (stored) {
        const parsed = JSON.parse(stored);
        // 只保留有效的數據（確保格式正確）
        const valid: Record<string, 'WIN' | 'LOSE'> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (value === 'WIN' || value === 'LOSE') {
            valid[key] = value;
          }
        }
        return valid;
      }
    } catch (error) {
      console.error('Failed to load desired outcomes from storage:', error);
    }
    return {};
  }, []);

  const [desiredOutcomes, setDesiredOutcomes] = useState<Record<string, 'WIN' | 'LOSE'>>(() => loadDesiredOutcomesFromStorage());
  const [recentFinished, setRecentFinished] = useState<Transaction[]>([]);
  const activeRealTradesRef = useRef<Transaction[]>([]);
  const desiredOutcomesRef = useRef<Record<string, 'WIN' | 'LOSE'>>({});
  const quickUpdatingIdsRef = useRef<Set<string>>(new Set());
  // Switch 切換防抖定時器
  const switchDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // 後端訂單統計（若接口可用）：sessionId -> { pendingCount, settledCount }
  const [orderStats, setOrderStats] = useState<Record<string, { pendingCount: number; settledCount: number }>>({});

  const mapResultToControl = useCallback(
    (result?: any): 'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE' | 'RANDOM' => {
      if (result === 'WIN') return 'ALL_WIN';
      if (result === 'LOSE') return 'ALL_LOSE';
      return 'INDIVIDUAL';
    },
    []
  );
  // 僅在首次進入頁面時同步一次全局輸贏控制
  const hasSyncedGlobalOnceRef = useRef(false);

  const allowedStatuses = new Set<MarketSessionStatus>([MarketSessionStatus.PENDING, MarketSessionStatus.ACTIVE, MarketSessionStatus.COMPLETED, MarketSessionStatus.CANCELED]);
  const filterActiveTrades = useCallback(
    (trades: Transaction[]) =>
      trades.filter(trade => trade.accountType === 'REAL' && trade.status === 'PENDING'),
    []
  );

  useEffect(() => {
    activeRealTradesRef.current = activeRealTrades;
  }, [activeRealTrades]);

  useEffect(() => {
    desiredOutcomesRef.current = desiredOutcomes;
    // 保存到 localStorage
    try {
      localStorage.setItem('opening-settings-desired-outcomes', JSON.stringify(desiredOutcomes));
    } catch (error) {
      console.error('Failed to save desired outcomes to storage:', error);
    }
  }, [desiredOutcomes]);

  useEffect(() => {
    quickUpdatingIdsRef.current = quickUpdatingIds;
  }, [quickUpdatingIds]);

  // 獲取大盤列表
  const fetchSessions = useCallback(async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const params: GetMarketSessionsParams = { page: currentPage, limit: 20 };
      // 伺服器僅支援 PENDING/ACTIVE/COMPLETED/CANCELED 四種狀態；「已閉盤」改由前端合併 COMPLETED + CANCELED
      if (statusFilter === 'PENDING' || statusFilter === 'ACTIVE') {
        params.status = statusFilter as unknown as MarketSessionStatus;
      }

      const response = await marketSessionService.admin.getSessions(api, params);
      const all = (response.marketSessions || []).filter(session => allowedStatuses.has(session.status));
      setAllSessions(all);
      const filtered =
        statusFilter === 'ACTIVE'
          ? all.filter(s => s.status === 'ACTIVE')
          : statusFilter === 'PENDING'
            ? all.filter(s => s.status === 'PENDING')
            : all.filter(s => s.status === 'COMPLETED' || s.status === 'CANCELED');
      setSessions(filtered);
      // 僅在首次進入頁面時，依當前進行中的大盤「預設輸贏結果」同步一次全局輸贏控制
      if (!hasSyncedGlobalOnceRef.current) {
        const active = all.find(s => s.status === 'ACTIVE');
        if (active?.initialResult) {
          setGlobalOutcomeControl(mapResultToControl(active.initialResult));
        }
        hasSyncedGlobalOnceRef.current = true;
      }
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

  // 依本地交易建立「進行中訂單數 / 已結束訂單數」映射（僅做前端估算，當後端 stats 可用時會被覆蓋）
  const getRemainingMs = (expiry?: string | null) =>
    expiry ? new Date(expiry).getTime() - Date.now() : -1;
  const activeCountMap = new Map<string, number>();
  for (const t of activeRealTrades) {
    const sid = (t as any).marketSessionId as string | undefined;
    if (!sid) continue;
    const isActive = t.status === 'PENDING' && getRemainingMs(t.expiryTime) > 0;
    if (!isActive) continue;
    activeCountMap.set(sid, (activeCountMap.get(sid) || 0) + 1);
  }
  const finishedCountMap = new Map<string, number>();
  for (const t of recentFinished) {
    const sid = (t as any).marketSessionId as string | undefined;
    if (!sid) continue;
    finishedCountMap.set(sid, (finishedCountMap.get(sid) || 0) + 1);
  }

  // 後端統計接口已移除，使用本地計數和 fetchSessionTransactions 獲取的數據

  // 為每個大盤獲取交易數據（進行中和已結束）
  const fetchSessionTransactions = useCallback(async (sessionId: string) => {
    if (!api) return { pending: [], settled: [] };
    try {
      // 獲取進行中的交易
      const pendingResponse = await transactionService.list(api, {
        page: 1,
        limit: 1000,
        marketSessionId: sessionId,
        status: 'PENDING',
        accountType: 'REAL'
      });

      // 獲取已結束的交易
      const settledResponse = await transactionService.list(api, {
        page: 1,
        limit: 1000,
        marketSessionId: sessionId,
        status: 'SETTLED',
        accountType: 'REAL'
      });

      return {
        pending: pendingResponse.data || [],
        settled: settledResponse.data || []
      };
    } catch (error: any) {
      console.error(`Failed to fetch transactions for session ${sessionId}:`, error);
      return { pending: [], settled: [] };
    }
  }, [api]);

  // 在「進行中」和「已閉盤」tab下，為每個大盤獲取交易數據並更新統計
  useEffect(() => {
    if (!api || sessions.length === 0 || (statusFilter !== 'ACTIVE' && statusFilter !== 'CLOSED')) return;

    (async () => {
      const sessionTransactionsMap: Record<string, { pending: Transaction[]; settled: Transaction[] }> = {};

      // 並行獲取所有大盤的交易數據
      await Promise.all(
        sessions.map(async (session) => {
          const transactions = await fetchSessionTransactions(session.id);
          sessionTransactionsMap[session.id] = transactions;
        })
      );

      // 更新訂單統計（覆蓋後端統計）
      const newStats: Record<string, { pendingCount: number; settledCount: number }> = {};
      for (const [sessionId, transactions] of Object.entries(sessionTransactionsMap)) {
        newStats[sessionId] = {
          pendingCount: transactions.pending.length,
          settledCount: transactions.settled.length
        };
      }
      setOrderStats(prev => ({ ...prev, ...newStats }));

      // 更新交易列表（僅在「進行中」tab下更新進行中交易，用於下方交易列表顯示）
      if (statusFilter === 'ACTIVE') {
        const allPending: Transaction[] = [];
        const allSettled: Transaction[] = [];
        for (const transactions of Object.values(sessionTransactionsMap)) {
          allPending.push(...transactions.pending);
          allSettled.push(...transactions.settled);
        }
        // 合併到現有列表中，避免覆蓋 Socket 實時更新的數據
        setActiveRealTrades(prev => {
          const map = new Map(prev.map(t => [t.id, t]));
          for (const t of allPending) {
            map.set(t.id, t);
          }
          return Array.from(map.values());
        });
        setRecentFinished(prev => {
          const map = new Map(prev.map(t => [t.id, t]));
          for (const t of allSettled) {
            map.set(t.id, t);
          }
          return Array.from(map.values());
        });
      } else if (statusFilter === 'CLOSED') {
        // 在「已閉盤」tab下，只更新已結束的交易
        const allSettled: Transaction[] = [];
        for (const transactions of Object.values(sessionTransactionsMap)) {
          allSettled.push(...transactions.settled);
        }
        setRecentFinished(allSettled);
      }
    })();
  }, [api, sessions, statusFilter, fetchSessionTransactions]);

  const computeExitPrice = (trade: Transaction, outcome: 'WIN' | 'LOSE'): number => {
    const base = trade.entryPrice;
    const delta = Math.max(0.0001, Math.abs(trade.spread || 0) || Math.max(0.5, base * 0.001));
    if (trade.direction === 'CALL') {
      return outcome === 'WIN' ? base + delta : base - delta;
    }
    return outcome === 'WIN' ? base - delta : base + delta;
  };

  const fetchActiveTrades = useCallback(async (options?: { silent?: boolean }) => {
    if (!api) return;
    try {
      if (!options?.silent) {
        setIsTradeLoading(true);
      }
      const response = await transactionService.list(api, {
        page: 1,
        limit: 100,
        status: 'PENDING',
        accountType: 'REAL'
      });
      const list = filterActiveTrades(response.data || []);
      setActiveRealTrades(list);

      // 先從 localStorage 恢復已設定的控制輸贏（不覆蓋已存在的設定）
      setDesiredOutcomes(prev => {
        // 從 localStorage 加載已保存的設定
        const stored = loadDesiredOutcomesFromStorage();
        // 合併：優先使用當前狀態，然後合併存儲的數據
        const next = { ...stored, ...prev };

        // 依據當前全局控制，為尚未設定期望值的新訂單套預設（不覆蓋已設定）
        const mode = globalOutcomeControl;
        if (mode !== 'INDIVIDUAL') {
          const now = Date.now();
          for (const t of list) {
            if (next[t.id]) continue; // 不覆蓋已設定的
            const remain = new Date(t.expiryTime).getTime() - now;
            if (remain <= 0) continue;
            next[t.id] =
              mode === 'ALL_WIN' ? 'WIN' :
                mode === 'ALL_LOSE' ? 'LOSE' :
                  Math.random() < 0.5 ? 'WIN' : 'LOSE';
          }
        }
        return next;
      });
    } catch (error: any) {
      console.error('Failed to fetch real trades:', error);
      toast({
        title: '錯誤',
        description: error.response?.data?.message || '取得真實交易失敗',
        variant: 'destructive'
      });
    } finally {
      if (!options?.silent) {
        setIsTradeLoading(false);
      }
    }
  }, [api, toast, filterActiveTrades, globalOutcomeControl, loadDesiredOutcomesFromStorage]);

  useEffect(() => {
    fetchActiveTrades();
  }, [fetchActiveTrades]);

  // 轮询定时器：定期刷新交易数据
  useEffect(() => {
    // 只在"进行中"标签下启用轮询
    if (statusFilter !== 'ACTIVE' || !api) return;

    // 初始获取一次
    fetchActiveTrades({ silent: true });

    // 设置轮询间隔（3秒）
    const pollInterval = setInterval(async () => {
      // 静默刷新交易列表
      fetchActiveTrades({ silent: true });

      // 刷新每个大盘的交易数据
      if (sessions.length > 0) {
        const sessionTransactionsMap: Record<string, { pending: Transaction[]; settled: Transaction[] }> = {};

        // 并行获取所有大盘的交易数据
        await Promise.all(
          sessions.map(async (session) => {
            const transactions = await fetchSessionTransactions(session.id);
            sessionTransactionsMap[session.id] = transactions;
          })
        );

        // 更新订单统计
        const newStats: Record<string, { pendingCount: number; settledCount: number }> = {};
        for (const [sessionId, transactions] of Object.entries(sessionTransactionsMap)) {
          newStats[sessionId] = {
            pendingCount: transactions.pending.length,
            settledCount: transactions.settled.length
          };
        }
        setOrderStats(prev => ({ ...prev, ...newStats }));

        // 更新交易列表
        const allPending: Transaction[] = [];
        const allSettled: Transaction[] = [];
        for (const transactions of Object.values(sessionTransactionsMap)) {
          allPending.push(...transactions.pending);
          allSettled.push(...transactions.settled);
        }

        // 合并到现有列表中，避免覆盖
        setActiveRealTrades(prev => {
          const map = new Map(prev.map(t => [t.id, t]));
          for (const t of allPending) {
            map.set(t.id, t);
          }
          return Array.from(map.values());
        });

        setRecentFinished(prev => {
          const map = new Map(prev.map(t => [t.id, t]));
          for (const t of allSettled) {
            map.set(t.id, t);
          }
          return Array.from(map.values());
        });
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [statusFilter, api, sessions, fetchActiveTrades, fetchSessionTransactions]);

  // 依賴 WebSocket 並以本地計時器處理倒數結束（不自動結算，由後端自動結算）
  useEffect(() => {
    if (!api) return;
    const timer = setInterval(() => {
      const trades = activeRealTradesRef.current;
      if (!trades || trades.length === 0) return;
      const now = Date.now();
      const justFinished = trades.filter(t => {
        if (t.status !== 'PENDING') return false;
        return new Date(t.expiryTime).getTime() - now <= 0;
      });
      if (justFinished.length > 0) {
        // 只更新前端狀態，不調用 API 結算（由後端自動結算）
        setRecentFinished(prev => {
          const map = new Map(prev.map(x => [x.id, x]));
          for (const t of justFinished) {
            map.set(t.id, t);
          }
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.expiryTime).getTime() - new Date(a.expiryTime).getTime()
          );
          return merged.slice(0, 200);
        });
      }
      for (const trade of justFinished) {
        // 双重检查：跳过已经在处理中的交易
        if (quickUpdatingIdsRef.current.has(trade.id)) continue;

        // 再次确认交易状态仍然是 PENDING（防止 WebSocket 已更新）
        const currentTrade = activeRealTradesRef.current.find(t => t.id === trade.id);
        if (!currentTrade || currentTrade.status !== 'PENDING') continue;

        setQuickUpdatingIds(prev => new Set(prev).add(trade.id));
        const outcome = desiredOutcomesRef.current[trade.id] || 'WIN';
        const exit = computeExitPrice(trade, outcome);
        const socket = tradingSocketRef.current;
        (async () => {
          try {
            // 优先使用 API 调用，这样管理员介入的结果会强制生效
            if (api) {
              await transactionService.forceSettle(api, trade.orderNumber, {
                exitPrice: exit,
                result: outcome
              });
            } else if (socket) {
              await socket.forceSettle(trade.id, exit);
            } else {
              throw new Error('无法连接到交易服务');
            }
          } catch (error: any) {
            // 忽略"已结算"的错误，这是正常的竞态条件（后端已经处理了）
            const errorMsg = error?.message || String(error);
            if (errorMsg.includes('已结算') || errorMsg.includes('已取消') || errorMsg.includes('already settled')) {
              // 静默处理，不打印错误日志
              return;
            }
            // 其他错误才打印日志
            console.error('Auto settle failed:', error);
          } finally {
            setQuickUpdatingIds(prev => {
              const next = new Set(prev);
              next.delete(trade.id);
              return next;
            });
          }
        })();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [api]);

  // 清理防抖定時器
  useEffect(() => {
    return () => {
      Object.values(switchDebounceRef.current).forEach(timer => clearTimeout(timer));
      switchDebounceRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!accessToken || !adminId) return;

    const socket = new TradeUpdatesSocket(accessToken, adminId);
    tradingSocketRef.current = socket;
    setIsTradeLoading(true);
    socket.connect();

    const triggerInitialSync = () => {
      fetchActiveTrades();
    };
    const unsubConnect = socket.on('connect', triggerInitialSync);

    const offInitial = socket.on<{ transactions?: Transaction[] }>('trading:initial-data', data => {
      setActiveRealTrades(filterActiveTrades(data?.transactions ?? []));
      setIsTradeLoading(false);
    });

    const offNew = socket.on<{ transaction?: Transaction }>('trading:new-transaction', async data => {
      const trade = data?.transaction;
      if (!trade) return;
      setActiveRealTrades(prev => filterActiveTrades([trade, ...prev]));

      // 新訂單處理：初始狀態設為「輸」，只有全局是「全贏」時才調用 API
      if (trade.status === 'PENDING' && trade.accountType === 'REAL') {
        const mode = globalOutcomeControl;
        const remain = new Date(trade.expiryTime).getTime() - Date.now();

        if (remain > 0) {
          // 初始狀態設為「輸」（不覆蓋已手動設定）
          setDesiredOutcomes(prev => {
            if (prev[trade.id]) return prev;
            return { ...prev, [trade.id]: 'LOSE' };
          });

          // 只有全局是「全贏」時才調用 API
          if (mode === 'ALL_WIN') {
            try {
              if (api) {
                await transactionService.forceSettle(api, trade.orderNumber, {
                  result: 'WIN'
                });
                // API 成功後更新前端狀態為「贏」
                setDesiredOutcomes(prev => ({ ...prev, [trade.id]: 'WIN' }));
              }
            } catch (error) {
              console.error('Failed to set outcome for new trade:', error);
              // 失敗時保持「輸」的狀態，不顯示錯誤提示（避免打擾用戶）
            }
          } else if (mode === 'ALL_LOSE') {
            // 全局「全輸」時，保持「輸」的狀態（預設就是輸，不需要調用 API）
            setDesiredOutcomes(prev => {
              if (prev[trade.id]) return prev;
              return { ...prev, [trade.id]: 'LOSE' };
            });
          } else if (mode === 'RANDOM') {
            // 隨機模式：前端隨機設置，不調用 API（因為是隨機的，不需要同步到後端）
            const randomOutcome = Math.random() < 0.5 ? 'WIN' : 'LOSE';
            setDesiredOutcomes(prev => {
              if (prev[trade.id]) return prev;
              return { ...prev, [trade.id]: randomOutcome };
            });
            // 如果是隨機到「贏」，才調用 API 設置期望結果（不結算）
            if (randomOutcome === 'WIN') {
              try {
                if (api) {
                  await transactionService.forceSettle(api, trade.orderNumber, {
                    result: 'WIN'
                    // 不傳 exitPrice，這樣不會立即結算，只設置期望結果
                  });
                }
              } catch (error) {
                console.error('Failed to set random outcome for new trade:', error);
                // 失敗時改為「輸」
                setDesiredOutcomes(prev => ({ ...prev, [trade.id]: 'LOSE' }));
              }
            }
          }
        }
      }
    });

    const upsertTrade = (trade?: Transaction) => {
      if (!trade) return;
      setActiveRealTrades(prev => {
        const list = prev.filter(item => item.id !== trade.id);
        return trade.status === 'PENDING' && trade.accountType === 'REAL'
          ? filterActiveTrades([trade, ...list])
          : list;
      });
      // 如果交易状态变为非 PENDING，从正在处理的集合中移除
      if (trade.status !== 'PENDING') {
        setQuickUpdatingIds(prev => {
          const next = new Set(prev);
          next.delete(trade.id);
          return next;
        });
      }
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
      console.error('TradeUpdatesSocket connection error:', err);
      // 只在首次連接失敗時顯示錯誤，避免重連時頻繁提示
      if (!tradingSocketRef.current) {
        toast({
          title: '交易監控連線失敗',
          description: err?.message || '無法連接到交易監控服務，將使用 HTTP API 作為備選',
          variant: 'destructive'
        });
      }
      setIsTradeLoading(false);
    });

    return () => {
      offInitial();
      offNew();
      offUpdated();
      offStatus();
      offError();
      offConnectError();
      unsubConnect?.();
      socket.disconnect();
      if (tradingSocketRef.current === socket) {
        tradingSocketRef.current = null;
      }
    };
  }, [accessToken, adminId, filterActiveTrades, toast, fetchActiveTrades]);

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
      // 优先使用 API 调用，这样管理员介入的结果会强制生效，不受真实交易结果影响
      if (api) {
        await transactionService.forceSettle(api, tradeToEdit.orderNumber, {
          exitPrice: parsedExit,
          result: resultForm.outcome as 'WIN' | 'LOSE'
        });
      } else if (tradingSocketRef.current) {
        await tradingSocketRef.current.forceSettle(tradeToEdit.id, parsedExit);
      } else {
        throw new Error('目前無法連線交易服務');
      }
      await transactionService.forceSettle(api, tradeToEdit.orderNumber, {
        exitPrice: parsedExit,
        result: resultForm.outcome as 'WIN' | 'LOSE'
      });
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
    if (!api) return;

    const nowTs = Date.now();
    const targets = activeRealTrades.filter(t =>
      t.status === 'PENDING' &&
      t.accountType === 'REAL' &&
      new Date(t.expiryTime).getTime() - nowTs > 0
    );

    // 更新前端狀態
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

    // 只有「全贏」時才批量調用 API
    if (mode === 'ALL_WIN') {
      // 限制並發數，避免過多請求
      const batchSize = 5;
      const socket = tradingSocketRef.current;

      for (let i = 0; i < targets.length; i += batchSize) {
        const batch = targets.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async trade => {
            try {
              await transactionService.forceSettle(api, trade.orderNumber, {
                result: 'WIN'
              });
            } catch (error) {
              console.error(`Failed to set outcome for trade ${trade.id}:`, error);
              // 失敗時恢復前端狀態為「輸」
              setDesiredOutcomes(prev => ({ ...prev, [trade.id]: 'LOSE' }));
            }
          })
        );
      }
    }
    // 「全輸」和「隨機」模式不需要調用 API（預設就是輸，或隨機結果不需要同步）
  };

  // 設定單筆期望輸贏（只設置期望結果，不立即結算，由後端在倒數結束後自動結算）
  const handleQuickSetOutcome = async (trade: Transaction, outcome: 'WIN' | 'LOSE') => {
    // 更新前端狀態
    setDesiredOutcomes(prev => ({ ...prev, [trade.id]: outcome }));

    // 無論設置「贏」或「輸」都要調用 API 設置期望結果（不結算）
    // 注意：不傳 exitPrice，只傳 result，這樣不會立即結算
    if (!api) {
      toast({
        title: '錯誤',
        description: '無法連接到服務',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await transactionService.forceSettle(api, trade.orderNumber, {
        result: outcome
        // 不傳 exitPrice，這樣不會立即結算，只設置期望結果
      });
      toast({
        title: '已設定',
        description: `此訂單將在到期時由後端自動結算為${outcome === 'WIN' ? '贏' : '輸'}`
      });
    } catch (error) {
      console.error('Failed to set outcome:', error);
      // 失敗時恢復狀態為原來的狀態
      const previousOutcome = outcome === 'WIN' ? 'LOSE' : 'WIN';
      setDesiredOutcomes(prev => ({ ...prev, [trade.id]: previousOutcome }));
      toast({
        title: '錯誤',
        description: '設置失敗，請重試',
        variant: 'destructive'
      });
    }
  };

  // 開啟大盤
  const handleStartSession = async (session: MarketSession) => {
    if (!api) return;

    // 僅允許同時一個進行中的大盤
    const alreadyActive = allSessions.some(s => s.status === 'ACTIVE' && s.id !== session.id);
    if (alreadyActive) {
      toast({
        title: '無法開啟',
        description: '已有進行中的大盤，請先關閉後再開啟另一個大盤',
        variant: 'destructive'
      });
      return;
    }

    try {
      // 某些後端需要在重新開啟時提供 initialResult，否則可能回 400
      const result = await marketSessionService.admin.startSession(api, session.id, {
        initialResult: session.initialResult,
        restart: true
      });
      toast({
        title: '成功',
        description: `大盤已開啟，建立了 ${result.subMarketsCreated} 個小盤`
      });
      // 在「開啟」當下，同步全局輸贏控制為該大盤的預設輸贏結果（不影響歷史）
      if (result.marketSession?.initialResult) {
        setGlobalOutcomeControl(mapResultToControl(result.marketSession.initialResult));
      }
      // 切換到「進行中」分頁並刷新列表
      setStatusFilter('ACTIVE');
      setCurrentPage(1);
      fetchSessions();
    } catch (error: any) {
      console.error('Failed to start session:', error);
      toast({
        title: '錯誤',
        description:
          error?.response?.data?.message ||
          error?.message ||
          '開啟大盤失敗：後端可能要求使用「重新開啟」參數或僅允許 PENDING 狀態開啟',
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

  // 格式化時間（使用台灣時間）
  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Taipei',
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
          {statusFilter === 'ACTIVE' && activeCount > 0 && (
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
          )}
          <Button
            onClick={() => {
              fetchSessions();
              fetchActiveCount();
              fetchActiveTrades();
            }}
            variant="outline"
            disabled={isLoading}
          >
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
                setStatusFilter('PENDING');
                setCurrentPage(1);
              }}
              size="sm"
            >
              待開盤
            </Button>
            <Button
              variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter('ACTIVE');
                setCurrentPage(1);
              }}
              size="sm"
            >
              進行中
            </Button>
            <Button
              variant={statusFilter === 'CLOSED' ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter('CLOSED');
                setCurrentPage(1);
              }}
              size="sm"
            >
              已閉盤
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
                    {statusFilter === 'PENDING' ? (
                      <>
                        <TableHead>名稱</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead className="w-[120px]">預設輸贏</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </>
                    ) : statusFilter === 'ACTIVE' ? (
                      <>
                        <TableHead>名稱</TableHead>
                        <TableHead>開盤時間</TableHead>
                        <TableHead className="w-[120px]">進行中訂單</TableHead>
                        <TableHead className="w-[120px]">已結束訂單</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>名稱</TableHead>
                        <TableHead>開盤時間</TableHead>
                        <TableHead>結束時間</TableHead>
                        {/* 已閉盤不需要進行中訂單欄位，只顯示已結束訂單 */}
                        <TableHead className="w-[120px]">已結束訂單</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map(session => (
                    <TableRow key={session.id}>
                      {statusFilter === 'PENDING' ? (
                        <>
                          <TableCell className="font-medium">{session.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {session.description || '-'}
                          </TableCell>
                          <TableCell className="w-[120px]">
                            {session.initialResult === 'WIN'
                              ? '全贏'
                              : session.initialResult === 'LOSE'
                                ? '全輸'
                                : '個別控制'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate({ to: '/opening-settings/$sessionId', params: { sessionId: session.id } })
                                }
                              >
                                查看訂單
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartSession(session)}
                                disabled={activeCount > 0}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                啟用
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
                            </div>
                          </TableCell>
                        </>
                      ) : statusFilter === 'ACTIVE' ? (
                        <>
                          <TableCell className="font-medium">
                            {session.name}
                            {session.description && (
                              <div className="text-xs text-muted-foreground mt-1">{session.description}</div>
                            )}
                          </TableCell>
                          {/* 開盤時間 = 啟用時間（startTime） */}
                          <TableCell className="text-sm">{formatTime(session.startTime)}</TableCell>
                          <TableCell className="w-[120px]">
                            {orderStats[session.id]?.pendingCount ??
                              activeCountMap.get(session.id) ?? 0}
                          </TableCell>
                          <TableCell className="w-[120px]">
                            {orderStats[session.id]?.settledCount ??
                              finishedCountMap.get(session.id) ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {/* 進行中僅提供閉盤 */}
                              <Button variant="outline" size="sm" onClick={() => handleStopSession(session)}>
                                <Square className="w-4 h-4 mr-1" />
                                閉盤
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">
                            {session.name}
                            {session.description && (
                              <div className="text-xs text-muted-foreground mt-1">{session.description}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{formatTime(session.startTime)}</TableCell>
                          <TableCell className="text-sm">{formatTime(session.endTime)}</TableCell>
                          <TableCell className="w-[120px]">
                            {orderStats[session.id]?.settledCount ??
                              finishedCountMap.get(session.id) ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {session.status !== 'ACTIVE' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate({ to: '/opening-settings/$sessionId', params: { sessionId: session.id } })
                                  }
                                >
                                  查看訂單
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </>
                      )}
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
          api={api}
          switchDebounceRef={switchDebounceRef}
          tradingSocketRef={tradingSocketRef}
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
  api: AxiosInstance | null;
  switchDebounceRef: React.MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>;
  tradingSocketRef: React.MutableRefObject<TradeUpdatesSocket | null>;
}

const ActiveRealTradesSection = memo(
  ({ trades, finishedTrades, isLoading, onRefresh, onEdit, formatTime, hideOrderNumber, onToggleHideOrderNumber, onQuickSetOutcome, quickUpdatingIds, sessionName, desiredOutcomes, setDesiredOutcomes, api, switchDebounceRef, tradingSocketRef }: ActiveRealTradesSectionProps) => {
    const { toast } = useToast();
    const [now, setNow] = useState<number>(() => Date.now());
    const [durationFilter, setDurationFilter] =
      useState<'ALL' | 30 | 60 | 90 | 120 | 150 | 180 | 'FINISHED'>('ALL');
    // 記錄已經處理過的交易，避免重複結算
    const settledTradesRef = useRef<Set<string>>(new Set());
    // 記錄正在處理的交易，避免並發結算
    const settlingTradesRef = useRef<Set<string>>(new Set());

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

    // 監控交易到期並自動結算
    useEffect(() => {
      if (!api) return;

      trades.forEach(async (trade) => {
        // 跳過已經處理過的交易
        if (settledTradesRef.current.has(trade.id)) return;
        // 跳過正在處理的交易
        if (settlingTradesRef.current.has(trade.id)) return;
        // 跳過已經結算或取消的交易
        if (trade.status === 'SETTLED' || trade.status === 'CANCELED') return;

        const remaining = getRemainingSeconds(trade.expiryTime);

        // 當交易到期時（倒數 <= 0）
        if (remaining <= 0) {
          const desiredOutcome = desiredOutcomes[trade.id];

          // 如果沒有設置期望結果，默認為 LOSE
          const outcome = desiredOutcome || 'LOSE';

          console.log('⏰ Trade expired, auto settling:', {
            tradeId: trade.id,
            orderNumber: trade.orderNumber,
            remaining,
            outcome,
            hasDesiredOutcome: !!desiredOutcome
          });

          // 標記為正在處理
          settlingTradesRef.current.add(trade.id);

          try {
            // 計算出場價格
            // 如果設置為 WIN，需要根據方向計算有利的價格
            // 如果設置為 LOSE，需要根據方向計算不利的價格
            const entryPrice = Number(trade.entryPrice);
            let exitPrice: number;

            if (outcome === 'WIN') {
              // 贏：CALL 需要價格上漲，PUT 需要價格下跌
              if (trade.direction === 'CALL') {
                exitPrice = entryPrice * 1.001; // 上漲 0.1%
              } else {
                exitPrice = entryPrice * 0.999; // 下跌 0.1%
              }
            } else {
              // 輸：CALL 需要價格下跌，PUT 需要價格上漲
              if (trade.direction === 'CALL') {
                exitPrice = entryPrice * 0.999; // 下跌 0.1%
              } else {
                exitPrice = entryPrice * 1.001; // 上漲 0.1%
              }
            }

            console.log('💰 Calculated exit price:', {
              entryPrice,
              exitPrice,
              direction: trade.direction,
              outcome
            });

            // 調用結算接口
            const result = await transactionService.forceSettle(api, trade.orderNumber, {
              exitPrice,
              result: outcome
            });

            console.log('✅ Auto settle success:', result);

            // 標記為已處理
            settledTradesRef.current.add(trade.id);

            // 移除期望結果設置
            setDesiredOutcomes(prev => {
              const next = { ...prev };
              delete next[trade.id];
              return next;
            });

            // 刷新列表
            setTimeout(() => {
              onRefresh();
            }, 500);

          } catch (error) {
            console.error('❌ Auto settle failed:', error);
            toast({
              title: '自動結算失敗',
              description: `訂單 ${trade.orderNumber} 結算失敗`,
              variant: 'destructive'
            });
          } finally {
            // 移除正在處理標記
            settlingTradesRef.current.delete(trade.id);
          }
        }
      });
    }, [trades, now, desiredOutcomes, api, onRefresh, toast, setDesiredOutcomes, getRemainingSeconds]);

    const allowedDurations = [30, 60, 90, 120, 150, 180] as const;

    // 先对 trades 进行去重，避免重复的 key
    const uniqueTrades = Array.from(
      new Map(trades.map(t => [t.id, t])).values()
    );

    const filteredTrades =
      durationFilter === 'FINISHED'
        ? Array.from(
          new Map(finishedTrades.map(t => [t.id, t])).values()
        ).sort(
          (a, b) =>
            new Date(b.expiryTime).getTime() - new Date(a.expiryTime).getTime()
        )
        : uniqueTrades.filter(trade => {
          const remain = getRemainingSeconds(trade.expiryTime);
          const dur = getDurationSeconds(trade.entryTime, trade.expiryTime);
          if (durationFilter === 'ALL') {
            return remain > 0;
          }
          return remain > 0 && dur === durationFilter;
        });


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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">載入真實交易中...</div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {durationFilter === 'FINISHED' ? '暫無已結束的真實交易' : '暫無進行中的真實交易'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!hideOrderNumber && <TableHead>訂單號</TableHead>}
                    <TableHead>用戶</TableHead>
                    <TableHead>大盤</TableHead>
                    <TableHead>交易對</TableHead>
                    <TableHead>方向</TableHead>
                    <TableHead>下注秒數</TableHead>
                    <TableHead>入場價</TableHead>
                    <TableHead>投資金額</TableHead>
                    <TableHead>入場時間</TableHead>
                    <TableHead className="min-w-[150px]">到期時間</TableHead>
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
                      <TableCell className="font-medium">{trade.marketSessionName || '-'}</TableCell>
                      <TableCell className="min-w-[120px]">
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
                      <TableCell className="text-sm min-w-[150px]">
                        {formatTime(trade.expiryTime)}
                        <div className="text-xs text-muted-foreground mt-1">
                          倒數：{getRemainingSeconds(trade.expiryTime)} 秒
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {durationFilter === 'FINISHED' || trade.status === 'SETTLED' || trade.status === 'CANCELED' ? (
                          <div
                            className={cn(
                              'font-medium',
                              typeof trade.actualReturn === 'number'
                                ? trade.actualReturn >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                                : 'text-muted-foreground'
                            )}
                          >
                            {typeof trade.actualReturn === 'number'
                              ? `${trade.actualReturn >= 0 ? '+' : '-'}$${Math.abs(trade.actualReturn).toFixed(2)}`
                              : '-'}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-muted-foreground">輸</span>
                            <Switch
                              disabled={quickUpdatingIds.has(trade.id)}
                              checked={(desiredOutcomes[trade.id] || 'LOSE') === 'WIN'}
                              onCheckedChange={(checked) => {
                                const outcome = checked ? 'WIN' : 'LOSE';

                                console.log('🔵 Switch changed:', {
                                  tradeId: trade.id,
                                  orderNumber: trade.orderNumber,
                                  outcome,
                                  checked
                                });

                                // 只更新前端狀態，不調用後端 API
                                // 期望結果會保存到 localStorage，供管理員查看
                                // 實際結算由後端在時間到期時自動執行
                                setDesiredOutcomes(prev => ({ ...prev, [trade.id]: outcome }));

                                toast({
                                  title: '已設置期望結果',
                                  description: `訂單 ${trade.orderNumber} 設置為${outcome === 'WIN' ? '贏' : '輸'}`,
                                  variant: 'default'
                                });
                              }}
                              aria-label="切換輸贏"
                            />
                            <span className="text-xs text-muted-foreground">贏</span>
                          </div>
                        )}
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
