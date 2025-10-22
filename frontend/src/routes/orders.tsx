import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const OrdersPage = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Order management views will live here. Integrate with the backend order APIs to display
          simulated trades and statuses.
        </p>
      </CardContent>
    </Card>
  );
};
