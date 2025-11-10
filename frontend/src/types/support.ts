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

export interface SupportConversation {
  id: string;
  userId: string;
  userName: string;
  lastMessageAt: string;
  unreadCount?: number;
  messages: SupportMessage[];
}

export interface SupportReplyPayload {
  content: string;
  attachment?: File | null;
}

