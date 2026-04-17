"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { apiFetch, ApiError } from "@/shared/lib/api";
import type { ScheduleDayResponse, ScheduleDayTab } from "@/shared/lib/contracts";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./schedule-screen.module.css";

export function ScheduleScreen() {
  const { canRender, isLoading, user } = useRequireAuth();
  const [tabs, setTabs] = useState<ScheduleDayTab[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayData, setDayData] = useState<ScheduleDayResponse | null>(null);
  const [isTabsLoading, setIsTabsLoading] = useState(true);
  const [isDayLoading, setIsDayLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRender) {
      return;
    }

    let cancelled = false;

    void apiFetch<ScheduleDayTab[]>("/schedule/days", { cache: "no-store" })
      .then((nextTabs) => {
        if (cancelled) {
          return;
        }

        setTabs(nextTabs);
        setIsDayLoading(Boolean(nextTabs[0]));
        setSelectedDate(nextTabs[0]?.date ?? null);
        setError(null);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(getErrorMessage(loadError, "Не удалось загрузить дни расписания"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsTabsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canRender]);

  useEffect(() => {
    if (!canRender || !selectedDate) {
      return;
    }

    let cancelled = false;

    void apiFetch<ScheduleDayResponse>(`/schedule?date=${selectedDate}`, {
      cache: "no-store",
    })
      .then((response) => {
        if (!cancelled) {
          setDayData(response);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(getErrorMessage(loadError, "Не удалось загрузить расписание дня"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsDayLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canRender, selectedDate]);

  const activeTab = useMemo(
    () => tabs.find((entry) => entry.date === selectedDate) ?? tabs[0] ?? null,
    [selectedDate, tabs],
  );

  if (isLoading || isTabsLoading) {
    return <SessionStatus title="Загрузка" text="Подтягиваем расписание." />;
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
            <h1 className={styles.title}>Расписание</h1>
            {activeTab ? (
              <p className={styles.subtitle}>
                {activeTab.isToday ? "Сегодня" : activeTab.label} · {activeTab.monthLabel}
              </p>
            ) : null}
          </div>
        </header>

        <section className={styles.tabsWrap} aria-label="Дни расписания">
          <div className={styles.tabs}>
            {tabs.map((tab) => {
              const isActive = tab.date === activeTab?.date;

              return (
                <button
                  key={tab.date}
                  type="button"
                  className={[styles.tab, isActive ? styles.tabActive : ""].filter(Boolean).join(" ")}
                  onClick={() => {
                    setIsDayLoading(true);
                    setSelectedDate(tab.date);
                  }}
                >
                  <span className={styles.tabWeekday}>{tab.shortLabel}</span>
                  <span className={styles.tabDate}>{shortMonth(tab.monthLabel)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.content}>
          {error ? <p className={styles.errorText}>{error}</p> : null}

          {isDayLoading ? (
            <div className={styles.stateCard}>Загружаем занятия выбранного дня...</div>
          ) : dayData?.items.length ? (
            <div className={styles.card}>
              {dayData.items.map((item) => (
                <article key={item.id} className={styles.item}>
                  <div className={styles.timeBlock}>
                    <span className={styles.timePrimary}>{item.startTime}</span>
                    <span className={styles.timeSecondary}>—{item.endTime}</span>
                  </div>

                  <div className={styles.itemBody}>
                    <div className={styles.itemCopy}>
                      <h2 className={styles.itemTitle}>{item.title}</h2>

                      <div className={styles.badges}>
                        {item.ageBadge ? (
                          <span className={[styles.badge, styles.badgePrimary].join(" ")}>
                            {item.ageBadge}
                          </span>
                        ) : null}
                        {item.secondaryBadge ? (
                          <span className={[styles.badge, styles.badgeSecondary].join(" ")}>
                            {item.secondaryBadge}
                          </span>
                        ) : null}
                      </div>
                    </div>

                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>
                {dayData?.isSunday ? "В воскресенье занятий нет" : "На этот день занятий нет"}
              </h2>
              <p className={styles.emptyText}>
                {dayData?.isSunday
                  ? "Выберите другой день недели, чтобы посмотреть актуальное расписание."
                  : "В этот день занятия не проводятся. Выберите другую дату, чтобы посмотреть расписание."}
              </p>
            </div>
          )}
        </section>

        <BottomNav activeItem="schedule" />
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

function shortMonth(value: string) {
  const [day, month] = value.split(" ");
  return month ? `${day} ${month.slice(0, 3)}` : value;
}
