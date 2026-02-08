
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import TermsModal from '../components/TermsModal';
import { db } from '../services/db';
import { UserRole, ProgramType, PointsMode, PlanType, SubscriptionStatus, User, Commerce, Subscription } from '../types';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptedTerms) {
      setError('Debes leer y aceptar los términos para continuar');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simular latencia
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verificar si el usuario ya existe
      const existing = db.getAll<User>('users').find(u => u.email === email);
      if (existing) {
        setError('El email ya está registrado');
        setIsLoading(false);
        return;
      }

      // 1. Crear Comercio
      const commerceId = crypto.randomUUID();
      // Fixed: included configVersion: 1
      db.insert<Commerce>('commerces', {
        id: commerceId,
        name: name,
        primaryColor: '#2563eb',
        programType: ProgramType.POINTS,
        configVersion: 1,
        enable_points: true,
        enable_stars: false,
        enable_coupon: true,
        pointsMode: PointsMode.PERCENTAGE,
        pointsValue: 10,
        antiFraudMinutes: 5,
        discountPercent: 10,
        minPurchaseAmount: 0,
        discountExpirationDays: 30,
        cooldownHours: 24,
        ruleText: 'No acumulable con otras promociones.',
        starsGoal: 5,
        starsRewardDescription: 'Premio de regalo',
        planType: PlanType.FREE,
        customerLimit: 100,
        monthlyScanLimit: 100,
        scansCurrentMonth: 0,
        scansResetDate: new Date().toISOString(),
        planStartedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        waTone: 'friendly',
        waIncludeGained: true,
        waIncludeTotal: true,
        waIncludeProgress: true,
        waClosingReceipt: '¡Gracias por tu compra!',
        waReminderGoal: 'return',
        waReminderIncludePoints: true,
        waReminderIncludeMissing: true,
        waClosingReminder: '¡Te esperamos pronto!'
      });

      // 2. Crear Suscripción
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      db.insert<Subscription>('subscriptions', {
        id: crypto.randomUUID(),
        commerceId,
        planName: 'Plan Free',
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date().toISOString(),
        nextBillingDate: nextMonth.toISOString(),
        amount: 0,
        createdAt: new Date().toISOString()
      });

      // 3. Crear Usuario
      // FIX: Replaced UserRole.COMMERCE_ADMIN with UserRole.COMMERCE_OWNER and added missing isActive field
      db.insert<User>('users', {
        id: crypto.randomUUID(),
        email: email,
        password: password,
        registrationMethod: 'email',
        name: `Admin ${name}`,
        role: UserRole.COMMERCE_OWNER,
        commerceId,
        createdAt: new Date().toISOString(),
        isActive: true,
        acceptedTerms: true,
        acceptedTermsDate: new Date().toISOString(),
        termsVersion: '1.0'
      });

      // Redirigir al login
      alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
      navigate('/login');
    } catch (err) {
      setError('Ocurrió un error al procesar el registro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[400px] space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-600 rounded-[22px] flex items-center justify-center mx-auto mb-2 shadow-lg shadow-blue-100">
            <Sparkles className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-black leading-tight">Crea tu cuenta</h1>
          <p className="text-sm text-slate-400 font-medium max-w-[280px] mx-auto">Lanza tu propio programa de fidelidad hoy</p>
        </div>
        
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-[11px] rounded-xl font-bold border border-red-100 flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Nombre de tu Negocio</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 px-5 bg-white border border-[#eaeaea] rounded-2xl text-sm font-bold focus:border-black outline-none transition-all placeholder:text-slate-200"
                placeholder="Ej: Café Central"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Email Profesional</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 px-5 bg-white border border-[#eaeaea] rounded-2xl text-sm font-bold focus:border-black outline-none transition-all placeholder:text-slate-200"
                placeholder="nombre@ejemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 px-5 bg-white border border-[#eaeaea] rounded-2xl text-sm font-bold focus:border-black outline-none transition-all placeholder:text-slate-200"
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center mt-1">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="peer appearance-none w-5 h-5 border-2 border-slate-200 rounded-lg checked:bg-black checked:border-black transition-all cursor-pointer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                    <CheckCircle2 size={12} className="text-white" />
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-400 leading-tight">
                  He leído y acepto los{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-black font-black underline decoration-slate-200 underline-offset-4 hover:decoration-black transition-all"
                  >
                    Términos y Condiciones
                  </button>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-14 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                acceptedTerms 
                  ? 'bg-black text-white hover:opacity-90 active:scale-[0.98] shadow-xl shadow-black/5' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Crear mi cuenta'}
            </button>
          </form>

          <p className="text-center text-xs mt-8">
            <span className="text-slate-400 font-medium tracking-tight">¿Ya tenés cuenta? </span>
            <button 
              onClick={() => navigate('/login')} 
              className="text-black font-black hover:underline transition-all underline-offset-4"
            >
              Inicia sesión
            </button>
          </p>
        </div>
        
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 mx-auto text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-black transition-colors"
        >
          <ArrowLeft size={14} /> Volver al inicio
        </button>
      </div>

      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
        onAccept={() => {
          setAcceptedTerms(true);
          setShowTermsModal(false);
          setError('');
        }}
      />
    </div>
  );
};

export default RegisterPage;
