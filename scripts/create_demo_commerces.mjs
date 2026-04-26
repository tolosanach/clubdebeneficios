/**
 * Crea los 3 comercios de demo (los que aparecen en las tarjetas del cliente)
 * con slugs reales para que el link "ir al club" funcione.
 *
 * Run:  node scripts/create_demo_commerces.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://wcqhapsgwjivtzdseqjz.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWhhcHNnd2ppdnR6ZHNlcWp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI2NTY2NiwiZXhwIjoyMDkxODQxNjY2fQ.L27fJvfzL5pbCXow1Sx0Isz6URbw6IpOp-PJNa8-OEQ'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ─── SVG logo generation (same as upload_demo_logos.mjs) ─────────────────────
const CAT_PALETTE = {
  'Cafetería':  { bg: '#1A0A04', accent: '#C47B35', accent2: '#7C3A10' },
  'Barbería':   { bg: '#0D0F14', accent: '#A0B4CC', accent2: '#2A3A4F' },
  'Heladería':  { bg: '#04101A', accent: '#5EC8C0', accent2: '#0D5A78' },
  'default':    { bg: '#0A080E', accent: '#A78BFA', accent2: '#4C1D95' },
}

function getInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function getPalette(category) {
  if (CAT_PALETTE[category]) return CAT_PALETTE[category]
  const key = Object.keys(CAT_PALETTE).find(k => k !== 'default' &&
    (category?.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(category?.toLowerCase())))
  return key ? CAT_PALETTE[key] : CAT_PALETTE.default
}

function hash(str) {
  let h = 0
  for (const c of str) { h = (h * 31 + c.charCodeAt(0)) >>> 0 }
  return h / 0xFFFFFFFF
}

function makeSvg(name, category) {
  const initials = getInitials(name)
  const p = getPalette(category)
  const r = hash(name)
  const style = Math.floor(r * 4)

  let deco = ''
  if (style === 0) {
    deco = `
      <circle cx="20" cy="20" r="18" fill="none" stroke="${p.accent}" stroke-width="0.6" opacity="0.18"/>
      <circle cx="20" cy="20" r="13" fill="none" stroke="${p.accent}" stroke-width="0.5" opacity="0.14"/>`
  } else if (style === 1) {
    const pts = [7,15,23,31].flatMap(x => [7,15,23,31].map(y => ({ x, y })))
    deco = pts.map(({ x, y }) => `<circle cx="${x}" cy="${y}" r="1.2" fill="${p.accent}" opacity="0.18"/>`).join('')
  } else if (style === 2) {
    deco = `
      <line x1="0" y1="10" x2="10" y2="0" stroke="${p.accent}" stroke-width="1.5" opacity="0.14"/>
      <line x1="0" y1="25" x2="25" y2="0" stroke="${p.accent}" stroke-width="1.5" opacity="0.14"/>
      <line x1="0" y1="40" x2="40" y2="0" stroke="${p.accent}" stroke-width="1.5" opacity="0.14"/>
      <line x1="10" y1="40" x2="40" y2="10" stroke="${p.accent}" stroke-width="1.5" opacity="0.14"/>
      <line x1="25" y1="40" x2="40" y2="25" stroke="${p.accent}" stroke-width="1.5" opacity="0.14"/>`
  } else {
    deco = `
      <circle cx="38" cy="2" r="14" fill="${p.accent2}" opacity="0.35"/>
      <circle cx="2" cy="38" r="10" fill="${p.accent2}" opacity="0.22"/>`
  }

  const fs = initials.length === 1 ? 19 : 15
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" fill="${p.bg}"/>
  ${deco}
  <text x="20" y="${20 + fs * 0.36}" text-anchor="middle" dominant-baseline="auto"
    font-family="system-ui,-apple-system,sans-serif" font-size="${fs}" font-weight="900"
    fill="${p.accent}" letter-spacing="-0.5">${initials}</text>
</svg>`
}

// ─── Demo commerce definitions ────────────────────────────────────────────────
const DEMO_COMMERCES = [
  {
    slug:        'cafe-berlin',
    name:        'Café Berlín',
    category:    'Cafetería',
    description: 'El café más acogedor de Buenos Aires. Especialidad en café de especialidad, medialunas artesanales y el mejor ambiente para trabajar o reunirse con amigos.',
    city_name:   'Buenos Aires',
    province:    'Buenos Aires',
    address:     'Av. Corrientes 1234, Buenos Aires',
    phone:       '1140001234',
    instagram:   '@cafeberlinar',
    prog_type:   'points',
    prog_goal:   500,
    prog_pts:    100,
    reward_text: 'Un café de especialidad completamente gratis',
    rating:      4.8,
    plan:        'pro',
    featured:    true,
    prizes: [
      { name: 'Café gratis',          cost: 100, stock: null },
      { name: 'Medialunas x4',        cost: 200, stock: 10  },
      { name: 'Desayuno completo',    cost: 400, stock: null },
    ],
    promo: { type: 'discount_next', value: 10, description: '10% OFF en tu próxima visita', expiration_type: 'relative', expiration_days: 30 },
  },
  {
    slug:        'barberia-premium',
    name:        'Barbería Premium',
    category:    'Barbería',
    description: 'La mejor barbería de General Pico. Cortes clásicos y modernos, afeitado a navaja y los mejores productos para el cuidado masculino.',
    city_name:   'Gral. Pico',
    province:    'La Pampa',
    address:     'Calle Pellegrini 520, General Pico',
    phone:       '2302456789',
    instagram:   '@barberiapremiumgp',
    prog_type:   'stars',
    prog_goal:   10,
    prog_pts:    1,
    reward_text: 'Un corte de cabello completamente gratis',
    rating:      4.9,
    plan:        'starter',
    featured:    false,
    prizes: [
      { name: 'Corte gratis',         cost: 10, stock: null },
      { name: 'Corte + barba gratis', cost: 15, stock: null },
    ],
    promo: null,
  },
  {
    slug:        'heladeria-coppola',
    name:        'Heladería Coppola',
    category:    'Heladería',
    description: 'Helados artesanales de elaboración propia. Más de 40 sabores rotativos, opciones veganas y los clásicos de siempre. Desde 1987 endulzando Buenos Aires.',
    city_name:   'Buenos Aires',
    province:    'Buenos Aires',
    address:     'Av. Santa Fe 2234, Buenos Aires',
    phone:       '1155667788',
    instagram:   '@heladeriacoppola',
    prog_type:   'points',
    prog_goal:   300,
    prog_pts:    100,
    reward_text: 'Un kilo de helado artesanal completamente gratis',
    rating:      4.7,
    plan:        'free',
    featured:    false,
    prizes: [
      { name: '1/4 kg gratis',  cost: 100, stock: null },
      { name: '1/2 kg gratis',  cost: 200, stock: null },
      { name: '1 kg gratis',    cost: 300, stock: null },
    ],
    promo: { type: 'double_points', value: 0, description: 'Doble puntos los fines de semana', expiration_type: 'fixed', expiration_date: new Date(Date.now() + 30 * 864e5).toISOString() },
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Fetch existing cities to map city_id
  const { data: cities } = await supabase.from('cities').select('id, name, slug')
  const cityMap = {}
  if (cities) {
    for (const c of cities) {
      cityMap[c.name.toLowerCase()] = c.id
      cityMap[c.slug.toLowerCase()] = c.id
    }
  }

  for (const def of DEMO_COMMERCES) {
    console.log(`\n── ${def.name} ──`)

    // Check if already exists
    const { data: existing } = await supabase
      .from('commerces').select('id').eq('slug', def.slug).single()

    if (existing) {
      console.log(`  ⚠ Ya existe (id: ${existing.id}) — actualizando datos...`)
      const cid = existing.id
      await supabase.from('commerces').update({
        description: def.description,
        rating:      def.rating,
        plan:        def.plan,
        featured:    def.featured,
        active:      true,
        onboarding_done: true,
      }).eq('id', cid)

      // Insert prizes only if none exist yet
      const { data: existingPrizes } = await supabase.from('prizes').select('id').eq('commerce_id', cid)
      if (!existingPrizes || existingPrizes.length === 0) {
        for (const p of def.prizes) {
          const { error: pErr } = await supabase.from('prizes').insert({
            commerce_id: cid, name: p.name, cost: p.cost, stock: p.stock ?? null, active: true,
          })
          if (pErr) console.error(`    ✗ Prize "${p.name}":`, pErr.message)
          else       console.log(`    ✓ Premio: ${p.name} (${p.cost} pts)`)
        }
      } else {
        console.log(`    ℹ ${existingPrizes.length} premios ya existen, no se tocan`)
      }

      await uploadLogo(cid, def.name, def.category)
      continue
    }

    // Look up city_id
    const cityId = cityMap[def.city_name.toLowerCase()] || null
    if (!cityId) console.log(`  ℹ ciudad "${def.city_name}" no encontrada en cities, se guarda solo city_name`)

    // Insert commerce
    const { data: commerce, error: insertErr } = await supabase
      .from('commerces')
      .insert({
        slug:         def.slug,
        name:         def.name,
        category:     def.category,
        description:  def.description,
        city_id:      cityId,
        city_name:    def.city_name,
        province:     def.province,
        address:      def.address,
        phone:        def.phone,
        instagram:    def.instagram,
        prog_type:    def.prog_type,
        prog_goal:    def.prog_goal,
        prog_pts:     def.prog_pts,
        reward_text:  def.reward_text,
        rating:       def.rating,
        plan:         def.plan,
        featured:     def.featured,
        active:       true,
        onboarding_done: true,
        owner_id:     null,
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error(`  ✗ Error insertando:`, insertErr.message)
      continue
    }

    const cid = commerce.id
    console.log(`  ✓ Comercio creado (id: ${cid})`)

    // Insert prizes
    for (const p of def.prizes) {
      const { error: pErr } = await supabase.from('prizes').insert({
        commerce_id: cid,
        name:        p.name,
        cost:        p.cost,
        stock:       p.stock ?? null,
        active:      true,
      })
      if (pErr) console.error(`    ✗ Prize "${p.name}":`, pErr.message)
      else       console.log(`    ✓ Premio: ${p.name} (${p.cost} pts)`)
    }

    // Insert promo (if any)
    if (def.promo) {
      const { error: promoErr } = await supabase.from('promotions').insert({
        commerce_id:     cid,
        type:            def.promo.type,
        value:           def.promo.value,
        description:     def.promo.description,
        expiration_type: def.promo.expiration_type,
        expiration_date: def.promo.expiration_date ?? null,
        expiration_days: def.promo.expiration_days ?? null,
        active:          true,
      })
      if (promoErr) console.error(`    ✗ Promo:`, promoErr.message)
      else          console.log(`    ✓ Promo: ${def.promo.description}`)
    }

    // Upload logo
    await uploadLogo(cid, def.name, def.category)
  }

  console.log('\n✅ Listo')
}

async function uploadLogo(commerceId, name, category) {
  const svg  = makeSvg(name, category)
  const buf  = Buffer.from(svg, 'utf-8')
  const path = `${commerceId}/logo-demo.svg`

  const { error: upErr } = await supabase.storage
    .from('commerce-images')
    .upload(path, buf, { contentType: 'image/svg+xml', upsert: true })

  if (upErr) {
    console.error(`  ✗ Logo upload:`, upErr.message)
    return
  }

  const { data: urlData } = supabase.storage.from('commerce-images').getPublicUrl(path)

  const { error: dbErr } = await supabase
    .from('commerces').update({ img_url: urlData.publicUrl }).eq('id', commerceId)

  if (dbErr) console.error(`  ✗ Logo DB update:`, dbErr.message)
  else       console.log(`  ✓ Logo subido`)
}

main()
