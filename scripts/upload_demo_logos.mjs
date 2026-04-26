/**
 * Generates a unique SVG logo for every commerce that has no img_url,
 * uploads it to the 'commerce-images' Supabase Storage bucket,
 * and updates the img_url column in the commerces table.
 *
 * Run:  node scripts/upload_demo_logos.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://wcqhapsgwjivtzdseqjz.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWhhcHNnd2ppdnR6ZHNlcWp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI2NTY2NiwiZXhwIjoyMDkxODQxNjY2fQ.L27fJvfzL5pbCXow1Sx0Isz6URbw6IpOp-PJNa8-OEQ'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ─── Category → palette ───────────────────────────────────────────────────────
const CAT_PALETTE = {
  'Cafetería':          { bg: '#1A0A04', accent: '#C47B35', accent2: '#7C3A10' },
  'Café':               { bg: '#1A0A04', accent: '#C47B35', accent2: '#7C3A10' },
  'Restaurant':         { bg: '#0D1A0A', accent: '#4CAF50', accent2: '#1B5E20' },
  'Restaurante':        { bg: '#0D1A0A', accent: '#4CAF50', accent2: '#1B5E20' },
  'Panadería':          { bg: '#1A1204', accent: '#E8A040', accent2: '#8B5E10' },
  'Heladería':          { bg: '#04101A', accent: '#5EC8C0', accent2: '#0D5A78' },
  'Barbería':           { bg: '#0D0F14', accent: '#A0B4CC', accent2: '#2A3A4F' },
  'Peluquería':         { bg: '#14040D', accent: '#E879B8', accent2: '#7B1C5E' },
  'Spa':                { bg: '#080E14', accent: '#7EB8D8', accent2: '#1A4A6E' },
  'Gym':                { bg: '#0A0A0A', accent: '#FF4444', accent2: '#880000' },
  'Gimnasio':           { bg: '#0A0A0A', accent: '#FF4444', accent2: '#880000' },
  'Farmacia':           { bg: '#041A08', accent: '#44DD88', accent2: '#0A6622' },
  'Librería':           { bg: '#100A1A', accent: '#A855F7', accent2: '#4C1D95' },
  'Ferretería':         { bg: '#0E0A06', accent: '#D4783A', accent2: '#6B3010' },
  'Ropa':               { bg: '#0A0414', accent: '#C084FC', accent2: '#5B21B6' },
  'Indumentaria':       { bg: '#0A0414', accent: '#C084FC', accent2: '#5B21B6' },
  'Zapatería':          { bg: '#0F080A', accent: '#F472B6', accent2: '#831843' },
  'Supermercado':       { bg: '#041210', accent: '#34D399', accent2: '#064E3B' },
  'Verdulería':         { bg: '#041A04', accent: '#84CC16', accent2: '#365314' },
  'Carnicería':         { bg: '#1A0404', accent: '#F87171', accent2: '#7F1D1D' },
  'Veterinaria':        { bg: '#040E1A', accent: '#60A5FA', accent2: '#1E3A6E' },
  'Kiosco':             { bg: '#0A0A04', accent: '#FACC15', accent2: '#713F12' },
  'Electrónica':        { bg: '#040A1A', accent: '#38BDF8', accent2: '#0C4A6E' },
  'Automotriz':         { bg: '#0A0606', accent: '#FB923C', accent2: '#7C2D12' },
  'Óptica':             { bg: '#04101A', accent: '#67E8F9', accent2: '#164E63' },
  'Odontología':        { bg: '#041618', accent: '#5EEAD4', accent2: '#134E4A' },
  'Medicina':           { bg: '#040C14', accent: '#7DD3FC', accent2: '#0C3050' },
  'default':            { bg: '#0A080E', accent: '#A78BFA', accent2: '#4C1D95' },
}

// ─── SVG generation ──────────────────────────────────────────────────────────
function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

function getPalette(category) {
  if (!category) return CAT_PALETTE.default
  // exact match
  if (CAT_PALETTE[category]) return CAT_PALETTE[category]
  // partial match
  const key = Object.keys(CAT_PALETTE).find(k => k !== 'default' &&
    (category.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(category.toLowerCase())))
  return key ? CAT_PALETTE[key] : CAT_PALETTE.default
}

// Deterministic hash → float 0–1
function hash(str) {
  let h = 0
  for (const c of str) { h = (h * 31 + c.charCodeAt(0)) >>> 0 }
  return h / 0xFFFFFFFF
}

function makeSvg(name, category) {
  const initials = getInitials(name)
  const p        = getPalette(category)
  const r        = hash(name)

  // Pick a pattern style deterministically
  const style = Math.floor(r * 4)   // 0-3

  let deco = ''
  if (style === 0) {
    // Concentric rings
    deco = `
      <circle cx="20" cy="20" r="18" fill="none" stroke="${p.accent}" stroke-width="0.6" opacity="0.18"/>
      <circle cx="20" cy="20" r="13" fill="none" stroke="${p.accent}" stroke-width="0.5" opacity="0.14"/>
    `
  } else if (style === 1) {
    // Grid dots 3×3
    const pts = [7,15,23,31].flatMap(x => [7,15,23,31].map(y => ({ x, y })))
    deco = pts.map(({ x, y }) =>
      `<circle cx="${x}" cy="${y}" r="1.2" fill="${p.accent}" opacity="0.18"/>`
    ).join('')
  } else if (style === 2) {
    // Diagonal stripes
    deco = `
      <line x1="0" y1="10" x2="10" y2="0" stroke="${p.accent}" stroke-width="1.5" opacity="0.14"/>
      <line x1="0" y1="25" x2="25" y2="0" stroke="${p.accent}" stroke-width="1.5" opacity="0.14"/>
      <line x1="0" y1="40" x2="40" y2="0" stroke="${p.accent}" stroke-width="1.5" opacity="0.14"/>
      <line x1="10" y1="40" x2="40" y2="10" stroke="${p.accent}" stroke-width="1.5" opacity="0.14"/>
      <line x1="25" y1="40" x2="40" y2="25" stroke="${p.accent}" stroke-width="1.5" opacity="0.14"/>
    `
  } else {
    // Corner arc accent
    deco = `
      <circle cx="38" cy="2" r="14" fill="${p.accent2}" opacity="0.35"/>
      <circle cx="2" cy="38" r="10" fill="${p.accent2}" opacity="0.22"/>
    `
  }

  // Font size: 2 chars → 15, 1 char → 19
  const fs  = initials.length === 1 ? 19 : 15
  const fw  = 900

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" fill="${p.bg}"/>
  ${deco}
  <text x="20" y="${20 + fs * 0.36}" text-anchor="middle" dominant-baseline="auto"
    font-family="system-ui,-apple-system,sans-serif" font-size="${fs}" font-weight="${fw}"
    fill="${p.accent}" letter-spacing="-0.5">${initials}</text>
</svg>`
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Fetch all commerces (we'll update all, overwriting existing logos too)
  const { data: commerces, error } = await supabase
    .from('commerces')
    .select('id, name, category, img_url')
    .order('created_at', { ascending: true })

  if (error) { console.error('fetch error:', error); process.exit(1) }
  console.log(`Found ${commerces.length} commerces`)

  let ok = 0, fail = 0

  for (const c of commerces) {
    const svg  = makeSvg(c.name, c.category)
    const buf  = Buffer.from(svg, 'utf-8')
    const path = `${c.id}/logo-demo.svg`

    // Upload to storage
    const { error: upErr } = await supabase.storage
      .from('commerce-images')
      .upload(path, buf, { contentType: 'image/svg+xml', upsert: true })

    if (upErr) {
      console.error(`  ✗ upload ${c.name}:`, upErr.message)
      fail++
      continue
    }

    const { data: urlData } = supabase.storage
      .from('commerce-images')
      .getPublicUrl(path)

    const { error: dbErr } = await supabase
      .from('commerces')
      .update({ img_url: urlData.publicUrl })
      .eq('id', c.id)

    if (dbErr) {
      console.error(`  ✗ update ${c.name}:`, dbErr.message)
      fail++
    } else {
      console.log(`  ✓ ${c.name} (${c.category || 'sin categoría'})`)
      ok++
    }
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`)
}

main()
