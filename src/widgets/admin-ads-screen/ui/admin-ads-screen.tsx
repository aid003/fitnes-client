"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { useRequireAdmin } from "@/shared/auth/auth-guards";
import { useAuth } from "@/shared/auth/auth-context";
import { useAdminActionFeedback } from "@/shared/lib/admin-action-feedback";
import { apiFetch, ApiError, resolveApiAssetUrl } from "@/shared/lib/api";
import type { AdminAdBanner, UploadImageResponse } from "@/shared/lib/contracts";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./admin-ads-screen.module.css";

type AdFormState = {
  title: string;
  targetUrl: string;
  startsAt: string;
  endsAt: string;
  repeatIntervalDays: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY_FORM: AdFormState = {
  title: "",
  targetUrl: "",
  startsAt: "",
  endsAt: "",
  repeatIntervalDays: "7",
  sortOrder: "0",
  isActive: true,
};

export function AdminAdsScreen() {
  const { canRender, isLoading, user } = useRequireAdmin();
  const { logout } = useAuth();
  const [items, setItems] = useState<AdminAdBanner[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [form, setForm] = useState<AdFormState>(EMPTY_FORM);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );
  const selectedImageUrl = useMemo(
    () => resolveApiAssetUrl(selectedItem?.imageUrl),
    [selectedItem?.imageUrl],
  );

  const loadData = async () => {
    const data = await apiFetch<AdminAdBanner[]>("/admin/ads");
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
        setError(getErrorMessage(loadError, "Не удалось загрузить рекламные баннеры"));
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
      title: selectedItem.title,
      targetUrl: selectedItem.targetUrl,
      startsAt: toDateTimeLocalInput(selectedItem.startsAt),
      endsAt: toDateTimeLocalInput(selectedItem.endsAt),
      repeatIntervalDays: String(selectedItem.repeatIntervalDays),
      sortOrder: String(selectedItem.sortOrder),
      isActive: selectedItem.isActive,
    });
    setPendingUpload(null);
  }, [isCreateMode, selectedItem]);

  const runAction = useAdminActionFeedback({ setStatus, setError, getErrorMessage });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void runAction(
      isCreateMode ? "Создаём рекламный баннер" : "Сохраняем изменения баннера",
      isCreateMode ? "Баннер создан" : "Изменения сохранены",
      async () => {
        const payload = {
          title: form.title,
          targetUrl: form.targetUrl,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          repeatIntervalDays: Number(form.repeatIntervalDays) || 1,
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive,
        };

        if (isCreateMode) {
          const created = await apiFetch<AdminAdBanner>("/admin/ads", {
            method: "POST",
            body: JSON.stringify(payload),
          });

          setItems((current) =>
            [...current, created].sort((left, right) => left.sortOrder - right.sortOrder),
          );
          setSelectedId(created.id);
          setIsCreateMode(false);
        } else if (selectedItem) {
          const updated = await apiFetch<AdminAdBanner>(`/admin/ads/${selectedItem.id}`, {
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
      isCreateMode ? "Не удалось создать баннер" : "Не удалось сохранить изменения баннера",
    );
  };

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем права доступа." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем из админки." />;
  }

  if (isDataLoading) {
    return <SessionStatus title="Загрузка" text="Подтягиваем рекламные баннеры." />;
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Админка рекламы</h1>
            <p className={styles.subtitle}>
              Управляйте попапом на главной: ссылкой, окном активности, периодом повтора и изображением.
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
              Баннер
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
              <h2 className={styles.panelTitle}>Баннеры</h2>
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
                  <span className={styles.listItemTitle}>{item.title}</span>
                  <span className={styles.listItemMeta}>
                    sort {item.sortOrder} · каждые {item.repeatIntervalDays} дн.
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.editorPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                {isCreateMode ? "Новый баннер" : selectedItem ? "Редактор баннера" : "Редактор"}
              </h2>
              <p className={styles.panelText}>
                Крестик закрывает баннер до следующего разрешённого сервером повторного показа.
              </p>
            </div>

            {isCreateMode || selectedItem ? (
              <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Название в админке</span>
                  <input
                    className={styles.input}
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Ссылка перехода</span>
                  <input
                    className={styles.input}
                    value={form.targetUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, targetUrl: event.target.value }))
                    }
                    placeholder="https://example.com или /passes"
                    required
                  />
                </label>

                <div className={styles.inlineFields}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Начало показа</span>
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, startsAt: event.target.value }))
                      }
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Окончание показа</span>
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, endsAt: event.target.value }))
                      }
                      required
                    />
                  </label>
                </div>

                <div className={styles.inlineFields}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Повтор через дней</span>
                    <input
                      className={styles.input}
                      type="number"
                      min="1"
                      value={form.repeatIntervalDays}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          repeatIntervalDays: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Порядок показа</span>
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
                </div>

                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, isActive: event.target.checked }))
                    }
                  />
                  <span>Баннер активен</span>
                </label>

                {!isCreateMode && selectedItem ? (
                  <section className={styles.mediaPanel}>
                    <div className={styles.mediaPreview}>
                      {selectedImageUrl ? (
                        <>
                          <Image
                            src={selectedImageUrl}
                            alt={selectedItem.title}
                            fill
                            sizes="(max-width: 980px) 100vw, 340px"
                            className={styles.mediaImage}
                            unoptimized
                          />
                          <div className={styles.previewClose}>
                            <X size={26} strokeWidth={3} />
                          </div>
                        </>
                      ) : (
                        <div className={styles.mediaPlaceholder}>Баннер</div>
                      )}
                    </div>

                    <div className={styles.mediaActions}>
                      <input
                        ref={fileInputRef}
                        className={styles.hiddenFileInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setPendingUpload(event.target.files?.[0] ?? null)
                        }
                      />
                      <div className={styles.filePickerRow}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Выбрать картинку
                        </button>
                        <span className={pendingUpload ? styles.fileName : styles.fileHint}>
                          {pendingUpload ? pendingUpload.name : "PNG, JPG или WEBP до 5 МБ"}
                        </span>
                      </div>

                      <div className={styles.mediaButtons}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={!pendingUpload}
                          onClick={() => {
                            if (!pendingUpload) {
                              return;
                            }

                            void runAction(
                              "Загружаем изображение баннера",
                              "Изображение загружено",
                              async () => {
                                const formData = new FormData();
                                formData.append("file", pendingUpload);
                                const response = await apiFetch<UploadImageResponse<AdminAdBanner>>(
                                  `/admin/ads/${selectedItem.id}/image`,
                                  {
                                    method: "POST",
                                    body: formData,
                                  },
                                );

                                setItems((current) =>
                                  current.map((item) =>
                                    item.id === response.item.id ? response.item : item,
                                  ),
                                );
                                setPendingUpload(null);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
                                }
                              },
                              "Не удалось загрузить изображение баннера",
                            );
                          }}
                        >
                          <Upload size={16} />
                          Загрузить картинку
                        </button>

                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={!selectedItem.imageUrl}
                          onClick={() => {
                            void runAction(
                              "Удаляем изображение баннера",
                              "Изображение удалено",
                              async () => {
                                const response = await apiFetch<UploadImageResponse<AdminAdBanner>>(
                                  `/admin/ads/${selectedItem.id}/image`,
                                  {
                                    method: "DELETE",
                                  },
                                );

                                setItems((current) =>
                                  current.map((item) =>
                                    item.id === response.item.id ? response.item : item,
                                  ),
                                );
                              },
                              "Не удалось удалить изображение баннера",
                            );
                          }}
                        >
                          Удалить картинку
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
                        if (!window.confirm(`Удалить баннер «${selectedItem.title}»?`)) {
                          return;
                        }

                        void runAction(
                          "Удаляем рекламный баннер",
                          "Баннер удалён",
                          async () => {
                            await apiFetch(`/admin/ads/${selectedItem.id}`, { method: "DELETE" });
                            const nextItems = items.filter((item) => item.id !== selectedItem.id);
                            setItems(nextItems);
                            setSelectedId(nextItems[0]?.id ?? null);
                          },
                          "Не удалось удалить баннер",
                        );
                      }}
                    >
                      <Trash2 size={16} />
                      Удалить
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <div className={styles.placeholder}>Выберите баннер слева или создайте новую запись.</div>
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

function toDateTimeLocalInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}
