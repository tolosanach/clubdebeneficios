
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  Gift, 
  TrendingUp, 
  QrCode, 
  ArrowRight, 
  UserX, 
  Trophy, 
  Zap, 
  Info, 
  Sparkles, 
  Lightbulb, 
  UserPlus, 
  Key, 
  Eye, 
  Bell, 
  Check, 
  X,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  History
} from 'lucide-react';
import { db, AdminNotification } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Commerce, PlanType, UserRole } from '../../types';

const CommerceDashboard: React.FC = () => {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [showPassModal, setShowPassModal] = useState(user?.mustChangePassword || false);
  const [newPass, setNewPass] = useState('');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  
  const commerceId = user?.commerceId || '';
  const commerce = db.getById<Commerce>('commerces', commerceId);
  const customers = db.getCustomersByCommerce(commerceId);
  const transactions = db.getTransactionsByCommerce(commerceId);
  const rewards = db.getRewardsByCommerce(commerceId);
  const planUsage = commerceId ? db.getCommerceUsage(commerceId) : null;
  const analytics = commerceId ? db.getCommerceAnalytics(commerceId) : {
    totalMembers: 0,
    activeCount: 0,
    inactiveCount: 0,
    rewardsDelivered: 0,
    returnRate: 0
  };

  useEffect(() => {
    if (commerceId) {
      setNotifications(db.getNotificationsByCommerce(commerceId).filter(n => !n.read));
    }
  }, [commerceId]);

  const markAsRead = (id: string) => {
    db.update<AdminNotification>('admin_notifications', id, { read: true });
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Dynamic Opportunity Logic
  const opportunity = useMemo(() => {
    const clientsCount = customers.length;
    const salesCount = transactions.length;
    const rewardsCount = rewards.length;
    const inactiveCount = analytics.inactiveCount;
    const nearRewardCount = db.getReminderCandidates(commerceId).filter(c => c.type === 'near_reward').length;

    // 1. Negocio sin actividad
    if (clientsCount === 0 || salesCount === 0) {
      return {
        title: 'Todavía no registraste actividad.',
        desc: 'Probá registrar tu primera venta o invitar a tus primeros clientes para empezar a generar movimiento.',
        action: 'Registrar venta',
        path: '/commerce/scan'
      };
    }

    // 2. Tiene clientes pero sin beneficios creados
    if (rewardsCount === 0) {
      return {
        title: 'Ya tenés clientes registrados.',
        desc: 'Crear un beneficio puede ayudarte a aumentar la frecuencia de visitas de tus socios.',
        action: 'Crear beneficio',
        path: '/commerce/rewards'
      };
    }

    // 3. Muchos cerca de premio
    if (nearRewardCount > 0) {
      return {
        title: `${nearRewardCount} clientes están cerca de un premio.`,
        desc: 'Es un buen momento para invitarlos a volver y que retiren su recompensa.',
        action: 'Ver recordatorios',
        path: '/commerce/reminders'
      };
    }

    // 4. Inactivos si negocio es activo
    if (inactiveCount > totalMembers * 0.4 && totalMembers > 5) {
       return {
          title: `Tenés ${inactiveCount} socios sin actividad reciente.`,
          desc: 'Podés recuperar ventas perdidas enviándoles un recordatorio por WhatsApp.',
          action: 'Reactivar socios',
          path: '/commerce/reminders'
       };
    }

    // 5. Pocos socios
    if (clientsCount < 10) {
      return {
        title: 'Invitá a tus clientes a sumarse.',
        desc: 'Mostrar el código QR en el mostrador ayuda a captar nuevos socios rápidamente.',
        action: 'Ver mis clientes',
        path: '/commerce/customers'
      };
    }

    // Default Good Work
    return {
      title: 'Excelente desempeño.',
      desc: 'Tu programa de fidelización está funcionando muy bien. ¡Seguí así!',
      action: 'Registrar venta',
      path: '/commerce/scan'
    };
  }, [customers.length, transactions.length, rewards.length, analytics, commerceId]);

  const totalMembers = analytics.totalMembers;
  const activeCount = analytics.activeCount;
  const inactiveCount = analytics.inactiveCount;
  const rewardsDelivered = analytics.rewardsDelivered;
  const returnRate = analytics.returnRate;

  const returnRateColor = returnRate > 40 ? 'text-emerald-500' : returnRate > 20 ? 'text-amber-500' : 'text-rose-500';
  const returnRateBg = returnRate > 40 ? 'bg-emerald-50 border-emerald-100' : returnRate > 20 ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100';

  const stats = [
    { 
      label: 'Socios totales', 
      value: totalMembers, 
      icon: Users, 
      color: 'text-blue-500', 
      desc: 'Personas que ya participan en tu programa.' 
    },
    { 
      label: 'Clientes activos', 
      value: activeCount, 
      icon: TrendingUp, 
      color: 'text-indigo-500', 
      desc: 'Clientes que volvieron recientemente.' 
    },
    { 
      label: 'Clientes inactivos', 
      value: inactiveCount, 
      icon: UserX, 
      color: 'text-rose-500', 
      desc: 'Podés reactivarlos desde Recordatorios.' 
    },
    { 
      label: 'Premios entregados', 
      value: rewardsDelivered, 
      icon: Trophy, 
      color: 'text-emerald-500', 
      desc: 'Beneficios que ya generaron retorno.' 
    },
  ];

  const handlePassChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    const success = await changePassword(newPass);
    if (success) {
      setShowPassModal(false);
      alert("Contraseña actualizada con éxito");
    }
  };

  const canEdit = [UserRole.COMMERCE_OWNER, UserRole.STAFF_MANAGER].includes(user?.role || UserRole.VIEWER);
  const canScan = [UserRole.COMMERCE_OWNER, UserRole.STAFF_MANAGER, UserRole.SCANNER].includes(user?.role || UserRole.VIEWER);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      
      {/* Admin Notices Section */}
      {notifications.length > 0 && (
        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
           {notifications.map(n => (
             <div key={n.id} className="bg-slate-900 text-white p-6 rounded-[32px] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-slate-800">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500 shadow-lg shadow-blue-900/50">
                    <Bell size={24} className="animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-xs uppercase tracking-widest text-blue-400">Aviso Administrativo</h4>
                    <p className="font-bold text-lg leading-tight">{n.title}</p>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">{n.message}</p>
                  </div>
                </div>
                <button 
                  onClick={() => markAsRead(n.id)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white text-white hover:text-black px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Check size={14} /> Entendido
                </button>
             </div>
           ))}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Target size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Dashboard / Estadísticas</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight text-black leading-tight">
            Hola, {user?.name.split(' ')[0]}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Resumen de fidelización de tu negocio.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {canEdit && (
            <button
              onClick={() => navigate('/commerce/customers/new')}
              className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-black px-8 py-4 rounded-2xl text-sm font-bold hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm"
            >
              <UserPlus size={20} />
              Cargar cliente
            </button>
          )}
          {canScan && (
            <button
              onClick={() => navigate('/commerce/scan')}
              className="flex items-center justify-center gap-3 bg-black text-white px-8 py-4 rounded-2xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-black/10"
            >
              <QrCode size={20} />
              Registrar Venta
            </button>
          )}
        </div>
      </div>

      {/* Main Metrics Section */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-6">
                <span className={`p-2.5 rounded-2xl bg-slate-50 ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={20} />
                </span>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{stat.label}</span>
              </div>
              <p className="text-3xl font-black text-black tracking-tight mb-2">{stat.value}</p>
              <p className="text-[11px] font-medium text-slate-400 leading-relaxed italic">
                {stat.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Key Featured Metric Card */}
        <div className={`p-10 rounded-[48px] border-2 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-8 transition-all ${returnRateBg}`}>
          <div className="space-y-4 text-center sm:text-left max-w-lg">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div className={`p-2 rounded-xl bg-white border shadow-sm ${returnRateColor}`}>
                 <TrendingUp size={20} />
              </div>
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Métrica Clave: Tasa de Retorno</h3>
            </div>
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              Este porcentaje indica cuántos de tus socios registrados han vuelto a comprar en los últimos 30 días. Un retorno alto significa un programa exitoso.
            </p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className={`text-7xl font-black tracking-tighter ${returnRateColor}`}>{Math.round(returnRate)}%</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
               {returnRate > 40 ? <ArrowUpRight className="text-emerald-500" size={16} /> : <ArrowDownRight className="text-amber-500" size={16} />}
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Salud del programa</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          {/* Dynamic Opportunities Section */}
          <div className="bg-blue-600 p-8 rounded-[40px] text-white space-y-6 shadow-2xl shadow-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Lightbulb size={20} />
              </div>
              <h3 className="font-black text-xs uppercase tracking-widest">Oportunidades</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-lg font-bold leading-tight">
                  {opportunity.title}
                </p>
                <p className="text-[13px] font-medium opacity-80 leading-relaxed">
                  {opportunity.desc}
                </p>
              </div>
              
              <button 
                onClick={() => navigate(opportunity.path)}
                className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
              >
                {opportunity.action} <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Plan Usage */}
          {planUsage && user?.role === UserRole.COMMERCE_OWNER && (
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Zap className={planUsage.planType === PlanType.PRO ? 'text-blue-500' : 'text-slate-400'} size={16} />
                  <p className={`text-[11px] font-black uppercase tracking-widest ${planUsage.planType === PlanType.PRO ? 'text-blue-600' : 'text-slate-400'}`}>
                    Plan {planUsage.planType}
                  </p>
                </div>
                {planUsage.planType === PlanType.FREE && (
                  <button onClick={() => navigate('/commerce/billing')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Mejorar</button>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <h4 className="font-bold text-slate-900 text-xs">Uso del mes</h4>
                  <span className="text-[11px] font-black text-slate-400">
                    {planUsage.planType === PlanType.PRO ? 'Ilimitado' : `${planUsage.count} / ${planUsage.limit}`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div 
                    className={`h-full transition-all duration-1000 ${planUsage.percentage > 85 ? 'bg-red-500' : 'bg-black'}`} 
                    style={{ width: `${planUsage.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity List */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History size={16} /> Actividad Reciente
            </h3>
            <button onClick={() => navigate('/commerce/customers')} className="text-[10px] text-blue-600 font-black uppercase tracking-widest hover:underline">Ver todos</button>
          </div>
          <div className="divide-y divide-slate-50 overflow-y-auto max-h-[500px] no-scrollbar">
            {transactions.slice(-10).reverse().map((t) => {
              const customer = customers.find(c => c.id === t.customerId);
              return (
                <div key={t.id} className="px-8 py-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 font-black text-sm uppercase border border-slate-100 group-hover:bg-white group-hover:text-blue-500 transition-all">
                      {customer?.name?.[0] || 'S'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-[15px] leading-tight mb-1">
                        {customer?.name || 'Socio'} 
                        {t.redeemedRewardId && <span className="ml-2 text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">CANJEÓ PREMIO</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {new Date(t.createdAt).toLocaleDateString()} • {t.method === 'SCAN' ? 'Escaneo QR' : 'Manual'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-black font-black text-[16px] leading-none mb-1">
                      {t.points >= 0 ? `+${t.points}` : t.points} pts
                    </p>
                    <p className="text-[11px] font-bold text-slate-300 tracking-tight">${t.amount.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <div className="py-24 text-center text-slate-300 space-y-4 flex flex-col items-center">
                <div className="p-6 bg-slate-50 rounded-[32px]">
                  <CreditCard size={40} className="opacity-20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sin movimientos registrados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forced Password Change Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-8 animate-in zoom-in-95 border border-slate-100">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto border border-blue-100"><Key size={32} /></div>
              <h2 className="text-2xl font-black text-slate-900">Seguridad Obligatoria</h2>
              <p className="text-sm text-slate-500 font-medium">Por ser tu primer ingreso con clave temporal, debés elegir una nueva contraseña personal.</p>
            </div>
            
            <form onSubmit={handlePassChange} className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                 <input 
                  type="password" 
                  required 
                  autoFocus
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  className="w-full h-14 px-5 bg-slate-50 border rounded-2xl outline-none font-bold text-slate-800 focus:border-black transition-all" 
                  placeholder="Mínimo 6 caracteres" 
                 />
               </div>
               <button type="submit" className="w-full py-5 bg-black text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl hover:opacity-90 transition-all">Actualizar y Continuar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommerceDashboard;
