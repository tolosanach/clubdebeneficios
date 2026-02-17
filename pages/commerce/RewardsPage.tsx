import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Gift, X, Star, Zap, Loader2, CheckCircle2, Users, ChevronRight, Settings } from 'lucide-react';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Reward, Commerce } from '../../types';

const RewardCard: React.FC<{ 
  reward: Reward | any, 
  onEdit: (r: any) => void, 
  onDelete: (id: string) => void,
  isCoupon?: boolean
}> = ({ reward, onEdit, onDelete, isCoupon }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[32px] border p-6 shadow-sm flex flex-col justify-between transition-all group hover:border-slate-300">
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
            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-100">
              {isCoupon ? 'Cupón' : reward.rewardType === 'STARS' ? 'Estrellas' : 'Puntos'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium italic">{reward.description || 'Sin descripción'}</p>
        </div>

        <div className="flex items-end gap-1 pt-4 border-t border-slate-50">
          <span className="text-2xl font-black text-slate-900 leading-none">
            {isCoupon ? `${reward.discountPercent}%` : (reward.rewardType === 'STARS' ? reward.starsThreshold : reward.pointsThreshold)}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">
            {isCoupon ? 'OFF' : reward.rewardType === 'STARS' ? 'Sellos' : 'Pts'}
          </span>
        </div>
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
      const c = db.getById<Commerce>('commerces', user.commerceId) || null;
      setCommerce(c);
      refreshRewards(c);
    }
  }, [user]);

  const refreshRewards = (c?: Commerce | null) => {
    if (user?.commerceId) {
      setRewards(db.getAll<Reward>('rewards').filter(r => r.commerceId === user.commerceId));
    }
  };

  // 🔥 Detecta el programa activo automáticamente
  const programMode = useMemo(() => {
    if (!commerce) return 'POINTS';
    if (commerce.enable_stars) return 'STARS';
    return 'POINTS';
  }, [commerce]);

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
        rewardType: programMode,
        active: true
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user?.commerceId) return;
    if (!formData.name || !formData.threshold) return;

    setLoading(true);
    await new Promise(r => setTimeout(r, 400));

    const rewardData: Partial<Reward> = {
      name: formData.name,
      description: formData.description,
      active: formData.active,
      commerceId: user.commerceId,
      rewardType: programMode
    };

    if (programMode === 'STARS') {
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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventario de Beneficios</h1>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-black text-white px-6 py-4 rounded-2xl font-black shadow-xl text-[11px] uppercase tracking-widest flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Premio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map((reward) => (
          <RewardCard key={reward.id} reward={reward} onEdit={handleOpenModal} onDelete={handleDelete} />
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 border">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900">
                {editingReward ? 'Editar Premio' : 'Nuevo Premio'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">

              {/* Programa activo */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Programa activo
                </label>

                {programMode === 'POINTS' ? (
                  <div className="py-4 rounded-2xl border-2 flex flex-col items-center gap-2 border-indigo-600 bg-indigo-50 text-indigo-600">
                    <Zap size={20} />
                    <span className="text-[10px] font-black uppercase">Puntos</span>
                  </div>
                ) : (
                  <div className="py-4 rounded-2xl border-2 flex flex-col items-center gap-2 border-yellow-600 bg-yellow-50 text-yellow-600">
                    <Star size={20} />
                    <span className="text-[10px] font-black uppercase">Estrellas</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Nombre del Premio
                </label>
                <input
                  type="text"
                  className="w-full h-14 px-5 bg-slate-50 border rounded-2xl font-bold"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Requisito ({programMode === 'STARS' ? 'Estrellas' : 'Puntos'})
                </label>
                <input
                  type="number"
                  className="w-full h-14 px-5 bg-slate-50 border rounded-2xl font-black text-xl"
                  value={formData.threshold}
                  onChange={e => setFormData({...formData, threshold: e.target.value})}
                />
              </div>

              <button 
                onClick={handleSave}
                disabled={loading || !formData.name || !formData.threshold}
                className="w-full py-5 bg-black text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-20"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Guardar Premio
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardsPage;
