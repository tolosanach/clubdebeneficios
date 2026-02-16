
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, Clock, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Commerce, Customer, Reward } from '../../types';
// Fixed: Changed generateReminderMessage to generateReceiptMessage which is the correct exported function
import { generateReceiptMessage } from '../../services/messageGenerator';

const InactivePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [inactiveList, setInactiveList] = useState<any[]>([]);
  const commerce = db.getById<Commerce>('commerces', user?.commerceId || '');
  const rewards = db.getRewardsByCommerce(user?.commerceId || '');

  useEffect(() => {
    if (user?.commerceId) {
      setInactiveList(db.getInactiveCustomers(user.commerceId, days));
    }
  }, [user, days]);

  const getReminderLink = (customer: any) => {
    if (!commerce) return '#';
    const nextReward = rewards
      .filter(r => (r.pointsThreshold || 0) > customer.totalPoints)
      .sort((a, b) => (a.pointsThreshold || 0) - (b.pointsThreshold || 0))[0];
    
    // Fixed: Use generateReceiptMessage to create the WhatsApp message
    const message = generateReceiptMessage(commerce, {
      cliente_nombre: customer.name,
      negocio_nombre: commerce.name,
      puntos_actuales: customer.totalPoints,
      puntos_faltantes: nextReward ? ((nextReward.pointsThreshold || 0) - customer.totalPoints) : 0,
      beneficio: nextReward?.name || ""
    });

    return `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/commerce')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-slate-900">Clientes Inactivos</h1>
      </div>

      <div className="bg-white p-6 rounded-[32px] border shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">Filtrar por inactividad:</span>
          {[7, 15, 30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-full text-xs font-black transition-all ${days === d ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              {d} DÍAS
            </button>
          ))}
        </div>
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3">
          <Clock size={18} />
          <p className="text-sm font-bold">{inactiveList.length} socios no han vuelto en más de {days} días.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {inactiveList.map(item => {
          const lastDate = new Date(item.summary.lastVisitAt);
          return (
            <div key={item.id} className="bg-white p-5 rounded-[24px] border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-300 text-xl">
                  {item.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{item.name}</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Última visita: {lastDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                <div className="text-right">
                  <p className="text-blue-600 font-black text-lg leading-none">{item.totalPoints}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">puntos</p>
                </div>
                <a 
                  href={getReminderLink(item)}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-green-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-700 active:scale-95 transition-all"
                >
                  <MessageCircle size={16} />
                  Recordar
                </a>
              </div>
            </div>
          );
        })}

        {inactiveList.length === 0 && (
          <div className="py-20 text-center bg-slate-50 rounded-[40px] border border-dashed text-slate-400">
            <UserX size={48} className="mx-auto mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">No hay clientes inactivos para este rango</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InactivePage;
