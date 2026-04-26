// POST /api/support/chat
// Body: { conversation_id?: uuid, message: string, role: 'client'|'merchant' }
// Returns: { conversation_id, reply }
//
// Soporte de chat con Claude Haiku 4.5. La IA responde según el rol del
// usuario (cliente o comerciante) usando un system prompt grounded en la
// realidad de Benefix. Persiste todo en support_conversations/messages.

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

function buildSystemPrompt(role) {
  const common = `Sos el asistente de soporte de Benefix, una app argentina de fidelización para comercios y clientes. Hablás en castellano rioplatense, breve, claro y amable. Nunca uses emojis salvo que el usuario use primero.

REALIDAD DE BENEFIX (no inventes nada fuera de esto):
- App web mobile-first en benefix.com.ar
- Cada comercio (cafetería, barbería, etc.) crea un "club" donde sus clientes acumulan recompensas al escanear su QR.
- Hay dos sistemas de fidelización: ESTRELLAS (1 estrella por compra, simple) o PUNTOS (1 punto = 1 peso gastado, flexible para tickets variables).
- Los clientes canjean estrellas/puntos por PREMIOS que define cada comercio.
- Existen PROMOCIONES extra (plan STARTER+): cupón de descuento próxima visita, ×2 puntos en días específicos.
- Existen MENSAJES automáticos por WhatsApp (plan PRO): reactivar inactivos, bienvenida, etc.
- Planes: FREE (hasta 30 clientes, sin promos), STARTER (60 clientes, promos), PRO (sin límite, promos + mensajes auto).
- El cliente tiene su propia tarjeta digital con QR y puede sumarse a varios clubes.
- El comerciante escanea el QR del cliente desde el panel para sumar visita/puntos.

REGLAS:
- Si el usuario pide algo crítico que no podés resolver (cobros, cambios de plan, errores raros, datos privados de su cuenta), respondé "esto lo tiene que ver el equipo" y sugerile el botón de "Hablar con un humano".
- Si te preguntan precios concretos en pesos, responde "los precios actuales se ven en la pestaña Planes dentro de tu cuenta" — nunca inventes números.
- No inventes features que no estén en esta lista.
- Cortá las respuestas en 2-3 párrafos máximo.
- Si la pregunta no tiene nada que ver con Benefix, redirigí: "soy el asistente de Benefix, ¿en qué te puedo ayudar con tu club o tu cuenta?"`

  if (role === 'merchant') {
    return `${common}

ESTÁS HABLANDO CON UN COMERCIANTE (dueño/cajero de un local).
Sus preguntas típicas: cómo cargar premios, qué pasa si cambia de sistema (estrellas↔puntos), cómo escanear el QR del cliente, qué pasa si llega al límite del plan, cómo configurar horarios o ubicación del club, cómo crear promociones.`
  }
  return `${common}

ESTÁS HABLANDO CON UN CLIENTE (socio del club).
Sus preguntas típicas: dónde está mi QR, por qué no me sumó la estrella, cómo canjear un premio, cómo unirse a un club nuevo, qué hago si el comercio cerró, cómo ver mi historial.`
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
        system: buildSystemPrompt(conv.role),
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
