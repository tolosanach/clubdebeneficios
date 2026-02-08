
import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageCircle, 
  ArrowLeft, 
  Zap, 
  Clock, 
  Gift, 
  ChevronRight, 
  Send, 
  X, 
  CheckCircle2, 
  Search,
  Filter,
  ArrowRight,
  MoreVertical,
  Check,
  Smartphone,
  Trophy,
  History,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, ReminderCandidate } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Commerce, WhatsAppReminderLog } from '../../types';
import { generateSpecificReminder } from '../../services/messageGenerator';

const RemindersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [candidates, setCandidates] = useState<ReminderCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ReminderCandidate | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastSentId, setLastSentId] = useState<string | null>(null);

  const commerce = db.getById<Commerce>('commerces', user?.commerceId || '');
  const stats = useMemo(() => db.getReminderStats(user?.commerceId || ''), [user, candidates]);

  useEffect(() => {
    refreshCandidates();
  }, [user]);

  const refreshCandidates = () => {
    if (user?.commerceId) {
      setCandidates(db.getReminderCandidates(user.commerceId));
    }
  };

  const filteredCandidates = useMemo(() => {
    let list = candidates;
    if (activeTab !== 'ALL') {
      list = list.filter(c => c.priority === activeTab);
    }
    // Ordenar por prioridad (HIGH > MEDIUM > LOW)
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return [...list].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [candidates, activeTab]);

  const getMessageForCandidate = (c: ReminderCandidate) => {
    if (!commerce) return "";
    const rewards = db.getRewardsByCommerce(commerce.id);
    let beneficio = "tu próximo premio";
    
    if (c.type === 'coupon_expiring') beneficio = `${commerce.discountPercent}% OFF`;
    else if (c.type === 'near_reward') {
      const bestReward = rewards
        .filter(r => r.rewardType === (commerce.enable_stars ? 'STARS' : 'POINTS'))
        .sort((a, b) => (b.pointsThreshold || 0) - (a.pointsThreshold || 0))[0];
      beneficio = bestReward?.name || beneficio;
    }

    return generateSpecificReminder(c.type, {
      cliente_nombre: c.customer.name.split(' ')[0],
      negocio_nombre: commerce.name,
      beneficio
    });
  };

  const handleSend = (c: ReminderCandidate) => {
    const message = getMessageForCandidate(c);
    const encoded = encodeURIComponent(message);
    const link = `https://wa.me/${c.customer.phone.replace(/\D/g, '')}?text=${encoded}`;
    
    // Log initial open
    if (user) {
      db.insert<WhatsAppReminderLog>('whatsapp_reminders_log', {
        id: crypto.randomUUID(),
        commerceId: user.commerceId!,
        customerId: c.customer.id,
        reminderType: c.type,
        messageText: message,
        status: 'opened',
        createdAt: new Date().toISOString(),
        staffUserId: user.id
      });
    }

    window.open(link, '_blank');
    setSelectedCandidate(c);
    setShowConfirmModal(true);
  };

  const confirmSent = (status: 'sent' | 'skipped') => {
    if (selectedCandidate && user) {
      const logs = db.getAll<WhatsAppReminderLog>('whatsapp_reminders_log')
        .filter(l => l.customerId === selectedCandidate.customer.id && l.status === 'opened')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      
      if (logs[0]) {
        db.update<WhatsAppReminderLog>('whatsapp_reminders_log', logs[0].id, { status });
      }
      
      if (status === 'sent') {
        setLastSentId(selectedCandidate.customer.id);
        setTimeout(() => setLastSentId(null), 3000);
      }
    }
    setShowConfirmModal(false);
    setSelectedCandidate(null);
    refreshCandidates();
  };

  const handleSendNext = () => {
    const highPriority = candidates.filter(c => c.priority === 'HIGH');
    const target = highPriority.length > 0 ? highPriority[0] : candidates[0];
    if (target) {
      handleSend(target);
    }
  };

  const tabItems = [
    { id: 'ALL', label: 'Todos', color: 'bg-slate-100 text-slate-500' },
    { id: 'HIGH', label: 'Alta Prioridad', color: 'bg-red-50 text-red-600' },
    { id: 'MEDIUM', label: 'Media Prioridad', color: 'bg-orange-50 text-orange-600' },
    { id: 'LOW', label: 'Baja Prioridad', color: 'bg-blue-50 text-blue-600' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/commerce')} className="p-2 -ml-2 text-slate-400 hover:text-black transition-colors"><ArrowLeft size={24} /></button>
             <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">Centro de Recordatorios</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium italic">Contactá a tus socios para que vuelvan o usen sus beneficios.</p>
        </div>
        
        {candidates.length > 0 && (
          <button 
            onClick={handleSendNext}
            className="bg-black text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-2xl shadow-black/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Send size={16} className="hidden sm:block" /> Enviar siguiente urgente
          </button>
        )}
      </div>

      {/* KPIs Summary */}
      <div className="grid grid-cols-2 gap-4 px-2">
        <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-slate-300 transition-all">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
             <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enviados (mes)</p>
            <p className="text-xl font-black text-slate-900 leading-none mt-1">{stats.sentThisMonth}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-slate-300 transition-all">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
             <Trophy size={18} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recuperados</p>
            <p className="text-xl font-black text-slate-900 leading-none mt-1">{stats.recoveredThisMonth}</p>
          </div>
        </div>
      </div>

      {/* Tabs / Filtros - Mobile Optimized Scroll */}
      <div className="relative -mx-4 px-4 sm:mx-0 sm:px-2">
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 scroll-smooth">
          {tabItems.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-5 py-3 min-h-[46px] rounded-2xl text-[10px] font-black uppercase tracking-widest shrink-0 transition-all border shadow-sm ${
                activeTab === t.id 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-slate-200' 
                  : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
              }`}
            >
              {t.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${activeTab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {t.id === 'ALL' ? candidates.length : candidates.filter(c => c.priority === t.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Candidatos */}
      <div className="grid gap-4 px-2">
        {filteredCandidates.map((c) => (
          <div 
            key={`${c.customer.id}-${c.type}`} 
            className={`bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-slate-300 transition-all ${lastSentId === c.customer.id ? 'opacity-0 scale-95 pointer-events-none' : ''}`}
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-300 border border-slate-100 shrink-0">
                {c.customer.name[0]}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-lg leading-tight truncate max-w-[200px] sm:max-w-none">{c.customer.name}</h4>
                  <span className={`text-[8px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-full border whitespace-nowrap ${
                    c.priority === 'HIGH' ? 'bg-red-50 text-red-600 border-red-100' :
                    c.priority === 'MEDIUM' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                    'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>
                    {c.reason}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-slate-400 font-medium italic">
                    {c.lastVisitAt ? `Última visita: ${new Date(c.lastVisitAt).toLocaleDateString()}` : 'Sin visitas registradas'}
                  </p>
                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                  <p className="text-xs font-bold text-slate-900">{c.progressText}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l sm:pl-6 border-slate-50">
              <button 
                onClick={() => handleSend(c)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                  c.type === 'near_reward' ? 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700' :
                  c.type === 'inactive' ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700' :
                  'bg-orange-500 text-white shadow-orange-100 hover:bg-orange-600'
                }`}
              >
                <MessageCircle size={16} />
                {c.type === 'near_reward' ? 'Recordar Premio' : c.type === 'inactive' ? 'Reactivar Socio' : 'Avisar Cupón'}
              </button>
              
              <button 
                onClick={() => confirmSent('skipped')}
                className="p-4 bg-slate-50 text-slate-300 rounded-2xl hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-90"
                title="Ignorar por ahora"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        ))}

        {filteredCandidates.length === 0 && (
          <div className="py-24 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200 space-y-6">
             <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mx-auto shadow-sm text-emerald-400 animate-in zoom-in-95">
               <CheckCircle2 size={56} />
             </div>
             <div className="px-10 space-y-2">
               <p className="text-xl font-black text-slate-900 tracking-tight">Tu base de socios está activa</p>
               <p className="text-sm text-slate-400 font-medium italic">
                 {activeTab === 'ALL' 
                   ? 'Todavía no hay recordatorios urgentes. ¡Buen trabajo!' 
                   : 'No hay recordatorios pendientes en esta categoría.'}
               </p>
             </div>
             <button 
               onClick={() => { setActiveTab('ALL'); navigate('/commerce/customers'); }}
               className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:border-black transition-all"
             >
               Ver todos los clientes
             </button>
          </div>
        )}
      </div>

      {/* Modal de Confirmación Post-Envío */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 space-y-8 animate-in zoom-in-95 text-center border">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto">
              <MessageCircle size={40} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 leading-tight">¿Se envió el mensaje?</h3>
              <p className="text-sm text-slate-500 font-medium">Confirmá para actualizar las estadísticas de contacto.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => confirmSent('skipped')}
                className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-black transition-colors"
              >
                No se envió
              </button>
              <button 
                onClick={() => confirmSent('sent')}
                className="py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
              >
                <Check size={16} /> Sí, enviado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemindersPage;
