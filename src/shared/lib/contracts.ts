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
