
import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { 
  History, 
  QrCode, 
  Zap, 
  Clock, 
  Info, 
  Star, 
  ChevronRight, 
  ArrowLeft, 
  TrendingUp,
  Award,
  Search,
  MapPin,
  MessageCircle
} from 'lucide-react';
import { Customer, Transaction, Commerce, Reward, GlobalCustomer, CommerceCategory } from '../../types';

// --- Subcomponentes ---

const BusinessDirectory: React.FC<{
  onClose: () => void;
  memberships: Customer[];
}> = ({ onClose, memberships }) => {
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState<CommerceCategory | ''>('');
  const [selectedCommerce, setSelectedCommerce] = useState<Commerce | null>(null);

  const provinces = useMemo(() => db.getPublicProvinces(), []);
  
  const businesses = useMemo(() => {
    return db.getPublicBusinesses({
      province: province || undefined,
      city: city || undefined,
      category: category || undefined
    });
  }, [province, city, category]);

  const isMember = (commerceId: string) => memberships.some(m => m.commerceId === commerceId);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-24 px-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-black transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Explorar Locales</h2>
      </div>

      <div className="grid gap-4">
        {businesses.length > 0 ? (
          businesses.map(b => (
            <button key={b.id} onClick={() => setSelectedCommerce(b)} className="w-full bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group text-left">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border font-black uppercase">
                  {b.name[0]}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight mb-1">{b.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-100 text-slate-500">{b.category}</span>
                    {isMember(b.id) && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">Ya sos socio</span>}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-200 group-hover:text-black transition-colors" />
            </button>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
            <Search size={48} className="mx-auto text-slate-100" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sin resultados</p>
          </div>
        )}
      </div>

      {selectedCommerce && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar border">
            <div className="flex justify-between items-start">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl font-black text-slate-200 border uppercase">{selectedCommerce.name[0]}</div>
              <button onClick={() => setSelectedCommerce(null)} className="p-2 text-slate-300 hover:text-black"><ChevronRight className="rotate-90" /></button>
            </div>
            <div className="space-y-4">
               <div><h3 className="text-3xl font-black text-slate-900 leading-tight">{selectedCommerce.name}</h3><p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1">{selectedCommerce.category}</p></div>
               <div className="flex items-center gap-2 text-slate-400 text-xs font-medium italic"><MapPin size={14} /> {selectedCommerce.city}, {selectedCommerce.province}</div>
               <div className="space-y-3 pt-4">
                  {selectedCommerce.public_phone && (
                    <a href={`https://wa.me/${selectedCommerce.public_phone}`} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 py-4 bg-[#25D366] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-green-100">
                      <MessageCircle size={18} fill="currentColor" /> Consultar por WhatsApp
                    </a>
                  )}
               </div>
            </div>
            <p className="text-[10px] font-medium text-slate-400 leading-relaxed text-center">Para sumarte a este club, pedí que te registren al pagar.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomerPortal: React.FC = () => {
  const { user } = useAuth();
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [view, setView] = useState<'HOME' | 'DIRECTORY'>('HOME');

  const globalCustomer = useMemo(() => {
    if (!user) return null;
    const allGlobals = db.getAll<GlobalCustomer>('global_customers');
    return allGlobals.find(gc => (user.phone && gc.phone === user.phone) || (user.email && gc.email?.toLowerCase() === user.email.toLowerCase())) || null;
  }, [user]);

  const memberships = useMemo(() => {
    if (!globalCustomer) return [];
    return db.getAll<Customer>('customers').filter(c => c.globalCustomerId === globalCustomer.id);
  }, [globalCustomer]);

  const selectedMembership = useMemo(() => memberships.find(m => m.id === selectedMembershipId), [memberships, selectedMembershipId]);
  
  const selectedCommerce = useMemo(() => selectedMembership ? db.getById<Commerce>('commerces', selectedMembership.commerceId) : null, [selectedMembership]);
  
  const transactions = useMemo(() => selectedMembership ? db.getAll<Transaction>('transactions').filter(t => t.customerId === selectedMembership.id) : [], [selectedMembership]);

  // Resolución de premios seleccionados por ID
  const pointsReward = useMemo(() => {
    if (!selectedCommerce?.pointsRewardId) return null;
    return db.getAll<Reward>('rewards').find(r => r.id === selectedCommerce.pointsRewardId);
  }, [selectedCommerce]);

  const starsReward = useMemo(() => {
    if (!selectedCommerce?.starsRewardId) return null;
    return db.getAll<Reward>('rewards').find(r => r.id === selectedCommerce.starsRewardId);
  }, [selectedCommerce]);

  if (view === 'DIRECTORY') return <BusinessDirectory onClose={() => setView('HOME')} memberships={memberships} />;

  // LISTA DE NEGOCIOS
  if (!selectedMembershipId || !selectedMembership || !selectedCommerce) {
    return (
      <div className="space-y-10 animate-in fade-in pb-24 px-2">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Mis Beneficios</h2>
            <p className="text-sm text-slate-500 font-medium mt-2">Gestioná tus puntos y recompensas.</p>
          </div>
          <button onClick={() => setView('DIRECTORY')} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Search size={20} /></button>
        </div>

        <div className="grid gap-4">
          {memberships.map((m) => {
            const commerce = db.getById<Commerce>('commerces', m.commerceId);
            if (!commerce) return null;
            return (
              <button key={m.id} onClick={() => setSelectedMembershipId(m.id)} className="w-full bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border font-black uppercase">{commerce.name[0]}</div>
                  <div className="text-left">
                    <h3 className="font-black text-slate-900 text-lg leading-tight mb-1">{commerce.name}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                       {commerce.enable_points && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">Puntos</span>}
                       {commerce.enable_stars && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-yellow-50 text-yellow-700">Estrellas</span>}
                       {commerce.enable_coupon && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-50 text-blue-600">Cupón</span>}
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl text-slate-300 group-hover:bg-black group-hover:text-white transition-all"><ChevronRight size={18} /></div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // DETALLE DE MEMBRESÍA Modular
  const now = new Date();
  const isCouponValid = selectedMembership.discountAvailable && (!selectedMembership.discountExpiresAt || now < new Date(selectedMembership.discountExpiresAt));

  return (
    <div className="space-y-8 pb-24 animate-in slide-in-from-right-4">
      <div className="flex items-center justify-between px-2">
        <button onClick={() => setSelectedMembershipId(null)} className="flex items-center gap-2 text-slate-400 hover:text-black"><ArrowLeft size={20} /> <span className="text-[11px] font-black uppercase tracking-widest">Volver</span></button>
        <div className="flex items-center gap-2 text-blue-600"><Award size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Socio Club</span></div>
      </div>

      <div className="px-2">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">{selectedCommerce.name}</h2>
        <p className="text-sm text-slate-500 font-medium italic">Tu programa activo</p>
      </div>

      <div className="grid gap-6">
        {/* Módulo Cupón */}
        {selectedCommerce.enable_coupon && (
          <div className={`p-8 rounded-[48px] border shadow-2xl transition-all ${isCouponValid ? 'bg-white border-blue-100 shadow-blue-50' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-xl ${isCouponValid ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}><Zap size={18} /></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cupón de Descuento</p>
            </div>
            {isCouponValid ? (
              <div className="space-y-4">
                <p className="text-5xl font-black text-slate-900 tracking-tighter">{selectedCommerce.discountPercent}% OFF</p>
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                  <Clock size={14} /> Vence el {selectedMembership.discountExpiresAt ? new Date(selectedMembership.discountExpiresAt).toLocaleDateString() : 'próximamente'}
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-400 leading-relaxed">Sumá tu próxima compra para desbloquear tu beneficio de <span className="text-slate-900 font-black">{selectedCommerce.discountPercent}% OFF</span>.</p>
            )}
          </div>
        )}

        {/* Módulo Puntos */}
        {selectedCommerce.enable_points && (
          <div className="bg-white p-8 rounded-[48px] border border-indigo-50 shadow-2xl shadow-indigo-50 text-center space-y-4 relative overflow-hidden group">
            <div className="absolute -top-6 -right-6 opacity-5 group-hover:scale-110 transition-transform">
               <TrendingUp size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Tus puntos</p>
              <div className="text-6xl font-black text-slate-900 tracking-tighter mb-4">{selectedMembership.totalPoints}</div>
              <p className="text-xs font-bold text-indigo-600 bg-indigo-50 inline-block px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">Puntos acumulados</p>
              
              {pointsReward && (
                <div className="pt-6 border-t border-slate-50 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Próxima</p>
                  <p className="text-sm font-bold text-slate-800">{pointsReward.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{selectedMembership.totalPoints >= (pointsReward.pointsThreshold || 0) ? '¡Ya podés canjearlo!' : `Te faltan ${(pointsReward.pointsThreshold || 0) - selectedMembership.totalPoints} pts`}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Módulo Estrellas */}
        {selectedCommerce.enable_stars && (
          <div className="bg-white p-8 rounded-[48px] border border-yellow-50 shadow-2xl shadow-yellow-50 text-center space-y-6">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Tu progreso</p>
            <div className="flex justify-center gap-3">
              {Array.from({ length: selectedCommerce.starsGoal || 5 }).map((_, i) => (
                <Star key={i} size={36} className={(selectedMembership.currentStars || 0) > i ? 'text-yellow-500 fill-yellow-500 animate-in zoom-in' : 'text-slate-100'} style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
            <p className="text-lg font-black text-slate-900">Llevás {selectedMembership.currentStars || 0} de {selectedCommerce.starsGoal}</p>
            
            {starsReward && (
              <div className="p-4 bg-yellow-50 rounded-3xl border border-yellow-100">
                 <p className="text-[10px] font-black text-yellow-700 uppercase mb-1">Premio al completar</p>
                 <p className="text-base font-bold text-yellow-900">{starsReward.name}</p>
              </div>
            )}
          </div>
        )}

        {/* QR Section */}
        <div className="bg-slate-900 p-10 rounded-[56px] text-center space-y-8 shadow-2xl shadow-slate-200">
          <div className="space-y-2">
            <h3 className="font-black text-white text-sm uppercase tracking-widest">Código Personal</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Mostrá este código al pagar.</p>
          </div>
          <div className="inline-block p-6 bg-white rounded-[40px] shadow-inner">
            <QRCodeSVG value={selectedMembership.qrToken} size={180} level="H" includeMargin={false} fgColor="#0f172a" />
          </div>
          <div className="flex items-center justify-center gap-2 text-white/20 pt-2">
            <QrCode size={14} />
            <p className="text-[9px] font-black uppercase tracking-[0.3em]">ID: {selectedMembership.qrToken}</p>
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="space-y-4">
          <h3 className="font-black text-slate-900 text-lg px-4 flex items-center gap-2"><History size={20} className="text-slate-300" /> Actividad reciente</h3>
          <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden divide-y divide-slate-50">
            {transactions.slice(-5).reverse().map(t => (
              <div key={t.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-bold text-slate-800 text-sm">Visita registrada</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {new Date(t.createdAt).toLocaleDateString()}
                    {t.discountApplied ? ` • Cupón Aplicado` : ''}
                    {t.starsGained ? ` • +${t.starsGained} Estrella` : ''}
                  </p>
                </div>
                {selectedCommerce.enable_points && <div className="text-slate-900 font-black text-sm">+{t.points} pts</div>}
              </div>
            ))}
            {transactions.length === 0 && <div className="p-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">Sin movimientos</div>}
          </div>
        </div>

        <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100/50 flex items-start gap-4">
          <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500"><Info size={16} /></div>
          <div className="space-y-1">
             <p className="text-[11px] font-black text-blue-900 uppercase tracking-widest">¿Cómo funciona?</p>
             <p className="text-xs text-blue-700/70 font-medium leading-relaxed italic">"{selectedCommerce.ruleText || 'Seguís sumando beneficios con cada visita.'}"</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
