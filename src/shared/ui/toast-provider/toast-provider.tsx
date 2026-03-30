"use client";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import styles from "./toast-provider.module.css";

type ToastVariant = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  durationMs?: number;
};

type ToastRecord = ToastInput & {
  id: number;
  variant: ToastVariant;
};

type ToastContextValue = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const DEFAULT_DURATION_MS = 3500;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextToastIdRef = useRef(0);
  const timeoutIdsRef = useRef<Map<number, number>>(new Map());

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));

    const timeoutId = timeoutIdsRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const timeoutIds = timeoutIdsRef.current;

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIds.clear();
    };
  }, []);

  const pushToast = useCallback(
    (variant: ToastVariant, input: ToastInput) => {
      const id = nextToastIdRef.current++;
      const toast: ToastRecord = {
        id,
        variant,
        ...input,
      };

      setToasts((current) => [...current, toast]);

      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, input.durationMs ?? DEFAULT_DURATION_MS);

      timeoutIdsRef.current.set(id, timeoutId);
    },
    [dismissToast],
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      success: (title, description) => pushToast("success", { title, description }),
      error: (title, description) => pushToast("error", { title, description }),
      info: (title, description) => pushToast("info", { title, description }),
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className={styles.viewport} aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={getToastClassName(toast.variant)}
            role={toast.variant === "error" ? "alert" : "status"}
          >
            <div className={styles.iconWrap}>{getToastIcon(toast.variant)}</div>
            <div className={styles.content}>
              <p className={styles.title}>{toast.title}</p>
              {toast.description ? <p className={styles.description}>{toast.description}</p> : null}
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => dismissToast(toast.id)}
              aria-label="Закрыть уведомление"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

function getToastClassName(variant: ToastVariant) {
  const variantClassName =
    variant === "success"
      ? styles.toastSuccess
      : variant === "error"
        ? styles.toastError
        : styles.toastInfo;

  return [styles.toast, variantClassName].join(" ");
}

function getToastIcon(variant: ToastVariant) {
  if (variant === "success") {
    return <CheckCircle2 size={20} className={styles.iconSuccess} />;
  }

  if (variant === "error") {
    return <AlertCircle size={20} className={styles.iconError} />;
  }

  return <Info size={20} className={styles.iconInfo} />;
}
