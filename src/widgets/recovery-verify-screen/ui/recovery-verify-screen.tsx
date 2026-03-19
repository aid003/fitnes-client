"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/shared/auth/auth-context";
import {
  readRecoveryFlowDraft,
  writeRecoveryFlowDraft,
} from "@/shared/lib/auth-flow-storage";
import { ApiError } from "@/shared/lib/api";
import { AuthAction } from "@/shared/ui/auth-action/auth-action";
import { AuthScreen } from "@/shared/ui/auth-screen/auth-screen";
import styles from "./recovery-verify-screen.module.css";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export function RecoveryVerifyScreen() {
  const router = useRouter();
  const { resendRecoveryCode, verifyRecoveryCode } = useAuth();
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: CODE_LENGTH }, () => ""));
  const [draft] = useState(() => readRecoveryFlowDraft());
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_SECONDS);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!draft) {
      router.replace("/auth/recovery");
    }
  }, [draft, router]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setResendCooldown((currentValue) => Math.max(currentValue - 1, 0));
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [resendCooldown]);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft) {
      return;
    }

    if (digits.some((digit) => digit === "")) {
      setError("Введите шестизначный код");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const code = digits.join("");

      await verifyRecoveryCode({
        email: draft.email,
        code,
      });

      writeRecoveryFlowDraft({
        email: draft.email,
        codeVerified: true,
        code,
      });

      router.push("/auth/recovery/reset");
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : "Не удалось подтвердить код",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!draft || resendCooldown > 0) {
      return;
    }

    try {
      setIsResending(true);
      setError("");
      await resendRecoveryCode({
        email: draft.email,
      });
      setResendCooldown(RESEND_SECONDS);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : "Не удалось отправить код повторно",
      );
    } finally {
      setIsResending(false);
    }
  };

  if (!draft) {
    return null;
  }

  return (
    <AuthScreen backHref="/auth/recovery" compactLogo>
      <form className={styles.screen} onSubmit={handleSubmit}>
        <div>
          <h1 className={styles.title}>Введите код</h1>
          <p className={styles.description}>
            Мы отправили код восстановления на {draft.email}. Код действует 15 минут.
          </p>
          <p className={styles.description}>Если письма нет, проверьте папку «Спам».</p>
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
          {isSubmitting ? "Проверяем..." : "Продолжить"}
        </AuthAction>

        <AuthAction
          type="button"
          className={styles.submit}
          onClick={() => void handleResend()}
          disabled={isResending || resendCooldown > 0}
        >
          {isResending
            ? "Отправляем..."
            : resendCooldown > 0
              ? `Отправить код повторно через ${resendCooldown} c`
              : "Отправить код повторно"}
        </AuthAction>
      </form>
    </AuthScreen>
  );
}
