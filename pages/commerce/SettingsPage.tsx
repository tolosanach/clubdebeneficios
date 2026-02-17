import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Star,
  Zap,
  Gift,
  Eye,
  AlertCircle,
  Plus,
  AlertTriangle,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Commerce, PointsMode, Reward } from '../../types';

const COUPON_RULE_TEXT = 'Válido para tu próxima compra.';

const StatusBadge: React.FC<{ isConfigured: boolean }> = ({ isConfigured }) => (
  <div
    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
      isConfigured
        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
        : 'bg-slate-100 text-slate-400 border border-transparent'
    }`}
  >
    {isConfigured ? (
      <>
        <CheckCircle2 size={10} strokeWidth={2.5} /> Listo
      </>
    ) : (
      'Pendiente'
    )}
  </div>
);

const AccordionStep: React.FC<{
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
  isOpen: boolean;
  isConfigured: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ number, title, description, icon: Icon, isOpen, isConfigured, onClick, children }) => (
  <div
    className={`border rounded-[24px] transition-all duration-300 ${
      isOpen
        ? 'bg-white border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] z-10'
        : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
    }`}
  >
    <button type="button" onClick={onClick} className="w-full p-6 sm:p-7 flex items-center justify-between text-left transition-all">
      <div className="flex items-center gap-4 sm:gap-5">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
            isOpen ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
          }`}
        >
          <Icon size={20} strokeWidth={isOpen ? 2.5 : 2} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-0.5">
            <h3 className={`text-[16px] font-semibold transition-colors ${isOpen ? 'text-slate-900' : 'text-slate-700'}`}>
              {title}
            </h3>
            <StatusBadge isConfigured={isConfigured} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-slate-400">Paso {number}</span>
            <span className="text-slate-200">•</span>
            <p className="text-[11px] text-slate-400 font-normal">{description}</p>
          </div>
        </div>
      </div>
      <div className={`transition-colors ${isOpen ? 'text-slate-900' : 'text-slate-300'}`}>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
    </button>

    {isOpen && (
      <div className="px-6 sm:px-10 pb-10 pt-2 animate-in fade-in slide-in-from-top-1 duration-300">
        <div className="h-px bg-slate-100 mb-8 w-full" />
        {children}
      </div>
    )}
  </div>
);

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [allRewards, setAllRewards] = useState<Reward[]>([]);
  const [activeBenefitsCount, setActiveBenefitsCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [openSection, setOpenSection] = useState<number>(1);
  const [overrideLock, setOverrideLock] = useState(false);

  // Mecanismos
  const [enablePoints, setEnablePoints] = useState(false);
  const [enableStars, setEnableStars] = useState(false);
  const [enableCoupon, setEnableCoupon] = useState(false);
  const [mechError, setMechError] = useState('');

  // Valores
  const [name, setName] = useState('');
  const [pointsMode, setPointsMode] = useState<PointsMode>(PointsMode.PERCENTAGE);
  const [pointsValue, setPointsValue] = useState(10);

  const [discountPercent, setDiscountPercent] = useState(10);
  const [ruleText, setRuleText] = useState(COUPON_RULE_TEXT);

  // Publicidad
  const [publicListed, setPublicListed] = useState(false);
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (!user?.commerceId) return;

    const data = db.getById<Commerce>('commerces', user.commerceId);
    const rewards = db.getAll<Reward>('rewards').filter(r => r.commerceId === user.commerceId);
    const activeCount = db.getActiveBenefitsCount(user.commerceId);

    setAllRewards(rewards);
    setActiveBenefitsCount(activeCount);

    if (data) {
      setCommerce(data);
      setName(data.name || '');
      setEnablePoints(!!data.enable_points);
      setEnableStars(!!data.enable_stars);
      setEnableCoupon(!!data.enable_coupon);
      setPointsMode((data.pointsMode as PointsMode) || PointsMode.PERCENTAGE);
      setPointsValue(data.pointsValue || 10);
      setDiscountPercent(data.discountPercent || 10);

      // Texto fijo (no editable)
      setRuleText(COUPON_RULE_TEXT);

      setPublicListed(!!data.public_listed);
      setProvince(data.province || '');
      setCity(data.city || '');
    }
  }, [user]);

  // Si activan cupón, forzamos texto fijo siempre
  useEffect(() => {
    if (enableCoupon) setRuleText(COUPON_RULE_TEXT);
  }, [enableCoupon]);

  const isLocked = useMemo(() => activeBenefitsCount > 0 && !overrideLock, [activeBenefitsCount, overrideLock]);

  const handleMechToggle = (type: 'P' | 'S' | 'C') => {
    if (isLocked) return;

    if (type === 'P') {
      if (!enablePoints && enableStars) {
        setMechError('Elegí solo uno: Puntos o Estrellas. Podés combinar cualquiera con Cupón.');
        return;
      }
      setEnablePoints(!enablePoints);
    }

    if (type === 'S') {
      if (!enableStars && enablePoints) {
        setMechError('Elegí solo uno: Puntos o Estrellas. Podés combinar cualquiera con Cupón.');
        return;
      }
      setEnableStars(!enableStars);
    }

    if (type === 'C') setEnableCoupon(!enableCoupon);

    setMechError('');
  };

  const filteredPointsRewards = useMemo(() => allRewards.filter(r => r.rewardType === 'POINTS'), [allRewards]);
  const filteredStarsRewards = useMemo(() => allRewards.filter(r => r.rewardType === 'STARS'), [allRewards]);

  const isDirty = useMemo(() => {
    if (!commerce) return false;

    // ruleText NO cuenta porque es fijo
    return (
      name !== commerce.name ||
      enablePoints !== commerce.enable_points ||
      enableStars !== commerce.enable_stars ||
      enableCoupon !== commerce.enable_coupon ||
      pointsMode !== commerce.pointsMode ||
      pointsValue !== commerce.pointsValue ||
      discountPercent !== commerce.discountPercent ||
      publicListed !== (commerce.public_listed || false) ||
      province !== (commerce.province || '') ||
      city !== (commerce.city || '')
    );
  }, [commerce, name, enablePoints, enableStars, enableCoupon, pointsMode, pointsValue, discountPercent, publicListed, province, city]);

  const pointsExampleText = useMemo(() => {
    const purchase = 10000;
    if (!enablePoints) return '';
    if (pointsMode === PointsMode.PERCENTAGE) {
      const pts = Math.floor(purchase * ((pointsValue || 0) / 100));
      return `Ejemplo: si el cliente compra $${purchase.toLocaleString('es-AR')} y tenés ${pointsValue}% de acumulación, suma ${pts.toLocaleString('es-AR')} puntos.`;
    }
    const pts = Math.floor(pointsValue || 0);
    return `Ejemplo: si el cliente compra $${purchase.toLocaleString('es-AR')}, suma ${pts.toLocaleString('es-AR')} puntos (puntos fijos por compra).`;
  }, [enablePoints, pointsMode, pointsValue]);

  const handleSave = async () => {
    if (!user?.commerceId || !isDirty) return;

    if (!enablePoints && !enableStars && !enableCoupon) {
      setMechError('Activá al menos un mecanismo para continuar.');
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const newVersion = overrideLock ? (commerce?.configVersion || 1) + 1 : (commerce?.configVersion || 1);

    db.update<Commerce>('commerces', user.commerceId, {
      name,
      enable_points: enablePoints,
      enable_stars: enableStars,
      enable_coupon: enableCoupon,

      pointsMode,
      pointsValue,

      discountPercent,
      // Texto fijo
      ruleText: COUPON_RULE_TEXT,

      public_listed: publicListed,
      province,
      city,

      configVersion: newVersion,
    });

    setSaveSuccess(true);
    setOverrideLock(false);
    setTimeout(() => setSaveSuccess(false), 2500);
    setLoading(false);

    setActiveBenefitsCount(db.getActiveBenefitsCount(user.commerceId));
  };

  if (!commerce) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-56 animate-in fade-in duration-700">
      <div className="space-y-1.5 px-2">
        <h1 className="text-[28px] font-semibold text-slate-800 tracking-tight">Configuración del Club</h1>
        <p className="text-slate-400 text-sm">Gestioná cómo interactúan tus socios con tu negocio.</p>
      </div>

      {activeBenefitsCount > 0 && (
        <div
          className={`mx-2 p-6 rounded-[32px] border-2 transition-all ${
            isLocked ? 'bg-amber-50 border-amber-100 shadow-xl shadow-amber-500/5' : 'bg-blue-50 border-blue-100 shadow-xl shadow-blue-500/5'
          }`}
        >
          <div className="flex gap-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${isLocked ? 'bg-white text-amber-600 border-amber-200' : 'bg-white text-blue-600 border-blue-200'}`}>
              {isLocked ? <Lock size={20} /> : <Zap size={20} />}
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <h4 className={`text-[15px] font-black uppercase tracking-tight ${isLocked ? 'text-amber-800' : 'text-blue-800'}`}>
                  {isLocked ? 'Campos Protegidos' : 'Nueva Campaña en edición'}
                </h4>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${isLocked ? 'bg-white text-amber-600 border-amber-200' : 'bg-white text-blue-600 border-blue-200'}`}>
                  {activeBenefitsCount} BENEFICIOS ACTIVOS
                </span>
              </div>

              <p className={`text-sm leading-relaxed font-medium ${isLocked ? 'text-amber-700/80' : 'text-blue-700/80'}`}>
                {isLocked
                  ? 'No podés cambiar las reglas críticas porque hay beneficios vigentes. Esto evita modificar condiciones ya notificadas a tus clientes.'
                  : 'Estás creando una nueva versión de reglas. Lo ya emitido mantendrá sus condiciones originales hasta su vencimiento.'}
              </p>

              <div className="flex items-center gap-4 pt-2">
                <button onClick={() => navigate('/commerce/customers')} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${isLocked ? 'text-amber-900 hover:opacity-70' : 'text-blue-900 hover:opacity-70'}`}>
                  Ver beneficios <ArrowRight size={12} />
                </button>

                {isLocked && (
                  <button onClick={() => setOverrideLock(true)} className="px-4 py-2 bg-amber-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-900/20 active:scale-95 transition-all">
                    Crear nueva campaña
                  </button>
                )}

                {!isLocked && overrideLock && (
                  <button onClick={() => setOverrideLock(false)} className="text-[10px] font-black uppercase tracking-widest text-blue-900/40 hover:text-blue-900 transition-colors">
                    Cancelar edición
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <AccordionStep
          number={1}
          title="Datos del negocio"
          description="Nombre y marca comercial"
          icon={Building2}
          isOpen={openSection === 1}
          isConfigured={!!name}
          onClick={() => setOpenSection(1)}
        >
          <div className="space-y-4 max-w-xl">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Nombre comercial</label>
            <input
              type="text"
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:border-black transition-all"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        </AccordionStep>

        <AccordionStep
          number={2}
          title="Mecanismos activos"
          description="Elegí qué programas activar"
          icon={Sparkles}
          isOpen={openSection === 2}
          isConfigured={enablePoints || enableStars || enableCoupon}
          onClick={() => setOpenSection(2)}
        >
          <div className="space-y-8">
            <div className={`grid gap-3 transition-opacity ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
              <button
                onClick={() => handleMechToggle('C')}
                className={`p-6 rounded-[28px] border text-left flex items-center justify-between transition-all ${
                  enableCoupon ? 'bg-white border-blue-600 ring-4 ring-blue-50' : 'bg-slate-50 border-transparent hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-2xl ${enableCoupon ? 'bg-blue-600 text-white' : 'bg-white text-slate-300 border'}`}>
                    <Zap size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 leading-none mb-1">Cupón de Descuento</h4>
                    <p className="text-[11px] text-slate-400 font-medium italic">Ofrecé un descuento para la próxima compra.</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${enableCoupon ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                  {enableCoupon && <CheckCircle2 size={14} className="text-white" />}
                </div>
              </button>

              <button
                onClick={() => handleMechToggle('P')}
                className={`p-6 rounded-[28px] border text-left flex items-center justify-between transition-all ${
                  enablePoints ? 'bg-white border-indigo-600 ring-4 ring-indigo-50' : 'bg-slate-50 border-transparent hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-2xl ${enablePoints ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300 border'}`}>
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 leading-none mb-1">Programa de Puntos</h4>
                    <p className="text-[11px] text-slate-400 font-medium italic">Acumulá puntos según compras para canjear premios.</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${enablePoints ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                  {enablePoints && <CheckCircle2 size={14} className="text-white" />}
                </div>
              </button>

              <button
                onClick={() => handleMechToggle('S')}
                className={`p-6 rounded-[28px] border text-left flex items-center justify-between transition-all ${
                  enableStars ? 'bg-white border-yellow-600 ring-4 ring-yellow-50' : 'bg-slate-50 border-transparent hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-2xl ${enableStars ? 'bg-yellow-600 text-white' : 'bg-white text-slate-300 border'}`}>
                    <Star size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 leading-none mb-1">Tarjeta de Estrellas</h4>
                    <p className="text-[11px] text-slate-400 font-medium italic">Sumá estrellas por visitas para desbloquear premios.</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${enableStars ? 'bg-yellow-600 border-yellow-600' : 'border-slate-300'}`}>
                  {enableStars && <CheckCircle2 size={14} className="text-white" />}
                </div>
              </button>
            </div>

            {mechError && (
              <div className="flex items-center gap-2 text-rose-600 p-4 bg-rose-50 rounded-2xl animate-in slide-in-from-top-2 border border-rose-100">
                <AlertCircle size={18} />
                <p className="text-xs font-bold">{mechError}</p>
              </div>
            )}

            <div className="space-y-10 pt-6 border-t border-slate-50">
              {enableCoupon && (
                <div className="space-y-4 animate-in fade-in">
                  <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Configuración Cupón</h5>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Valor del Descuento (%)</label>
                      <input
                        type="number"
                        disabled={isLocked}
                        className={`w-full h-11 px-4 bg-slate-50 border rounded-xl font-black text-slate-800 transition-opacity ${
                          isLocked ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        value={discountPercent}
                        onChange={e => setDiscountPercent(parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Texto Informativo</label>
                      {/* NO editable */}
                      <input
                        type="text"
                        disabled
                        className="w-full h-11 px-4 bg-slate-50 border rounded-xl font-medium text-slate-700 opacity-90 cursor-not-allowed"
                        value={ruleText || COUPON_RULE_TEXT}
                        readOnly
                      />
                      <p className="text-[11px] text-slate-400 font-medium italic">
                        Este texto es fijo para evitar confusiones en el mensaje al cliente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {enablePoints && (
                <div className="space-y-6 animate-in fade-in">
                  <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Configuración Puntos</h5>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Modo de suma</label>
                      <select
                        disabled={isLocked}
                        className="w-full h-11 px-4 bg-slate-50 border rounded-xl font-bold"
                        value={pointsMode}
                        onChange={e => setPointsMode(e.target.value as PointsMode)}
                      >
                        <option value={PointsMode.PERCENTAGE}>% de la compra</option>
                        <option value={PointsMode.FIXED}>Puntos fijos por compra</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Valor de suma</label>
                      <input
                        type="number"
                        disabled={isLocked}
                        className="w-full h-11 px-4 bg-slate-50 border rounded-xl font-black"
                        value={pointsValue}
                        onChange={e => setPointsValue(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Nota ejemplo */}
                  {!!pointsExampleText && (
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-800">
                      <p className="text-xs font-bold">{pointsExampleText}</p>
                    </div>
                  )}

                  {/* Si no hay premios, CTA más claro */}
                  {filteredPointsRewards.length === 0 && (
                    <div className="p-4 bg-slate-50 border border-dashed rounded-2xl text-center space-y-2">
                      <p className="text-xs font-medium text-slate-500">Todavía no tenés premios para este programa.</p>
                      <button
                        onClick={() => navigate('/commerce/rewards')}
                        className="flex items-center gap-1.5 mx-auto px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100"
                      >
                        <Plus size={12} /> Crear tu primer premio
                      </button>
                    </div>
                  )}
                </div>
              )}

              {enableStars && (
                <div className="space-y-4 animate-in fade-in">
                  <h5 className="text-[10px] font-black text-yellow-600 uppercase tracking-[0.2em]">Configuración Estrellas</h5>

                  {/* Eliminado: Meta de estrellas + selector de premio (porque ahora cada premio define su requisito) */}
                  {filteredStarsRewards.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-dashed rounded-2xl text-center space-y-2">
                      <p className="text-xs font-medium text-slate-500">Todavía no tenés premios de estrellas.</p>
                      <button
                        onClick={() => navigate('/commerce/rewards')}
                        className="flex items-center gap-1.5 mx-auto px-4 py-1.5 bg-yellow-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-100"
                      >
                        <Plus size={12} /> Crear tu primer premio
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl text-yellow-900">
                      <p className="text-xs font-bold">
                        Listo ✅ Tus premios de estrellas se administran desde el <b>catálogo</b>. Cada premio define cuántas estrellas requiere.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </AccordionStep>

        <AccordionStep
          number={3}
          title="Visibilidad Pública"
          description="Aparecé en el directorio de locales"
          icon={Eye}
          isOpen={openSection === 3}
          isConfigured={publicListed}
          onClick={() => setOpenSection(3)}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <span className="font-bold text-slate-700 block">Aparecer en el buscador de socios</span>
                <p className="text-[10px] text-slate-400 font-medium">Permite que nuevos clientes encuentren tu negocio.</p>
              </div>
              <button
                onClick={() => setPublicListed(!publicListed)}
                className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${publicListed ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'}`}
              >
                <div className="w-4 h-4 bg-white rounded-full" />
              </button>
            </div>

            {publicListed && (
              <div className="grid sm:grid-cols-2 gap-4 animate-in fade-in">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Provincia</label>
                  <input
                    className="w-full h-11 px-4 border rounded-xl font-medium focus:border-blue-600 outline-none"
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Localidad</label>
                  <input
                    className="w-full h-11 px-4 border rounded-xl font-medium focus:border-blue-600 outline-none"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </AccordionStep>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 z-50 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            onClick={handleSave}
            disabled={!isDirty || loading}
            className={`w-full h-15 rounded-[22px] font-black text-[11px] tracking-widest uppercase flex items-center justify-center gap-3 transition-all ${
              saveSuccess ? 'bg-emerald-500 text-white' : isDirty ? 'bg-black text-white shadow-2xl active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
            {loading ? 'Guardando...' : saveSuccess ? 'Cambios guardados' : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
