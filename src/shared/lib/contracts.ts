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

export type MembershipStatus = "ACTIVE" | "FROZEN" | "EXPIRED";

export type MembershipFreezeStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type MembershipRenewalStatus = "PENDING" | "PROCESSED" | "CANCELLED";

export type MembershipTone = "success" | "warning" | "danger" | "muted";

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
  startsAt: string;
  status: MembershipStatus;
  statusLabel: string;
  statusTone: MembershipTone;
  expiresAt: string;
  daysLeft: number;
  freezeDaysLeft: number;
  features: UserMembershipFeature[];
  canFreeze: boolean;
  canRenew: boolean;
  scheduleAvailable: boolean;
  history: UserMembershipHistoryEntry[];
  pendingRenewal: boolean;
};

export type UserMembershipHistoryItem = {
  id: string;
  title: string;
  subtitle: string;
  startsAt: string;
  status: MembershipStatus;
  statusLabel: string;
  statusTone: MembershipTone;
  expiresAt: string;
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
  startsAt: string;
  endsAt: string;
  status: MembershipStatus;
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
