import { AxiosInstance } from 'axios';
import type {
  User,
  PaginatedUsersResponse,
  QueryUsersParams,
  UpdateUserDto,
  UpdateUserRolesDto,
  AdjustBalanceDto,
  ResetPasswordDto,
} from '@/types/user';

export const userService = {
  /**
   * 获取用戶列表
   */
  list: async (
    api: AxiosInstance,
    params: QueryUsersParams = {},
  ): Promise<PaginatedUsersResponse> => {
    const response = await api.get('/admin/users', { params });
    return response.data.data;
  },

  /**
   * 获取单個用戶详情
   */
  getById: async (api: AxiosInstance, id: string): Promise<User> => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data.data;
  },

  /**
   * 更新用戶信息
   */
  update: async (
    api: AxiosInstance,
    id: string,
    data: UpdateUserDto,
  ): Promise<User> => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data.data;
  },

  /**
   * 激活用戶
   */
  activate: async (api: AxiosInstance, id: string): Promise<User> => {
    const response = await api.patch(`/admin/users/${id}/activate`);
    return response.data.data;
  },

  /**
   * 停用用戶
   */
  deactivate: async (api: AxiosInstance, id: string): Promise<User> => {
    const response = await api.patch(`/admin/users/${id}/deactivate`);
    return response.data.data;
  },

  /**
   * 修改用戶角色
   */
  updateRoles: async (
    api: AxiosInstance,
    id: string,
    data: UpdateUserRolesDto,
  ): Promise<User> => {
    const response = await api.patch(`/admin/users/${id}/roles`, data);
    return response.data.data;
  },

  /**
   * 调整用戶余额
   */
  adjustBalance: async (
    api: AxiosInstance,
    id: string,
    data: AdjustBalanceDto,
  ): Promise<User> => {
    const response = await api.patch(`/admin/users/${id}/balance`, data);
    return response.data.data;
  },

  /**
   * 刪除用戶
   */
  delete: async (api: AxiosInstance, id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  /**
   * 管理員重置用戶密碼
   */
  resetPassword: async (
    api: AxiosInstance,
    id: string,
    data: ResetPasswordDto,
  ): Promise<User> => {
    const response = await api.patch(`/admin/users/${id}/reset-password`, data);
    return response.data.data;
  },

  /**
   * 管理員為其他用戶上傳頭像
   */
  uploadAvatar: async (
    api: AxiosInstance,
    id: string,
    file: File,
  ): Promise<User> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/auth/upload-avatar/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },
};
