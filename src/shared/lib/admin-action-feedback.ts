"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { useToast } from "@/shared/ui/toast-provider/toast-provider";

type ErrorMessageResolver = (error: unknown, fallback: string) => string;

export type AdminActionRunner = (
  pendingMessage: string,
  successMessage: string,
  action: () => Promise<void>,
  errorMessage?: string,
) => Promise<boolean>;

export function useAdminActionFeedback({
  setStatus,
  setError,
  getErrorMessage,
}: {
  setStatus: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  getErrorMessage: ErrorMessageResolver;
}): AdminActionRunner {
  const toast = useToast();

  return useCallback<AdminActionRunner>(
    async (pendingMessage, successMessage, action, errorMessage = "Не удалось выполнить действие") => {
      try {
        setStatus(pendingMessage);
        setError(null);
        await action();
        toast.success(successMessage);
        return true;
      } catch (actionError) {
        setError(getErrorMessage(actionError, errorMessage));
        return false;
      } finally {
        setStatus(null);
      }
    },
    [getErrorMessage, setError, setStatus, toast],
  );
}
