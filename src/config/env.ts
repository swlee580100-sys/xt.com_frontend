/**
 * 环境配置
 *
 * 开发环境：使用 .env.local 配置（http://localhost:3000）
 * 生产环境：使用 .env.production 配置（相对路径 /api）
 */

// 判断是否为生产环境
const isProduction = import.meta.env.PROD;

// 自動將 HTTP 轉換為 HTTPS，WS 轉換為 WSS（如果前端在 HTTPS 上運行）
const upgradeToSecure = (url: string): string => {
  if (typeof window === 'undefined') return url;
  
  // 如果當前頁面是 HTTPS，將 HTTP/WS 升級為 HTTPS/WSS
  if (window.location.protocol === 'https:') {
    return url
      .replace(/^http:\/\//i, 'https://')
      .replace(/^ws:\/\//i, 'wss://');
  }
  
  return url;
};

// API URL 配置
// 生产环境使用相对路径，开发环境使用完整 URL
const getApiUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  
  if (envApiUrl) {
    return upgradeToSecure(envApiUrl);
  }
  
  if (isProduction) {
    return '/api';
  }
  
  return 'http://localhost:3000/api';
};

const API_URL = getApiUrl();

// WebSocket URL 配置
// 生产环境自动使用当前域名，开发环境使用 localhost
const getWsUrl = (): string => {
  const envWsUrl = import.meta.env.VITE_WS_URL;

  // 如果环境变量有配置，自動升級為安全協議
  if (envWsUrl) {
    return upgradeToSecure(envWsUrl);
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
