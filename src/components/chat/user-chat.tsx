/**
 * Customer Support Chat Component (User Side)
 * Full-featured chat interface for users to communicate with support
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, X, User, Bot, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { supportService, SupportSocketService } from '@/services/support-chat';
import type {
  ChatConversation,
  ChatMessage,
  UploadImageResponse
} from '@/types/support';
import { ConversationStatus, MessageType, SenderType } from '@/types/support';

interface UserChatProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialConversationId?: string;
}

export const UserChat: React.FC<UserChatProps> = ({
  isOpen,
  onOpenChange,
  initialConversationId
}) => {
  const { api, user, tokens } = useAuth();
  const accessToken = tokens?.accessToken ?? null;
  const { toast } = useToast();
  const [socketService, setSocketService] = useState<SupportSocketService | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化或获取对话
  const initializeConversation = useCallback(async () => {
    if (!api || !isOpen) return;

    try {
      setIsLoading(true);
      let currentConversation: ChatConversation;

      if (initialConversationId) {
        const conversations = await supportService.getUserConversations(api, { limit: 50 });
        currentConversation =
          conversations.find(item => item.id === initialConversationId) ??
          (await supportService.getOrCreateConversation(api));
      } else {
        // 否则获取或创建新对话
        currentConversation = await supportService.getOrCreateConversation(api);
      }

      setConversation(currentConversation);

      // 获取消息历史
      if (currentConversation.id) {
        const messageResponse = await supportService.getMessages(api, {
          conversationId: currentConversation.id,
          limit: 50
        });
        setMessages(messageResponse.data);

        // 标记消息为已读
        if (currentConversation.userUnreadCount > 0) {
          await supportService.markMessagesAsRead(api, {
            conversationId: currentConversation.id
          });
        }
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      toast({
        title: '错误',
        description: '无法连接客服，请稍后再试',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, isOpen, initialConversationId, toast]);

  // 初始化 WebSocket 连接
  const initializeSocket = useCallback(() => {
    if (!api || !user || !conversation || !accessToken) return;

    try {
      const socket = new SupportSocketService(accessToken, false);
      setSocketService(socket);
      socket.connect();

      // 监听连接成功
      socket.on('connected', () => {
        console.log('Chat socket connected');
        // 加入对话房间
        if (conversation.id) {
          socket.joinConversation(conversation.id);
        }
      });

      // 监听新消息
      socket.on('newMessage', (message: ChatMessage) => {
        setMessages(prev => [...prev, message]);

        // 如果是客服消息，标记为已读
        if (message.senderType === SenderType.ADMIN) {
          socket.markAsRead(conversation.id);
        }
      });

      // 监听客服正在输入
      socket.on('userTyping', (data: { conversationId: string; userName: string }) => {
        if (data.conversationId === conversation.id) {
          setAdminTyping(true);
          // 3秒后自动清除
          setTimeout(() => setAdminTyping(false), 3000);
        }
      });

      // 监听对话状态变化
      socket.on('conversationStatusChanged', (data: { conversationId: string; status: string }) => {
        if (data.conversationId === conversation.id) {
          setConversation(prev => prev ? { ...prev, status: data.status as any } : null);
        }
      });

      // 监听客服接管
      socket.on('adminAssigned', (data: { conversationId: string; adminId: string; adminName: string }) => {
        if (data.conversationId === conversation.id) {
          setConversation(prev => prev ? {
            ...prev,
            assignedAdminId: data.adminId,
            assignedAdminName: data.adminName
          } : null);
        }
      });

      return () => {
        socket.disconnect();
      };
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }, [api, user, conversation, accessToken]);

  // 发送消息
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !socketService || !conversation) return;

    try {
      setIsSending(true);
      const messageData = {
        conversationId: conversation.id,
        messageType: MessageType.TEXT,
        content: inputMessage.trim()
      };

      socketService.sendMessage(messageData);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: '发送失败',
        description: '消息发送失败，请重试',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  }, [inputMessage, socketService, conversation, toast]);

  // 上传并发送图片
  const uploadAndSendImage = useCallback(async (file: File) => {
    if (!api || !socketService || !conversation) return;

    try {
      setIsUploading(true);
      const uploadResponse: UploadImageResponse = await supportService.uploadImage(api, file);

      const messageData = {
        conversationId: conversation.id,
        messageType: MessageType.IMAGE,
        content: uploadResponse.imageUrl,
        metadata: {
          filename: uploadResponse.filename,
          size: uploadResponse.size,
          mimeType: uploadResponse.mimeType
        }
      };

      socketService.sendMessage(messageData);
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast({
        title: '上传失败',
        description: '图片上传失败，请重试',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  }, [api, socketService, conversation, toast]);

  // 处理输入变化
  const handleInputChange = (value: string) => {
    setInputMessage(value);

    // 发送正在输入状态
    if (socketService && conversation && value.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        socketService.typing(conversation.id);
      }

      // 清除之前的定时器
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }

      // 1秒后停止输入状态
      typingTimerRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    }
  };

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 检查文件类型和大小
      if (!file.type.startsWith('image/')) {
        toast({
          title: '文件类型错误',
          description: '请选择图片文件',
          variant: 'destructive'
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast({
          title: '文件过大',
          description: '图片大小不能超过5MB',
          variant: 'destructive'
        });
        return;
      }

      uploadAndSendImage(file);
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 关闭对话
  const closeConversation = useCallback(async () => {
    if (!api || !conversation) return;

    try {
      await supportService.closeConversation(api, conversation.id);
      setConversation(prev => prev ? { ...prev, status: ConversationStatus.CLOSED } : null);
    } catch (error) {
      console.error('Failed to close conversation:', error);
    }
  }, [api, conversation]);

  // 滚动到消息底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 渲染消息
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.senderType === SenderType.USER;
    const isAdmin = message.senderType === SenderType.ADMIN;
    const isSystem = message.senderType === SenderType.SYSTEM;

    if (isSystem) {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <Badge variant="secondary" className="text-xs">
            {message.content}
          </Badge>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex items-end space-x-2 max-w-[70%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          }`}>
            {isUser ? (
              <User className="w-4 h-4" />
            ) : isAdmin ? (
              <Bot className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>

          <div className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}>
            {message.messageType === MessageType.IMAGE ? (
              <img
                src={message.content}
                alt="Chat image"
                className="max-w-full rounded cursor-pointer hover:opacity-90"
                onClick={() => window.open(message.content, '_blank')}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            <p className={`text-xs mt-1 ${
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              {formatTime(message.createdAt)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 组件挂载时的初始化
  useEffect(() => {
    if (isOpen) {
      initializeConversation();
    }
  }, [isOpen, initializeConversation]);

  // 获取对话后初始化WebSocket
  useEffect(() => {
    if (!conversation) return;
    return initializeSocket();
  }, [conversation, initializeSocket]);

  useEffect(() => {
    if (socketService && conversation) {
      socketService.joinConversation(conversation.id);
    }
  }, [socketService, conversation]);

  // 消息变化时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

    // 清理定时器
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, []);

  const handleClose = (open: boolean) => {
    if (!open && conversation?.status === ConversationStatus.ACTIVE) {
      closeConversation();
    }
    onOpenChange(open);
  };

  const handleCloseClick = () => {
    handleClose(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-lg h-[600px] flex flex-col p-0">
        <DialogHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Bot className="w-5 h-5" />
              <span>客服咨询</span>
              {conversation?.status === ConversationStatus.ACTIVE && (
                <Badge variant="secondary" className="ml-2">
                  在线
                </Badge>
              )}
              {conversation?.assignedAdminName && (
                <span className="text-sm text-muted-foreground">
                  ({conversation.assignedAdminName})
                </span>
              )}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseClick}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground">连接中...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Bot className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {conversation?.assignedAdminName
                      ? `${conversation.assignedAdminName} 为您服务`
                      : '您好！有什么可以帮助您的吗？'
                    }
                  </p>
                </div>
              </div>
            ) : (
              messages.map(renderMessage)
            )}

            {/* 客服正在输入提示 */}
            {adminTyping && (
              <div className="flex justify-start mb-2">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          {conversation?.status !== ConversationStatus.CLOSED ? (
            <div className="border-t p-4">
              <div className="flex items-center space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>

                <Input
                  value={inputMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="输入消息..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={isSending || isUploading}
                  className="flex-1"
                />

                <Button
                  size="sm"
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isSending || isUploading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {isUploading && (
                <p className="text-xs text-muted-foreground mt-1">
                  正在上传图片...
                </p>
              )}
            </div>
          ) : (
            <div className="border-t p-4 text-center">
              <p className="text-sm text-muted-foreground">
                对话已关闭
              </p>
            </div>
          )}
        </CardContent>
      </DialogContent>
    </Dialog>
  );
};

export default UserChat;
