"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearRegisterFlowDraft,
  readRegisterFlowDraft,
} from "@/shared/lib/auth-flow-storage";
import { AuthAction } from "@/shared/ui/auth-action/auth-action";
import { AuthScreen } from "@/shared/ui/auth-screen/auth-screen";
import styles from "./register-success-screen.module.css";

export function RegisterSuccessScreen() {
  const router = useRouter();
  const [isReady] = useState(() => readRegisterFlowDraft() !== null);

  useEffect(() => {
    if (!isReady) {
      router.replace("/register");
    }
  }, [isReady, router]);

  if (!isReady) {
    return null;
  }

  return (
    <AuthScreen backHref="/register/verify" compactLogo>
      <div className={styles.screen}>
        <div className={styles.badge} aria-hidden="true">
          <span className={styles.badgeInner}>✓</span>
        </div>

        <h1 className={styles.title}>Аккаунт создан</h1>

        <AuthAction
          type="button"
          className={styles.button}
          onClick={() => {
            clearRegisterFlowDraft();
            router.push("/");
          }}
        >
          Продолжить
        </AuthAction>
      </div>
    </AuthScreen>
  );
}
