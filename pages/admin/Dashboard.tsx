import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard,
  Bell,
  X,
  Building2,
  Activity,
  Trash2,
  ShieldAlert,
  Loader2,
  Search,
  Plus,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';

import { db } from '../../services/db';
import { Commerce, PlanType, UserRole, Subscription, SubscriptionStatus, ProgramType, User, PointsMode } from '../../types';

const INITIAL_FORM_STATE = {
  name: '',
  pointsMode: PointsMode.PERCENTAGE,
  pointsValue: 10,
  price: 0,
  planType: PlanType.FREE,
  monthlyScanLimit: 100,
};

type HealthStatus = 'active' | 'low' | 'inactive';

/** =========
 * SUPABASE REST HELPERS (simple)
 * ========= */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en Vercel/Local env.');
  }
}

async function supabaseSelect(table: string, select = '*', orderBy?: string) {
  assertSupabaseEnv();
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('select', select);
  if (orderBy) url.searchParams.set('order', orderBy);

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || JSON.stringify(data));
  return data;
}

/** =========
 * MAPPERS: Supabase (snake_case) -> App (camelCase)
 * Ajusta acá si tu tabla tiene otros nombres.
 * ========= */
function mapRowToCommerce(r: any): Commerce {
  return {
    id: r.id,
    name: r.name,
    logoUrl: r.logo_url ?? '',
    // flags/config
    enable_points: r.enable_points ?? false,
    enable_stars: r.enable_stars ?? false,
    enable_coupon: r.enable_coupon ?? false,
    pointsMode: (r.points_mode as any) ?? PointsMode.FIXED,
    pointsValue: r.points_value ?? 0,
    discountPercent: r.discount_percent ?? 0,
    discountExpirationDays: r.discount_expiration_days ?? 30,
    starsGoal: r.stars_goal ?? 10,

    // opcionales (si existen en tu type)
    primaryColor: r.primary_color ?? '#2563eb',
    antiFraudMinutes: r.anti_fraud_minutes ?? 1,
    expirationMode: r.expiration_mode ?? 'global_date',
    expirationDays: r.expiration_days ?? 30,
    planType: (r.plan_type as any) ?? PlanType.FREE,
    customerLimit: r.customer_limit ?? 0,
    monthlyScanLimit: r.monthly_scan_limit ?? 100,
    scansCurrentMonth: r.scans_current_month ?? 0,
    scansResetDate: r.scans_reset_date ?? new Date().toISOString(),
    planStartedAt: r.plan_started_at ?? new Date().toISOString(),
    createdAt: r.created_at ?? new Date().toISOString(),
    programType: (r.program_type as any) ?? ProgramType.POINTS,
    configVersion: r.config_version ?? 1,
    public_listed: r.public_listed ?? false,

    // whatsapp defaults
    waTone: r.wa_tone ?? 'friendly',
    waIncludeGained: r.wa_include_gained ?? true,
    waIncludeTotal: r.wa_include_total ?? true,
    waIncludeProgress: r.wa_include_progress ?? true,
    waClosingReceipt: r.wa_closing_receipt ?? '¡Gracias por tu compra!',
    waReminderGoal: r.wa_reminder_goal ?? 'return',
    waReminderIncludePoints: r.wa_reminder_include_points ?? true,
    waReminderIncludeMissing: r.wa_reminder_include_missing ?? true,
    waClosingReminder: r.wa_closing_reminder ?? '¡Te esperamos pronto!',

    // campos que tu app usa a veces
    minPurchaseAmount: r.min_purchase_amount ?? 0,
    cooldownHours: r.cooldown_hours ?? 0,
    ruleText: r.rule_text ?? '',
  } as any;
}

function mapRowToSubscription(r: any): Subscription {
  return {
    id: r.id,
    commerceId: r.commerce_id,
    planName: r.plan_name ?? 'Plan',
    status: r.status ?? SubscriptionStatus.ACTIVE,
    startDate: r.start_date ?? new Date().toISOString(),
    nextBillingDate: r.next_billing_date ?? new Date().toISOString(),
    amount: r.amount ?? 0,
    createdAt: r.created_at ?? new Date().toISOString(),
  } as any;
}

/** =========
 * UI components
 * ========= */
const HealthBadgeCompact: React.FC<{ commerceId: string }> = ({ commerceId }) => {
  // OJO: esto sigue leyendo transacciones del db local.
  // Si querés 100% Supabase, después lo migramos a select('transactions').
  const transactions = useMemo(() => db.getTransactionsByCommerce(commerceId), [commerceId]);
  const lastTx = useMemo(() => [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0], [transactions]);

  const status = useMemo(() => {
    if (!lastTx) return 'inactive' as HealthStatus;
    const lastDate = new Date(lastTx.createdAt);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) return 'inactive';
    if (diffDays > 14 || (transactions.length < 3 && diffDays > 7)) return 'low';
    return 'active';
  }, [lastTx, transactions]);

  const colors = {
    active: 'bg-emerald-500',
    low: 'bg-amber-500',
    inactive: 'bg-rose-500',
  };

  const labels = {
    active: 'Activo',
    low: 'Baja',
    inactive: 'Inactivo',
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${colors[status]}`} />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{labels[status]}</span>
    </div>
  );
};

const SuperAdminDashboard: React.FC = () => {
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'commerces' | 'billing'>('commerces');
  const [filterText, setFilterText] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Notification State (todavía local db)
  const [notifCommerce, setNotifCommerce] = useState<Commerce | null>(null);
  const [notifData, setNotifData] = useState({ title: '', message: '' });
  const [sendingNotif, setSendingNotif] = useState(false);

  // Delete State (todavía local db)
  const [deleteCommerce, setDeleteCommerce] = useState<Commerce | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [newCommerce, setNewCommerce] = useState(INITIAL_FORM_STATE);

  const closeAndReset = useCallback(() => {
    setShowModal(false);
    setNewCommerce(INITIAL_FORM_STATE);
  }, []);

  /** ✅ Ahora refresca desde Supabase (no local) */
  const refreshData = useCallback(async () => {
    try {
      const rows = await supabaseSelect('commerces', '*', 'created_at.desc');
      setCommerces((rows || []).map(mapRowToCommerce));

      // si no tenés tabla subscriptions o tiene otras columnas, no rompe: lo capturamos
      try {
        const subRows = await supabaseSelect('subscriptions', '*', 'created_at.desc');
        setSubscriptions((subRows || []).map(mapRowToSubscription));
      } catch {
        setSubscriptions([]);
      }
    } catch (e: any) {
      console.error('refreshData failed:', e?.message || e);
      alert(`No pude leer Supabase. Revisá env vars o permisos.\n\n${e?.message || e}`);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const filteredCommerces = useMemo(() => {
    return commerces.filter((c) => (c.name || '').toLowerCase().includes(filterText.toLowerCase()));
  }, [commerces, filterText]);

  /** ✅ Crear comercio llamando a tu API privada (serverless) */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommerce.name) return;

    setIsCreating(true);

    try {
      const finalScanLimit = newCommerce.planType === PlanType.PRO ? 0 : newCommerce.monthlyScanLimit;

      // payload mínimo coherente con tu tabla (snake_case)
      const payload = {
        id: `commerce-${crypto.randomUUID().slice(0, 8)}`,
        name: newCommerce.name,
        logo_url: null,

        enable_points: true,
        enable_stars: false,
        enable_coupon: true,

        points_mode: newCommerce.pointsMode,
        points_value: newCommerce.pointsValue,

        discount_percent: 10,
        discount_expiration_days: 30,
        stars_goal: 5,

        plan_type: newCommerce.planType,
        monthly_scan_limit: finalScanLimit,
        scans_current_month: 0,
        scans_reset_date: new Date().toISOString(),
        plan_started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),

        program_type: ProgramType.POINTS,
        config_version: 1,
        public_listed: false,

        // opcional
        primary_color: '#2563eb',
        anti_fraud_minutes: 5,
        expiration_mode: 'global_date',
        expiration_days: 30,
      };

      const res = await fetch('/api/admin/create-commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.details || data?.error || 'Error creando comercio');
      }

      await refreshData();
      alert('Comercio creado correctamente (Supabase)');
      closeAndReset();
    } catch (err: any) {
      console.error(err);
      alert(`Error al crear el comercio.\n\n${err?.message || err}`);
    } finally {
      setIsCreating(false);
    }
  };

  /** ⚠️ Delete / Notif siguen en db local (lo migramos después a API si querés) */
  const handleDeleteCommerce = async () => {
    if (!deleteCommerce) return;
    setIsDeleting(true);
    await new Promise((r) => setTimeout(r, 500));
    db.deleteCommerceCascade(deleteCommerce.id);
    setIsDeleting(false);
    setDeleteCommerce(null);
    // refresco supabase igualmente
    await refreshData();
  };

  const handleSendNotification = async () => {
    if (!notifCommerce || !notifData.title || !notifData.message) return;
    setSendingNotif(true);
    await new Promise((r) => setTimeout(r, 500));
    db.sendAdminNotification(notifCommerce.id, notifData.title, notifData.message);
    setSendingNotif(false);
    setNotifCommerce(null);
    setNotifData({ title: '', message: '' });
    alert('Notificación enviada con éxito');
  };

  const handleRegisterPayment = (commerceId: string, amount: number) => {
    if (confirm(`¿Confirmar pago de $${amount}?`)) {
      db.registerPayment(commerceId, amount);
      refreshData();
    }
  };

  const stats = [
    { label: 'Negocios', value: commerces.length, icon: Building2, color: 'text-slate-900' },
    { label: 'Movimientos', value: db.getAll('transactions').length, icon: Activity, color: 'text-slate-400' },
    {
      label: 'Ingresos Est.',
      value: `$${subscriptions
        .filter((s) => s.status !== 'suspended')
        .reduce((acc, s) => acc + (s.amount || 0), 0)
        .toLocaleString()}`,
      icon: CreditCard,
      color: 'text-emerald-500',
    },
    { label: 'En Mora', value: subscriptions.filter((s) => s.status !== 'active').length, icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-black">Admin Panel</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión Centralizada</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-black/10"
        >
          <Plus size={16} /> Nuevo Comercio
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <stat.icon size={12} className={stat.color} /> {stat.label}
            </p>
            <p className="text-xl font-black text-black leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('commerces')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'commerces' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Negocios
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'billing' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Facturación
          </button>
        </div>

        {activeTab === 'commerces' && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input
              type="text"
              placeholder="Buscar negocio..."
              className="pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-black transition-all w-full sm:w-64"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        )}
      </div>

      {activeTab === 'commerces' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
          <div className="divide-y divide-slate-50">
            {filteredCommerces.map((c) => {
              const usage = db.getCommerceUsage(c.id);
              return (
                <div key={c.id} className="group flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4 flex-1 min-w-0" onClick={() => console.log('Open detail for', c.name)}>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs shrink-0 group-hover:bg-black group-hover:text-white transition-colors uppercase">
                      {c.name?.[0] || 'C'}
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                      <div className="shrink-0">
                        <HealthBadgeCompact commerceId={c.id} />
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-8 px-4 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${
                        c.planType === PlanType.PRO ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      {c.planType}
                    </span>
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-tighter">
                      {usage.count} <span className="font-medium opacity-60">/ {usage.limit || '∞'} sc</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotifCommerce(c);
                      }}
                      className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Notificar"
                    >
                      <Bell size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCommerce(c);
                      }}
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredCommerces.length === 0 && (
              <div className="py-20 text-center text-slate-300 space-y-4">
                <Building2 size={32} className="mx-auto opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Sin resultados</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-2 animate-in fade-in">
          {subscriptions.map((sub) => {
            const commerce = commerces.find((c) => c.id === sub.commerceId);
            if (!commerce) return null;
            return (
              <div key={sub.id} className="bg-white px-6 py-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${sub.status === 'active' ? 'bg-green-50 text-green-500 border-green-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                    <CreditCard size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate leading-none">{commerce.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Vence {new Date(sub.nextBillingDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRegisterPayment(sub.commerceId, sub.amount)}
                    className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                  >
                    Cobrar
                  </button>
                  <button onClick={() => setNotifCommerce(commerce)} className="p-2 text-slate-300 hover:text-slate-600">
                    <MessageSquare size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CREAR */}
      {showModal && activeTab === 'commerces' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md animate-in fade-in duration-300">
          <form onSubmit={handleCreate} className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-8 animate-in zoom-in-95 border border-slate-100">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-black tracking-tight">Nuevo Comercio</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-300 hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                <input
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-black transition-all"
                  placeholder="Ej: Café Central"
                  value={newCommerce.name}
                  onChange={(e) => setNewCommerce({ ...newCommerce, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan Inicial</label>
                  <select
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold"
                    value={newCommerce.planType}
                    onChange={(e) => {
                      const pt = e.target.value as PlanType;
                      setNewCommerce({ ...newCommerce, planType: pt, price: pt === PlanType.PRO ? 2500 : 0 });
                    }}
                  >
                    <option value={PlanType.FREE}>FREE</option>
                    <option value={PlanType.PRO}>PRO</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Límite Mensual</label>
                  <input
                    type="number"
                    disabled={newCommerce.planType === PlanType.PRO}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold disabled:opacity-20"
                    value={newCommerce.planType === PlanType.PRO ? '' : newCommerce.monthlyScanLimit}
                    onChange={(e) => setNewCommerce({ ...newCommerce, monthlyScanLimit: parseInt(e.target.value) || 0 })}
                    placeholder={newCommerce.planType === PlanType.PRO ? 'Ilimitado' : 'Ej: 100'}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio inicial ($)</label>
                <input
                  type="number"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold focus:border-black transition-all"
                  value={newCommerce.price}
                  onChange={(e) => setNewCommerce({ ...newCommerce, price: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating || !newCommerce.name}
              className="w-full py-4 bg-black text-white font-black rounded-2xl shadow-xl text-xs hover:opacity-90 disabled:opacity-50 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
            >
              {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isCreating ? 'CREANDO...' : 'CREAR REGISTRO'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteCommerce && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-rose-900/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-sm rounded-[32px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 border border-rose-100">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
              <ShieldAlert size={28} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900 leading-tight">¿Eliminar negocio?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Borrarás a <b>{deleteCommerce.name}</b> y todos sus datos definitivamente. No hay marcha atrás.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDeleteCommerce}
                disabled={isDeleting}
                className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {isDeleting ? 'BORRANDO...' : 'SÍ, ELIMINAR TODO'}
              </button>
              <button
                onClick={() => setDeleteCommerce(null)}
                disabled={isDeleting}
                className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTIF */}
      {notifCommerce && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-8 animate-in zoom-in-95 border border-slate-100">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Bell size={18} />
                </div>
                <h3 className="text-lg font-black text-slate-900">Mensaje Directo</h3>
              </div>
              <button onClick={() => setNotifCommerce(null)} className="text-slate-300 hover:text-black">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asunto</label>
                <input
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-blue-600 transition-all"
                  placeholder="Ej: Renovación necesaria"
                  value={notifData.title}
                  onChange={(e) => setNotifData({ ...notifData, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensaje</label>
                <textarea
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-600 h-32 resize-none focus:border-blue-600 transition-all"
                  placeholder="Escribe el aviso..."
                  value={notifData.message}
                  onChange={(e) => setNotifData({ ...notifData, message: e.target.value })}
                />
              </div>
            </div>
            <button
              onClick={handleSendNotification}
              disabled={sendingNotif || !notifData.title || !notifData.message}
              className="w-full py-4 bg-black text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-20"
            >
              {sendingNotif ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} {sendingNotif ? 'ENVIANDO...' : 'ENVIAR AHORA'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
