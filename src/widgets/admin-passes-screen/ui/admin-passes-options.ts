import type {
  PassBadge,
  PassFeature,
  PassFeatureIcon,
  PassPlan,
} from "@/shared/lib/contracts";

type SelectOption = {
  value: string;
  label: string;
};

export type PlanDraft = {
  title: string;
  slug: string;
  description: string;
  subtitle: string;
  price: string;
  currency: string;
  durationValue: string;
  durationUnit: string;
  visitCount: string;
  billingType: string;
  highlightStyle: string;
  sortOrder: string;
  isActive: boolean;
  badges: PassBadge[];
  features: PassFeature[];
};

export const DURATION_UNIT_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "Не задан" },
  { value: "DAY", label: "Дни" },
  { value: "WEEK", label: "Недели" },
  { value: "MONTH", label: "Месяцы" },
  { value: "YEAR", label: "Годы" },
];

export const BILLING_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "Не задан" },
  { value: "FIXED_TERM", label: "Фиксированный срок" },
  { value: "UNLIMITED", label: "Безлимит" },
  { value: "SINGLE_VISIT", label: "Разовое посещение" },
  { value: "VISIT_PACK", label: "Пакет посещений" },
];

export const HIGHLIGHT_STYLE_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "Обычный" },
  { value: "popular", label: "Популярный" },
];

export const BADGE_STYLE_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "Обычный" },
  { value: "featured", label: "Акцент сверху" },
  { value: "success", label: "Акцент снизу" },
];

export const FEATURE_ICON_OPTIONS: readonly SelectOption[] = [
  { value: "TICKET", label: "Билет" },
  { value: "FLAME", label: "Огонь" },
  { value: "SNOWFLAKE", label: "Снежинка" },
  { value: "CALENDAR", label: "Календарь" },
  { value: "GIFT", label: "Подарок" },
  { value: "DUMBBELL", label: "Гантель" },
  { value: "POOL", label: "Бассейн" },
  { value: "COMBO", label: "Комбо" },
];

export function createPlanDraft(plan?: PassPlan): PlanDraft {
  return {
    title: plan?.title ?? "",
    slug: plan?.slug ?? "",
    description: plan?.description ?? "",
    subtitle: plan?.subtitle ?? "",
    price: plan ? String(plan.price) : "",
    currency: plan?.currency ?? "RUB",
    durationValue: plan?.durationValue ? String(plan.durationValue) : "",
    durationUnit: plan?.durationUnit ?? "",
    visitCount: plan?.visitCount ? String(plan.visitCount) : "",
    billingType: plan?.billingType ?? "",
    highlightStyle: plan?.highlightStyle ?? "",
    sortOrder: plan ? String(plan.sortOrder) : "",
    isActive: plan?.isActive ?? true,
    badges: plan?.badges ?? [],
    features: plan?.features ?? [],
  };
}

export function formatCurrency(currency: string) {
  return currency === "RUB" ? "₽" : currency;
}

export function formatPlanPrice(price: number, currency: string) {
  return `${new Intl.NumberFormat("ru-RU").format(price)} ${formatCurrency(currency)}`;
}

export function formatBadgeStyle(style: string | null) {
  return findLabel(BADGE_STYLE_OPTIONS, style);
}

export function formatHighlightStyle(style: string | null) {
  return findLabel(HIGHLIGHT_STYLE_OPTIONS, style);
}

export function formatBillingType(billingType: string | null) {
  return findLabel(BILLING_TYPE_OPTIONS, billingType);
}

export function formatDurationUnit(durationUnit: string | null) {
  return findLabel(DURATION_UNIT_OPTIONS, durationUnit);
}

export function formatFeatureIcon(icon: string | null) {
  return findLabel(FEATURE_ICON_OPTIONS, icon);
}

export function getPreviewBadges(badges: PassBadge[]) {
  return {
    topBadges: badges.filter((badge) => badge.style !== "success"),
    footerBadge: badges.find((badge) => badge.style === "success") ?? null,
  };
}

export function findFeatureIconOption(icon: string | null): PassFeatureIcon {
  const match = FEATURE_ICON_OPTIONS.find((option) => option.value === icon);
  return (match?.value ?? "GIFT") as PassFeatureIcon;
}

function findLabel(options: readonly SelectOption[], value: string | null) {
  return options.find((option) => option.value === (value ?? ""))?.label ?? (value || "—");
}
