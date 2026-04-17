"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { apiFetch, ApiError, resolveApiAssetUrl } from "@/shared/lib/api";
import type { PassCategoryListItem } from "@/shared/lib/contracts";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./passes-screen.module.css";

export function PassesScreen() {
  const { canRender, isLoading, user } = useRequireAuth();
  const [passes, setPasses] = useState<PassCategoryListItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRender) {
      return;
    }

    let cancelled = false;

    void apiFetch<PassCategoryListItem[]>("/passes/categories")
      .then((data) => {
        if (!cancelled) {
          setPasses(data);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : "Не удалось загрузить каталог абонементов",
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
          <Image
            src="/new_logo.png"
            alt="Эра Спорта"
            width={190}
            height={126}
            priority
            className={styles.logo}
          />

          <div className={styles.greeting}>
            <span className={styles.greetingLine}>Привет,</span>
            <span className={styles.greetingLine}>{user.name}</span>
          </div>
        </header>

        <section className={styles.content}>
          <h1 className={styles.title}>Выберите абонемент</h1>

          {isDataLoading ? (
            <p className={styles.stateText}>Загружаем доступные абонементы...</p>
          ) : null}

          {error ? <p className={styles.errorText}>{error}</p> : null}

          <div className={styles.list} aria-label="Доступные абонементы">
            {passes.map((pass) => (
              <article key={pass.id} className={styles.card}>
                <div className={styles.cardMedia} aria-hidden="true">
                  <Image
                    src={resolveApiAssetUrl(pass.coverImageUrl) ?? "/buy/image1.jpg"}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 100vw, 430px"
                    className={styles.cardImage}
                    unoptimized
                  />
                </div>

                <div className={styles.cardOverlay} />

                <div className={styles.cardBody}>
                  <h2 className={styles.cardTitle}>{pass.title}</h2>
                  <Link href={`/passes/${pass.slug}`} className={styles.cardAction}>
                    Выбрать тарифы
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <BottomNav activeItem="passes" />
      </section>
    </main>
  );
}
