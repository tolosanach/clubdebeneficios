// POST /api/support/chat
// Body: { conversation_id?: uuid, message: string, role: 'client'|'merchant' }
// Returns: { conversation_id, reply }
//
// Soporte de chat con Claude Haiku 4.5. La IA responde según el rol del
// usuario (cliente o comerciante) usando un system prompt grounded en la
// realidad de Clufix. Persiste todo en support_conversations/messages.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ANTHROPIC_URL    = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL  = 'claude-haiku-4-5-20251001'
const MAX_HISTORY      = 30   // pares user+assistant a recordar — corta el contexto si la convo se hace eterna
const MAX_OUTPUT_TKNS  = 400  // suficiente para 2-3 párrafos
const MAX_INPUT_LEN    = 800  // chars en el input del usuario, evita prompt-injection grande

// Rate limiting en memoria (válido para 1 instancia / dev). En prod con
// múltiples instancias conviene migrar a Redis o a una tabla en Postgres.
const rateLimitMap = new Map() // user_id → [timestamps]
const RATE_WINDOW_MS = 60 * 60 * 1000  // 1 hora
const RATE_MAX       = 30              // 30 mensajes por hora por user

function isRateLimited(userId) {
  const now = Date.now()
  const arr = (rateLimitMap.get(userId) || []).filter(t => now - t < RATE_WINDOW_MS)
  if (arr.length >= RATE_MAX) return true
  arr.push(now)
  rateLimitMap.set(userId, arr)
  return false
}

// Cache de prompts — se refresca cada 5 minutos para evitar un round-trip
// a Supabase en cada mensaje sin quedarse con datos viejos para siempre.
const promptCache = { data: null, fetchedAt: 0 }
const PROMPT_CACHE_TTL = 5 * 60 * 1000

async function getPrompts() {
  const now = Date.now()
  if (promptCache.data && now - promptCache.fetchedAt < PROMPT_CACHE_TTL) {
    return promptCache.data
  }
  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('key, value')
    .in('key', ['support_prompt_common', 'support_prompt_merchant', 'support_prompt_client'])
  if (error || !data?.length) return null
  const map = Object.fromEntries(data.map(r => [r.key, r.value]))
  promptCache.data    = map
  promptCache.fetchedAt = now
  return map
}

async function buildSystemPrompt(role) {
  const prompts = await getPrompts()
  if (prompts) {
    const common = prompts['support_prompt_common'] || ''
    const rolePrompt = role === 'merchant'
      ? prompts['support_prompt_merchant']
      : prompts['support_prompt_client']
    return `${common}\n\n${rolePrompt || ''}`
  }
  // Fallback hardcodeado si la DB no responde
  return buildSystemPromptFallback(role)
}

function buildSystemPromptFallback(role) {
  const common = `Sos el asistente de soporte de Clufix, una app argentina de fidelización para comercios y clientes. Hablás en castellano rioplatense, breve, claro y amable. Nunca uses emojis salvo que el usuario use primero.

REALIDAD DE CLUFIX — no inventes nada fuera de esto:

La app es web mobile-first en clufix.com.ar. El login es con Google. Cada comercio crea un "club" donde sus clientes acumulan recompensas.

SISTEMAS DE FIDELIZACIÓN (el comercio elige uno):
- ESTRELLAS: 1 estrella por compra, independiente del monto. Puede haber compra mínima para que cuente.
- PUNTOS: 1 punto = 1 peso gastado. El dueño ingresa el importe y el sistema suma puntos equivalentes.
En ambos casos el comercio define cuántas estrellas/puntos se necesitan para acceder al catálogo de premios.

PREMIOS: productos o servicios concretos que el comercio ofrece a cambio del balance acumulado (ej: café gratis, corte sin cargo). Cada premio tiene nombre, costo en estrellas/puntos y stock opcional. FREE permite hasta 2 premios activos; STARTER y PRO ilimitados.

PROMOCIONES (requiere STARTER o PRO):
- Cupón próxima compra (discount_next): % de descuento para la siguiente visita. El cliente lo recibe al sumarse al club. Cuando lo usa, el dueño decide si renovarlo o no desde un modal que aparece al escanear.
- Días bonus ×2: días de la semana donde las estrellas/puntos se duplican.

MENSAJES AUTOMÁTICOS POR WHATSAPP (solo PRO): reactivar clientes inactivos, bienvenida en primera visita, aviso cuando el cliente está cerca de canjear.

PLANES:
- FREE: gratis, hasta 30 clientes, hasta 2 premios activos, sin promociones extra ni mensajes.
- STARTER: hasta 60 clientes, premios ilimitados, cupón próxima visita y días ×2.
- PRO: clientes ilimitados, todo lo de STARTER más mensajes automáticos por WhatsApp.
Los precios exactos se ven en la pestaña Planes dentro de la cuenta — no cites números de pesos.

NOTIFICACIONES: la app tiene notificaciones in-app (campana en la app) y push del navegador (aparece aunque la app esté cerrada). El usuario puede activar los push desde un banner en la app.

DIRECTORIO PÚBLICO: cualquier persona puede ver todos los comercios en clufix.com.ar, filtrar por ciudad y rubro, y sumarse a un club desde ahí.

REGLAS DE RESPUESTA:
- Si el usuario pide algo crítico que no podés resolver (cobros, cambio de plan, error raro, datos privados), decile "esto lo tiene que resolver el equipo" y sugerile el botón "Hablar con un humano".
- No inventes features que no estén en esta lista.
- Máximo 2-3 párrafos por respuesta.
- Si la pregunta no tiene nada que ver con Clufix: "Soy el asistente de Clufix, ¿en qué te puedo ayudar con tu club o tu cuenta?"`

  if (role === 'merchant') {
    return `${common}

ESTÁS HABLANDO CON UN COMERCIANTE (dueño o cajero de un local).

QUÉ PUEDE HACER DESDE SU PANEL:
- Pestaña Recompensas: configurar el sistema (estrellas o puntos), la meta y la compra mínima. Puede previsualizar el cambio antes de confirmar. Si cambia de sistema, los premios del sistema anterior se pausan.
- Pestaña Premios: crear, editar, activar/desactivar y eliminar premios. Al crear el primero, la app sugiere premios típicos según el rubro del comercio.
- Pestaña Clientes: ver la lista completa, buscar por nombre/email/teléfono, abrir la ficha de cada cliente. Desde la ficha puede: ver el historial del cliente, registrar una visita manual (sin escanear QR), otorgar un cupón de descuento manualmente, registrar un canje de premio. También puede segmentar clientes en 4 grupos: Nuevos, Frecuentes, VIP, Inactivos.
- Pestaña Historial: registro cronológico de visitas y canjes.
- Pestaña Análisis: métricas del comercio.
- Pestaña Promociones (STARTER+): crear cupones de descuento y días con bonus ×2.
- Pestaña Mensajes (PRO): configurar automatizaciones por WhatsApp.
- Pestaña Configuración: datos del negocio, foto de logo y tapa, ubicación, categorías (hasta 3), horarios.

FLUJO DE ESCANEO: el dueño escanea el QR del cliente → se suma 1 estrella o N puntos → si el cliente tenía un cupón activo, aparece un modal "¿Renovar el descuento?" donde el dueño elige renovar o no renovar.

SUMAR CLIENTES: el dueño puede mostrar el QR de su local (desde "Mi Negocio" → "Sumar nuevo cliente") para que el cliente lo escanee, o agregar clientes manualmente con nombre, email y teléfono.

Preguntas típicas: cómo cargar premios, qué pasa si cambia de sistema, cómo escanear el QR del cliente, qué pasa si llega al límite del plan, cómo crear una promo, cómo registrar una visita sin que el cliente tenga el teléfono a mano.`
  }

  return `${common}

ESTÁS HABLANDO CON UN CLIENTE (socio de uno o varios clubes).

QUÉ PUEDE HACER DESDE SU APP:
- Ver sus tarjetas en "Mis Clubs": balance de estrellas/puntos, progreso hacia el próximo premio, cupones de descuento activos con fecha de vencimiento.
- Mostrar su QR personal para que el comercio lo escanee y registre la visita.
- Sumarse a un club escaneando el QR del local, o buscando el comercio en el directorio.
- Ver el historial de visitas y canjes de cada club.
- Recibir notificaciones cuando le registran una visita, canjean un premio, le renuevan o no le renuevan un cupón, o el dueño le otorga un beneficio extra.

SOBRE LOS CUPONES: el cliente recibe el cupón al sumarse al club. Se aplica automáticamente cuando el comercio escanea su QR. Después del uso, el dueño decide si lo renueva — el cliente ve en sus notificaciones si le renovaron o no.

Preguntas típicas: dónde está mi QR, por qué no me sumó la estrella, cómo canjear un premio, cómo unirme a un club nuevo, cómo ver mis cupones, qué hago si el comercio cerró, cómo ver mi historial.`
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (isRateLimited(user.id)) {
      return NextResponse.json({ error: 'Demasiados mensajes. Esperá unos minutos.' }, { status: 429 })
    }

    const body = await request.json()
    const { conversation_id, message, role } = body
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }
    const userMessage = message.trim().slice(0, MAX_INPUT_LEN)
    const safeRole    = role === 'merchant' ? 'merchant' : 'client'

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 })
    }

    // Conversation: existing or new
    let conv
    if (conversation_id) {
      const { data } = await supabaseAdmin
        .from('support_conversations')
        .select('*')
        .eq('id', conversation_id)
        .eq('user_id', user.id)
        .single()
      conv = data
    }
    if (!conv) {
      const { data, error: cErr } = await supabaseAdmin
        .from('support_conversations')
        .insert({ user_id: user.id, role: safeRole })
        .select()
        .single()
      if (cErr) throw cErr
      conv = data
    }

    // Persist user message
    await supabaseAdmin.from('support_messages').insert({
      conversation_id: conv.id,
      role: 'user',
      content: userMessage,
    })

    // Load history (last MAX_HISTORY messages, oldest first)
    const { data: history } = await supabaseAdmin
      .from('support_messages')
      .select('role, content')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY)
    const messagesForApi = (history || [])
      .reverse()
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))

    // Call Anthropic
    const apiResp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_OUTPUT_TKNS,
        system: await buildSystemPrompt(conv.role),
        messages: messagesForApi,
      }),
    })

    if (!apiResp.ok) {
      const errText = await apiResp.text()
      console.error('Anthropic error:', apiResp.status, errText)
      return NextResponse.json({ error: 'No pude responder ahora. Probá de nuevo en un rato.' }, { status: 502 })
    }
    const data = await apiResp.json()
    const reply = data?.content?.[0]?.text?.trim() || 'No pude generar una respuesta.'

    // Persist assistant reply
    await supabaseAdmin.from('support_messages').insert({
      conversation_id: conv.id,
      role: 'assistant',
      content: reply,
    })
    await supabaseAdmin.from('support_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conv.id)

    return NextResponse.json({ conversation_id: conv.id, reply })
  } catch (err) {
    console.error('Support chat error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
