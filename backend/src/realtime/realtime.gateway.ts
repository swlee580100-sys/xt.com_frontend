import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: {
    origin: '*'
  }
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly configService: ConfigService
  ) {}

  afterInit(server: Server) {
    this.realtimeService.registerServer(server);
    this.logger.log('Realtime gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected ${client.id} from ${client.handshake.address}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected ${client.id}`);
  }

  @SubscribeMessage('heartbeat')
  heartbeat(@ConnectedSocket() client: Socket) {
    client.emit('heartbeat:ack', { ts: Date.now() });
  }

  @SubscribeMessage('subscribe:symbol')
  handleSymbolSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { symbol: string }
  ) {
    const room = this.realtimeService.getSymbolRoom(payload.symbol);
    client.join(room);
    client.emit('subscribe:ack', { symbol: payload.symbol });
  }

  @SubscribeMessage('unsubscribe:symbol')
  handleSymbolUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { symbol: string }
  ) {
    const room = this.realtimeService.getSymbolRoom(payload.symbol);
    client.leave(room);
    client.emit('unsubscribe:ack', { symbol: payload.symbol });
  }

  @SubscribeMessage('subscribe:orders')
  handleOrdersSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string }
  ) {
    const room = this.realtimeService.getOrderRoom(payload.userId);
    client.join(room);
    client.emit('subscribe:ack', { userId: payload.userId });
  }
}
