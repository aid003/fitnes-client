"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Bold, Italic, List, Plus, Trash2, Upload } from "lucide-react";
import { useRequireAdmin } from "@/shared/auth/auth-guards";
import { useAuth } from "@/shared/auth/auth-context";
import { apiFetch, ApiError, resolveApiAssetUrl } from "@/shared/lib/api";
import type {
  AdminNewsArticle,
  UploadImageResponse,
} from "@/shared/lib/contracts";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./admin-news-screen.module.css";

type NewsFormState = {
  title: string;
  slug: string;
  excerpt: string;
  lead: string;
  tags: string;
  highlightsTitle: string;
  highlights: string;
  contentRichText: string;
  publishedAt: string;
  sortOrder: string;
  isPublished: boolean;
};

const EMPTY_FORM: NewsFormState = {
  title: "",
  slug: "",
  excerpt: "",
  lead: "",
  tags: "",
  highlightsTitle: "Что нового:",
  highlights: "",
  contentRichText: "<p></p>",
  publishedAt: "",
  sortOrder: "0",
  isPublished: false,
};

export function AdminNewsScreen() {
  const { canRender, isLoading, user } = useRequireAdmin();
  const { logout } = useAuth();
  const [items, setItems] = useState<AdminNewsArticle[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [form, setForm] = useState<NewsFormState>(EMPTY_FORM);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );
  const selectedCoverImageUrl = useMemo(
    () => resolveApiAssetUrl(selectedItem?.coverImageUrl),
    [selectedItem?.coverImageUrl],
  );

  const loadData = async () => {
    const data = await apiFetch<AdminNewsArticle[]>("/admin/news");
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
        setError(getErrorMessage(loadError, "Не удалось загрузить новости в админке"));
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
      slug: selectedItem.slug,
      excerpt: selectedItem.excerpt ?? "",
      lead: selectedItem.lead ?? "",
      tags: selectedItem.tags.join(", "),
      highlightsTitle: selectedItem.highlightsTitle ?? "Что нового:",
      highlights: selectedItem.highlights.join("\n"),
      contentRichText: selectedItem.contentRichText || "<p></p>",
      publishedAt: toDateTimeLocalInput(selectedItem.publishedAt),
      sortOrder: String(selectedItem.sortOrder),
      isPublished: selectedItem.isPublished,
    });
    setPendingUpload(null);
  }, [isCreateMode, selectedItem]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== form.contentRichText) {
      editorRef.current.innerHTML = form.contentRichText || "<p></p>";
    }
  }, [form.contentRichText]);

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void runAction(
      isCreateMode ? "Создаём новость" : "Сохраняем изменения новости",
      async () => {
        const payload = {
          title: form.title,
          slug: form.slug,
          excerpt: form.excerpt || undefined,
          lead: form.lead || undefined,
          tags: splitCommaList(form.tags),
          highlightsTitle: form.highlightsTitle || undefined,
          highlights: splitLineList(form.highlights),
          contentRichText: form.contentRichText || "<p></p>",
          publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
          sortOrder: Number(form.sortOrder) || 0,
          isPublished: form.isPublished,
        };

        if (isCreateMode) {
          const created = await apiFetch<AdminNewsArticle>("/admin/news", {
            method: "POST",
            body: JSON.stringify({
              ...payload,
              publishedAt: payload.publishedAt ?? undefined,
            }),
          });

          setItems((current) =>
            [...current, created].sort((left, right) => left.sortOrder - right.sortOrder),
          );
          setSelectedId(created.id);
          setIsCreateMode(false);
        } else if (selectedItem) {
          const updated = await apiFetch<AdminNewsArticle>(`/admin/news/${selectedItem.id}`, {
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
  };

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем права доступа." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем из админки." />;
  }

  if (isDataLoading) {
    return <SessionStatus title="Загрузка" text="Подтягиваем редактор новостей." />;
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Админка новостей</h1>
            <p className={styles.subtitle}>
              Публикации, rich text-контент, теги, фотообложка и статус публикации.
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
              Новость
            </button>
            <Link href="/admin" className={styles.secondaryButton}>
              Все админки
            </Link>
            <Link href="/admin/trainers" className={styles.secondaryButton}>
              Тренеры
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
              <h2 className={styles.panelTitle}>Публикации</h2>
              <span className={styles.summaryBadge}>{items.length}</span>
            </div>

            <div className={styles.list}>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={[
                    styles.listItem,
                    !item.isPublished ? styles.listItemMuted : "",
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
                    {item.isPublished ? "Опубликовано" : "Черновик"} · sort {item.sortOrder}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.editorPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                {isCreateMode ? "Новая новость" : selectedItem ? "Редактор новости" : "Редактор"}
              </h2>
              <p className={styles.panelText}>
                Основной контент сохраняется как HTML-строка, собранная простым rich text-редактором.
              </p>
            </div>

            {isCreateMode || selectedItem ? (
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.gridTwo}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Заголовок</span>
                    <input
                      className={styles.input}
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, title: event.target.value }))
                      }
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Slug</span>
                    <input
                      className={styles.input}
                      value={form.slug}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, slug: event.target.value }))
                      }
                      required
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Описание для списка</span>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={form.excerpt}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, excerpt: event.target.value }))
                    }
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Lead / вводный абзац</span>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={form.lead}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, lead: event.target.value }))
                    }
                  />
                </label>

                <div className={styles.gridTwo}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Теги через запятую</span>
                    <input
                      className={styles.input}
                      value={form.tags}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, tags: event.target.value }))
                      }
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Заголовок блока highlights</span>
                    <input
                      className={styles.input}
                      value={form.highlightsTitle}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, highlightsTitle: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Пункты блока “Что нового” по строкам</span>
                  <textarea
                    className={styles.textarea}
                    rows={4}
                    value={form.highlights}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, highlights: event.target.value }))
                    }
                  />
                </label>

                <div className={styles.editorWrap}>
                  <div className={styles.editorToolbar}>
                    <button type="button" className={styles.toolbarButton} onClick={() => formatEditor("bold")}>
                      <Bold size={16} />
                    </button>
                    <button type="button" className={styles.toolbarButton} onClick={() => formatEditor("italic")}>
                      <Italic size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.toolbarButton}
                      onClick={() => formatEditor("insertUnorderedList")}
                    >
                      <List size={16} />
                    </button>
                  </div>

                  <div
                    ref={editorRef}
                    className={styles.editor}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() =>
                      setForm((current) => ({
                        ...current,
                        contentRichText: editorRef.current?.innerHTML || "<p></p>",
                      }))
                    }
                  />
                </div>

                <div className={styles.gridTwo}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Дата публикации</span>
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={form.publishedAt}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, publishedAt: event.target.value }))
                      }
                    />
                  </label>

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
                </div>

                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, isPublished: event.target.checked }))
                    }
                  />
                  <span>Опубликовать новость</span>
                </label>

                {!isCreateMode && selectedItem ? (
                  <section className={styles.mediaPanel}>
                    <div className={styles.mediaPreview}>
                      {selectedCoverImageUrl ? (
                        <Image
                          src={selectedCoverImageUrl}
                          alt={selectedItem.title}
                          fill
                          sizes="220px"
                          className={styles.mediaImage}
                          unoptimized
                        />
                      ) : (
                        <div className={styles.mediaPlaceholder}>Фото</div>
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
                          Выбрать обложку
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

                            void runAction("Загружаем обложку новости", async () => {
                              const formData = new FormData();
                              formData.append("file", pendingUpload);
                              const response = await apiFetch<UploadImageResponse<AdminNewsArticle>>(
                                `/admin/news/${selectedItem.id}/cover`,
                                {
                                  method: "POST",
                                  body: formData,
                                },
                              );
                              const nextItem = {
                                ...response.item,
                                coverImageUrl: resolveApiAssetUrl(response.item.coverImageUrl),
                              };

                              setItems((current) =>
                                current.map((item) => (item.id === nextItem.id ? nextItem : item)),
                              );
                              setPendingUpload(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            });
                          }}
                        >
                          <Upload size={16} />
                          Загрузить обложку
                        </button>

                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={!selectedItem.coverImageUrl}
                          onClick={() => {
                            void runAction("Удаляем обложку новости", async () => {
                              const response = await apiFetch<UploadImageResponse<AdminNewsArticle>>(
                                `/admin/news/${selectedItem.id}/cover`,
                                {
                                  method: "DELETE",
                                },
                              );
                              const nextItem = {
                                ...response.item,
                                coverImageUrl: resolveApiAssetUrl(response.item.coverImageUrl),
                              };

                              setItems((current) =>
                                current.map((item) => (item.id === nextItem.id ? nextItem : item)),
                              );
                            });
                          }}
                        >
                          Удалить обложку
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
                        if (!window.confirm(`Удалить новость «${selectedItem.title}»?`)) {
                          return;
                        }

                        void runAction("Удаляем новость", async () => {
                          await apiFetch(`/admin/news/${selectedItem.id}`, { method: "DELETE" });
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
              <div className={styles.placeholder}>Выберите новость слева или создайте новую запись.</div>
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

function splitCommaList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function splitLineList(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toDateTimeLocalInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const shifted = new Date(date.getTime() - offset * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function formatEditor(command: "bold" | "italic" | "insertUnorderedList") {
  document.execCommand(command);
}
