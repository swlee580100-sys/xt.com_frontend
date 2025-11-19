/**
 * Market Session Service
 * 大小盘系统 API 服务
 */

import type { AxiosInstance } from 'axios';
import type {
  MarketSession,
  SubMarketCycle,
  CreateMarketSessionRequest,
  UpdateMarketSessionRequest,
  GetMarketSessionsParams,
  GetCyclesParams,
  MarketSessionListResponse,
  CyclesListResponse,
  StartMarketSessionResponse,
  StopMarketSessionResponse
} from '@/types/market-session';

const unwrapData = <T>(payload: T | { data: T }): T => {
  let current: any = payload;
  while (current && typeof current === 'object' && 'data' in current) {
    current = current.data;
  }
  return current as T;
};

/**
 * 用户端 API
 */
export const marketSessionUserService = {
  /**
   * 获取活跃的大盘
   * GET /api/market-sessions/active
   */
  getActiveSessions: async (api: AxiosInstance): Promise<MarketSession[]> => {
    const response = await api.get<MarketSession[]>('/market-sessions/active');
    return response.data;
  },

  /**
   * 获取大盘详情
   * GET /api/market-sessions/:id
   */
  getSessionDetail: async (api: AxiosInstance, id: string): Promise<MarketSession> => {
    const response = await api.get<MarketSession>(`/market-sessions/${id}`);
    return response.data;
  },

  /**
   * 获取小盘当前周期
   * GET /api/market-sessions/sub-markets/:subMarketId/current-cycle
   */
  getCurrentCycle: async (api: AxiosInstance, subMarketId: string): Promise<SubMarketCycle> => {
    const response = await api.get<SubMarketCycle>(
      `/market-sessions/sub-markets/${subMarketId}/current-cycle`
    );
    return response.data;
  },

  /**
   * 获取小盘历史周期
   * GET /api/market-sessions/sub-markets/:subMarketId/cycles
   */
  getCycles: async (
    api: AxiosInstance,
    subMarketId: string,
    params?: GetCyclesParams
  ): Promise<CyclesListResponse> => {
    const response = await api.get<CyclesListResponse>(
      `/market-sessions/sub-markets/${subMarketId}/cycles`,
      { params }
    );
    return response.data;
  }
};

/**
 * 管理员 API
 */
export const marketSessionAdminService = {
  /**
   * 创建大盘
   * POST /api/admin/market-sessions
   */
  createSession: async (
    api: AxiosInstance,
    data: CreateMarketSessionRequest
  ): Promise<MarketSession> => {
    const response = await api.post<MarketSession>('/admin/market-sessions', data);
    return response.data;
  },

  /**
   * 获取大盘列表
   * GET /api/admin/market-sessions
   */
  getSessions: async (
    api: AxiosInstance,
    params?: GetMarketSessionsParams
  ): Promise<MarketSessionListResponse> => {
    const response = await api.get<MarketSessionListResponse | { data: MarketSessionListResponse }>('/admin/market-sessions', {
      params
    });
    return unwrapData<MarketSessionListResponse>(response.data);
  },

  /**
   * 获取大盘详情
   * GET /api/admin/market-sessions/:id
   */
  getSessionDetail: async (api: AxiosInstance, id: string): Promise<MarketSession> => {
    const response = await api.get<
      MarketSession |
      { data: MarketSession } |
      { data: { marketSession: MarketSession } }
    >(`/admin/market-sessions/${id}`);
    const data = unwrapData<MarketSession | { marketSession: MarketSession }>(response.data);
    return (data as { marketSession?: MarketSession }).marketSession ?? (data as MarketSession);
  },

  /**
   * 更新大盘
   * PUT /api/admin/market-sessions/:id
   */
  updateSession: async (
    api: AxiosInstance,
    id: string,
    data: UpdateMarketSessionRequest
  ): Promise<MarketSession> => {
    const response = await api.put<MarketSession>(`/admin/market-sessions/${id}`, data);
    return response.data;
  },

  /**
   * 删除大盘
   * DELETE /api/admin/market-sessions/:id
   */
  deleteSession: async (api: AxiosInstance, id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/admin/market-sessions/${id}`);
    return response.data;
  },

  /**
   * 开启大盘
   * POST /api/admin/market-sessions/:id/start
   */
  startSession: async (
    api: AxiosInstance,
    id: string,
    data?: Record<string, any>
  ): Promise<StartMarketSessionResponse> => {
    const payload = data ?? {};
    const response = await api.post<StartMarketSessionResponse>(`/admin/market-sessions/${id}/start`, payload);
    return response.data;
  },

  /**
   * 关闭大盘
   * POST /api/admin/market-sessions/:id/stop
   */
  stopSession: async (api: AxiosInstance, id: string): Promise<StopMarketSessionResponse> => {
    const response = await api.post<StopMarketSessionResponse>(`/admin/market-sessions/${id}/stop`);
    return response.data;
  },

  /**
   * 获取小盘历史周期（管理员）
   * GET /api/admin/market-sessions/sub-markets/:subMarketId/cycles
   */
  getCycles: async (
    api: AxiosInstance,
    subMarketId: string,
    params?: GetCyclesParams
  ): Promise<CyclesListResponse> => {
    const response = await api.get<CyclesListResponse>(
      `/admin/market-sessions/sub-markets/${subMarketId}/cycles`,
      { params }
    );
    return response.data;
  }
};

/**
 * 可選的統計接口（若後端提供）
 * - GET /admin/market-sessions/order-stats?ids=uuid1,uuid2
 * 回傳格式：
 *  { stats: [{ sessionId, pendingCount, settledCount }] }
 */
export const getOrderStatsBulk = async (
  api: AxiosInstance,
  ids: string[]
): Promise<Record<string, { pendingCount: number; settledCount: number }>> => {
  if (!ids || ids.length === 0) return {};
  try {
    const response = await api.get<{ stats?: Array<{ sessionId: string; pendingCount?: number; settledCount?: number }> }>(
      `/admin/market-sessions/order-stats`,
      { params: { ids: ids.join(',') } }
    );
    const list = response.data?.stats ?? [];
    const map: Record<string, { pendingCount: number; settledCount: number }> = {};
    for (const s of list) {
      map[s.sessionId] = {
        pendingCount: Number(s.pendingCount ?? 0),
        settledCount: Number(s.settledCount ?? 0)
      };
    }
    return map;
  } catch (err: any) {
    // 若 404 代表後端尚未提供，交由呼叫端走本地計數
    if (err?.response?.status === 404) {
      return {};
    }
    throw err;
  }
};

export const marketSessionService = {
  ...marketSessionUserService,
  admin: marketSessionAdminService
};

export default marketSessionService;
