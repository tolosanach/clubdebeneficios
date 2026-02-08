
import { Commerce, Subscription, ProgramType } from '../types';

export interface MessageData {
  cliente_nombre: string;
  negocio_nombre: string;
  beneficio: string;
  puntos_actuales?: number;
  puntos_faltantes?: number;
  estrellas_actuales?: number;
  estrellas_faltantes?: number;
  estrellas_visuales?: string;
  fecha_vencimiento?: string;
}

export const getStarsLine = (current: number, goal: number): string => {
  const safeCurrent = Math.max(0, current);
  const safeGoal = Math.max(1, goal);
  const filledCount = Math.min(safeCurrent, safeGoal);
  const emptyCount = Math.max(0, safeGoal - filledCount);
  
  return "⭐".repeat(filledCount) + "☆".repeat(emptyCount);
};

export const DEFAULT_MESSAGES = {
  POINTS_NOT_REACHED: `Hola {cliente_nombre} 👋
Te escribe {negocio_nombre}.

Tenés {puntos_actuales} puntos.
Te faltan {puntos_faltantes} para tu recompensa: {beneficio}.

¡Te esperamos pronto!`,

  POINTS_REACHED: `Hola {cliente_nombre} 👋
Te escribe {negocio_nombre}.

🎉 ¡Tu beneficio ya está listo!
Recompensa: {beneficio}.

Mostrá este mensaje en caja para canjearlo.`,

  STARS: `Hola {cliente_nombre} 👋
Te escribe {negocio_nombre}.

{estrellas_visuales}
Llevás {estrellas_actuales} estrellas.
Te faltan {estrellas_faltantes} para: {beneficio}

¡Seguimos sumando!`,

  STARS_REACHED: `Hola {cliente_nombre} 👋
Te escribe {negocio_nombre}.

{estrellas_visuales}
¡Felicidades! Completaste tus estrellas.
Ya podés canjear tu premio: {beneficio}

¡Te esperamos para disfrutarlo!`,

  COUPON: `Hola {cliente_nombre} 👋
Te escribe {negocio_nombre}.

🎁 Beneficio activo: {beneficio}
Válido hasta: {fecha_vencimiento}

Mostrá este mensaje para usar el beneficio.`,

  INACTIVE_REMINDER: `Hola {cliente_nombre} 👋
Hace unos días que no venís a {negocio_nombre}. 

Cuando quieras te esperamos para que sigas disfrutando de tus beneficios. ¡Te extrañamos! 😊🎁`,

  NEAR_REWARD_REMINDER: `Hola {cliente_nombre} 👋
¡Estás muy cerca de tu premio en {negocio_nombre}! 🎁

Te falta muy poco para completar tu meta de {beneficio}. ¡Te esperamos pronto para que lo retires! ☕✨`,

  COUPON_EXPIRING_REMINDER: `Hola {cliente_nombre} 👋
¡No pierdas tu beneficio en {negocio_nombre}! ⏳

Tu cupón de {beneficio} está por vencer. Aprovechalo hoy mismo cuando pases por el local. ¡Te esperamos!`
};

export const parseMessage = (template: string, data: MessageData) => {
  let msg = template;
  const variables: Record<string, string | number | undefined> = {
    cliente_nombre: data.cliente_nombre,
    negocio_nombre: data.negocio_nombre,
    beneficio: data.beneficio,
    puntos_actuales: data.puntos_actuales,
    puntos_faltantes: data.puntos_faltantes,
    estrellas_actuales: data.estrellas_actuales,
    estrellas_faltantes: data.estrellas_faltantes,
    estrellas_visuales: data.estrellas_visuales,
    fecha_vencimiento: data.fecha_vencimiento
  };

  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{${key}}`, 'g');
    const value = variables[key];
    msg = msg.replace(regex, value !== undefined ? value.toString() : '');
  });

  return msg;
};

export const generateReceiptMessage = (commerce: Commerce, data: MessageData) => {
  let template = "";
  
  if (commerce.programType === ProgramType.POINTS) {
    const isReached = (data.puntos_faltantes || 0) <= 0;
    template = isReached 
      ? DEFAULT_MESSAGES.POINTS_REACHED
      : DEFAULT_MESSAGES.POINTS_NOT_REACHED;
  } else if (commerce.programType === ProgramType.STARS) {
    const isReached = (data.estrellas_faltantes || 0) <= 0;
    template = isReached
      ? DEFAULT_MESSAGES.STARS_REACHED
      : DEFAULT_MESSAGES.STARS;
    
    if (!data.estrellas_visuales) {
      data.estrellas_visuales = getStarsLine(data.estrellas_actuales || 0, commerce.starsGoal || 5);
    }
  } else {
    template = DEFAULT_MESSAGES.COUPON;
  }

  return parseMessage(template, data);
};

export const generateSpecificReminder = (type: 'inactive' | 'near_reward' | 'coupon_expiring', data: MessageData) => {
  let template = "";
  if (type === 'inactive') template = DEFAULT_MESSAGES.INACTIVE_REMINDER;
  if (type === 'near_reward') template = DEFAULT_MESSAGES.NEAR_REWARD_REMINDER;
  if (type === 'coupon_expiring') template = DEFAULT_MESSAGES.COUPON_EXPIRING_REMINDER;

  return parseMessage(template, data);
};

export const generateBillingMessage = (commerceName: string, sub: Subscription, type: 'reminder' | 'suspension' | 'receipt') => {
  const date = new Date(sub.nextBillingDate).toLocaleDateString();
  if (type === 'reminder') {
    return `Hola ${commerceName}! Te recordamos que tu suscripción al Club vence el ${date}. ¡Gracias!`;
  }
  if (type === 'suspension') {
    return `Aviso: Tu servicio ha sido SUSPENDIDO por falta de pago. Contactanos para reactivar tu cuenta.`;
  }
  if (type === 'receipt') {
    return `¡Pago recibido! ${commerceName}, tu cuenta ha sido extendida hasta el ${date}.`;
  }
  return "";
};
