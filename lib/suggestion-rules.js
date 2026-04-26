// Motor de reglas heurísticas del buzón de sugerencias.
// Devuelve un array de "triggers" detectados para un user dado. Cada trigger
// es un objeto { rule_key, target, commerce_id, context } que después la IA
// va a redactar como sugerencia humana.
//
// Sin LLM acá: solo SQL y if/else. Barato, predecible, fácil de iterar.

const PLAN_LIMITS = { free: 30, starter: 60, pro: Infinity }
const NEAR_PLAN_BUFFER       = 5    // gatilla cuando memberships ≥ plan_max − 5
const INACTIVE_DAYS          = 30   // días sin venir para considerar inactivo
const INACTIVE_MIN_COUNT     = 5    // mínimo de inactivos en un comercio para alertar al merchant
const CLOSE_TO_PRIZE_LIMIT   = 2    // diff ≤ 2 (estrellas/puntos) ⇒ "estás cerca"

const DAY_MS = 86400 * 1000

export async function detectTriggers(supabaseAdmin, userId) {
  const triggers = []

  // ════════════════ MERCHANT ════════════════
  // Comercios donde el user es owner. Si no tiene ninguno, no se gatilla nada del lado merchant.
  const { data: ownedCommerces } = await supabaseAdmin
    .from('commerces')
    .select('id, name, plan, prog_type, hours_structured')
    .eq('owner_id', userId)
    .eq('active', true)

  for (const c of ownedCommerces || []) {
    await runMerchantRules(supabaseAdmin, c, triggers)
  }

  // ════════════════ CLIENTE ════════════════
  // Memberships activas del user. Cada membership = un club donde es socio.
  const { data: memberships } = await supabaseAdmin
    .from('memberships')
    .select('id, commerce_id, points, stars, last_visit, commerces(id, name, prog_type)')
    .eq('user_id', userId)
    .eq('status', 'active')

  for (const m of memberships || []) {
    if (!m.commerces) continue
    await runClientRules(supabaseAdmin, m, triggers)
  }

  return triggers
}

async function runMerchantRules(supabaseAdmin, c, triggers) {
  const system = c.prog_type || 'stars'

  // R1 · sin premios cargados (en el sistema activo)
  const { count: prizeCount } = await supabaseAdmin
    .from('prizes')
    .select('*', { count: 'exact', head: true })
    .eq('commerce_id', c.id)
    .eq('active', true)
    .eq('system_type', system)

  if ((prizeCount ?? 0) === 0) {
    triggers.push({
      rule_key: 'no_prizes_loaded',
      target: 'merchant',
      commerce_id: c.id,
      context: { commerce_name: c.name, system },
    })
  }

  // R2 · cerca del límite del plan
  const { count: memberCount } = await supabaseAdmin
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('commerce_id', c.id)

  const plan = (c.plan || 'free').toLowerCase()
  const max  = PLAN_LIMITS[plan] ?? Infinity
  if (Number.isFinite(max) && (memberCount ?? 0) >= max - NEAR_PLAN_BUFFER) {
    triggers.push({
      rule_key: 'near_plan_limit',
      target: 'merchant',
      commerce_id: c.id,
      context: {
        commerce_name: c.name,
        plan,
        current: memberCount ?? 0,
        limit: max,
        next_plan: plan === 'free' ? 'starter' : 'pro',
      },
    })
  }

  // R3 · sin horarios configurados
  const hours = c.hours_structured
  const noHours = !hours || (typeof hours === 'object' && Object.keys(hours).length === 0)
  if (noHours) {
    triggers.push({
      rule_key: 'no_horarios',
      target: 'merchant',
      commerce_id: c.id,
      context: { commerce_name: c.name },
    })
  }

  // R4 · clientes inactivos hace +30 días (cantidad relevante)
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * DAY_MS).toISOString()
  const { count: inactiveCount } = await supabaseAdmin
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('commerce_id', c.id)
    .lt('last_visit', cutoff)

  if ((inactiveCount ?? 0) >= INACTIVE_MIN_COUNT) {
    triggers.push({
      rule_key: 'inactive_clients',
      target: 'merchant',
      commerce_id: c.id,
      context: {
        commerce_name: c.name,
        count: inactiveCount,
        days: INACTIVE_DAYS,
      },
    })
  }
}

async function runClientRules(supabaseAdmin, m, triggers) {
  const c = m.commerces
  const system  = c.prog_type || 'stars'
  const balance = system === 'points' ? (m.points ?? 0) : (m.stars ?? 0)

  // R5 · cerca de un premio (≤2 unidades del más barato del club)
  const { data: cheapestPrize } = await supabaseAdmin
    .from('prizes')
    .select('id, name, cost')
    .eq('commerce_id', c.id)
    .eq('active', true)
    .eq('system_type', system)
    .order('cost', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (cheapestPrize && cheapestPrize.cost > balance) {
    const diff = cheapestPrize.cost - balance
    if (diff <= CLOSE_TO_PRIZE_LIMIT) {
      triggers.push({
        rule_key: 'close_to_prize',
        target: 'client',
        commerce_id: c.id,
        context: {
          commerce_name: c.name,
          prize_name: cheapestPrize.name,
          diff,
          unit: system === 'points' ? 'puntos' : 'estrellas',
        },
      })
    }
  }

  // R6 · inactivo en este club hace +30 días
  if (m.last_visit) {
    const daysSince = Math.floor((Date.now() - new Date(m.last_visit).getTime()) / DAY_MS)
    if (daysSince >= INACTIVE_DAYS) {
      triggers.push({
        rule_key: 'inactive_in_club',
        target: 'client',
        commerce_id: c.id,
        context: { commerce_name: c.name, days: daysSince },
      })
    }
  }

  // R7 · hay promo activa en este club
  const nowIso = new Date().toISOString()
  const { data: activePromo } = await supabaseAdmin
    .from('promotions')
    .select('id, type, description')
    .eq('commerce_id', c.id)
    .eq('active', true)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .limit(1)
    .maybeSingle()

  if (activePromo) {
    triggers.push({
      rule_key: 'active_promo_in_club',
      target: 'client',
      commerce_id: c.id,
      context: {
        commerce_name: c.name,
        promo_type: activePromo.type,
        description: activePromo.description,
      },
    })
  }
}
