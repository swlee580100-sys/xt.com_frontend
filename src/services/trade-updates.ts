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
    // 將 ws:// 或 wss:// 轉換為 http:// 或 https://
    return wsUrl.replace(/^ws/, 'http').replace(/^wss/, 'https').replace(/\/$/, '');
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

// Socket.IO 的基礎 URL（不包含路徑）
const buildSocketBaseUrl = () => resolveBaseUrl();

// Socket.IO 的路徑配置
// 如果後端的 Socket.IO 服務器掛載在 /admin/trading 路徑上，使用 '/admin/trading/socket.io/'
// 如果後端的 Socket.IO 服務器在根路徑，使用 '/socket.io/'
const buildSocketPath = () => {
  // 根據環境變量或配置決定路徑
  // 目前先嘗試根路徑，如果後端確實在 /admin/trading，可以改為 '/admin/trading/socket.io/'
  return '/socket.io/';
};

export class AdminTradingSocket {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<(data: any) => void>> = new Map();

  constructor(private token: string | null, private adminId: string | null) {}

  connect(): void {
    if (!this.token || !this.adminId) {
      console.warn('TradeUpdatesSocket: Missing token or adminId, cannot connect');
      return;
    }

    if (this.socket) {
      this.disconnect();
    }

    const socketBaseUrl = buildSocketBaseUrl();
    const socketPath = buildSocketPath();
    console.log('TradeUpdatesSocket: Connecting to', socketBaseUrl, 'with path', socketPath);
    
    this.socket = io(socketBaseUrl, {
      auth: { token: this.token },
      transports: ['websocket', 'polling'], // 添加 polling 作為備選
      autoConnect: true,
      path: socketPath,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('TradeUpdatesSocket: Connected successfully');
      this.socket?.emit('trading:subscribe', { adminId: this.adminId });
      this.emit('connect', undefined);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('TradeUpdatesSocket: Disconnected, reason:', reason);
      this.emit('disconnect', undefined);
    });

    this.socket.on('connect_error', (error) => {
      console.error('TradeUpdatesSocket: Connection error', error);
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

  forceSettle(transactionId: string, settlementPrice?: number, result?: 'WIN' | 'LOSE'): Promise<Transaction> {
    if (!this.adminId) {
      return Promise.reject(new Error('缺少管理员信息'));
    }
    console.log('🔵 WebSocket forceSettle called:', { transactionId, settlementPrice, result, socketConnected: this.socket?.connected });
    return this.emitAction<Transaction>('trading:force-settle', {
      transactionId,
      adminId: this.adminId,
      settlementPrice,
      result
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
        console.error('❌ WebSocket not available');
        reject(new Error('WebSocket not connected'));
        return;
      }
      if (!this.socket.connected) {
        console.error('❌ WebSocket not connected, socket state:', this.socket.disconnected ? 'disconnected' : 'connecting');
        reject(new Error('WebSocket not connected'));
        return;
      }
      console.log('📤 Emitting WebSocket event:', event, payload);
      
      // 設置超時，避免無限等待
      const timeout = setTimeout(() => {
        console.error('❌ WebSocket emit timeout:', event);
        reject(new Error('WebSocket request timeout'));
      }, 10000); // 10秒超時
      
      this.socket.emit(event, payload, (response: { success: boolean; transaction?: T; error?: string }) => {
        clearTimeout(timeout);
        console.log('📥 WebSocket response:', event, response);
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
