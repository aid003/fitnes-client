"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useRequireAdmin } from "@/shared/auth/auth-guards";
import { useAuth } from "@/shared/auth/auth-context";
import { useAdminActionFeedback } from "@/shared/lib/admin-action-feedback";
import { apiFetch, ApiError } from "@/shared/lib/api";
import type {
  AdminScheduleTemplateDay,
  AdminScheduleTemplateSlot,
  AdminScheduleWorkspace,
  ScheduleWeekday,
} from "@/shared/lib/contracts";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./admin-schedule-screen.module.css";

type SlotFormState = {
  weekday: ScheduleWeekday;
  title: string;
  startTime: string;
  endTime: string;
  ageBadge: string;
  secondaryBadge: string;
  bookingEnabled: boolean;
  sortOrder: string;
  isActive: boolean;
};

type SlotModalState =
  | {
      mode: "create";
      slotId: null;
      form: SlotFormState;
    }
  | {
      mode: "edit";
      slotId: string;
      form: SlotFormState;
    }
  | null;

const DEFAULT_ROW_TIMES = [
  ["08:00", "09:00"],
  ["09:00", "10:00"],
  ["10:00", "11:00"],
  ["11:00", "12:00"],
  ["12:00", "13:00"],
  ["13:00", "14:00"],
  ["14:00", "15:00"],
  ["15:00", "16:00"],
  ["16:00", "17:00"],
  ["17:00", "18:00"],
  ["18:00", "19:00"],
  ["19:00", "20:00"],
  ["20:00", "21:00"],
] as const;

const DEFAULT_CREATE_WEEKDAY: ScheduleWeekday = "MONDAY";

const EMPTY_FORM: SlotFormState = {
  weekday: DEFAULT_CREATE_WEEKDAY,
  title: "",
  startTime: "10:00",
  endTime: "11:00",
  ageBadge: "",
  secondaryBadge: "",
  bookingEnabled: true,
  sortOrder: "0",
  isActive: true,
};

export function AdminScheduleScreen() {
  const { canRender, isLoading, user } = useRequireAdmin();
  const { logout } = useAuth();
  const [workspace, setWorkspace] = useState<AdminScheduleWorkspace | null>(null);
  const [slotModal, setSlotModal] = useState<SlotModalState>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = async () => {
    const data = await apiFetch<AdminScheduleWorkspace>("/admin/schedule/workspace", {
      cache: "no-store",
    });
    setWorkspace(data);
  };

  useEffect(() => {
    if (!canRender) {
      return;
    }

    void loadWorkspace()
      .then(() => setError(null))
      .catch((loadError) =>
        setError(getErrorMessage(loadError, "Не удалось загрузить админку расписания")),
      )
      .finally(() => setIsDataLoading(false));
  }, [canRender]);

  const timeRows = useMemo(() => buildTimeRows(workspace?.templateDays ?? []), [workspace]);

  const runAction = useAdminActionFeedback({ setStatus, setError, getErrorMessage });

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем права доступа." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем из админки." />;
  }

  if (isDataLoading || !workspace) {
    return <SessionStatus title="Загрузка" text="Собираем шаблон расписания." />;
  }

  const openCreateModal = (weekday: ScheduleWeekday, startTime: string, endTime: string) => {
    setSlotModal({
      mode: "create",
      slotId: null,
      form: {
        ...EMPTY_FORM,
        weekday,
        startTime,
        endTime,
        sortOrder: getSuggestedSortOrder(workspace.templateDays, weekday, startTime),
      },
    });
  };

  const openEditModal = (slot: AdminScheduleTemplateSlot) => {
    setSlotModal({
      mode: "edit",
      slotId: slot.id,
      form: {
        weekday: slot.weekday,
        title: slot.title,
        startTime: slot.startTime,
        endTime: slot.endTime,
        ageBadge: slot.ageBadge ?? "",
        secondaryBadge: slot.secondaryBadge ?? "",
        bookingEnabled: slot.bookingEnabled,
        sortOrder: String(slot.sortOrder),
        isActive: slot.isActive,
      },
    });
  };

  const handleSaveSlot = async () => {
    if (!slotModal) {
      return;
    }

    const payload = {
      weekday: slotModal.form.weekday,
      title: slotModal.form.title,
      startTime: slotModal.form.startTime,
      endTime: slotModal.form.endTime,
      ageBadge: slotModal.form.ageBadge || undefined,
      secondaryBadge: slotModal.form.secondaryBadge || undefined,
      bookingEnabled: slotModal.form.bookingEnabled,
      sortOrder: Number(slotModal.form.sortOrder) || 0,
      isActive: slotModal.form.isActive,
    };

    await runAction(
      slotModal.mode === "edit" ? "Сохраняем слот" : "Создаём слот",
      slotModal.mode === "edit" ? "Слот сохранён" : "Слот создан",
      async () => {
        const nextWorkspace = await apiFetch<AdminScheduleWorkspace>(
          slotModal.mode === "edit"
            ? `/admin/schedule/template-slots/${slotModal.slotId}`
            : "/admin/schedule/template-slots",
          {
            method: slotModal.mode === "edit" ? "PATCH" : "POST",
            body: JSON.stringify(payload),
          },
        );
        setWorkspace(nextWorkspace);
        setSlotModal(null);
      },
      slotModal.mode === "edit" ? "Не удалось сохранить слот" : "Не удалось создать слот",
    );
  };

  const handleDeleteSlot = async () => {
    if (!slotModal || slotModal.mode !== "edit") {
      return;
    }

    await runAction(
      "Удаляем слот",
      "Слот удалён",
      async () => {
        const nextWorkspace = await apiFetch<AdminScheduleWorkspace>(
          `/admin/schedule/template-slots/${slotModal.slotId}`,
          { method: "DELETE" },
        );
        setWorkspace(nextWorkspace);
        setSlotModal(null);
      },
      "Не удалось удалить слот",
    );
  };

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>Админка расписания</p>
            <h1 className={styles.title}>Недельный шаблон</h1>
            <p className={styles.subtitle}>
              Это единый шаблон недели. Если нужно что-то поменять, редактируйте слот прямо в
              таблице и потом при необходимости верните вручную.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/admin" className={styles.secondaryButton}>
              Все админки
            </Link>
            <button type="button" className={styles.secondaryButton} onClick={() => void logout()}>
              Выйти
            </button>
          </div>
        </header>

        <div className={styles.toolbar}>
          <span className={styles.badge}>{user.name} · {user.email}</span>

          <div className={styles.toolbarControls}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => openCreateModal(DEFAULT_CREATE_WEEKDAY, "10:00", "11:00")}
            >
              <Plus size={16} />
              Новый слот
            </button>

            <div className={styles.feedback}>
              {status ? <p className={styles.statusText}>{status}</p> : null}
              {error ? <p className={styles.errorText}>{error}</p> : null}
            </div>
          </div>
        </div>

        <section className={styles.gridPanel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Сетка недели</h2>
            <p className={styles.panelText}>
              Пустая ячейка создаёт слот. Карточка редактирует слот. Свободная зона в занятой
              ячейке добавляет ещё одно занятие.
            </p>
          </div>

          <div className={styles.gridScroller}>
            <div className={styles.gridTable}>
              <div className={styles.gridHead}>
                <div className={[styles.timeCell, styles.timeHead].join(" ")}>Время</div>
                {workspace.templateDays.map((day) => (
                  <div key={day.weekday} className={styles.dayCol}>
                    <span className={styles.dayShort}>{day.shortLabel}</span>
                    <span className={styles.dayLabel}>{day.label}</span>
                  </div>
                ))}
              </div>

              <div className={styles.gridBody}>
                {timeRows.map((row) => (
                  <div key={row.key} className={styles.gridRow}>
                    <div className={styles.timeCell}>
                      <span className={styles.timeValue}>{row.startTime}</span>
                      <span className={styles.timeRange}>— {row.endTime}</span>
                    </div>

                    {workspace.templateDays.map((day) => {
                      const slots = row.byWeekday[day.weekday] ?? [];

                      return (
                        <button
                          key={`${row.key}-${day.weekday}`}
                          type="button"
                          className={[
                            styles.dayCell,
                            slots.length === 0 ? styles.dayCellEmpty : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => {
                            openCreateModal(day.weekday, row.startTime, row.endTime);
                          }}
                        >
                          {slots.length > 0 ? (
                            <>
                              <span className={styles.slotStack}>
                                {slots.map((slot) => (
                                  <span
                                    key={slot.id}
                                    className={[
                                      styles.slotChip,
                                      !slot.isActive ? styles.slotChipInactive : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openEditModal(slot);
                                    }}
                                  >
                                    <strong>{slot.title}</strong>
                                    <span>
                                      {slot.ageBadge ?? "Без бейджа"}
                                      {!slot.isActive ? " · неактивно" : ""}
                                    </span>
                                  </span>
                                ))}
                              </span>

                              <span className={styles.addMoreHint}>
                                Нажмите на свободную зону, чтобы добавить ещё занятие
                              </span>
                            </>
                          ) : (
                            <span className={styles.emptyHint}>Нажмите, чтобы добавить</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </section>

      {slotModal ? (
        <div className={styles.modalBackdrop} onClick={() => setSlotModal(null)}>
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>
                  {slotModal.mode === "edit" ? "Редактировать слот" : "Новый слот"}
                </h2>
                <p className={styles.modalText}>
                  Изменения сразу попадают в недельный шаблон и видны на клиенте.
                </p>
              </div>

              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setSlotModal(null)}
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>День недели</span>
                <select
                  className={styles.input}
                  value={slotModal.form.weekday}
                  onChange={(event) =>
                    setSlotModal((current) =>
                      current
                        ? {
                            ...current,
                            form: {
                              ...current.form,
                              weekday: event.target.value as ScheduleWeekday,
                            },
                          }
                        : current,
                    )
                  }
                >
                  {workspace.templateDays.map((day) => (
                    <option key={day.weekday} value={day.weekday}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Порядок</span>
                <input
                  type="number"
                  className={styles.input}
                  value={slotModal.form.sortOrder}
                  onChange={(event) =>
                    setSlotModal((current) =>
                      current
                        ? {
                            ...current,
                            form: { ...current.form, sortOrder: event.target.value },
                          }
                        : current,
                    )
                  }
                />
              </label>

              <label className={[styles.field, styles.fieldWide].join(" ")}>
                <span>Название</span>
                <input
                  className={styles.input}
                  value={slotModal.form.title}
                  onChange={(event) =>
                    setSlotModal((current) =>
                      current
                        ? {
                            ...current,
                            form: { ...current.form, title: event.target.value },
                          }
                        : current,
                    )
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Начало</span>
                <input
                  type="time"
                  className={styles.input}
                  value={slotModal.form.startTime}
                  onChange={(event) =>
                    setSlotModal((current) =>
                      current
                        ? {
                            ...current,
                            form: { ...current.form, startTime: event.target.value },
                          }
                        : current,
                    )
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Конец</span>
                <input
                  type="time"
                  className={styles.input}
                  value={slotModal.form.endTime}
                  onChange={(event) =>
                    setSlotModal((current) =>
                      current
                        ? {
                            ...current,
                            form: { ...current.form, endTime: event.target.value },
                          }
                        : current,
                    )
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Возрастной бейдж</span>
                <input
                  className={styles.input}
                  value={slotModal.form.ageBadge}
                  onChange={(event) =>
                    setSlotModal((current) =>
                      current
                        ? {
                            ...current,
                            form: { ...current.form, ageBadge: event.target.value },
                          }
                        : current,
                    )
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Доп. бейдж</span>
                <input
                  className={styles.input}
                  value={slotModal.form.secondaryBadge}
                  onChange={(event) =>
                    setSlotModal((current) =>
                      current
                        ? {
                            ...current,
                            form: { ...current.form, secondaryBadge: event.target.value },
                          }
                        : current,
                    )
                  }
                />
              </label>
            </div>

            <div className={styles.modalChecks}>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={slotModal.form.bookingEnabled}
                  onChange={(event) =>
                    setSlotModal((current) =>
                      current
                        ? {
                            ...current,
                            form: { ...current.form, bookingEnabled: event.target.checked },
                          }
                        : current,
                    )
                  }
                />
                <span>Показывать кнопку записи</span>
              </label>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={slotModal.form.isActive}
                  onChange={(event) =>
                    setSlotModal((current) =>
                      current
                        ? {
                            ...current,
                            form: { ...current.form, isActive: event.target.checked },
                          }
                        : current,
                    )
                  }
                />
                <span>Слот активен</span>
              </label>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.primaryButton} onClick={() => void handleSaveSlot()}>
                {slotModal.mode === "edit" ? "Сохранить" : "Создать"}
              </button>

              {slotModal.mode === "edit" ? (
                <button type="button" className={styles.warnButton} onClick={() => void handleDeleteSlot()}>
                  <Trash2 size={16} />
                  Удалить
                </button>
              ) : null}

              <button type="button" className={styles.secondaryButton} onClick={() => setSlotModal(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function buildTimeRows(templateDays: AdminScheduleTemplateDay[]) {
  const rowMap = new Map<
    string,
    {
      key: string;
      startTime: string;
      endTime: string;
      byWeekday: Partial<Record<ScheduleWeekday, AdminScheduleTemplateSlot[]>>;
    }
  >();

  DEFAULT_ROW_TIMES.forEach(([startTime, endTime]) => {
    rowMap.set(`${startTime}-${endTime}`, {
      key: `${startTime}-${endTime}`,
      startTime,
      endTime,
      byWeekday: {},
    });
  });

  templateDays.forEach((day) => {
    day.slots.forEach((slot) => {
      const key = `${slot.startTime}-${slot.endTime}`;
      const existing = rowMap.get(key) ?? {
        key,
        startTime: slot.startTime,
        endTime: slot.endTime,
        byWeekday: {},
      };
      const current = existing.byWeekday[day.weekday] ?? [];
      current.push(slot);
      existing.byWeekday[day.weekday] = current;
      rowMap.set(key, existing);
    });
  });

  return [...rowMap.values()].sort((left, right) => left.startTime.localeCompare(right.startTime));
}

function getSuggestedSortOrder(
  templateDays: AdminScheduleTemplateDay[],
  weekday: ScheduleWeekday,
  startTime: string,
) {
  const day = templateDays.find((entry) => entry.weekday === weekday);

  if (!day || day.slots.length === 0) {
    return "0";
  }

  const laterSlot = day.slots.find((slot) => slot.startTime >= startTime);
  return String(laterSlot?.sortOrder ?? day.slots[day.slots.length - 1].sortOrder + 10);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}
