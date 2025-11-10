import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Loader2, Paperclip, X } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { supportService } from '@/services/support';
import type { SupportConversation } from '@/types/support';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const CustomerServicePage = () => {
  const { api } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: listLoading } = useQuery({
    queryKey: ['support', 'conversations'],
    queryFn: () => supportService.listConversations(api),
    staleTime: 30_000
  });

  const [search, setSearch] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedConversationId) return;
    if (conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const filteredConversations = useMemo<SupportConversation[]>(() => {
    if (!search.trim()) return conversations;
    const keyword = search.trim().toLowerCase();
    return conversations.filter(conversation =>
      conversation.userName.toLowerCase().includes(keyword) ||
      conversation.userId.toLowerCase().includes(keyword)
    );
  }, [conversations, search]);

  const {
    data: conversationDetail,
    isLoading: detailLoading,
    isRefetching: detailRefetching
  } = useQuery({
    queryKey: ['support', 'conversation', selectedConversationId],
    queryFn: () => supportService.getConversation(api, selectedConversationId ?? ''),
    enabled: Boolean(selectedConversationId),
    refetchInterval: 15_000
  });

  useEffect(() => {
    if (!selectedConversationId) return;
    supportService
      .markConversationRead(api, selectedConversationId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['support', 'conversations'] });
      })
      .catch(() => {
        // ignore errors for marking read
      });
  }, [api, queryClient, selectedConversationId]);

  const replyMutation = useMutation({
    mutationFn: () =>
      supportService.replyConversation(api, selectedConversationId ?? '', {
        content: replyContent.trim(),
        attachment: attachmentFile
      }),
    onSuccess: () => {
      setReplyContent('');
      setAttachmentFile(null);
      setSubmitError(null);
      queryClient.invalidateQueries({ queryKey: ['support', 'conversation', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['support', 'conversations'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || '訊息送出失敗，請稍後再試';
      setSubmitError(message);
    }
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConversationId) return;
    const trimmed = replyContent.trim();
    if (!trimmed) {
      setSubmitError('回覆內容不可為空');
      return;
    }
    replyMutation.mutate();
  };

  const currentConversation = conversationDetail ?? filteredConversations.find(item => item.id === selectedConversationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">客服管理</h1>
        <p className="text-muted-foreground">
          查看用戶反饋並即時回應訊息，維持良好客戶體驗。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px,1fr] lg:grid-cols-[360px,1fr]">
        <Card className="h-full min-h-[560px] overflow-hidden">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              用戶對話
            </CardTitle>
            <CardDescription>選擇要查看的用戶訊息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="搜尋用戶名稱或 ID..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {listLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  讀取中...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  尚無符合條件的對話
                </div>
              ) : (
                filteredConversations.map(conversation => {
                  const isActive = conversation.id === selectedConversationId;
                  const lastMessage =
                    conversation.messages?.[conversation.messages.length - 1]?.content ?? '（無訊息）';
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                        isActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{conversation.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {lastMessage}
                      </div>
                      {conversation.unreadCount ? (
                        <span className="mt-2 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-[10px] font-medium text-destructive-foreground">
                          未讀 {conversation.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full min-h-[560px] flex-col overflow-hidden">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>
                {currentConversation ? currentConversation.userName : '尚未選擇對話'}
              </CardTitle>
              <CardDescription>
                {currentConversation
                  ? `用戶 ID：${currentConversation.userId}`
                  : '請從左側列表選擇一位用戶'}
              </CardDescription>
            </div>
            {detailRefetching ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                更新中...
              </span>
            ) : null}
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-3 overflow-hidden">
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto rounded-md border p-4">
              {detailLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  正在載入訊息...
                </div>
              ) : currentConversation && currentConversation.messages?.length ? (
                currentConversation.messages.map(message => {
                  const isAdmin = message.sender === 'ADMIN';
                  return (
                    <div
                      key={message.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                          isAdmin
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {message.content}
                      </div>
                      <span className="mt-1 text-xs text-muted-foreground">
                        {isAdmin ? '管理員' : '用戶'} · {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  尚未有訊息記錄
                </div>
              )}
            </div>

            <form
              className="space-y-3 rounded-md border border-muted bg-card/95 p-3"
              onSubmit={handleSubmit}
            >
              <Label htmlFor="reply-content">回覆訊息</Label>
              <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
                <Input
                  id="reply-content"
                  className="flex-1 h-11"
                  placeholder="請輸入要回覆用戶的內容..."
                  value={replyContent}
                  onChange={event => {
                    setReplyContent(event.target.value);
                    setSubmitError(null);
                  }}
                  disabled={!currentConversation || replyMutation.isPending}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (replyMutation.isPending || !currentConversation) return;
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-input bg-muted/40 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!currentConversation || replyMutation.isPending}
                    aria-label="選擇附件"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    id="support-attachment"
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={event => {
                      const file = event.target.files?.[0] ?? null;
                      setAttachmentFile(file);
                    }}
                    disabled={!currentConversation || replyMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!currentConversation || replyMutation.isPending}
                    className="inline-flex h-11 shrink-0 items-center gap-2 px-4"
                  >
                    {replyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        送出中...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        發送回覆
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {attachmentFile ? (
                <div className="flex items-center gap-2 rounded-md border border-muted px-3 py-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2 truncate">
                    <Paperclip className="h-4 w-4" />
                    {attachmentFile.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setAttachmentFile(null)}
                    disabled={replyMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  可附加圖片或影片（單檔），將與訊息一併傳送。
                </p>
              )}
              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

