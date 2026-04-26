// GET  /api/suggestions          → lista activas, refresca si pasaron >24h
// GET  /api/suggestions?refresh=1 → fuerza refresh (útil para dev/testing)
//
// Pipeline del refresh:
//   1. detectTriggers() — reglas heurísticas, sin IA
//   2. Filtrar contra los triggers que ya están activos en DB o que el user
//      descartó hace menos de 14 días
//   3. Si quedan triggers nuevos: una sola call a Haiku para que redacte todo
//      en JSON. Una sola llamada por user por refresh, no una por trigger.
//   4. Persistir y devolver lista

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { detectTriggers } from '../../../lib/suggestion-rules'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ANTHROPIC_URL    = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL  = 'claude-haiku-4-5-20251001'
const MAX_OUTPUT_TKNS  = 1500

const DAY_MS                 = 86400 * 1000
const REFRESH_COOLDOWN_MS    = 24 * DAY_MS / 24   // 24h entre generaciones
const DISMISS_COOLDOWN_MS    = 14 * DAY_MS        // si descarta, no vuelve por 14d
const SUGGESTION_TTL_MS      = 30 * DAY_MS        // expiran a los 30d

function buildBatchPrompt(triggers) {
  return `Sos el asistente de Benefix, app argentina de fidelización para comercios. Te paso una lista de "triggers" detectados en la cuenta de un usuario y necesito que redactes una sugerencia breve y natural para cada uno, para mostrar en su buzón.

REGLAS DE REDACCIÓN:
- Castellano rioplatense (vos, no tú). Tono cálido pero profesional. Sin emojis. Sin signos de exclamación salvo que sea muy puntual.
- title: máximo 7 palabras, sentence case (no Title Case). Concreto, no genérico.
- body: 1-2 oraciones, máximo 30 palabras. Explica brevemente el qué y el por qué.
- cta_label si aplica: máximo 3 palabras, en imperativo (ej "Cargá premios", "Ver plan", "Activar promo"). Si no hay acción clara, dejá null.
- cta_url puede ser un anchor interno SOLO de esta lista: "#dashboard", "#clientes", "#recompensas" (acá viven las promos también), "#premios", "#analisis", "#historial", "#configuracion", "#mensajes". No inventes otros nombres.
- No inventes datos. Usá los del context.

CONOCÉ ESTAS RULE_KEYS:
- no_prizes_loaded: el comercio no tiene premios en su sistema activo (estrellas o puntos). CTA: cargar premios.
- near_plan_limit: el comercio está cerca del límite de su plan. CTA: ver plan superior.
- no_horarios: faltan los horarios de atención del local. CTA: configurar horarios.
- inactive_clients: hay N clientes inactivos hace +X días. CTA: activar una promo.
- close_to_prize: el cliente está a M unidades del premio Y en el club Z. CTA: ver tarjeta.
- inactive_in_club: el cliente no visita el club Z hace M días. CTA: ver club.
- active_promo_in_club: hay una promo activa en el club Z donde es socio. CTA: ver promo.

FORMATO DE SALIDA:
Devolvé EXACTAMENTE un JSON array, sin markdown fences, sin texto antes ni después. Cada item con keys: rule_key, title, body, cta_label, cta_url. Si una rule_key aparece dos veces (mismo trigger en distintos commerce_ids), redactá una versión por cada una usando el contexto correspondiente — pero como solo te devuelvo un objeto por rule_key, asociá cada salida al primer trigger con esa key.

TRIGGERS:
${JSON.stringify(triggers, null, 2)}

JSON array ahora:`
}

async function callRedactor(triggers) {
  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_OUTPUT_TKNS,
      messages: [{ role: 'user', content: buildBatchPrompt(triggers) }],
    }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`)
  const data = await r.json()
  let text = data?.content?.[0]?.text?.trim() || '[]'
  // Por si volvieron con ```json ... ```
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim()
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    console.error('[suggestions] redactor returned non-JSON:', text.slice(0, 200))
    return []
  }
}

async function listActive(userId) {
  const nowIso = new Date().toISOString()
  const { data } = await supabaseAdmin
    .from('suggestions')
    .select('*')
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })
  return data || []
}

async function shouldRefresh(userId) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('last_suggestions_run')
    .eq('id', userId)
    .maybeSingle()
  const last = profile?.last_suggestions_run
  if (!last) return true
  return Date.now() - new Date(last).getTime() >= REFRESH_COOLDOWN_MS
}

async function runRefresh(userId) {
  const triggers = await detectTriggers(supabaseAdmin, userId)

  // Filtrar contra activos + descartados recientes
  const dismissCutoff = new Date(Date.now() - DISMISS_COOLDOWN_MS).toISOString()
  const newTriggers = []
  for (const t of triggers) {
    let q = supabaseAdmin
      .from('suggestions')
      .select('id, dismissed_at')
      .eq('user_id', userId)
      .eq('rule_key', t.rule_key)
    if (t.commerce_id) q = q.eq('commerce_id', t.commerce_id)
    else q = q.is('commerce_id', null)
    const { data: existing } = await q
    const stillActive       = (existing || []).some(s => !s.dismissed_at)
    const recentlyDismissed = (existing || []).some(s => s.dismissed_at && s.dismissed_at > dismissCutoff)
    if (!stillActive && !recentlyDismissed) newTriggers.push(t)
  }

  if (newTriggers.length > 0) {
    let drafted = []
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        drafted = await callRedactor(newTriggers)
      } catch (err) {
        console.error('[suggestions] redactor error:', err.message)
      }
    }

    const expiresAt = new Date(Date.now() + SUGGESTION_TTL_MS).toISOString()
    const rows = newTriggers.map((t) => {
      const d = drafted.find((x) => x.rule_key === t.rule_key) || {}
      return {
        user_id: userId,
        commerce_id: t.commerce_id || null,
        target: t.target,
        rule_key: t.rule_key,
        title: d.title || fallbackTitle(t),
        body:  d.body  || fallbackBody(t),
        cta_label: d.cta_label || null,
        cta_url:   d.cta_url   || null,
        expires_at: expiresAt,
      }
    })
    if (rows.length > 0) {
      const { error } = await supabaseAdmin.from('suggestions').insert(rows)
      if (error) console.error('[suggestions] insert error:', error.message)
    }
  }

  // Marcamos el run aunque no haya triggers nuevos — evita pegarle al motor de reglas en cada GET
  await supabaseAdmin
    .from('profiles')
    .update({ last_suggestions_run: new Date().toISOString() })
    .eq('id', userId)
}

// Fallbacks por si la IA falla o no está configurada
function fallbackTitle(t) {
  const map = {
    no_prizes_loaded:     'Cargá tus primeros premios',
    near_plan_limit:      'Estás cerca del límite del plan',
    no_horarios:          'Faltan tus horarios de atención',
    inactive_clients:     'Tenés clientes que no vuelven',
    close_to_prize:       'Estás cerca de un premio',
    inactive_in_club:     'Hace tiempo que no pasás por un club',
    active_promo_in_club: 'Hay una promo activa en tu club',
  }
  return map[t.rule_key] || 'Sugerencia disponible'
}
function fallbackBody(t) {
  const ctx = t.context || {}
  const map = {
    no_prizes_loaded:     `Sin premios cargados los clientes no tienen para qué sumar. Entrá a Premios y cargá los primeros.`,
    near_plan_limit:      `Llegaste a ${ctx.current} de ${ctx.limit} clientes en plan ${ctx.plan}. Considerá pasarte a ${ctx.next_plan}.`,
    no_horarios:          `Configurá los horarios de ${ctx.commerce_name} para que tus clientes sepan cuándo vas a atender.`,
    inactive_clients:     `Tenés ${ctx.count} clientes que no vuelven hace +${ctx.days} días. Una promo puede reactivarlos.`,
    close_to_prize:       `Te faltan ${ctx.diff} ${ctx.unit} para ${ctx.prize_name} en ${ctx.commerce_name}.`,
    inactive_in_club:     `Hace ${ctx.days} días que no escaneás en ${ctx.commerce_name}.`,
    active_promo_in_club: `Hay una promo activa en ${ctx.commerce_name}.`,
  }
  return map[t.rule_key] || ''
}

export async function GET(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const force = new URL(request.url).searchParams.get('refresh') === '1'
    if (force || (await shouldRefresh(user.id))) {
      await runRefresh(user.id)
    }

    const list = await listActive(user.id)
    return NextResponse.json({ suggestions: list })
  } catch (err) {
    console.error('[suggestions GET]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
