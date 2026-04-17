"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { apiFetch, ApiError, resolveApiAssetUrl } from "@/shared/lib/api";
import type { Trainer } from "@/shared/lib/contracts";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./trainers-screen.module.css";

export function TrainersScreen() {
  const { canRender, isLoading, user } = useRequireAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRender) {
      return;
    }

    let cancelled = false;

    void apiFetch<Trainer[]>("/trainers")
      .then((data) => {
        if (!cancelled) {
          setTrainers(data);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : "Не удалось загрузить список тренеров",
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

            <div className={styles.logoFrame}>
              <Image
                src="/new_logo.png"
                alt="Эра Спорта"
                width={160}
                height={106}
                priority
                className={styles.logo}
              />
            </div>
          </div>

          <div className={styles.titleBlock}>
            <h1 className={styles.title}>Наши тренера</h1>
            <p className={styles.subtitle}>Команда клуба и ключевые специализации.</p>
          </div>
        </header>

        <section className={styles.content}>
          {isDataLoading ? <p className={styles.stateText}>Загружаем тренерский состав...</p> : null}
          {error ? <p className={styles.errorText}>{error}</p> : null}

          {!isDataLoading && !error && trainers.length === 0 ? (
            <div className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>Тренеры скоро появятся</h2>
              <p className={styles.emptyText}>
                Раздел уже готов. Как только администратор добавит карточки, они отобразятся здесь.
              </p>
            </div>
          ) : null}

          <div className={styles.list} aria-label="Тренеры клуба">
            {trainers.map((trainer) => (
              <article key={trainer.id} className={styles.card}>
                <div className={styles.photoWrap}>
                  {trainer.photoUrl ? (
                    <Image
                      src={resolveApiAssetUrl(trainer.photoUrl) ?? trainer.photoUrl}
                      alt={trainer.name}
                      fill
                      sizes="96px"
                      className={styles.photo}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.photoFallback}>{getInitials(trainer.name)}</div>
                  )}
                </div>

                <div className={styles.cardBody}>
                  <h2 className={styles.cardTitle}>{trainer.name}</h2>
                  <p className={styles.cardRole}>{trainer.role}</p>
                  {trainer.shortBio ? <p className={styles.cardText}>{trainer.shortBio}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <BottomNav activeItem="home" />
      </section>
    </main>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
