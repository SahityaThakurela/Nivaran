import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import * as authApi from "../api/auth";
import type { SafeUser } from "../api/types";

const TOKEN_KEY = "@nivaran/token";
const USER_KEY = "@nivaran/user";

type AuthContextValue = {
  token: string | null;
  user: SafeUser | null;
  ready: boolean;
  hydrate: () => Promise<void>;
  login: (input: authApi.LoginInput) => Promise<void>;
  register: (input: authApi.RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (token: string, user: SafeUser) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [ready, setReady] = useState(false);

  const setSession = useCallback(async (nextToken: string, nextUser: SafeUser) => {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, nextToken],
      [USER_KEY, JSON.stringify(nextUser)],
    ]);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const hydrate = useCallback(async () => {
    try {
      const pairs = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
      const map = Object.fromEntries(pairs);
      const storedToken = map[TOKEN_KEY];
      const storedUser = map[USER_KEY];

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as SafeUser);
      } else {
        setToken(null);
        setUser(null);
      }
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  const login = useCallback(
    async (input: authApi.LoginInput) => {
      const result = await authApi.login(input);
      await setSession(result.token, result.user);
    },
    [setSession],
  );

  const register = useCallback(
    async (input: authApi.RegisterInput) => {
      const result = await authApi.register(input);
      await setSession(result.token, result.user);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      ready,
      hydrate,
      login,
      register,
      logout,
      setSession,
    }),
    [token, user, ready, hydrate, login, register, logout, setSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
