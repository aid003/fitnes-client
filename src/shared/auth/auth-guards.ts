"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-context";

export function useRequireGuest(redirectTo = "/") {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(redirectTo);
    }
  }, [isLoading, redirectTo, router, user]);

  return {
    canRender: !isLoading && !user,
    isLoading,
  };
}

export function useRequireAuth(redirectTo = "/welcome") {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(redirectTo);
    }
  }, [isLoading, redirectTo, router, user]);

  return {
    canRender: !isLoading && Boolean(user),
    isLoading,
    user,
  };
}

export function useRequireAdmin(redirectTo = "/") {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.replace(user ? redirectTo : "/welcome");
    }
  }, [isAdmin, isLoading, redirectTo, router, user]);

  return {
    canRender: !isLoading && Boolean(user) && isAdmin,
    isLoading,
    user,
  };
}
