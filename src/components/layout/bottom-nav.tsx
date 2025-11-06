import { BarChart3, ShoppingBag, Users, Settings, Home, FileText, UserCog } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';

import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: '儀表板', icon: Home },
  { to: '/orders', label: '交易流水', icon: ShoppingBag },
  { to: '/market-data', label: '市場數據', icon: BarChart3 },
  { to: '/users', label: '用戶', icon: Users },
  { to: '/operators', label: '操作員', icon: UserCog },
  { to: '/cms', label: 'CMS 管理', icon: FileText },
  { to: '/settings', label: '設置', icon: Settings }
];

export const BottomNav = () => {
  const { location } = useRouterState();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card xs:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              to={item.to}
              key={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full text-xs transition-colors',
                isActive ? 'bg-black text-white' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-white')} />
              <span className={cn('text-[10px] leading-tight', isActive && 'text-white')}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

