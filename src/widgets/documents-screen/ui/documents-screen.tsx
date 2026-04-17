import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { documents, type DocumentDefinition } from "@/shared/lib/documents";
import styles from "./documents-screen.module.css";

type DocumentsScreenProps =
  | {
      mode: "hub";
    }
  | {
      mode: "document";
      document: DocumentDefinition;
    };

export function DocumentsScreen(props: DocumentsScreenProps) {
  const isHub = props.mode === "hub";
  const title = isHub ? "Документы" : props.document.title;
  const backHref = isHub ? "/register" : "/documents";

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <Link href={backHref} className={styles.backLink} aria-label="Назад">
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

          <p className={styles.eyebrow}>Эра Спорта</p>
          <h1 className={styles.title}>{title}</h1>
          {isHub ? (
            <p className={styles.lead}>
              Здесь собраны документы, с которыми можно ознакомиться перед
              регистрацией и использованием сервиса.
            </p>
          ) : null}
        </header>

        <div className={styles.content}>
          {isHub ? (
            <div className={styles.cardList}>
              {documents.map((document) => (
                <Link
                  key={document.slug}
                  href={`/documents/${document.slug}`}
                  className={styles.card}
                >
                  <h2 className={styles.cardTitle}>{document.shortTitle}</h2>
                  <p className={styles.cardSummary}>{document.summary}</p>
                  <p className={styles.cardAction}>Открыть документ</p>
                </Link>
              ))}
            </div>
          ) : (
            <article className={styles.article}>{props.document.content}</article>
          )}
        </div>

        <p className={styles.footer}>
          Нажимая кнопку «Зарегистрироваться», пользователь соглашается с
          условиями документов, размещенных в приложении.
        </p>
      </section>
    </main>
  );
}
