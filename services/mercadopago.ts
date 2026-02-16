
import { db } from './db';
import { BillingInvoice, PlanType } from '../types';

/**
 * Este servicio simula la integración real con el SDK de MercadoPago.
 * En producción, estas funciones llamarían a tu Backend (Node.js/Express/Next.js).
 */
export const MercadoPagoService = {
  
  /**
   * Simula el POST /api/mp/create-preference
   */
  async createPreference(commerceId: string, planPrice: number) {
    // 1. Crear registro de factura pendiente en DB local
    const invoiceId = crypto.randomUUID();
    const now = new Date();
    
    const invoice: BillingInvoice = {
      id: invoiceId,
      commerceId,
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      amount: planPrice,
      status: 'pending',
      mpPreferenceId: `PREF-${crypto.randomUUID().slice(0,8)}`,
      createdAt: now.toISOString()
    };

    db.insert('billing_invoices', invoice);

    // 2. Simular la obtención del init_point de MP
    // En real: const response = await fetch('/api/mp/create-preference', { ... });
    return {
      id: invoice.mpPreferenceId,
      init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${invoice.mpPreferenceId}`,
      invoiceId: invoice.id
    };
  },

  /**
   * Simula el POST /api/mp/webhook
   * Recibe la notificación de MP y activa el plan si el pago es aprobado.
   */
  async simulateWebhookNotification(invoiceId: string) {
    console.log("🔔 Recibiendo notificación de MercadoPago para factura:", invoiceId);
    
    const invoice = db.getById<BillingInvoice>('billing_invoices', invoiceId);
    if (!invoice) return;

    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, 1500));

    // ID de pago aleatorio de MP
    const mpPaymentId = `MP-${Math.floor(Math.random() * 1000000000)}`;

    // Ejecutar lógica de activación en DB
    db.activateProPlan(invoice.commerceId, invoiceId, mpPaymentId);

    return { status: 'ok', activated: true };
  }
};
