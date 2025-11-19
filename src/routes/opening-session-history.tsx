import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, RefreshCw } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { marketSessionService } from '@/services/market-sessions';
import type { MarketSession } from '@/types/market-session';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OpeningSessionHistoryPage() {
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

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('zh-TW', {
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
                <p className="text-sm text-muted-foreground">預設輸贏結果</p>
                <p className="text-lg font-medium mt-1">{session.initialResult}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">實際結果</p>
                <p className="text-lg font-medium mt-1">{session.actualResult ?? '-'}</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6">未找到大盤資訊</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>歷史數據</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-10">
            尚未接上訂單歷史數據來源。若需要，我可以依大盤時間區間或 ID 串接交易列表，並提供統計。
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OpeningSessionHistoryPage;
