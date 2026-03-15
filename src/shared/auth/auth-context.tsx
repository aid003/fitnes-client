"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { apiFetch, ApiError } from "@/shared/lib/api";
import type { AuthUser } from "@/shared/lib/contracts";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const nextUser = await apiFetch<AuthUser>("/auth/me");
      setUser(nextUser);
      setError(null);
      return nextUser;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setError(null);
        return null;
      }

      setError(error instanceof Error ? error.message : "Не удалось загрузить профиль");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      error,
      async login(input) {
        const nextUser = await apiFetch<AuthUser>("/auth/login", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setUser(nextUser);
        setError(null);
        return nextUser;
      },
      async register(input) {
        const nextUser = await apiFetch<AuthUser>("/auth/register", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setUser(nextUser);
        setError(null);
        return nextUser;
      },
      async logout() {
        await apiFetch<{ success: true }>("/auth/logout", {
          method: "POST",
        });
        setUser(null);
        setError(null);
      },
      refreshUser,
    }),
    [error, isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
