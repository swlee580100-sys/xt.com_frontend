import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export const Header = () => {
  const { user, logout } = useAuth();

  // 將簡體中文轉換為繁體
  const convertToTraditional = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/系统管理员/g, '系統管理員')
      .replace(/系统/g, '系統')
      .replace(/管理员/g, '管理員')
      .trim();
  };

  // 獲取顯示名稱（轉換簡體為繁體）
  const getDisplayName = (): string => {
    if (!user?.displayName) return '';
    return convertToTraditional(user.displayName);
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
      <div>
        <h1 className="text-lg font-semibold">歡迎回來{user ? `，${getDisplayName()}` : ''}</h1>
        <p className="text-sm text-muted-foreground">監控交易活動並模擬策略。</p>
      </div>
      {user && (
        <div className="flex items-center gap-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void logout();
            }}
          >
            退出登入
          </Button>
        </div>
      )}
    </header>
  );
};
