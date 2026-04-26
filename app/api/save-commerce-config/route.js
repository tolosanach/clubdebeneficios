// POST /api/save-commerce-config
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { validateCategoryInput } from '../../../lib/categories'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const {
    commerce_id, name, category, customCategory, description, img_url, cover_image,
    phone, instagram, facebook, province, city_name, address, hours_structured, brand_color,
    prog_min_purchase,
  } = body

  if (!commerce_id) return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })

  const { data: commerce, error: ownerErr } = await supabaseAdmin
    .from('commerces').select('id, owner_id, lat, lng, address, category, name, name_changed_at').eq('id', commerce_id).single()
  if (ownerErr || !commerce) return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
  if (commerce.owner_id !== user.id) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  // Lock de cambio de nombre — 20 días entre cambios para evitar spam.
  // Solo aplica cuando el body envía un name distinto del guardado actual.
  let nameChangedAtUpdate = undefined
  if (name !== undefined && name !== null && name.trim() && name.trim() !== commerce.name) {
    if (commerce.name_changed_at) {
      const last = new Date(commerce.name_changed_at).getTime()
      const ms20 = 20 * 24 * 60 * 60 * 1000
      const elapsed = Date.now() - last
      if (elapsed < ms20) {
        const unlockAt = new Date(last + ms20)
        const daysLeft = Math.ceil((ms20 - elapsed) / (24*60*60*1000))
        return NextResponse.json({
          error: 'name_locked',
          message: `Solo podés cambiar el nombre cada 20 días. Faltan ${daysLeft} día${daysLeft===1?'':'s'} (${unlockAt.toLocaleDateString('es-AR')}).`,
          unlock_at: unlockAt.toISOString(),
          days_left: daysLeft,
        }, { status: 403 })
      }
    }
    nameChangedAtUpdate = new Date().toISOString()
  }

  // Nominatim geocoding — silent fail, never blocks save
  let lat = commerce.lat ?? null
  let lng = commerce.lng ?? null
  const addressChanged = address && address !== commerce.address
  if (address && (addressChanged || lat === null)) {
    try {
      const q = [address, city_name, province, 'Argentina'].filter(Boolean).join(', ')
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        {
          headers: { 'User-Agent': 'Benefix/1.0 (contacto@benefix.app)' },
          signal: AbortSignal.timeout(5000),
        }
      )
      const geoData = await geoRes.json()
      if (geoData?.length) {
        lat = parseFloat(geoData[0].lat)
        lng = parseFloat(geoData[0].lon)
      }
    } catch (_) {}
  }

  let resolvedCategory = null
  if (category !== undefined && category !== null) {
    // Si la categoría enviada es exactamente la que ya está guardada en la DB,
    // no hay cambio real — saltamos la validación. Esto evita rechazar guardadas
    // de otros campos (ej: horarios) cuando el comercio tiene una categoría
    // custom registrada vía "Otro" (ej: "Kinesiólogo") que no está en la lista
    // predefinida y por lo tanto no pasaría el validador estricto.
    if (category === commerce.category) {
      resolvedCategory = commerce.category
    } else {
      const catResult = validateCategoryInput({ category, customCategory }, user.id)
      if (!catResult.valid) return NextResponse.json({ error: catResult.error }, { status: 400 })
      resolvedCategory = catResult.resolvedValue
    }
  }

  // Solo incluir keys presentes en el body para evitar nullear campos
  // no enviados en updates parciales.
  const update = {
    ...(body.name             !== undefined && { name:             name?.trim() || null }),
    ...(body.description      !== undefined && { description:      description || null }),
    ...(body.img_url          !== undefined && { img_url:          img_url || null }),
    ...(body.cover_image      !== undefined && { cover_image:      cover_image || null }),
    ...(body.phone            !== undefined && { phone:            phone || null }),
    ...(body.instagram        !== undefined && { instagram:        instagram || null }),
    ...(body.facebook         !== undefined && { facebook:         facebook || null }),
    ...(body.province         !== undefined && { province:         province || null }),
    ...(body.city_name        !== undefined && { city_name:        city_name || null }),
    ...(body.address          !== undefined && { address:          address || null }),
    ...(body.hours_structured !== undefined && { hours_structured: hours_structured || null }),
    ...(body.brand_color      !== undefined && { brand_color:      brand_color || null }),
    // Compra mínima: solo se acepta si el body la incluye. parseInt > 0 → guardar,
    // sino → NULL. La validación de "solo aplica a stars" la hace el wizard/UI;
    // acá la columna acepta el valor para cualquier prog_type pero solo se usa
    // efectivamente cuando prog_type='stars' (ver /api/scan).
    ...(body.prog_min_purchase !== undefined && {
      prog_min_purchase: parseInt(prog_min_purchase) > 0 ? parseInt(prog_min_purchase) : null
    }),
    ...(resolvedCategory      !== null      && { category:         resolvedCategory }),
    ...(nameChangedAtUpdate   !== undefined && { name_changed_at:  nameChangedAtUpdate }),
    onboarding_done: true,
    lat,
    lng,
  }

  const { error } = await supabaseAdmin.from('commerces').update(update).eq('id', commerce_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, lat, lng })
}
