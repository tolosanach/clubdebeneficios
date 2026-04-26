// SEED DATA — Solo para desarrollo. No correr en producción.
//
// Crea 4 comercios de prueba + membresías + promos para el cliente
// sitiospampa@gmail.com, cubriendo todos los estados visuales del
// wallet stack: estrellas, puntos, con y sin promo activa.
//
// Uso: node scripts/seed-test-clubs.js

const { createClient } = require('@supabase/supabase-js')
const fs   = require('fs')
const path = require('path')

// ── Cargar .env.local ─────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const [k, ...rest] = line.split('=')
  if (k && rest.length) process.env[k.trim()] = rest.join('=').trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// ── Helpers ───────────────────────────────────────────────────────────────────
const ok = (label, data) => console.log(`  ✓ ${label}`, typeof data === 'object' ? JSON.stringify(data) : data)
const fail = (label, err) => { console.error(`  ✗ ${label}:`, err.message ?? err); process.exit(1) }

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function endOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
}

// ── Datos de seed ─────────────────────────────────────────────────────────────
const CLIENT_EMAIL = 'sitiospampa@gmail.com'

const COMMERCE_DEFS = [
  {
    slug:        'cafe-berlin',
    name:        'Café Berlín',
    category:    'Cafetería',
    prog_type:   'stars',
    prog_goal:   10,
    prog_pts:    1,
    reward_text: 'Café gratis',
    // membership
    stars:        7,
    points:       0,
    visits_count: 14,
    last_visit:   daysAgo(2),
    // promo
    promo: {
      type:            'discount_next',
      value:           15,
      description:     '15% OFF en tu próxima visita',
      expires_at:      daysFromNow(7),
      expiration_type: 'fixed',
      expiration_days: null,
      active:          true,
      // client_promo expires_at (fixed = same as promotion.expires_at)
      cp_expires_at:   daysFromNow(7),
    },
  },
  {
    slug:        'barberia-don-carlos',
    name:        'Barbería Don Carlos',
    category:    'Barbería',
    prog_type:   'stars',
    prog_goal:   10,
    prog_pts:    1,
    reward_text: 'Corte gratis',
    // membership
    stars:        4,
    points:       0,
    visits_count: 7,
    last_visit:   daysAgo(5),
    // promo
    promo: {
      type:            'double_points',
      value:           0,
      description:     'Suma doble hasta fin de mes',
      expires_at:      endOfMonth(),
      expiration_type: 'fixed',
      expiration_days: null,
      active:          true,
      cp_expires_at:   null, // double_points no genera client_promo
    },
  },
  {
    slug:        'heladeria-coppola',
    name:        'Heladería Coppola',
    category:    'Heladería',
    prog_type:   'points',
    prog_goal:   500,
    prog_pts:    40,
    reward_text: 'Kilo de helado gratis',
    // membership — la más reciente, arranca expandida
    stars:        0,
    points:       320,
    visits_count: 8,
    last_visit:   daysAgo(1),
    // sin promo
    promo: null,
  },
  {
    slug:        'pizzeria-napoli',
    name:        'Pizzería Napoli',
    category:    'Pizzería',
    prog_type:   'points',
    prog_goal:   1000,
    prog_pts:    75,
    reward_text: 'Pizza familiar gratis',
    // membership
    stars:        0,
    points:       750,
    visits_count: 10,
    last_visit:   daysAgo(10),
    // promo
    promo: {
      type:            'discount_next',
      value:           10,
      description:     '10% OFF en tu próxima visita',
      expires_at:      daysFromNow(14),
      expiration_type: 'fixed',
      expiration_days: null,
      active:          true,
      cp_expires_at:   daysFromNow(14),
    },
  },
]

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱  Seed: clubes de prueba para wallet stack')
  console.log('────────────────────────────────────────────\n')

  // 1. Buscar el usuario cliente
  console.log(`1. Buscando usuario: ${CLIENT_EMAIL}`)
  const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers()
  if (uErr) fail('listUsers', uErr)
  const user = users.find(u => u.email === CLIENT_EMAIL)
  if (!user) fail('usuario', new Error(`No encontré ${CLIENT_EMAIL} en auth.users`))
  ok('user', `id=${user.id} email=${user.email}`)

  // Verificar que tiene perfil
  const { data: profile, error: pErr } = await supabase.from('profiles').select('id').eq('id', user.id).single()
  if (pErr || !profile) fail('profile', pErr ?? new Error('Perfil no encontrado'))
  ok('profile', `id=${profile.id}`)

  console.log()
  const results = []

  for (const def of COMMERCE_DEFS) {
    console.log(`2. Procesando: ${def.name}`)

    // ── Comercio ────────────────────────────────────────────────────────────
    let commerceId
    const { data: existing } = await supabase
      .from('commerces')
      .select('id, name')
      .eq('slug', def.slug)
      .maybeSingle()

    if (existing) {
      commerceId = existing.id
      ok(`  comercio existente`, `id=${commerceId}`)
    } else {
      const { data: created, error: cErr } = await supabase
        .from('commerces')
        .insert({
          slug:         def.slug,
          name:         def.name,
          category:     def.category,
          prog_type:    def.prog_type,
          prog_goal:    def.prog_goal,
          prog_pts:     def.prog_pts,
          reward_text:  def.reward_text,
          active:       true,
          onboarding_done: true,
          plan:         'free',
        })
        .select('id')
        .single()
      if (cErr) fail(`comercio ${def.name}`, cErr)
      commerceId = created.id
      ok(`  comercio creado`, `id=${commerceId}`)
    }

    // ── Membership ──────────────────────────────────────────────────────────
    let membershipId
    const { data: existingMb } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('commerce_id', commerceId)
      .maybeSingle()

    if (existingMb) {
      membershipId = existingMb.id
      // Actualizar datos de progreso
      const { error: updErr } = await supabase
        .from('memberships')
        .update({
          stars:        def.stars,
          points:       def.points,
          visits_count: def.visits_count,
          last_visit:   def.last_visit,
        })
        .eq('id', membershipId)
      if (updErr) fail(`membership update ${def.name}`, updErr)
      ok(`  membership actualizada`, `id=${membershipId}`)
    } else {
      const { data: created, error: mErr } = await supabase
        .from('memberships')
        .insert({
          user_id:      user.id,
          commerce_id:  commerceId,
          stars:        def.stars,
          points:       def.points,
          visits_count: def.visits_count,
          last_visit:   def.last_visit,
          joined_at:    daysAgo(30 + Math.floor(Math.random() * 60)),
        })
        .select('id')
        .single()
      if (mErr) fail(`membership ${def.name}`, mErr)
      membershipId = created.id
      ok(`  membership creada`, `id=${membershipId}`)
    }

    // ── Promoción ────────────────────────────────────────────────────────────
    let promotionId = null
    if (def.promo) {
      const { data: existingPromo } = await supabase
        .from('promotions')
        .select('id')
        .eq('commerce_id', commerceId)
        .eq('type', def.promo.type)
        .eq('active', true)
        .maybeSingle()

      if (existingPromo) {
        promotionId = existingPromo.id
        // Actualizar fecha de vencimiento
        await supabase.from('promotions').update({ expires_at: def.promo.expires_at }).eq('id', promotionId)
        ok(`  promo existente`, `id=${promotionId} type=${def.promo.type}`)
      } else {
        const { data: created, error: prErr } = await supabase
          .from('promotions')
          .insert({
            commerce_id:     commerceId,
            type:            def.promo.type,
            value:           def.promo.value,
            description:     def.promo.description,
            expires_at:      def.promo.expires_at,
            expiration_type: def.promo.expiration_type,
            expiration_days: def.promo.expiration_days,
            active:          true,
          })
          .select('id')
          .single()
        if (prErr) fail(`promo ${def.name}`, prErr)
        promotionId = created.id
        ok(`  promo creada`, `id=${promotionId} type=${def.promo.type}`)
      }

      // ── client_promotion (solo para discount_next) ────────────────────────
      if (def.promo.cp_expires_at && promotionId) {
        const { data: existingCp } = await supabase
          .from('client_promotions')
          .select('id')
          .eq('promotion_id', promotionId)
          .eq('membership_id', membershipId)
          .maybeSingle()

        if (existingCp) {
          await supabase.from('client_promotions')
            .update({ expires_at: def.promo.cp_expires_at, status: 'active' })
            .eq('id', existingCp.id)
          ok(`  client_promo actualizada`, `id=${existingCp.id}`)
        } else {
          const { data: cpCreated, error: cpErr } = await supabase
            .from('client_promotions')
            .insert({
              promotion_id:  promotionId,
              membership_id: membershipId,
              granted_at:    new Date().toISOString(),
              expires_at:    def.promo.cp_expires_at,
              status:        'active',
            })
            .select('id')
            .single()
          if (cpErr) fail(`client_promo ${def.name}`, cpErr)
          ok(`  client_promo creada`, `id=${cpCreated.id}`)
        }
      }
    } else {
      ok(`  sin promo`, '—')
    }

    results.push({ name: def.name, commerceId, membershipId, promotionId })
    console.log()
  }

  // ── Verificación final ────────────────────────────────────────────────────
  console.log('3. Verificando membresías del cliente...')
  const { data: mbs, error: mbErr } = await supabase
    .from('memberships')
    .select('id, stars, points, visits_count, last_visit, commerce:commerces(name, slug)')
    .eq('user_id', user.id)
    .in('commerce_id', results.map(r => r.commerceId))
    .order('last_visit', { ascending: false })

  if (mbErr) fail('verificación', mbErr)

  console.log(`\n  ${mbs.length} membresías encontradas:`)
  for (const mb of mbs) {
    console.log(`  · ${mb.commerce?.name} — estrellas:${mb.stars} puntos:${mb.points} visitas:${mb.visits_count} última:${mb.last_visit?.slice(0,10)}`)
  }

  console.log('\n4. Verificando promos activas...')
  const { data: promos, error: proErr } = await supabase
    .from('promotions')
    .select('id, type, value, expires_at, active, commerce:commerces(name)')
    .in('commerce_id', results.map(r => r.commerceId))
    .eq('active', true)

  if (proErr) fail('verificación promos', proErr)
  console.log(`\n  ${promos.length} promos activas:`)
  for (const p of promos) {
    console.log(`  · ${p.commerce?.name} — ${p.type} valor:${p.value} vence:${p.expires_at?.slice(0,10)}`)
  }

  console.log('\n────────────────────────────────────────────')
  console.log('✅  Seed completado exitosamente')
  console.log('\nResumen de IDs:')
  for (const r of results) {
    console.log(`  ${r.name}`)
    console.log(`    commerce_id:   ${r.commerceId}`)
    console.log(`    membership_id: ${r.membershipId}`)
    if (r.promotionId) console.log(`    promotion_id:  ${r.promotionId}`)
  }
  console.log()
}

main().catch(err => { console.error('\n❌ Error inesperado:', err); process.exit(1) })
