import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type PropsWithChildren
} from 'react';
import axios from 'axios';

import { createApiClient } from '@/lib/api-client';
import { storage } from '@/utils/storage';
import { appConfig } from '@/config/env';
import type { AuthTokens, AuthResponse, User } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
  api: ReturnType<typeof createApiClient>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(() => storage.getUser());
  const [tokens, setTokens] = useState<AuthTokens | null>(() => storage.getTokens());
  const [loading, setLoading] = useState(false);

  const handleLogout = useCallback(() => {
    setUser(null);
    setTokens(null);
    storage.clearTokens();
    storage.clearUser();
  }, []);

  const api = useMemo(
    () =>
      createApiClient({
        getTokens: () => tokens,
        onRefresh: newTokens => {
          setTokens(newTokens);
          storage.saveTokens(newTokens);
        },
        onLogout: handleLogout
      }),
    [handleLogout, tokens]
  );

  useEffect(() => {
    if (user) {
      storage.saveUser(user);
    } else {
      storage.clearUser();
    }
  }, [user]);

  useEffect(() => {
    if (tokens) {
      storage.saveTokens(tokens);
    } else {
      storage.clearTokens();
    }
  }, [tokens]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const response = await axios.post<{ data: AuthResponse }>(
          `${appConfig.apiUrl}/auth/login`,
          { email, password },
          { headers: { 'Content-Type': 'application/json' } }
        );

        // Backend wraps response in { data: ... }
        const authData = response.data.data;
        setUser(authData.user);
        setTokens(authData.tokens);
        storage.saveUser(authData.user);
        storage.saveTokens(authData.tokens);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (payload: { email: string; password: string; displayName: string }) => {
      setLoading(true);
      try {
        const response = await axios.post<{ data: AuthResponse }>(
          `${appConfig.apiUrl}/auth/register`,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );

        // Backend wraps response in { data: ... }
        const authData = response.data.data;
        setUser(authData.user);
        setTokens(authData.tokens);
        storage.saveUser(authData.user);
        storage.saveTokens(authData.tokens);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Failed to logout cleanly', error);
    } finally {
      handleLogout();
    }
  }, [api, handleLogout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tokens,
      loading,
      isAuthenticated: Boolean(user && tokens?.accessToken),
      login,
      register,
      logout,
      api
    }),
    [api, loading, login, logout, register, tokens, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
