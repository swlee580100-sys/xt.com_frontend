import { AxiosInstance } from 'axios';
import type {
  Transaction,
  PaginatedTransactionsResponse,
  QueryTransactionsParams,
  SettleTransactionDto,
  ForceSettleDto,
  CreateTransactionDto,
  UpdateTransactionDto,
} from '@/types/transaction';

export const transactionService = {
  /**
   * 获取交易列表
   */
  list: async (
    api: AxiosInstance,
    params: QueryTransactionsParams = {},
  ): Promise<PaginatedTransactionsResponse> => {
    const response = await api.get('/admin/transactions', { params });
    return response.data.data;
  },

  /**
   * 根據訂單号获取交易详情
   */
  getByOrderNumber: async (
    api: AxiosInstance,
    orderNumber: string,
  ): Promise<Transaction> => {
    const response = await api.get(`/transactions/${orderNumber}`);
    return response.data.data;
  },

  /**
   * 結算交易
   */
  settle: async (
    api: AxiosInstance,
    orderNumber: string,
    data: SettleTransactionDto,
  ): Promise<Transaction> => {
    const response = await api.post(`/transactions/${orderNumber}/settle`, data);
    return response.data.data;
  },

  /**
   * 管理端強制結算交易
   */
  forceSettle: async (
    api: AxiosInstance,
    orderNumber: string,
    data: ForceSettleDto = {}
  ): Promise<Transaction> => {
    const response = await api.post(`/admin/transactions/${orderNumber}/force-settle`, data);
    return response.data.data;
  },

  /**
   * 取消交易
   */
  cancel: async (api: AxiosInstance, orderNumber: string): Promise<Transaction> => {
    const response = await api.post(`/transactions/${orderNumber}/cancel`);
    return response.data.data;
  },

  /**
   * 获取用戶统计數據
   */
  getStatistics: async (api: AxiosInstance) => {
    const response = await api.get('/transactions/statistics');
    return response.data.data;
  },

  /**
   * 創建交易（管理端）
   */
  create: async (
    api: AxiosInstance,
    data: CreateTransactionDto,
  ): Promise<Transaction> => {
    const response = await api.post('/admin/transactions/create', data);
    return response.data.data;
  },

  /**
   * 更新交易（管理端）
   */
  update: async (
    api: AxiosInstance,
    orderNumber: string,
    data: UpdateTransactionDto,
  ): Promise<Transaction> => {
    const response = await api.put(`/admin/transactions/${orderNumber}`, data);
    return response.data.data;
  },
};
