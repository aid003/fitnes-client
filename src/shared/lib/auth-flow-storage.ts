export const REGISTER_FLOW_STORAGE_KEY = "register-flow";
export const RECOVERY_FLOW_STORAGE_KEY = "recovery-flow";

export type RegisterFlowDraft = {
  name: string;
  email: string;
};

export type RecoveryFlowDraft = {
  email: string;
  codeVerified: boolean;
  code?: string;
};

export function readRegisterFlowDraft(): RegisterFlowDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(REGISTER_FLOW_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<RegisterFlowDraft>;

    if (
      typeof parsedValue.name === "string" &&
      typeof parsedValue.email === "string"
    ) {
      return {
        name: parsedValue.name,
        email: parsedValue.email,
      };
    }
  } catch {
    window.sessionStorage.removeItem(REGISTER_FLOW_STORAGE_KEY);
  }

  return null;
}

export function writeRegisterFlowDraft(draft: RegisterFlowDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(REGISTER_FLOW_STORAGE_KEY, JSON.stringify(draft));
}

export function clearRegisterFlowDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(REGISTER_FLOW_STORAGE_KEY);
}

export function readRecoveryFlowDraft(): RecoveryFlowDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(RECOVERY_FLOW_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<RecoveryFlowDraft>;

    if (
      typeof parsedValue.email === "string" &&
      typeof parsedValue.codeVerified === "boolean"
    ) {
      return {
        email: parsedValue.email,
        codeVerified: parsedValue.codeVerified,
        code:
          typeof parsedValue.code === "string" && parsedValue.code.length > 0
            ? parsedValue.code
            : undefined,
      };
    }
  } catch {
    window.sessionStorage.removeItem(RECOVERY_FLOW_STORAGE_KEY);
  }

  return null;
}

export function writeRecoveryFlowDraft(draft: RecoveryFlowDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(RECOVERY_FLOW_STORAGE_KEY, JSON.stringify(draft));
}

export function clearRecoveryFlowDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(RECOVERY_FLOW_STORAGE_KEY);
}
