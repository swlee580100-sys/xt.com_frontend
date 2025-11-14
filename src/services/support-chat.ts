/**
 * Customer Support Chat Service
 * Implements all API endpoints from Customer Support Chat System Documentation
 */

import type { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import type {
  ChatConversation,
  ChatMessage,
  ConversationResponse,
  MessageResponse,
  ConversationsListResponse,
  UploadImageResponse,
  UnreadCountResponse,
  BaseResponse,
  SendMessageRequest,
  UpdateMessageReadRequest,
  ConversationsRequestParams,
  GetUserConversationsParams,
  GetMessagesParams,
  ConversationStatus,
  MessageType
} from '@/types/support';
import { appConfig } from '@/config/env';

const unwrapData = <T>(payload: T | { data: T }): T => {
  let current: any = payload;
  while (current && typeof current === 'object' && 'data' in current) {
    current = current.data;
  }
  return current as T;
};

/**
 * 用户端 API 服务
 */
export const supportUserService = {
  /**
   * 获取或创建对话
   * GET /api/support/conversation
   */
  getOrCreateConversation: async (api: AxiosInstance): Promise<ChatConversation> => {
    const response = await api.get<ConversationResponse>('/support/conversation');
    return unwrapData<ChatConversation>(response.data);
  },

  /**
   * 获取用户的历史对话列表
   * GET /api/support/conversations
   */
  getUserConversations: async (api: AxiosInstance, params?: GetUserConversationsParams): Promise<ChatConversation[]> => {
    const response = await api.get<ChatConversation[] | { data: ChatConversation[] }>('/support/conversations', {
      params: { limit: params?.limit || 10 }
    });
    return unwrapData<ChatConversation[]>(response.data);
  },

  /**
   * 获取消息历史
   * GET /api/support/messages
   */
  getMessages: async (api: AxiosInstance, params: GetMessagesParams): Promise<MessageResponse> => {
    const response = await api.get<MessageResponse | { data: MessageResponse }>('/support/messages', {
      params
    });
    return unwrapData<MessageResponse>(response.data);
  },

  /**
   * 标记消息已读
   * PUT /api/support/messages/read
   */
  markMessagesAsRead: async (api: AxiosInstance, data: UpdateMessageReadRequest): Promise<BaseResponse> => {
    const response = await api.put<BaseResponse | { data: BaseResponse }>('/support/messages/read', data);
    return unwrapData<BaseResponse>(response.data);
  },

  /**
   * 关闭对话
   * POST /api/support/conversation/:id/close
   */
  closeConversation: async (api: AxiosInstance, conversationId: string): Promise<BaseResponse> => {
    const response = await api.post<BaseResponse | { data: BaseResponse }>(`/support/conversation/${conversationId}/close`);
    return unwrapData<BaseResponse>(response.data);
  },

  /**
   * 上传图片
   * POST /api/support/upload-image
   */
  uploadImage: async (api: AxiosInstance, file: File): Promise<UploadImageResponse> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post<UploadImageResponse | { data: UploadImageResponse }>('/support/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapData<UploadImageResponse>(response.data);
  },
};

/**
 * 管理端 API 服务
 */
export const supportAdminService = {
  /**
   * 获取对话列表（管理员）
   * GET /api/admin/support/conversations
   */
  getConversations: async (api: AxiosInstance, params?: ConversationsRequestParams): Promise<ConversationsListResponse> => {
    const response = await api.get<ConversationsListResponse | { data: ConversationsListResponse }>('/admin/support/conversations', {
      params
    });
    return unwrapData<ConversationsListResponse>(response.data);
  },

  /**
   * 获取对话详情
   * GET /api/admin/support/conversations/:id
   */
  getConversationDetail: async (api: AxiosInstance, conversationId: string): Promise<ChatConversation> => {
    const response = await api.get<ChatConversation | { data: ChatConversation } | { data: { conversation: ChatConversation } }>(`/admin/support/conversations/${conversationId}`);
    const data = unwrapData<ChatConversation | { conversation: ChatConversation }>(response.data);
    return (data as { conversation?: ChatConversation }).conversation ?? (data as ChatConversation);
  },

  /**
   * 接管对话
   * POST /api/admin/support/conversations/:id/assign
   */
  assignToAdmin: async (api: AxiosInstance, conversationId: string): Promise<ChatConversation> => {
    const response = await api.post<ChatConversation | { data: ChatConversation }>(`/admin/support/conversations/${conversationId}/assign`);
    // 适配响应格式
    return unwrapData<ChatConversation>(response.data);
  },

  /**
   * 发送消息（管理员）
   * POST /api/admin/support/messages
   */
  sendMessage: async (api: AxiosInstance, data: SendMessageRequest): Promise<ChatMessage> => {
    const response = await api.post<ChatMessage | { data: ChatMessage }>('/admin/support/messages', data);
    return unwrapData<ChatMessage>(response.data);
  },

  /**
   * 关闭对话
   * POST /api/admin/support/conversations/:id/close
   */
  closeConversation: async (api: AxiosInstance, conversationId: string): Promise<BaseResponse> => {
    const response = await api.post<BaseResponse | { data: BaseResponse }>(`/admin/support/conversations/${conversationId}/close`);
    return unwrapData<BaseResponse>(response.data);
  },

  /**
   * 获取未读消息统计
   * GET /api/admin/support/unread-count
   */
  getUnreadCount: async (api: AxiosInstance, adminId?: string): Promise<UnreadCountResponse> => {
    const response = await api.get<UnreadCountResponse | { data: UnreadCountResponse }>('/admin/support/unread-count', {
      params: { adminId }
    });
    return unwrapData<UnreadCountResponse>(response.data);
  },

  /**
   * 上传图片（管理员）
   * POST /api/admin/support/upload-image
   */
  uploadImage: async (api: AxiosInstance, file: File): Promise<UploadImageResponse> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post<UploadImageResponse | { data: UploadImageResponse }>('/admin/support/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapData<UploadImageResponse>(response.data);
  },

  /**
   * 获取某个对话的历史消息
   * 复用用户端的接口
   */
  getMessages: async (api: AxiosInstance, params: GetMessagesParams): Promise<MessageResponse> => {
    return supportUserService.getMessages(api, params);
  },
};

/**
 * Socket.IO 通信服务
 * 封装 Socket.IO 连接和事件处理
 */
export class SupportSocketService {
  private token: string | null;
  private socket: Socket | null = null;
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private isConnected = false;
  private readonly endpoint: string;
  private baseUrl: string;
  private joinedConversations = new Set<string>();
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;

  constructor(
    token: string | null | undefined,
    private isAdmin = false,
    baseUrl?: string,
    userId?: string | null,
    userName?: string | null
  ) {
    this.token = token ?? null;
    this.endpoint = this.isAdmin ? '/admin/chat' : '/chat';
    // Socket.IO 使用 http/https 协议，会自动升级
    this.baseUrl = (baseUrl ?? appConfig.wsUrl ?? window.location.origin).replace(/^ws/, 'http').replace(/\/$/, '');
    this.currentUserId = userId ?? null;
    this.currentUserName = userName ?? null;
  }

  /**
   * 连接 Socket.IO
   */
  connect(): void {
    if (!this.token) {
      console.warn('Socket.IO token is missing, skip connect');
      return;
    }

    if (this.socket?.connected) {
      console.log('Socket.IO already connected');
      return;
    }

    const socketUrl = `${this.baseUrl}${this.endpoint}`;

    console.log('Connecting to Socket.IO:', socketUrl);

    this.socket = io(socketUrl, {
      // 认证 token
      query: { token: this.token },

      // 传输方式
      transports: ['websocket', 'polling'],

      // 自动重连配置
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,

      // 超时设置
      timeout: 10000,
    });

    // 设置事件监听器
    this.setupSocketListeners();
  }

  /**
   * 设置 Socket.IO 事件监听器
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected', this.socket?.id);
      this.isConnected = true;
      this.emit('connected', { socketId: this.socket?.id });

      // 重新加入之前的对话
      this.joinedConversations.forEach(conversationId => {
        this.joinConversation(conversationId);
      });
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', { reason });
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connect_error:', error.message);
      this.emit('error', { message: error.message, error });
    });

    // 重连事件
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected, attempt:', attemptNumber);
      this.emit('reconnected', { attemptNumber });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnect attempt:', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Socket.IO reconnect error:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Socket.IO reconnect failed');
      this.emit('maxReconnectAttemptsReached', {});
    });

    // 业务事件监听
    this.setupBusinessEventListeners();
  }

  /**
   * 设置业务事件监听器
   */
  private setupBusinessEventListeners(): void {
    if (!this.socket) return;

    // 加入对话成功
    this.socket.on('support:joined', (data) => {
      console.log('📥 Joined conversation:', data);
      this.emit('support:joined', data);
    });

    // 收到新消息
    this.socket.on('support:message', (message) => {
      console.log('📨 New message:', message);
      this.emit('newMessage', message);
      this.emit('support:message', message);
    });

    // 对方正在输入
    this.socket.on('support:typing', (data) => {
      console.log('⌨️ User typing:', data);
      this.emit('userTyping', data);
      this.emit('support:typing', data);
    });

    // 消息已读
    this.socket.on('support:messages-read', (data) => {
      console.log('✓✓ Messages read:', data);
      this.emit('messageRead', data);
      this.emit('support:messages-read', data);
    });

    // 对话状态变更
    this.socket.on('support:conversation-status', (data) => {
      console.log('🔄 Conversation status changed:', data);
      this.emit('conversationStatusChanged', data);
      this.emit('support:conversation-status', data);
    });

    // 管理员分配
    this.socket.on('support:admin-assigned', (data) => {
      console.log('👤 Admin assigned:', data);
      this.emit('adminAssigned', data);
      this.emit('support:admin-assigned', data);
    });

    // 管理员在线状态
    this.socket.on('support:admin-status', (data) => {
      console.log('🟢 Admin status:', data);
      this.emit('adminStatus', data);
      this.emit('support:admin-status', data);
    });

    // 错误处理
    this.socket.on('support:error', (error) => {
      console.error('❌ Support error:', error);
      this.emit('error', error);
      this.emit('support:error', error);
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.eventHandlers.clear();
    this.joinedConversations.clear();
  }

  /**
   * 监听事件
   */
  on(event: string, handler: (data: any) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);

    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Socket.IO 便捷方法
   */

  // 加入对话
  joinConversation(conversationId: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket.IO not connected, cannot join conversation');
      return;
    }

    this.joinedConversations.add(conversationId);

    this.socket.emit(
      'support:join',
      {
        conversationId,
        userType: this.isAdmin ? 'admin' : 'user',
      },
      (response: any) => {
        console.log('✅ Join conversation response:', response);
        if (response?.error) {
          console.error('❌ Failed to join conversation:', response.error);
        }
      }
    );
  }

  // 发送消息
  sendMessage(data: {
    conversationId: string;
    messageType: MessageType;
    content: string;
    metadata?: any;
  }): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket.IO not connected, cannot send message');
      return;
    }

    if (!this.currentUserId || !this.currentUserName) {
      console.error('User ID or name not set');
      return;
    }

    this.socket.emit(
      'support:message',
      {
        conversationId: data.conversationId,
        senderId: this.currentUserId,
        senderType: this.isAdmin ? 'ADMIN' : 'USER',
        senderName: this.currentUserName,
        messageType: data.messageType,
        content: data.content,
        metadata: data.metadata,
      },
      (response: any) => {
        console.log('✅ Send message response:', response);
        if (response?.error) {
          console.error('❌ Failed to send message:', response.error);
        }
      }
    );
  }

  // 标记已读
  markAsRead(conversationId: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket.IO not connected, cannot mark as read');
      return;
    }

    this.socket.emit(
      'support:read',
      {
        conversationId,
        readerType: this.isAdmin ? 'admin' : 'user',
      },
      (response: any) => {
        console.log('✅ Mark as read response:', response);
        if (response?.error) {
          console.error('❌ Failed to mark as read:', response.error);
        }
      }
    );
  }

  // 正在输入
  typing(conversationId: string): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    if (!this.currentUserName) {
      console.error('User name not set');
      return;
    }

    this.socket.emit('support:typing', {
      conversationId,
      senderType: this.isAdmin ? 'ADMIN' : 'USER',
      senderName: this.currentUserName,
    });
  }

  // 离开对话
  leaveConversation(conversationId: string): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.joinedConversations.delete(conversationId);

    this.socket.emit('support:leave', {
      conversationId,
    });
  }

  // 设置用户信息
  setUserInfo(userId: string, userName: string): void {
    this.currentUserId = userId;
    this.currentUserName = userName;
  }
}

export const supportService = {
  ...supportUserService,
  admin: supportAdminService,
  socket: SupportSocketService,
};

export default supportService;
