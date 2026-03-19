"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, RefreshCcw } from "lucide-react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { ApiError, apiFetch } from "@/shared/lib/api";
import type { PaymentResultViewModel } from "@/shared/lib/contracts";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./payments-result-screen.module.css";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 4;

export function PaymentsResultScreen() {
  const { canRender, isLoading, user } = useRequireAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("paymentId");
  const resultHint = searchParams.get("result");
  const [payment, setPayment] = useState<PaymentResultViewModel | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRender || !paymentId) {
      return;
    }

    let cancelled = false;
    let pollCount = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const syncPayment = async (mode: "confirm" | "read") => {
      try {
        const nextPayment = mode === "confirm"
          ? await apiFetch<PaymentResultViewModel>(`/payments/${paymentId}/confirm`, {
              method: "POST",
              body: JSON.stringify({}),
            })
          : await apiFetch<PaymentResultViewModel>(`/payments/${paymentId}`);

        if (cancelled) {
          return;
        }

        setPayment(nextPayment);
        setError(null);

        if (!nextPayment.isFinal && pollCount < MAX_POLLS) {
          pollCount += 1;
          timeoutId = setTimeout(() => {
            void syncPayment("read");
          }, POLL_INTERVAL_MS);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof ApiError
            ? loadError.message
            : "Не удалось получить статус оплаты",
        );
      } finally {
        if (!cancelled) {
          setIsDataLoading(false);
        }
      }
    };

    void syncPayment("confirm");

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [canRender, paymentId]);

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем активную сессию." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем на вход." />;
  }

  if (!paymentId) {
    return <SessionStatus title="Ошибка" text="Не найден идентификатор платежа." />;
  }

  if (isDataLoading) {
    return <SessionStatus title="Проверяем оплату" text="Уточняем статус у платёжного шлюза." />;
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <Link href="/passes" className={styles.backLink} aria-label="Назад в каталог">
            <ChevronLeft size={24} strokeWidth={2.6} />
          </Link>

          <div>
            <h1 className={styles.title}>Результат оплаты</h1>
            <p className={styles.subtitle}>
              {resultHint === "fail"
                ? "Проверяем, чем завершилась последняя попытка оплаты."
                : "Проверяем подтверждение платежа от банка."}
            </p>
          </div>
        </header>

        <section className={styles.content}>
          {error ? <p className={styles.errorText}>{error}</p> : null}

          {payment ? (
            <article className={styles.card}>
              <span
                className={[
                  styles.statusBadge,
                  payment.statusTone === "success"
                    ? styles.statusSuccess
                    : payment.statusTone === "danger"
                      ? styles.statusDanger
                      : payment.statusTone === "muted"
                        ? styles.statusMuted
                        : styles.statusWarning,
                ].join(" ")}
              >
                {payment.statusLabel}
              </span>

              <p className={styles.planOriginValue}>{formatPlanOrigin(payment)}</p>
              <h2 className={styles.planTitle}>{payment.planTitle}</h2>
              {payment.planSubtitle ? <p className={styles.planSubtitle}>{payment.planSubtitle}</p> : null}

              <div className={styles.amount}>
                {new Intl.NumberFormat("ru-RU").format(payment.amount)}{" "}
                {payment.currency === "RUB" ? "₽" : payment.currency}
              </div>

              <p className={styles.message}>{payment.message}</p>

              {payment.actionCodeDescription ? (
                <p className={styles.metaText}>Ответ шлюза: {payment.actionCodeDescription}</p>
              ) : null}

              <div className={styles.actions}>
                {payment.status === "PAID" ? (
                  <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={() => router.push("/memberships")}
                  >
                    Перейти в мои абонементы
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={() => router.push("/passes")}
                  >
                    Вернуться в каталог
                  </button>
                )}

                {!payment.isFinal ? (
                  <button
                    type="button"
                    className={styles.secondaryAction}
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCcw size={16} strokeWidth={2.2} />
                    Обновить статус
                  </button>
                ) : null}
              </div>
            </article>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Статус оплаты пока недоступен</p>
              <Link href="/passes" className={styles.primaryAction}>
                В каталог абонементов
              </Link>
            </div>
          )}
        </section>

        <BottomNav activeItem="passes" />
      </section>
    </main>
  );
}
function formatPlanOrigin(payment: PaymentResultViewModel) {
  const parts = [
    payment.planCategoryTitle,
    payment.planVariantTitle,
    payment.planGroupTitle,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" / ") : "Не указано";
}

