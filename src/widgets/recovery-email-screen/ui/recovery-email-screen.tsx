"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/shared/auth/auth-context";
import {
  clearRecoveryFlowDraft,
  writeRecoveryFlowDraft,
} from "@/shared/lib/auth-flow-storage";
import { ApiError } from "@/shared/lib/api";
import { AuthAction } from "@/shared/ui/auth-action/auth-action";
import { AuthFormField } from "@/shared/ui/auth-form-field/auth-form-field";
import { AuthScreen } from "@/shared/ui/auth-screen/auth-screen";
import styles from "./recovery-email-screen.module.css";

type RecoveryEmailErrors = {
  email?: string;
};

export function RecoveryEmailScreen() {
  const router = useRouter();
  const { requestRecoveryCode } = useAuth();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<RecoveryEmailErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: RecoveryEmailErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Введите почту";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(trimmedEmail)) {
      nextErrors.email = "Почта указана некорректно";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await requestRecoveryCode({
        email: trimmedEmail,
      });

      clearRecoveryFlowDraft();
      writeRecoveryFlowDraft({
        email: trimmedEmail,
        codeVerified: false,
      });

      router.push("/auth/recovery/verify");
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Не удалось начать восстановление пароля",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen backHref="/auth/login" compactLogo>
      <div className={styles.screen}>
        <div className={styles.intro}>
          <h1 className={styles.title}>
            Введите вашу
            <br />
            почту
          </h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <AuthFormField
            label="Почта"
            placeholder="Введите свою почту"
            type="email"
            autoComplete="email"
            value={email}
            error={errors.email}
            onChange={(value) => {
              setEmail(value);
              setErrors({ email: undefined });
              setSubmitError(null);
            }}
          />

          {submitError ? <p className={styles.error}>{submitError}</p> : null}

          <AuthAction type="submit" className={styles.submit}>
            {isSubmitting ? "Отправляем код..." : "Продолжить"}
          </AuthAction>
        </form>
      </div>
    </AuthScreen>
  );
}
