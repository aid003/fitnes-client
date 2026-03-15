"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { writeRegisterFlowDraft } from "@/shared/lib/auth-flow-storage";
import { AuthAction } from "@/shared/ui/auth-action/auth-action";
import { AuthFormField } from "@/shared/ui/auth-form-field/auth-form-field";
import { AuthScreen } from "@/shared/ui/auth-screen/auth-screen";
import styles from "./register-screen.module.css";

type RegisterFormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterFormErrors = Partial<Record<keyof RegisterFormState, string>>;

const INITIAL_STATE: RegisterFormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function RegisterScreen() {
  const router = useRouter();
  const [values, setValues] = useState<RegisterFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<RegisterFormErrors>({});

  const handleChange = (field: keyof RegisterFormState, value: string) => {
    setValues((currentValue) => ({ ...currentValue, [field]: value }));
    setErrors((currentValue) => ({ ...currentValue, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: RegisterFormErrors = {};
    const trimmedName = values.name.trim();
    const trimmedEmail = values.email.trim();

    if (!trimmedName) {
      nextErrors.name = "Введите имя";
    }

    if (!trimmedEmail) {
      nextErrors.email = "Введите почту";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(trimmedEmail)) {
      nextErrors.email = "Почта указана некорректно";
    }

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

    writeRegisterFlowDraft({
      name: trimmedName,
      email: trimmedEmail,
    });

    router.push("/register/verify");
  };

  return (
    <AuthScreen backHref="/auth" compactLogo contentClassName={styles.panelScroll}>
      <div className={styles.screen}>
        <div className={styles.intro}>
          <h1 className={styles.title}>
            Введите ваше
            <br />
            имя, почту и пароль
          </h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <AuthFormField
            label="Имя"
            placeholder="Имя"
            type="text"
            autoComplete="given-name"
            value={values.name}
            error={errors.name}
            onChange={(value) => handleChange("name", value)}
          />

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
            label="Пароль ( a - 9@Z)"
            placeholder="Пароль"
            type="password"
            autoComplete="new-password"
            value={values.password}
            error={errors.password}
            onChange={(value) => handleChange("password", value)}
          />

          <AuthFormField
            label="Повторите пароль"
            placeholder="Пароль"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            error={errors.confirmPassword}
            onChange={(value) => handleChange("confirmPassword", value)}
          />

          <AuthAction type="submit" className={styles.submit}>
            Получить код
          </AuthAction>
        </form>
      </div>

      <p className={styles.signinHint}>
        У вас уже есть учетная запись?{" "}
        <Link href="/auth" className={styles.signinLink}>
          Войдите
        </Link>{" "}
        прямо сейчас
      </p>
    </AuthScreen>
  );
}
