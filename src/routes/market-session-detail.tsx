import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, RefreshCw } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { marketSessionService } from '@/services/market-sessions';
import type { MarketSession, MarketSessionStatus, SubMarket, SubMarketStatus } from '@/types/market-session';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

const sessionStatusConfig: Record<MarketSessionStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  PENDING: { label: '待开盘', variant: 'secondary' },
  ACTIVE: { label: '进行中', variant: 'default' },
  COMPLETED: { label: '已完成', variant: 'outline' },
  CANCELED: { label: '已取消', variant: 'destructive' }
};

const subMarketStatusConfig: Record<SubMarketStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  PENDING: { label: '待开始', variant: 'secondary' },
  ACTIVE: { label: '运行中', variant: 'default' },
  COMPLETED: { label: '已完成', variant: 'outline' },
  STOPPED: { label: '已停止', variant: 'destructive' }
};

export const MarketSessionDetailPage = () => {
  const { sessionId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { api } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<MarketSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!api || !sessionId) return;

    try {
      setIsRefreshing(true);
      const detail = await marketSessionService.admin.getSessionDetail(api, sessionId);
      setSession(detail);
    } catch (error: any) {
      console.error('Failed to fetch market session detail:', error);
      toast({
        title: '错误',
        description: error.response?.data?.message || '获取大盘详情失败',
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

  const subMarkets = useMemo<SubMarket[]>(() => session?.subMarkets ?? [], [session]);

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/market-sessions' })}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回列表
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {session?.name ?? '加载中...'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {session?.description || '查看并管理当前大盘及其小盘'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <Badge variant={sessionStatusConfig[session.status].variant}>
              {sessionStatusConfig[session.status].label}
            </Badge>
          ) : null}
          <Button variant="outline" size="sm" onClick={fetchSession} disabled={isRefreshing || isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>大盘信息</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-6">加载中...</div>
          ) : session ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">资产类型</p>
                <p className="text-lg font-medium mt-1">{session.assetType || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">创建者</p>
                <p className="text-lg font-medium mt-1">{session.createdByName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">开盘时间</p>
                <p className="text-lg font-medium mt-1">{formatDateTime(session.startTime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">结束时间</p>
                <p className="text-lg font-medium mt-1">{formatDateTime(session.endTime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">初始结果</p>
                <p className="text-lg font-medium mt-1">{session.initialResult}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">实际结果</p>
                <p className="text-lg font-medium mt-1">{session.actualResult ?? '-'}</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6">未找到大盘信息</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>小盘列表</CardTitle>
          <div className="text-sm text-muted-foreground">
            共 {subMarkets.length} 个
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-6">加载中...</div>
          ) : subMarkets.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">当前大盘下暂无小盘</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>交易时长</TableHead>
                    <TableHead>收益率</TableHead>
                    <TableHead>总周期</TableHead>
                    <TableHead>已完成</TableHead>
                    <TableHead>开始时间</TableHead>
                    <TableHead>结束时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subMarkets.map(subMarket => {
                    const status = subMarketStatusConfig[subMarket.status];
                    return (
                      <TableRow key={subMarket.id}>
                        <TableCell className="font-medium">{subMarket.name}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>{subMarket.tradeDuration}s</TableCell>
                        <TableCell>{subMarket.profitRate}%</TableCell>
                        <TableCell>{subMarket.totalCycles}</TableCell>
                        <TableCell>{subMarket.completedCycles}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(subMarket.startTime)}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(subMarket.endTime)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketSessionDetailPage;
