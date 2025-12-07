import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, RefreshCw } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { marketSessionService } from '@/services/market-sessions';
import { transactionService } from '@/services/transactions';
import type { MarketSession } from '@/types/market-session';
import type { Transaction } from '@/types/transaction';

import { formatTaiwanDateTime } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

export function OpeningSessionHistoryPage() {
  const { sessionId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { api } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<MarketSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'SETTLED' | 'ALL'>('SETTLED');
  const [orderSearch, setOrderSearch] = useState('');

  const fetchSession = useCallback(async () => {
    if (!api || !sessionId) return;

    try {
      setIsRefreshing(true);
      const detail = await marketSessionService.admin.getSessionDetail(api, sessionId);
      setSession(detail);
    } catch (error: any) {
      console.error('Failed to fetch market session detail:', error);
      toast({
        title: '錯誤',
        description: error?.response?.data?.message || '取得大盤詳情失敗',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [api, sessionId, toast]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // 獲取大盤的交易數據
  const fetchTransactions = useCallback(async () => {
    if (!api || !sessionId) return;

    try {
      setIsLoadingTransactions(true);
      const params: any = {
        page: 1,
        limit: 1000,
        marketSessionId: sessionId,
        accountType: 'REAL'
      };

      // 根據狀態篩選
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const response = await transactionService.list(api, params);
      setTransactions(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
      toast({
        title: '錯誤',
        description: error?.response?.data?.message || '取得交易數據失敗',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [api, sessionId, statusFilter, toast]);

  useEffect(() => {
    if (sessionId) {
      fetchTransactions();
    }
  }, [fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    if (!orderSearch.trim()) return transactions;
    const keyword = orderSearch.trim().toLowerCase();
    return transactions.filter(txn => txn.orderNumber.toLowerCase().includes(keyword));
  }, [transactions, orderSearch]);

  // 計算統計數據
  const statistics = useMemo(() => {
    const total = filteredTransactions.length;
    const settled = filteredTransactions.filter(t => t.status === 'SETTLED');
    const winTrades = settled.filter(t => {
      const returnValue = Number(t.actualReturn ?? 0);
      return returnValue > 0;
    });
    const loseTrades = settled.filter(t => {
      const returnValue = Number(t.actualReturn ?? 0);
      return returnValue < 0;
    });
    
    const winAmount = winTrades.reduce((sum, t) => sum + Number(t.actualReturn ?? 0), 0);
    const loseAmount = Math.abs(loseTrades.reduce((sum, t) => sum + Number(t.actualReturn ?? 0), 0));
    
    return {
      total,
      winCount: winTrades.length,
      winAmount,
      loseCount: loseTrades.length,
      loseAmount
    };
  }, [filteredTransactions]);

  const formatDateTime = (value?: string | null) => {
    return formatTaiwanDateTime(value, {
      second: undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/opening-settings' })}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回列表
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {session?.name ?? '載入中...'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {session?.description || '查看該大盤的歷史數據與概況'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <Badge variant={session.status === 'ACTIVE' ? 'default' : session.status === 'PENDING' ? 'secondary' : session.status === 'COMPLETED' ? 'outline' : 'destructive'}>
              {session.status === 'ACTIVE' ? '進行中' : session.status === 'PENDING' ? '待開盤' : session.status === 'COMPLETED' ? '已完成' : '已取消'}
            </Badge>
          ) : null}
          <Button variant="outline" size="sm" onClick={fetchSession} disabled={isRefreshing || isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            重新整理
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>大盤資訊</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-6">載入中...</div>
          ) : session ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">建立時間</p>
                <p className="text-lg font-medium mt-1">{formatDateTime(session.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">狀態</p>
                <p className="text-lg font-medium mt-1">
                  {session.status === 'ACTIVE' ? '進行中' : session.status === 'PENDING' ? '待開盤' : session.status === 'COMPLETED' ? '已完成' : '已取消'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">開始時間（開盤）</p>
                <p className="text-lg font-medium mt-1">{formatDateTime(session.startTime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">結束時間（閉盤）</p>
                <p className="text-lg font-medium mt-1">{formatDateTime(session.endTime)}</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6">未找到大盤資訊</div>
          )}
        </CardContent>
      </Card>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">總訂單數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
            <p className="text-xs text-muted-foreground mt-1">筆訂單</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">玩家盈利</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.winCount} 筆
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              金額：<span className="text-green-600 font-medium">+${statistics.winAmount.toFixed(2)}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">玩家虧損</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statistics.loseCount} 筆
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              金額：<span className="text-red-600 font-medium">-${statistics.loseAmount.toFixed(2)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle>歷史數據</CardTitle>
            <Button
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
            >
              全部
            </Button>
            <Button
              variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('PENDING')}
            >
              進行中
            </Button>
            <Button
              variant={statusFilter === 'SETTLED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('SETTLED')}
            >
              已結束
            </Button>
            <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={isLoadingTransactions}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingTransactions ? 'animate-spin' : ''}`} />
              重新整理
            </Button>
          </div>
          <Input
            type="text"
            placeholder="搜尋訂單編號"
            value={orderSearch}
            onChange={event => setOrderSearch(event.target.value)}
            className="w-full lg:w-64"
          />
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="text-center text-muted-foreground py-10">載入中...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              {orderSearch.trim()
                ? '找不到符合的訂單編號'
                : statusFilter === 'PENDING'
                ? '暫無進行中的交易'
                : statusFilter === 'SETTLED'
                ? '暫無已結束的交易'
                : '暫無交易數據'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>訂單號</TableHead>
                    <TableHead>用戶</TableHead>
                    <TableHead>資產</TableHead>
                    <TableHead>方向</TableHead>
                    <TableHead>下注金額</TableHead>
                    <TableHead>入場時間</TableHead>
                    <TableHead>到期時間</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="text-right">盈虧</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map(trade => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-mono text-sm">{trade.orderNumber}</TableCell>
                      <TableCell>{trade.userName || '-'}</TableCell>
                      <TableCell className="min-w-[120px]">{trade.assetType}</TableCell>
                      <TableCell>{trade.direction}</TableCell>
                      <TableCell>
                        ${typeof trade.investAmount === 'number'
                          ? trade.investAmount.toFixed(2)
                          : Number(trade.investAmount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(trade.entryTime)}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(trade.expiryTime)}</TableCell>
                      <TableCell>
                        <Badge variant={trade.status === 'PENDING' ? 'default' : trade.status === 'SETTLED' ? 'outline' : 'destructive'}>
                          {trade.status === 'PENDING' ? '進行中' : trade.status === 'SETTLED' ? '已結束' : '已取消'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.status === 'SETTLED' ? (
                          (() => {
                            const returnValue = Number(trade.actualReturn ?? 0);
                            const isWin = returnValue > 0;
                            return (
                              <div className={`font-medium ${isWin ? 'text-green-600' : 'text-red-600'}`}>
                                {isWin ? '盈利' : '虧損'} {isWin ? '+' : ''}${returnValue.toFixed(2)}
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-muted-foreground">-</span>
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
    </div>
  );
}

export default OpeningSessionHistoryPage;
