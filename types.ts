
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMMERCE_OWNER = 'COMMERCE_OWNER',
  STAFF_MANAGER = 'STAFF_MANAGER',
  SCANNER = 'SCANNER',
  VIEWER = 'VIEWER',
  CUSTOMER = 'CUSTOMER'
}

export enum PointsMode {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  PER_AMOUNT = 'PER_AMOUNT'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  OVERDUE = 'overdue',
  SUSPENDED = 'suspended'
}

export enum PlanType {
  FREE = 'FREE',
  PRO = 'PRO'
}

export enum ProgramType {
  POINTS = 'POINTS',
  STARS = 'STARS',
  NEXT_PURCHASE_DISCOUNT = 'NEXT_PURCHASE_DISCOUNT'
}

export enum CommerceCategory {
  CAFE = 'Cafetería',
  RESTAURANT = 'Restaurante',
  FASHION = 'Indumentaria',
  BARBER = 'Barbería/Estética',
  HARDWARE = 'Ferretería/Hogar',
  HEALTH = 'Salud/Bienestar',
  SERVICES = 'Servicios',
  OTHER = 'Otros'
}

export type RegistrationMethod = 'whatsapp' | 'google' | 'email';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  password?: string;
  countryCode?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  registrationMethod: RegistrationMethod;
  name: string;
  role: UserRole;
  commerceId?: string;
  createdAt: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  acceptedTerms: boolean;
  acceptedTermsDate: string;
  termsVersion: string;
}

export interface GlobalCustomer {
  id: string;
  name: string;
  phone: string; 
  email?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  globalCustomerId?: string;
  commerceId: string;
  name: string;
  phone: string;
  phoneNumber?: string;
  countryCode?: string;
  email?: string;
  qrToken: string;
  totalPoints: number;
  currentStars: number;
  totalStars: number;
  createdAt: string;
  discountAvailable: boolean;
  discountExpiresAt?: string;
  lastDiscountUsedAt?: string;
  issuedDiscountPercent?: number;
  issuedConfigVersion?: number;
}

export interface WhatsAppReminderLog {
  id: string;
  commerceId: string;
  customerId: string;
  reminderType: 'inactive' | 'near_reward' | 'coupon_expiring';
  messageText: string;
  status: 'opened' | 'sent' | 'skipped';
  createdAt: string;
  staffUserId: string;
}

export interface BillingInvoice {
  id: string;
  commerceId: string;
  period: string; 
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  mpPreferenceId?: string;
  mpPaymentId?: string;
  createdAt: string;
  paidAt?: string;
}

export interface Subscription {
  id: string;
  commerceId: string;
  planName: string;
  status: SubscriptionStatus;
  startDate: string;
  nextBillingDate: string;
  lastPaymentDate?: string;
  amount: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  commerceId: string;
  subscriptionId: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: string;
  paymentDate: string;
}

export interface Commerce {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor: string;
  programType: ProgramType;
  configVersion: number;
  enable_points: boolean;
  enable_stars: boolean;
  enable_coupon: boolean;
  pointsRewardId?: string;
  starsRewardId?: string;
  starsRewardDescription?: string;
  pointsMode: PointsMode;
  pointsValue: number; 
  antiFraudMinutes: number;
  expirationMode?: 'global_date' | 'per_qr';
  expirationDays?: number;
  expirationDate?: string;
  discountPercent: number;
  minPurchaseAmount: number;
  discountExpirationDays: number;
  cooldownHours: number;
  ruleText: string;
  starsGoal: number;
  planType: PlanType;
  customerLimit: number; 
  monthlyScanLimit: number;
  scansCurrentMonth: number;
  scansResetDate: string;
  planStartedAt: string;
  planExpiresAt?: string;
  public_listed?: boolean;
  province?: string;
  city?: string;
  category?: CommerceCategory;
  address?: string;
  maps_url?: string;
  public_phone?: string;
  createdAt: string;
  waTone: 'formal' | 'friendly' | 'short';
  waIncludeGained: boolean;
  waIncludeTotal: boolean;
  waIncludeProgress: boolean;
  waClosingReceipt: string;
  waReminderGoal: 'return' | 'reward';
  waReminderIncludePoints: boolean;
  waReminderIncludeMissing: boolean;
  waClosingReminder: string;
}

export interface Transaction {
  id: string;
  commerceId: string;
  customerId: string;
  staffUserId: string;
  amount: number;
  points: number;
  starsGained?: number;
  couponGenerated?: boolean;
  discountApplied?: number;
  redeemedRewardId?: string;
  method: 'SCAN' | 'MANUAL';
  createdAt: string;
  points_mode_used?: PointsMode;
  points_value_used?: number;
  config_version_used?: number;
}

export interface Reward {
  id: string;
  commerceId: string;
  name: string;
  description: string;
  pointsThreshold?: number;
  starsThreshold?: number;
  pointsCost: number;
  active: boolean;
  rewardType: 'POINTS' | 'STARS';
}
