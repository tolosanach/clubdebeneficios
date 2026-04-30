// POST /api/signup/minimal
//
// Endpoint del flujo nuevo de login (abr 2026). Reemplaza al onboarding viejo
// de 6 pasos para usuarios nuevos: una sola pantalla con los datos mínimos
// indispensables y los manda directo a usar la app.
//
// Modos:
//   • mode='client'  — pide nombre + teléfono. Marca onboarding_completed.
//   • mode='merchant'— además crea la fila en `commerces` con rubro(s),
//                      ciudad y prog_type elegido. Setea profile.role.
//
// Diseño: low friction. NO subimos logo, NO pedimos descripción, NO armamos
// sistema de premios — todo eso queda para que el comerciante lo cargue
// después en el panel "Mi negocio". El objetivo es que en menos de 30 segundos
// el comerciante ya tenga un club operativo y un QR para escanear.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'
import { validateCategoryInput } from '../../../../lib/categories'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function makeSlug(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const mode = body.mode === 'merchant' ? 'merchant' : 'client'
    const { name, phone, country, province, city } = body

    // ─── Validaciones comunes ────────────────────────────────────────────
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Necesitamos tu nombre' }, { status: 400 })
    }
    if (mode === 'client' && !phone?.trim()) {
      return NextResponse.json({ error: 'El teléfono es obligatorio' }, { status: 400 })
    }

    // ─── Modo cliente: solo profiles ─────────────────────────────────────
    if (mode === 'client') {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          name:                 name.trim(),
          phone:                phone?.trim() || null,
          country:              country?.trim()  || 'argentina',
          province:             province?.trim() || null,
          city:                 city?.trim()     || null,
          onboarding_completed: true,
        })
        .eq('id', user.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, mode: 'client' })
    }

    // ─── Modo comerciante: profiles + commerces ──────────────────────────
    const { businessName, categories, customCategory, prog_type } = body

    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'Necesitamos el nombre de tu negocio' }, { status: 400 })
    }
    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ error: 'Elegí al menos un rubro' }, { status: 400 })
    }
    if (categories.length > 3) {
      return NextResponse.json({ error: 'Máximo 3 rubros' }, { status: 400 })
    }
    if (!city?.trim() || !province?.trim()) {
      return NextResponse.json({ error: 'Necesitamos tu ciudad' }, { status: 400 })
    }

    // Validar cada categoría reusando el helper compartido. La primera será
    // espejo en `commerces.category` (legacy single-cat).
    const cleanedCats = []
    const seen = new Set()
    for (const c of categories) {
      const catResult = validateCategoryInput({ category: c, customCategory }, user.id)
      if (!catResult.valid) {
        return NextResponse.json({ error: catResult.error }, { status: 400 })
      }
      const v = catResult.resolvedValue
      if (seen.has(v.toLowerCase())) continue
      seen.add(v.toLowerCase())
      cleanedCats.push(v)
    }

    const safeProgType = ['stars', 'points'].includes(prog_type) ? prog_type : 'stars'

    // ¿Ya tiene comercio? — chequeo idempotente. Si ya existe, devolvemos
    // ok=true con el commerce_id existente para que el frontend no se rompa
    // si el modal se reenvía por accidente.
    const { data: existing } = await supabaseAdmin
      .from('commerces')
      .select('id, slug')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (existing) {
      // Igual actualizamos profile + role — el modal puede haberse usado
      // para "convertirse en comerciante" desde una cuenta cliente vieja.
      await supabaseAdmin.from('profiles').update({
        ...(name?.trim() && { name: name.trim() }),
        ...(phone?.trim() && { phone: phone.trim() }),
        role: 'commerce_owner',
        onboarding_completed: true,
      }).eq('id', user.id)
      return NextResponse.json({ ok: true, mode: 'merchant', commerce_id: existing.id, slug: existing.slug })
    }

    // Slug único — base + sufijo si choca.
    const baseSlug = makeSlug(businessName.trim())
    let slug = baseSlug || `club-${user.id.slice(0, 8)}`
    const { count } = await supabaseAdmin
      .from('commerces')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
    if (count > 0) slug = `${slug}-${Date.now().toString(36)}`

    function buildPayload(currentSlug) {
      return {
        owner_id:     user.id,
        name:         businessName.trim(),
        slug:         currentSlug,
        category:     cleanedCats[0],
        categories:   cleanedCats,
        city_name:    city.trim()     || null,
        province:     province.trim() || null,
        country:      country?.trim() || 'argentina',
        description:  '',
        prog_type:    safeProgType,
        prog_goal:    safeProgType === 'stars' ? 10 : 1000,
        prog_pts:     1,
        reward_text:  'Próximamente...',
        reward_color: '#BD4BF8',
        plan:         'free',
        active:       true,
        featured:     false,
        rating:       5.0,
        // El alta nueva (4 pasos) reemplaza el onboarding viejo de 10 pasos.
        // Marcamos onboarding_done en true para que CommerceSettingsView NO
        // vuelva a mostrar el flujo viejo después del signup.
        onboarding_done: true,
      }
    }

    let { data: commerce, error: commerceError } = await supabaseAdmin
      .from('commerces')
      .insert(buildPayload(slug))
      .select()
      .single()

    // Race-recovery por slug.
    if (commerceError && commerceError.code === '23505') {
      slug = `${baseSlug}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
      const retry = await supabaseAdmin
        .from('commerces')
        .insert(buildPayload(slug))
        .select()
        .single()
      commerce      = retry.data
      commerceError = retry.error
    }

    if (commerceError) {
      return NextResponse.json({ error: commerceError.message }, { status: 500 })
    }

    // Profiles update — nombre/phone si vinieron, role + onboarding_completed.
    await supabaseAdmin.from('profiles').update({
      ...(name?.trim() && { name: name.trim() }),
      ...(phone?.trim() && { phone: phone.trim() }),
      country:              country?.trim() || 'argentina',
      province:             province.trim() || null,
      city:                 city.trim()     || null,
      role:                 'commerce_owner',
      onboarding_completed: true,
    }).eq('id', user.id)

    return NextResponse.json({
      ok:           true,
      mode:         'merchant',
      commerce_id:  commerce.id,
      slug:         commerce.slug,
    })
  } catch (err) {
    console.error('signup/minimal error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
