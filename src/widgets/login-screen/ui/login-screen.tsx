"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useRequireGuest } from "@/shared/auth/auth-guards";
import { useAuth } from "@/shared/auth/auth-context";
import { ApiError } from "@/shared/lib/api";
import { AuthAction } from "@/shared/ui/auth-action/auth-action";
import { AuthFormField } from "@/shared/ui/auth-form-field/auth-form-field";
import { AuthScreen } from "@/shared/ui/auth-screen/auth-screen";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./login-screen.module.css";

type LoginFormState = {
  email: string;
  password: string;
};

type LoginFormErrors = Partial<Record<keyof LoginFormState, string>>;

const INITIAL_STATE: LoginFormState = {
  email: "",
  password: "",
};

export function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { canRender, isLoading } = useRequireGuest();
  const [values, setValues] = useState<LoginFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof LoginFormState, value: string) => {
    setValues((currentValue) => ({ ...currentValue, [field]: value }));
    setErrors((currentValue) => ({ ...currentValue, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: LoginFormErrors = {};
    const trimmedEmail = values.email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Введите почту";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(trimmedEmail)) {
      nextErrors.email = "Почта указана некорректно";
    }

    if (!values.password) {
      nextErrors.password = "Введите пароль";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await login({
        email: trimmedEmail,
        password: values.password,
      });
      router.replace("/");
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : "Не удалось войти в аккаунт",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем активную сессию." />;
  }

  if (!canRender) {
    return <SessionStatus title="Переход" text="Перенаправляем в личный кабинет." />;
  }

  return (
    <AuthScreen backHref="/auth" compactLogo>
      <div className={styles.screen}>
        <div className={styles.intro}>
          <h1 className={styles.title}>
            Введите вашу
            <br />
            почту и пароль
          </h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <AuthFormField
            label="Почта"
            placeholder="Почта"
            type="email"
            autoComplete="email"
            value={values.email}
            error={errors.email}
            onChange={(value) => handleChange("email", value)}
          />

          <AuthFormField
            label="Пароль"
            placeholder="Пароль"
            type="password"
            autoComplete="current-password"
            value={values.password}
            error={errors.password}
            onChange={(value) => handleChange("password", value)}
          />

          <div className={styles.recoveryLinkRow}>
            <AuthAction
              href="/auth/recovery"
              variant="dim"
              className={styles.recoveryLink}
            >
              Забыли пароль?
            </AuthAction>
          </div>

          {submitError ? <p className={styles.errorText}>{submitError}</p> : null}

          <AuthAction type="submit" className={styles.submit}>
            {isSubmitting ? "Входим..." : "Продолжить"}
          </AuthAction>
        </form>
      </div>
    </AuthScreen>
  );
}
