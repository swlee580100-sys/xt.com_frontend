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
          <CardTitle>API Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {data ? 'Online' : 'Checking...'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">--</p>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Open Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">--</p>
          <p className="text-sm text-muted-foreground">Integrate with order service</p>
        </CardContent>
      </Card>
    </div>
  );
};
