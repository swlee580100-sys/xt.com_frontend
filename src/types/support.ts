/**
 * Support Customer Service Chat System Types
 * Based on Customer Support Chat System API Documentation
 */

// 基础枚举类型
export enum ConversationStatus {
  PENDING = 'PENDING',  // 待处理（用户发起，未分配给管理员）
  ACTIVE = 'ACTIVE',    // 进行中（已分配给管理员）
  CLOSED = 'CLOSED'     // 已关闭
}

export enum SenderType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM'
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM'
}

// 基础接口
export interface ChatConversation {
  id: string;
  userId: string;
  userName: string;
  status: ConversationStatus;
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
  userUnreadCount: number;
  adminUnreadCount: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  user?: ChatUser;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: SenderType;
  senderName: string;
  messageType: MessageType;
  content: string;
  metadata?: Record<string, any> | null;
  isRead?: boolean;
  createdAt: string;
}

export interface ChatUser {
  id: string;
  displayName: string;
  email: string;
  avatar?: string;
}

// 原有接口（保持向后兼容）
export interface SupportMessage {
  id: string;
  sender: 'USER' | 'ADMIN';
  content: string;
  createdAt: string;
  read?: boolean;
  attachmentUrl?: string;
  attachmentType?: 'IMAGE' | 'VIDEO' | 'FILE';
  attachmentName?: string;
}

export type SupportConversationStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

export interface SupportConversation {
  id: string;
  userId: string;
  userName: string;
  lastMessageAt: string;
  unreadCount?: number;
  status: SupportConversationStatus;
  messages: SupportMessage[];
}

export interface SupportReplyPayload {
  content: string;
}

export interface SupportConversationStatusPayload {
  status: SupportConversationStatus;
}

// API 响应类型
export interface ConversationResponse extends ChatConversation {}

export interface MessageResponse {
  messages: ChatMessage[]; // 后端实际返回的字段名
  data?: ChatMessage[]; // 兼容旧版本
  total: number;
  hasMore: boolean;
}

export interface InitiateConversationResponse {
  conversation: ChatConversation;
}

export interface ConversationsListResponse {
  conversations: ChatConversation[]; // 后端实际返回的字段名
  data?: ChatConversation[]; // 兼容旧版本
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UploadImageResponse {
  imageUrl: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface UnreadCountResponse {
  totalUnread: number; // 后端实际返回的字段名
  conversationCount: number; // 有未读消息的对话数量
  total?: number; // 兼容旧版本
  byConversation?: Array<{
    conversationId: string;
    count: number;
  }>;
}

export interface BaseResponse {
  message?: string;
}

// 请求体类型
export interface SendMessageRequest {
  conversationId: string;
  messageType: MessageType;
  content: string;
  metadata?: Record<string, any> | null;
}

export interface UpdateMessageReadRequest {
  conversationId: string;
}

export interface ConversationsRequestParams {
  status?: ConversationStatus;
  adminId?: string;
  page?: number;
  limit?: number;
}

export interface GetUserConversationsParams {
  limit?: number;
}

export interface GetMessagesParams {
  conversationId?: string; // 可选,不传则获取当前用户的所有消息
  limit?: number;
  offset?: number;
}

// WebSocket 事件类型
export interface JoinConversationEvent {
  event: 'joinConversation';
  data: {
    conversationId: string;
  };
}

export interface SendMessageEvent {
  event: 'sendMessage';
  data: {
    conversationId: string;
    messageType: MessageType;
    content: string;
    metadata?: Record<string, any> | null;
  };
}

export interface MarkAsReadEvent {
  event: 'markAsRead';
  data: {
    conversationId: string;
  };
}

export interface TypingEvent {
  event: 'typing';
  data: {
    conversationId: string;
  };
}

export type ClientSocketEvent =
  | JoinConversationEvent
  | SendMessageEvent
  | MarkAsReadEvent
  | TypingEvent;

// Server Socket 事件类型
export interface NewMessageEvent {
  event: 'newMessage';
  data: ChatMessage;
}

export interface MessageReadEvent {
  event: 'messageRead';
  data: {
    conversationId: string;
    readBy: SenderType;
  };
}

export interface UserTypingEvent {
  event: 'userTyping';
  data: {
    conversationId: string;
    userName: string;
  };
}

export interface ConversationStatusChangedEvent {
  event: 'conversationStatusChanged';
  data: {
    conversationId: string;
    status: ConversationStatus;
  };
}

export interface AdminAssignedEvent {
  event: 'adminAssigned';
  data: {
    conversationId: string;
    adminId: string;
    adminName: string;
  };
}

export type ServerSocketEvent =
  | NewMessageEvent
  | MessageReadEvent
  | UserTypingEvent
  | ConversationStatusChangedEvent
  | AdminAssignedEvent;

// 错误响应类型
export interface ApiError {
  statusCode?: number;
  message: string;
  error?: string;
}
