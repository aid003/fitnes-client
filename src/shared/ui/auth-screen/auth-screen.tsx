import Link from "next/link";
import Image from "next/image";
import type { PropsWithChildren, ReactNode } from "react";
import styles from "./auth-screen.module.css";

type AuthScreenProps = PropsWithChildren<{
  backHref?: string;
  headerClassName?: string;
  contentClassName?: string;
  footer?: ReactNode;
  compactLogo?: boolean;
}>;

export function AuthScreen({
  backHref,
  children,
  headerClassName,
  contentClassName,
  footer,
  compactLogo = false,
}: AuthScreenProps) {
  const panelClassName = [styles.panel, contentClassName].filter(Boolean).join(" ");
  const headerClassNameValue = [styles.header, headerClassName].filter(Boolean).join(" ");
  const logoFrameClassName = [styles.logoFrame, compactLogo ? styles.logoFrameCompact : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={styles.screen}>
      <section className={panelClassName}>
        <header className={headerClassNameValue}>
          {backHref ? (
            <Link href={backHref} className={styles.back} aria-label="Назад">
              <span className={styles.backIcon}>‹</span>
            </Link>
          ) : (
            <div className={styles.backPlaceholder} aria-hidden="true" />
          )}

          <div className={logoFrameClassName}>
            <Image
              src="/new_logo.png"
              alt="Эра Спорта"
              width={compactLogo ? 128 : 220}
              height={compactLogo ? 84 : 144}
              priority
              className={styles.logo}
            />
          </div>
        </header>

        <div className={styles.body}>{children}</div>

        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </section>
    </main>
  );
}
