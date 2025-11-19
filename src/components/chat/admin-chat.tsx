/**
 * Customer Support Chat Component (Admin Side)
 * Admin interface for managing customer support conversations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Users, XCircle, Send, User, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { supportService, SupportSocketService } from '@/services/support-chat';
import type { ChatConversation, ChatMessage } from '@/types/support';
import { ConversationStatus, MessageType, SenderType } from '@/types/support';

export const AdminChat: React.FC = () => {
  const { api, user, tokens } = useAuth();
  const adminUser = user;
  const accessToken = tokens?.accessToken ?? null;
  const { toast } = useToast();
  const [socketService, setSocketService] = useState<SupportSocketService | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('active');
  const selectedConversationRef = useRef<ChatConversation | null>(null);

  // 获取对话列表
  const fetchConversations = useCallback(async (status?: ConversationStatus) => {
    if (!api) return;

    try {
      setIsLoading(true);
      // 不传 status 参数，获取所有对话
      const response = await supportService.admin.getConversations(api, {
        page: 1,
        limit: 50
      });
      // 后端返回的是 { conversations: [], total: 0, ... }
      const conversationsList = response.conversations || response.data || [];
      // 調試：檢查對話數據
      console.log('對話列表數據:', conversationsList);
      conversationsList.forEach((conv: any) => {
        console.log(`對話 ${conv.userName}:`, {
          adminUnreadCount: conv.adminUnreadCount,
          unreadCount: conv.unreadCount,
          adminUnread: conv.adminUnread,
          unread: conv.unread,
          fullObject: conv
        });
      });
      // 映射數據：將後端可能的欄位名稱映射到前端需要的欄位
      const mappedConversations = conversationsList.map((conv: any) => ({
        ...conv,
        // 嘗試多種可能的欄位名稱
        adminUnreadCount: conv.adminUnreadCount ?? conv.unreadCount ?? conv.adminUnread ?? conv.unread ?? 0,
        // 確保 userUnreadCount 也有值
        userUnreadCount: conv.userUnreadCount ?? 0
      }));
      setConversations(mappedConversations);
    } catch (error: any) {
      console.error('❌ Failed to fetch conversations:', error);
      console.error('Error details:', error.response?.data);
      setConversations([]);
      toast({
        title: '錯誤',
        description: error.response?.data?.message || '無法取得對話列表',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, toast]);

  // 获取未读消息统计
  const fetchUnreadCount = useCallback(async () => {
    if (!api || !adminUser) return;

    try {
      const response = await supportService.admin.getUnreadCount(api, adminUser.id);
      // 后端返回的是 totalUnread
      setUnreadCount(response.totalUnread || response.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [api, adminUser]);

  // 选择对话
  const selectConversation = useCallback(async (conversation: ChatConversation) => {
    setSelectedConversation(conversation);

    if (!api) return;

    try {
      // 如果对话未分配，先接管对话
      if (!conversation.assignedAdminId) {
        await supportService.admin.assignToAdmin(api, conversation.id);
        // 更新对话列表
        fetchConversations(activeTab === 'active' ? ConversationStatus.ACTIVE : ConversationStatus.CLOSED);
      }

      // 获取对话详情（推荐方式1：对话详情接口会返回所有消息）
      const conversationDetail = await supportService.admin.getConversationDetail(api, conversation.id);
      // 映射數據：確保 adminUnreadCount 有值
      const mappedDetail = {
        ...conversationDetail,
        adminUnreadCount: conversationDetail.adminUnreadCount ?? conversationDetail.unreadCount ?? 0,
        userUnreadCount: conversationDetail.userUnreadCount ?? 0
      };
      setSelectedConversation(mappedDetail);

      // 从对话详情中获取消息列表
      if (conversationDetail.messages && conversationDetail.messages.length > 0) {
        setMessages(conversationDetail.messages);
      } else {
        // 如果对话详情中没有消息，则单独获取（方式2）
        const messageResponse = await supportService.admin.getMessages(api, {
          conversationId: conversationDetail.id,
          limit: 100
        });
        setMessages(messageResponse.messages || messageResponse.data || []);
      }

      // 如果有未讀訊息，標記為已讀
      if (conversation.adminUnreadCount > 0 && socketService) {
        socketService.markAsRead(conversation.id);
        // 更新對話列表中的未讀數量
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversation.id
              ? { ...conv, adminUnreadCount: 0 }
              : conv
          )
        );
        // 更新未讀訊息總數
        fetchUnreadCount();
      }
    } catch (error: any) {
      console.error('Failed to load conversation:', error);
      setMessages([]);
      toast({
        title: '錯誤',
        description: error.response?.data?.message || '無法載入對話詳情',
        variant: 'destructive'
      });
    }
  }, [api, toast, activeTab, fetchConversations, socketService, fetchUnreadCount]);

  // 发送消息
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !selectedConversation || !api) return;

    try {
      setIsSending(true);
      const messageData = {
        conversationId: selectedConversation.id,
        messageType: MessageType.TEXT,
        content: inputMessage.trim()
      };

      const message = await supportService.admin.sendMessage(api, messageData);
      setMessages(prev => [...prev, message]);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: '發送失敗',
        description: '訊息發送失敗，請重試',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  }, [inputMessage, selectedConversation, api, toast]);

  // 关闭对话
  const closeConversation = useCallback(async () => {
    if (!api || !selectedConversation) return;

    try {
      await supportService.admin.closeConversation(api, selectedConversation.id);
      // 更新選中的對話狀態
      const updatedConversation = { ...selectedConversation, status: ConversationStatus.CLOSED };
      setSelectedConversation(updatedConversation);
      // 更新對話列表中的該對話狀態
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, status: ConversationStatus.CLOSED }
            : conv
        )
      );
      // 更新對話列表（不傳 status 參數，獲取所有對話）
      await fetchConversations(undefined);
      // 切換到處理完畢分頁
      setActiveTab('closed');
    } catch (error) {
      console.error('Failed to close conversation:', error);
    }
  }, [api, selectedConversation, fetchConversations]);

  // 初始化 Socket.IO
  useEffect(() => {
    if (!api || !adminUser || !accessToken) {
      return;
    }

    // 创建 Socket.IO 服务，传递管理员信息
    const socket = new SupportSocketService(
      accessToken,
      true, // isAdmin
      undefined, // baseUrl (使用默认配置)
      adminUser.id, // userId
      adminUser.username || adminUser.email || 'Admin' // userName
    );

    setSocketService(socket);

    // 设置用户信息
    socket.setUserInfo(
      adminUser.id,
      adminUser.username || adminUser.email || 'Admin'
    );

    // 连接
    socket.connect();

    // 监听连接事件
    socket.on('connected', () => {
      // Socket connected
    });

    socket.on('disconnected', () => {
      // Socket disconnected
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.on('reconnected', () => {
      // 重连后刷新对话列表
      fetchConversations(activeTab === 'active' ? ConversationStatus.ACTIVE : ConversationStatus.CLOSED);
    });

    // 监听业务事件
    socket.on('newMessage', (message: ChatMessage) => {
      if (selectedConversationRef.current && message.conversationId === selectedConversationRef.current.id) {
        setMessages(prev => [...prev, message]);
      }
      // 刷新对话列表以更新最后消息时间
      fetchConversations(activeTab === 'active' ? ConversationStatus.ACTIVE : ConversationStatus.CLOSED);
    });

    socket.on('conversationStatusChanged', (data: { conversationId: string; status: string }) => {
      if (selectedConversationRef.current && data.conversationId === selectedConversationRef.current.id) {
        setSelectedConversation(prev => prev ? { ...prev, status: data.status as any } : null);
      }
      fetchConversations(activeTab === 'active' ? ConversationStatus.ACTIVE : ConversationStatus.CLOSED);
    });

    socket.on('adminAssigned', (data: { conversationId: string; adminId: string; adminName: string }) => {
      fetchConversations(activeTab === 'active' ? ConversationStatus.ACTIVE : ConversationStatus.CLOSED);
    });

    socket.on('userTyping', (data: { senderType: string; senderName: string }) => {
      // TODO: 显示"正在输入"指示器
    });

    socket.on('messageRead', (data: { conversationId: string; readerType: string }) => {
      // 更新對話列表中的未讀數量
      setConversations(prev =>
        prev.map(conv =>
          conv.id === data.conversationId
            ? { ...conv, adminUnreadCount: 0 }
            : conv
        )
      );
      // 更新未讀訊息總數
      fetchUnreadCount();
    });

    return () => {
      socket.disconnect();
    };
  }, [api, adminUser, accessToken, fetchConversations, activeTab, fetchUnreadCount]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    if (socketService && selectedConversation) {
      // 等待 socket 连接后再加入
      const joinConv = () => {
        if (socketService.getConnectionStatus()) {
          socketService.joinConversation(selectedConversation.id);
        } else {
          // 监听连接成功事件后再加入
          const unsubscribe = socketService.on('connected', () => {
            socketService.joinConversation(selectedConversation.id);
            unsubscribe();
          });
        }
      };
      joinConv();
    }
  }, [socketService, selectedConversation]);

  // 初始化数据
  useEffect(() => {
    fetchConversations(ConversationStatus.ACTIVE);
    fetchUnreadCount();
  }, [fetchConversations, fetchUnreadCount]);

  // 标签切换时重新获取数据
  useEffect(() => {
    const status = activeTab === 'active' ? ConversationStatus.ACTIVE : ConversationStatus.CLOSED;
    fetchConversations(status);
  }, [activeTab, fetchConversations]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const getDateKey = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  };

  const getStatusBadge = (status: ConversationStatus) => {
    switch (status) {
      case ConversationStatus.PENDING:
        return <Badge variant="outline">待處理</Badge>;
      case ConversationStatus.ACTIVE:
        return <Badge variant="default">進行中</Badge>;
      case ConversationStatus.CLOSED:
        return <Badge variant="secondary">處理完畢</Badge>;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">客服聊天</h1>
          <p className="text-muted-foreground">處理用戶諮詢與支援請求</p>
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <>
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <Badge variant="destructive">{unreadCount} 條未讀訊息</Badge>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('🔄 Fetching ALL conversations (no status filter)');
              fetchConversations(undefined);
            }}
          >
            重新整理全部
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[560px]">
        {/* 对话列表 */}
        <Card className="lg:col-span-1 flex flex-col h-full overflow-hidden">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>對話列表</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                <TabsTrigger value="active" className="text-sm">
                  進行中
                </TabsTrigger>
                <TabsTrigger value="closed" className="text-sm">
                  處理完畢
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="flex-1 overflow-y-auto mt-2 min-h-0">
                <div className="space-y-2">
                  {(() => {
                    // 进行中的对话包括 PENDING 和 ACTIVE 状态
                    const activeConversations = conversations.filter(conv =>
                      conv.status === ConversationStatus.PENDING ||
                      conv.status === ConversationStatus.ACTIVE
                    );

                    if (activeConversations.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          {conversations.length === 0 ? '暫無對話' : '暫無進行中的對話'}
                        </div>
                      );
                    }

                    return activeConversations;
                  })()
                    .map?.(conversation => (
                      <div
                        key={conversation.id}
                        onClick={() => selectConversation(conversation)}
                        className={`relative p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                          selectedConversation?.id === conversation.id ? 'bg-accent' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{conversation.userName}</span>
                              {conversation.assignedAdminName && (
                                <Badge variant="outline" className="text-xs">
                                  {conversation.assignedAdminName}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : '暫無訊息'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            {getStatusBadge(conversation.status)}
                          </div>
                          {conversation.adminUnreadCount > 0 && (
                            <span 
                              className="absolute bottom-1 right-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white z-10 shadow-sm"
                              style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                            >
                              {conversation.adminUnreadCount > 99 ? '99+' : conversation.adminUnreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="closed" className="flex-1 overflow-y-auto mt-2 min-h-0">
                <div className="space-y-2">
                  {(() => {
                    const closedConversations = conversations.filter(conv => conv.status === ConversationStatus.CLOSED);

                    if (closedConversations.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          {conversations.length === 0 ? '暫無對話' : '暫無處理完畢的對話'}
                        </div>
                      );
                    }

                    return closedConversations;
                  })()
                    .map?.(conversation => (
                      <div
                        key={conversation.id}
                        onClick={() => selectConversation(conversation)}
                        className={`relative p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                          selectedConversation?.id === conversation.id ? 'bg-accent' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{conversation.userName}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : '暫無訊息'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            {getStatusBadge(conversation.status)}
                          </div>
                          {conversation.adminUnreadCount > 0 && (
                            <span 
                              className="absolute bottom-1 right-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white z-10 shadow-sm"
                              style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                            >
                              {conversation.adminUnreadCount > 99 ? '99+' : conversation.adminUnreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 聊天区域 */}
        <Card className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          {selectedConversation ? (
            <>
              <CardHeader className="pt-3 pb-3 px-6 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5" />
                    <div>
                      <CardTitle className="text-lg">{selectedConversation.userName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.user?.email}
                      </p>
                    </div>
                    {getStatusBadge(selectedConversation.status)}
                  </div>
                  {selectedConversation.status === ConversationStatus.ACTIVE && (
                    <Button variant="destructive" size="sm" onClick={closeConversation}>
                      <XCircle className="w-4 h-4 mr-2" />
                      處理完畢
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
                {/* 消息列表 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                  {messages
                    .filter(message =>
                      // 过滤掉系统消息（如"管理员已加入对话"）
                      message.senderType !== SenderType.SYSTEM &&
                      message.messageType !== MessageType.SYSTEM
                    )
                    .map((message, index, filteredMessages) => {
                      const currentDateKey = getDateKey(message.createdAt);
                      const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
                      const prevDateKey = prevMessage ? getDateKey(prevMessage.createdAt) : null;
                      const showDateSeparator = !prevDateKey || currentDateKey !== prevDateKey;

                      return (
                        <React.Fragment key={message.id}>
                          {showDateSeparator && (
                            <div className="flex justify-center my-4">
                              <div className="px-3 py-1 rounded-md bg-muted text-muted-foreground text-xs">
                                {formatDate(message.createdAt)}
                              </div>
                            </div>
                          )}
                          <div
                            className={`flex ${message.senderType === SenderType.ADMIN ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              message.senderType === SenderType.ADMIN
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}>
                              {message.messageType === MessageType.IMAGE ? (
                                <img
                                  src={message.content}
                                  alt="Chat image"
                                  className="max-w-full rounded"
                                />
                              ) : (
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              )}
                              <p className={`text-xs mt-1 ${
                                message.senderType === SenderType.ADMIN
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}>
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                </div>

                {/* 输入区域 */}
                {selectedConversation.status === ConversationStatus.ACTIVE && (
                  <div className="border-t p-4 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="輸入回覆..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        disabled={isSending}
                        className="flex-1"
                      />
                      <Button onClick={sendMessage} disabled={!inputMessage.trim() || isSending}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  選擇一個對話開始聊天
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminChat;
