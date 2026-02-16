
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, MessageCircle, TrendingUp, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Commerce } from '../../types';

const TopCustomersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rankingBy, setRankingBy] = useState<'visits' | 'amount'>('visits');
  const [topList, setTopList] = useState<any[]>([]);
  const commerce = db.getById<Commerce>('commerces', user?.commerceId || '');

  useEffect(() => {
    if (user?.commerceId) {
      setTopList(db.getTopCustomers(user.commerceId, rankingBy));
    }
  }, [user, rankingBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/commerce')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-slate-900">Ranking de Socios</h1>
      </div>

      <div className="bg-white p-6 rounded-[32px] border shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRankingBy('visits')}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${rankingBy === 'visits' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 text-slate-400'}`}
          >
            <ShoppingBag size={14} />
            Por Visitas
          </button>
          <button
            onClick={() => setRankingBy('amount')}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${rankingBy === 'amount' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 text-slate-400'}`}
          >
            <TrendingUp size={14} />
            Por Monto ($)
          </button>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOP 10 CLIENTES</p>
      </div>

      <div className="grid gap-3">
        {topList.map((item, idx) => (
          <div key={item.id} className="bg-white p-5 rounded-[28px] border shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
            <div className="flex items-center gap-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : idx === 1 ? 'bg-slate-100 text-slate-500' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-300'}`}>
                {idx + 1}
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{item.name}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.summary.totalVisits} visitas</p>
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">${item.summary.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-blue-600 font-black text-base">{item.totalPoints}</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">puntos</p>
              </div>
              <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-green-50 hover:text-green-600 transition-all">
                <MessageCircle size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopCustomersPage;
