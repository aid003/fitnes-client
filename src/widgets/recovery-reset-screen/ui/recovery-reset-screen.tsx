"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  clearRecoveryFlowDraft,
  readRecoveryFlowDraft,
} from "@/shared/lib/auth-flow-storage";
import { ApiError, apiFetch } from "@/shared/lib/api";
import { AuthAction } from "@/shared/ui/auth-action/auth-action";
import { AuthFormField } from "@/shared/ui/auth-form-field/auth-form-field";
import { AuthScreen } from "@/shared/ui/auth-screen/auth-screen";
import styles from "./recovery-reset-screen.module.css";

type RecoveryResetFormState = {
  password: string;
  confirmPassword: string;
};

type RecoveryResetErrors = Partial<Record<keyof RecoveryResetFormState, string>>;

const INITIAL_STATE: RecoveryResetFormState = {
  password: "",
  confirmPassword: "",
};

export function RecoveryResetScreen() {
  const router = useRouter();
  const [draft] = useState(() => readRecoveryFlowDraft());
  const [values, setValues] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState<RecoveryResetErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!draft || !draft.codeVerified || !draft.code) {
      router.replace("/auth/recovery");
    }
  }, [draft, router]);

  const handleChange = (field: keyof RecoveryResetFormState, value: string) => {
    setValues((currentValue) => ({ ...currentValue, [field]: value }));
    setErrors((currentValue) => ({ ...currentValue, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: RecoveryResetErrors = {};

    if (!values.password) {
      nextErrors.password = "Введите пароль";
    } else if (values.password.length < 9) {
      nextErrors.password = "Пароль должен быть не короче 9 символов";
    }

    if (!values.confirmPassword) {
      nextErrors.confirmPassword = "Повторите пароль";
    } else if (values.confirmPassword !== values.password) {
      nextErrors.confirmPassword = "Пароли не совпадают";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!draft?.code) {
      setSubmitError("Сначала подтвердите код восстановления");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await apiFetch<{ success: true }>("/auth/recovery/reset", {
        method: "POST",
        body: JSON.stringify({
          email: draft.email,
          code: draft.code,
          password: values.password,
        }),
      });

      clearRecoveryFlowDraft();
      router.push("/auth/login");
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Не удалось обновить пароль",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!draft || !draft.codeVerified || !draft.code) {
    return null;
  }

  return (
    <AuthScreen backHref="/auth/recovery/verify" compactLogo>
      <div className={styles.screen}>
        <div className={styles.intro}>
          <h1 className={styles.title}>
            Придумайте
            <br />
            новый пароль
          </h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <AuthFormField
            label="Пароль ( a - 9@Z)"
            placeholder="Пароль"
            type="password"
            autoComplete="new-password"
            value={values.password}
            error={errors.password}
            onChange={(value) => {
              handleChange("password", value);
              setSubmitError(null);
            }}
          />

          <AuthFormField
            label="Повторите пароль"
            placeholder="Пароль"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            error={errors.confirmPassword}
            onChange={(value) => {
              handleChange("confirmPassword", value);
              setSubmitError(null);
            }}
          />

          {submitError ? <p className={styles.error}>{submitError}</p> : null}

          <AuthAction type="submit" className={styles.submit}>
            {isSubmitting ? "Сохраняем..." : "Продолжить"}
          </AuthAction>
        </form>
      </div>
    </AuthScreen>
  );
}
