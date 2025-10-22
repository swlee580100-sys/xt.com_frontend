import React from 'react';
import ReactDOM from 'react-dom/client';

import { QueryProvider } from '@/providers/query-client';
import { AuthProvider } from '@/providers/auth-provider';
import { AppRouter } from '@/routes/router';

import '@/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryProvider>
  </React.StrictMode>
);
