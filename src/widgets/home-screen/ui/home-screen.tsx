"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./home-screen.module.css";

type HomeTile = {
  title: string;
  subtitle?: string;
  iconSrc: string;
  iconAlt: string;
  className: string;
  href?: string;
};

export function HomeScreen() {
  const { canRender, isLoading, user } = useRequireAuth();
  const [todayLabel, setTodayLabel] = useState(() => formatCurrentDate());

  useEffect(() => {
    const updateCurrentDate = () => {
      setTodayLabel(formatCurrentDate());
    };

    updateCurrentDate();

    const timerId = window.setInterval(updateCurrentDate, 60_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const homeTiles: HomeTile[] = [
    {
      title: "Сегодня",
      subtitle: todayLabel,
      iconSrc: "/main/calendar.svg",
      iconAlt: "Календарь",
      className: [styles.tile, styles.tileToday].join(" "),
    },
    {
      title: "Купить абонемент",
      iconSrc: "/main/card.svg",
      iconAlt: "Карта",
      className: [styles.tile, styles.tileBuy].join(" "),
      href: "/passes",
    },
    {
      title: "Мои абонементы",
      iconSrc: "/main/user.svg",
      iconAlt: "Пользователь",
      className: [styles.tile, styles.tileMemberships].join(" "),
      href: "/memberships",
    },
    {
      title: "Расписание\nзанятий",
      iconSrc: "/main/calendar.svg",
      iconAlt: "Календарь",
      className: [styles.tile, styles.tileSchedule].join(" "),
    },
    {
      title: "Наши контакты",
      iconSrc: "/main/map-phone.svg",
      iconAlt: "Контакты",
      className: [styles.tile, styles.tileContacts].join(" "),
    },
  ];

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
            src="/asset/logo.png"
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

        <section className={styles.tiles} aria-label="Главные разделы">
          {homeTiles.map(({ title, subtitle, iconSrc, iconAlt, className, href }) => {
            const content = (
              <>
                <div className={styles.tileCopy}>
                  <h2 className={styles.tileTitle}>
                    {title.split("\n").map((line) => (
                      <span key={line} className={styles.tileLine}>
                        {line}
                      </span>
                    ))}
                  </h2>
                  {subtitle ? <p className={styles.tileSubtitle}>{subtitle}</p> : null}
                </div>

                <Image
                  src={iconSrc}
                  alt={iconAlt}
                  width={74}
                  height={74}
                  className={styles.tileIcon}
                />
              </>
            );

            if (href) {
              return (
                <Link key={title} href={href} className={[className, styles.tileLink].join(" ")}>
                  {content}
                </Link>
              );
            }

            return (
              <article key={title} className={className}>
                {content}
              </article>
            );
          })}
        </section>

        <BottomNav activeItem="home" />
      </section>
    </main>
  );
}

function formatCurrentDate() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
  }).format(now);
  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);

  return `${capitalizeFirstLetter(weekday)} ${date}`;
}

function capitalizeFirstLetter(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
