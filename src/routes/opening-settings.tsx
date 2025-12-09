/**
 * Opening Settings Page
 * 開盤設置頁面
 */

import { useState, useCallback, useEffect, memo, useRef } from 'react';
import { flushSync } from 'react-dom';
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
import type {
  MarketSession,
  GetMarketSessionsParams
} from '@/types/market-session';
import { MarketSessionStatus } from '@/types/market-session';
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
  const [resultForm, setResultForm] = useState({ outcome: 'WIN', exitPrice: '' });
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const tradingSocketRef = useRef<TradeUpdatesSocket | null>(null);
  const [hideOrderNumber, setHideOrderNumber] = useState(true);
  const [quickUpdatingIds, setQuickUpdatingIds] = useState<Set<string>>(new Set());
  const [desiredOutcomes, setDesiredOutcomes] = useState<Record<string, 'WIN' | 'LOSE'>>({});
  const [recentFinished, setRecentFinished] = useState<Transaction[]>([]);
  const [outcomeControl, setOutcomeControl] = useState<'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE'>('INDIVIDUAL');
  const activeRealTradesRef = useRef<Transaction[]>([]);
  const desiredOutcomesRef = useRef<Record<string, 'WIN' | 'LOSE'>>({});
  const quickUpdatingIdsRef = useRef<Set<string>>(new Set());
  const outcomeControlRef = useRef<'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE'>('INDIVIDUAL');
  // 組件掛載狀態追蹤，防止卸載後更新狀態
  const isMountedRef = useRef(true);
  // 用於存儲最新的 statusFilter 和 currentPage，確保異步操作時能獲取到最新值
  const statusFilterRef = useRef<'PENDING' | 'ACTIVE' | 'CLOSED'>(statusFilter);
  const currentPageRef = useRef<number>(currentPage);
  // 後端訂單統計（若接口可用）：sessionId -> { pendingCount, settledCount }
  const [orderStats, setOrderStats] = useState<Record<string, { pendingCount: number; settledCount: number }>>({});

  const allowedStatuses = new Set<MarketSessionStatus>([
    MarketSessionStatus.PENDING,
    MarketSessionStatus.ACTIVE,
    MarketSessionStatus.COMPLETED,
    MarketSessionStatus.CANCELED
  ]);
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
  }, [desiredOutcomes]);

  useEffect(() => {
    outcomeControlRef.current = outcomeControl;
  }, [outcomeControl]);

  // 監聽新訂單，自動應用全局設定
  useEffect(() => {
    if (outcomeControl === 'INDIVIDUAL' || !api || !isMountedRef.current) return;
    
    const currentTrades = activeRealTrades;
    const outcome: 'WIN' | 'LOSE' = outcomeControl === 'ALL_WIN' ? 'WIN' : 'LOSE';
    
    // 找出還沒有設置 outcome 的新訂單（使用 ref 來檢查，避免無限循環）
    const newTrades = currentTrades.filter(trade => 
      trade.accountType === 'REAL' &&
      trade.marketSessionId &&
      !desiredOutcomesRef.current[trade.id] &&
      new Date(trade.expiryTime).getTime() > Date.now()
    );
    
    if (newTrades.length > 0) {
      console.log('[useEffect] 發現新訂單需要應用全局設定:', {
        outcomeControl,
        newTradesCount: newTrades.length,
        trades: newTrades.map(t => ({ id: t.id, orderNumber: t.orderNumber }))
      });
      
      // 更新本地狀態
      setDesiredOutcomes(prev => {
        const next = { ...prev };
        for (const trade of newTrades) {
          next[trade.id] = outcome;
        }
        console.log('[useEffect] 更新 desiredOutcomes:', next);
        return next;
      });
      
      // 批量調用 API
      Promise.all(
        newTrades.map(async (trade) => {
          try {
            await transactionService.forceSettle(api, trade.orderNumber, {
              result: outcome
            });
            console.log('[useEffect] 成功應用全局設定:', trade.orderNumber);
          } catch (error) {
            console.error(`[useEffect] Failed to auto-set outcome for trade ${trade.orderNumber}:`, error);
            // 如果失敗，移除本地狀態
            setDesiredOutcomes(prev => {
              const next = { ...prev };
              delete next[trade.id];
              return next;
            });
          }
        })
      ).catch(err => {
        console.error('[useEffect] Failed to auto-set outcomes for new trades:', err);
      });
    }
  }, [activeRealTrades, outcomeControl, api]);

  useEffect(() => {
    quickUpdatingIdsRef.current = quickUpdatingIds;
  }, [quickUpdatingIds]);

  // 組件掛載時設置 isMounted，卸載時清理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 更新 ref 以保持最新值
  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // 獲取大盤列表
  const fetchSessions = useCallback(async () => {
    if (!api || !isMountedRef.current) return;

    try {
      if (isMountedRef.current) {
        setIsLoading(true);
      }
      // 使用 ref 中的最新值，確保異步操作時能獲取到正確的狀態
      const currentStatusFilter = statusFilterRef.current;
      const currentPageValue = currentPageRef.current;
      
      // 對於「已閉盤」頁籤，分別獲取 COMPLETED 和 CANCELED 的所有頁面資料
      if (currentStatusFilter === 'CLOSED') {
        const allClosedSessions: MarketSession[] = [];
        const pageLimit = 100; // 每頁獲取 100 筆
        
        // 獲取所有 COMPLETED 的資料
        let completedPage = 1;
        let hasMoreCompleted = true;
        while (hasMoreCompleted) {
          const completedResponse = await marketSessionService.admin.getSessions(api, {
            status: MarketSessionStatus.COMPLETED,
            page: completedPage,
            limit: pageLimit
          });
          
          if (!isMountedRef.current) return;
          
          const completed = completedResponse.marketSessions || [];
          allClosedSessions.push(...completed);
          
          const totalPages = completedResponse.totalPages || 1;
          hasMoreCompleted = completedPage < totalPages && completed.length > 0;
          completedPage++;
          
          if (completedPage > 1000) break;
        }
        
        // 獲取所有 CANCELED 的資料
        let canceledPage = 1;
        let hasMoreCanceled = true;
        while (hasMoreCanceled) {
          const canceledResponse = await marketSessionService.admin.getSessions(api, {
            status: MarketSessionStatus.CANCELED,
            page: canceledPage,
            limit: pageLimit
          });
          
          if (!isMountedRef.current) return;
          
          const canceled = canceledResponse.marketSessions || [];
          allClosedSessions.push(...canceled);
          
          const totalPages = canceledResponse.totalPages || 1;
          hasMoreCanceled = canceledPage < totalPages && canceled.length > 0;
          canceledPage++;
          
          if (canceledPage > 1000) break;
        }
        
        if (!isMountedRef.current) return;
        
        // 按時間排序（最新的在前）
        const sorted = allClosedSessions.sort((a, b) => {
          const timeA = new Date(a.endTime || a.startTime || a.createdAt).getTime();
          const timeB = new Date(b.endTime || b.startTime || b.createdAt).getTime();
          return timeB - timeA;
        });
        
        setAllSessions(sorted);
        
        // 前端分頁
        const pageSize = 20;
        const startIndex = (currentPageValue - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginated = sorted.slice(startIndex, endIndex);
        
        setSessions(paginated);
        if (isMountedRef.current) {
          setPagination({
            page: currentPageValue,
            pageSize: pageSize,
            total: sorted.length,
            totalPages: Math.ceil(sorted.length / pageSize)
          });
        }
      } else {
        // 對於「待開盤」和「進行中」頁籤，使用原來的邏輯
        const params: GetMarketSessionsParams = { page: currentPageValue, limit: 20 };
        if (currentStatusFilter === 'PENDING' || currentStatusFilter === 'ACTIVE') {
          params.status = currentStatusFilter as unknown as MarketSessionStatus;
        }

        const response = await marketSessionService.admin.getSessions(api, params);
        
        // 檢查組件是否仍掛載
        if (!isMountedRef.current) return;
        
        const all = (response.marketSessions || []).filter(session => allowedStatuses.has(session.status));
        setAllSessions(all);
        // 使用 ref 中的最新值進行過濾（在異步操作完成後獲取最新狀態）
        const filterValue = statusFilterRef.current;
        const filtered =
          filterValue === 'ACTIVE'
            ? all.filter(s => s.status === 'ACTIVE').slice(0, 1) // 只顯示第一個進行中的大盤
            : filterValue === 'PENDING'
            ? all.filter(s => s.status === 'PENDING')
            : all.filter(s => s.status === 'COMPLETED' || s.status === 'CANCELED');
        setSessions(filtered);
        if (isMountedRef.current) {
          setPagination({
            page: response.page,
            pageSize: response.pageSize,
            total: filtered.length,
            totalPages: response.totalPages
          });
        }
      }
    } catch (error: any) {
      if (!isMountedRef.current) return;
      console.error('Failed to fetch market sessions:', error);
      setSessions([]);
      toast({
        title: '錯誤',
        description: error.response?.data?.message || '取得大盤列表失敗',
        variant: 'destructive'
      });
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [api, toast]);

  // 獨立取得 ACTIVE 大盤數量，避免因列表篩選造成提示橫幅閃爍
  const fetchActiveCount = useCallback(async () => {
    if (!api) return;
    try {
      const resp = await marketSessionService.admin.getSessions(api, { status: MarketSessionStatus.ACTIVE, page: 1, limit: 1 });
      const list = resp.marketSessions || [];
      setActiveCount(list.length);
    } catch (e) {
      // 靜默失敗，不影響主流程
    }
  }, [api]);

  // 當 statusFilter、currentPage 或 fetchSessions 改變時，重新獲取數據
  useEffect(() => {
    fetchSessions();
    fetchActiveCount();
  }, [fetchSessions, fetchActiveCount, statusFilter, currentPage]);

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
    
    let cancelled = false;
    
    (async () => {
      const sessionTransactionsMap: Record<string, { pending: Transaction[]; settled: Transaction[] }> = {};
      
      // 並行獲取所有大盤的交易數據
      await Promise.all(
        sessions.map(async (session) => {
          if (cancelled) return;
          const transactions = await fetchSessionTransactions(session.id);
          if (!cancelled) {
            sessionTransactionsMap[session.id] = transactions;
          }
        })
      );

      // 檢查組件是否仍掛載
      if (cancelled || !isMountedRef.current) return;

      // 更新訂單統計（覆蓋後端統計）
      const newStats: Record<string, { pendingCount: number; settledCount: number }> = {};
      for (const [sessionId, transactions] of Object.entries(sessionTransactionsMap)) {
        newStats[sessionId] = {
          pendingCount: transactions.pending.length,
          settledCount: transactions.settled.length
        };
      }
      if (isMountedRef.current) {
        setOrderStats(prev => ({ ...prev, ...newStats }));
      }

      // 更新交易列表（僅在「進行中」tab下更新進行中交易，用於下方交易列表顯示）
      if (statusFilter === 'ACTIVE') {
        const allPending: Transaction[] = [];
        const allSettled: Transaction[] = [];
        for (const transactions of Object.values(sessionTransactionsMap)) {
          allPending.push(...transactions.pending);
          allSettled.push(...transactions.settled);
        }
        // 合併到現有列表中，避免覆蓋 Socket 實時更新的數據
        if (isMountedRef.current) {
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
      } else if (statusFilter === 'CLOSED') {
        // 在「已閉盤」tab下，只更新已結束的交易
        const allSettled: Transaction[] = [];
        for (const transactions of Object.values(sessionTransactionsMap)) {
          allSettled.push(...transactions.settled);
        }
        if (isMountedRef.current) {
          setRecentFinished(allSettled);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
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
    if (!api || !isMountedRef.current) return;
    try {
      if (!options?.silent && isMountedRef.current) {
        setIsTradeLoading(true);
      }
      const response = await transactionService.list(api, {
        page: 1,
        limit: 100,
        status: 'PENDING',
        accountType: 'REAL'
      });
      
      // 檢查組件是否仍掛載
      if (!isMountedRef.current) return;
      
      const list = filterActiveTrades(response.data || []);
      setActiveRealTrades(list);
      
      // 依據當前全局控制，為尚未設定期望值的新訂單套預設
      if (isMountedRef.current && outcomeControlRef.current !== 'INDIVIDUAL') {
        const currentControl = outcomeControlRef.current;
        const outcome: 'WIN' | 'LOSE' = currentControl === 'ALL_WIN' ? 'WIN' : 'LOSE';
        const newTrades = list.filter(t => 
          t.marketSessionId && 
          !desiredOutcomesRef.current[t.id] &&
          new Date(t.expiryTime).getTime() > Date.now()
        );
        
        if (newTrades.length > 0 && api) {
          // 更新本地狀態
          setDesiredOutcomes(prev => {
            const next = { ...prev };
            for (const trade of newTrades) {
              next[trade.id] = outcome;
            }
            return next;
          });
          
          // 批量調用 API
          Promise.all(
            newTrades.map(async (trade) => {
              try {
                await transactionService.forceSettle(api, trade.orderNumber, {
                  result: outcome
                });
              } catch (error) {
                console.error(`Failed to auto-set outcome for trade ${trade.orderNumber}:`, error);
                // 如果失敗，移除本地狀態
                setDesiredOutcomes(prev => {
                  const next = { ...prev };
                  delete next[trade.id];
                  return next;
                });
              }
            })
          ).catch(err => {
            console.error('Failed to auto-set outcomes for new trades:', err);
          });
        }
      }
    } catch (error: any) {
      if (!isMountedRef.current) return;
      console.error('Failed to fetch real trades:', error);
      toast({
        title: '錯誤',
        description: error.response?.data?.message || '取得真實交易失敗',
        variant: 'destructive'
      });
    } finally {
      if (!options?.silent && isMountedRef.current) {
        setIsTradeLoading(false);
      }
    }
  }, [api, toast, filterActiveTrades]);

  useEffect(() => {
    fetchActiveTrades();
  }, [fetchActiveTrades]);

  // 監控倒數結束的訂單，在倒數結束時調用 API 結算
  // 根據 desiredOutcomes 狀態來結算訂單
  useEffect(() => {
    if (!api) return;
    const timer = setInterval(() => {
      // 檢查組件是否仍掛載
      if (!isMountedRef.current) return;
      
      const trades = activeRealTradesRef.current;
      if (!trades || trades.length === 0) return;
      const now = Date.now();
      // 檢查倒數是否結束，不管後端返回的狀態是什麼
      // 只要倒數結束，就將訂單從進行中移到已結束
      const justFinished = trades.filter(t => {
        // 不管 status 是什麼，只要倒數結束就處理
        return new Date(t.expiryTime).getTime() - now <= 0;
      });
      
      // 在倒數結束時，調用 API 結算訂單
      for (const trade of justFinished) {
        if (!isMountedRef.current) break;
        if (quickUpdatingIdsRef.current.has(trade.id)) continue;
        if (isMountedRef.current) {
          setQuickUpdatingIds(prev => new Set(prev).add(trade.id));
        }
        const outcome = desiredOutcomesRef.current[trade.id] || 'LOSE';
        const exit = computeExitPrice(trade, outcome);
        (async () => {
          try {
            if (!isMountedRef.current) return;
            await transactionService.forceSettle(api, trade.orderNumber, {
              exitPrice: exit,
              result: outcome
            });
            // 結算成功後，更新本地狀態
            if (isMountedRef.current) {
              setRecentFinished(prev => {
                const map = new Map(prev.map(x => [x.id, x]));
                map.set(trade.id, trade);
                const merged = Array.from(map.values()).sort(
                  (a, b) => new Date(b.expiryTime).getTime() - new Date(a.expiryTime).getTime()
                );
                return merged.slice(0, 200);
              });
              // 從進行中列表移除
              setActiveRealTrades(prev => prev.filter(t => t.id !== trade.id));
            }
          } catch (error) {
            if (!isMountedRef.current) return;
            console.error('Auto settle failed', error);
          } finally {
            if (isMountedRef.current) {
              setQuickUpdatingIds(prev => {
                const next = new Set(prev);
                next.delete(trade.id);
                return next;
              });
            }
          }
        })();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [api, computeExitPrice]);

  useEffect(() => {
    if (!accessToken || !adminId) return;

    const socket = new TradeUpdatesSocket(accessToken, adminId);
    tradingSocketRef.current = socket;
    setIsTradeLoading(true);
    socket.connect();

    const triggerInitialSync = () => {
      if (isMountedRef.current) {
        fetchActiveTrades();
      }
    };
    const unsubConnect = socket.on('connect', triggerInitialSync);
    const unsubReconnect = socket.on('reconnect' as any, triggerInitialSync);

    const offInitial = socket.on<{ transactions?: Transaction[] }>('trading:initial-data', data => {
      if (!isMountedRef.current) return;
      setActiveRealTrades(filterActiveTrades(data?.transactions ?? []));
      setIsTradeLoading(false);
    });

    const offNew = socket.on<{ transaction?: Transaction }>('trading:new-transaction', async data => {
      if (!isMountedRef.current) return;
      const trade = data?.transaction;
      if (!trade) return;
      
      // 檢查是否為新訂單（不在當前列表中）
      const currentTrades = activeRealTradesRef.current;
      const isNewTrade = !currentTrades.some(t => t.id === trade.id);
      
      console.log('[offNew] 新訂單:', {
        orderNumber: trade.orderNumber,
        isNewTrade,
        accountType: trade.accountType,
        marketSessionId: trade.marketSessionId,
        currentControl: outcomeControlRef.current
      });
      
      // 如果是新訂單，且全局控制不是「個別控制」，且有 marketSessionId，則自動應用全局設定
      if (isNewTrade && trade.accountType === 'REAL' && trade.marketSessionId) {
        const now = Date.now();
        const expiryTime = new Date(trade.expiryTime).getTime();
        const isExpired = expiryTime <= now;
        
        if (!isExpired) {
          const currentControl = outcomeControlRef.current;
          console.log('[offNew] 檢查全局控制:', {
            currentControl,
            willApply: currentControl === 'ALL_WIN' || currentControl === 'ALL_LOSE'
          });
          
          if (currentControl === 'ALL_WIN' || currentControl === 'ALL_LOSE') {
            const outcome: 'WIN' | 'LOSE' = currentControl === 'ALL_WIN' ? 'WIN' : 'LOSE';
            
            console.log('[offNew] 應用全局設定:', {
              tradeId: trade.id,
              orderNumber: trade.orderNumber,
              outcome
            });
            
            // 先更新本地狀態，讓 UI 立即反映
            setDesiredOutcomes(prev => {
              const next = { ...prev, [trade.id]: outcome };
              console.log('[offNew] 更新 desiredOutcomes:', next);
              return next;
            });
            
            // 調用 API 設置輸贏結果（異步執行，不阻塞 UI）
            if (api) {
              transactionService.forceSettle(api, trade.orderNumber, {
                result: outcome
              }).then(() => {
                console.log('[offNew] API 調用成功:', trade.orderNumber);
              }).catch(error => {
                console.error(`[offNew] Failed to auto-set outcome for new trade ${trade.orderNumber}:`, error);
                // 如果失敗，移除本地狀態
                setDesiredOutcomes(prev => {
                  const next = { ...prev };
                  delete next[trade.id];
                  return next;
                });
              });
            }
          }
        }
      }
      
      // 更新訂單列表
      setActiveRealTrades(prev => filterActiveTrades([trade, ...prev]));
    });

    const upsertTrade = async (trade?: Transaction) => {
      if (!trade || !isMountedRef.current) return;
      
      // 檢查倒數是否結束
      const now = Date.now();
      const expiryTime = new Date(trade.expiryTime).getTime();
      const isExpired = expiryTime <= now;
      
      // 檢查是否為新訂單（不在當前列表中）
      const isNewTrade = !activeRealTradesRef.current.some(t => t.id === trade.id);
      
      // 如果是新訂單，且全局控制不是「個別控制」，且有 marketSessionId，則自動應用全局設定
      if (isNewTrade && trade.accountType === 'REAL' && trade.marketSessionId && !isExpired) {
        const currentControl = outcomeControlRef.current;
        if (currentControl === 'ALL_WIN' || currentControl === 'ALL_LOSE') {
          const outcome: 'WIN' | 'LOSE' = currentControl === 'ALL_WIN' ? 'WIN' : 'LOSE';
          
          // 更新本地狀態
          setDesiredOutcomes(prev => ({ ...prev, [trade.id]: outcome }));
          
          // 調用 API 設置輸贏結果
          if (api) {
            try {
              await transactionService.forceSettle(api, trade.orderNumber, {
                result: outcome
              });
            } catch (error) {
              console.error(`Failed to auto-set outcome for new trade ${trade.orderNumber}:`, error);
              // 如果失敗，移除本地狀態
              setDesiredOutcomes(prev => {
                const next = { ...prev };
                delete next[trade.id];
                return next;
              });
            }
          }
        }
      }
      
      setActiveRealTrades(prev => {
        const list = prev.filter(item => item.id !== trade.id);
        
        // 如果訂單是 PENDING 狀態，保持在列表中
        if (trade.status === 'PENDING' && trade.accountType === 'REAL') {
          return filterActiveTrades([trade, ...list]);
        }
        
        // 即使後端返回 SETTLED，如果倒數還沒結束，也保持在列表中
        // 使用原始訂單數據，但前端顯示時視為 PENDING
        if (trade.status === 'SETTLED' && trade.accountType === 'REAL' && !isExpired) {
          const pendingTrade = { ...trade, status: 'PENDING' as const };
          return filterActiveTrades([pendingTrade, ...list]);
        }
        
        // 倒數已結束或不是 REAL 類型，從列表中移除
        return list;
      });
    };

    const offUpdated = socket.on<{ transaction?: Transaction }>('trading:transaction-updated', data => {
      upsertTrade(data?.transaction);
    });

    const offStatus = socket.on<{ transaction?: Transaction }>('trading:status-changed', data => {
      upsertTrade(data?.transaction);
    });

    const offError = socket.on<{ message?: string }>('trading:error', error => {
      if (!isMountedRef.current) return;
      toast({
        title: '交易監控錯誤',
        description: error?.message || '即時交易連線出現問題',
        variant: 'destructive'
      });
    });

    const offConnectError = socket.on('connect_error', err => {
      if (!isMountedRef.current) return;
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
      unsubConnect?.();
      unsubReconnect?.();
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
      const socket = tradingSocketRef.current;
      if (socket) {
        await socket.forceSettle(tradeToEdit.id, parsedExit);
      } else if (api) {
        await transactionService.forceSettle(api, tradeToEdit.orderNumber, {
          exitPrice: parsedExit,
          result: resultForm.outcome as 'WIN' | 'LOSE'
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


  // 設定單筆期望輸贏（不立即結算，到期時依設定自動結算）
  const handleQuickSetOutcome = async (trade: Transaction, outcome: 'WIN' | 'LOSE') => {
    setDesiredOutcomes(prev => ({ ...prev, [trade.id]: outcome }));
    toast({
      title: '已設定',
      description: `此訂單將在到期時結算為${outcome === 'WIN' ? '贏' : '輸'}`
    });
  };

  // 處理 Switch 切換，調用 forceSettle API 但只傳遞 result，不傳遞 exitPrice
  // 即使後端返回 SETTLED 狀態，前端也不更新訂單狀態，保持訂單在進行中列表
  // 直到倒數結束時才將訂單從進行中移到已結束
  const handleSwitchChange = async (trade: Transaction, checked: boolean) => {
    const outcome: 'WIN' | 'LOSE' = checked ? 'WIN' : 'LOSE';
    
    // 立即更新本地狀態
    setDesiredOutcomes(prev => ({ ...prev, [trade.id]: outcome }));
    
    // 調用 forceSettle API，但只傳遞 result，不傳遞 exitPrice
    // 即使後端返回 SETTLED 狀態，我們也不更新 activeRealTrades
    // 保持訂單在進行中列表，直到倒數結束
    if (api && trade.marketSessionId) {
      try {
        setQuickUpdatingIds(prev => new Set(prev).add(trade.id));
        await transactionService.forceSettle(api, trade.orderNumber, {
          result: outcome
          // 不傳遞 exitPrice，只傳遞 result
          // 即使後端返回 SETTLED，前端也不更新訂單狀態
        });
        // 不更新 activeRealTrades，保持訂單在進行中列表
        // 即使後端返回 SETTLED 狀態，我們也不移除訂單
        toast({
          title: '成功',
          description: `已設定此訂單為${outcome === 'WIN' ? '贏' : '輸'}，將在倒數結束時自動結算。在倒數結束前可隨時更改。`
        });
      } catch (error: any) {
        console.error('Failed to sync outcome:', error);
        // 如果 API 調用失敗，恢復本地狀態
        setDesiredOutcomes(prev => {
          const next = { ...prev };
          delete next[trade.id];
          return next;
        });
        toast({
          title: '錯誤',
          description: error?.response?.data?.message || error?.message || '同步輸贏狀態失敗',
          variant: 'destructive'
        });
      } finally {
        setQuickUpdatingIds(prev => {
          const next = new Set(prev);
          next.delete(trade.id);
          return next;
        });
      }
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

  // 格式化時間
  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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

      {/* 交易規則說明 - 黃色提示框 */}
      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-800">
        <div className="font-medium mb-1">交易規則說明：</div>
        <div>
          虛擬交易將按照玩家實際結果判斷輸贏，真實交易不論看漲看跌是否正確。預設玩家一定輸，當開啟輸贏控制按鈕，玩家才會盈利
        </div>
        <div className="mt-2 font-medium text-yellow-900">
          注意：如果沒有開啟大盤，無法控制輸贏，玩家必輸
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
                          <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
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
                              {/* 已閉盤頁籤中，所有 session 都應該顯示「查看訂單」按鈕 */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate({ to: '/opening-settings/$sessionId', params: { sessionId: session.id } })
                                }
                              >
                                查看訂單
                              </Button>
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
          onSwitchChange={handleSwitchChange}
          outcomeControl={outcomeControl}
          setOutcomeControl={setOutcomeControl}
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
          fetchActiveCount();
        }}
        activeCount={activeCount}
        onSessionStarted={() => {
          // 立即啟用後切換到「進行中」頁籤
          // 使用 flushSync 強制同步更新狀態，確保狀態更新完成後再獲取數據
          flushSync(() => {
            setStatusFilter('ACTIVE');
            setCurrentPage(1);
          });
          // 狀態已同步更新，現在可以安全地獲取數據
          fetchSessions();
          fetchActiveCount();
        }}
      />

      {/* 編輯交易結果 */}

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
  activeCount?: number;
  onSwitchChange: (trade: Transaction, checked: boolean) => void;
  outcomeControl: 'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE';
  setOutcomeControl: React.Dispatch<React.SetStateAction<'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE'>>;
}

const ActiveRealTradesSection = memo(
  ({ trades, finishedTrades, isLoading, onRefresh, onEdit, formatTime, hideOrderNumber, onToggleHideOrderNumber, onQuickSetOutcome, quickUpdatingIds, sessionName, desiredOutcomes, setDesiredOutcomes, activeCount = 0, onSwitchChange, outcomeControl, setOutcomeControl }: ActiveRealTradesSectionProps) => {
    const { api } = useAuth();
    const { toast } = useToast();
    const [now, setNow] = useState<number>(() => Date.now());
    const [durationFilter, setDurationFilter] =
      useState<'ALL' | 30 | 60 | 90 | 120 | 150 | 180 | 'FINISHED'>('ALL');
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [pendingControl, setPendingControl] = useState<'ALL_WIN' | 'ALL_LOSE' | null>(null);

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

    // 應用全局輸贏控制
    const applyOutcomeControl = async (mode: 'ALL_WIN' | 'ALL_LOSE') => {
      console.log('[applyOutcomeControl] 開始應用:', mode);
      if (!api) {
        console.log('[applyOutcomeControl] API 不可用');
        return;
      }
      
      const targets = filteredTrades.filter(t => 
        getRemainingSeconds(t.expiryTime) > 0 && t.marketSessionId
      );
      
      console.log('[applyOutcomeControl] 可控制的訂單數量:', targets.length, targets);
      
      if (targets.length === 0) {
        toast({
          title: '提示',
          description: '沒有可控制的訂單',
          variant: 'default'
        });
        return;
      }
      
      const outcome: 'WIN' | 'LOSE' = mode === 'ALL_WIN' ? 'WIN' : 'LOSE';
      
      // 先更新本地狀態
      setDesiredOutcomes(prev => {
        const next = { ...prev };
        for (const trade of targets) {
          next[trade.id] = outcome;
        }
        console.log('[applyOutcomeControl] 更新 desiredOutcomes:', next);
        return next;
      });
      
      try {
        // 批量更新所有訂單的 API
        const promises = targets.map(async (trade) => {
          try {
            await transactionService.forceSettle(api, trade.orderNumber, {
              result: outcome
            });
            console.log('[applyOutcomeControl] 成功更新訂單:', trade.orderNumber);
          } catch (error) {
            console.error(`[applyOutcomeControl] Failed to update trade ${trade.orderNumber}:`, error);
            // 如果某個訂單更新失敗，恢復該訂單的狀態
            setDesiredOutcomes(prev => {
              const next = { ...prev };
              delete next[trade.id];
              return next;
            });
            throw error;
          }
        });
        
        await Promise.all(promises);
        
        console.log('[applyOutcomeControl] 所有訂單更新完成，設置 outcomeControl:', mode);
        setOutcomeControl(mode);
        toast({
          title: '成功',
          description: `已將 ${targets.length} 筆訂單設定為${mode === 'ALL_WIN' ? '全贏' : '全輸'}`
        });
      } catch (error: any) {
        console.error('[applyOutcomeControl] 批量更新失敗:', error);
        toast({
          title: '錯誤',
          description: error?.response?.data?.message || error?.message || '批量更新失敗，部分訂單可能未更新',
          variant: 'destructive'
        });
      }
    };
    
    // 處理全局控制選擇
    const handleOutcomeControlChange = (value: 'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE') => {
      console.log('[handleOutcomeControlChange] 選擇:', value);
      if (value === 'INDIVIDUAL') {
        setOutcomeControl('INDIVIDUAL');
        return;
      }
      
      // 顯示確認對話框
      console.log('[handleOutcomeControlChange] 顯示確認對話框');
      setPendingControl(value);
      setConfirmDialogOpen(true);
    };
    
    // 確認應用全局控制
    const handleConfirmControl = async () => {
      console.log('[handleConfirmControl] 確認應用:', pendingControl);
      if (pendingControl) {
        await applyOutcomeControl(pendingControl);
        setConfirmDialogOpen(false);
        setPendingControl(null);
      }
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
            <Select
              value={outcomeControl}
              onValueChange={(value) => {
                console.log('[Select] onValueChange 觸發:', value);
                handleOutcomeControlChange(value as 'INDIVIDUAL' | 'ALL_WIN' | 'ALL_LOSE');
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="控制方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">個別控制</SelectItem>
                <SelectItem value="ALL_WIN">全贏</SelectItem>
                <SelectItem value="ALL_LOSE">全輸</SelectItem>
              </SelectContent>
            </Select>
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
                  <TableHead className="text-right">{durationFilter === 'FINISHED' ? '盈虧' : '輸 → 贏'}</TableHead>
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
                            (() => {
                              if (typeof trade.actualReturn !== 'number') return 'text-muted-foreground';
                              // 如果 actualReturn 是 0，但 investAmount > 0，視為虧損
                              if (trade.actualReturn === 0 && trade.investAmount > 0) {
                                return 'text-red-600';
                              }
                              return trade.actualReturn >= 0 ? 'text-green-600' : 'text-red-600';
                            })()
                          )}
                        >
                          {(() => {
                            if (typeof trade.actualReturn !== 'number') return '-';
                            // 如果 actualReturn 是 0，但 investAmount > 0，顯示為虧損
                            if (trade.actualReturn === 0 && trade.investAmount > 0) {
                              return `-$${trade.investAmount.toFixed(2)}`;
                            }
                            return `${trade.actualReturn >= 0 ? '+' : '-'}$${Math.abs(trade.actualReturn).toFixed(2)}`;
                          })()}
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground">輸</span>
                          <Switch
                            disabled={quickUpdatingIds.has(trade.id) || !trade.marketSessionId}
                            checked={(desiredOutcomes[trade.id] || 'LOSE') === 'WIN'}
                            onCheckedChange={(checked) => {
                              setOutcomeControl('INDIVIDUAL');
                              onSwitchChange(trade, checked);
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
      
      {/* 確認對話框 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認全局控制</DialogTitle>
            <DialogDescription>
              您確定要將所有進行中的訂單設定為{pendingControl === 'ALL_WIN' ? '全贏' : '全輸'}嗎？
              <br />
              此操作將影響所有有對應大盤的訂單，且可在倒數結束前隨時更改。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setConfirmDialogOpen(false);
              setPendingControl(null);
            }}>
              取消
            </Button>
            <Button onClick={handleConfirmControl}>
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
});

ActiveRealTradesSection.displayName = 'ActiveRealTradesSection';
