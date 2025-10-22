export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
