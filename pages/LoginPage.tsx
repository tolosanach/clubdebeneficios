
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { db } from '../services/db';
import PhoneInput from '../components/PhoneInput';
import TermsModal from '../components/TermsModal';
import { LogIn, HelpCircle, MessageSquare, Chrome, Mail, ArrowLeft, Loader2, CheckCircle2, ChevronDown, ChevronUp, Shield, Coffee, Smartphone, User as UserIcon, AlertCircle } from 'lucide-react';

type AuthStep = 'SELECTION' | 'WHATSAPP_PHONE' | 'WHATSAPP_OTP' | 'EMAIL';

const LoginPage: React.FC = () => {
  const [step, setStep] = useState<AuthStep>('SELECTION');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone related state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('AR');
  const [fullPhone, setFullPhone] = useState('');

  const [otp, setOtp] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoExpanded, setIsDemoExpanded] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const { login, sendOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const success = await login(email, password);
    if (success) {
      navigate('/');
    } else {
      setError('Credenciales incorrectas');
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setIsLoading(true);
    setError('');
    const success = await login(demoEmail, demoPass);
    if (success) {
      navigate('/');
    } else {
      setError('Error al ingresar con cuenta demo');
      setIsLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullPhone) return;
    setIsLoading(true);
    setError('');
    const success = await sendOTP(fullPhone);
    if (success) {
      setStep('WHATSAPP_OTP');
    } else {
      setError('Error al enviar código');
    }
    setIsLoading(false);
  };

  const handleVerifyOTP = async (phone: string, code: string, bizName?: string) => {
    // Si es un usuario nuevo, validar términos
    if (!db.getUserByPhone(phone) && !acceptedTerms) {
      setError('Debes aceptar los términos para registrar tu negocio');
      return;
    }

    setIsLoading(true);
    setError('');
    const success = await verifyOTP(phone, code, bizName);
    if (success) {
      navigate('/');
    } else {
      setError('Código inválido o expirado');
    }
    setIsLoading(false);
  };

  const demoAccounts = [
    { name: 'Super Admin', email: 'admin@club.com', pass: 'admin123', icon: Shield, color: 'text-purple-500' },
    { name: 'Dueño Café', email: 'cafe@test.com', pass: 'cafe123', icon: Coffee, color: 'text-orange-500' },
    { name: 'Cliente Juan', email: 'juan@test.com', pass: 'juan123', icon: UserIcon, color: 'text-emerald-500' },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[400px] space-y-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-black rounded-[22px] flex items-center justify-center mx-auto mb-2 shadow-sm">
            <LogIn className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-black leading-tight">Club de Beneficios</h1>
          <p className="text-sm text-slate-400 font-medium max-w-[280px] mx-auto leading-relaxed">
            Lanzá en menos de 2 minutos tu propio programa de beneficios.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-[11px] rounded-xl font-bold border border-red-100 flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {step === 'SELECTION' && (
            <div className="space-y-12 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Primary Buttons */}
              <div className="space-y-5">
                <button
                  onClick={() => setStep('WHATSAPP_PHONE')}
                  className="w-full h-[54px] bg-[#25D366] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-green-100"
                >
                  <MessageSquare size={18} fill="currentColor" /> Continuar con WhatsApp
                </button>

                <button
                  onClick={() => alert('Integración de Google simulada')}
                  className="w-full h-[54px] bg-[#f9f9f9] border border-slate-200 text-slate-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-slate-100 active:scale-[0.98] transition-all"
                >
                  <Chrome size={18} /> Continuar con Google
                </button>
              </div>

              {/* Separator */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#f3f3f3]"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-slate-300">
                  <span className="bg-white px-4">O bien</span>
                </div>
              </div>

              {/* Demo Section Card */}
              <div className="space-y-6">
                <div className="border rounded-2xl border-slate-100 overflow-hidden">
                  <button 
                    onClick={() => setIsDemoExpanded(!isDemoExpanded)}
                    className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/30 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle size={16} className="text-slate-300" />
                      <span className="text-[11px] font-bold text-slate-500">Probar la app con datos de ejemplo</span>
                    </div>
                    {isDemoExpanded ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                  </button>
                  
                  {isDemoExpanded && (
                    <div className="p-3 space-y-2 animate-in slide-in-from-top-2 duration-300">
                      {demoAccounts.map(acc => (
                        <button
                          key={acc.email}
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleDemoLogin(acc.email, acc.pass)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl flex items-center justify-between group transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl bg-white border border-[#eee] ${acc.color} shadow-sm group-hover:scale-110 transition-transform`}>
                              <acc.icon size={16} />
                            </div>
                            <div>
                              <p className="text-[12px] font-bold text-slate-800 leading-none">{acc.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-1">{acc.email}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-black transition-colors">Usar</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-center pt-2">
                  <button
                    onClick={() => navigate('/register')}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-all underline decoration-blue-100 underline-offset-4"
                  >
                    Registrarme con email
                  </button>
                </div>
              </div>

            </div>
          )}

          {step === 'WHATSAPP_PHONE' && (
            <form onSubmit={handleSendOTP} className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <button onClick={() => setStep('SELECTION')} className="text-slate-400 hover:text-black flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4 transition-colors">
                <ArrowLeft size={14} /> Volver
              </button>
              <div className="space-y-5">
                <h2 className="text-xl font-black text-black tracking-tight">Verificá tu número</h2>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">Te enviaremos un código de seguridad por WhatsApp para validar tu identity.</p>
                
                <PhoneInput
                  label="Número de Teléfono"
                  value={phoneNumber}
                  countryCode={countryCode}
                  onChange={(data) => {
                    setPhoneNumber(data.phoneNumber);
                    setCountryCode(data.countryCode);
                    setFullPhone(data.fullPhone);
                  }}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !phoneNumber}
                className="w-full h-14 bg-black text-white text-sm font-bold rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Enviar código'}
              </button>
            </form>
          )}

          {step === 'WHATSAPP_OTP' && (
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyOTP(fullPhone, otp, businessName); }} className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <button onClick={() => setStep('WHATSAPP_PHONE')} className="text-slate-400 hover:text-black flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4 transition-colors">
                <ArrowLeft size={14} /> Editar número
              </button>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-black tracking-tight">Ingresá el código</h2>
                  <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center border border-green-100"><CheckCircle2 size={18} /></div>
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Te enviamos un código al <span className="text-black font-bold">{fullPhone}</span>
                </p>
                
                {!db.getUserByPhone(fullPhone) && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Nombre de tu Negocio</label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full h-14 px-5 bg-slate-50 border border-[#eaeaea] rounded-2xl text-base font-bold focus:border-black outline-none transition-all"
                        placeholder="Ej: Café Central"
                        required
                      />
                    </div>

                    {/* Terms for new WhatsApp users */}
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
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Código de 6 dígitos</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-20 bg-slate-50 border border-[#eaeaea] rounded-2xl text-4xl font-black text-center tracking-[0.4em] focus:border-black outline-none transition-all placeholder:text-slate-100"
                    placeholder="000000"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isLoading || otp.length < 6 || (!db.getUserByPhone(fullPhone) && !acceptedTerms)}
                  className={`w-full h-14 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                    (db.getUserByPhone(fullPhone) || acceptedTerms) && otp.length === 6
                      ? 'bg-black text-white hover:opacity-90 active:scale-[0.98]' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Verificar'}
                </button>
                <button 
                  type="button"
                  onClick={handleSendOTP}
                  className="w-full text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-black transition-colors"
                >
                  Reenviar código
                </button>
              </div>
            </form>
          )}

          {step === 'EMAIL' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              <button onClick={() => setStep('SELECTION')} className="text-slate-400 hover:text-black flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4 transition-colors">
                <ArrowLeft size={14} /> Volver
              </button>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 px-5 bg-white border border-[#eaeaea] rounded-2xl text-sm font-bold focus:border-black outline-none transition-all"
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
                  className="w-full h-14 px-5 bg-white border border-[#eaeaea] rounded-2xl text-sm font-bold focus:border-black outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-black text-white text-sm font-bold rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Continuar'}
              </button>
            </form>
          )}
        </div>
        
        {/* Footer Support Section */}
        <div className="text-center space-y-4">
          <p className="text-[11px] text-slate-400 font-medium tracking-tight">
            ¿Problemas al ingresar? <a href="#" className="text-slate-500 font-bold hover:underline hover:text-black transition-colors">Contactar soporte</a>
          </p>
        </div>
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

export default LoginPage;
