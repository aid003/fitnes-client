export type UserRole = 'USER' | 'ADMIN' | 'COACH';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UploadedMedia = {
  url: string | null;
};

export type Trainer = {
  id: string;
  name: string;
  slug: string;
  role: string;
  shortBio: string | null;
  photoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminTrainer = Trainer;

export type NewsListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  lead: string | null;
  tags: string[];
  publishedAt: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewsDetails = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  lead: string | null;
  highlightsTitle: string | null;
  highlights: string[];
  contentRichText: string;
  tags: string[];
  publishedAt: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminNewsArticle = NewsDetails;

export type UploadImageResponse<TItem> = UploadedMedia & {
  item: TItem;
};

export type AdminAdBanner = {
  id: string;
  title: string;
  imageUrl: string | null;
  targetUrl: string;
  startsAt: string;
  endsAt: string;
  repeatIntervalDays: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ActiveAdBanner = {
  id: string;
  title: string;
  imageUrl: string | null;
  targetUrl: string;
  startsAt: string;
  endsAt: string;
  repeatIntervalDays: number;
};

export type DismissAdResponse = {
  success: true;
  dismissedAt: string;
};

export type PassCategoryListItem = {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type PassBadge = {
  id: string;
  label: string;
  style: string | null;
  sortOrder: number;
};

export type PassFeatureIcon =
  | "TICKET"
  | "FLAME"
  | "SNOWFLAKE"
  | "CALENDAR"
  | "GIFT"
  | "DUMBBELL"
  | "POOL"
  | "COMBO";

export type PassFeature = {
  id: string;
  label: string;
  icon: PassFeatureIcon;
  sortOrder: number;
};

export type PassPlan = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  subtitle: string | null;
  price: number;
  currency: string;
  durationValue: number | null;
  durationUnit: string | null;
  visitCount: number | null;
  billingType: string | null;
  highlightStyle: string | null;
  sortOrder: number;
  isActive: boolean;
  badges: PassBadge[];
  features: PassFeature[];
};

export type PassPlanGroup = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  plans: PassPlan[];
};

export type PassVariant = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  groups: PassPlanGroup[];
};

export type PassCategoryDetails = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  variants: PassVariant[];
};

export type MembershipStatus =
  | "PENDING_ACTIVATION"
  | "ACTIVE"
  | "FROZEN"
  | "EXPIRED"
  | "REFUNDED";

export type MembershipActivationStatus = "PENDING" | "ACTIVATED";
export type MembershipUsageMode = "TERM" | "VISIT";

export type MembershipFreezeStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type MembershipRenewalStatus = "PENDING" | "PROCESSED" | "CANCELLED";

export type MembershipTone = "success" | "warning" | "danger" | "muted";
export type PaymentTone = MembershipTone;

export type ScheduleWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type ScheduleDayTab = {
  date: string;
  weekday: ScheduleWeekday;
  shortLabel: string;
  label: string;
  dayNumber: number;
  monthLabel: string;
  isToday: boolean;
  isSunday: boolean;
  hasClasses: boolean;
};

export type ScheduleItem = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  ageBadge: string | null;
  secondaryBadge: string | null;
  sortOrder: number;
};

export type ScheduleDayResponse = {
  date: string;
  weekday: ScheduleWeekday;
  shortLabel: string;
  label: string;
  isSunday: boolean;
  isClosed: boolean;
  items: ScheduleItem[];
};

export type AdminScheduleTemplateSlot = {
  id: string;
  weekday: ScheduleWeekday;
  title: string;
  startTime: string;
  endTime: string;
  ageBadge: string | null;
  secondaryBadge: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminScheduleTemplateDay = {
  weekday: ScheduleWeekday;
  label: string;
  shortLabel: string;
  slots: AdminScheduleTemplateSlot[];
};

export type AdminScheduleWorkspace = {
  selectedDate: string;
  tabs: ScheduleDayTab[];
  templateDays: AdminScheduleTemplateDay[];
  resolvedDay: ScheduleDayResponse;
};

export type UserMembershipFeature = {
  id: string;
  label: string;
  icon: PassFeatureIcon;
};

export type UserMembershipHistoryEntry = {
  id: string;
  label: string;
  tone: "default" | "accent";
};

export type UserMembershipCard = {
  id: string;
  title: string;
  subtitle: string;
  planOrigin: string | null;
  issuedAt: string;
  activatedAt: string | null;
  startsAt: string | null;
  status: MembershipStatus;
  activationStatus: MembershipActivationStatus;
  statusLabel: string;
  statusTone: MembershipTone;
  billingType: string | null;
  usageMode: MembershipUsageMode;
  expiresAt: string | null;
  daysLeft: number | null;
  totalVisits: number | null;
  usedVisits: number;
  remainingVisits: number | null;
  freezeDaysLeft: number;
  features: UserMembershipFeature[];
  canFreeze: boolean;
  canUnfreeze: boolean;
  canRenew: boolean;
  canRequestRenewalNow: boolean;
  scheduleAvailable: boolean;
  hasQr: boolean;
  history: UserMembershipHistoryEntry[];
};

export type UserMembershipHistoryItem = {
  id: string;
  title: string;
  subtitle: string;
  planOrigin: string | null;
  issuedAt: string;
  activatedAt: string | null;
  startsAt: string | null;
  status: MembershipStatus;
  activationStatus: MembershipActivationStatus;
  statusLabel: string;
  statusTone: MembershipTone;
  billingType: string | null;
  usageMode: MembershipUsageMode;
  expiresAt: string | null;
  totalVisits: number | null;
  usedVisits: number;
  remainingVisits: number | null;
  hasQr: boolean;
  history: UserMembershipHistoryEntry[];
  features: UserMembershipFeature[];
};

export type MyMembershipsResponse = {
  activeMemberships: UserMembershipCard[];
  completedMemberships: UserMembershipHistoryItem[];
};

export type FreezeMembershipPayload = {
  days?: number;
};

export type RenewMembershipPayload = {
  comment?: string;
};

export type AdminMembershipFreeze = {
  id: string;
  startsAt: string;
  endsAt: string;
  daysUsed: number;
  status: MembershipFreezeStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminMembershipRenewalRequest = {
  id: string;
  comment: string | null;
  status: MembershipRenewalStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminMembership = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  issuedAt: string;
  activatedAt: string | null;
  startsAt: string;
  endsAt: string;
  status: MembershipStatus;
  activationStatus: MembershipActivationStatus;
  billingType: string | null;
  usageMode: MembershipUsageMode;
  totalVisits: number | null;
  usedVisits: number;
  remainingVisits: number | null;
  freezeDaysLimit: number;
  freezeDaysUsed: number;
  canRenew: boolean;
  sortOrder: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  passPlan: {
    id: string;
    title: string;
    subtitle: string | null;
  };
  freezes: AdminMembershipFreeze[];
  renewalRequests: AdminMembershipRenewalRequest[];
};

export type PaymentOrderStatus =
  | "CREATED"
  | "FORM_REGISTERED"
  | "REDIRECT_READY"
  | "REDIRECTED"
  | "PROCESSING"
  | "PAID"
  | "REFUNDED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export type PaymentSessionResponse = {
  paymentId: string;
  formUrl: string;
  expiresAt: string;
};

export type PaymentStatusResponse = {
  paymentId: string;
  status: PaymentOrderStatus;
  statusLabel: string;
  statusTone: PaymentTone;
  message: string;
  amount: number;
  currency: string;
  planTitle: string;
  planSubtitle: string | null;
  planCategoryTitle: string | null;
  planVariantTitle: string | null;
  planGroupTitle: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  failedAt: string | null;
  formUrl: string | null;
  actionCode: number | null;
  actionCodeDescription: string | null;
  membershipId: string | null;
  membershipIssuedAt: string | null;
  gatewayStatus: string | null;
  gatewayProvider: "ALFA" | "TBANK";
  gatewayPaymentId: string | null;
  refundedAmount: number;
  refundedAt: string | null;
  canRetry: boolean;
  isFinal: boolean;
};

export type PaymentResultViewModel = PaymentStatusResponse;

export type AdminPaymentsMetricComparison = {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number | null;
};

export type AdminPaymentsOverview = {
  range: "30d";
  rangeLabel: string;
  generatedAt: string;
  totals: {
    grossRevenue: number;
    successfulPaymentsCount: number;
    averageCheck: number;
    createdOrdersCount: number;
    paidConversionRate: number;
  };
  comparisons: {
    grossRevenue: AdminPaymentsMetricComparison;
    successfulPaymentsCount: AdminPaymentsMetricComparison;
    averageCheck: AdminPaymentsMetricComparison;
    paidConversionRate: AdminPaymentsMetricComparison;
  };
  revenueSeries: Array<{
    date: string;
    value: number;
  }>;
  paymentsSeries: Array<{
    date: string;
    value: number;
  }>;
  weeklyComparison: {
    currentWeek: {
      grossRevenue: number;
      successfulPaymentsCount: number;
    };
    previousWeek: {
      grossRevenue: number;
      successfulPaymentsCount: number;
    };
  };
  topPlans: {
    byRevenue: Array<{
      planId: string;
      title: string;
      subtitle: string | null;
      categoryTitle: string | null;
      value: number;
    }>;
    byCount: Array<{
      planId: string;
      title: string;
      subtitle: string | null;
      categoryTitle: string | null;
      value: number;
    }>;
  };
};

export type AdminPaymentLedgerItem = {
  paymentId: string;
  merchantOrderNumber: string;
  paidAt: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  gatewayProvider: "ALFA" | "TBANK";
  gatewayPaymentId: string | null;
  gatewayStatus: string | null;
  refundedAmount: number;
  canRefund: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
  plan: {
    id: string;
    title: string;
    subtitle: string | null;
    categoryTitle: string | null;
    variantTitle: string | null;
    groupTitle: string | null;
  };
  membershipId: string | null;
  membershipIssuedAt: string | null;
};

export type AdminPaymentsLedgerPage = {
  range: "30d";
  items: AdminPaymentLedgerItem[];
  nextCursor: string | null;
};

export type AdminPaymentEvent = {
  id: string;
  type: string;
  gatewayStatus: string | null;
  success: boolean | null;
  errorCode: string | null;
  message: string | null;
  payload: unknown;
  createdAt: string;
};

export type AdminPaymentDetails = PaymentStatusResponse & {
  gatewayOrderId: string | null;
  gatewayErrorCode: string | null;
  gatewayMessage: string | null;
  gatewayDetails: string | null;
  notificationTokenValid: boolean | null;
  lastNotificationAt: string | null;
  receiptPayload: unknown;
  canRefund: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
  plan: {
    id: string;
    title: string;
    subtitle: string | null;
    categoryTitle: string | null;
    variantTitle: string | null;
    groupTitle: string | null;
  };
  events: AdminPaymentEvent[];
};

export type MembershipQrViewModel = {
  membershipId: string;
  qrCodeSvg: string;
  generatedAt: string;
  payloadSummary: {
    customerName: string;
    customerEmail: string;
    planOrigin: string | null;
    planTitle: string;
    planSubtitle: string | null;
    amount: number;
    currency: string;
    paidAt: string | null;
    merchantOrderNumber: string;
    expiresAt: string | null;
    membershipStateLabel: string;
  };
};

export type AdminScannedMembershipQrViewModel = {
  customer: {
    id: string;
    name: string;
    email: string;
  };
  membership: {
    id: string;
    title: string;
    subtitle: string | null;
    status: MembershipStatus;
    activationStatus: MembershipActivationStatus;
    issuedAt: string;
    activatedAt: string | null;
    startsAt: string | null;
    endsAt: string | null;
    freezeDaysLimit: number;
    billingType: string | null;
    totalVisits: number | null;
    usedVisits: number;
    remainingVisits: number | null;
  };
  plan: {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    categoryTitle: string | null;
    variantTitle: string | null;
    groupTitle: string | null;
    billingType: string | null;
    durationValue: number | null;
    durationUnit: string | null;
    visitCount: number | null;
  };
  payment: {
    paymentId: string;
    merchantOrderNumber: string;
    gatewayOrderId: string | null;
    status: PaymentOrderStatus;
    amount: number;
    currency: string;
    createdAt: string;
    paidAt: string | null;
    membershipIssuedAt: string | null;
    actionCode: number | null;
    actionCodeDescription: string | null;
  };
  verification: {
    isSignatureValid: boolean;
    version: string;
    generatedAt: string;
  };
  activationPerformed: boolean;
  visitConsumed: boolean;
  remainingVisits: number | null;
  membershipStateLabel: string;
};
