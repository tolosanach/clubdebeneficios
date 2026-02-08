
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, MessageCircle, ChevronRight, User, Star, Zap, Gift, Clock, CheckCircle2, Calendar, AlertCircle } from 'lucide-react';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Customer, Reward, Commerce, Transaction } from '../../types';

const RewardMembersPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'AVAILABLE' | 'REDEEMED' | 'EXPIRED' | 'ALL'>('AVAILABLE');

  const commerce = db.getById<Commerce>('commerces', user?.commerceId || '');
  const isCoupon = id === 'coupon';
  
  const reward = useMemo(() => {
    if (isCoupon) return { id: 'coupon', name: 'Cupón de Descuento', rewardType: 'COUPON' };
    return db.getById<Reward>('rewards', id || '');
  }, [id, isCoupon]);

  const allCustomers = useMemo(() => {
    if (!user?.commerceId) return [];
    return db.getCustomersByCommerce(user.commerceId);
  }, [user]);

  const memberList = useMemo(() => {
    if (!reward || !commerce) return [];
    const now = new Date();

    let list = allCustomers.map(c => {
      let status: 'AVAILABLE' | 'REDEEMED' | 'EXPIRED' | 'ACTIVE' = 'ACTIVE';
      let progressPercent = 0;
      let isCompleted = false;
      let isNear = false;
      let isExpired = false;

      if (isCoupon) {
        isExpired = !!(c.discountExpiresAt && new Date(c.discountExpiresAt) < now);
        
        if (c.discountAvailable && !isExpired) {
          status = 'AVAILABLE';
          isCompleted = true;
          progressPercent = 100;
        } else if (isExpired) {
          status = 'EXPIRED';
          progressPercent = 100;
        } else if (c.lastDiscountUsedAt) {
          status = 'REDEEMED';
          progressPercent = 0;
        }
      } else if (reward.rewardType === 'POINTS') {
        const target = (reward as Reward).pointsThreshold || 0;
        progressPercent = Math.min(100, (c.totalPoints / target) * 100);
        isCompleted = c.totalPoints >= target;
        isNear = !isCompleted && progressPercent >= 80;
        status = isCompleted ? 'AVAILABLE' : 'ACTIVE';
      } else if (reward.rewardType === 'STARS') {
        const target = commerce.starsGoal || 5;
        progressPercent = Math.min(100, (c.currentStars / target) * 100);
        isCompleted = c.currentStars >= target;
        isNear = !isCompleted && c.currentStars >= target - 1;
        status = isCompleted ? 'AVAILABLE' : 'ACTIVE';
      }

      return { ...c, progressPercent, isCompleted, isNear, status, isExpired };
    });

    // Filtro por texto
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }

    // Filtro por pestañas/estado
    if (isCoupon) {
      if (activeFilter !== 'ALL') {
        list = list.filter(c => c.status === activeFilter);
      }
    } else {
      // Para puntos/estrellas mantenemos lógica compatible
      if (activeFilter === 'AVAILABLE') list = list.filter(c => c.isCompleted);
      if (activeFilter === 'REDEEMED') list = []; // En puntos no hay "canjeado" en esta vista
      if (activeFilter === 'EXPIRED') list = [];
    }

    // Ordenamiento
    return list.sort((a, b) => {
      if (isCoupon && activeFilter === 'AVAILABLE') {
        // Disponibles: Los que vencen antes primero
        const dateA = a.discountExpiresAt ? new Date(a.discountExpiresAt).getTime() : Infinity;
        const dateB = b.discountExpiresAt ? new Date(b.discountExpiresAt).getTime() : Infinity;
        return dateA - dateB;
      }
      return b.progressPercent - a.progressPercent;
    });
  }, [allCustomers, reward, commerce, searchTerm, activeFilter, isCoupon]);

  const getWhatsAppLink = (c: Customer) => {
    let msg = "";
    if (isCoupon) {
      msg = `Hola ${c.name}! 👋 Tenés un cupón de descuento disponible en ${commerce?.name}. ¡Te esperamos para usarlo!`;
    } else {
      msg = `Hola ${c.name}! 👋 Te escribimos de ${commerce?.name}. Queríamos recordarte que estás muy cerca de completar tu premio: ${reward?.name}.`;
    }
    return `https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  if (!reward || !commerce) return null;

  const tabs = isCoupon ? [
    { id: 'AVAILABLE', label: 'Disponibles', icon: Zap },
    { id: 'REDEEMED', label: 'Canjeados', icon: CheckCircle2 },
    { id: 'EXPIRED', label: 'Vencidos', icon: Clock },
  ] : [
    { id: 'AVAILABLE', label: 'Listos', icon: CheckCircle2 },
    { id: 'ALL', label: 'Todos', icon: User },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4 px-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-black transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">Socios en {reward.name}</h1>
          <p className="text-xs text-slate-400 font-medium tracking-tight">
            {isCoupon ? 'Seguimiento de cupones y beneficios emitidos.' : 'Progreso actual de los clientes en este premio.'}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-slate-200 ${isCoupon ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
               {memberList.length}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total en lista</p>
              <p className="text-sm font-bold text-slate-900">{isCoupon ? 'Cupones registrados' : 'Socios vinculados'}</p>
            </div>
          </div>
          
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o tel..."
              className="w-full h-12 pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-100 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex overflow-x-auto no-scrollbar gap-2 pt-2">
          {tabs.map(f => (
            <button
              key={f.id}
              // FIX: Changed setActiveTab to setActiveFilter as setActiveTab was not defined.
              onClick={() => setActiveFilter(f.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shrink-0 transition-all border ${
                activeFilter === f.id 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                  : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
              }`}
            >
              <f.icon size={14} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {memberList.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-slate-300 transition-all">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-xl text-slate-300 border border-slate-100">
                {c.name[0]}
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-lg leading-none">{c.name}</h4>
                <div className="flex items-center gap-2">
                   <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                     c.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                     c.status === 'REDEEMED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                     c.status === 'EXPIRED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                     'bg-slate-50 text-slate-400 border-slate-100'
                   }`}>
                     {isCoupon ? (
                       c.status === 'AVAILABLE' ? 'Disponible para usar' :
                       c.status === 'REDEEMED' ? 'Canjeado' :
                       c.status === 'EXPIRED' ? 'Vencido' : 'No disponible'
                     ) : (
                       c.isCompleted ? 'Listo para canje' : 'En progreso'
                     )}
                   </span>
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-xs space-y-2">
               <div className="flex justify-between items-end">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {isCoupon ? 'Vencimiento' : reward.rewardType === 'STARS' ? 'Sellos' : 'Puntos'}
                  </p>
                  <p className="text-xs font-black text-slate-900">
                    {isCoupon 
                      ? (c.discountExpiresAt ? new Date(c.discountExpiresAt).toLocaleDateString() : 'Sin fecha')
                      : (reward.rewardType === 'STARS' ? `${c.currentStars}/${commerce.starsGoal}` : `${c.totalPoints}/${(reward as Reward).pointsThreshold}`)}
                  </p>
               </div>
               
               <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      c.status === 'AVAILABLE' ? 'bg-emerald-500' : 
                      c.status === 'EXPIRED' ? 'bg-rose-400' : 
                      c.status === 'REDEEMED' ? 'bg-blue-600' : 'bg-slate-200'
                    }`} 
                    style={{ width: `${c.progressPercent}%` }}
                  />
               </div>
               
               <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 italic">
                  {isCoupon ? (
                    c.status === 'AVAILABLE' ? <><Zap size={10} className="text-amber-500" /> ¡Listo para aplicar!</> :
                    c.status === 'REDEEMED' ? <><CheckCircle2 size={10} className="text-blue-500" /> Canjeado el {new Date(c.lastDiscountUsedAt!).toLocaleDateString()}</> :
                    c.status === 'EXPIRED' ? <><AlertCircle size={10} className="text-rose-500" /> Expiró el {new Date(c.discountExpiresAt!).toLocaleDateString()}</> :
                    'No disponible'
                  ) : (
                    c.isCompleted ? '¡Ya puede canjearlo!' : c.isNear ? '¡Muy cerca!' : 'Sumando...'
                  )}
               </div>
            </div>

            <div className="flex items-center gap-2 pt-4 sm:pt-0 sm:border-l sm:pl-6 border-slate-50">
              <a 
                href={getWhatsAppLink(c)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none p-3.5 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                title="WhatsApp"
              >
                <MessageCircle size={20} />
                <span className="sm:hidden text-[10px] font-black uppercase">WhatsApp</span>
              </a>
              <button 
                onClick={() => navigate('/commerce/customers', { state: { selectedCustomerId: c.id } })}
                className="flex-1 sm:flex-none p-3.5 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2"
                title="Detalle"
              >
                <ChevronRight size={20} />
                <span className="sm:hidden text-[10px] font-black uppercase">Ver Detalle</span>
              </button>
            </div>
          </div>
        ))}

        {memberList.length === 0 && (
          <div className="py-24 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200 space-y-4">
             <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm text-slate-100">
               <Calendar size={40} />
             </div>
             <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No hay registros en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardMembersPage;
