import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b bg-background px-4 py-3">
      <div>
        <h1 className="text-lg font-semibold">欢迎回来{user ? `，${user.displayName}` : ''}</h1>
        <p className="text-sm text-muted-foreground">监控交易活动并模拟策略。</p>
      </div>
      {user && (
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded bg-secondary px-2 py-1 text-secondary-foreground">
            {user.roles.join(', ')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void logout();
            }}
          >
            退出登录
          </Button>
        </div>
      )}
    </header>
  );
};
