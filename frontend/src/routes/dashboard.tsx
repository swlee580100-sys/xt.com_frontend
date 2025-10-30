import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export const DashboardPage = () => {
  const { api } = useAuth();

  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await api.get('/health');
      return response.data.data ?? response.data;
    }
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>API 状态</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {data ? '在线' : '检查中...'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>活跃用户</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">--</p>
          <p className="text-sm text-muted-foreground">即将推出</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>开放订单</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">--</p>
          <p className="text-sm text-muted-foreground">集成订单服务</p>
        </CardContent>
      </Card>
    </div>
  );
};
