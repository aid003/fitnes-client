"use client";

import Link from "next/link";
import {
  CalendarRange,
  ChartNoAxesCombined,
  ChevronRight,
  FolderTree,
  IdCard,
  LogOut,
  Megaphone,
  Newspaper,
  ScanLine,
  UsersRound,
} from "lucide-react";
import { useRequireAdmin } from "@/shared/auth/auth-guards";
import { useAuth } from "@/shared/auth/auth-context";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./admin-hub-screen.module.css";

const ADMIN_SECTIONS = [
  {
    title: "Каталог абонементов",
    description: "Категории, варианты, группы, тарифы, бейджи и фичи.",
    href: "/admin/passes",
    Icon: FolderTree,
    toneClassName: "catalogCard",
  },
  {
    title: "Назначения абонементов",
    description: "Выдача пользователям, статусы, заморозки и продления.",
    href: "/admin/memberships",
    Icon: IdCard,
    toneClassName: "membershipsCard",
  },
  {
    title: "Расписание",
    description: "Недельная сетка, исключения по датам и клиентский календарь занятий.",
    href: "/admin/schedule",
    Icon: CalendarRange,
    toneClassName: "scheduleCard",
  },
  {
    title: "Сканер QR",
    description: "Считывание QR абонемента и просмотр полных данных оплаты и тарифа.",
    href: "/admin/qr-scanner",
    Icon: ScanLine,
    toneClassName: "scannerCard",
  },
  {
    title: "Платежи и аналитика",
    description: "Выручка, динамика продаж, популярные тарифы и ledger успешных оплат.",
    href: "/admin/payments",
    Icon: ChartNoAxesCombined,
    toneClassName: "paymentsCard",
  },
  {
    title: "Тренеры",
    description: "Состав тренеров, карточки, порядок вывода и фотографии.",
    href: "/admin/trainers",
    Icon: UsersRound,
    toneClassName: "membershipsCard",
  },
  {
    title: "Новости",
    description: "Публикации, rich text-контент, теги, фотообложки и публикация.",
    href: "/admin/news",
    Icon: Newspaper,
    toneClassName: "catalogCard",
  },
  {
    title: "Реклама и баннеры",
    description: "Попап на главной, ссылки, периоды активности и интервал повторного показа.",
    href: "/admin/ads",
    Icon: Megaphone,
    toneClassName: "paymentsCard",
  },
] as const;

export function AdminHubScreen() {
  const { canRender, isLoading, user } = useRequireAdmin();
  const { logout } = useAuth();

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем права доступа." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем из админки." />;
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>Административный раздел</p>
            <h1 className={styles.title}>Мастер-админка</h1>
            <p className={styles.subtitle}>
              Выберите нужный раздел и переходите в соответствующую админку.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/" className={styles.secondaryButton}>
              В клиент
            </Link>
            <button type="button" className={styles.secondaryButton} onClick={() => void logout()}>
              <LogOut size={16} />
              Выйти
            </button>
          </div>
        </header>

        <div className={styles.badge}>{user.name} · {user.email}</div>

        <section className={styles.grid} aria-label="Доступные админки">
          {ADMIN_SECTIONS.map(({ title, description, href, Icon, toneClassName }) => (
            <Link
              key={href}
              href={href}
              className={[styles.card, styles[toneClassName]].join(" ")}
            >
              <div className={styles.cardTop}>
                <div className={styles.iconWrap}>
                  <Icon size={28} strokeWidth={2.2} />
                </div>
                <ChevronRight size={20} strokeWidth={2.6} className={styles.arrow} />
              </div>

              <div className={styles.cardCopy}>
                <h2 className={styles.cardTitle}>{title}</h2>
                <p className={styles.cardText}>{description}</p>
              </div>
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}
