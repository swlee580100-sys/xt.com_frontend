import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SettingsPage = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>设置</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          配置交易所连接、邮件提供商和系统限制等集成。使用 react-hook-form 和 zod 模式扩展此页面。
        </p>
      </CardContent>
    </Card>
  );
};
