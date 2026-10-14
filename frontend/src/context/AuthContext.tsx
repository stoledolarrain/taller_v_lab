/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthTokens, LoginCredentials, RegisterData } from '../types/auth';
import { authService } from '../services/authService';

export interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (partialData: Partial<User>) => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'pasanaku_access_token';
const REFRESH_KEY = 'pasanaku_refresh_token';
const USER_KEY = 'pasanaku_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [tokens, setTokens] = useState<AuthTokens | null>(() => {
    const access = localStorage.getItem(TOKEN_KEY);
    const refresh = localStorage.getItem(REFRESH_KEY);
    return access && refresh ? { access, refresh } : null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const saveSession = (newUser: User, newTokens: AuthTokens) => {
    setUser(newUser);
    setTokens(newTokens);
    localStorage.setItem(TOKEN_KEY, newTokens.access);
    localStorage.setItem(REFRESH_KEY, newTokens.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  };

  const logout = useCallback(() => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    clearError();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      saveSession(response.user, response.tokens);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register(data);
      saveSession(response.user, response.tokens);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar usuario');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (partialData: Partial<User>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.updateProfile(partialData);
      setUser(response.user);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar perfil');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar la validez del token en el inicio
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          const freshUser = await authService.getMe();
          setUser(freshUser);
          localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };

    verifyAuth();
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isAuthenticated: !!user && !!tokens,
        isLoading,
        error,
        login,
        register,
        logout,
        updateProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
