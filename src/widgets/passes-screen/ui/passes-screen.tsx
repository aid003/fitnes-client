import Image from "next/image";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import styles from "./passes-screen.module.css";

const PASS_IMAGES = [
  "/buy/image1.jpg",
  "/buy/image2.jpg",
  "/buy/image3.jpg",
  "/buy/image4.png",
] as const;

const PASS_CARDS = [
  "Безлимитные абонементы ежедневного посещения",
  "Абонемент “Лучшие часы” (Посещение комплекса с 11:00 до 16:00)",
  "Детские секции (по расписанию)",
  "Взрослые групповые занятия (по расписанию)",
  "Подростковый абонемент для клиентов в возрасте (13-17 лет)",
  "Персональные тренировки с тренером",
] as const;

export function PassesScreen() {
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
            <span className={styles.greetingLine}>Name</span>
          </div>
        </header>

        <section className={styles.content}>
          <h1 className={styles.title}>Выберите абонемент</h1>

          <div className={styles.list} aria-label="Доступные абонементы">
            {PASS_CARDS.map((title, index) => (
              <article key={title} className={styles.card}>
                <div className={styles.cardMedia} aria-hidden="true">
                  <Image
                    src={PASS_IMAGES[index % PASS_IMAGES.length]}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 100vw, 430px"
                    className={styles.cardImage}
                  />
                </div>

                <div className={styles.cardOverlay} />

                <div className={styles.cardBody}>
                  <h2 className={styles.cardTitle}>{title}</h2>
                  <button type="button" className={styles.cardAction}>
                    Посмотреть тарифы
                  </button>
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
