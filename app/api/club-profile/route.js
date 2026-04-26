// GET /api/club-profile?slug=cafe-berlin
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const slug = new URL(request.url).searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'Falta slug' }, { status: 400 })

  // Fetch commerce with city name
  const { data: commerce, error } = await supabaseAdmin
    .from('commerces')
    .select(`
      id, name, description, img_url, cover_image, slug, owner_id,
      prog_type, prog_goal, prog_discount, prog_min_purchase, reward_text, reward_color,
      category, plan, featured, rating,
      address, lat, lng, hours_structured, instagram, facebook, phone,
      city:cities(id, name, province)
    `)
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error || !commerce) {
    return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
  }

  // Fetch active prizes
  const { data: prizes } = await supabaseAdmin
    .from('prizes')
    .select('id, name, description, cost, img_url, stock, created_at')
    .eq('commerce_id', commerce.id)
    .eq('active', true)
    .order('cost', { ascending: true })

  // Fetch active promotions
  const { data: promos } = await supabaseAdmin
    .from('promotions')
    .select('id, type, value, description, days, expires_at, expiration_type, expiration_date, expiration_days')
    .eq('commerce_id', commerce.id)
    .eq('active', true)

  // Optional: check if requester is authenticated member
  let membership = null
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    console.log('[club-profile] user detectado:', user?.email || 'NINGUNO', 'user_id:', user?.id || 'null', 'commerce_id:', commerce.id)
    if (user) {
      const { data: mem, error: memErr } = await supabaseAdmin
        .from('memberships')
        .select('id, points, stars, visits_count, last_visit, status, created_at')
        .eq('user_id', user.id)
        .eq('commerce_id', commerce.id)
        .maybeSingle()
      membership = mem || null

      // Debug: capturamos el error y un count total para ver si admin bypasea RLS
      let memDebug = null
      if (!mem) {
        const { data: allMem } = await supabaseAdmin
          .from('memberships')
          .select('id, commerce_id, status, user_id')
          .eq('user_id', user.id)
        const { count: totalCount } = await supabaseAdmin
          .from('memberships')
          .select('*', { count: 'exact', head: true })
        memDebug = {
          memErr: memErr?.message || null,
          allMemForUser: allMem || [],
          allMemCount: allMem?.length || 0,
          totalMembershipsInDb: totalCount,
          serviceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          serviceKeyPrefix: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 8),
        }
      }

      // Also fetch profile phone
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('phone, name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      // Fetch active client_promotions for this membership
      let clientPromos = []
      if (mem?.id) {
        // Mark expired ones first
        await supabaseAdmin.from('client_promotions')
          .update({ status: 'expired' })
          .eq('membership_id', mem.id)
          .eq('status', 'active')
          .lt('expires_at', new Date().toISOString())
        const { data: cp } = await supabaseAdmin
          .from('client_promotions')
          .select('id, promotion_id, granted_at, expires_at, used_at, status')
          .eq('membership_id', mem.id)
        clientPromos = cp || []
      }

      return NextResponse.json({
        ok: true, commerce,
        prizes: prizes || [],
        promos: promos || [],
        membership,
        profile: prof || null,
        clientPromos,
        // Debug temporal
        _debug: { serverUserEmail: user.email, serverUserId: user.id, hasMembership: !!membership, memDebug },
      })
    }
  } catch (_) {}

  return NextResponse.json({
    ok: true, commerce,
    prizes: prizes || [],
    promos: promos || [],
    membership: null,
    profile: null,
  })
}
