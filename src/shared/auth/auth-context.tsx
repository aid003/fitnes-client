"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const providerIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `auth-${Math.random().toString(36).slice(2, 10)}`,
  );

  const refreshUser = async () => {
    logAuthDebug(providerIdRef.current, "refreshUser:start");

    try {
      const nextUser = await apiFetch<AuthUser>("/auth/me");
      setUser(nextUser);
      setError(null);
      logAuthDebug(providerIdRef.current, "refreshUser:success", {
        userId: nextUser.id,
        role: nextUser.role,
      });
      return nextUser;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setError(null);
        logAuthDebug(providerIdRef.current, "refreshUser:unauthorized");
        return null;
      }

      setError(error instanceof Error ? error.message : "Не удалось загрузить профиль");
      logAuthDebug(providerIdRef.current, "refreshUser:error", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const providerId = providerIdRef.current;

    logAuthDebug(providerId, "provider:mounted", {
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    void refreshUser();

    return () => {
      logAuthDebug(providerId, "provider:unmounted");
    };
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

function logAuthDebug(
  providerId: string,
  event: string,
  details?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[auth-debug]", {
    providerId,
    event,
    ...details,
  });
}
