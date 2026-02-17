// pages/commerce/ScanPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, QrCode, UserSearch, Home } from 'lucide-react'; // ✅ NUEVO: Home

import QRScanner from '../../components/QRScanner';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { supabase } from '../../services/supabase';

import { Commerce, Customer, PointsMode, Transaction, Reward } from '../../types';

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

  // ✅ evita doble click
  const [isSaving, setIsSaving] = useState(false);

  // ✅ mensaje visible si algo falla
  const [uiError, setUiError] = useState<string>('');

  // Convertimos commerce-cafe-id a commerce-1 igual que en CustomersPage y Dashboard:
  const effectiveCommerceId = useMemo(() => {
    const raw = user?.commerceId || '';
    return raw === 'commerce-cafe-id' ? 'commerce-1' : raw;
  }, [user?.commerceId]);

  // Sólo usamos db local para mostrar valores, pero no para “guardar”:
  const commerce = useMemo(() => {
    if (!effectiveCommerceId) return null;
    return db.getById<Commerce>('commerces', effectiveCommerceId);
  }, [effectiveCommerceId]);

  const usage = useMemo(() => {
    if (!commerce) return null;
    return db.getCommerceUsage(commerce.id);
  }, [commerce]);

  const isOverLimit = usage?.isOverLimit;

  // ✅ NUEVO: ruta única al dashboard (si mañana cambia, la tocás en un solo lugar)
  const DASHBOARD_PATH = '/commerce';

  // ✅ NUEVO: “volver” inteligente
  const goBackSmart = () => {
    // Si hay historial (o si venimos con un state), conviene volver atrás.
    // Si no, mandamos al dashboard para evitar quedar atrapado.
    if (window.history.length > 1 || location.state) navigate(-1);
    else navigate(DASHBOARD_PATH);
  };

  // ✅ NUEVO: ir al panel principal desde cualquier estado
  const goHome = () => navigate(DASHBOARD_PATH);

  useEffect(() => {
    if ((location.state as any)?.selectedCustomer) {
      setCustomer((location.state as any).selectedCustomer);
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

  // Normaliza el contenido del QR: extrae sólo el token (CUST-XXXX) aunque venga en una URL
  const normalizeToken = (raw: string) => {
    const s = String(raw || '').trim();
    const fromHashQ = s.split('#/q/')[1];
    if (fromHashQ) return fromHashQ.split(/[?#/]/)[0].trim();
    const fromSlashQ = s.split('/q/')[1];
    if (fromSlashQ) return fromSlashQ.split(/[?#/]/)[0].trim();
    const m = s.match(/(CUST-[A-Z0-9]+)/i);
    if (m?.[1]) return m[1].toUpperCase();
    return s.split(/[?#/]/)[0].trim();
  };

  // Convierte una fila de Supabase al tipo Customer
  const mapCustomerRowToApp = (c: any): Customer => ({
    id: c.id,
    commerceId: c.commerce_id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    qrToken: c.qr_token,
    totalPoints: c.total_points ?? 0,
    currentStars: c.current_stars ?? 0,
    totalStars: c.total_stars ?? 0,
    createdAt: c.created_at,
    discountAvailable: c.discount_available ?? false,
    discountExpiresAt: c.discount_expires_at ?? undefined,
    lastDiscountUsedAt: c.last_discount_used_at ?? undefined,
    phoneNumber: c.phone_number ?? '',
    countryCode: c.country_code ?? 'AR',
  });

  // Busca un cliente por token, con commerce_id incluido
  const fetchCustomerByToken = async (tokenRaw: string) => {
    const token = normalizeToken(tokenRaw);
    if (!token || !effectiveCommerceId) return null;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('qr_token', token)
      .eq('commerce_id', effectiveCommerceId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCustomerRowToApp(data) : null;
  };

  // Actualiza el cliente en Supabase (por ejemplo, sus puntos)
  const updateCustomerSupabase = async (customerId: string, patch: any) => {
    if (!effectiveCommerceId) throw new Error('Missing effectiveCommerceId');

    const { error } = await supabase
      .from('customers')
      .update(patch)
      .eq('id', customerId)
      .eq('commerce_id', effectiveCommerceId);

    if (error) throw error;
  };

  // Inserta transacción y fuerza error si algo bloquea
  const insertTransactionSupabase = async (tx: Transaction) => {
    const payload: any = {
      id: tx.id,
      commerce_id: tx.commerceId,
      customer_id: tx.customerId,
      staff_user_id: tx.staffUserId,
      amount: tx.amount,
      points: tx.points,
      method: tx.method,
      created_at: tx.createdAt,
      redeemed_reward_id: tx.redeemedRewardId ?? null,
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single()
      .throwOnError();

    if (error) throw error;
    return data;
  };

  const handleScan = async (tokenRaw: string) => {
    try {
      setUiError('');

      if (!user || !effectiveCommerceId) return;

      const token = normalizeToken(tokenRaw);
      const found = await fetchCustomerByToken(token);

      if (!found) {
        setUiError('Socio no encontrado.');
        return;
      }

      setCustomer(found);
      setEntryMethod('SCAN');
      setStep('CONFIRMING');
    } catch (error) {
      console.error(error);
      setUiError('Error al leer el socio.');
    }
  };

  const handleSubmit = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      setUiError('');

      if (!customer || !user || !effectiveCommerceId) {
        setUiError('Falta cliente o sesión. Volvé a escanear.');
        return;
      }

      const numAmount = parseFloat(amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        setUiError('Ingresá un monto válido (mayor a 0).');
        return;
      }

      const txPoints = commerce && commerce.enable_points ? calculatePoints(numAmount) : 0;

      const tx: Transaction = {
        id: crypto.randomUUID(),
        commerceId: effectiveCommerceId,
        customerId: customer.id,
        staffUserId: user.id,
        amount: numAmount,
        points: txPoints,
        method: entryMethod,
        createdAt: new Date().toISOString(),
        redeemedRewardId: selectedReward?.id,
      };

      // patch puntos / estrellas / cupón
      const patch: any = {};

      if (commerce?.enable_points) {
        let finalPoints = customer.totalPoints || 0;
        finalPoints += txPoints;

        if (selectedReward && (selectedReward as any).rewardType === 'POINTS') {
          finalPoints -= (selectedReward as any).pointsThreshold || 0;
          finalPoints = Math.max(0, finalPoints);
        }

        patch.total_points = finalPoints;
      }

      if (commerce?.enable_stars) {
        let newCurrent = customer.currentStars || 0;
        let newTotal = customer.totalStars || 0;

        if (selectedReward && (selectedReward as any).rewardType === 'STARS') {
          newCurrent = Math.max(0, newCurrent - ((selectedReward as any).starsThreshold || 0));
        } else {
          newCurrent += 1;
          newTotal += 1;
        }

        patch.current_stars = newCurrent;
        patch.total_stars = newTotal;
      }

      if (commerce?.enable_coupon) {
        const nextExpiry = new Date();
        nextExpiry.setDate(nextExpiry.getDate() + (commerce.discountExpirationDays || 30));
        patch.discount_available = true;
        patch.discount_expires_at = nextExpiry.toISOString();
        patch.last_discount_used_at = applyCoupon
          ? new Date().toISOString()
          : (customer as any).lastDiscountUsedAt ?? null;
      }

      if (Object.keys(patch).length > 0) {
        await updateCustomerSupabase(customer.id, patch);
      }

      await insertTransactionSupabase(tx);

      const refreshed = await fetchCustomerByToken(customer.qrToken);
      if (refreshed) setCustomer(refreshed);

      setLastTx(tx);
      setStep('SUCCESS');
    } catch (error: any) {
      console.error('HANDLE_SUBMIT ERROR', error);
      setUiError('No se pudo registrar la venta. Probá de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToIdle = () => {
    setUiError('');
    setCustomer(null);
    setAmount('');
    setApplyCoupon(false);
    setSelectedReward(null);
    setLastTx(null);
    setEntryMethod('SCAN');
    setStep('IDLE');
  };

  if (step === 'SCANNING') return <QRScanner onScan={handleScan} onClose={() => setStep('IDLE')} />;

  return (
    <div className="max-w-md mx-auto pb-10">
      {/* ✅ Header mejorado con Home + Title clickeable */}
      <div className="flex items-center justify-between gap-4 mb-10 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goBackSmart} // ✅ NUEVO
            className="p-1.5 -ml-1.5 text-slate-400 hover:text-black"
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>

          {/* ✅ NUEVO: título clickeable (equivalente a “logo clickeable”) */}
          <button
            onClick={goHome}
            className="text-left"
            aria-label="Ir al panel principal"
          >
            <h1 className="text-xl font-bold tracking-tight text-black hover:opacity-80">
              Registrar Venta
            </h1>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-300 -mt-0.5">
              Panel principal
            </p>
          </button>
        </div>

        {/* ✅ NUEVO: botón Inicio explícito */}
        <button
          onClick={goHome}
          className="px-3 py-2 rounded-2xl border border-[#eaeaea] bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
          aria-label="Inicio"
        >
          <Home size={16} />
          Inicio
        </button>
      </div>

      {step === 'IDLE' && (
        <div className="space-y-4 px-4">
          <div className="bg-white border border-[#eaeaea] p-10 rounded-[40px] shadow-sm flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-slate-50 text-slate-900 border border-[#eee]">
              <QrCode size={28} />
            </div>

            <h3 className="text-lg font-bold mb-2">Escanear Socio</h3>
            <p className="text-slate-400 mb-6 font-medium text-[13px]">
              Escaneá el QR del cliente para sumar beneficios.
            </p>

            {uiError && (
              <div className="w-full text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl p-3 mb-4">
                {uiError}
              </div>
            )}

            <button
              onClick={() => {
                setUiError('');
                setEntryMethod('SCAN');
                setStep('SCANNING');
              }}
              disabled={isOverLimit}
              className="w-full py-4 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl disabled:opacity-20 transition-all"
            >
              Abrir Cámara
            </button>
          </div>

          <button
            onClick={() => navigate('/commerce/search-customer')}
            className="w-full py-5 bg-white border border-[#eaeaea] text-slate-400 rounded-[28px] font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
          >
            <UserSearch size={18} /> Buscar por nombre o teléfono
          </button>
        </div>
      )}

      {step === 'CONFIRMING' && customer && (
        <div className="mx-4 bg-white p-8 rounded-[40px] border border-[#eaeaea] shadow-sm space-y-6 animate-in zoom-in-95">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-slate-50 mx-auto rounded-2xl flex items-center justify-center text-xl font-bold text-slate-300 border">
              {customer.name?.[0] || 'S'}
            </div>
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
                  <p className="text-lg font-black text-yellow-700">{customer.currentStars}</p>
                </div>
              )}
            </div>
          </div>

          {commerce?.enable_coupon && customer.discountAvailable && (
            <button
              onClick={() => setApplyCoupon(!applyCoupon)}
              className={`w-full py-4 px-6 rounded-2xl border-2 flex items-center justify-between transition-all ${
                applyCoupon ? 'bg-black border-black text-white' : 'bg-blue-50 border-blue-100 text-blue-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-black text-[11px] uppercase tracking-widest">
                  {applyCoupon ? 'Cupón aplicado' : 'Aplicar cupón'}
                </span>
              </div>
              <span className="text-xs font-black">{applyCoupon ? 'SI' : 'NO'}</span>
            </button>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Monto</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Ej: 12000"
              className="w-full border border-[#eaeaea] rounded-2xl px-4 py-4 text-lg font-black outline-none"
            />
          </div>

          {uiError && (
            <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl p-3">
              {uiError}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full py-4 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl disabled:opacity-40 transition-all"
          >
            {isSaving ? 'Registrando...' : 'Confirmar operación'}
          </button>

          <button
            onClick={resetToIdle}
            className="w-full py-4 bg-white border border-[#eaeaea] text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest"
          >
            Cancelar / Volver
          </button>
        </div>
      )}

      {step === 'SUCCESS' && (
        <div className="mx-4 bg-white p-8 rounded-[40px] border border-[#eaeaea] shadow-sm space-y-6 text-center animate-in zoom-in-95">
          <div className="w-14 h-14 bg-green-50 mx-auto rounded-2xl flex items-center justify-center border border-green-100">
            <CheckCircle2 className="text-green-600" />
          </div>

          <h3 className="text-2xl font-black text-slate-900">¡Impacto registrado!</h3>
          <p className="text-slate-500 font-medium">{customer?.name || 'El cliente'} ya recibió sus beneficios.</p>

          <button
            onClick={resetToIdle}
            className="w-full py-5 bg-black text-white rounded-[28px] font-black text-[11px] uppercase tracking-widest shadow-xl"
          >
            Siguiente venta
          </button>

          {/* ✅ NUEVO: acceso rápido al panel desde éxito */}
          <button
            onClick={goHome}
            className="w-full py-5 bg-white border border-[#eaeaea] text-slate-700 rounded-[28px] font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Volver al panel
          </button>

          {lastTx && (
            <div className="text-xs text-slate-400">
              Monto: <b>{lastTx.amount}</b> — Puntos: <b>{lastTx.points}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScanPage;
