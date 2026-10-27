import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  ApiClient,
  ApiError,
  resolveApiBaseUrl,
  User,
  RegisterPayload,
  CapacityLevel,
} from '@steplight/shared';
import { clearOfflineTaskIndex } from '../utils/offlineTaskIndex';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  apiClient: ApiClient;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  loginDemo: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ message: string }>;
  updateProfile: (data: { displayName?: string; baselineCapacity?: CapacityLevel }) => Promise<void>;
  clearError: () => void;
}

const ACCESS_TOKEN_KEY = 'steplight_access_token';
const REFRESH_TOKEN_KEY = 'steplight_refresh_token';

function isAuthenticationRejection(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status >= 400 && err.status < 500;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(REFRESH_TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize shared ApiClient instance
  const baseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.PROD);
  const apiClient = useMemo(() => {
    return new ApiClient({
      baseUrl,
      initialToken: accessToken,
      initialRefreshToken: refreshToken,
    });
  }, [baseUrl]);

  // Sync token updates to apiClient and storage
  const setSession = (newAccess: string | null, newRefresh: string | null, newUser: User | null) => {
    if (!newUser && user) clearOfflineTaskIndex(user.id);
    setAccessToken(newAccess);
    setRefreshToken(newRefresh);
    setUser(newUser);
    apiClient.setToken(newAccess);
    apiClient.setRefreshToken(newRefresh);

    if (newAccess) {
      localStorage.setItem(ACCESS_TOKEN_KEY, newAccess);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }

    if (newRefresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  };

  useEffect(() => {
    apiClient.setToken(accessToken);
    apiClient.setRefreshToken(refreshToken);
    apiClient.setSessionExpiredHandler(() => setSession(null, null, null));
    return () => apiClient.setSessionExpiredHandler(null);
  }, [apiClient, accessToken, refreshToken, user]);

  // Verify stored session on initial mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const storedAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!storedAccess && !storedRefresh) {
        if (isMounted) setIsLoading(false);
        return;
      }

      if (storedAccess) {
        apiClient.setToken(storedAccess);
        try {
          const profile = await apiClient.getProfile();
          if (isMounted) {
            setSession(apiClient.getToken() || storedAccess, storedRefresh, profile);
            setIsLoading(false);
          }
          return;
        } catch (err: unknown) {
          if (isMounted) {
            if (isAuthenticationRejection(err)) setSession(null, null, null);
            setIsLoading(false);
          }
          return;
        }
      }

      if (storedRefresh) {
        try {
          const newAccess = await apiClient.refreshToken(storedRefresh);
          apiClient.setToken(newAccess);
          const profile = await apiClient.getProfile();
          if (isMounted) {
            setSession(newAccess, storedRefresh, profile);
            setIsLoading(false);
          }
          return;
        } catch (err: unknown) {
          if (isMounted) {
            if (isAuthenticationRejection(err)) {
              setSession(null, null, null);
            }
            setIsLoading(false);
          }
        }
      } else {
        if (isMounted) {
          setSession(null, null, null);
          setIsLoading(false);
        }
      }
    }

    checkAuth();
    window.addEventListener('online', checkAuth);

    return () => {
      isMounted = false;
      window.removeEventListener('online', checkAuth);
    };
  }, [apiClient]);

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const tokens = await apiClient.login({ email, password });
      setSession(tokens.accessToken, tokens.refreshToken, tokens.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setError(null);
    setIsLoading(true);
    try {
      const tokens = await apiClient.register(payload);
      setSession(tokens.accessToken, tokens.refreshToken, tokens.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create account. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = async () => {
    return login('demo@steplight.ai', 'gentlestep123');
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (refreshToken) {
        await apiClient.logout(refreshToken);
      }
    } catch {
      // Gentle cleanup regardless of network error
    } finally {
      setSession(null, null, null);
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setError(null);
    try {
      return await apiClient.forgotPassword({ email });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to generate reset link.';
      setError(message);
      throw err;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setError(null);
    try {
      return await apiClient.resetPassword({ token, newPassword });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired reset link.';
      setError(message);
      throw err;
    }
  };

  const updateProfile = async (data: { displayName?: string; baselineCapacity?: CapacityLevel }) => {
    try {
      const updated = await apiClient.updateProfile(data);
      setUser(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile.';
      setError(message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated: !!user,
        isLoading,
        error,
        apiClient,
        login,
        register,
        logout,
        loginDemo,
        forgotPassword,
        resetPassword,
        updateProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
