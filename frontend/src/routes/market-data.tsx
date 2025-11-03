import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { useMultipleBinancePrices } from '@/hooks/useBinancePrice';
import { MarketDataCard } from '@/components/market/market-data-card';
import { MarketDataTable } from '@/components/market/market-data-table';

// 常用交易对列表
const POPULAR_SYMBOLS = [
  'BTCUSDT', // 比特币
  'ETHUSDT', // 以太坊
  'BNBUSDT', // BNB
  'SOLUSDT', // Solana
  'XRPUSDT', // Ripple
  'ADAUSDT', // Cardano
  'DOGEUSDT', // Dogecoin
  'LINKUSDT', // Chainlink
];

export const MarketDataPage = () => {
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const { data, loading, error, refetch } = useMultipleBinancePrices(POPULAR_SYMBOLS, {
    refreshInterval,
  });

  const handleRefresh = () => {
    void refetch();
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">市场数据</h1>
          <p className="text-muted-foreground">实时加密货币市场行情（Binance）</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value={3000}>3秒刷新</option>
            <option value={5000}>5秒刷新</option>
            <option value={10000}>10秒刷新</option>
            <option value={0}>手动刷新</option>
          </select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      {/* 加载和错误状态 */}
      {loading && !data && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">加载市场数据...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-destructive">加载失败: {error.message}</p>
              <Button onClick={handleRefresh} className="mt-4" variant="outline">
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 市场数据展示 */}
      {data && (
        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grid">卡片视图</TabsTrigger>
            <TabsTrigger value="table">表格视图</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.map((item) => (
                <MarketDataCard key={item.symbol} data={item} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="table" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>市场行情</CardTitle>
                <CardDescription>
                  最后更新: {new Date().toLocaleTimeString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MarketDataTable data={data} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* 说明信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">数据来源</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>数据来源: Binance API</li>
            <li>更新频率: 根据设置自动刷新（支持 3秒/5秒/10秒）</li>
            <li>数据包含: 实时价格、24小时涨跌幅、最高/最低价、交易量</li>
            <li>注意: 显示价格仅供参考，实际交易以交易所实时价格为准</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
