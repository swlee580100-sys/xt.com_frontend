import { AxiosInstance } from 'axios';
import type {
  Admin,
  PaginatedAdminsResponse,
  QueryAdminsParams,
  CreateAdminDto,
  UpdateAdminDto,
} from '@/types/admin';

export const adminService = {
  /**
   * 獲取管理員列表
   */
  list: async (
    api: AxiosInstance,
    params: QueryAdminsParams = {},
  ): Promise<PaginatedAdminsResponse> => {
    const response = await api.get('/admin/auth/admins', { params });
    console.log('管理員列表原始响应:', response.data);

    // 检查返回的数据结构
    let result = response.data.data?.data || response.data.data || response.data;
    console.log('解析后的数据:', result);

    // 如果返回的是数组（没有分页信息），则包装成分页格式
    if (Array.isArray(result)) {
      console.log('返回的是数组，包装成分页格式');
      const wrappedResult = {
        data: result,
        total: result.length,
        page: params.page || 1,
        pageSize: params.pageSize || result.length,
        totalPages: 1
      };
      console.log('包装后的结果:', wrappedResult);
      return wrappedResult;
    }

    // 如果返回的已经是分页格式，直接返回
    console.log('返回的已经是分页格式');
    return result;
  },

  /**
   * 獲取單個管理員詳情
   */
  getById: async (api: AxiosInstance, id: string): Promise<Admin> => {
    const response = await api.get(`/admin/auth/admins/${id}`);
    return response.data.data;
  },

  /**
   * 創建管理員
   */
  create: async (
    api: AxiosInstance,
    data: CreateAdminDto,
  ): Promise<Admin> => {
    const response = await api.post('/admin/auth/admins', data);
    return response.data.data;
  },

  /**
   * 更新管理員信息
   */
  update: async (
    api: AxiosInstance,
    id: string,
    data: UpdateAdminDto,
  ): Promise<Admin> => {
    const response = await api.put(`/admin/auth/admins/${id}`, data);
    return response.data.data;
  },

  /**
   * 刪除管理員
   */
  delete: async (api: AxiosInstance, id: string): Promise<void> => {
    await api.delete(`/admin/auth/admins/${id}`);
  },
};

