import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SafeUser, UserRole } from '../api/types';
import { login as apiLogin } from '../api/auth';

interface AuthState {
  user: SafeUser | null;
  token: string | null;
  /** Override role for dev/demo role switcher (doesn't change JWT) */
  activeRole: UserRole | null;
}

interface AuthContextValue extends AuthState {
  login: (credentials: { email?: string; phone?: string; password: string }) => Promise<void>;
  logout: () => void;
  setActiveRole: (role: UserRole) => void;
  effectiveRole: UserRole | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'nivaran_token';
const USER_KEY = 'nivaran_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    let user: SafeUser | null = null;
    try {
      user = userJson ? (JSON.parse(userJson) as SafeUser) : null;
    } catch {
      user = null;
    }
    return { user, token, activeRole: null };
  });

  useEffect(() => {
    if (state.token) {
      localStorage.setItem(TOKEN_KEY, state.token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (state.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [state.token, state.user]);

  const login = useCallback(async (credentials: { email?: string; phone?: string; password: string }) => {
    const { token, user } = await apiLogin(credentials);
    setState({ user, token, activeRole: null });
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, token: null, activeRole: null });
  }, []);

  const setActiveRole = useCallback((role: UserRole) => {
    setState((prev) => ({ ...prev, activeRole: role }));
  }, []);

  const effectiveRole = state.activeRole ?? state.user?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        setActiveRole,
        effectiveRole,
        isAuthenticated: !!state.token && !!state.user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
