// src/services/db.ts
import {
  User,
  Commerce,
  Customer,
  Transaction,
  Reward,
  UserRole,
  Subscription,
  Payment,
  SubscriptionStatus,
  PlanType,
  BillingInvoice,
  GlobalCustomer,
  CommerceCategory,
  WhatsAppReminderLog,
} from "../types";

/** Tipos locales del servicio */
export interface AdminNotification {
  id: string;
  commerceId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export type ReminderPriority = "HIGH" | "MEDIUM" | "LOW";

export interface ReminderCandidate {
  customer: Customer;
  type: "inactive" | "near_reward" | "coupon_expiring";
  reason: string;
  priority: ReminderPriority;
  lastVisitAt: string | null;
  progressText: string;
}

/**
 * ✅ Mapa de tablas -> tipo de fila
 * Base tipada de toda la DB en localStorage.
 */
type TableRowMap = {
  users: User;
  global_customers: GlobalCustomer;
  commerces: Commerce;
  customers: Customer;
  transactions: Transaction;
  rewards: Reward;
  subscriptions: Subscription;
  payments: Payment;
  billing_invoices: BillingInvoice;
  admin_notifications: AdminNotification;
  whatsapp_reminders_log: WhatsAppReminderLog;
  otps: { phone: string; code: string; expiresAt: string };
};

type TableName = keyof TableRowMap;

type DBShape = {
  [K in TableName]: TableRowMap[K][];
};

const INITIAL_DATA: DBShape = {
  users: [
    {
      id: "admin-1",
      email: "admin@club.com",
      name: "Super Admin",
      role: UserRole.SUPER_ADMIN,
      registrationMethod: "email",
      createdAt: new Date().toISOString(),
      isActive: true,
      acceptedTerms: true,
      acceptedTermsDate: new Date().toISOString(),
      termsVersion: "1.0",
    } as User,
  ],
  global_customers: [],
  commerces: [],
  customers: [],
  transactions: [],
  rewards: [],
  subscriptions: [],
  payments: [],
  billing_invoices: [],
  admin_notifications: [],
  whatsapp_reminders_log: [],
  otps: [],
};

class DatabaseService {
  private key = "club_beneficios_db_v1";

  /** Lee y normaliza la DB desde localStorage */
  private getData(): DBShape {
    const raw = localStorage.getItem(this.key);
    if (!raw) return INITIAL_DATA;

    try {
      const parsed = JSON.parse(raw) as Partial<DBShape> | null;

      // Normalización: asegurar que existan todas las keys y sean arrays
      const safe: DBShape = { ...INITIAL_DATA };

      (Object.keys(INITIAL_DATA) as TableName[]).forEach((k) => {
        const v = (parsed as any)?.[k];
        (safe as any)[k] = Array.isArray(v) ? v : (INITIAL_DATA as any)[k];
      });

      return safe;
    } catch {
      return INITIAL_DATA;
    }
  }

  private saveData(data: DBShape) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  // ==========================================================
  // ✅ CRUD TIPADO + COMPATIBILIDAD CON LLAMADAS VIEJAS <T>
  // ==========================================================

  /** Nuevo estilo: db.getAll("commerces") -> Commerce[] */
  getAll<K extends TableName>(table: K): TableRowMap[K][];
  /** Estilo viejo: db.getAll<Commerce>("commerces") -> Commerce[] */
  getAll<T>(table: TableName): T[];
  getAll(table: TableName) {
    return this.getData()[table] || [];
  }

  /** Nuevo estilo: db.getById("commerces", id) -> Commerce | undefined */
  getById<K extends TableName>(table: K, id: string): TableRowMap[K] | undefined;
  /** Estilo viejo: db.getById<Commerce>("commerces", id) -> Commerce | undefined */
  getById<T extends { id: string }>(table: TableName, id: string): T | undefined;
  getById(table: TableName, id: string) {
    return (this.getAll<any>(table) as any[]).find((item) => item?.id === id);
  }

  insert<K extends TableName>(table: K, item: TableRowMap[K]): TableRowMap[K];
  insert<T>(table: TableName, item: T): T;
  insert(table: TableName, item: any) {
    const data = this.getData() as any;
    data[table].push(item);
    this.saveData(data);
    return item;
  }

  update<K extends TableName>(table: K, id: string, updates: Partial<TableRowMap[K]>): void;
  update<T extends { id: string }>(table: TableName, id: string, updates: Partial<T>): void;
  update(table: TableName, id: string, updates: any) {
    const data = this.getData() as any;
    const index = (data[table] as any[]).findIndex((item) => item?.id === id);
    if (index !== -1) {
      data[table][index] = { ...data[table][index], ...updates };
      this.saveData(data);
    }
  }

  delete<K extends TableName>(table: K, id: string): void;
  delete(table: TableName, id: string): void;
  delete(table: TableName, id: string) {
    const data = this.getData() as any;
    data[table] = (data[table] as any[]).filter((item) => item?.id !== id);
    this.saveData(data);
  }

  // ==========================================================
  // --- Lógica de Analíticas ---
  // ==========================================================

  getCommerceAnalytics(commerceId: string) {
    const customers = this.getCustomersByCommerce(commerceId);
    const transactions = this.getTransactionsByCommerce(commerceId);

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    let activeCount = 0;
    let inactiveCount = 0;

    customers.forEach((c) => {
      const summary = this.getCustomerSummary(c.id);
      if (summary.lastVisitAt && new Date(summary.lastVisitAt) >= thirtyDaysAgo) {
        activeCount++;
      } else {
        inactiveCount++;
      }
    });

    const rewardsDelivered = transactions.filter((t) => !!(t as any).redeemedRewardId).length;

    const totalMembers = customers.length;
    const returnRate = totalMembers > 0 ? (activeCount / totalMembers) * 100 : 0;

    return {
      totalMembers,
      activeCount,
      inactiveCount,
      rewardsDelivered,
      returnRate,
    };
  }

  // ==========================================================
  // --- Lógica de Recordatorios WhatsApp ---
  // ==========================================================

  getReminderCandidates(commerceId: string): ReminderCandidate[] {
    const customers = this.getCustomersByCommerce(commerceId);
    const commerce = this.getById("commerces", commerceId) as Commerce | undefined;

    const logs = (this.getAll("whatsapp_reminders_log") as WhatsAppReminderLog[]).filter(
      (l) => (l as any).commerceId === commerceId
    );

    if (!commerce) return [];

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    return customers
      .map((c) => {
        const summary = this.getCustomerSummary(c.id);
        const lastLog = logs
          .filter((l) => (l as any).customerId === c.id)
          .sort((a, b) => (b as any).createdAt.localeCompare((a as any).createdAt))[0];

        // No sugerir si se envió algo en los últimos 7 días
        if (lastLog && new Date((lastLog as any).createdAt) > sevenDaysAgo) return null;

        // 1) Cupón por vencer
        if ((c as any).discountAvailable && (c as any).discountExpiresAt) {
          const expiry = new Date((c as any).discountExpiresAt);
          const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (diffHours > 0 && diffHours < 72) {
            return {
              customer: c,
              type: "coupon_expiring",
              reason: "Cupón por vencer",
              priority: "HIGH",
              lastVisitAt: summary.lastVisitAt,
              progressText: `${(commerce as any).discountPercent ?? 0}% OFF disponible`,
            } as ReminderCandidate;
          }
        }

        // 2) Cerca de premio (puntos)
        if ((commerce as any).enable_points && (commerce as any).pointsRewardId) {
          const reward = this.getById("rewards", (commerce as any).pointsRewardId) as Reward | undefined;
          const pts = (c as any).totalPoints ?? 0;
          const th = (reward as any)?.pointsThreshold ?? 0;

          if (reward && th > 0 && pts >= th * 0.9 && pts < th) {
            return {
              customer: c,
              type: "near_reward",
              reason: "A un paso del premio",
              priority: "HIGH",
              lastVisitAt: summary.lastVisitAt,
              progressText: `${pts} / ${th} pts`,
            } as ReminderCandidate;
          }
        }

        // 2b) Cerca de premio (estrellas)
        if ((commerce as any).enable_stars) {
          const current = (c as any).currentStars ?? 0;
          const goal = (commerce as any).starsGoal ?? 0;

          if (goal > 1 && current === goal - 1) {
            return {
              customer: c,
              type: "near_reward",
              reason: "A un sello del premio",
              priority: "HIGH",
              lastVisitAt: summary.lastVisitAt,
              progressText: `${current} / ${goal} sellos`,
            } as ReminderCandidate;
          }
        }

        // 3) Inactivos
        if (summary.lastVisitAt) {
          const lastVisit = new Date(summary.lastVisitAt);
          const diffDays = (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24);

          if (diffDays >= 15 && diffDays <= 30) {
            return {
              customer: c,
              type: "inactive",
              reason: "Inactivo reciente",
              priority: "MEDIUM",
              lastVisitAt: summary.lastVisitAt,
              progressText: `Hace ${Math.floor(diffDays)} días`,
            } as ReminderCandidate;
          }

          if (diffDays > 30) {
            return {
              customer: c,
              type: "inactive",
              reason: "Inactivo (+30 días)",
              priority: "LOW",
              lastVisitAt: summary.lastVisitAt,
              progressText: `Hace ${Math.floor(diffDays)} días`,
            } as ReminderCandidate;
          }
        }

        return null;
      })
      .filter((x): x is ReminderCandidate => x !== null);
  }

  getReminderStats(commerceId: string) {
    const logs = (this.getAll("whatsapp_reminders_log") as any[]).filter(
      (l) => l.commerceId === commerceId && l.status === "sent"
    );

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const sentThisMonth = logs.filter((l) => {
      const d = new Date(l.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const recoveredThisMonth = Math.floor(sentThisMonth * 0.2);

    return { sentThisMonth, recoveredThisMonth };
  }

  // ==========================================================
  // --- Resto de métodos ---
  // ==========================================================

  getActiveBenefitsCount(commerceId: string): number {
    const customers = this.getCustomersByCommerce(commerceId);
    const commerce = this.getById("commerces", commerceId) as Commerce | undefined;
    if (!commerce) return 0;

    const now = new Date();

    const activeCoupons = customers.filter((c) => {
      const available = (c as any).discountAvailable;
      const exp = (c as any).discountExpiresAt;
      return available && (!exp || new Date(exp) > now);
    }).length;

    let pendingRewards = 0;

    if ((commerce as any).enable_points && (commerce as any).pointsRewardId) {
      const reward = this.getById("rewards", (commerce as any).pointsRewardId) as Reward | undefined;
      const th = (reward as any)?.pointsThreshold ?? 0;

      if (reward && th > 0) {
        pendingRewards += customers.filter((c) => ((c as any).totalPoints ?? 0) >= th).length;
      }
    }

    if ((commerce as any).enable_stars && (commerce as any).starsRewardId) {
      const goal = (commerce as any).starsGoal ?? 5;
      pendingRewards += customers.filter((c) => ((c as any).currentStars ?? 0) >= goal).length;
    }

    return activeCoupons + pendingRewards;
  }

  searchGlobalAndLocal(commerceId: string, query: string) {
    const q = query.toLowerCase();
    const globalCustomers = this.getAll("global_customers") as GlobalCustomer[];
    const myMemberships = (this.getAll("customers") as Customer[]).filter((c: any) => c.commerceId === commerceId);

    const results = globalCustomers
      .filter((gc: any) => (gc.name || "").toLowerCase().includes(q) || (gc.phone || "").includes(q))
      .map((gc: any) => {
        const membership = myMemberships.find((m: any) => m.globalCustomerId === gc.id);
        return {
          global: gc,
          membership: membership || null,
          inThisCommerce: !!membership,
        };
      });

    return results
      .sort((a, b) => {
        if ((a.global as any).phone === query) return -1;
        if ((b.global as any).phone === query) return 1;
        if (a.inThisCommerce && !b.inThisCommerce) return -1;
        if (!a.inThisCommerce && b.inThisCommerce) return 1;
        return 0;
      })
      .slice(0, 8);
  }

  lookupOrCreateMembership(commerceId: string, globalCustomerId: string, name: string, phone: string) {
    const existing = (this.getAll("customers") as any[]).find(
      (c) => c.commerceId === commerceId && c.globalCustomerId === globalCustomerId
    );
    if (existing) return existing;

    const newMembership: any = {
      id: crypto.randomUUID(),
      globalCustomerId,
      commerceId,
      name,
      phone,
      qrToken: `TOKEN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      totalPoints: 0,
      currentStars: 0,
      totalStars: 0,
      createdAt: new Date().toISOString(),
      discountAvailable: false,
    };

    this.insert("customers", newMembership);
    return newMembership;
  }

  createGlobalAndMembership(commerceId: string, name: string, phone: string) {
    let global = (this.getAll("global_customers") as any[]).find((gc) => gc.phone === phone);

    if (!global) {
      global = {
        id: crypto.randomUUID(),
        name,
        phone,
        createdAt: new Date().toISOString(),
      };
      this.insert("global_customers", global);
    }

    return this.lookupOrCreateMembership(commerceId, global.id, name, phone);
  }

  deleteCommerceCascade(commerceId: string) {
    const data = this.getData();

    data.commerces = data.commerces.filter((c: any) => c.id !== commerceId);
    data.users = data.users.filter((u: any) => u.commerceId !== commerceId);
    data.customers = data.customers.filter((c: any) => c.commerceId !== commerceId);
    data.transactions = data.transactions.filter((t: any) => t.commerceId !== commerceId);
    data.rewards = data.rewards.filter((r: any) => r.commerceId !== commerceId);
    data.subscriptions = data.subscriptions.filter((s: any) => s.commerceId !== commerceId);
    data.payments = data.payments.filter((p: any) => p.commerceId !== commerceId);
    data.billing_invoices = data.billing_invoices.filter((i: any) => i.commerceId !== commerceId);
    data.admin_notifications = data.admin_notifications.filter((n: any) => n.commerceId !== commerceId);

    this.saveData(data);
  }

  sendAdminNotification(commerceId: string, title: string, message: string) {
    const notification: AdminNotification = {
      id: crypto.randomUUID(),
      commerceId,
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this.insert("admin_notifications", notification);
    return notification;
  }

  getNotificationsByCommerce(commerceId: string) {
    return (this.getAll("admin_notifications") as AdminNotification[])
      .filter((n) => n.commerceId === commerceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  saveOTP(phone: string, code: string) {
    const data = this.getData();
    data.otps = data.otps.filter((o: any) => o.phone !== phone);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    data.otps.push({ phone, code, expiresAt });
    this.saveData(data);
  }

  verifyOTP(phone: string, code: string): boolean {
    const data = this.getData();
    const idx = data.otps.findIndex((o: any) => o.phone === phone && o.code === code);
    if (idx !== -1) {
      const otp = data.otps[idx];
      if (new Date() < new Date(otp.expiresAt)) {
        data.otps.splice(idx, 1);
        this.saveData(data);
        return true;
      }
    }
    return false;
  }

  getUserByPhone(phone: string): User | undefined {
    return (this.getAll("users") as User[]).find((u: any) => u.phone === phone);
  }

  getUserByEmail(email: string): User | undefined {
    return (this.getAll("users") as User[]).find(
      (u: any) => ((u.email || "") as string).toLowerCase() === email.toLowerCase()
    );
  }

  processMonthlyResets() {
    const data = this.getData();
    const now = new Date();
    let hasChanges = false;

    data.commerces.forEach((c: any) => {
      const resetDate = new Date(c.scansResetDate || now.toISOString());
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        c.scansCurrentMonth = 0;
        c.scansResetDate = now.toISOString();
        hasChanges = true;
      }
    });

    if (hasChanges) this.saveData(data);
  }

  getCommerceUsage(commerceId: string) {
    const commerce = this.getById("commerces", commerceId) as any;
    if (!commerce) return { count: 0, limit: 0, isOverLimit: false, planType: PlanType.FREE, percentage: 0 };

    const isPro = commerce.planType === PlanType.PRO;
    const count = commerce.scansCurrentMonth || 0;
    const limit = isPro ? 0 : commerce.monthlyScanLimit || 100;

    return {
      count,
      limit,
      isOverLimit: !isPro && count >= limit,
      percentage: isPro ? 0 : Math.min(100, (count / limit) * 100),
      planType: commerce.planType,
    };
  }

  incrementScanCount(commerceId: string) {
    const commerce: any = this.getById("commerces", commerceId);
    if (commerce) {
      this.update("commerces", commerceId, {
        scansCurrentMonth: (commerce.scansCurrentMonth || 0) + 1,
      });
    }
  }

  processSubscriptions() {
    const subs = this.getAll("subscriptions") as any[];
    const now = new Date();

    subs.forEach((sub) => {
      const billingDate = new Date(sub.nextBillingDate);
      const diffMs = now.getTime() - billingDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let newStatus = sub.status;
      if (diffDays > 7) newStatus = SubscriptionStatus.SUSPENDED;
      else if (diffDays > 3) newStatus = SubscriptionStatus.OVERDUE;
      else if (diffDays <= 0) newStatus = SubscriptionStatus.ACTIVE;

      if (newStatus !== sub.status) this.update("subscriptions", sub.id, { status: newStatus });
    });
  }

  registerPayment(commerceId: string, amount: number) {
    const sub = (this.getAll("subscriptions") as any[]).find((s) => s.commerceId === commerceId);
    if (!sub) return;

    const payment: any = {
      id: crypto.randomUUID(),
      commerceId,
      subscriptionId: sub.id,
      amount,
      status: "completed",
      paymentMethod: "manual",
      paymentDate: new Date().toISOString(),
    };

    this.insert("payments", payment);

    const currentBilling = new Date(sub.nextBillingDate);
    const baseDate = new Date() > currentBilling ? new Date() : currentBilling;
    const newBillingDate = new Date(baseDate);
    newBillingDate.setDate(baseDate.getDate() + 30);

    this.update("subscriptions", sub.id, {
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: newBillingDate.toISOString(),
      lastPaymentDate: payment.paymentDate,
    });
  }

  getCustomersByCommerce(commerceId: string) {
    return (this.getAll("customers") as Customer[]).filter((c: any) => c.commerceId === commerceId);
  }

  getTransactionsByCommerce(commerceId: string) {
    return (this.getAll("transactions") as Transaction[]).filter((t: any) => t.commerceId === commerceId);
  }

  /** Devuelve premios activos, tolerando camel o snake */
  getRewardsByCommerce(commerceId: string) {
    return (this.getAll("rewards") as any[]).filter((r) => {
      const isActive = typeof r.is_active === "boolean" ? r.is_active : r.active;
      return r.commerceId === commerceId && !!isActive;
    }) as Reward[];
  }

  getCustomerByToken(token: string) {
    return (this.getAll("customers") as Customer[]).find((c: any) => c.qrToken === token);
  }

  getSubscriptionByCommerce(commerceId: string) {
    return (this.getAll("subscriptions") as Subscription[]).find((s: any) => s.commerceId === commerceId) || null;
  }

  getInactiveCustomers(commerceId: string, days: number) {
    const customers = this.getCustomersByCommerce(commerceId);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);

    return customers
      .map((c: any) => ({ ...c, summary: this.getCustomerSummary(c.id) }))
      .filter((c: any) => {
        if (!c.summary.lastVisitAt) return false;
        return new Date(c.summary.lastVisitAt) < threshold;
      });
  }

  getCustomerSummary(customerId: string) {
    const transactions = (this.getAll("transactions") as any[]).filter((t) => t.customerId === customerId);
    const sortedTxs = [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      lastVisitAt: sortedTxs[0]?.createdAt || null,
      totalVisits: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      recentTransactions: sortedTxs.slice(0, 10),
    };
  }

  getTopCustomers(commerceId: string, by: "visits" | "amount" = "visits") {
    const customers = this.getCustomersByCommerce(commerceId);

    return customers
      .map((c: any) => ({ ...c, summary: this.getCustomerSummary(c.id) }))
      .sort((a: any, b: any) =>
        by === "visits" ? b.summary.totalVisits - a.summary.totalVisits : b.summary.totalAmount - a.summary.totalAmount
      )
      .slice(0, 10);
  }

  getInvoicesByCommerce(commerceId: string): BillingInvoice[] {
    return (this.getAll("billing_invoices") as BillingInvoice[]).filter((i: any) => i.commerceId === commerceId);
  }

  getStaffByCommerce(commerceId: string): User[] {
    return (this.getAll("users") as User[]).filter((u: any) => u.commerceId === commerceId && u.role !== UserRole.CUSTOMER);
  }

  activateProPlan(commerceId: string, invoiceId: string, mpPaymentId: string) {
    const data = this.getData();

    const invoiceIndex = data.billing_invoices.findIndex((i: any) => i.id === invoiceId);
    if (invoiceIndex !== -1) {
      (data.billing_invoices as any)[invoiceIndex].status = "paid";
      (data.billing_invoices as any)[invoiceIndex].mpPaymentId = mpPaymentId;
      (data.billing_invoices as any)[invoiceIndex].paidAt = new Date().toISOString();
    }

    const commerceIndex = data.commerces.findIndex((c: any) => c.id === commerceId);
    if (commerceIndex !== -1) {
      (data.commerces as any)[commerceIndex].planType = PlanType.PRO;
      (data.commerces as any)[commerceIndex].monthlyScanLimit = 0;
      (data.commerces as any)[commerceIndex].planExpiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    const subIndex = data.subscriptions.findIndex((s: any) => s.commerceId === commerceId);
    if (subIndex !== -1) {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      (data.subscriptions as any)[subIndex].status = SubscriptionStatus.ACTIVE;
      (data.subscriptions as any)[subIndex].nextBillingDate = nextDate.toISOString();
      (data.subscriptions as any)[subIndex].lastPaymentDate = new Date().toISOString();
    }

    this.saveData(data);
  }

  getPublicBusinesses(filters?: { province?: string; city?: string; category?: CommerceCategory }) {
    let list = (this.getAll("commerces") as any[]).filter((c) => c.public_listed);

    if (filters) {
      if (filters.province) list = list.filter((c) => c.province === filters.province);
      if (filters.city) list = list.filter((c) => c.city === filters.city);
      if (filters.category) list = list.filter((c) => c.category === filters.category);
    }

    return list;
  }

  getPublicProvinces(): string[] {
    const commerces = (this.getAll("commerces") as any[]).filter((c) => c.public_listed && c.province);
    return Array.from(new Set(commerces.map((c) => c.province))).sort();
  }

  getPublicCities(province: string): string[] {
    const commerces = (this.getAll("commerces") as any[]).filter(
      (c) => c.public_listed && c.province === province && c.city
    );
    return Array.from(new Set(commerces.map((c) => c.city))).sort();
  }
}

export const db = new DatabaseService();
