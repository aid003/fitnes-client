"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { apiFetch, ApiError, resolveApiAssetUrl } from "@/shared/lib/api";
import type { NewsListItem } from "@/shared/lib/contracts";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./news-screen.module.css";

export function NewsScreen() {
  const { canRender, isLoading, user } = useRequireAuth();
  const [news, setNews] = useState<NewsListItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRender) {
      return;
    }

    let cancelled = false;

    void apiFetch<NewsListItem[]>("/news")
      .then((data) => {
        if (!cancelled) {
          setNews(data);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof ApiError ? loadError.message : "Не удалось загрузить новости",
          );
        }
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

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем активную сессию." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем на вход." />;
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <Link href="/" className={styles.backLink} aria-label="Назад">
              <ChevronLeft size={28} strokeWidth={2.8} />
            </Link>

            <Image
              src="/new_logo.png"
              alt="Эра Спорта"
              width={160}
              height={106}
              priority
              className={styles.logo}
            />
          </div>

          <div className={styles.heroTitle}>Новости</div>
        </header>

        <section className={styles.content}>
          {isDataLoading ? <p className={styles.stateText}>Подгружаем публикации...</p> : null}
          {error ? <p className={styles.errorText}>{error}</p> : null}

          {!isDataLoading && !error && news.length === 0 ? (
            <div className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>Новостей пока нет</h2>
              <p className={styles.emptyText}>
                Когда администратор опубликует первую новость, она появится здесь.
              </p>
            </div>
          ) : null}

          <div className={styles.list} aria-label="Список новостей">
            {news.map((item) => (
              <Link key={item.id} href={`/news/${item.slug}`} className={styles.card}>
                <div className={styles.cardMedia}>
                  {item.coverImageUrl ? (
                    <Image
                      src={resolveApiAssetUrl(item.coverImageUrl) ?? item.coverImageUrl}
                      alt={item.title}
                      fill
                      sizes="128px"
                      className={styles.cardImage}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.cardFallback}>Фото</div>
                  )}
                </div>

                <div className={styles.cardBody}>
                  <h2 className={styles.cardTitle}>{item.title}</h2>
                  {item.excerpt ? <p className={styles.cardText}>{item.excerpt}</p> : null}
                  {item.publishedAt ? (
                    <p className={styles.cardMeta}>{formatDate(item.publishedAt)}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <BottomNav activeItem="home" />
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
