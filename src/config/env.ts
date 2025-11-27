/**
 * 环境配置
 *
 * 开发环境：使用 .env.local 配置（http://localhost:3000）
 * 生产环境：使用 .env.production 配置（相对路径 /api）
 */

// 判断是否为生产环境
const isProduction = import.meta.env.PROD;

// API URL 配置
// 生产环境使用相对路径，开发环境使用完整 URL
const API_URL = import.meta.env.VITE_API_URL ?? (isProduction ? '/api' : 'http://localhost:3000/api');

// WebSocket URL 配置
// 生产环境自动使用当前域名，开发环境使用 localhost
const getWsUrl = (): string => {
  const envWsUrl = import.meta.env.VITE_WS_URL;

  // 如果环境变量有配置，直接使用
  if (envWsUrl) {
    return envWsUrl;
  }

  // 生产环境使用当前域名
  if (isProduction) {
    // 使用当前页面的 origin，自动适配 http/https
    return window.location.origin;
  }

  // 开发环境默认使用 localhost
  return 'http://localhost:3000';
};

export const appConfig = {
  apiUrl: API_URL,
  wsUrl: getWsUrl(),
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD
};
