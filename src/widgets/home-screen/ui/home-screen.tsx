"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CalendarCheck2,
  CreditCard,
  MapPinned,
  Newspaper,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./home-screen.module.css";

type HomeTile = {
  title: string;
  subtitle?: string;
  Icon: typeof CreditCard;
  className: string;
  href?: string;
};

export function HomeScreen() {
  const { canRender, isLoading, user } = useRequireAuth();

  const homeTiles: HomeTile[] = [
    {
      title: "Тренера",
      Icon: UsersRound,
      className: [styles.tile, styles.tileToday].join(" "),
      href: "/trainers",
    },
    {
      title: "Новости",
      Icon: Newspaper,
      className: [styles.tile, styles.tileNews].join(" "),
      href: "/news",
    },
    {
      title: "Купить абонемент",
      Icon: CreditCard,
      className: [styles.tile, styles.tileBuy].join(" "),
      href: "/passes",
    },
    {
      title: "Мои абонементы",
      Icon: UserRound,
      className: [styles.tile, styles.tileMemberships].join(" "),
      href: "/memberships",
    },
    {
      title: "Расписание\nзанятий",
      Icon: CalendarCheck2,
      className: [styles.tile, styles.tileSchedule].join(" "),
      href: "/schedule",
    },
    {
      title: "Наши контакты",
      Icon: MapPinned,
      className: [styles.tile, styles.tileContacts].join(" "),
      href: "/contacts",
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
          {homeTiles.map(({ title, subtitle, Icon, className, href }) => {
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

                <Icon className={styles.tileIcon} strokeWidth={2.1} aria-hidden="true" />
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
