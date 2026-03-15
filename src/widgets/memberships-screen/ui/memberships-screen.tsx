"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Snowflake,
} from "lucide-react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { apiFetch, ApiError } from "@/shared/lib/api";
import type {
  FreezeMembershipPayload,
  MyMembershipsResponse,
  UserMembershipCard,
} from "@/shared/lib/contracts";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./memberships-screen.module.css";

const QUICK_FREEZE_DAYS = 7;

export function MembershipsScreen() {
  const { canRender, isLoading, user } = useRequireAuth();
  const [data, setData] = useState<MyMembershipsResponse | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (!canRender) {
      return;
    }

    let cancelled = false;

    void apiFetch<MyMembershipsResponse>("/memberships/me")
      .then((response) => {
        if (cancelled) {
          return;
        }

        setData(response);
        setError(null);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof ApiError
            ? loadError.message
            : "Не удалось загрузить мои абонементы",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsDataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canRender]);

  const activeMemberships = data?.activeMemberships ?? [];
  const completedMemberships = data?.completedMemberships ?? [];

  const toggleHistoryItem = (membershipId: string) => {
    setExpandedHistoryIds((current) =>
      current.includes(membershipId)
        ? current.filter((itemId) => itemId !== membershipId)
        : [...current, membershipId],
    );
  };

  const runMembershipAction = async (
    membershipId: string,
    action: () => Promise<MyMembershipsResponse>,
    successMessage: string,
  ) => {
    try {
      setPendingActionId(membershipId);
      const nextData = await action();
      setData(nextData);
      setFeedback(successMessage);
      setError(null);
    } catch (actionError) {
      setError(
        actionError instanceof ApiError
          ? actionError.message
          : "Не удалось выполнить действие по абонементу",
      );
    } finally {
      setPendingActionId(null);
    }
  };

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем активную сессию." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем на вход." />;
  }

  if (isDataLoading) {
    return <SessionStatus title="Загрузка" text="Загружаем ваши абонементы." />;
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <Link href="/" className={styles.backLink} aria-label="Назад на главную">
              <ChevronLeft size={24} strokeWidth={2.6} />
            </Link>

            <Image
              src="/asset/logo.png"
              alt="Эра Спорта"
              width={170}
              height={112}
              priority
              className={styles.logo}
            />
          </div>

          <div className={styles.heroCopy}>
            <h1 className={styles.title}>Мои абонементы</h1>
          </div>
        </header>

        <section className={styles.content}>
          {error ? <p className={styles.errorText}>{error}</p> : null}
          {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Активный абонемент</h2>

            {activeMemberships.length > 0 ? (
              <div className={styles.activeList}>
                {activeMemberships.map((membership) => (
                  <MembershipCard
                    key={membership.id}
                    membership={membership}
                    isPending={pendingActionId === membership.id}
                    onFreeze={() => {
                      const payload: FreezeMembershipPayload = {
                        days: Math.min(QUICK_FREEZE_DAYS, membership.freezeDaysLeft),
                      };

                      return runMembershipAction(
                        membership.id,
                        () =>
                          apiFetch<MyMembershipsResponse>(
                            `/memberships/${membership.id}/freeze`,
                            {
                              method: "POST",
                              body: JSON.stringify(payload),
                            },
                          ),
                        `Абонемент заморожен на ${payload.days} дн.`,
                      );
                    }}
                    onRenew={() =>
                      runMembershipAction(
                        membership.id,
                        () =>
                          apiFetch<MyMembershipsResponse>(
                            `/memberships/${membership.id}/renew`,
                            {
                              method: "POST",
                              body: JSON.stringify({}),
                            },
                          ),
                        "Заявка на продление отправлена.",
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>Пока нет активных абонементов</p>
                <p className={styles.emptyText}>
                  Как только администратор назначит абонемент, он появится здесь.
                </p>
                <Link href="/passes" className={styles.emptyAction}>
                  Перейти в каталог
                </Link>
              </div>
            )}
          </section>

          {completedMemberships.length > 0 ? (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Завершенные абонементы</h2>

              <div className={styles.historyList}>
                {completedMemberships.map((membership) => {
                  const isExpanded = expandedHistoryIds.includes(membership.id);

                  return (
                    <article key={membership.id} className={styles.historyCard}>
                      <button
                        type="button"
                        className={styles.historyToggle}
                        onClick={() => toggleHistoryItem(membership.id)}
                      >
                        <span className={styles.historyCopy}>
                          <span className={styles.historyTitle}>{membership.title}</span>
                          <span className={styles.historySubtitle}>{membership.subtitle}</span>
                        </span>
                        {isExpanded ? (
                          <ChevronDown className={styles.historyChevron} strokeWidth={2.6} />
                        ) : (
                          <ChevronRight className={styles.historyChevron} strokeWidth={2.6} />
                        )}
                      </button>

                      {isExpanded ? (
                        <div className={styles.historyDetails}>
                          <div className={styles.featureList}>
                            {membership.features.map((feature) => (
                              <div key={feature.id} className={styles.featureItem}>
                                <Check className={styles.featureIcon} strokeWidth={2.6} />
                                <span>{feature.label}</span>
                              </div>
                            ))}
                          </div>

                          <div className={styles.timeline}>
                            {membership.history.map((entry) => (
                              <div
                                key={entry.id}
                                className={[
                                  styles.timelineItem,
                                  entry.tone === "accent" ? styles.timelineItemAccent : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {entry.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
        </section>

        <BottomNav activeItem="memberships" />
      </section>
    </main>
  );
}

type MembershipCardProps = {
  membership: UserMembershipCard;
  isPending: boolean;
  onFreeze: () => Promise<void>;
  onRenew: () => Promise<void>;
};

function MembershipCard({
  membership,
  isPending,
  onFreeze,
  onRenew,
}: MembershipCardProps) {
  const progress = useMemo(() => getRingProgress(membership.startsAt, membership.expiresAt), [
    membership.expiresAt,
    membership.startsAt,
  ]);

  const statusClassName = [
    styles.statusBadge,
    membership.statusTone === "danger"
      ? styles.statusDanger
      : membership.statusTone === "warning"
        ? styles.statusWarning
        : membership.statusTone === "muted"
          ? styles.statusMuted
          : styles.statusSuccess,
  ].join(" ");

  return (
    <article
      className={[
        styles.membershipCard,
        membership.statusTone === "danger" ? styles.membershipCardExpired : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.cardHeader}>
        <span className={statusClassName}>{membership.statusLabel}</span>
      </div>

      <div className={styles.cardTop}>
        <div className={styles.cardCopy}>
          <h3 className={styles.cardTitle}>{membership.title}</h3>
          <p className={styles.cardSubtitle}>
            Действует до {formatDisplayDate(membership.expiresAt)}
          </p>
        </div>

        <div
          className={styles.ring}
          style={{ "--progress": `${progress}%` } as CSSProperties}
          aria-label={`Осталось ${membership.daysLeft} дней`}
        >
          <div className={styles.ringInner}>
            <span className={styles.ringCaption}>Осталось</span>
            <span className={styles.ringValue}>{membership.daysLeft}</span>
            <span className={styles.ringUnit}>Дней</span>
          </div>
        </div>
      </div>

      <div className={styles.featureList}>
        {membership.features.map((feature) => (
          <div key={feature.id} className={styles.featureItem}>
            <Check className={styles.featureIcon} strokeWidth={2.8} />
            <span>{feature.label}</span>
          </div>
        ))}
        <div className={styles.featureItem}>
          <Snowflake className={styles.featureIcon} strokeWidth={2.4} />
          <span>Заморозка: осталось {membership.freezeDaysLeft} дн.</span>
        </div>
      </div>

      {membership.pendingRenewal ? (
        <p className={styles.pendingNote}>Заявка на продление уже отправлена и ждёт обработки.</p>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryAction}
          onClick={() => void onRenew()}
          disabled={!membership.canRenew || isPending}
        >
          {isPending ? "Обновляем..." : "Продлить"}
        </button>

        <button
          type="button"
          className={styles.secondaryAction}
          onClick={() => void onFreeze()}
          disabled={!membership.canFreeze || isPending}
        >
          Заморозить
        </button>
      </div>

      <button type="button" className={styles.scheduleLink} disabled>
        Перейти к расписанию
        <ChevronRight className={styles.scheduleIcon} strokeWidth={2.8} />
      </button>
    </article>
  );
}

function getRingProgress(startsAt: string, expiresAt: string) {
  const start = new Date(startsAt).getTime();
  const end = new Date(expiresAt).getTime();
  const total = Math.max(1, end - start);
  const remaining = Math.max(0, end - Date.now());

  return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
