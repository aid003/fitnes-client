"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { useRequireAdmin } from "@/shared/auth/auth-guards";
import { useAuth } from "@/shared/auth/auth-context";
import { apiFetch, ApiError } from "@/shared/lib/api";
import type { AdminTrainer, UploadImageResponse } from "@/shared/lib/contracts";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./admin-trainers-screen.module.css";

type TrainerFormState = {
  name: string;
  slug: string;
  role: string;
  shortBio: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY_FORM: TrainerFormState = {
  name: "",
  slug: "",
  role: "",
  shortBio: "",
  sortOrder: "0",
  isActive: true,
};

export function AdminTrainersScreen() {
  const { canRender, isLoading, user } = useRequireAdmin();
  const { logout } = useAuth();
  const [items, setItems] = useState<AdminTrainer[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<TrainerFormState>(EMPTY_FORM);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const loadData = async () => {
    const data = await apiFetch<AdminTrainer[]>("/admin/trainers");
    setItems(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  };

  useEffect(() => {
    if (!canRender) {
      return;
    }

    void loadData()
      .then(() => setError(null))
      .catch((loadError) => {
        setError(getErrorMessage(loadError, "Не удалось загрузить раздел тренеров"));
      })
      .finally(() => {
        setIsDataLoading(false);
      });
  }, [canRender]);

  useEffect(() => {
    if (isCreateMode) {
      setForm(EMPTY_FORM);
      setPendingUpload(null);
      return;
    }

    if (!selectedItem) {
      return;
    }

    setForm({
      name: selectedItem.name,
      slug: selectedItem.slug,
      role: selectedItem.role,
      shortBio: selectedItem.shortBio ?? "",
      sortOrder: String(selectedItem.sortOrder),
      isActive: selectedItem.isActive,
    });
    setPendingUpload(null);
  }, [isCreateMode, selectedItem]);

  const runAction = async (message: string, action: () => Promise<void>) => {
    try {
      setStatus(message);
      setError(null);
      await action();
    } catch (actionError) {
      setError(getErrorMessage(actionError, "Не удалось выполнить действие"));
    } finally {
      setStatus(null);
    }
  };

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем права доступа." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем из админки." />;
  }

  if (isDataLoading) {
    return <SessionStatus title="Загрузка" text="Подтягиваем карточки тренеров." />;
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Админка тренеров</h1>
            <p className={styles.subtitle}>
              Управляйте составом тренеров, порядком показа и фотографиями карточек.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => {
                setIsCreateMode(true);
                setSelectedId(null);
              }}
            >
              <Plus size={16} />
              Тренер
            </button>
            <Link href="/admin" className={styles.secondaryButton}>
              Все админки
            </Link>
            <Link href="/admin/news" className={styles.secondaryButton}>
              Новости
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
          <aside className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Список тренеров</h2>
              <span className={styles.summaryBadge}>{items.length}</span>
            </div>

            <div className={styles.list}>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={[
                    styles.listItem,
                    !item.isActive ? styles.listItemMuted : "",
                    selectedId === item.id && !isCreateMode ? styles.listItemActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    setSelectedId(item.id);
                    setIsCreateMode(false);
                  }}
                >
                  <span className={styles.listItemTitle}>{item.name}</span>
                  <span className={styles.listItemMeta}>
                    {item.role} · sort {item.sortOrder}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.editorPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                {isCreateMode ? "Новый тренер" : selectedItem ? "Редактор тренера" : "Редактор"}
              </h2>
              <p className={styles.panelText}>
                Фото загружается отдельным действием и сразу становится доступно клиенту.
              </p>
            </div>

            {isCreateMode || selectedItem ? (
              <form
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault();

                  void runAction(
                    isCreateMode ? "Создаём карточку тренера" : "Сохраняем изменения тренера",
                    async () => {
                      const payload = {
                        name: form.name,
                        slug: form.slug,
                        role: form.role,
                        shortBio: form.shortBio || undefined,
                        sortOrder: Number(form.sortOrder) || 0,
                        isActive: form.isActive,
                      };

                      if (isCreateMode) {
                        const created = await apiFetch<AdminTrainer>("/admin/trainers", {
                          method: "POST",
                          body: JSON.stringify(payload),
                        });

                        setItems((current) =>
                          [...current, created].sort((left, right) => left.sortOrder - right.sortOrder),
                        );
                        setSelectedId(created.id);
                        setIsCreateMode(false);
                      } else if (selectedItem) {
                        const updated = await apiFetch<AdminTrainer>(`/admin/trainers/${selectedItem.id}`, {
                          method: "PATCH",
                          body: JSON.stringify(payload),
                        });

                        setItems((current) =>
                          current
                            .map((item) => (item.id === updated.id ? updated : item))
                            .sort((left, right) => left.sortOrder - right.sortOrder),
                        );
                      }
                    },
                  );
                }}
              >
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Имя</span>
                  <input
                    className={styles.input}
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Slug</span>
                  <input
                    className={styles.input}
                    value={form.slug}
                    onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Роль / подпись</span>
                  <input
                    className={styles.input}
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Краткое описание</span>
                  <textarea
                    className={styles.textarea}
                    rows={4}
                    value={form.shortBio}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, shortBio: event.target.value }))
                    }
                  />
                </label>

                <div className={styles.inlineFields}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Порядок</span>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      value={form.sortOrder}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, sortOrder: event.target.value }))
                      }
                    />
                  </label>

                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, isActive: event.target.checked }))
                      }
                    />
                    <span>Показывать на клиенте</span>
                  </label>
                </div>

                {!isCreateMode && selectedItem ? (
                  <section className={styles.mediaPanel}>
                    <div className={styles.mediaPreview}>
                      {selectedItem.photoUrl ? (
                        <Image
                          src={selectedItem.photoUrl}
                          alt={selectedItem.name}
                          fill
                          sizes="180px"
                          className={styles.mediaImage}
                          unoptimized
                        />
                      ) : (
                        <div className={styles.mediaPlaceholder}>Фото</div>
                      )}
                    </div>

                    <div className={styles.mediaActions}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setPendingUpload(event.target.files?.[0] ?? null)
                        }
                      />
                      <div className={styles.mediaButtons}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={!pendingUpload}
                          onClick={() => {
                            if (!pendingUpload) {
                              return;
                            }

                            void runAction("Загружаем фотографию тренера", async () => {
                              const formData = new FormData();
                              formData.append("file", pendingUpload);
                              const response = await apiFetch<UploadImageResponse<AdminTrainer>>(
                                `/admin/trainers/${selectedItem.id}/photo`,
                                {
                                  method: "POST",
                                  body: formData,
                                },
                              );

                              setItems((current) =>
                                current.map((item) => (item.id === response.item.id ? response.item : item)),
                              );
                              setPendingUpload(null);
                            });
                          }}
                        >
                          <Upload size={16} />
                          Загрузить фото
                        </button>

                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={!selectedItem.photoUrl}
                          onClick={() => {
                            void runAction("Удаляем фотографию тренера", async () => {
                              const response = await apiFetch<UploadImageResponse<AdminTrainer>>(
                                `/admin/trainers/${selectedItem.id}/photo`,
                                {
                                  method: "DELETE",
                                },
                              );

                              setItems((current) =>
                                current.map((item) => (item.id === response.item.id ? response.item : item)),
                              );
                            });
                          }}
                        >
                          Удалить фото
                        </button>
                      </div>
                    </div>
                  </section>
                ) : null}

                <div className={styles.formActions}>
                  <button type="submit" className={styles.primaryButton}>
                    {isCreateMode ? "Создать" : "Сохранить"}
                  </button>

                  {isCreateMode ? (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => {
                        setIsCreateMode(false);
                        setSelectedId(items[0]?.id ?? null);
                      }}
                    >
                      Отменить
                    </button>
                  ) : selectedItem ? (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => {
                        if (!window.confirm(`Удалить тренера «${selectedItem.name}»?`)) {
                          return;
                        }

                        void runAction("Удаляем карточку тренера", async () => {
                          await apiFetch(`/admin/trainers/${selectedItem.id}`, { method: "DELETE" });
                          const nextItems = items.filter((item) => item.id !== selectedItem.id);
                          setItems(nextItems);
                          setSelectedId(nextItems[0]?.id ?? null);
                        });
                      }}
                    >
                      <Trash2 size={16} />
                      Удалить
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <div className={styles.placeholder}>Выберите тренера слева или создайте новую запись.</div>
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
