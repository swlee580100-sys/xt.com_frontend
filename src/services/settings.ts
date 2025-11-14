import { AxiosInstance } from 'axios';
import type {
  SettingsByCategory,
  UpdateAdminAccountDto,
  UpdateTradingChannelsDto,
  UpdateCustomerServiceDto,
  UpdateLatencyDto,
  TradingChannel,
  CustomerServiceConfig,
  LatencyConfig,
  IpWhitelistConfig,
  UpdateIpWhitelistConfigDto,
  ShareConfig,
  UpdateShareConfigDto,
  DepositAddressConfig,
  UpdateDepositAddressConfigDto,
} from '@/types/settings';

export const settingsService = {
  /**
   * 获取所有設置
   */
  getAll: async (
    api: AxiosInstance,
    category?: string,
  ): Promise<SettingsByCategory> => {
    const response = await api.get('/admin/settings', {
      params: category ? { category } : {},
    });
    return response.data.data;
  },

  /**
   * 获取单個設置
   */
  getOne: async (api: AxiosInstance, key: string): Promise<any> => {
    const response = await api.get(`/admin/settings/${key}`);
    return response.data.data;
  },

  /**
   * 更新管理員帳號
   */
  updateAdminAccount: async (
    api: AxiosInstance,
    data: UpdateAdminAccountDto,
  ): Promise<void> => {
    await api.put('/admin/settings/admin-account', data);
  },

  /**
   * 获取交易渠道設置
   */
  getTradingChannels: async (
    api: AxiosInstance,
  ): Promise<TradingChannel[]> => {
    const response = await api.get('/admin/settings/trading/channels');
    return response.data.data;
  },

  /**
   * 更新交易渠道設置
   */
  updateTradingChannels: async (
    api: AxiosInstance,
    data: UpdateTradingChannelsDto,
  ): Promise<void> => {
    await api.put('/admin/settings/trading/channels', data);
  },

  /**
   * 获取客服窗口設置
   */
  getCustomerService: async (
    api: AxiosInstance,
  ): Promise<CustomerServiceConfig> => {
    const response = await api.get('/admin/settings/customer-service');
    return response.data.data;
  },

  /**
   * 更新客服窗口設置
   */
  updateCustomerService: async (
    api: AxiosInstance,
    data: UpdateCustomerServiceDto,
  ): Promise<void> => {
    await api.put('/admin/settings/customer-service', data);
  },

  /**
   * 获取延遲設置
   */
  getLatency: async (api: AxiosInstance): Promise<LatencyConfig> => {
    const response = await api.get('/admin/settings/latency');
    return response.data.data;
  },

  /**
   * 更新延遲設置
   */
  updateLatency: async (
    api: AxiosInstance,
    data: UpdateLatencyDto,
  ): Promise<void> => {
    await api.put('/admin/settings/latency', data);
  },

  /**
   * 獲取IP白名單配置
   */
  getIpWhitelistConfig: async (
    api: AxiosInstance,
  ): Promise<IpWhitelistConfig> => {
    const response = await api.get('/admin/settings/ip-whitelist');
    console.log('IP白名單配置原始响应:', response.data);
    const data = response.data.data?.data || response.data.data || response.data;
    console.log('解析后的IP白名單配置:', data);
    return data;
  },

  /**
   * 更新IP白名單配置
   */
  updateIpWhitelistConfig: async (
    api: AxiosInstance,
    data: UpdateIpWhitelistConfigDto,
  ): Promise<IpWhitelistConfig> => {
    const response = await api.put('/admin/settings/ip-whitelist', data);
    console.log('更新IP白名單配置响应:', response.data);
    const result = response.data.data?.data || response.data.data || response.data;
    console.log('解析后的更新结果:', result);
    return result;
  },

  /**
   * 獲取分享配置
   */
  getShareConfig: async (api: AxiosInstance): Promise<ShareConfig> => {
    const response = await api.get('/admin/settings/share/config');
    console.log('分享配置原始响应:', response.data);
    // 后端返回结构: { data: { data: {...} } }
    // response.data 是 { data: {...} }
    // 所以需要再取一层 .data
    const data = response.data.data?.data || response.data.data || response.data;
    console.log('解析后的分享配置:', data);
    return data;
  },

  /**
   * 更新分享配置
   */
  updateShareConfig: async (
    api: AxiosInstance,
    data: UpdateShareConfigDto,
  ): Promise<ShareConfig> => {
    const response = await api.put('/admin/settings/share/config', data);
    console.log('更新分享配置响应:', response.data);
    const result = response.data.data?.data || response.data.data || response.data;
    console.log('解析后的更新结果:', result);
    return result;
  },

  /**
   * 獲取入金地址配置
   */
  getDepositAddressConfig: async (
    api: AxiosInstance,
  ): Promise<DepositAddressConfig> => {
    const response = await api.get('/admin/settings/deposit/address');
    console.log('入金地址原始响应:', response.data);
    // 后端返回结构: { data: { data: {...} } }
    // response.data 是 { data: {...} }
    // 所以需要再取一层 .data
    const data = response.data.data?.data || response.data.data || response.data;
    console.log('解析后的入金地址配置:', data);
    return data;
  },

  /**
   * 更新入金地址配置
   */
  updateDepositAddressConfig: async (
    api: AxiosInstance,
    data: UpdateDepositAddressConfigDto,
  ): Promise<DepositAddressConfig> => {
    const response = await api.put('/admin/settings/deposit/address', data);
    console.log('更新入金地址响应:', response.data);
    const result = response.data.data?.data || response.data.data || response.data;
    console.log('解析后的更新结果:', result);
    return result;
  },
};

