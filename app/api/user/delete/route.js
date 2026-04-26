// DELETE /api/user/delete — elimina la cuenta del usuario autenticado

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function DELETE() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Bloquear si el usuario es dueño de un comercio.
  // commerces.owner_id → auth.users.id está como NO ACTION (no CASCADE),
  // así que el delete fallaría con FK violation y mensaje genérico.
  // Mejor responder con 409 + mensaje claro.
  const { count: ownedCommerces } = await supabaseAdmin
    .from('commerces')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)

  if (ownedCommerces > 0) {
    return NextResponse.json({
      error: 'has_owned_commerce',
      message: 'Tenés un comercio registrado. Eliminá tu comercio antes de cerrar la cuenta.',
    }, { status: 409 })
  }

  // Eliminar el usuario de auth.users.
  // Cascade chain: auth.users → profiles → memberships → client_promotions
  //                auth.users → reviews
  //                profiles → visits, redemptions
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
