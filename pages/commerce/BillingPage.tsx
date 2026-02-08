
import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, History, Zap, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { SubscriptionStatus, PlanType, Commerce } from '../../types';
import { MercadoPagoService } from '../../services/mercadopago';

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [isPaying, setIsPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  const commerce = user?.commerceId ? db.getById<Commerce>('commerces', user.commerceId) : null;
  const subscription = user?.commerceId ? db.getSubscriptionByCommerce(user.commerceId) : null;
  const invoices = user?.commerceId ? db.getInvoicesByCommerce(user.commerceId) : [];
  const planUsage = user?.commerceId ? db.getCommerceUsage(user.commerceId) : null;

  if (!subscription || !commerce) return null;

  const handlePayment = async () => {
    setIsPaying(true);
    try {
      // 1. Crear preferencia
      const pref = await MercadoPagoService.createPreference(commerce.id, 2500);
      
      // 2. Simular el flujo de redirección y éxito (En real rediriges a pref.init_point)
      alert(`Redirigiendo a MercadoPago (Preferencia: ${pref.id})...\n\nEn este MVP simularemos el éxito del pago automáticamente.`);
      
      // 3. Simular el Webhook de notificación que enviaría MP
      await MercadoPagoService.simulateWebhookNotification(pref.invoiceId);
      
      setPaySuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      alert("Error al procesar el pago");
    } finally {
      setIsPaying(false);
    }
  };

  const isPro = commerce.planType === PlanType.PRO;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Plan y Facturación</h1>
          <p className="text-slate-500 font-medium">Gestioná tu suscripción y pagos.</p>
        </div>
        <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isPro ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>
          {isPro ? 'Plan Pro Activo' : 'Plan Free'}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Plan Status Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-10 rounded-[48px] shadow-2xl relative overflow-hidden border ${isPro ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-100'}`}>
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Zap size={140} />
            </div>
            
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className={`font-black text-[10px] uppercase tracking-[0.2em] mb-2 ${isPro ? 'text-blue-400' : 'text-slate-400'}`}>TU PLAN ACTUAL</p>
                  <h2 className="text-4xl font-black">{isPro ? 'Club Pro Unlimited' : 'Club Free'}</h2>
                </div>
                {isPro && (
                  <div className="bg-blue-600/20 px-4 py-2 rounded-2xl border border-blue-500/30 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-blue-400" />
                    <span className="text-xs font-black uppercase text-blue-100">Verificado</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                <div>
                  <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1">ESCANEOS / MES</p>
                  <p className="text-xl font-bold">{isPro ? 'Ilimitados' : `${planUsage?.limit} escaneos`}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1">VENCIMIENTO</p>
                  <p className="text-xl font-bold">{commerce.planExpiresAt ? new Date(commerce.planExpiresAt).toLocaleDateString() : 'Sin vencimiento'}</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1">PRECIO</p>
                  <p className={`text-xl font-black ${isPro ? 'text-blue-400' : 'text-slate-900'}`}>{isPro ? '$2.500/mes' : '$0'}</p>
                </div>
              </div>

              {!isPro ? (
                <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 space-y-4 animate-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-3">
                    <Zap className="text-blue-600" size={24} />
                    <h4 className="font-black text-blue-900 text-sm uppercase tracking-widest">Pasate a Pro por $2.500</h4>
                  </div>
                  <p className="text-blue-800/70 text-sm font-medium leading-relaxed">Liberá el potencial de tu negocio: escaneos ilimitados, analítica avanzada y soporte prioritario.</p>
                  <button 
                    onClick={handlePayment}
                    disabled={isPaying || paySuccess}
                    className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 disabled:opacity-70"
                  >
                    {isPaying ? <Loader2 size={18} className="animate-spin" /> : paySuccess ? <CheckCircle2 size={18} /> : <CreditCard size={18} />}
                    {isPaying ? 'PROCESANDO...' : paySuccess ? 'PAGO EXITOSO' : 'PAGAR CON MERCADOPAGO'}
                  </button>
                  <div className="flex items-center justify-center gap-2 pt-2">
                     <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Checkout Seguro • Preference API</p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 p-6 rounded-[32px] border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-green-400" size={24} />
                    <p className="text-slate-300 text-sm font-bold">Tenés todas las funciones desbloqueadas.</p>
                  </div>
                  <button className="text-[10px] font-black uppercase text-blue-400 tracking-widest hover:underline">Ver facturas</button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <History size={18} /> Historial de Facturación
            </h3>
            <div className="divide-y overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="pb-4">Periodo</th>
                    <th className="pb-4">ID Transacción</th>
                    <th className="pb-4">Monto</th>
                    <th className="pb-4">Estado</th>
                    <th className="pb-4 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="group">
                      <td className="py-4 font-bold text-slate-700">{invoice.period}</td>
                      <td className="py-4 text-slate-400 text-xs font-mono">{invoice.mpPaymentId || invoice.mpPreferenceId}</td>
                      <td className="py-4 font-black">${invoice.amount}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${invoice.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                          {invoice.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><ExternalLink size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Sin facturas registradas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Support & Billing Info Side */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-orange-500" size={20} />
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Información de Cobro</h4>
            </div>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Los pagos se procesan de forma segura a través de MercadoPago. La activación del plan es instantánea una vez acreditado el pago.
            </p>
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Próximo Cobro</span>
                <span className="text-xs font-black text-slate-900">{subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Monto Mensual</span>
                <span className="text-xs font-black text-blue-600">$2.500 ARS</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 p-8 rounded-[40px] text-white space-y-4 shadow-xl shadow-blue-100">
             <h4 className="font-black text-sm uppercase tracking-widest">¿Necesitás ayuda?</h4>
             <p className="text-blue-100 text-sm font-medium leading-relaxed">Si tenés problemas con tu pago o necesitás una factura tipo A, contactanos directamente.</p>
             <button className="w-full py-4 bg-white text-blue-600 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-50 transition-all">SOPORTE WHATSAPP</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
