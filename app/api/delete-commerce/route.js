// POST /api/delete-commerce
// Body: { commerce_id }
//
// Elimina el comercio del user logueado junto con todos sus datos asociados:
// memberships, visits, redemptions, prizes, promotions, client_promotions,
// pending_grants, commerce_activity, reviews, notifications relacionadas, y
// archivos de Storage del comercio. La cuenta del usuario NO se borra — el
// dueño queda como user sin comercio (puede registrar otro o seguir usando
// la app como cliente).
//
// Auth: solo el dueño del comercio o un admin global. Acción irreversible.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// Helper: ejecuta un delete y loguea sin romper el flujo. Devuelve string con
// el error o null si OK. Lo recolectamos en `errors[]` para devolver al cliente.
async function safeDelete(label, query) {
  try {
    const { error } = await query
    if (error) {
      console.error('[delete-commerce] ' + label + ' fallo:', error.message || error)
      return label + ': ' + (error.message || 'error desconocido')
    }
    return null
  } catch (e) {
    console.error('[delete-commerce] ' + label + ' excepcion:', e?.message || e)
    return label + ': ' + (e?.message || 'excepcion')
  }
}

export async function POST(request) {
  const errors = []
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.warn('[delete-commerce] sin auth', authError?.message)
      return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
    }

    let body
    try { body = await request.json() } catch { body = {} }
    const commerce_id = body?.commerce_id
    if (!commerce_id) {
      return NextResponse.json({ ok: false, error: 'Falta commerce_id' }, { status: 400 })
    }

    // Verificar que el caller es dueño del comercio (o admin global).
    // Nota schema real: el logo está en `img_url` (no logo_url) y la portada
    // en `cover_image` (singular legacy) o `cover_images` (array, formato
    // actual). Pedimos los 3 para barrer ambos casos al limpiar Storage.
    const { data: commerce, error: cErr } = await supabaseAdmin
      .from('commerces')
      .select('id, owner_id, name, img_url, cover_image, cover_images')
      .eq('id', commerce_id)
      .single()
    if (cErr || !commerce) {
      console.warn('[delete-commerce] comercio no encontrado:', commerce_id, cErr?.message)
      return NextResponse.json({
        ok: false,
        error: 'Comercio no encontrado',
        detail: cErr?.message || null,
      }, { status: 404 })
    }
    if (commerce.owner_id !== user.id) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single()
      if (callerProfile?.role !== 'admin') {
        console.warn('[delete-commerce] no autorizado: caller', user.id, 'owner', commerce.owner_id)
        return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
      }
    }

    console.log('[delete-commerce] iniciando borrado de', commerce.name, commerce_id)

    // Borrado en cascada — orden importa: hijos antes que padres.
    const { data: memberships, error: memErr } = await supabaseAdmin
      .from('memberships').select('id').eq('commerce_id', commerce_id)
    if (memErr) {
      console.error('[delete-commerce] no pude leer memberships:', memErr.message)
      errors.push('leer memberships: ' + memErr.message)
    }
    const membershipIds = (memberships || []).map(m => m.id)

    if (membershipIds.length > 0) {
      const e = await safeDelete('client_promotions', supabaseAdmin
        .from('client_promotions').delete().in('membership_id', membershipIds))
      if (e) errors.push(e)
    }

    let e
    e = await safeDelete('redemptions', supabaseAdmin.from('redemptions').delete().eq('commerce_id', commerce_id)); if (e) errors.push(e)
    e = await safeDelete('visits',      supabaseAdmin.from('visits').delete().eq('commerce_id', commerce_id));      if (e) errors.push(e)
    e = await safeDelete('memberships', supabaseAdmin.from('memberships').delete().eq('commerce_id', commerce_id)); if (e) errors.push(e)
    e = await safeDelete('prizes',      supabaseAdmin.from('prizes').delete().eq('commerce_id', commerce_id));      if (e) errors.push(e)
    e = await safeDelete('promotions',  supabaseAdmin.from('promotions').delete().eq('commerce_id', commerce_id));  if (e) errors.push(e)

    // Tablas que pueden no existir en todos los schemas — best-effort
    const optionalDeletes = ['pending_grants', 'commerce_activity', 'reviews']
    for (const tbl of optionalDeletes) {
      try {
        await supabaseAdmin.from(tbl).delete().eq('commerce_id', commerce_id)
      } catch (_) { /* tabla no existe — ignorar */ }
    }

    // Limpiar notificaciones huerfanas: las que tienen commerce_id en metadata
    // (notifs `no_prizes_warning` por ejemplo). No-bloqueante.
    try {
      await supabaseAdmin
        .from('notifications')
        .delete()
        .filter('metadata->>commerce_id', 'eq', commerce_id)
    } catch (_) {}

    // Limpiar archivos de Storage (logo + portada singular + portadas array).
    try {
      const urls = []
      if (commerce.img_url)     urls.push(commerce.img_url)
      if (commerce.cover_image) urls.push(commerce.cover_image)
      if (Array.isArray(commerce.cover_images)) urls.push(...commerce.cover_images)
      const paths = []
      for (const url of urls) {
        if (!url || typeof url !== 'string') continue
        const m = url.match(/\/commerce-assets\/(.+)$/)
        if (m) paths.push(m[1])
      }
      if (paths.length > 0) {
        await supabaseAdmin.storage.from('commerce-assets').remove(paths)
      }
    } catch (e2) {
      console.warn('[delete-commerce] no pude limpiar Storage:', e2?.message)
    }

    // Finalmente, el comercio. Este SI es bloqueante.
    const { error: delErr } = await supabaseAdmin
      .from('commerces').delete().eq('id', commerce_id)
    if (delErr) {
      console.error('[delete-commerce] DELETE final fallo:', delErr.message)
      return NextResponse.json({
        ok: false,
        error: 'No se pudo borrar el comercio: ' + delErr.message,
        partial_errors: errors,
      }, { status: 500 })
    }

    // Bajar el role del dueño a 'client' Y resetear user_intent para que la app
    // arranque coherente. Si quedaba 'merchant' o 'both', el navbar/intent
    // serian inconsistentes con la realidad (ya no tiene comercio).
    if (commerce.owner_id === user.id) {
      try {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('role, user_intent')
          .eq('id', user.id)
          .single()

        const updates = {}
        if (prof?.role === 'commerce_owner') updates.role = 'client'
        if (prof?.user_intent === 'merchant' || prof?.user_intent === 'both') {
          updates.user_intent = 'client'
        }
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin.from('profiles').update(updates).eq('id', user.id)
        }
      } catch (e3) {
        console.error('[delete-commerce] no pude actualizar profile:', e3?.message)
      }
    }

    console.log('[delete-commerce] OK —', commerce.name, 'borrado. errores parciales:', errors.length)
    return NextResponse.json({
      ok: true,
      name: commerce.name,
      partial_errors: errors,
    })
  } catch (err) {
    console.error('[delete-commerce] excepcion top-level:', err?.message || err)
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Error interno',
      partial_errors: errors,
    }, { status: 500 })
  }
}
