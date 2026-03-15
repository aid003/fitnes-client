import { AuthAction } from "@/shared/ui/auth-action/auth-action";
import { AuthScreen } from "@/shared/ui/auth-screen/auth-screen";
import styles from "./auth-choice-screen.module.css";

export function AuthChoiceScreen() {
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
