import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const OrdersPage = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>订单</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          订单管理视图将显示在这里。集成后端订单 API 以显示模拟交易和状态。
        </p>
      </CardContent>
    </Card>
  );
};
