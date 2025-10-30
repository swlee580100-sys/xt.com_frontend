import { AxiosInstance } from 'axios';
import type {
  User,
  PaginatedUsersResponse,
  QueryUsersParams,
  UpdateUserDto,
  UpdateUserRolesDto,
  AdjustBalanceDto,
} from '@/types/user';

export const userService = {
  /**
   * 获取用户列表
   */
  list: async (
    api: AxiosInstance,
    params: QueryUsersParams = {},
  ): Promise<PaginatedUsersResponse> => {
    const response = await api.get('/admin/users', { params });
    return response.data.data;
  },

  /**
   * 获取单个用户详情
   */
  getById: async (api: AxiosInstance, id: string): Promise<User> => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data.data;
  },

  /**
   * 更新用户信息
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
   * 激活用户
   */
  activate: async (api: AxiosInstance, id: string): Promise<User> => {
    const response = await api.patch(`/admin/users/${id}/activate`);
    return response.data.data;
  },

  /**
   * 停用用户
   */
  deactivate: async (api: AxiosInstance, id: string): Promise<User> => {
    const response = await api.patch(`/admin/users/${id}/deactivate`);
    return response.data.data;
  },

  /**
   * 修改用户角色
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
   * 调整用户余额
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
   * 删除用户
   */
  delete: async (api: AxiosInstance, id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },
};
