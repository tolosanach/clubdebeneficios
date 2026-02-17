// pages/commerce/SettingsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Zap, Percent, BadgeDollarSign } from 'lucide-react';

import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { supabase } from '../../services/supabase';
import { Commerce, PointsMode, UserRole } from '../../types';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ✅ MISMO MAPEO QUE EN Customers/Dashboard/Scan
  const effectiveCommerceId = useMemo(() => {
    const raw = user?.commerceId || '';
    return raw === 'commerce-cafe-id' ? 'commerce-1' : raw;
  }, [user?.commerceId]);

  const canEdit = useMemo(() => {
    return [UserRole.COMMERCE_OWNER, UserRole.STAFF_MANAGER].includes(
      user?.role || UserRole.VIEWER
    );
  }, [user?.role]);

  // -----------------------
  // Estado remoto (Supabase) + fallback local (db)
  // -----------------------
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [loading, setLoading] = useState(true);
  const [uiError, setUiError] = useState<string>('');

  // -----------------------
  // Local form state
  // -----------------------
  const [enablePoints, setEnablePoints] = useState<boolean>(false);
  const [pointsMode, setPointsMode] = useState<PointsMode>(PointsMode.FIXED);
  const [pointsValue, setPointsValue] = useState<number>(10);

  const [enableCoupon, setEnableCoupon] = useState<boolean>(false);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [discountExpirationDays, setDiscountExpirationDays] = useState<number>(30);

  const [saving, setSaving] = useState(false);

  // Helper: mapeo fila Supabase -> Commerce app
  const mapCommerceRowToApp = (c: any): Commerce => {
    // OJO: adapto nombres típicos de columnas. Si tu tabla usa otros nombres,
    // avisame cuáles y lo ajusto en 1 minuto.
    return {
      id: c.id,
      name: c.name,
      logoUrl: c.logo_url ?? c.logoUrl,
      enable_points: !!c.enable_points,
      pointsMode: (c.points_mode ?? c.pointsMode ?? PointsMode.FIXED) as PointsMode,
      pointsValue: Number(c.points_value ?? c.pointsValue ?? 10),

      enable_coupon: !!c.enable_coupon,
      discountPercent: Number(c.discount_percent ?? c.discountPercent ?? 10),
      discountExpirationDays: Number(c.discount_expiration_days ?? c.discountExpirationDays ?? 30),

      // Dejo pasar cualquier otro campo que tu tipo Commerce tenga sin romper
      ...c,
    } as Commerce;
  };

  // Load commerce desde Supabase (con fallback a db si no existe o falla)
  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        setUiError('');
        setLoading(true);

        if (!effectiveCommerceId) {
          // fallback
          const local = null;
          if (alive) setCommerce(local);
          return;
        }

        // 1) Intento Supabase
        const { data, error } = await supabase
          .from('commerces')
          .select('*')
          .eq('id', effectiveCommerceId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const mapped = mapCommerceRowToApp(data);
          if (!alive) return;
          setCommerce(mapped);

          // Mantengo db “sincronizado” por si otras pantallas aún lo leen
          try {
            db.update<Commerce>('commerces', mapped.id, mapped);
          } catch {
            // si tu db es read-only o no existe en prod, lo ignoramos
          }
          return;
        }

        // 2) Fallback db local
        const local = db.getById<Commerce>('commerces', effectiveCommerceId);
        if (!alive) return;
        setCommerce(local ?? null);
      } catch (e: any) {
        console.error('Settings load error:', e);
        // fallback db local
        try {
          const local = effectiveCommerceId
            ? db.getById<Commerce>('commerces', effectiveCommerceId)
            : null;
          if (alive) setCommerce(local ?? null);
        } catch {
          if (alive) setCommerce(null);
        }
        if (alive) setUiError('No se pudo cargar la configuración desde Supabase.');
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [effectiveCommerceId]);

  // hydrate form desde commerce
  useEffect(() => {
    if (!commerce) return;

    setEnablePoints(!!commerce.enable_points);
    setPointsMode((commerce.pointsMode ?? PointsMode.FIXED) as PointsMode);
    setPointsValue(Number(commerce.pointsValue ?? 10));

    setEnableCoupon(!!commerce.enable_coupon);
    setDiscountPercent(Number(commerce.discountPercent ?? 10));
    setDiscountExpirationDays(Number(commerce.discountExpirationDays ?? 30));
  }, [commerce]);

  const handleSave = async () => {
    try {
      setUiError('');

      if (!commerce) return;
      if (!canEdit) {
        setUiError('No tenés permisos para editar la configuración.');
        return;
      }
      if (!effectiveCommerceId) {
        setUiError('CommerceId vacío. No se puede guardar.');
        return;
      }

      setSaving(true);

      // Payload Supabase (ajustá nombres si tu tabla usa otros)
      const patch = {
        enable_points: enablePoints,
        points_mode: pointsMode,
        points_value: Number(pointsValue || 0),

        enable_coupon: enableCoupon,
        discount_percent: Number(discountPercent || 0),
        discount_expiration_days: Number(discountExpirationDays || 0),
      };

      const { error } = await supabase
        .from('commerces')
        .update(patch)
        .eq('id', effectiveCommerceId);

      if (error) throw error;

      // Actualizo estado local + db local
      const updated: Commerce = {
        ...commerce,
        enable_points: enablePoints,
        pointsMode,
        pointsValue: Number(pointsValue || 0),
        enable_coupon: enableCoupon,
        discountPercent: Number(discountPercent || 0),
        discountExpirationDays: Number(discountExpirationDays || 0),
      };

      setCommerce(updated);
      try {
        db.update<Commerce>('commerces', updated.id, updated);
      } catch {}

      navigate('/commerce');
    } catch (e: any) {
      console.error('Settings save error:', e);
      setUiError('Error al guardar configuración en Supabase.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/commerce')}
            className="p-1.5 -ml-1.5 text-slate-400 hover:text-black"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black">Configuración</h1>
        </div>
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 text-center text-slate-400">
          Cargando…
        </div>
      </div>
    );
  }

  if (!commerce) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/commerce')}
            className="p-1.5 -ml-1.5 text-slate-400 hover:text-black"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black">Configuración</h1>
        </div>

        <div className="bg-white border border-slate-100 rounded-[32px] p-8 text-center text-slate-400">
          No se encontró el comercio (commerceId vacío o inexistente).
        </div>

        {uiError && (
          <div className="mt-4 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl p-3">
            {uiError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 px-4">
        <button
          onClick={() => navigate('/commerce')}
          className="p-1.5 -ml-1.5 text-slate-400 hover:text-black"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black tracking-tight text-black">Configuración</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            {commerce.name || 'Mi comercio'}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {uiError && (
          <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl p-3">
            {uiError}
          </div>
        )}

        {/* Points */}
        <div className="bg-white border border-slate-100 rounded-[40px] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Zap size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Puntos</p>
                <p className="text-[12px] text-slate-400 font-medium">Sumá puntos por compras.</p>
              </div>
            </div>

            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enablePoints}
                onChange={(e) => setEnablePoints(e.target.checked)}
                disabled={!canEdit}
              />
              <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-black relative transition-all">
                <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all peer-checked:translate-x-5" />
              </div>
            </label>
          </div>

          {enablePoints && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Modo de cálculo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPointsMode(PointsMode.FIXED)}
                    disabled={!canEdit}
                    className={`py-4 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                      pointsMode === PointsMode.FIXED
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Fijo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsMode(PointsMode.PERCENTAGE)}
                    disabled={!canEdit}
                    className={`py-4 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                      pointsMode === PointsMode.PERCENTAGE
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Porcentaje
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Valor
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                    {pointsMode === PointsMode.PERCENTAGE ? <Percent size={16} /> : <Zap size={16} />}
                  </div>
                  <input
                    type="number"
                    value={pointsValue}
                    onChange={(e) => setPointsValue(Number(e.target.value))}
                    disabled={!canEdit}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-slate-900 focus:border-black transition-all"
                    placeholder={pointsMode === PointsMode.PERCENTAGE ? 'Ej: 5 (5%)' : 'Ej: 10 puntos'}
                  />
                </div>

                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  {pointsMode === PointsMode.PERCENTAGE
                    ? 'Se calcula como % del monto (redondeado). Ej: 5 = 5% del monto.'
                    : 'Se suma un valor fijo por operación. Ej: 10 = 10 puntos por compra.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Coupon */}
        <div className="bg-white border border-slate-100 rounded-[40px] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <BadgeDollarSign size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Cupón</p>
                <p className="text-[12px] text-slate-400 font-medium">Generá un descuento disponible.</p>
              </div>
            </div>

            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enableCoupon}
                onChange={(e) => setEnableCoupon(e.target.checked)}
                disabled={!canEdit}
              />
              <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-black relative transition-all">
                <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all peer-checked:translate-x-5" />
              </div>
            </label>
          </div>

          {enableCoupon && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  % de descuento
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <Percent size={16} />
                  </div>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    disabled={!canEdit}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-slate-900 focus:border-black transition-all"
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Vence en (días)
                </label>
                <input
                  type="number"
                  value={discountExpirationDays}
                  onChange={(e) => setDiscountExpirationDays(Number(e.target.value))}
                  disabled={!canEdit}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-slate-900 focus:border-black transition-all"
                  placeholder="30"
                />
                <p className="text-[11px] text-slate-400 font-medium">
                  Ej: 30 = el cupón vence a los 30 días desde que se genera.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canEdit || saving}
          className="w-full py-5 bg-black text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest shadow-xl disabled:opacity-30 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Save size={16} />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>

        {!canEdit && (
          <p className="text-center text-[11px] text-slate-400 font-medium">
            Tu usuario no tiene permisos para editar ajustes.
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
