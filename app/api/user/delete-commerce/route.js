// DELETE /api/user/delete-commerce
//
// Elimina los datos del negocio del usuario autenticado (club, clientes,
// premios, promos, canjes, etc.) pero MANTIENE su cuenta de usuario intacta.
// Después, baja el role a 'client' y user_intent a 'client' para que la app
// vuelva al modo cliente sin perder autenticación ni historial como socio.
//
// Orden de borrado (respeta FK constraints):
//   1. client_promotions (FK → promotions)
//   2. redemptions       (FK → commerces)
//   3. promotions        (FK → commerces)
//   4. prizes            (FK → commerces)
//   5. memberships       (FK → commerces)
//   6. commerce_activity (FK → commerces — si existe)
//   7. pending_grants    (FK → commerces — si existe)
//   8. commerces         (owner_id = user_id)
//   9. profiles update   (role='client', user_intent='client')

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function DELETE() {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Buscar el comercio del usuario
    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!commerce) {
      return NextResponse.json({ error: 'No tenés un comercio registrado' }, { status: 404 })
    }

    const commerceId = commerce.id

    // 1. client_promotions (a través de promotions del comercio)
    const { data: promoIds } = await supabaseAdmin
      .from('promotions')
      .select('id')
      .eq('commerce_id', commerceId)
    if (promoIds?.length) {
      const ids = promoIds.map(p => p.id)
      await supabaseAdmin.from('client_promotions').delete().in('promotion_id', ids)
    }

    // 2. redemptions
    await supabaseAdmin.from('redemptions').delete().eq('commerce_id', commerceId)

    // 3. promotions
    await supabaseAdmin.from('promotions').delete().eq('commerce_id', commerceId)

    // 4. prizes
    await supabaseAdmin.from('prizes').delete().eq('commerce_id', commerceId)

    // 5. memberships
    await supabaseAdmin.from('memberships').delete().eq('commerce_id', commerceId)

    // 6. commerce_activity (ignore error si la tabla no existe)
    await supabaseAdmin.from('commerce_activity').delete().eq('commerce_id', commerceId)

    // 7. pending_grants (ignore error si la tabla no existe)
    await supabaseAdmin.from('pending_grants').delete().eq('commerce_id', commerceId)

    // 8. El comercio mismo
    const { error: delErr } = await supabaseAdmin
      .from('commerces')
      .delete()
      .eq('id', commerceId)
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    // 9. Bajar el perfil a cliente
    await supabaseAdmin.from('profiles').update({
      role:                'client',
      user_intent:         'client',
      intent_prompt_shown: true,
    }).eq('id', user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('delete-commerce error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
