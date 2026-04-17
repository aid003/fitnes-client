"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Gift,
  Snowflake,
  Ticket,
  Waves,
  CalendarDays,
  Layers3,
} from "lucide-react";
import { useAuth } from "@/shared/auth/auth-context";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { apiFetch, ApiError } from "@/shared/lib/api";
import type {
  PassCategoryDetails,
  PassFeatureIcon,
  PassPlan,
  PaymentSessionResponse,
  PassVariant,
} from "@/shared/lib/contracts";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./passes-category-screen.module.css";

type PassesCategoryScreenProps = {
  slug: string;
};

export function PassesCategoryScreen({ slug }: PassesCategoryScreenProps) {
  const { refreshUser } = useAuth();
  const { canRender, isLoading, user } = useRequireAuth();
  const [category, setCategory] = useState<PassCategoryDetails | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [phoneModalPlanId, setPhoneModalPlanId] = useState<string | null>(null);
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSubmitError, setPhoneSubmitError] = useState<string | null>(null);
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false);
  const [canScrollTabs, setCanScrollTabs] = useState(false);
  const [isTabsAtEnd, setIsTabsAtEnd] = useState(false);
  const tabsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!canRender) {
      return;
    }

    let cancelled = false;

    void apiFetch<PassCategoryDetails>(`/passes/categories/${slug}`)
      .then((data) => {
        if (cancelled) {
          return;
        }

        setCategory(data);
        setSelectedVariantId(data.variants[0]?.id ?? null);
        setLoadError(null);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setCategory(null);
        setLoadError(
          loadError instanceof ApiError
            ? loadError.message
            : "Не удалось загрузить страницу абонемента",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsDataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canRender, slug]);

  const selectedVariant = useMemo(() => {
    if (!category) {
      return null;
    }

    return (
      category.variants.find((variant) => variant.id === selectedVariantId) ??
      category.variants[0] ??
      null
    );
  }, [category, selectedVariantId]);

  useEffect(() => {
    const element = tabsRef.current;

    if (!element) {
      return;
    }

    const updateTabsState = () => {
      const hasOverflow = element.scrollWidth - element.clientWidth > 8;
      const reachedEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 8;

      setCanScrollTabs(hasOverflow);
      setIsTabsAtEnd(!hasOverflow || reachedEnd);
    };

    updateTabsState();
    element.addEventListener("scroll", updateTabsState, { passive: true });
    window.addEventListener("resize", updateTabsState);

    return () => {
      element.removeEventListener("scroll", updateTabsState);
      window.removeEventListener("resize", updateTabsState);
    };
  }, [category]);

  const startPayment = async (planId: string) => {
    try {
      setPendingPlanId(planId);
      setPaymentError(null);
      setFeedback(null);

      const session = await apiFetch<PaymentSessionResponse>(`/payments/passes/${planId}`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      window.location.href = session.formUrl;
    } catch (paymentError) {
      setPaymentError(
        paymentError instanceof ApiError ? paymentError.message : "Не удалось перейти к оплате",
      );
    } finally {
      setPendingPlanId(null);
    }
  };

  const handlePlanSelect = async (planId: string) => {
    if (user?.phone) {
      await startPayment(planId);
      return;
    }

    setPhoneModalPlanId(planId);
    setPhoneValue(formatPhoneInput(user?.phone ?? ""));
    setPhoneError(null);
    setPhoneSubmitError(null);
  };

  const closePhoneModal = () => {
    if (isPhoneSubmitting) {
      return;
    }

    setPhoneModalPlanId(null);
    setPhoneError(null);
    setPhoneSubmitError(null);
  };

  const handlePhoneChange = (value: string) => {
    setPhoneValue(formatPhoneInput(value));
    setPhoneError(null);
    setPhoneSubmitError(null);
  };

  const handlePhoneSubmit = async () => {
    const normalizedPhone = normalizeRussianPhone(phoneValue);

    if (!normalizedPhone) {
      setPhoneError("Введите номер в формате +7 (999) 123-45-67");
      return;
    }

    if (!phoneModalPlanId) {
      return;
    }

    try {
      setIsPhoneSubmitting(true);
      setPhoneSubmitError(null);

      await apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          phone: normalizedPhone,
        }),
      });

      await refreshUser();

      setPhoneModalPlanId(null);
      setPhoneValue(formatPhoneInput(normalizedPhone));

      await startPayment(phoneModalPlanId);
    } catch (error) {
      setPhoneSubmitError(
        error instanceof ApiError ? error.message : "Не удалось сохранить номер телефона",
      );
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем активную сессию." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем на вход." />;
  }

  if (isDataLoading) {
    return <SessionStatus title="Загрузка" text="Загружаем детали абонемента." />;
  }

  if (loadError || !category) {
    return (
      <main className={styles.screen}>
        <section className={styles.panel}>
          <div className={styles.stateBlock}>
            <p className={styles.errorText}>{loadError ?? "Категория не найдена"}</p>
            <Link href="/passes" className={styles.backLink}>
              Вернуться к каталогу
            </Link>
          </div>
          <BottomNav activeItem="passes" />
        </section>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.hero}>
          <div className={styles.heroMedia}>
            <Image
              src="/new_logo.png"
              alt=""
              fill
              priority
              className={styles.heroImage}
              sizes="(max-width: 767px) 100vw, 430px"
              unoptimized
            />
          </div>
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <div className={styles.heroTop}>
              <Link href="/passes" className={styles.heroBack} aria-label="Назад к каталогу">
                <ChevronLeft size={26} strokeWidth={2.8} />
              </Link>
            </div>

            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>{category.title}</h1>
              {category.description ? (
                <p className={styles.heroSubtitle}>{category.description}</p>
              ) : null}
            </div>
          </div>
        </header>

        {category.variants.length > 0 ? (
          <div className={styles.tabsSection}>
            <section
              ref={tabsRef}
              className={[
                styles.tabs,
                canScrollTabs ? styles.tabsScrollable : "",
                canScrollTabs && !isTabsAtEnd ? styles.tabsWithHint : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label="Форматы абонемента"
            >
              {category.variants.map((variant) => {
                const Icon = getVariantIcon(variant);
                const isActive = variant.id === selectedVariant?.id;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    className={[styles.tab, isActive ? styles.tabActive : ""].filter(Boolean).join(" ")}
                    onClick={() => setSelectedVariantId(variant.id)}
                  >
                    <Icon className={styles.tabIcon} strokeWidth={2.2} />
                    <span className={styles.tabLabel}>{variant.title}</span>
                  </button>
                );
              })}
            </section>

            {canScrollTabs && !isTabsAtEnd ? (
              <div className={styles.tabsScrollHint} aria-hidden="true">
                <ChevronRight className={styles.tabsScrollIcon} strokeWidth={2.2} />
              </div>
            ) : null}
          </div>
        ) : null}

        <section className={styles.content}>
          {selectedVariant ? (
            <>
              <div className={styles.sectionHeading}>
                <h2 className={styles.variantTitle}>{selectedVariant.title}</h2>
                {selectedVariant.description ? (
                  <p className={styles.variantDescription}>{selectedVariant.description}</p>
                ) : null}
              </div>

              {selectedVariant.groups.length > 0 ? (
                selectedVariant.groups.map((group) => (
                  <section key={group.id} className={styles.groupSection}>
                    <h3 className={styles.groupTitle}>{group.title}</h3>
                    <div className={styles.planList}>
                      {group.plans.map((plan) => (
                        <PlanCard
                          key={plan.id}
                          plan={plan}
                          isPending={pendingPlanId === plan.id}
                          onSelect={() => handlePlanSelect(plan.id)}
                        />
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <p className={styles.emptyText}>Для этого формата пока нет доступных тарифов.</p>
              )}
            </>
          ) : (
            <p className={styles.emptyText}>Для этой категории пока нет активных форматов.</p>
          )}

          {paymentError ? <p className={styles.errorText}>{paymentError}</p> : null}
          {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
        </section>

        <BottomNav activeItem="passes" />
      </section>

      {phoneModalPlanId ? (
        <PhoneCaptureModal
          value={phoneValue}
          error={phoneError}
          submitError={phoneSubmitError}
          isSubmitting={isPhoneSubmitting}
          onChange={handlePhoneChange}
          onClose={closePhoneModal}
          onSubmit={() => void handlePhoneSubmit()}
        />
      ) : null}
    </main>
  );
}

function PlanCard({
  plan,
  isPending,
  onSelect,
}: {
  plan: PassPlan;
  isPending: boolean;
  onSelect: () => void | Promise<void>;
}) {
  const topBadges = plan.badges.filter((badge) => badge.style !== "success");
  const footerBadge = plan.badges.find((badge) => badge.style === "success");

  return (
    <article
      className={[
        styles.planCard,
        plan.highlightStyle === "popular" ? styles.planCardHighlighted : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {topBadges.length > 0 ? (
        <div className={styles.planBadgesTop}>
          {topBadges.map((badge) => (
            <span
              key={badge.id}
              className={[
                styles.badge,
                badge.style === "featured" ? styles.badgeFeatured : styles.badgeDefault,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className={styles.planMain}>
        <div className={styles.planCopy}>
          <h4 className={styles.planTitle}>{plan.title}</h4>
          {plan.description ? <p className={styles.planDescription}>{plan.description}</p> : null}

          {plan.features.length > 0 ? (
            <ul className={styles.featureList}>
              {plan.features.map((feature) => (
                <li key={feature.id} className={styles.featureItem}>
                  <FeatureIcon icon={feature.icon} className={styles.featureIcon} />
                  <span>{feature.label}</span>
                </li>
              ))}
            </ul>
          ) : plan.subtitle ? (
            <p className={styles.planSubtitle}>{plan.subtitle}</p>
          ) : null}
        </div>

        <div className={styles.planAside}>
          <div className={styles.planPrice}>{formatPlanPrice(plan.price, plan.currency)}</div>
          <button type="button" className={styles.planAction} onClick={onSelect} disabled={isPending}>
            {isPending ? "Переход..." : "Выбрать"}
          </button>
        </div>
      </div>

      {footerBadge ? (
        <div className={styles.planFooter}>
          <span className={[styles.badge, styles.badgeSuccess].join(" ")}>{footerBadge.label}</span>
        </div>
      ) : null}
    </article>
  );
}

function FeatureIcon({
  icon,
  className,
}: {
  icon: PassFeatureIcon;
  className?: string;
}) {
  const Icon = FEATURE_ICON_MAP[icon] ?? Gift;
  return <Icon className={className} aria-hidden="true" />;
}

function formatPlanPrice(price: number, currency: string) {
  return `${new Intl.NumberFormat("ru-RU").format(price)} ${currency === "RUB" ? "₽" : currency}`;
}

function getVariantIcon(variant: PassVariant) {
  const value = `${variant.slug} ${variant.title}`.toLowerCase();

  if (value.includes("вездеход") || value.includes("all-access")) {
    return Flame;
  }

  if (value.includes("басс") && value.includes("зал")) {
    return Layers3;
  }

  if (value.includes("басс") || value.includes("pool")) {
    return Waves;
  }

  if (value.includes("зал") || value.includes("gym")) {
    return Dumbbell;
  }

  return Layers3;
}

const FEATURE_ICON_MAP = {
  TICKET: Ticket,
  FLAME: Flame,
  SNOWFLAKE: Snowflake,
  CALENDAR: CalendarDays,
  GIFT: Gift,
  DUMBBELL: Dumbbell,
  POOL: Waves,
  COMBO: Layers3,
} as const;

function PhoneCaptureModal({
  value,
  error,
  submitError,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}: {
  value: string;
  error: string | null;
  submitError: string | null;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className={styles.modalOverlay} role="presentation" onClick={onClose}>
      <section
        className={styles.modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-capture-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalCopy}>
            <p className={styles.modalEyebrow}>Перед оплатой</p>
            <h2 id="phone-capture-title" className={styles.modalTitle}>
              Укажите номер телефона
            </h2>
            <p className={styles.modalSubtitle}>
              Номер нужен для оформления оплаты и сохранится в вашем профиле.
            </p>
          </div>

          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Закрыть"
            disabled={isSubmitting}
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <label className={styles.phoneLabel} htmlFor="phone-capture-input">
            Номер телефона
          </label>
          <input
            id="phone-capture-input"
            className={styles.phoneInput}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 (___) ___-__-__"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={isSubmitting}
          />

          {error ? <p className={styles.modalError}>{error}</p> : null}
          {submitError ? <p className={styles.modalError}>{submitError}</p> : null}

          <button
            type="button"
            className={styles.modalAction}
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Сохраняем..." : "Сохранить и продолжить"}
          </button>
        </div>
      </section>
    </div>
  );
}

function formatPhoneInput(value: string) {
  const digits = extractRussianPhoneDigits(value);

  if (digits.length === 0) {
    return "+7";
  }

  let formatted = "+7";

  if (digits.length > 1) {
    formatted += ` (${digits.slice(1, 4)}`;
  }

  if (digits.length >= 5) {
    formatted += `) ${digits.slice(4, 7)}`;
  }

  if (digits.length >= 8) {
    formatted += `-${digits.slice(7, 9)}`;
  }

  if (digits.length >= 10) {
    formatted += `-${digits.slice(9, 11)}`;
  }

  return formatted;
}

function normalizeRussianPhone(value: string) {
  const digits = extractRussianPhoneDigits(value);

  if (digits.length !== 11 || digits[0] !== "7") {
    return null;
  }

  return `+${digits}`;
}

function extractRussianPhoneDigits(value: string) {
  const digitsOnly = value.replace(/\D/g, "");

  if (digitsOnly.length === 0) {
    return "";
  }

  if (digitsOnly[0] === "8") {
    return `7${digitsOnly.slice(1, 11)}`;
  }

  if (digitsOnly[0] !== "7") {
    return `7${digitsOnly.slice(0, 10)}`;
  }

  return digitsOnly.slice(0, 11);
}
