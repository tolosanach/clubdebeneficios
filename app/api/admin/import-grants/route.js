// POST /api/admin/import-grants
// Body: {
//   commerce_id,
//   clients: [{ name, phone, email }, ...],
//   starting_points: 200,
//   promo: {
//     name: 'Descuento Enigma 30%',
//     value: 30,                        // porcentaje
//     expiration_date: '2026-05-31',    // YYYY-MM-DD
//   }
// }
// Solo accesible para role='admin'.
// Crea (o reutiliza) la promo, inserta pending_grants, devuelve resumen.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'
import { normalizePhone } from '../../../../lib/applyPendingGrant'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Convierte cualquier teléfono argentino a formato canonical "5499XXXXXXXXX"
 * (con código país 54 + 9 + número de 10 dígitos sin el 0 inicial).
 *
 * Se asume que los clientes son argentinos.
 */
function toCanonicalArgPhone(raw) {
  const clean = normalizePhone(raw)
  if (!clean) return null

  let local = clean
  // Quitar prefijos de país comunes
  if (local.startsWith('549') && local.length >= 13) local = local.slice(3)
  else if (local.startsWith('54') && local.length === 12) local = local.slice(2)
  // Quitar 0 prefijo si tiene 11 dígitos
  if (local.length === 11 && local.startsWith('0')) local = local.slice(1)

  // Validar — esperamos 10 dígitos local
  if (local.length !== 10) return null

  return '549' + local
}

export async function POST(request) {
  try {
    // Auth: solo admins
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo admins pueden importar clientes' }, { status: 403 })
    }

    const { commerce_id, clients, starting_points = 0, promo } = await request.json()
    if (!commerce_id) return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })
    if (!Array.isArray(clients) || clients.length === 0)
      return NextResponse.json({ error: 'Falta lista de clientes' }, { status: 400 })

    // Verificar que el comercio existe
    const { data: commerce } = await supabaseAdmin
      .from('commerces').select('id, name').eq('id', commerce_id).single()
    if (!commerce) return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })

    // 1) Crear (o reusar) la promo si vino info
    let promoId = null
    if (promo && promo.value) {
      // ¿Hay una promo existente con el mismo nombre y comercio?
      const { data: existing } = await supabaseAdmin
        .from('promotions')
        .select('id')
        .eq('commerce_id', commerce_id)
        .eq('description', promo.name || `Descuento ${commerce.name}`)
        .eq('type', 'discount_next')
        .maybeSingle()

      if (existing) {
        promoId = existing.id
      } else {
        // Calcular fecha de vencimiento como TIMESTAMPTZ end-of-day
        let expiresIso = null
        if (promo.expiration_date) {
          const d = new Date(promo.expiration_date + 'T23:59:59-03:00')  // AR timezone
          expiresIso = d.toISOString()
        }
        const { data: created, error: promoErr } = await supabaseAdmin
          .from('promotions')
          .insert({
            commerce_id,
            type:            'discount_next',
            value:           promo.value,
            description:     promo.name || `Descuento ${commerce.name}`,
            expires_at:      expiresIso,
            expiration_type: 'fixed',
            expiration_date: expiresIso,
            active:          true,
          })
          .select('id')
          .single()
        if (promoErr) throw promoErr
        promoId = created.id
      }
    }

    // 2) Procesar clientes — normalizar, deduplicar
    const seen = new Set()
    const rows = []
    let skippedNoPhone = 0
    let skippedDuplicate = 0

    for (const c of clients) {
      const phone = toCanonicalArgPhone(c.phone)
      if (!phone) { skippedNoPhone++; continue }
      if (seen.has(phone)) { skippedDuplicate++; continue }
      seen.add(phone)
      rows.push({
        commerce_id,
        phone,
        email:           c.email?.toString().trim() || null,
        name:            c.name?.toString().trim() || null,
        starting_points,
        promo_id:        promoId,
        notes:           c.notes || null,
      })
    }

    // 3) Insertar grants — usamos upsert para que si ya existían grants para
    // los mismos phones, no falle por el UNIQUE constraint. Los existentes
    // quedan con sus valores anteriores.
    let inserted = 0
    let updated = 0
    if (rows.length > 0) {
      // Insert con ON CONFLICT DO NOTHING via upsert con ignoreDuplicates
      const { data: insertedRows, error: insErr } = await supabaseAdmin
        .from('pending_grants')
        .upsert(rows, { onConflict: 'commerce_id,phone', ignoreDuplicates: true })
        .select('id, phone')
      if (insErr) throw insErr
      inserted = insertedRows?.length || 0
      updated = rows.length - inserted
    }

    return NextResponse.json({
      ok:                true,
      total_received:    clients.length,
      inserted,
      already_existed:   updated,
      skipped_no_phone:  skippedNoPhone,
      skipped_duplicate: skippedDuplicate,
      promo_id:          promoId,
    })
  } catch (err) {
    console.error('import-grants error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
