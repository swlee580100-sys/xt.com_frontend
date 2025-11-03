import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { settingsService } from '@/services/settings';
import type {
  UpdateAdminAccountDto,
  UpdateTradingChannelsDto,
  UpdateCustomerServiceDto,
  UpdateLatencyDto,
  TradingChannel,
  CustomerServiceConfig,
  LatencyConfig,
} from '@/types/settings';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

export const SettingsPage = () => {
  const { api } = useAuth();
  const queryClient = useQueryClient();

  // 管理员账号表单状态
  const [adminAccount, setAdminAccount] = useState<UpdateAdminAccountDto>({
    username: '',
    password: '',
    displayName: '',
  });

  // 交易渠道状态
  const [tradingChannels, setTradingChannels] = useState<TradingChannel[]>([]);

  // 客服窗口状态
  const [customerService, setCustomerService] = useState<CustomerServiceConfig>({
    enabled: false,
    position: 'bottom-right',
    theme: 'light',
  });

  // 延迟设置状态
  const [latency, setLatency] = useState<LatencyConfig>({
    tradingDelay: 0,
    apiDelay: 0,
    priceUpdateDelay: 1000,
    settlementDelay: 0,
  });

  // 托管模式状态
  const [managedModeEnabled, setManagedModeEnabled] = useState(false);

  // 获取交易渠道设置
  const { data: tradingChannelsData } = useQuery({
    queryKey: ['settings', 'trading-channels'],
    queryFn: () => settingsService.getTradingChannels(api),
    onSuccess: (data) => {
      if (data && data.length > 0) {
        setTradingChannels(data);
      } else {
        setTradingChannels([
          { name: 'Binance', enabled: true },
          { name: 'Coinbase', enabled: false },
        ]);
      }
    },
  });

  // 获取客服窗口设置
  const { data: customerServiceData } = useQuery({
    queryKey: ['settings', 'customer-service'],
    queryFn: () => settingsService.getCustomerService(api),
    onSuccess: (data) => {
      if (data) {
        setCustomerService(data);
      }
    },
  });

  // 获取延迟设置
  const { data: latencyData } = useQuery({
    queryKey: ['settings', 'latency'],
    queryFn: () => settingsService.getLatency(api),
    onSuccess: (data) => {
      if (data) {
        setLatency(data);
      }
    },
  });

  // 获取托管模式设置
  const { data: managedModeData } = useQuery({
    queryKey: ['settings', 'managed-mode'],
    queryFn: async () => {
      const response = await api.get('/admin/settings/trading/managed-mode');
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data) {
        setManagedModeEnabled(data.enabled ?? false);
      }
    },
  });

  // Mutations
  const updateAdminAccountMutation = useMutation({
    mutationFn: (data: UpdateAdminAccountDto) =>
      settingsService.updateAdminAccount(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      alert('管理员账号已更新');
    },
  });

  const updateTradingChannelsMutation = useMutation({
    mutationFn: (data: UpdateTradingChannelsDto) =>
      settingsService.updateTradingChannels(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'trading-channels'] });
      alert('交易渠道设置已更新');
    },
  });

  const updateCustomerServiceMutation = useMutation({
    mutationFn: (data: UpdateCustomerServiceDto) =>
      settingsService.updateCustomerService(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'customer-service'] });
      alert('客服窗口设置已更新');
    },
  });

  const updateLatencyMutation = useMutation({
    mutationFn: (data: UpdateLatencyDto) =>
      settingsService.updateLatency(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'latency'] });
      alert('延迟设置已更新');
    },
  });

  const updateManagedModeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await api.put('/admin/settings/trading/managed-mode', { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'managed-mode'] });
      setManagedModeEnabled(managedModeEnabled);
      alert('托管模式设置已更新');
    },
  });

  const handleUpdateAdminAccount = (e: React.FormEvent) => {
    e.preventDefault();
    updateAdminAccountMutation.mutate(adminAccount);
  };

  const handleUpdateTradingChannels = () => {
    updateTradingChannelsMutation.mutate({ channels: tradingChannels });
  };

  const handleUpdateCustomerService = () => {
    updateCustomerServiceMutation.mutate({ config: customerService });
  };

  const handleUpdateLatency = () => {
    updateLatencyMutation.mutate({ config: latency });
  };

  const addTradingChannel = () => {
    setTradingChannels([
      ...tradingChannels,
      { name: '', enabled: false },
    ]);
  };

  const removeTradingChannel = (index: number) => {
    setTradingChannels(tradingChannels.filter((_, i) => i !== index));
  };

  const updateTradingChannel = (index: number, updates: Partial<TradingChannel>) => {
    const updated = [...tradingChannels];
    updated[index] = { ...updated[index], ...updates };
    setTradingChannels(updated);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">管理系统配置和参数</p>
      </div>

      <Tabs defaultValue="admin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admin">管理员账号</TabsTrigger>
          <TabsTrigger value="trading">交易渠道</TabsTrigger>
          <TabsTrigger value="managed-mode">托管模式</TabsTrigger>
          <TabsTrigger value="customer-service">客服窗口</TabsTrigger>
          <TabsTrigger value="latency">延迟设置</TabsTrigger>
        </TabsList>

        {/* 管理员账号设置 */}
        <TabsContent value="admin">
    <Card>
      <CardHeader>
              <CardTitle>管理员账号设置</CardTitle>
              <CardDescription>
                修改管理员登录用户名和密码
              </CardDescription>
      </CardHeader>
      <CardContent>
              <form onSubmit={handleUpdateAdminAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    value={adminAccount.username}
                    onChange={(e) =>
                      setAdminAccount({ ...adminAccount, username: e.target.value })
                    }
                    placeholder="输入新用户名"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    value={adminAccount.password}
                    onChange={(e) =>
                      setAdminAccount({ ...adminAccount, password: e.target.value })
                    }
                    placeholder="输入新密码"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">显示名称</Label>
                  <Input
                    id="displayName"
                    value={adminAccount.displayName || ''}
                    onChange={(e) =>
                      setAdminAccount({ ...adminAccount, displayName: e.target.value })
                    }
                    placeholder="输入显示名称（可选）"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={updateAdminAccountMutation.isPending}
                >
                  {updateAdminAccountMutation.isPending ? '更新中...' : '更新账号'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交易渠道设置 */}
        <TabsContent value="trading">
          <Card>
            <CardHeader>
              <CardTitle>交易渠道设置</CardTitle>
              <CardDescription>
                配置可用的交易渠道和 API 密钥
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {tradingChannels.map((channel, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="space-y-2 flex-1">
                            <Label>渠道名称</Label>
                            <Input
                              value={channel.name}
                              onChange={(e) =>
                                updateTradingChannel(index, { name: e.target.value })
                              }
                              placeholder="如: Binance, Coinbase"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.enabled}
                              onCheckedChange={(checked) =>
                                updateTradingChannel(index, { enabled: checked })
                              }
                            />
                            <Label>启用</Label>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeTradingChannel(index)}
                        >
                          删除
                        </Button>
                      </div>
                      {channel.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                              type="password"
                              value={channel.apiKey || ''}
                              onChange={(e) =>
                                updateTradingChannel(index, { apiKey: e.target.value })
                              }
                              placeholder="输入 API Key"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>API Secret</Label>
                            <Input
                              type="password"
                              value={channel.apiSecret || ''}
                              onChange={(e) =>
                                updateTradingChannel(index, { apiSecret: e.target.value })
                              }
                              placeholder="输入 API Secret"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex space-x-2">
                <Button onClick={addTradingChannel} variant="outline">
                  添加渠道
                </Button>
                <Button
                  onClick={handleUpdateTradingChannels}
                  disabled={updateTradingChannelsMutation.isPending}
                >
                  {updateTradingChannelsMutation.isPending ? '保存中...' : '保存设置'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 客服窗口设置 */}
        <TabsContent value="customer-service">
          <Card>
            <CardHeader>
              <CardTitle>客服窗口设置</CardTitle>
              <CardDescription>
                配置客服聊天窗口的位置、主题和提供商
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>启用客服窗口</Label>
        <p className="text-sm text-muted-foreground">
                    在网站中显示客服聊天窗口
                  </p>
                </div>
                <Switch
                  checked={customerService.enabled}
                  onCheckedChange={(checked) =>
                    setCustomerService({ ...customerService, enabled: checked })
                  }
                />
              </div>

              {customerService.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>提供商</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      value={customerService.provider || 'custom'}
                      onChange={(e) =>
                        setCustomerService({ ...customerService, provider: e.target.value })
                      }
                    >
                      <option value="custom">自定义</option>
                      <option value="tawk">Tawk.to</option>
                      <option value="intercom">Intercom</option>
                    </select>
                  </div>

                  {customerService.provider === 'custom' && (
                    <div className="space-y-2">
                      <Label>脚本 URL</Label>
                      <Input
                        value={customerService.scriptUrl || ''}
                        onChange={(e) =>
                          setCustomerService({ ...customerService, scriptUrl: e.target.value })
                        }
                        placeholder="https://example.com/widget.js"
                      />
                    </div>
                  )}

                  {(customerService.provider === 'tawk' || customerService.provider === 'intercom') && (
                    <div className="space-y-2">
                      <Label>Widget ID</Label>
                      <Input
                        value={customerService.widgetId || ''}
                        onChange={(e) =>
                          setCustomerService({ ...customerService, widgetId: e.target.value })
                        }
                        placeholder="输入 Widget ID"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>位置</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                        value={customerService.position}
                        onChange={(e) =>
                          setCustomerService({
                            ...customerService,
                            position: e.target.value as any,
                          })
                        }
                      >
                        <option value="bottom-right">右下角</option>
                        <option value="bottom-left">左下角</option>
                        <option value="top-right">右上角</option>
                        <option value="top-left">左上角</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>主题</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                        value={customerService.theme}
                        onChange={(e) =>
                          setCustomerService({
                            ...customerService,
                            theme: e.target.value as any,
                          })
                        }
                      >
                        <option value="light">浅色</option>
                        <option value="dark">深色</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>欢迎消息</Label>
                    <Input
                      value={customerService.welcomeMessage || ''}
                      onChange={(e) =>
                        setCustomerService({
                          ...customerService,
                          welcomeMessage: e.target.value,
                        })
                      }
                      placeholder="输入欢迎消息（可选）"
                    />
                  </div>
                </>
              )}

              <Button
                onClick={handleUpdateCustomerService}
                disabled={updateCustomerServiceMutation.isPending}
              >
                {updateCustomerServiceMutation.isPending ? '保存中...' : '保存设置'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 托管模式设置 */}
        <TabsContent value="managed-mode">
          <Card>
            <CardHeader>
              <CardTitle>托管模式设置</CardTitle>
              <CardDescription>
                启用后，系统内所有用户产生的交易都将被标记为托管交易
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="system-managed-mode">系统托管模式</Label>
                  <p className="text-sm text-muted-foreground">
                    启用后，所有交易都将标记为托管交易，用于区分系统托管和手动交易
                  </p>
                </div>
                <Switch
                  id="system-managed-mode"
                  checked={managedModeEnabled}
                  onCheckedChange={(checked) => {
                    setManagedModeEnabled(checked);
                    updateManagedModeMutation.mutate(checked);
                  }}
                  disabled={updateManagedModeMutation.isPending}
                />
              </div>
              {updateManagedModeMutation.isPending && (
                <p className="text-sm text-muted-foreground">更新中...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 延迟设置 */}
        <TabsContent value="latency">
          <Card>
            <CardHeader>
              <CardTitle>延迟设置</CardTitle>
              <CardDescription>
                配置系统各功能的延迟时间（单位：毫秒）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tradingDelay">交易延迟</Label>
                  <Input
                    id="tradingDelay"
                    type="number"
                    min="0"
                    value={latency.tradingDelay}
                    onChange={(e) =>
                      setLatency({
                        ...latency,
                        tradingDelay: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    交易执行的延迟时间（毫秒）
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiDelay">API 调用延迟</Label>
                  <Input
                    id="apiDelay"
                    type="number"
                    min="0"
                    value={latency.apiDelay}
                    onChange={(e) =>
                      setLatency({
                        ...latency,
                        apiDelay: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    API 请求的延迟时间（毫秒）
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceUpdateDelay">价格更新延迟</Label>
                  <Input
                    id="priceUpdateDelay"
                    type="number"
                    min="0"
                    value={latency.priceUpdateDelay}
                    onChange={(e) =>
                      setLatency({
                        ...latency,
                        priceUpdateDelay: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    价格数据更新的延迟时间（毫秒）
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settlementDelay">结算延迟</Label>
                  <Input
                    id="settlementDelay"
                    type="number"
                    min="0"
                    value={latency.settlementDelay}
                    onChange={(e) =>
                      setLatency({
                        ...latency,
                        settlementDelay: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    交易结算的延迟时间（毫秒）
                  </p>
                </div>
              </div>
              <Button
                onClick={handleUpdateLatency}
                disabled={updateLatencyMutation.isPending}
              >
                {updateLatencyMutation.isPending ? '保存中...' : '保存设置'}
              </Button>
      </CardContent>
    </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
