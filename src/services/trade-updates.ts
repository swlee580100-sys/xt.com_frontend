import { io, type Socket } from 'socket.io-client';

import { appConfig } from '@/config/env';
import type { Transaction } from '@/types/transaction';

type TradingEvent =
  | 'trading:initial-data'
  | 'trading:new-transaction'
  | 'trading:transaction-updated'
  | 'trading:status-changed'
  | 'trading:error';

type BasicEvent = 'connect' | 'disconnect' | 'connect_error';

const resolveBaseUrl = (): string => {
  const wsUrl = appConfig.wsUrl;
  if (wsUrl) {
    return wsUrl.replace(/^ws/, 'http').replace(/\/$/, '');
  }
  try {
    const apiUrl = new URL(appConfig.apiUrl);
    return `${apiUrl.protocol}//${apiUrl.host}`;
  } catch {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  }
};

const buildSocketUrl = () => `${resolveBaseUrl()}/admin/trading`;

export class AdminTradingSocket {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<(data: any) => void>> = new Map();

  constructor(private token: string | null, private adminId: string | null) {}

  connect(): void {
    if (!this.token || !this.adminId) {
      return;
    }

    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(buildSocketUrl(), {
      auth: { token: this.token },
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      this.socket?.emit('trading:subscribe', { adminId: this.adminId });
      this.emit('connect', undefined);
    });

    this.socket.on('disconnect', () => {
      this.emit('disconnect', undefined);
    });

    this.socket.on('connect_error', (error) => {
      this.emit('connect_error', error);
    });

    (['trading:initial-data', 'trading:new-transaction', 'trading:transaction-updated', 'trading:status-changed', 'trading:error'] as TradingEvent[]).forEach(event => {
      this.socket!.on(event, (data) => this.emit(event, data));
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.emit('trading:unsubscribe', {});
      this.socket.disconnect();
      this.socket = null;
    }
    this.handlers.clear();
  }

  on<T = any>(event: TradingEvent | BasicEvent, handler: (data: T) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as any);
    return () => {
      this.handlers.get(event)?.delete(handler as any);
    };
  }

  forceSettle(transactionId: string, settlementPrice?: number): Promise<Transaction> {
    if (!this.adminId) {
      return Promise.reject(new Error('缺少管理员信息'));
    }
    return this.emitAction<Transaction>('trading:force-settle', {
      transactionId,
      adminId: this.adminId,
      settlementPrice
    });
  }

  cancel(transactionId: string, reason?: string): Promise<Transaction> {
    if (!this.adminId) {
      return Promise.reject(new Error('缺少管理员信息'));
    }
    return this.emitAction<Transaction>('trading:cancel', {
      transactionId,
      adminId: this.adminId,
      reason
    });
  }

  edit(transactionId: string, updates: Record<string, any>): Promise<Transaction> {
    if (!this.adminId) {
      return Promise.reject(new Error('缺少管理员信息'));
    }
    return this.emitAction<Transaction>('trading:edit', {
      transactionId,
      adminId: this.adminId,
      updates
    });
  }

  private emitAction<T>(event: string, payload: Record<string, any>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      this.socket.emit(event, payload, (response: { success: boolean; transaction?: T; error?: string }) => {
        if (response?.success && response.transaction) {
          resolve(response.transaction);
        } else {
          reject(new Error(response?.error || '操作失败'));
        }
      });
    });
  }

  private emit(event: TradingEvent | BasicEvent, data: any): void {
    const list = this.handlers.get(event);
    if (!list) return;
    list.forEach(handler => handler(data));
  }
}

export default AdminTradingSocket;
