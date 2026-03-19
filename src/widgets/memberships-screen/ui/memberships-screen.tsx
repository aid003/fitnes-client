"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Snowflake,
  X,
} from "lucide-react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { apiFetch, ApiError } from "@/shared/lib/api";
import type {
  FreezeMembershipPayload,
  MembershipQrViewModel,
  MyMembershipsResponse,
  UserMembershipCard,
} from "@/shared/lib/contracts";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./memberships-screen.module.css";

const QUICK_FREEZE_DAYS = 7;

export function MembershipsScreen() {
  const { canRender, isLoading, user } = useRequireAuth();
  const router = useRouter();
  const [data, setData] = useState<MyMembershipsResponse | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);
  const [qrModal, setQrModal] = useState<MembershipQrViewModel | null>(null);
  const [qrLoadingMembershipId, setQrLoadingMembershipId] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

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

  const openMembershipQr = async (membershipId: string) => {
    try {
      setQrLoadingMembershipId(membershipId);
      const response = await apiFetch<MembershipQrViewModel>(`/memberships/${membershipId}/qr`);
      setQrModal(response);
      setQrError(null);
    } catch (loadError) {
      setQrError(
        loadError instanceof ApiError ? loadError.message : "Не удалось загрузить QR-код абонемента",
      );
    } finally {
      setQrLoadingMembershipId(null);
    }
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
          {qrError ? <p className={styles.errorText}>{qrError}</p> : null}
          {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Текущие абонементы</h2>

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
                    onUnfreeze={() =>
                      runMembershipAction(
                        membership.id,
                        () =>
                          apiFetch<MyMembershipsResponse>(
                            `/memberships/${membership.id}/unfreeze`,
                            {
                              method: "POST",
                              body: JSON.stringify({}),
                            },
                          ),
                        "Абонемент разморожен.",
                      )
                    }
                    onRenew={async () => {
                      router.push("/passes");
                    }}
                    onShowQr={() => void openMembershipQr(membership.id)}
                    isQrLoading={qrLoadingMembershipId === membership.id}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>Пока нет активных абонементов</p>
                <p className={styles.emptyText}>
                  Как только администратор назначит абонемент или откроется доступное продление, оно появится здесь.
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
                          {membership.planOrigin ? (
                            <span className={styles.historyOrigin}>{membership.planOrigin}</span>
                          ) : null}
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
                          {membership.hasQr ? (
                            <button
                              type="button"
                              className={styles.historyQrButton}
                              onClick={() => void openMembershipQr(membership.id)}
                              disabled={qrLoadingMembershipId === membership.id}
                            >
                              <QrCode size={14} strokeWidth={2.4} />
                              {qrLoadingMembershipId === membership.id ? "Загрузка QR..." : "Показать QR"}
                            </button>
                          ) : null}

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

      {qrModal ? (
        <MembershipQrModal
          qr={qrModal}
          onClose={() => setQrModal(null)}
        />
      ) : null}
    </main>
  );
}

type MembershipCardProps = {
  membership: UserMembershipCard;
  isPending: boolean;
  onFreeze: () => Promise<void>;
  onUnfreeze: () => Promise<void>;
  onRenew: () => Promise<void>;
  onShowQr: () => Promise<void> | void;
  isQrLoading: boolean;
};

function MembershipCard({
  membership,
  isPending,
  onFreeze,
  onUnfreeze,
  onRenew,
  onShowQr,
  isQrLoading,
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
        {membership.hasQr ? (
          <button
            type="button"
            className={styles.qrButton}
            onClick={() => void onShowQr()}
            disabled={isQrLoading}
          >
            <QrCode size={15} strokeWidth={2.4} />
            {isQrLoading ? "QR..." : "QR"}
          </button>
        ) : null}
      </div>

      <div className={styles.cardTop}>
        <div className={styles.cardCopy}>
          {membership.planOrigin ? <p className={styles.planOrigin}>{membership.planOrigin}</p> : null}
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

      {membership.status === "FROZEN" ? (
        <p className={styles.pendingNote}>Абонемент заморожен. Разморозить его можно в любой момент.</p>
      ) : membership.status === "EXPIRED" && membership.canRequestRenewalNow ? (
        <p className={styles.pendingNote}>Абонемент завершён. Можно перейти к оплате нового периода.</p>
      ) : membership.canRenew && !membership.canRequestRenewalNow ? (
        <p className={styles.pendingNote}>Кнопка продления откроется за 14 дней до окончания.</p>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryAction}
          onClick={() => void onRenew()}
          disabled={!membership.canRequestRenewalNow || isPending}
        >
          Продлить
        </button>

        <button
          type="button"
          className={styles.secondaryAction}
          onClick={() => void (membership.canUnfreeze ? onUnfreeze() : onFreeze())}
          disabled={(!membership.canFreeze && !membership.canUnfreeze) || isPending}
        >
          {membership.canUnfreeze ? "Разморозить" : "Заморозить"}
        </button>
      </div>

      <Link href="/schedule" className={styles.scheduleLink}>
        Перейти к расписанию
        <ChevronRight className={styles.scheduleIcon} strokeWidth={2.8} />
      </Link>
    </article>
  );
}

type MembershipQrModalProps = {
  qr: MembershipQrViewModel;
  onClose: () => void;
};

function MembershipQrModal({ qr, onClose }: MembershipQrModalProps) {
  return (
    <div className={styles.modalOverlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-qr-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>QR абонемента</p>
            <h2 id="membership-qr-title" className={styles.modalTitle}>
              {qr.payloadSummary.customerName}
            </h2>
            <p className={styles.modalSubtitle}>{qr.payloadSummary.customerEmail}</p>
          </div>

          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Закрыть">
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        <div
          className={styles.qrCanvas}
          dangerouslySetInnerHTML={{ __html: qr.qrCodeSvg }}
        />

        <div className={styles.modalMetaGrid}>
          <InfoRow label="Источник тарифа" value={qr.payloadSummary.planOrigin ?? "Не указано"} />
          <InfoRow label="Тариф" value={qr.payloadSummary.planTitle} />
          <InfoRow label="Подтариф" value={qr.payloadSummary.planSubtitle ?? "Без подзаголовка"} />
          <InfoRow
            label="Сумма"
            value={`${new Intl.NumberFormat("ru-RU").format(qr.payloadSummary.amount)} ${qr.payloadSummary.currency === "RUB" ? "₽" : qr.payloadSummary.currency}`}
          />
          <InfoRow
            label="Оплачено"
            value={qr.payloadSummary.paidAt ? formatDateTime(qr.payloadSummary.paidAt) : "Не подтверждено"}
          />
          <InfoRow label="Номер заказа" value={qr.payloadSummary.merchantOrderNumber} />
          <InfoRow label="Действует до" value={formatDateTime(qr.payloadSummary.expiresAt)} />
        </div>

        <p className={styles.modalFootnote}>QR сформирован {formatDateTime(qr.generatedAt)}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
