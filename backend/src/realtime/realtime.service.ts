import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  ts: number;
}

interface OrderUpdate {
  userId: string;
  orderId: string;
  status: string;
  filledQuantity: number;
  ts: number;
}

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server: Server | null = null;

  registerServer(server: Server): void {
    this.server = server;
  }

  getSymbolRoom(symbol: string): string {
    return `symbol:${symbol.toLowerCase()}`;
  }

  getOrderRoom(userId: string): string {
    return `orders:${userId}`;
  }

  broadcastPriceUpdate(update: PriceUpdate): void {
    if (!this.server) {
      this.logger.warn('Realtime server not registered yet');
      return;
    }

    const room = this.getSymbolRoom(update.symbol);
    this.server.to(room).emit('price:update', update);
  }

  broadcastOrderUpdate(update: OrderUpdate): void {
    if (!this.server) {
      this.logger.warn('Realtime server not registered yet');
      return;
    }

    const room = this.getOrderRoom(update.userId);
    this.server.to(room).emit('order:update', update);
  }
}
