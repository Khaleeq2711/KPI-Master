export type Role = 'OWNER' | 'ADMIN' | 'USER';
export type DateFilter = 'today' | 'week' | 'month' | 'ytd' | 'custom';
export type PerformanceMetric = 'revenue' | 'calls' | 'appointments' | 'followUps' | 'noShows' | 'closedDeals';
export type VisibilityRole = 'OWNER' | 'ADMIN' | 'EVERYONE';
export type BillingStatus = 'ACTIVE' | 'GRACE_PERIOD' | 'LOCKED';
export type PaymentPlatform = 'STRIPE' | 'PAYPAL' | 'WHOP';

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  interval: 'month' | 'year' | 'one-time';
  features: string[];
  platform: PaymentPlatform;
  checkoutUrl: string;
  isPopular?: boolean;
}

export interface NotificationConfig {
  value: number;
  unit: 'minutes' | 'hours' | 'days';
  direction: 'before' | 'after';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  revenueGoal: number;
  status: 'active' | 'inactive';
  agencyId: string;
  password?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  lastLogin?: number;
  taskNotificationsEnabled?: boolean;
  notificationSoundEnabled?: boolean;
  notificationVibrationEnabled?: boolean;
  taskReminderOffset?: NotificationConfig;
  needsSetup?: boolean;
  failedLoginAttempts?: number;
  lockoutUntil?: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  agencyId: string;
  date: string;
  revenue: number;
  calls: number;
  appointments: number;
  followUps: number;
  noShows: number;
  closedDeals: number;
  notes?: string;
}

export interface Task {
  id: string;
  userId: string;
  agencyId: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  reminderSent?: boolean;
}

export interface AppSettings {
  accountName: string;
  logoUrl?: string;
  themeColor: string;
  quoteEnabled: boolean;
  quoteType: 'RANDOM' | 'CUSTOM_TEXT' | 'CSV' | 'OFF';
  customQuote?: string;
  customQuoteAuthor?: string;
  csvQuotes?: { text: string, author: string }[];
  defaultFilter: DateFilter;
  topPerformerMetric?: PerformanceMetric;
  defaultChartMetrics: string[]; 
  defaultUserGoal: number;
  companyRevenueGoal: number;
  defaultNotificationReminder: NotificationConfig;
  revenueVisibility: VisibilityRole;
  paymentsEnabled: boolean;
  billingStatus: BillingStatus;
  nextPaymentDue: number;
  subscriptionPrice: number;
  autoPay: boolean;
  subscriptionCancelled: boolean;
  factoryResetDate: number | null; 
  globalPricingEnabled: boolean;
  activePricingPlans: PricingPlan[];
  stripeIntegration?: { apiKey: string; webhookSecret: string; active: boolean };
  paypalIntegration?: { clientId: string; active: boolean };
  whopIntegration?: { apiKey: string; active: boolean };
}

export type AuditType = 'USER_MANAGEMENT' | 'STAT_CHANGE' | 'SETTINGS_UPDATE' | 'FOLDER_ACTION' | 'TASK_ACTION' | 'SYSTEM' | 'SECURITY';

export interface AuditEntry {
  id: string;
  action: string;
  performerName: string;
  performerId: string;
  timestamp: number;
  details: string;
  type: AuditType;
  restorableData?: any;
  metadata?: Record<string, any>;
}

export interface StatFolder {
  id: string;
  name: string;
  agencyId: string;
  createdAt: number;
}

export interface Report {
  id: string;
  name: string;
  userId: string | 'team';
  metrics: string[];
  dateRange: DateFilter;
  customDates?: { start: string, end: string };
  folderId?: string;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'task' | 'system' | 'log';
  targetTab?: string;
  relatedId?: string;
}

export interface DeletedItem {
  id: string;
  type: string;
  data: any;
  deletedAt: number;
}