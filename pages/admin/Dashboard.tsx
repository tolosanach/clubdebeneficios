import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Activity,
  CreditCard,
  AlertTriangle,
  Search,
  Plus,
  X,
  Loader2,
  Trash2,
  Bell,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

import { db } from '../../services/db';
import { Commerce, PlanType, Subscription, SubscriptionStatus, PointsMode } from '../../types';

type HealthStatus = 'active' | 'low' | 'inactive';

const HealthBadgeCompact: React.FC<{ commerceId: string }> = ({ commerceId }) => {
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

const INITIAL_FORM_STATE = {
  name: '',
  ownerEmail: '',
  ownerPhone: '',
  tempPassword: '',
  planType: PlanType.FREE as PlanType,
  monthlyScanLimit: 100,
  price: 0,
  pointsMode: PointsMode.PERCENTAGE as PointsMode,
  pointsValue: 10,
};

const SuperAdminDashboard: React.FC = () => {
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeTab, setActiveTab] = useState<'commerces' | 'billing'>('commerces');
  const [filterText, setFilterText] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [newCommerce, setNewCommerce] = useState(INITIAL_FORM_STATE);
  const [isCreating, setIsCreating] = useState(false);

  // Notifs
  const [notifCommerce, setNotifCommerce] = useState<Commerce | null>(null);
  const [notifData, setNotifData] = useState({ title: '', message: '' });
  const [sendingNotif, setSendingNotif] = useState(false);

  // Delete
  const [deleteCommerce, setDeleteCommerce] = useState<Commerce | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshData = useCallback(() => {
    // db debería estar leyendo desde supabase (como ya lo dejaste)
    setCommerces(db.getAll('commerces'));
    setSubscriptions(db.getAll('subscriptions'));
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const filteredCommerces = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return commerces;
    return commerces.filter(c => (c.name || '').toLowerCase().includes(q));
  }, [commerces, filterText]);

  const closeAndReset = useCallback(() => {
    setShowModal(false);
    setNewCommerce(INITIAL_FORM_STATE);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // validaciones simples
    if (!newCommerce.name.trim()) return alert('Falta el nombre del comercio');
    if (!newCommerce.ownerEmail.trim()) return alert('Falta el email del dueño');
    if (!newCommerce.ownerPhone.trim()) return alert('Falta el celular del dueño');

    setIsCreating(true);

    try {
      // contraseña temporal simple si no pusiste una
      const tempPass =
        newCommerce.tempPassword.trim() ||
        `club-${Math.floor(100000 + Math.random() * 900000)}`;

      const finalScanLimit = newCommerce.planType === PlanType.PRO ? 0 : Number(newCommerce.monthlyScanLimit || 0);

      // ✅ Esto llama a tu serverless function en Vercel
      const resp = await fetch('/api/admin/create-commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCommerce.name.trim(),
          ownerEmail: newCommerce.ownerEmail.trim(),
          ownerPhone: newCommerce.ownerPhone.trim(),
          tempPassword: tempPass,
          planType: newCommerce.planType,
          monthlyScanLimit: finalScanLimit,
          price: Number(newCommerce.price || 0),
          pointsMode: newCommerce.pointsMode,
          pointsValue: Number(newCommerce.pointsValue || 10),
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        console.error('create-commerce failed', data);
        return alert(`Error creando comercio: ${data?.details || data?.error || 'desconocido'}`);
      }

      // refrescar lista
      refreshData();

      alert(
        `✅ Comercio creado\n\n` +
          `Email: ${newCommerce.ownerEmail}\n` +
          `Cel: ${newCommerce.ownerPhone}\n` +
          `Contraseña temporal: ${data?.tempPassword || tempPass}\n\n` +
          `Enviáselo al dueño para que ingrese.`
      );

      closeAndReset();
    } catch (err: any) {
      console.error(err);
      alert('Error de red o servidor. Revisá logs de Vercel.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCommerce = async () => {
    if (!deleteCommerce) return;

    if (!confirm(`¿Eliminar ${deleteCommerce.name}? Se borran sus datos.`)) return;

    setIsDeleting(true);
    try {
      // Si todavía no tenés delete-commerce, esto puede quedar como db.deleteCommerceCascade por ahora.
      // Ideal: endpoint real, pero te dejo lo simple:
      db.deleteCommerceCascade(deleteCommerce.id);
      refreshData();
      setDeleteCommerce(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifCommerce || !notifData.title || !notifData.message) return;
    setSendingNotif(true);
    try {
      db.sendAdminNotification(notifCommerce.id, notifData.title, notifData.message);
      alert('Notificación enviada');
      setNotifCommerce(null);
      setNotifData({ title: '', message: '' });
    } finally {
      setSendingNotif(false);
    }
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
        .filter(s => s.status !== 'suspended')
        .reduce((acc, s) => acc + (s.amount || 0), 0)
        .toLocaleString()}`,
      icon: CreditCard,
      color: 'text-emerald-500',
    },
    { label: 'En Mora', value: subscriptions.filter(s => s.status !== 'active').length, icon: AlertTriangle, color: 'text-red-500' },
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
            <p className="text-xl font-black text-black leading-none">{stat.value as any}</p>
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
              onChange={e => setFilterText(e.target.value)}
            />
          </div>
        )}
      </div>

      {activeTab === 'commerces' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
          <div className="divide-y divide-slate-50">
            {filteredCommerces.map(c => {
              const usage = db.getCommerceUsage(c.id);
              return (
                <div key={c.id} className="group flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs shrink-0 group-hover:bg-black group-hover:text-white transition-colors uppercase">
                      {(c.name || 'C')[0]}
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
                        c.planType === PlanType.PRO
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      {c.planType}
                    </span>
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-tighter">
                      {usage.count}{' '}
                      <span className="font-medium opacity-60">/ {usage.limit || '∞'} sc</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <button
                      onClick={() => setNotifCommerce(c)}
                      className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Notificar"
                    >
                      <Bell size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteCommerce(c)}
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
          {subscriptions.map(sub => {
            const commerce = commerces.find(c => c.id === sub.commerceId);
            if (!commerce) return null;

            return (
              <div
                key={sub.id}
                className="bg-white px-6 py-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                      sub.status === 'active'
                        ? 'bg-green-50 text-green-500 border-green-100'
                        : 'bg-red-50 text-red-500 border-red-100'
                    }`}
                  >
                    <CreditCard size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate leading-none">{commerce.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                      Vence {new Date(sub.nextBillingDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRegisterPayment(sub.commerceId, sub.amount)}
                    className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                  >
                    Cobrar
                  </button>
                  <button
                    onClick={() => setNotifCommerce(commerce)}
                    className="p-2 text-slate-300 hover:text-slate-600"
                    title="Mensaje"
                  >
                    <MessageSquare size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NUEVO COMERCIO */}
      {showModal && activeTab === 'commerces' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md animate-in fade-in duration-300">
          <form
            onSubmit={handleCreate}
            className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-7 animate-in zoom-in-95 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-black tracking-tight">Nuevo Comercio</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-300 hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del negocio</label>
                <input
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-black transition-all"
                  placeholder="Ej: Gimnasio Central"
                  value={newCommerce.name}
                  onChange={e => setNewCommerce({ ...newCommerce, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email del dueño</label>
                <input
                  required
                  type="email"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-black transition-all"
                  placeholder="dueño@negocio.com"
                  value={newCommerce.ownerEmail}
                  onChange={e => setNewCommerce({ ...newCommerce, ownerEmail: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Celular del dueño</label>
                <input
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-black transition-all"
                  placeholder="Ej: 54923..."
                  value={newCommerce.ownerPhone}
                  onChange={e => setNewCommerce({ ...newCommerce, ownerPhone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Contraseña temporal (opcional)
                </label>
                <input
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-black transition-all"
                  placeholder="Si lo dejás vacío, se genera sola"
                  value={newCommerce.tempPassword}
                  onChange={e => setNewCommerce({ ...newCommerce, tempPassword: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 font-semibold">
                  Esto es para el primer ingreso. Después el dueño la cambia.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan</label>
                  <select
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold"
                    value={newCommerce.planType}
                    onChange={e => {
                      const pt = e.target.value as PlanType;
                      setNewCommerce({ ...newCommerce, planType: pt, price: pt === PlanType.PRO ? 2500 : 0 });
                    }}
                  >
                    <option value={PlanType.FREE}>FREE</option>
                    <option value={PlanType.PRO}>PRO</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Límite mensual</label>
                  <input
                    type="number"
                    disabled={newCommerce.planType === PlanType.PRO}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold disabled:opacity-20"
                    value={newCommerce.planType === PlanType.PRO ? '' : newCommerce.monthlyScanLimit}
                    onChange={e => setNewCommerce({ ...newCommerce, monthlyScanLimit: parseInt(e.target.value) || 0 })}
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
                  onChange={e => setNewCommerce({ ...newCommerce, price: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating || !newCommerce.name || !newCommerce.ownerEmail || !newCommerce.ownerPhone}
              className="w-full py-4 bg-black text-white font-black rounded-2xl shadow-xl text-xs hover:opacity-90 disabled:opacity-50 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
            >
              {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isCreating ? 'CREANDO...' : 'CREAR'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteCommerce && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-rose-900/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 border border-rose-100">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
              <ShieldAlert size={28} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900 leading-tight">¿Eliminar negocio?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Borrarás a <b>{deleteCommerce.name}</b> y todos sus datos. No hay marcha atrás.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDeleteCommerce}
                disabled={isDeleting}
                className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{' '}
                {isDeleting ? 'BORRANDO...' : 'SÍ, ELIMINAR'}
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
                  placeholder="Ej: Renovación"
                  value={notifData.title}
                  onChange={e => setNotifData({ ...notifData, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensaje</label>
                <textarea
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-600 h-32 resize-none focus:border-blue-600 transition-all"
                  placeholder="Escribí el aviso..."
                  value={notifData.message}
                  onChange={e => setNotifData({ ...notifData, message: e.target.value })}
                />
              </div>
            </div>
            <button
              onClick={handleSendNotification}
              disabled={sendingNotif || !notifData.title || !notifData.message}
              className="w-full py-4 bg-black text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-20"
            >
              {sendingNotif ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}{' '}
              {sendingNotif ? 'ENVIANDO...' : 'ENVIAR'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
