import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Sparkles, CheckCircle2 } from 'lucide-react';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Commerce } from '../../types';
import PhoneInput from '../../components/PhoneInput';
import { supabase } from '../../services/supabase';

const NewCustomerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastCreatedName, setLastCreatedName] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    countryCode: 'AR',
    fullPhone: '',
  });

  // Mismo mapeo que venís usando en CustomersPage
  const effectiveCommerceId = useMemo(() => {
    if (!user?.commerceId) return '';
    return user.commerceId === 'commerce-cafe-id' ? 'commerce-1' : user.commerceId;
  }, [user?.commerceId]);

  // Demo/local (solo para mostrar nombre del comercio en la UI)
  const commerce = useMemo(() => {
    if (!effectiveCommerceId) return null;
    return db.getById<Commerce>('commerces', effectiveCommerceId);
  }, [effectiveCommerceId]);

  const resetForm = () => {
    setFormData({ name: '', email: '', phoneNumber: '', countryCode: 'AR', fullPhone: '' });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!effectiveCommerceId) {
      alert('No se detectó commerceId.');
      return;
    }
    if (!formData.name || !formData.fullPhone) {
      alert('Completá nombre y teléfono.');
      return;
    }

    setIsSaving(true);

    try {
      const id = crypto.randomUUID();
      const qrToken = `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      const payload = {
        id,
        commerce_id: effectiveCommerceId,
        name: formData.name.trim(),
        phone: formData.fullPhone,
        email: (formData.email || '').trim(),
        qr_token: qrToken,
        total_points: 0,
        current_stars: 0,
        total_stars: 0,
        discount_available: false,
        // created_at lo pone Supabase con default now()
      };

      console.log('[NewCustomerPage] INSERT payload:', payload);

      // OJO: si RLS bloquea, acá vas a ver el error (no se “finge” éxito)
      const { data, error } = await supabase
        .from('customers')
        .insert([payload])
        .select('*')
        .single();

      console.log('[NewCustomerPage] INSERT data:', data);
      console.log('[NewCustomerPage] INSERT error:', error);

      if (error) throw error;

      setLastCreatedName(formData.name.trim());
      setIsSuccess(true);
    } catch (err: any) {
      console.error('[NewCustomerPage] create customer failed:', err);
      alert(`No se pudo crear el socio en Supabase.\n\n${err?.message ?? 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-8 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 mx-auto rounded-[32px] flex items-center justify-center border border-emerald-100">
          <CheckCircle2 size={40} />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">¡Socio Creado!</h2>
          <p className="text-slate-500 font-medium">
            {lastCreatedName || 'El socio'} ya puede empezar a sumar puntos en {commerce?.name || 'tu comercio'}.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setIsSuccess(false);
              resetForm();
            }}
            className="w-full py-5 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl"
          >
            Cargar otro cliente
          </button>

          <button
            onClick={() => navigate('/commerce/scan')}
            className="w-full py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em]"
          >
            Registrar Venta
          </button>

          <button
            onClick={() => navigate('/commerce/customers')}
            className="w-full py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em]"
          >
            Ir a Clientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-10">
      <div className="flex items-center gap-4 mb-10 px-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 text-slate-400 hover:text-black transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-black">Nuevo Cliente</h1>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-10 animate-in slide-in-from-bottom-4">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[22px] flex items-center justify-center border border-blue-100 shadow-sm">
            <UserPlus size={28} />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Alta de Socio</h2>
            <p className="text-xs text-slate-400 font-medium">Ingresá los datos para generar su QR único.</p>
            <p className="text-[10px] text-slate-300 font-mono mt-2">
              commerceId efectivo: {effectiveCommerceId || '(vacío)'}
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-8">
          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 group-focus-within:text-black transition-colors">
              Nombre Completo
            </label>
            <input
              type="text"
              required
              className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-800 focus:border-black transition-all"
              placeholder="Ej: Juan Pérez"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <PhoneInput
            label="Número de Teléfono"
            value={formData.phoneNumber}
            countryCode={formData.countryCode}
            onChange={(data) => {
              setFormData({
                ...formData,
                phoneNumber: data.phoneNumber,
                countryCode: data.countryCode,
                fullPhone: data.fullPhone,
              });
            }}
            required
          />

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 group-focus-within:text-black transition-colors">
              Email (Opcional)
            </label>
            <input
              type="email"
              className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-800 focus:border-black transition-all"
              placeholder="correo@ejemplo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={!formData.name || !formData.phoneNumber || isSaving}
              className="w-full py-5 bg-black text-white font-black rounded-[24px] shadow-2xl hover:opacity-90 active:scale-95 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 disabled:opacity-20"
            >
              <Sparkles size={18} />
              {isSaving ? 'Guardando...' : 'Confirmar Alta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCustomerPage;
