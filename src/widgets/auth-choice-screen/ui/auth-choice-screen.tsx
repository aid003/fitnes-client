"use client";

import { useRequireGuest } from "@/shared/auth/auth-guards";
import { AuthAction } from "@/shared/ui/auth-action/auth-action";
import { AuthScreen } from "@/shared/ui/auth-screen/auth-screen";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./auth-choice-screen.module.css";

export function AuthChoiceScreen() {
  const { canRender, isLoading } = useRequireGuest();

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем активную сессию." />;
  }

  if (!canRender) {
    return <SessionStatus title="Переход" text="Перенаправляем в личный кабинет." />;
  }

  return (
    <AuthScreen backHref="/welcome" compactLogo>
      <div className={styles.screen}>
        <h1 className={styles.title}>
          Начните свое
          <br />
          путешествие
          <br />в Фитнес
        </h1>

        <div className={styles.actions}>
          <AuthAction
            href="/auth/login"
            variant="dim"
            className={styles.button}
          >
            Войти
          </AuthAction>

          <AuthAction
            href="/register"
            className={styles.button}
          >
            Регистрация
          </AuthAction>
        </div>
      </div>
    </AuthScreen>
  );
}
