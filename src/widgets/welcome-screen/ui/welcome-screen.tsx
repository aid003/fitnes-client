import Link from "next/link";
import Image from "next/image";
import styles from "./welcome-screen.module.css";

export function WelcomeScreen() {
  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <div className={styles.brand}>
          <Image
            src="/asset/logo.png"
            alt="Эра Спорта"
            width={318}
            height={210}
            className={styles.logo}
            priority
          />
        </div>

        <div className={styles.content}>
          <p className={styles.description}>
            Фитнес, бассейн и восстановление — в Эра Спорта
          </p>

          <Link href="/auth" className={styles.button}>
            Начать
          </Link>
        </div>
      </section>
    </main>
  );
}
