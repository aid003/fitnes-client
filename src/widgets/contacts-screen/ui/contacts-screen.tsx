"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, MapPin } from "lucide-react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./contacts-screen.module.css";

type ContactItem = {
  title: string;
  value: string;
  actionLabel: string;
  href: string;
  iconSrc: string;
  iconAlt: string;
};

const CONTACT_ITEMS: ContactItem[] = [
  {
    title: "Телефон",
    value: "+7 (918) 085-52-58",
    actionLabel: "Позвонить",
    href: "tel:+79180855258",
    iconSrc: "/about/phone.png",
    iconAlt: "Телефон",
  },
  {
    title: "Telegram",
    value: "@era_sporta_apsheronsk",
    actionLabel: "Написать",
    href: "https://t.me/era_sporta_apsheronsk",
    iconSrc: "/about/telegram.png",
    iconAlt: "Telegram",
  },
  {
    title: "Instagram/VK",
    value: "@era_sporta_apsheronsk",
    actionLabel: "Открыть",
    href: "https://instagram.com/era_sporta_apsheronsk",
    iconSrc: "/about/instagram.png",
    iconAlt: "Instagram",
  },
  {
    title: "E-mail",
    value: "eeera_spoorta@mail.ru",
    actionLabel: "Написать",
    href: "mailto:eeera_spoorta@mail.ru",
    iconSrc: "/about/message.png",
    iconAlt: "E-mail",
  },
];

const YANDEX_PROFILE_URL = "https://yandex.ru/profile/48817721480?lang=ru";
const YANDEX_MAP_EMBED_URL =
  "https://yandex.ru/map-widget/v1/?z=17&text=%D0%90%D0%BF%D1%88%D0%B5%D1%80%D0%BE%D0%BD%D1%81%D0%BA%2C%20%D1%83%D0%BB.%20%D0%A1%D0%BF%D0%BE%D1%80%D1%82%D0%B0%202%D0%94%2C%20%D0%AD%D1%80%D0%B0%20%D0%A1%D0%BF%D0%BE%D1%80%D1%82%D0%B0";

export function ContactsScreen() {
  const { canRender, isLoading, user } = useRequireAuth();

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
            <Link href="/" className={styles.backLink} aria-label="Назад на главную">
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

          <h1 className={styles.title}>Наши контакты</h1>
        </header>

        <section className={styles.content}>
          <div className={styles.contactList}>
            {CONTACT_ITEMS.map((item) => (
              <article key={item.title} className={styles.contactCard}>
                <div className={styles.contactInfo}>
                  <div className={styles.iconWrap}>
                    <Image
                      src={item.iconSrc}
                      alt={item.iconAlt}
                      width={64}
                      height={64}
                      className={styles.contactIcon}
                    />
                  </div>

                  <div className={styles.contactCopy}>
                    <h2 className={styles.contactTitle}>{item.title}</h2>
                    <p className={styles.contactValue}>{item.value}</p>
                  </div>
                </div>

                <a
                  href={item.href}
                  className={styles.contactAction}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  {item.actionLabel}
                </a>
              </article>
            ))}
          </div>

          <section className={styles.addressCard}>
            <div className={styles.addressTop}>
              <div className={styles.addressCopy}>
                <div className={styles.addressIconWrap}>
                  <MapPin size={34} strokeWidth={2.4} />
                </div>

                <div className={styles.addressText}>
                  <h2 className={styles.addressTitle}>Адрес</h2>
                  <p className={styles.addressValue}>
                    Апшеронск,
                    <br />
                    ул. Спорта 2Д
                  </p>
                </div>
              </div>

              <div className={styles.mapCard}>
                <iframe
                  title="Эра Спорта на Яндекс Картах"
                  src={YANDEX_MAP_EMBED_URL}
                  loading="lazy"
                  className={styles.mapFrame}
                  referrerPolicy="no-referrer-when-downgrade"
                />

                <a
                  href={YANDEX_PROFILE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.mapAction}
                >
                  Посмотреть
                </a>
              </div>
            </div>

            <div className={styles.addressSection}>
              <h3 className={styles.sectionTitle}>Режим работы:</h3>
              <p className={styles.scheduleText}>
                <span>Пн-Пт:&nbsp;&nbsp;&nbsp; 8:00 - 21:45</span>
                <span>Сб-Вс:&nbsp;&nbsp;&nbsp; 9:00 - 19:45</span>
              </p>
            </div>

            <div className={styles.addressSection}>
              <p className={styles.footerText}>
                По всем вопросам вы можете связаться с нами любым удобным способом.
              </p>
            </div>
          </section>
        </section>

        <BottomNav activeItem="home" />
      </section>
    </main>
  );
}
