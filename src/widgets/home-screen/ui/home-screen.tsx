import Image from "next/image";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import styles from "./home-screen.module.css";

const HOME_TILES = [
  {
    title: "Сегодня",
    subtitle: "Пятница 24.12.2026",
    iconSrc: "/main/calendar.svg",
    iconAlt: "Календарь",
    className: [styles.tile, styles.tileToday].join(" "),
  },
  {
    title: "Купить абонемент",
    iconSrc: "/main/card.svg",
    iconAlt: "Карта",
    className: [styles.tile, styles.tileBuy].join(" "),
  },
  {
    title: "Мои абонементы",
    iconSrc: "/main/user.svg",
    iconAlt: "Пользователь",
    className: [styles.tile, styles.tileMemberships].join(" "),
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

export function HomeScreen() {
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
            <span className={styles.greetingLine}>name</span>
          </div>
        </header>

        <section className={styles.tiles} aria-label="Главные разделы">
          {HOME_TILES.map(({ title, subtitle, iconSrc, iconAlt, className }) => (
            <article key={title} className={className}>
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
            </article>
          ))}
        </section>

        <BottomNav activeItem="home" />
      </section>
    </main>
  );
}
