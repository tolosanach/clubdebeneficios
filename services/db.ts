
import { User, Commerce, Customer, Transaction, Reward, UserRole, PointsMode, Subscription, Payment, SubscriptionStatus, ProgramType, PlanType, BillingInvoice, GlobalCustomer, CommerceCategory, WhatsAppReminderLog } from '../types';

export interface AdminNotification {
  id: string;
  commerceId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export type ReminderPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ReminderCandidate {
  customer: Customer;
  type: 'inactive' | 'near_reward' | 'coupon_expiring';
  reason: string;
  priority: ReminderPriority;
  lastVisitAt: string | null;
  progressText: string;
}

const INITIAL_DATA = {
  users: [
    { 
      id: 'admin-1', 
      email: 'admin@club.com', 
      name: 'Super Admin', 
      role: UserRole.SUPER_ADMIN, 
      registrationMethod: 'email', 
      createdAt: new Date().toISOString(),
      isActive: true,
      acceptedTerms: true,
      acceptedTermsDate: new Date().toISOString(),
      termsVersion: '1.0'
    }
  ] as User[],
  global_customers: [] as GlobalCustomer[],
  commerces: [] as Commerce[],
  customers: [] as Customer[],
  transactions: [] as Transaction[],
  rewards: [] as Reward[],
  subscriptions: [] as Subscription[],
  payments: [] as Payment[],
  billing_invoices: [] as BillingInvoice[],
  admin_notifications: [] as AdminNotification[],
  whatsapp_reminders_log: [] as WhatsAppReminderLog[],
  otps: [] as { phone: string, code: string, expiresAt: string }[]
};

class DatabaseService {
  private key = 'club_beneficios_db_v1';

  private getData() {
    const data = localStorage.getItem(this.key);
    return data ? JSON.parse(data) : INITIAL_DATA;
  }

  private saveData(data: any) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  getAll<T>(table: keyof typeof INITIAL_DATA): T[] {
    return this.getData()[table] || [];
  }

  getById<T extends { id: string }>(table: keyof typeof INITIAL_DATA, id: string): T | undefined {
    return this.getAll<T>(table).find(item => item.id === id);
  }

  insert<T>(table: keyof typeof INITIAL_DATA, item: T) {
    const data = this.getData();
    if (!data[table]) data[table] = [];
    data[table].push(item);
    this.saveData(data);
    return item;
  }

  update<T extends { id: string }>(table: keyof typeof INITIAL_DATA, id: string, updates: Partial<T>) {
    const data = this.getData();
    const index = data[table].findIndex((item: any) => item.id === id);
    if (index !== -1) {
      data[table][index] = { ...data[table][index], ...updates };
      this.saveData(data);
    }
  }

  delete(table: keyof typeof INITIAL_DATA, id: string) {
    const data = this.getData();
    data[table] = data[table].filter((item: any) => item.id !== id);
    this.saveData(data);
  }

  // --- Lógica de Analíticas ---

  getCommerceAnalytics(commerceId: string) {
    const customers = this.getCustomersByCommerce(commerceId);
    const transactions = this.getTransactionsByCommerce(commerceId);
    
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    let activeCount = 0;
    let inactiveCount = 0;

    customers.forEach(c => {
      const summary = this.getCustomerSummary(c.id);
      if (summary.lastVisitAt && new Date(summary.lastVisitAt) >= thirtyDaysAgo) {
        activeCount++;
      } else {
        inactiveCount++;
      }
    });

    const rewardsDelivered = transactions.filter(t => t.redeemedRewardId).length;
    
    const totalMembers = customers.length;
    const returnRate = totalMembers > 0 ? (activeCount / totalMembers) * 100 : 0;

    return {
      totalMembers,
      activeCount,
      inactiveCount,
      rewardsDelivered,
      returnRate
    };
  }

  // --- Lógica de Recordatorios WhatsApp ---

  getReminderCandidates(commerceId: string): ReminderCandidate[] {
    const customers = this.getCustomersByCommerce(commerceId);
    const commerce = this.getById<Commerce>('commerces', commerceId);
    const logs = this.getAll<WhatsAppReminderLog>('whatsapp_reminders_log')
      .filter(l => l.commerceId === commerceId);
    
    if (!commerce) return [];

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    return customers.map(c => {
      const summary = this.getCustomerSummary(c.id);
      const lastLog = logs
        .filter(l => l.customerId === c.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

      // No sugerir si se envió algo en los últimos 7 días
      if (lastLog && new Date(lastLog.createdAt) > sevenDaysAgo) return null;

      // 1. Cupón por vencer (en menos de 3 días) -> PRIORIDAD ALTA
      if (c.discountAvailable && c.discountExpiresAt) {
        const expiry = new Date(c.discountExpiresAt);
        const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (diffHours > 0 && diffHours < 72) {
          return { 
            customer: c, 
            type: 'coupon_expiring', 
            reason: 'Cupón por vencer', 
            priority: 'HIGH',
            lastVisitAt: summary.lastVisitAt,
            progressText: `${commerce.discountPercent}% OFF disponible`
          } as ReminderCandidate;
        }
      }

      // 2. Cerca de premio -> PRIORIDAD ALTA
      if (commerce.enable_points && commerce.pointsRewardId) {
        const reward = this.getById<Reward>('rewards', commerce.pointsRewardId);
        if (reward && c.totalPoints >= (reward.pointsThreshold || 0) * 0.9 && c.totalPoints < (reward.pointsThreshold || 0)) {
          return { 
            customer: c, 
            type: 'near_reward', 
            reason: 'A un paso del premio', 
            priority: 'HIGH',
            lastVisitAt: summary.lastVisitAt,
            progressText: `${c.totalPoints} / ${reward.pointsThreshold} pts`
          } as ReminderCandidate;
        }
      }
      if (commerce.enable_stars && c.currentStars === (commerce.starsGoal - 1) && commerce.starsGoal > 1) {
        return { 
          customer: c, 
          type: 'near_reward', 
          reason: 'A un sello del premio', 
          priority: 'HIGH',
          lastVisitAt: summary.lastVisitAt,
          progressText: `${c.currentStars} / ${commerce.starsGoal} sellos`
        } as ReminderCandidate;
      }

      // 3. Inactivos
      if (summary.lastVisitAt) {
        const lastVisit = new Date(summary.lastVisitAt);
        const diffDays = (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24);
        
        // Media prioridad: 15 a 30 días
        if (diffDays >= 15 && diffDays <= 30) {
          return { 
            customer: c, 
            type: 'inactive', 
            reason: 'Inactivo reciente', 
            priority: 'MEDIUM',
            lastVisitAt: summary.lastVisitAt,
            progressText: `Hace ${Math.floor(diffDays)} días`
          } as ReminderCandidate;
        }
        
        // Baja prioridad: > 30 días
        if (diffDays > 30) {
          return { 
            customer: c, 
            type: 'inactive', 
            reason: 'Inactivo (+30 días)', 
            priority: 'LOW',
            lastVisitAt: summary.lastVisitAt,
            progressText: `Hace ${Math.floor(diffDays)} días`
          } as ReminderCandidate;
        }
      }

      return null;
    }).filter((c): c is ReminderCandidate => c !== null);
  }

  getReminderStats(commerceId: string) {
    const logs = this.getAll<WhatsAppReminderLog>('whatsapp_reminders_log')
      .filter(l => l.commerceId === commerceId && l.status === 'sent');
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const sentThisMonth = logs.filter(l => {
      const d = new Date(l.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // Simulación de "clientes recuperados" (aquellos que volvieron después de un mensaje)
    // En una app real, cruzaríamos logs con transacciones posteriores.
    const recoveredThisMonth = Math.floor(sentThisMonth * 0.2); // Simulación 20% éxito

    return { sentThisMonth, recoveredThisMonth };
  }

  // --- Resto de métodos ---

  getActiveBenefitsCount(commerceId: string): number {
    const customers = this.getCustomersByCommerce(commerceId);
    const commerce = this.getById<Commerce>('commerces', commerceId);
    if (!commerce) return 0;

    const now = new Date();
    const activeCoupons = customers.filter(c => 
      c.discountAvailable && 
      (!c.discountExpiresAt || new Date(c.discountExpiresAt) > now)
    ).length;

    let pendingRewards = 0;
    if (commerce.enable_points && commerce.pointsRewardId) {
      const reward = this.getById<Reward>('rewards', commerce.pointsRewardId);
      if (reward) {
        pendingRewards += customers.filter(c => c.totalPoints >= (reward.pointsThreshold || 0)).length;
      }
    }

    if (commerce.enable_stars && commerce.starsRewardId) {
      pendingRewards += customers.filter(c => c.currentStars >= (commerce.starsGoal || 5)).length;
    }

    return activeCoupons + pendingRewards;
  }

  searchGlobalAndLocal(commerceId: string, query: string) {
    const q = query.toLowerCase();
    const globalCustomers = this.getAll<GlobalCustomer>('global_customers');
    const myMemberships = this.getAll<Customer>('customers').filter(c => c.commerceId === commerceId);
    
    const results = globalCustomers.filter(gc => 
      gc.name.toLowerCase().includes(q) || 
      gc.phone.includes(q)
    ).map(gc => {
      const membership = myMemberships.find(m => m.globalCustomerId === gc.id);
      return {
        global: gc,
        membership: membership || null,
        inThisCommerce: !!membership
      };
    });

    return results.sort((a, b) => {
      if (a.global.phone === query) return -1;
      if (b.global.phone === query) return 1;
      if (a.inThisCommerce && !b.inThisCommerce) return -1;
      if (!a.inThisCommerce && b.inThisCommerce) return 1;
      return 0;
    }).slice(0, 8);
  }

  lookupOrCreateMembership(commerceId: string, globalCustomerId: string, name: string, phone: string) {
    const existing = this.getAll<Customer>('customers').find(
      c => c.commerceId === commerceId && c.globalCustomerId === globalCustomerId
    );
    
    if (existing) return existing;

    const newMembership: Customer = {
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
      discountAvailable: false
    };

    this.insert('customers', newMembership);
    return newMembership;
  }

  createGlobalAndMembership(commerceId: string, name: string, phone: string) {
    let global = this.getAll<GlobalCustomer>('global_customers').find(gc => gc.phone === phone);
    
    if (!global) {
      global = {
        id: crypto.randomUUID(),
        name,
        phone,
        createdAt: new Date().toISOString()
      };
      this.insert('global_customers', global);
    }

    return this.lookupOrCreateMembership(commerceId, global.id, name, phone);
  }

  deleteCommerceCascade(commerceId: string) {
    const data = this.getData();
    data.commerces = data.commerces.filter((c: Commerce) => c.id !== commerceId);
    data.users = data.users.filter((u: User) => u.commerceId !== commerceId);
    data.customers = data.customers.filter((c: Customer) => c.commerceId !== commerceId);
    data.transactions = data.transactions.filter((t: Transaction) => t.commerceId !== commerceId);
    data.rewards = data.rewards.filter((r: Reward) => r.commerceId !== commerceId);
    data.subscriptions = data.subscriptions.filter((s: Subscription) => s.commerceId !== commerceId);
    data.payments = data.payments.filter((p: Payment) => p.commerceId !== commerceId);
    data.billing_invoices = data.billing_invoices.filter((i: BillingInvoice) => i.commerceId !== commerceId);
    data.admin_notifications = (data.admin_notifications || []).filter((n: AdminNotification) => n.commerceId !== commerceId);
    this.saveData(data);
  }

  sendAdminNotification(commerceId: string, title: string, message: string) {
    const notification: AdminNotification = {
      id: crypto.randomUUID(),
      commerceId,
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false
    };
    this.insert('admin_notifications', notification);
    return notification;
  }

  getNotificationsByCommerce(commerceId: string) {
    return (this.getAll<AdminNotification>('admin_notifications'))
      .filter(n => n.commerceId === commerceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  saveOTP(phone: string, code: string) {
    const data = this.getData();
    if (!data.otps) data.otps = [];
    data.otps = data.otps.filter((o: any) => o.phone !== phone);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    data.otps.push({ phone, code, expiresAt });
    this.saveData(data);
  }

  verifyOTP(phone: string, code: string): boolean {
    const data = this.getData();
    const otpIndex = data.otps?.findIndex((o: any) => o.phone === phone && o.code === code);
    if (otpIndex !== -1 && otpIndex !== undefined) {
      const otp = data.otps[otpIndex];
      if (new Date() < new Date(otp.expiresAt)) {
        data.otps.splice(otpIndex, 1);
        this.saveData(data);
        return true;
      }
    }
    return false;
  }

  getUserByPhone(phone: string): User | undefined {
    return this.getAll<User>('users').find(u => u.phone === phone);
  }

  getUserByEmail(email: string): User | undefined {
    return this.getAll<User>('users').find(u => u.email?.toLowerCase() === email.toLowerCase());
  }

  processMonthlyResets() {
    const data = this.getData();
    const commerces = data.commerces as Commerce[];
    const now = new Date();
    let hasChanges = false;
    commerces.forEach(c => {
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
    const commerce = this.getById<Commerce>('commerces', commerceId);
    if (!commerce) return { count: 0, limit: 0, isOverLimit: false, planType: PlanType.FREE, percentage: 0 };
    const isPro = commerce.planType === PlanType.PRO;
    const count = commerce.scansCurrentMonth || 0;
    const limit = isPro ? 0 : (commerce.monthlyScanLimit || 100);
    return {
      count,
      limit,
      isOverLimit: !isPro && count >= limit,
      percentage: isPro ? 0 : Math.min(100, (count / limit) * 100),
      planType: commerce.planType
    };
  }

  incrementScanCount(commerceId: string) {
    const commerce = this.getById<Commerce>('commerces', commerceId);
    if (commerce) {
      this.update<Commerce>('commerces', commerceId, {
        scansCurrentMonth: (commerce.scansCurrentMonth || 0) + 1
      });
    }
  }

  processSubscriptions() {
    const subs = this.getAll<Subscription>('subscriptions');
    const now = new Date();
    subs.forEach(sub => {
      const billingDate = new Date(sub.nextBillingDate);
      const diffMs = now.getTime() - billingDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      let newStatus = sub.status;
      if (diffDays > 7) newStatus = SubscriptionStatus.SUSPENDED;
      else if (diffDays > 3) newStatus = SubscriptionStatus.OVERDUE;
      else if (diffDays <= 0) newStatus = SubscriptionStatus.ACTIVE;
      if (newStatus !== sub.status) this.update<Subscription>('subscriptions', sub.id, { status: newStatus });
    });
  }

  registerPayment(commerceId: string, amount: number) {
    const sub = this.getAll<Subscription>('subscriptions').find(s => s.commerceId === commerceId);
    if (!sub) return;
    const payment: Payment = {
      id: crypto.randomUUID(),
      commerceId,
      subscriptionId: sub.id,
      amount,
      status: 'completed',
      paymentMethod: 'manual',
      paymentDate: new Date().toISOString()
    };
    this.insert('payments', payment);
    const currentBilling = new Date(sub.nextBillingDate);
    const baseDate = new Date() > currentBilling ? new Date() : currentBilling;
    const newBillingDate = new Date(baseDate);
    newBillingDate.setDate(baseDate.getDate() + 30);
    this.update<Subscription>('subscriptions', sub.id, {
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: newBillingDate.toISOString(),
      lastPaymentDate: payment.paymentDate
    });
  }

  getCustomersByCommerce(commerceId: string) {
    return this.getAll<Customer>('customers').filter(c => c.commerceId === commerceId);
  }

  getTransactionsByCommerce(commerceId: string) {
    return this.getAll<Transaction>('transactions').filter(t => t.customerId && t.commerceId === commerceId);
  }

  getRewardsByCommerce(commerceId: string) {
    return this.getAll<Reward>('rewards').filter(r => r.commerceId === commerceId && r.active);
  }

  getCustomerByToken(token: string) {
    return this.getAll<Customer>('customers').find(c => c.qrToken === token);
  }

  getSubscriptionByCommerce(commerceId: string) {
    return this.getAll<Subscription>('subscriptions').find(s => s.commerceId === commerceId);
  }

  getInactiveCustomers(commerceId: string, days: number) {
    const customers = this.getCustomersByCommerce(commerceId);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    return customers
      .map(c => ({ ...c, summary: this.getCustomerSummary(c.id) }))
      .filter(c => {
        if (!c.summary.lastVisitAt) return false;
        return new Date(c.summary.lastVisitAt) < threshold;
      });
  }

  getCustomerSummary(customerId: string) {
    const transactions = this.getAll<Transaction>('transactions').filter(t => t.customerId === customerId);
    const sortedTxs = [...transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      lastVisitAt: sortedTxs[0]?.createdAt || null,
      totalVisits: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      recentTransactions: sortedTxs.slice(0, 10)
    };
  }

  getTopCustomers(commerceId: string, by: 'visits' | 'amount' = 'visits') {
    const customers = this.getCustomersByCommerce(commerceId);
    return customers
      .map(c => ({ ...c, summary: this.getCustomerSummary(c.id) }))
      .sort((a, b) => by === 'visits' 
        ? b.summary.totalVisits - a.summary.totalVisits 
        : b.summary.totalAmount - a.summary.totalAmount
      )
      .slice(0, 10);
  }

  getInvoicesByCommerce(commerceId: string): BillingInvoice[] {
    return this.getAll<BillingInvoice>('billing_invoices').filter(i => i.commerceId === commerceId);
  }

  getStaffByCommerce(commerceId: string): User[] {
    return this.getAll<User>('users').filter(u => u.commerceId === commerceId && u.role !== UserRole.CUSTOMER);
  }

  activateProPlan(commerceId: string, invoiceId: string, mpPaymentId: string) {
    const data = this.getData();
    const invoiceIndex = data.billing_invoices.findIndex((i: any) => i.id === invoiceId);
    if (invoiceIndex !== -1) {
      data.billing_invoices[invoiceIndex].status = 'paid';
      data.billing_invoices[invoiceIndex].mpPaymentId = mpPaymentId;
      data.billing_invoices[invoiceIndex].paidAt = new Date().toISOString();
    }
    const commerceIndex = data.commerces.findIndex((c: any) => c.id === commerceId);
    if (commerceIndex !== -1) {
      data.commerces[commerceIndex].planType = PlanType.PRO;
      data.commerces[commerceIndex].monthlyScanLimit = 0;
      data.commerces[commerceIndex].planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    const subIndex = data.subscriptions.findIndex((s: any) => s.commerceId === commerceId);
    if (subIndex !== -1) {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      data.subscriptions[subIndex].status = SubscriptionStatus.ACTIVE;
      data.subscriptions[subIndex].nextBillingDate = nextDate.toISOString();
      data.subscriptions[subIndex].lastPaymentDate = new Date().toISOString();
    }
    this.saveData(data);
  }

  getPublicBusinesses(filters?: { province?: string; city?: string; category?: CommerceCategory }) {
    let list = this.getAll<Commerce>('commerces').filter(c => c.public_listed);
    
    if (filters) {
      if (filters.province) list = list.filter(c => c.province === filters.province);
      if (filters.city) list = list.filter(c => c.city === filters.city);
      if (filters.category) list = list.filter(c => c.category === filters.category);
    }
    
    return list;
  }

  getPublicProvinces(): string[] {
    const commerces = this.getAll<Commerce>('commerces').filter(c => c.public_listed && c.province);
    return Array.from(new Set(commerces.map(c => c.province!))).sort();
  }

  getPublicCities(province: string): string[] {
    const commerces = this.getAll<Commerce>('commerces').filter(c => c.public_listed && c.province === province && c.city);
    return Array.from(new Set(commerces.map(c => c.city!))).sort();
  }
}

export const db = new DatabaseService();
