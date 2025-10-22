import type { PropsWithChildren } from 'react';

import { Sidebar } from './sidebar';
import { Header } from './header';

export const AppShell = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 space-y-6 p-6">{children}</main>
      </div>
    </div>
  );
};
