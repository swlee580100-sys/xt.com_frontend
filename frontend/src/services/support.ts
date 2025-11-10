import type { AxiosInstance } from 'axios';

import type { SupportConversation, SupportReplyPayload, SupportMessage } from '@/types/support';

export const supportService = {
  async listConversations(api: AxiosInstance): Promise<SupportConversation[]> {
    const response = await api.get<{ data: SupportConversation[] }>('/admin/support/conversations');
    return response.data.data;
  },

  async getConversation(api: AxiosInstance, conversationId: string): Promise<SupportConversation> {
    const response = await api.get<{ data: SupportConversation }>(
      `/admin/support/conversations/${conversationId}`
    );
    return response.data.data;
  },

  async replyConversation(
    api: AxiosInstance,
    conversationId: string,
    payload: SupportReplyPayload
  ): Promise<SupportMessage> {
    const formData = new FormData();
    formData.append('content', payload.content);
    if (payload.attachment) {
      formData.append('attachment', payload.attachment);
    }
    const response = await api.post<{ data: SupportMessage }>(
      `/admin/support/conversations/${conversationId}/reply`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data.data;
  },

  async markConversationRead(api: AxiosInstance, conversationId: string): Promise<void> {
    await api.post(`/admin/support/conversations/${conversationId}/read`);
  }
};

