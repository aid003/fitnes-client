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
  requestRegisterCode: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ success: true }>;
  verifyRegisterCode: (input: {
    email: string;
    code: string;
  }) => Promise<AuthUser>;
  resendRegisterCode: (input: { email: string }) => Promise<{ success: true }>;
  requestRecoveryCode: (input: { email: string }) => Promise<{ success: true }>;
  verifyRecoveryCode: (input: {
    email: string;
    code: string;
  }) => Promise<{ success: true }>;
  resendRecoveryCode: (input: { email: string }) => Promise<{ success: true }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncPromiseRef = useRef<Promise<AuthUser | null> | null>(null);
  const providerIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `auth-${Math.random().toString(36).slice(2, 10)}`,
  );

  const refreshUser = async () => {
    if (syncPromiseRef.current) {
      return syncPromiseRef.current;
    }

    const syncPromise = (async () => {
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
          logAuthDebug(providerIdRef.current, "refreshUser:session-missed");

          try {
            const restoredUser = await apiFetch<AuthUser>("/auth/refresh-session", {
              method: "POST",
            });
            setUser(restoredUser);
            setError(null);
            logAuthDebug(providerIdRef.current, "refreshUser:restored", {
              userId: restoredUser.id,
              role: restoredUser.role,
            });
            return restoredUser;
          } catch (restoreError) {
            if (restoreError instanceof ApiError && restoreError.status === 401) {
              setUser(null);
              setError(null);
              logAuthDebug(providerIdRef.current, "refreshUser:unauthorized");
              return null;
            }

            setError(
              restoreError instanceof Error
                ? restoreError.message
                : "Не удалось восстановить сессию",
            );
            logAuthDebug(providerIdRef.current, "refreshUser:restore-error", {
              message:
                restoreError instanceof Error ? restoreError.message : "Unknown error",
            });
            return null;
          }
        }

        setError(error instanceof Error ? error.message : "Не удалось загрузить профиль");
        logAuthDebug(providerIdRef.current, "refreshUser:error", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      } finally {
        setIsLoading(false);
        syncPromiseRef.current = null;
      }
    })();

    syncPromiseRef.current = syncPromise;
    return syncPromise;
  };

  useEffect(() => {
    const providerId = providerIdRef.current;

    logAuthDebug(providerId, "provider:mounted", {
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    void refreshUser();

    const syncOnForeground = () => {
      if (document.visibilityState === "visible") {
        void refreshUser();
      }
    };

    const syncOnFocus = () => {
      void refreshUser();
    };

    document.addEventListener("visibilitychange", syncOnForeground);
    window.addEventListener("focus", syncOnFocus);

    return () => {
      document.removeEventListener("visibilitychange", syncOnForeground);
      window.removeEventListener("focus", syncOnFocus);
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
      async requestRegisterCode(input) {
        const result = await apiFetch<{ success: true }>("/auth/register", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setError(null);
        return result;
      },
      async verifyRegisterCode(input) {
        const nextUser = await apiFetch<AuthUser>("/auth/register/verify", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setUser(nextUser);
        setError(null);
        return nextUser;
      },
      async resendRegisterCode(input) {
        const result = await apiFetch<{ success: true }>("/auth/register/resend", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setError(null);
        return result;
      },
      async requestRecoveryCode(input) {
        const result = await apiFetch<{ success: true }>("/auth/recovery/request", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setError(null);
        return result;
      },
      async verifyRecoveryCode(input) {
        const result = await apiFetch<{ success: true }>("/auth/recovery/verify", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setError(null);
        return result;
      },
      async resendRecoveryCode(input) {
        const result = await apiFetch<{ success: true }>("/auth/recovery/resend", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setError(null);
        return result;
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
