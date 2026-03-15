import styles from "./session-status.module.css";

type SessionStatusProps = {
  title: string;
  text: string;
};

export function SessionStatus({ title, text }: SessionStatusProps) {
  return (
    <main className={styles.state}>
      <section className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>{text}</p>
      </section>
    </main>
  );
}
