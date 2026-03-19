"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, Keyboard, RefreshCcw, ScanLine } from "lucide-react";
import { useRequireAdmin } from "@/shared/auth/auth-guards";
import { useAuth } from "@/shared/auth/auth-context";
import { apiFetch, ApiError } from "@/shared/lib/api";
import type { AdminScannedMembershipQrViewModel } from "@/shared/lib/contracts";
import { startQrScanner, type QrScannerSession } from "@/shared/lib/qr-scanner";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./admin-qr-scanner-screen.module.css";

type CameraState =
  | "idle"
  | "loading"
  | "ready"
  | "permission_blocked"
  | "unsupported_camera"
  | "no_qr_found_yet"
  | "decode_error";

const NO_QR_HINT_DELAY_MS = 7000;

export function AdminQrScannerScreen() {
  const { canRender, isLoading, user } = useRequireAdmin();
  const { logout } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerSessionRef = useRef<QrScannerSession | null>(null);
  const noQrHintTimeoutRef = useRef<number | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminScannedMembershipQrViewModel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualEntryVisible, setIsManualEntryVisible] = useState(false);
  const [manualContent, setManualContent] = useState("");

  function clearNoQrHintTimer() {
    if (noQrHintTimeoutRef.current !== null) {
      window.clearTimeout(noQrHintTimeoutRef.current);
      noQrHintTimeoutRef.current = null;
    }
  }

  function scheduleNoQrHint() {
    clearNoQrHintTimer();
    noQrHintTimeoutRef.current = window.setTimeout(() => {
      setCameraState((currentState) => {
        if (currentState === "ready") {
          return "no_qr_found_yet";
        }

        return currentState;
      });
    }, NO_QR_HINT_DELAY_MS);
  }

  function stopScanner() {
    clearNoQrHintTimer();
    scannerSessionRef.current?.stop();
    scannerSessionRef.current = null;
  }

  async function submitScan(content: string) {
    try {
      setIsSubmitting(true);
      const response = await apiFetch<AdminScannedMembershipQrViewModel>("/admin/memberships/qr/scan", {
        method: "POST",
        body: JSON.stringify({ content }),
      });

      setResult(response);
      setScanError(null);
      setManualContent("");
      setIsManualEntryVisible(false);
      stopScanner();
    } catch (error) {
      setScanError(
        error instanceof ApiError ? error.message : "Не удалось проверить QR-код",
      );
      setResult(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startScanner() {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    stopScanner();
    setScanError(null);
    setResult(null);
    setCameraState("loading");

    try {
      const session = await startQrScanner({
        videoElement,
        onDecode: (content) => {
          clearNoQrHintTimer();
          void submitScan(content);
        },
        onFailure: (kind, message) => {
          clearNoQrHintTimer();
          setCameraState(kind);
          setScanError(message);
        },
      });

      scannerSessionRef.current = session;
      setCameraState("ready");
      scheduleNoQrHint();
    } catch (error) {
      const state =
        error instanceof Error && "kind" in error
          ? (error.kind as Exclude<CameraState, "idle" | "loading" | "ready" | "no_qr_found_yet">)
          : "decode_error";

      setCameraState(state);
      setScanError(
        error instanceof Error ? error.message : "Не удалось запустить камеру",
      );
    }
  }

  function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedContent = manualContent.trim();

    if (!normalizedContent || isSubmitting) {
      return;
    }

    stopScanner();
    void submitScan(normalizedContent);
  }

  function handleRescan() {
    setResult(null);
    setScanError(null);
    void startScanner();
  }

  useEffect(() => {
    if (!canRender) {
      return;
    }

    void startScanner();

    return () => {
      stopScanner();
    };
    // `startScanner` and `stopScanner` are stable enough for this mount/unmount flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRender]);

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем права доступа." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем из админки." />;
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Административный раздел</p>
            <h1 className={styles.title}>Сканер QR</h1>
            <p className={styles.subtitle}>
              Считайте QR абонемента камерой и сразу проверьте состав тарифа и данные оплаты.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/admin" className={styles.secondaryButton}>
              Все админки
            </Link>
            <button type="button" className={styles.secondaryButton} onClick={() => void logout()}>
              Выйти
            </button>
          </div>
        </header>

        <div className={styles.badge}>{user.name} · {user.email}</div>

        {result ? (
          <section className={styles.resultMode}>
            <article className={styles.resultSummaryCard}>
              <div className={styles.resultSummaryHeader}>
                <div>
                  <p className={styles.resultEyebrow}>Результат проверки</p>
                  <h2 className={styles.resultTitle}>QR-код подтверждён</h2>
                  <p className={styles.cardText}>
                    Сначала ключевые данные по абонементу и оплате, затем тариф и данные клиента.
                  </p>
                </div>

                <button type="button" className={styles.primaryButton} onClick={handleRescan}>
                  <RefreshCcw size={16} strokeWidth={2.2} />
                  Сканировать другой QR
                </button>
              </div>

              <div className={styles.resultStatus}>
                <CheckCircle2 size={18} strokeWidth={2.1} />
                <span>Подпись валидна, версия {result.verification.version}</span>
                <span>Сформирован {formatDateTime(result.verification.generatedAt)}</span>
              </div>
            </article>

            <section className={styles.resultLayout}>
              <DenseSection
                title="Абонемент"
                tone="primary"
                rows={[
                  ["ID", result.membership.id],
                  ["Название", result.membership.title],
                  ["Подзаголовок", result.membership.subtitle ?? "Без подзаголовка"],
                  ["Статус", result.membership.status],
                  ["Начало", formatDateTime(result.membership.startsAt)],
                  ["Окончание", formatDateTime(result.membership.endsAt)],
                  ["Лимит заморозки", `${result.membership.freezeDaysLimit} дн.`],
                ]}
              />

              <DenseSection
                title="Оплата"
                tone="primary"
                rows={[
                  ["Payment ID", result.payment.paymentId],
                  ["Номер заказа", result.payment.merchantOrderNumber],
                  ["Gateway order", result.payment.gatewayOrderId ?? "Нет"],
                  ["Статус", result.payment.status],
                  ["Сумма", formatMoney(result.payment.amount, result.payment.currency)],
                  ["Создан", formatDateTime(result.payment.createdAt)],
                  ["Оплачен", result.payment.paidAt ? formatDateTime(result.payment.paidAt) : "Не подтверждено"],
                  [
                    "Выдан абонемент",
                    result.payment.membershipIssuedAt
                      ? formatDateTime(result.payment.membershipIssuedAt)
                      : "Не зафиксировано",
                  ],
                  ["Action code", result.payment.actionCode?.toString() ?? "Нет"],
                  ["Ответ шлюза", result.payment.actionCodeDescription ?? "Нет"],
                ]}
              />

              <DenseSection
                title="Тариф"
                rows={[
                  ["ID", result.plan.id],
                  ["Название", result.plan.title],
                  ["Подзаголовок", result.plan.subtitle ?? "Без подзаголовка"],
                  ["Описание", result.plan.description ?? "Без описания"],
                  ["Тип биллинга", result.plan.billingType ?? "Не задан"],
                  ["Срок", formatPlanDuration(result.plan.durationValue, result.plan.durationUnit)],
                ]}
              />

              <MetaSection
                title="Проверка"
                rows={[
                  ["Подпись", result.verification.isSignatureValid ? "Валидна" : "Ошибка"],
                  ["Версия", result.verification.version],
                  ["Сформирован", formatDateTime(result.verification.generatedAt)],
                ]}
              />

              <DenseSection
                title="Клиент"
                rows={[
                  ["ID", result.customer.id],
                  ["Имя", result.customer.name],
                  ["Email", result.customer.email],
                ]}
              />
            </section>
          </section>
        ) : (
          <section className={styles.scanMode}>
            <article className={styles.scannerCard}>
              <div className={styles.scannerHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Камера</h2>
                  <p className={styles.cardText}>Наведите камеру на QR-код из кабинета клиента.</p>
                </div>

                <button type="button" className={styles.refreshButton} onClick={() => void startScanner()}>
                  <RefreshCcw size={16} strokeWidth={2.2} />
                  Перезапустить
                </button>
              </div>

              <div className={styles.previewWrap}>
                <video ref={videoRef} className={styles.preview} muted playsInline />
                <div className={styles.scanFrame} />
              </div>

              <div className={styles.cameraState}>
                {cameraState === "loading" ? <Camera size={16} /> : null}
                {cameraState === "ready" || cameraState === "no_qr_found_yet" ? <ScanLine size={16} /> : null}
                {cameraState === "permission_blocked" ||
                cameraState === "unsupported_camera" ||
                cameraState === "decode_error" ? (
                  <CameraOff size={16} />
                ) : null}
                <span>{getCameraStateLabel(cameraState, isSubmitting)}</span>
              </div>

              {scanError ? <p className={styles.errorText}>{scanError}</p> : null}

              <div className={styles.fallbackArea}>
                <button
                  type="button"
                  className={styles.fallbackToggle}
                  onClick={() => setIsManualEntryVisible((value) => !value)}
                >
                  <Keyboard size={16} strokeWidth={2.2} />
                  {isManualEntryVisible ? "Скрыть ручной ввод" : "Ввести или вставить QR вручную"}
                </button>

                {isManualEntryVisible ? (
                  <form className={styles.manualForm} onSubmit={handleManualSubmit}>
                    <label className={styles.cardText} htmlFor="manual-qr-content">
                      Запасной сценарий на случай, если камера или доступ к ней недоступны.
                    </label>
                    <textarea
                      id="manual-qr-content"
                      className={styles.manualInput}
                      value={manualContent}
                      onChange={(event) => setManualContent(event.target.value)}
                      placeholder="Вставьте JSON-содержимое QR-кода"
                      rows={5}
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <div className={styles.manualActions}>
                      <button
                        type="submit"
                        className={styles.primaryButton}
                        disabled={isSubmitting || manualContent.trim().length === 0}
                      >
                        Проверить содержимое
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryGhostButton}
                        onClick={() => setManualContent("")}
                        disabled={isSubmitting}
                      >
                        Очистить
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            </article>

            <article className={styles.resultPlaceholder}>
              <div className={styles.resultHeader}>
                <h2 className={styles.cardTitle}>Результат проверки</h2>
                <p className={styles.cardText}>После чтения QR здесь появятся данные абонемента, оплаты и клиента.</p>
              </div>

              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>Ожидаем сканирование</p>
                <p className={styles.cardText}>
                  Сфокусируйте QR-код внутри рамки. После успешного чтения экран переключится на подробный результат.
                </p>
              </div>
            </article>
          </section>
        )}
      </section>
    </main>
  );
}

function DenseSection({
  title,
  rows,
  tone = "default",
}: {
  title: string;
  rows: Array<[string, string]>;
  tone?: "default" | "primary";
}) {
  return (
    <section className={tone === "primary" ? styles.primarySection : styles.dataSection}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.dataGrid}>
        {rows.map(([label, value]) => (
          <div key={`${title}-${label}`} className={styles.dataItem}>
            <span className={styles.infoLabel}>{label}</span>
            <span className={styles.infoValue}>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetaSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className={styles.metaSection}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.metaRows}>
        {rows.map(([label, value]) => (
          <div key={`${title}-${label}`} className={styles.metaItem}>
            <span className={styles.infoLabel}>{label}</span>
            <span className={styles.metaValue}>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function getCameraStateLabel(state: CameraState, isSubmitting: boolean) {
  if (isSubmitting) {
    return "Проверяем содержимое QR-кода.";
  }

  switch (state) {
    case "loading":
      return "Запускаем камеру.";
    case "ready":
      return "Камера активна. Наведите её на QR-код.";
    case "permission_blocked":
      return "Доступ к камере запрещён. Разрешите его в Safari и перезапустите сканер.";
    case "unsupported_camera":
      return "Камера недоступна. Проверьте HTTPS, наличие камеры и что страница открыта в обычной вкладке браузера.";
    case "no_qr_found_yet":
      return "Камера работает, но QR пока не найден. Поднесите код ближе и держите его в рамке.";
    case "decode_error":
      return "Камера открылась, но чтение завершилось ошибкой. Попробуйте перезапустить сканер.";
    default:
      return "Сканер готовится к запуску.";
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(amount: number, currency: string) {
  return `${new Intl.NumberFormat("ru-RU").format(amount)} ${currency === "RUB" ? "₽" : currency}`;
}

function formatPlanDuration(value: number | null, unit: string | null) {
  if (!value || !unit) {
    return "Не задан";
  }

  return `${value} ${unit.toLowerCase()}`;
}
