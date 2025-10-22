import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { appConfig } from '@/config/env';

interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  ts: number;
}

export const MarketDataPage = () => {
  const { tokens } = useAuth();
  const [updates, setUpdates] = useState<PriceUpdate[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`${appConfig.wsUrl}/prices`);

    ws.onmessage = event => {
      const data = JSON.parse(event.data) as PriceUpdate;
      setUpdates(prev => {
        const filtered = prev.filter(item => item.symbol !== data.symbol);
        return [data, ...filtered].slice(0, 10);
      });
    };

    return () => {
      ws.close();
    };
  }, [tokens?.accessToken]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Market Updates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {updates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Connect the websocket server to see live price updates.
            </p>
          )}
          {updates.map(update => (
            <div key={update.symbol} className="flex items-center justify-between text-sm">
              <span className="font-medium uppercase">{update.symbol}</span>
              <span>${update.price.toFixed(2)}</span>
              <span
                className={update.change24h >= 0 ? 'text-green-600' : 'text-red-600'}
              >
                {update.change24h.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
