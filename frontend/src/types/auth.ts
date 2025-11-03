export interface User {
  id: string;
  email: string;
  displayName: string;
  username?: string; // 管理员有 username 字段
  roles?: string[]; // 普通用户有 roles
  permissions?: string[]; // 管理员有 permissions
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user?: User; // 普通用户登录返回 user
  admin?: User; // 管理员登录返回 admin
  tokens: AuthTokens;
}
