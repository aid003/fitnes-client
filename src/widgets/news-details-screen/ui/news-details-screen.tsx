"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { apiFetch, ApiError, resolveApiAssetUrl } from "@/shared/lib/api";
import type { NewsDetails } from "@/shared/lib/contracts";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./news-details-screen.module.css";

type NewsDetailsScreenProps = {
  slug: string;
};

export function NewsDetailsScreen({ slug }: NewsDetailsScreenProps) {
  const { canRender, isLoading, user } = useRequireAuth();
  const [article, setArticle] = useState<NewsDetails | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRender) {
      return;
    }

    let cancelled = false;

    void apiFetch<NewsDetails>(`/news/${slug}`)
      .then((data) => {
        if (!cancelled) {
          setArticle(data);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : "Не удалось загрузить страницу новости",
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
  }, [canRender, slug]);

  if (isLoading || isDataLoading) {
    return <SessionStatus title="Загрузка" text="Подгружаем новость." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем на вход." />;
  }

  if (error || !article) {
    return (
      <main className={styles.screen}>
        <section className={styles.panel}>
          <div className={styles.errorWrap}>
            <p className={styles.errorText}>{error ?? "Новость не найдена"}</p>
            <Link href="/news" className={styles.backButton}>
              Вернуться к списку новостей
            </Link>
          </div>
          <BottomNav activeItem="home" />
        </section>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <Link href="/news" className={styles.backLink} aria-label="Назад к новостям">
              <ChevronLeft size={28} strokeWidth={2.8} />
            </Link>

            <Image
              src="/asset/logo.png"
              alt="Эра Спорта"
              width={160}
              height={106}
              priority
              className={styles.logo}
            />
          </div>

          <h1 className={styles.pageTitle}>Новости</h1>
        </header>

        <article className={styles.article}>
          <div className={styles.media}>
            {article.coverImageUrl ? (
              <Image
                src={resolveApiAssetUrl(article.coverImageUrl) ?? article.coverImageUrl}
                alt={article.title}
                fill
                sizes="(max-width: 767px) 100vw, 430px"
                className={styles.cover}
                unoptimized
              />
            ) : (
              <div className={styles.coverFallback}>Фото</div>
            )}
          </div>

          <div className={styles.copy}>
            <h2 className={styles.title}>{article.title}</h2>

            {article.tags.length ? (
              <div className={styles.tags}>
                {article.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {article.lead ? <p className={styles.lead}>{article.lead}</p> : null}

            {article.highlights.length ? (
              <section className={styles.highlightBox}>
                <h3 className={styles.highlightTitle}>
                  {article.highlightsTitle?.trim() || "Что нового:"}
                </h3>
                <ul className={styles.highlightList}>
                  {article.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div
              className={styles.richText}
              dangerouslySetInnerHTML={{ __html: article.contentRichText }}
            />
          </div>
        </article>

        <BottomNav activeItem="home" />
      </section>
    </main>
  );
}
