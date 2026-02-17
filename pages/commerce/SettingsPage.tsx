// pages/commerce/SettingsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Zap,
  Percent,
  BadgeDollarSign,
  Star,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { supabase } from '../../services/supabase';
import { Commerce, PointsMode, UserRole } from '../../types';

type UiErr = string;

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
  const [uiError, setUiError] = useState<UiErr>('');
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // -----------------------
  // Local form state (Puntos)
  // -----------------------
  const [enablePoints, setEnablePoints] = useState<boolean>(false);
  const [pointsMode, setPointsMode] = useState<PointsMode>(PointsMode.FIXED);
  const [pointsValue, setPointsValue] = useState<number>(10);

  // -----------------------
  // Local form state (Cupón)
  // -----------------------
  const [enableCoupon, setEnableCoupon] = useState<boolean>(false);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [discountExpirationDays, setDiscountExpirationDays] = useState<number>(30);

  // -----------------------
  // Local form state (Estrellas)  ✅ reintroducido
  // OJO: puede que tu tipo Commerce tenga estos campos o no.
  // Usamos (commerce as any) para no romper el build.
  // -----------------------
  const [enableStars, setEnableStars] = useState<boolean>(false);
  const [starsGoal, setStarsGoal] = useState<number>(10);

  // -----------------------
  // Local form state (Mapa / aparecer en listado) ✅ reintroducido
  // -----------------------
  const [showOnMap, setShowOnMap] = useState<boolean>(false);
  const [province, setProvince] = useState<string>('');
  const [locality, setLocality] = useState<string>('');

  // Helper: mapeo fila Supabase -> Commerce app
  const mapCommerceRowToApp = (c: any): Commerce => {
    return {
      id: c.id,
      name: c.name,
      logoUrl: c.logo_url ?? c.logoUrl,

      enable_points: !!c.enable_points,
      pointsMode: (c.points_mode ?? c.pointsMode ?? PointsMode.FIXED) as PointsMode,
      pointsValue: Number(c.points_value ?? c.pointsValue ?? 10),

      enable_coupon: !!c.enable_coupon,
      discountPercent: Number(c.discount_percent ?? c.discountPercent ?? 10),
      discountExpirationDays: Number(
        c.discount_expiration_days ?? c.discountExpirationDays ?? 30
      ),

      // ⭐ Estrellas (si existen en tu tabla)
      enable_stars: !!c.enable_stars,
      starsGoal: Number(c.stars_goal ?? c.starsGoal ?? 10),

      // 🗺️ Mapa (si existe)
      show_on_map: !!c.show_on_map,
      province: c.province ?? '',
      locality: c.locality ?? '',

      // Dejo pasar cualquier otro campo sin romper
      ...c,
    } as Commerce;
  };

  // Load commerce desde Supabase (con fallback a db)
  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        setUiError('');
        setLoading(true);

        if (!effectiveCommerceId) {
          if (alive) setCommerce(null);
          return;
        }

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

          // sync local db (si aplica)
          try {
            db.update<Commerce>('commerces', mapped.id, mapped);
          } catch {}
          return;
        }

        // fallback db local
        const local = db.getById<Commerce>('commerces', effectiveCommerceId);
        if (!alive) return;
        setCommerce(local ?? null);
      } catch (e: any) {
        console.error('Settings load error:', e);
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

    setEnablePoints(!!(commerce as any).enable_points);
    setPointsMode(((commerce as any).pointsMode ?? PointsMode.FIXED) as PointsMode);
    setPointsValue(Number((commerce as any).pointsValue ?? 10));

    setEnableCoupon(!!(commerce as any).enable_coupon);
    setDiscountPercent(Number((commerce as any).discountPercent ?? 10));
    setDiscountExpirationDays(Number((commerce as any).discountExpirationDays ?? 30));

    // ⭐ estrellas
    setEnableStars(!!(commerce as any).enable_stars);
    setStarsGoal(Number((commerce as any).starsGoal ?? 10));

    // 🗺️ mapa
    setShowOnMap(!!(commerce as any).show_on_map);
    setProvince(String((commerce as any).province ?? ''));
    setLocality(String((commerce as any).locality ?? ''));
  }, [commerce]);

  // -----------------------
  // Progreso de configuración (onboarding)
  // -----------------------
  const onboarding = useMemo(() => {
    const steps = [
      {
        key: 'points',
        label: 'Puntos configurados',
        done: !enablePoints || (enablePoints && Number(pointsValue) > 0),
      },
      {
        key: 'coupon',
        label: 'Cupón configurado',
        done:
          !enableCoupon ||
          (enableCoupon &&
            Number(discountPercent) > 0 &&
            Number(discountExpirationDays) > 0),
      },
      {
        key: 'stars',
        label: 'Estrellas configuradas',
        done: !enableStars || (enableStars && Number(starsGoal) > 0),
      },
      {
        key: 'map',
        label: 'Mapa configurado',
        done:
          !showOnMap ||
          (showOnMap &&
            String(province).trim().length > 1 &&
            String(locality).trim().length > 1),
      },
    ];

    const total = steps.length;
    const done = steps.filter((s) => s.done).length;
    const pct = Math.round((done / total) * 100);

    return { steps, total, done, pct };
  }, [
    enablePoints,
    pointsValue,
    enableCoupon,
    discountPercent,
    discountExpirationDays,
    enableStars,
    starsGoal,
    showOnMap,
    province,
    locality,
  ]);

  const handleSave = async () => {
    try {
      setUiError('');
      setSavedOk(false);

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

      // Payload “completo”
      // Si alguna columna NO existe en Supabase, te va a devolver error claro.
      const patch: any = {
        enable_points: enablePoints,
        points_mode: pointsMode,
        points_value: Number(pointsValue || 0),

        enable_coupon: enableCoupon,
        discount_percent: Number(discountPercent || 0),
        discount_expiration_days: Number(discountExpirationDays || 0),

        // ⭐ estrellas
        enable_stars: enableStars,
        stars_goal: Number(starsGoal || 0),

        // 🗺️ mapa/listado
        show_on_map: showOnMap,
        province: String(province || '').trim(),
        locality: String(locality || '').trim(),
      };

      console.log('Settings save patch:', patch);

      const { error } = await supabase
        .from('commerces')
        .update(patch)
        .eq('id', effectiveCommerceId);

      if (error) throw error;

      const updated: Commerce = {
        ...(commerce as any),
        enable_points: enablePoints,
        pointsMode,
        pointsValue: Number(pointsValue || 0),

        enable_coupon: enableCoupon,
        discountPercent: Number(discountPercent || 0),
        discountExpirationDays: Number(discountExpirationDays || 0),

        enable_stars: enableStars,
        starsGoal: Number(starsGoal || 0),

        show_on_map: showOnMap,
        province: String(province || '').trim(),
        locality: String(locality || '').trim(),
      } as Commerce;

      setCommerce(updated);

      try {
        db.update<Commerce>('commerces', updated.id, updated);
      } catch {}

      setSavedOk(true);
      // si querés navegar al dashboard al guardar:
      // navigate('/commerce');
    } catch (e: any) {
      console.error('Settings save error:', e);
      // Mensaje más útil para debug (ej: columna no existe / RLS)
      const msg =
        e?.message ||
        e?.error_description ||
        'Error al guardar configuración en Supabase.';
      setUiError(msg);
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
      <div className="flex items-center gap-4 mb-8 px-4">
        <button
          onClick={() => navigate('/commerce')}
          className="p-1.5 -ml-1.5 text-slate-400 hover:text-black"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black tracking-tight text-black">Configuración</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            {(commerce as any).name || 'Mi comercio'}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {uiError && (
          <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl p-3">
            {uiError}
          </div>
        )}

        {/* ✅ Barra de progreso */}
        <div className="bg-white border border-slate-100 rounded-[40px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Progreso de configuración
            </p>
            <p className="text-[11px] font-black text-slate-700">
              {onboarding.done}/{onboarding.total} ({onboarding.pct}%)
            </p>
          </div>

          <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
            <div
              className="h-full bg-black transition-all duration-700"
              style={{ width: `${onboarding.pct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {onboarding.steps.map((s) => (
              <div
                key={s.key}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-[11px] font-bold ${
                  s.done
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}
              >
                <CheckCircle2 size={14} className={s.done ? '' : 'opacity-30'} />
                <span className="leading-tight">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Points */}
        <div className="bg-white border border-slate-100 rounded-[40px] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Zap size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Puntos</p>
                <p className="text-[12px] text-slate-400 font-medium">
                  Sumá puntos por compras.
                </p>
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
                    {pointsMode === PointsMode.PERCENTAGE ? (
                      <Percent size={16} />
                    ) : (
                      <Zap size={16} />
                    )}
                  </div>
                  <input
                    type="number"
                    value={pointsValue}
                    onChange={(e) => setPointsValue(Number(e.target.value))}
                    disabled={!canEdit}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-slate-900 focus:border-black transition-all"
                    placeholder={
                      pointsMode === PointsMode.PERCENTAGE
                        ? 'Ej: 5 (5%)'
                        : 'Ej: 10 puntos'
                    }
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

        {/* Stars ✅ */}
        <div className="bg-white border border-slate-100 rounded-[40px] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-yellow-50 border border-yellow-100 flex items-center justify-center text-yellow-700">
                <Star size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Estrellas</p>
                <p className="text-[12px] text-slate-400 font-medium">
                  Sumá sellos por compra y canjeá un premio al completar la meta.
                </p>
              </div>
            </div>

            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enableStars}
                onChange={(e) => setEnableStars(e.target.checked)}
                disabled={!canEdit}
              />
              <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-black relative transition-all">
                <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all peer-checked:translate-x-5" />
              </div>
            </label>
          </div>

          {enableStars && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Meta de estrellas (sellos)
              </label>
              <input
                type="number"
                value={starsGoal}
                onChange={(e) => setStarsGoal(Number(e.target.value))}
                disabled={!canEdit}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-slate-900 focus:border-black transition-all"
                placeholder="10"
              />
              <p className="text-[11px] text-slate-400 font-medium">
                Ej: 10 = al juntar 10 estrellas, se desbloquea un beneficio.
              </p>
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
                <p className="text-[12px] text-slate-400 font-medium">
                  Generá un descuento disponible.
                </p>
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
                  onChange={(e) =>
                    setDiscountExpirationDays(Number(e.target.value))
                  }
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

        {/* Map / Listing ✅ */}
        <div className="bg-white border border-slate-100 rounded-[40px] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Aparecer en el mapa</p>
                <p className="text-[12px] text-slate-400 font-medium">
                  Mostrá tu comercio en el directorio para atraer nuevos clientes.
                </p>
              </div>
            </div>

            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showOnMap}
                onChange={(e) => setShowOnMap(e.target.checked)}
                disabled={!canEdit}
              />
              <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-black relative transition-all">
                <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all peer-checked:translate-x-5" />
              </div>
            </label>
          </div>

          {showOnMap && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Provincia
                </label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-slate-900 focus:border-black transition-all"
                  placeholder="La Pampa"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Localidad
                </label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-slate-900 focus:border-black transition-all"
                  placeholder="General Pico"
                />
              </div>

              <p className="text-[11px] text-slate-400 font-medium">
                Esto se usa para ubicar tu comercio en el mapa/directorio.
              </p>
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

        {savedOk && (
          <div className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
            ✅ Cambios guardados
          </div>
        )}

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
