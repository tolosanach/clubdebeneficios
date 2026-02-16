import { addPointsByToken } from "../../services/loyalty";
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, QrCode, Search, Zap, Star, Gift, Sparkles, UserSearch, History } from 'lucide-react';
import QRScanner from '../../components/QRScanner';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Commerce, Customer, PointsMode, Transaction, SubscriptionStatus, Reward } from '../../types';

const ScanPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<'IDLE' | 'SCANNING' | 'CONFIRMING' | 'SUCCESS'>('IDLE');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [applyCoupon, setApplyCoupon] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [lastTx, setLastTx] = useState<Transaction | null>(null);
  const [entryMethod, setEntryMethod] = useState<'SCAN' | 'MANUAL'>('SCAN');

  const commerce = db.getById<Commerce>('commerces', user?.commerceId || '');
  const usage = commerce ? db.getCommerceUsage(commerce.id) : null;
  const rewards = commerce ? db.getRewardsByCommerce(commerce.id) : [];

  const isOverLimit = usage?.isOverLimit;

  useEffect(() => {
    if (location.state?.selectedCustomer) {
      setCustomer(location.state.selectedCustomer);
      setEntryMethod('MANUAL');
      setStep('CONFIRMING');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const calculatePoints = (val: number) => {
    if (!commerce || !commerce.enable_points) return 0;
    const ruleVal = commerce.pointsValue;
    if (commerce.pointsMode === PointsMode.PERCENTAGE) return Math.floor(val * (ruleVal / 100));
    return Math.floor(ruleVal);
  };

const handleScan = async (token: string) => {
  try {
    const found = db.getCustomerByToken(token);

    if (found && found.commerceId === user?.commerceId) {
      // sumar puntos en Supabase
      await addPointsByToken(token, 10);

      // actualizar cliente en pantalla
      setCustomer({
        ...found,
        totalPoints: found.totalPoints + 10
      });

      setStep('CONFIRMING');
    } else {
      alert('Socio no encontrado.');
    }
  } catch (error) {
    console.error(error);
    alert('Error al cargar puntos.');
  }
};


  const handleSubmit = () => {
    if (!customer || !commerce || !user) return;
    const numAmount = parseFloat(amount) || 0;

    const txPoints = commerce.enable_points ? calculatePoints(numAmount) : 0;
    const tx: Transaction = {
      id: crypto.randomUUID(),
      commerceId: commerce.id,
      customerId: customer.id,
      staffUserId: user.id,
      amount: numAmount,
      points: txPoints,
      method: entryMethod,
      createdAt: new Date().toISOString(),
      redeemedRewardId: selectedReward?.id
    };

    // 1. Lógica de Puntos
    if (commerce.enable_points) {
      tx.points_mode_used = commerce.pointsMode;
      tx.points_value_used = commerce.pointsValue;
      let finalPoints = (customer.totalPoints || 0) + txPoints;
      if (selectedReward && selectedReward.rewardType === 'POINTS') {
        finalPoints -= (selectedReward.pointsThreshold || 0);
      }
      db.update<Customer>('customers', customer.id, { totalPoints: finalPoints });
    }

    // 2. Lógica de Estrellas
    if (commerce.enable_stars) {
      tx.starsGained = 1;
      let newCurrentStars = (customer.currentStars || 0);
      if (selectedReward && selectedReward.rewardType === 'STARS') {
        newCurrentStars = Math.max(0, newCurrentStars - (selectedReward.starsThreshold || 0));
      } else {
        newCurrentStars += 1;
      }
      db.update<Customer>('customers', customer.id, {
        currentStars: newCurrentStars,
        totalStars: (customer.totalStars || 0) + 1
      });
    }

    // 3. Lógica de Cupón
    if (commerce.enable_coupon) {
      if (applyCoupon) tx.discountApplied = commerce.discountPercent;
      const nextExpiry = new Date();
      nextExpiry.setDate(nextExpiry.getDate() + (commerce.discountExpirationDays || 30));
      
      db.update<Customer>('customers', customer.id, {
        discountAvailable: true,
        discountExpiresAt: nextExpiry.toISOString(),
        lastDiscountUsedAt: applyCoupon ? new Date().toISOString() : customer.lastDiscountUsedAt
      });
      tx.couponGenerated = true;
    }

    db.insert('transactions', tx);
    db.incrementScanCount(commerce.id);
    setLastTx(tx);
    setStep('SUCCESS');
  };

  if (step === 'SCANNING') return <QRScanner onScan={handleScan} onClose={() => setStep('IDLE')} />;

  return (
    <div className="max-w-md mx-auto pb-10">
      <div className="flex items-center gap-4 mb-10 px-4">
        <button onClick={() => navigate('/commerce')} className="p-1.5 -ml-1.5 text-slate-400 hover:text-black"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold tracking-tight text-black">Registrar Venta</h1>
      </div>

      {step === 'IDLE' && (
        <div className="space-y-4 px-4">
          <div className="bg-white border border-[#eaeaea] p-10 rounded-[40px] shadow-sm flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-slate-50 text-slate-900 border border-[#eee]"><QrCode size={28} /></div>
            <h3 className="text-lg font-bold mb-2">Escanear Socio</h3>
            <p className="text-slate-400 mb-8 font-medium text-[13px]">Escaneá el QR del cliente para sumar beneficios.</p>
            <button 
              onClick={() => { setEntryMethod('SCAN'); setStep('SCANNING'); }} 
              disabled={isOverLimit}
              className="w-full py-4 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl disabled:opacity-20 transition-all"
            >
              Abrir Cámara
            </button>
          </div>
          <button onClick={() => navigate('/commerce/search-customer')} className="w-full py-5 bg-white border border-[#eaeaea] text-slate-400 rounded-[28px] font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
            <UserSearch size={18} /> Buscar por nombre o teléfono
          </button>
        </div>
      )}

      {step === 'CONFIRMING' && customer && (
        <div className="mx-4 bg-white p-8 rounded-[40px] border border-[#eaeaea] shadow-sm space-y-8 animate-in zoom-in-95">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-slate-50 mx-auto rounded-2xl flex items-center justify-center text-xl font-bold text-slate-300 border">{customer.name[0]}</div>
            <h3 className="text-xl font-black text-slate-900 leading-tight">{customer.name}</h3>
            
            <div className="grid grid-cols-2 gap-2">
              {commerce?.enable_points && (
                <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-400 uppercase">Saldo Puntos</p>
                  <p className="text-lg font-black text-indigo-700">{customer.totalPoints}</p>
                </div>
              )}
              {commerce?.enable_stars && (
                <div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-100">
                  <p className="text-[10px] font-black text-yellow-400 uppercase">Sellos</p>
                  <p className="text-lg font-black text-yellow-700">{customer.currentStars}/{commerce.starsGoal}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {commerce?.enable_coupon && customer.discountAvailable && (
              <button 
                onClick={() => setApplyCoupon(!applyCoupon)}
                className={`w-full py-4 px-6 rounded-2xl border-2 flex items-center justify-between transition-all ${applyCoupon ? 'bg-black border-black text-white' : 'bg-blue-50 border-blue-100 text-blue-600'}`}
              >
                <div className="flex items-center gap-3">
                  <Zap size={18} />
                  <span className="text-xs font-bold">Aplicar {commerce.discountPercent}% OFF</span>
                </div>
                {applyCoupon && <CheckCircle2 size={18} />}
              </button>
            )}

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Monto de Venta</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">$</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus className="w-full pl-10 pr-5 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-4xl font-black text-slate-900 outline-none focus:border-black transition-all" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button onClick={handleSubmit} disabled={!amount && !selectedReward} className="w-full py-5 bg-black text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
              Confirmar Operación
            </button>
            <button onClick={() => { setStep('IDLE'); setCustomer(null); }} className="w-full py-3 text-slate-300 font-black text-[10px] uppercase tracking-widest hover:text-black">Cancelar</button>
          </div>
        </div>
      )}

      {step === 'SUCCESS' && lastTx && customer && (
        <div className="mx-4 bg-white p-12 rounded-[40px] border border-[#eaeaea] shadow-sm text-center space-y-8 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 mx-auto rounded-[24px] flex items-center justify-center border border-emerald-100 shadow-sm"><CheckCircle2 size={36} /></div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">¡Impacto registrado!</h3>
            <p className="text-sm text-slate-500 font-medium">{customer.name.split(' ')[0]} ya recibió sus beneficios.</p>
            
            <div className="mt-8 space-y-2">
              {lastTx.points > 0 && (
                <div className="bg-indigo-50 text-indigo-600 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  <Sparkles size={14} /> +{lastTx.points} puntos sumados
                </div>
              )}
              {lastTx.starsGained && (
                <div className="bg-yellow-50 text-yellow-700 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  <Star size={14} fill="currentColor" /> +1 estrella sumada
                </div>
              )}
              {lastTx.couponGenerated && (
                <div className="bg-blue-50 text-blue-600 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  <Zap size={14} /> Cupón de descuento renovado
                </div>
              )}
              {lastTx.discountApplied && (
                <div className="bg-slate-900 text-white py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  <History size={14} /> Cupón {lastTx.discountApplied}% aplicado
                </div>
              )}
            </div>
          </div>
          <button onClick={() => { setStep('IDLE'); setAmount(''); setCustomer(null); }} className="w-full py-5 bg-black text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest shadow-xl">Siguiente venta</button>
        </div>
      )}
    </div>
  );
};

export default ScanPage;
