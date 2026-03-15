"use client";

import { useRouter } from "next/navigation";
import {
  type ClipboardEvent,
  type FormEvent,
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { readRegisterFlowDraft } from "@/shared/lib/auth-flow-storage";
import { AuthAction } from "@/shared/ui/auth-action/auth-action";
import { AuthScreen } from "@/shared/ui/auth-screen/auth-screen";
import styles from "./register-verify-screen.module.css";

const CODE_LENGTH = 6;

export function RegisterVerifyScreen() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: CODE_LENGTH }, () => ""));
  const [hasDraft] = useState(() => readRegisterFlowDraft() !== null);
  const [error, setError] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!hasDraft) {
      router.replace("/register");
    }
  }, [hasDraft, router]);

  const setDigitAt = (index: number, value: string) => {
    setDigits((currentValue) =>
      currentValue.map((digit, digitIndex) => (digitIndex === index ? value : digit)),
    );
  };

  const handleDigitChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const numericValue = event.target.value.replace(/\D/gu, "");

    if (!numericValue) {
      setDigitAt(index, "");
      return;
    }

    const nextValue = numericValue.slice(-1);
    setDigitAt(index, nextValue);
    setError("");

    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();

    const pastedValue = event.clipboardData.getData("text").replace(/\D/gu, "").slice(0, CODE_LENGTH);

    if (!pastedValue) {
      return;
    }

    const nextDigits = Array.from({ length: CODE_LENGTH }, (_, index) => pastedValue[index] ?? "");
    setDigits(nextDigits);
    setError("");
    inputRefs.current[Math.min(pastedValue.length, CODE_LENGTH) - 1]?.focus();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (digits.some((digit) => digit === "")) {
      setError("Введите шестизначный код");
      return;
    }

    router.push("/register/success");
  };

  if (!hasDraft) {
    return null;
  }

  return (
    <AuthScreen backHref="/register" compactLogo>
      <form className={styles.screen} onSubmit={handleSubmit}>
        <div>
          <h1 className={styles.title}>Введите код</h1>
          <p className={styles.description}>
            Сообщение с кодом отправленно на почту, которую вы ввели при регистрации
          </p>
        </div>

        <div className={styles.codeGroup} onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              className={styles.digit}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              onChange={(event) => handleDigitChange(index, event)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              aria-label={`Цифра кода ${index + 1}`}
            />
          ))}
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <AuthAction type="submit" className={styles.submit}>
          Продолжить
        </AuthAction>
      </form>
    </AuthScreen>
  );
}
