
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Gift, X, Star, Zap, Loader2, CheckCircle2, Users, ChevronRight, Settings } from 'lucide-react';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Reward, Commerce, Customer } from '../../types';

const RewardCard: React.FC<{ 
  reward: Reward | any, 
  onEdit: (r: any) => void, 
  onDelete: (id: string) => void,
  isCoupon?: boolean
}> = ({ reward, onEdit, onDelete, isCoupon }) => {
  const navigate = useNavigate();
  const customers = db.getCustomersByCommerce(reward.commerceId);

  const stats = useMemo(() => {
    let active = 0;
    let near = 0;
    let completed = 0;

    if (isCoupon) {
      const now = new Date();
      active = customers.length;
      completed = customers.filter(c => c.discountAvailable && (!c.discountExpiresAt || new Date(c.discountExpiresAt) > now)).length;
    } else if (reward.rewardType === 'POINTS') {
      const target = reward.pointsThreshold || 0;
      customers.forEach(c => {
        if (c.totalPoints >= target) completed++;
        else if (c.totalPoints >= target * 0.8) near++;
        else active++;
      });
    } else if (reward.rewardType === 'STARS') {
      const target = reward.starsThreshold || 5;
      customers.forEach(c => {
        if (c.currentStars >= target) completed++;
        else if (c.currentStars >= target - 1) near++;
        else active++;
      });
    }

    return { active, near, completed, total: customers.length };
  }, [customers, reward, isCoupon]);

  return (
    <div className={`bg-white rounded-[32px] border p-6 shadow-sm flex flex-col justify-between transition-all group hover:border-slate-300 ${!reward.active && !isCoupon ? 'opacity-60 grayscale-[0.5]' : ''}`}>
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-2xl ${
            isCoupon ? 'bg-blue-50 text-blue-600' : 
            reward.rewardType === 'STARS' ? 'bg-yellow-50 text-yellow-600' : 'bg-indigo-50 text-indigo-600'
          }`}>
            {isCoupon ? <Zap size={24} /> : reward.rewardType === 'STARS' ? <Star size={24} /> : <Gift size={24} />}
          </div>
          {!isCoupon && (
            <div className="flex gap-1">
              <button onClick={() => onEdit(reward)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={18} /></button>
              <button onClick={() => onDelete(reward.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
            </div>
          )}
          {isCoupon && (
            <button onClick={() => navigate('/commerce/settings')} className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
              <Settings size={18} />
            </button>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-lg text-slate-900 leading-tight">{reward.name}</h3>
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
              isCoupon ? 'bg-blue-50 text-blue-600 border-blue-100' : 
              reward.rewardType === 'STARS' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
            }`}>
              {isCoupon ? 'Cupón' : reward.rewardType === 'STARS' ? 'Estrellas' : 'Puntos'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium line-clamp-1 italic">{reward.description || 'Sin descripción'}</p>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-3 gap-2 py-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 px-3">
          <div className="text-center">
            <p className="text-[14px] font-black text-slate-800 leading-none">{stats.active}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight mt-1">Activos</p>
          </div>
          <div className="text-center border-x border-slate-100 px-1">
            <p className="text-[14px] font-black text-orange-600 leading-none">{stats.near}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight mt-1">Cerca</p>
          </div>
          <div className="text-center">
            <p className="text-[14px] font-black text-emerald-600 leading-none">{stats.completed}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight mt-1">Listos</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-6">
        <div className="flex items-end gap-1">
          <span className="text-2xl font-black text-slate-900 leading-none">
            {isCoupon ? `${reward.discountPercent}%` : (reward.rewardType === 'STARS' ? reward.starsThreshold : reward.pointsThreshold)}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">
            {isCoupon ? 'OFF' : reward.rewardType === 'STARS' ? 'Sellos' : 'Pts'}
          </span>
        </div>
        <button
          onClick={() => navigate(`/commerce/rewards/${isCoupon ? 'coupon' : reward.id}`)}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95"
        >
          <Users size={14} />
          Socios ({stats.total})
          <ChevronRight size={12} className="opacity-40" />
        </button>
      </div>
    </div>
  );
};

const RewardsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    threshold: '',
    rewardType: 'POINTS' as 'POINTS' | 'STARS',
    active: true
  });

  useEffect(() => {
    if (user?.commerceId) {
      setCommerce(db.getById<Commerce>('commerces', user.commerceId) || null);
      refreshRewards();
    }
  }, [user]);

  const refreshRewards = () => {
    if (user?.commerceId) {
      setRewards(db.getAll<Reward>('rewards').filter(r => r.commerceId === user.commerceId));
    }
  };

  const handleOpenModal = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward);
      setFormData({
        name: reward.name,
        description: reward.description,
        threshold: (reward.rewardType === 'STARS' ? reward.starsThreshold : reward.pointsThreshold)?.toString() || '',
        rewardType: reward.rewardType,
        active: reward.active
      });
    } else {
      setEditingReward(null);
      setFormData({
        name: '',
        description: '',
        threshold: '',
        rewardType: 'POINTS',
        active: true
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user?.commerceId) return;
    if (!formData.name || !formData.threshold) return;

    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const rewardData: Partial<Reward> = {
      name: formData.name,
      description: formData.description,
      active: formData.active,
      commerceId: user.commerceId,
      rewardType: formData.rewardType,
      pointsCost: parseInt(formData.threshold)
    };

    if (formData.rewardType === 'STARS') {
      rewardData.starsThreshold = parseInt(formData.threshold);
      rewardData.pointsThreshold = undefined;
    } else {
      rewardData.pointsThreshold = parseInt(formData.threshold);
      rewardData.starsThreshold = undefined;
    }

    if (editingReward) {
      db.update<Reward>('rewards', editingReward.id, rewardData);
    } else {
      db.insert('rewards', { id: crypto.randomUUID(), ...rewardData } as Reward);
    }

    setLoading(false);
    setShowModal(false);
    refreshRewards();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este premio definitivamente?')) {
      db.delete('rewards', id);
      refreshRewards();
    }
  };

  if (!commerce) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventario de Beneficios</h1>
          <p className="text-sm text-slate-500 font-medium italic mt-1">Gestioná tus metas y seguí el progreso de tus socios.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-black text-white px-6 py-4 rounded-2xl font-black shadow-xl hover:opacity-90 active:scale-95 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Nuevo Premio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Entrada virtual para Cupón de Próxima Compra si está activo */}
        {commerce.enable_coupon && (
          <RewardCard 
            reward={{ 
              id: 'coupon', 
              name: 'Cupón Próxima Compra', 
              commerceId: commerce.id,
              discountPercent: commerce.discountPercent,
              description: commerce.ruleText || 'Válido para la siguiente visita.'
            }} 
            isCoupon 
            onEdit={() => {}} 
            onDelete={() => {}} 
          />
        )}
        
        {rewards.map((reward) => (
          <RewardCard 
            key={reward.id} 
            reward={reward} 
            onEdit={handleOpenModal} 
            onDelete={handleDelete} 
          />
        ))}
      </div>

      {rewards.length === 0 && !commerce.enable_coupon && (
        <div className="py-24 text-center space-y-4">
           <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto text-slate-200"><Gift size={40} /></div>
           <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Aún no creaste premios</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 border">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900">{editingReward ? 'Editar Premio' : 'Nuevo Premio'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-black transition-colors"><X size={24} /></button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">¿Para qué programa es?</label>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                    onClick={() => setFormData({...formData, rewardType: 'POINTS'})}
                    className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.rewardType === 'POINTS' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400 opacity-60 hover:opacity-100'}`}
                   >
                     <Zap size={20} />
                     <span className="text-[10px] font-black uppercase">Puntos</span>
                   </button>
                   <button 
                    onClick={() => setFormData({...formData, rewardType: 'STARS'})}
                    className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.rewardType === 'STARS' ? 'border-yellow-600 bg-yellow-50 text-yellow-600' : 'border-slate-100 text-slate-400 opacity-60 hover:opacity-100'}`}
                   >
                     <Star size={20} />
                     <span className="text-[10px] font-black uppercase">Estrellas</span>
                   </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Premio</label>
                <input type="text" required className="w-full h-14 px-5 bg-slate-50 border rounded-2xl font-bold" placeholder="Ej: Café de la casa gratis" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Requisito ({formData.rewardType === 'STARS' ? 'Estrellas' : 'Puntos'})</label>
                <input type="number" required className="w-full h-14 px-5 bg-slate-50 border rounded-2xl font-black text-xl" value={formData.threshold} onChange={e => setFormData({...formData, threshold: e.target.value})} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                 <span className="text-sm font-bold text-slate-700">Estado Activo</span>
                 <button onClick={() => setFormData({...formData, active: !formData.active})} className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${formData.active ? 'bg-green-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                 </button>
              </div>
            </div>

            <div className="pt-8">
              <button 
                onClick={handleSave}
                disabled={loading || !formData.name || !formData.threshold}
                className="w-full py-5 bg-black text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-20"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : editingReward ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                {editingReward ? 'Actualizar Premio' : 'Crear Premio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardsPage;
