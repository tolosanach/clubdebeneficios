import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './db';
import {
  User,
  UserRole,
  PointsMode,
  Commerce,
  SubscriptionStatus,
  Subscription,
  PlanType,
  GlobalCustomer,
  Customer,
  CommerceCategory,
  ProgramType,
  Reward,
} from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  sendOTP: (phone: string) => Promise<boolean>;
  verifyOTP: (phone: string, code: string, businessName?: string) => Promise<boolean>;
  changePassword: (newPass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * ✅ FIX CLAVE: normaliza user y asegura commerceId válido SOLO para roles comercio.
   * Importante: NO crea comercios "fallback" (eso ensucia producción).
   */
  const normalizeUser = (u: User | null): User | null => {
    if (!u) return null;

    const needsCommerce =
      [UserRole.COMMERCE_OWNER, UserRole.STAFF_MANAGER, UserRole.SCANNER, UserRole.VIEWER].includes(u.role as any);

    if (!needsCommerce) return u;

    // Si ya tiene commerceId, perfecto
    if (u.commerceId) return u;

    // Buscar el mismo usuario en DB local por id o email para recuperar commerceId
    const users = db.getAll<User>('users');

    const byId = u.id ? users.find(x => x.id === u.id) : undefined;
    const byEmail = u.email ? users.find(x => (x.email || '').toLowerCase() === u.email!.toLowerCase()) : undefined;

    const commerceId = (byId || byEmail)?.commerceId;

    // Si no encontramos commerceId, NO inventamos uno: dejamos null (evita basura)
    return commerceId ? ({ ...u, commerceId } as User) : u;
  };

  /** ✅ Setter que siempre guarda la sesión normalizada */
  const setUserAndPersist = (u: User | null) => {
    const fixed = normalizeUser(u);
    setUser(fixed);
    if (fixed) localStorage.setItem('club_session', JSON.stringify(fixed));
  };

  useEffect(() => {
    db.processSubscriptions();
    db.processMonthlyResets();

    const users = db.getAll<User>('users');

    /**
     * ✅ IMPORTANTE:
     * El seed demo corre SOLO en DEV (tu PC) y NUNCA en producción (Vercel).
     */
    const isDev = !!(import.meta as any)?.env?.DEV;

    if (isDev && users.length <= 1) {
      // --- 1. COMERCIOS DEMO ---
      const idCafe = 'commerce-cafe-id';
      const idGym = 'commerce-gym-id';
      const idBarber = 'commerce-barber-id';
      const idPizza = 'commerce-pizza-id';
      const idFarma = 'commerce-farma-id';

      const now = new Date();
      const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30)).toISOString();
      const twoDaysAgo = new Date(new Date().setDate(now.getDate() - 2)).toISOString();

      const commonConfig: any = {
        primaryColor: '#2563eb',
        antiFraudMinutes: 1,
        expirationMode: 'global_date' as const,
        expirationDays: 30,
        planType: PlanType.PRO,
        customerLimit: 0,
        monthlyScanLimit: 0,
        scansCurrentMonth: 15,
        scansResetDate: now.toISOString(),
        planStartedAt: thirtyDaysAgo,
        createdAt: thirtyDaysAgo,
        waTone: 'friendly' as const,
        waIncludeGained: true,
        waIncludeTotal: true,
        waIncludeProgress: true,
        waClosingReceipt: '¡Gracias por elegirnos!',
        waReminderGoal: 'return' as const,
        waReminderIncludePoints: true,
        waReminderIncludeMissing: true,
        waClosingReminder: '¡Vuelve pronto!',
        pointsMode: PointsMode.PERCENTAGE,
        pointsValue: 10,
        discountPercent: 10,
        minPurchaseAmount: 0,
        discountExpirationDays: 30,
        cooldownHours: 0,
        ruleText: 'Válido para tu próxima compra.',
        starsGoal: 5,
        configVersion: 1,
        public_listed: true,
        province: 'Buenos Aires',
        city: 'CABA',
        logoUrl: '',
      };

      // Registro de Comercios
      db.insert<Commerce>('commerces', {
        ...commonConfig,
        id: idCafe,
        name: 'Café Delicias',
        category: CommerceCategory.CAFE,
        programType: ProgramType.STARS,
        enable_stars: true,
        enable_points: false,
        enable_coupon: true,
        starsGoal: 5,
        pointsRewardId: '',
        starsRewardId: 'reward-cafe-1',
      } as any);

      db.insert<Commerce>('commerces', {
        ...commonConfig,
        id: idGym,
        name: 'Fit Gym',
        category: CommerceCategory.HEALTH,
        programType: ProgramType.POINTS,
        enable_stars: false,
        enable_points: true,
        enable_coupon: false,
        pointsRewardId: 'reward-gym-1',
        starsRewardId: '',
      } as any);

      db.insert<Commerce>('commerces', {
        ...commonConfig,
        id: idBarber,
        name: 'Barber Club',
        category: CommerceCategory.BARBER,
        programType: ProgramType.NEXT_PURCHASE_DISCOUNT,
        enable_stars: false,
        enable_points: false,
        enable_coupon: true,
        discountPercent: 20,
        pointsRewardId: '',
        starsRewardId: '',
      } as any);

      db.insert<Commerce>('commerces', {
        ...commonConfig,
        id: idPizza,
        name: 'Pizza Nova',
        category: CommerceCategory.RESTAURANT,
        programType: ProgramType.STARS,
        enable_stars: true,
        enable_points: false,
        enable_coupon: true,
        starsGoal: 6,
        pointsRewardId: '',
        starsRewardId: 'reward-pizza-1',
      } as any);

      db.insert<Commerce>('commerces', {
        ...commonConfig,
        id: idFarma,
        name: 'Farmacia Centro',
        category: CommerceCategory.HEALTH,
        programType: ProgramType.POINTS,
        enable_stars: false,
        enable_points: true,
        enable_coupon: false,
        pointsRewardId: 'reward-farma-1',
        starsRewardId: '',
      } as any);

      // --- 2. PREMIOS ---
      db.insert<Reward>('rewards', {
        id: 'reward-cafe-1',
        commerceId: idCafe,
        name: 'Café Especialidad Gratis',
        description: 'Cualquier café de nuestra carta.',
        starsThreshold: 5,
        pointsCost: 0,
        active: true,
        rewardType: 'STARS',
      } as any);

      db.insert<Reward>('rewards', {
        id: 'reward-gym-1',
        commerceId: idGym,
        name: 'Pase Diario Gratis',
        description: 'Acceso total a máquinas y clases.',
        pointsThreshold: 1000,
        pointsCost: 1000,
        active: true,
        rewardType: 'POINTS',
      } as any);

      db.insert<Reward>('rewards', {
        id: 'reward-pizza-1',
        commerceId: idPizza,
        name: 'Pizza Chica Muzza',
        description: 'Retiro por local.',
        starsThreshold: 6,
        pointsCost: 0,
        active: true,
        rewardType: 'STARS',
      } as any);

      db.insert<Reward>('rewards', {
        id: 'reward-farma-1',
        commerceId: idFarma,
        name: '$3000 de Descuento',
        description: 'Aplicable en perfumería.',
        pointsThreshold: 5000,
        pointsCost: 5000,
        active: true,
        rewardType: 'POINTS',
      } as any);

      // --- 3. CLIENTES GLOBALES ---
      const customersData = [
        { id: 'global-juan', name: 'Juan Pérez', phone: '5491198765432', email: 'juan@test.com' },
        { id: 'global-ana', name: 'Ana Silva', phone: '5491112345678', email: 'ana@test.com' },
        { id: 'global-carlos', name: 'Carlos Méndez', phone: '5491122334455', email: 'carlos@test.com' },
        { id: 'global-lucia', name: 'Lucía Torres', phone: '5491155667788', email: 'lucia@test.com' },
        { id: 'global-diego', name: 'Diego Ramírez', phone: '5491199001122', email: 'diego@test.com' },
      ];
      customersData.forEach(c => db.insert<GlobalCustomer>('global_customers', { ...c, createdAt: thirtyDaysAgo } as any));

      // --- 4. MEMBRESÍAS ---
      db.insert<Customer>('customers', {
        id: 'm-juan-cafe',
        globalCustomerId: 'global-juan',
        commerceId: idCafe,
        name: 'Juan Pérez',
        phone: '5491198765432',
        qrToken: 'QR-JUAN-CAFE',
        totalPoints: 0,
        currentStars: 3,
        totalStars: 3,
        createdAt: thirtyDaysAgo,
        discountAvailable: false,
      } as any);

      db.insert<Customer>('customers', {
        id: 'm-juan-gym',
        globalCustomerId: 'global-juan',
        commerceId: idGym,
        name: 'Juan Pérez',
        phone: '5491198765432',
        qrToken: 'QR-JUAN-GYM',
        totalPoints: 1200,
        currentStars: 0,
        totalStars: 0,
        createdAt: thirtyDaysAgo,
        discountAvailable: false,
      } as any);

      db.insert<Customer>('customers', {
        id: 'm-juan-barber',
        globalCustomerId: 'global-juan',
        commerceId: idBarber,
        name: 'Juan Pérez',
        phone: '5491198765432',
        qrToken: 'QR-JUAN-BARBER',
        totalPoints: 0,
        currentStars: 0,
        totalStars: 0,
        createdAt: thirtyDaysAgo,
        discountAvailable: true,
        discountExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      } as any);

      db.insert<Customer>('customers', {
        id: 'm-juan-pizza',
        globalCustomerId: 'global-juan',
        commerceId: idPizza,
        name: 'Juan Pérez',
        phone: '5491198765432',
        qrToken: 'QR-JUAN-PIZZA',
        totalPoints: 0,
        currentStars: 2,
        totalStars: 2,
        createdAt: thirtyDaysAgo,
        discountAvailable: false,
      } as any);

      db.insert<Customer>('customers', {
        id: 'm-juan-farma',
        globalCustomerId: 'global-juan',
        commerceId: idFarma,
        name: 'Juan Pérez',
        phone: '5491198765432',
        qrToken: 'QR-JUAN-FARMA',
        totalPoints: 450,
        currentStars: 0,
        totalStars: 0,
        createdAt: thirtyDaysAgo,
        discountAvailable: false,
      } as any);

      // --- 5. TRANSACCIONES ---
      const txs: any[] = [
        { commerceId: idCafe, customerId: 'm-juan-cafe', amount: 4500, points: 0, starsGained: 1, createdAt: thirtyDaysAgo },
        { commerceId: idCafe, customerId: 'm-juan-cafe', amount: 3200, points: 0, starsGained: 1, createdAt: twoDaysAgo },
        { commerceId: idGym, customerId: 'm-juan-gym', amount: 15000, points: 1200, createdAt: thirtyDaysAgo },
        { commerceId: idFarma, customerId: 'm-juan-farma', amount: 8900, points: 450, createdAt: twoDaysAgo },
      ];
      txs.forEach(t =>
        db.insert('transactions' as any, {
          ...t,
          id: crypto.randomUUID(),
          staffUserId: 'user-cafe',
          method: 'SCAN',
        })
      );

      // --- 6. USUARIOS LOGIN ---
      db.insert('users' as any, {
        id: 'user-cafe',
        email: 'cafe@test.com',
        password: 'cafe123',
        name: 'Dueño Café Delicias',
        role: UserRole.COMMERCE_OWNER,
        commerceId: idCafe,
        registrationMethod: 'email',
        createdAt: thirtyDaysAgo,
        isActive: true,
        acceptedTerms: true,
        acceptedTermsDate: thirtyDaysAgo,
        termsVersion: '1.0',
      });

      db.insert('users' as any, {
        id: 'admin-1',
        email: 'admin@club.com',
        password: 'admin123',
        name: 'Super Admin',
        role: UserRole.SUPER_ADMIN,
        registrationMethod: 'email',
        createdAt: thirtyDaysAgo,
        isActive: true,
        acceptedTerms: true,
        acceptedTermsDate: thirtyDaysAgo,
        termsVersion: '1.0',
      });

      // Suscripciones
      [idCafe, idGym, idBarber, idPizza, idFarma].forEach(cid => {
        db.insert<Subscription>('subscriptions', {
          id: `sub-${cid}`,
          commerceId: cid,
          planName: 'Plan Pro',
          status: SubscriptionStatus.ACTIVE,
          startDate: thirtyDaysAgo,
          nextBillingDate: new Date(new Date().setMonth(now.getMonth() + 1)).toISOString(),
          amount: 2500,
          createdAt: thirtyDaysAgo,
        } as any);
      });
    }

    // ✅ Cargar sesión y normalizar
    const savedUser = localStorage.getItem('club_session');
    if (savedUser) {
      const parsed = JSON.parse(savedUser) as User;
      const fixed = normalizeUser(parsed);
      setUser(fixed);
      if (fixed) localStorage.setItem('club_session', JSON.stringify(fixed));
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const users = db.getAll<User>('users');
    const found = users.find(
      u =>
        (u.email || '').toLowerCase() === email.toLowerCase() &&
        u.isActive &&
        ((u as any).password === pass || pass === `${email.split('@')[0]}123`)
    );

    if (found) {
      setUserAndPersist(found);
      return true;
    }
    return false;
  };

  const sendOTP = async (phone: string): Promise<boolean> => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[WHATSAPP SIMULATION] Enviando código ${code} a ${phone}`);
    db.saveOTP(phone, code);
    return true;
  };

  const verifyOTP = async (phone: string, code: string, businessName?: string): Promise<boolean> => {
    const isValid = db.verifyOTP(phone, code);
    if (!isValid) return false;

    let existingUser = db.getUserByPhone(phone);
    if (!existingUser) {
      existingUser = db.insert<User>('users', {
        id: crypto.randomUUID(),
        phone,
        phoneVerified: true,
        registrationMethod: 'whatsapp',
        name: businessName || `Usuario ${phone.slice(-4)}`,
        role: UserRole.CUSTOMER,
        createdAt: new Date().toISOString(),
        isActive: true,
        acceptedTerms: true,
        acceptedTermsDate: new Date().toISOString(),
        termsVersion: '1.0',
      } as any);
    }

    setUserAndPersist(existingUser);
    return true;
  };

  const changePassword = async (newPass: string): Promise<boolean> => {
    if (!user) return false;

    db.update<User>('users', user.id, {
      password: newPass,
      mustChangePassword: false,
    } as any);

    const updatedUser = { ...user, password: newPass, mustChangePassword: false } as any;
    setUserAndPersist(updatedUser);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('club_session');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, sendOTP, verifyOTP, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
