import { BarChart3, ShoppingBag, Users, Settings, Home } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';

import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/market-data', label: 'Market Data', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export const Sidebar = () => {
  const { location } = useRouterState();

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="p-4 text-lg font-semibold">Crypto Sim</div>
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              to={item.to}
              key={item.to}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
