"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Snowflake } from "lucide-react";
import { useRequireAdmin } from "@/shared/auth/auth-guards";
import { useAuth } from "@/shared/auth/auth-context";
import { useAdminActionFeedback } from "@/shared/lib/admin-action-feedback";
import { apiFetch, ApiError } from "@/shared/lib/api";
import type {
  AdminMembership,
  AuthUser,
  MembershipStatus,
  PassCategoryDetails,
} from "@/shared/lib/contracts";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import { SearchableSelect } from "@/shared/ui/searchable-select/searchable-select";
import styles from "./admin-memberships-screen.module.css";

type CreateMembershipFormState = {
  userId: string;
  passPlanId: string;
  startsAt: string;
  endsAt: string;
  freezeDaysLimit: string;
  canRenew: boolean;
};

type EditMembershipFormState = {
  title: string;
  subtitle: string;
  description: string;
  startsAt: string;
  endsAt: string;
  freezeDaysLimit: string;
  canRenew: boolean;
  sortOrder: string;
  status: MembershipStatus;
};

const EMPTY_CREATE_FORM: CreateMembershipFormState = {
  userId: "",
  passPlanId: "",
  startsAt: toDateTimeLocalInput(new Date()),
  endsAt: toDateTimeLocalInput(addDays(new Date(), 30)),
  freezeDaysLimit: "30",
  canRenew: true,
};

export function AdminMembershipsScreen() {
  const { canRender, isLoading, user } = useRequireAdmin();
  const { logout } = useAuth();
  const [memberships, setMemberships] = useState<AdminMembership[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [categories, setCategories] = useState<PassCategoryDetails[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateMembershipFormState>(EMPTY_CREATE_FORM);
  const [editForm, setEditForm] = useState<EditMembershipFormState | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const planOptions = useMemo(
    () =>
      categories.flatMap((category) =>
        category.variants.flatMap((variant) =>
          variant.groups.flatMap((group) =>
            group.plans.map((plan) => ({
              id: plan.id,
              billingType: plan.billingType,
              label: `${category.title} / ${variant.title} / ${group.title} / ${plan.title}`,
            })),
          ),
        ),
      ),
    [categories],
  );
  const userOptions = useMemo(
    () =>
      users.map((entry) => ({
        id: entry.id,
        label: entry.name,
        sublabel: [entry.email, entry.phone].filter(Boolean).join(" · "),
      })),
    [users],
  );
  const searchablePlanOptions = useMemo(
    () => planOptions.map((plan) => ({ id: plan.id, label: plan.label })),
    [planOptions],
  );
  const selectedCreatePlan = useMemo(
    () => planOptions.find((plan) => plan.id === createForm.passPlanId) ?? null,
    [createForm.passPlanId, planOptions],
  );
  const createPlanIsVisitBased =
    selectedCreatePlan?.billingType === "SINGLE_VISIT" ||
    selectedCreatePlan?.billingType === "VISIT_PACK";

  const selectedMembership = useMemo(
    () => memberships.find((membership) => membership.id === selectedMembershipId) ?? null,
    [memberships, selectedMembershipId],
  );

  const loadData = async () => {
    const [membershipsData, usersData, categoriesData] = await Promise.all([
      apiFetch<AdminMembership[]>("/admin/memberships"),
      apiFetch<AuthUser[]>("/users"),
      apiFetch<PassCategoryDetails[]>("/admin/passes/categories"),
    ]);

    setMemberships(membershipsData);
    setUsers(usersData);
    setCategories(categoriesData);
  };

  useEffect(() => {
    if (!canRender) {
      return;
    }

    void loadData()
      .then(() => {
        setError(null);
      })
      .catch((loadError) => {
        setError(getErrorMessage(loadError, "Не удалось загрузить админку назначений"));
      })
      .finally(() => {
        setIsDataLoading(false);
      });
  }, [canRender]);

  useEffect(() => {
    if (!selectedMembership) {
      setEditForm(null);
      return;
    }

    setEditForm({
      title: selectedMembership.title,
      subtitle: selectedMembership.subtitle ?? "",
      description: selectedMembership.description ?? "",
      startsAt: toDateTimeLocalInput(selectedMembership.startsAt),
      endsAt: toDateTimeLocalInput(selectedMembership.endsAt),
      freezeDaysLimit: String(selectedMembership.freezeDaysLimit),
      canRenew: selectedMembership.usageMode === "TERM" ? selectedMembership.canRenew : false,
      sortOrder: String(selectedMembership.sortOrder),
      status: selectedMembership.status,
    });
  }, [selectedMembership]);

  const runAction = useAdminActionFeedback({ setStatus, setError, getErrorMessage });

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем права доступа." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем из админки." />;
  }

  if (isDataLoading) {
    return <SessionStatus title="Загрузка" text="Собираем назначенные абонементы." />;
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Админка назначений</h1>
            <p className={styles.subtitle}>
              Назначайте абонементы пользователям и управляйте текущими статусами.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/admin" className={styles.secondaryButton}>
              Все админки
            </Link>
            <Link href="/admin/passes" className={styles.secondaryButton}>
              Каталог абонементов
            </Link>
            <button type="button" className={styles.secondaryButton} onClick={() => void logout()}>
              Выйти
            </button>
          </div>
        </header>

        <div className={styles.toolbar}>
          <span className={styles.userBadge}>
            {user.name} · {user.email}
          </span>

          <div className={styles.feedback}>
            {status ? <p className={styles.statusText}>{status}</p> : null}
            {error ? <p className={styles.errorText}>{error}</p> : null}
          </div>
        </div>

        <div className={styles.workspace}>
          <section className={styles.createPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Назначить абонемент</h2>
              <p className={styles.panelText}>
                Используйте текущих пользователей и тарифы из каталога.
              </p>
            </div>

            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();

                void runAction(
                  "Назначаем абонемент",
                  "Абонемент назначен",
                  async () => {
                    const payload: Record<string, unknown> = {
                      userId: createForm.userId,
                      passPlanId: createForm.passPlanId,
                    };

                    if (!createPlanIsVisitBased) {
                      payload.startsAt = new Date(createForm.startsAt).toISOString();
                      payload.endsAt = new Date(createForm.endsAt).toISOString();
                      payload.freezeDaysLimit = Number(createForm.freezeDaysLimit) || 0;
                      payload.canRenew = createForm.canRenew;
                    }

                    const nextMemberships = await apiFetch<AdminMembership[]>("/admin/memberships", {
                      method: "POST",
                      body: JSON.stringify(payload),
                    });

                    setMemberships(nextMemberships);
                    setCreateForm(EMPTY_CREATE_FORM);
                  },
                  "Не удалось назначить абонемент",
                );
              }}
            >
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Пользователь</span>
                <SearchableSelect
                  options={userOptions}
                  value={createForm.userId}
                  onChange={(nextUserId) =>
                    setCreateForm((current) => ({ ...current, userId: nextUserId }))
                  }
                  placeholder="Выберите пользователя"
                  searchPlaceholder="Поиск по имени, email или телефону"
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Тариф</span>
                <SearchableSelect
                  options={searchablePlanOptions}
                  value={createForm.passPlanId}
                  onChange={(nextPassPlanId) =>
                    setCreateForm((current) => ({ ...current, passPlanId: nextPassPlanId }))
                  }
                  placeholder="Выберите тариф"
                  searchPlaceholder="Поиск по категории, варианту или названию"
                  required
                />
              </label>

              {createPlanIsVisitBased ? (
                <p className={styles.panelText}>
                  Для посещаемых тарифов срок не задаётся вручную. Абонемент будет ждать первого сканирования в клубе.
                </p>
              ) : (
                <>
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Начало</span>
                      <input
                        className={styles.fieldControl}
                        type="datetime-local"
                        value={createForm.startsAt}
                        onChange={(event) =>
                          setCreateForm((current) => ({ ...current, startsAt: event.target.value }))
                        }
                        required
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Окончание</span>
                      <input
                        className={styles.fieldControl}
                        type="datetime-local"
                        value={createForm.endsAt}
                        onChange={(event) =>
                          setCreateForm((current) => ({ ...current, endsAt: event.target.value }))
                        }
                        required
                      />
                    </label>
                  </div>

                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Лимит заморозки, дней</span>
                      <input
                        className={styles.fieldControl}
                        type="number"
                        min="0"
                        value={createForm.freezeDaysLimit}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            freezeDaysLimit: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className={[styles.field, styles.checkboxField].join(" ")}>
                      <span className={styles.fieldLabel}>Продление доступно</span>
                      <input
                        type="checkbox"
                        checked={createForm.canRenew}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            canRenew: event.target.checked,
                          }))
                        }
                      />
                    </label>
                  </div>
                </>
              )}

              <button type="submit" className={styles.primaryButton}>
                Назначить абонемент
              </button>
            </form>
          </section>

          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Текущие назначения</h2>
              <p className={styles.panelText}>Слева список, справа редактирование выбранной записи.</p>
            </div>

            <div className={styles.membershipList}>
              {memberships.map((membership) => {
                const isExpanded = expandedIds.includes(membership.id);
                const isSelected = membership.id === selectedMembershipId;

                return (
                  <article
                    key={membership.id}
                    className={[styles.membershipCard, isSelected ? styles.membershipCardSelected : ""]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      type="button"
                      className={styles.membershipSummary}
                      onClick={() => setSelectedMembershipId(membership.id)}
                    >
                      <div className={styles.membershipCopy}>
                        <span className={styles.membershipTitle}>{membership.title}</span>
                        <span className={styles.membershipMeta}>
                          {membership.user.name} · {membership.status}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={styles.membershipExpand}
                      onClick={() =>
                        setExpandedIds((current) =>
                          current.includes(membership.id)
                            ? current.filter((itemId) => itemId !== membership.id)
                            : [...current, membership.id],
                        )
                      }
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      История
                    </button>

                    {isExpanded ? (
                      <div className={styles.membershipHistory}>
                        <div className={styles.historyBlock}>
                          <span>
                            {membership.usageMode === "VISIT"
                              ? `Посещений: ${membership.usedVisits}/${membership.totalVisits ?? 0}, осталось ${membership.remainingVisits ?? 0}`
                              : `Период: ${formatShortDate(membership.startsAt)} - ${formatShortDate(membership.endsAt)}`}
                          </span>
                          {membership.usageMode === "TERM" ? (
                            <span>
                              Заморозка: {membership.freezeDaysUsed}/{membership.freezeDaysLimit} дн.
                            </span>
                          ) : (
                            <span>Активация: {membership.activationStatus === "PENDING" ? "ожидается" : "выполнена"}</span>
                          )}
                        </div>

                        {membership.freezes.length > 0 ? (
                          <div className={styles.historyGroup}>
                            {membership.freezes.map((freeze) => (
                              <div key={freeze.id} className={styles.historyRow}>
                                <Snowflake size={14} />
                                <span>
                                  {freeze.status}: {formatShortDate(freeze.startsAt)} - {formatShortDate(freeze.endsAt)} ({freeze.daysUsed} дн.)
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {membership.renewalRequests.length > 0 ? (
                          <div className={styles.historyGroup}>
                            {membership.renewalRequests.map((request) => (
                              <div key={request.id} className={styles.historyRow}>
                                <span>
                                  Продление {request.status.toLowerCase()}: {formatShortDate(request.createdAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className={styles.editorPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Редактор назначения</h2>
              <p className={styles.panelText}>
                {selectedMembership ? "Изменения применяются сразу к выбранному абонементу." : "Выберите назначение слева."}
              </p>
            </div>

            {selectedMembership && editForm ? (
              <form
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault();

                  void runAction(
                    "Сохраняем изменения",
                    "Изменения сохранены",
                    async () => {
                      const nextMemberships = await apiFetch<AdminMembership[]>(
                        `/admin/memberships/${selectedMembership.id}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            title: editForm.title,
                            subtitle: editForm.subtitle,
                            description: editForm.description,
                            startsAt: new Date(editForm.startsAt).toISOString(),
                            endsAt: new Date(editForm.endsAt).toISOString(),
                            freezeDaysLimit: Number(editForm.freezeDaysLimit) || 0,
                            canRenew: editForm.canRenew,
                            sortOrder: Number(editForm.sortOrder) || 0,
                            status: editForm.status,
                          }),
                        },
                      );

                      setMemberships(nextMemberships);
                    },
                    "Не удалось сохранить изменения",
                  );
                }}
              >
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Заголовок</span>
                  <input
                    className={styles.fieldControl}
                    value={editForm.title}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, title: event.target.value } : current,
                      )
                    }
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Подзаголовок</span>
                  <input
                    className={styles.fieldControl}
                    value={editForm.subtitle}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, subtitle: event.target.value } : current,
                      )
                    }
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Описание</span>
                  <textarea
                    className={[styles.fieldControl, styles.textarea].join(" ")}
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, description: event.target.value } : current,
                      )
                    }
                    rows={3}
                  />
                </label>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Начало</span>
                    <input
                      className={styles.fieldControl}
                      type="datetime-local"
                      value={editForm.startsAt}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current ? { ...current, startsAt: event.target.value } : current,
                        )
                      }
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Окончание</span>
                    <input
                      className={styles.fieldControl}
                      type="datetime-local"
                      value={editForm.endsAt}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current ? { ...current, endsAt: event.target.value } : current,
                        )
                      }
                      required
                    />
                  </label>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Статус</span>
                    <select
                      className={styles.fieldControl}
                      value={editForm.status}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, status: event.target.value as MembershipStatus }
                            : current,
                        )
                      }
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="FROZEN">FROZEN</option>
                      <option value="EXPIRED">EXPIRED</option>
                      <option value="REFUNDED">REFUNDED</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Порядок</span>
                    <input
                      className={styles.fieldControl}
                      type="number"
                      min="0"
                      value={editForm.sortOrder}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current ? { ...current, sortOrder: event.target.value } : current,
                        )
                      }
                    />
                  </label>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Лимит заморозки</span>
                    <input
                      className={styles.fieldControl}
                      type="number"
                      min="0"
                      value={editForm.freezeDaysLimit}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current ? { ...current, freezeDaysLimit: event.target.value } : current,
                        )
                      }
                    />
                  </label>

                  <label className={[styles.field, styles.checkboxField].join(" ")}>
                    <span className={styles.fieldLabel}>Продление доступно</span>
                    <input
                      type="checkbox"
                      checked={editForm.canRenew}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current ? { ...current, canRenew: event.target.checked } : current,
                        )
                      }
                    />
                  </label>
                </div>

                <div className={styles.editorButtons}>
                  <button type="submit" className={styles.primaryButton}>
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className={styles.warnButton}
                    onClick={() =>
                      void runAction(
                        "Завершаем абонемент",
                        "Абонемент завершён",
                        async () => {
                          const nextMemberships = await apiFetch<AdminMembership[]>(
                            `/admin/memberships/${selectedMembership.id}/expire`,
                            {
                              method: "POST",
                              body: JSON.stringify({}),
                            },
                          );

                          setMemberships(nextMemberships);
                        },
                        "Не удалось завершить абонемент",
                      )
                    }
                  >
                    Завершить
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      void runAction(
                        "Снимаем заморозку",
                        "Заморозка снята",
                        async () => {
                          const nextMemberships = await apiFetch<AdminMembership[]>(
                            `/admin/memberships/${selectedMembership.id}/unfreeze`,
                            {
                              method: "POST",
                              body: JSON.stringify({}),
                            },
                          );

                          setMemberships(nextMemberships);
                        },
                        "Не удалось снять заморозку",
                      )
                    }
                  >
                    Снять заморозку
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.placeholder}>
                Выберите назначение, чтобы изменить даты, статус или доступность продления.
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

function toDateTimeLocalInput(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
