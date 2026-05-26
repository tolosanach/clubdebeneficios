import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { validateCategoryInput } from '../../../lib/categories'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const {
      name, category, customCategory, city, province, country,
      // Nuevos campos del wizard extendido (todos opcionales excepto el sistema)
      prog_type, prog_goal, prog_pts, prog_min_purchase,
      phone, address, description, img_url,
      first_prize,
    } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })

    const catResult = validateCategoryInput({ category, customCategory }, user.id)
    if (!catResult.valid) return NextResponse.json({ error: catResult.error }, { status: 400 })
    const resolvedCategory = catResult.resolvedValue

    // Generate unique slug
    function makeSlug(str) {
      return str.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
    }
    const baseSlug = makeSlug(name.trim())
    let slug = baseSlug
    const { count } = await supabaseAdmin.from('commerces').select('id', { count:'exact', head:true }).eq('slug', slug)
    if (count > 0) slug = `${baseSlug}-${Date.now().toString(36)}`

    const { data: existing } = await supabaseAdmin.from('commerces').select('id').eq('owner_id', user.id).single()
    if (existing) return NextResponse.json({ error: 'Ya tenés un comercio registrado' }, { status: 409 })

    // Validar y normalizar valores del programa de puntos
    const safeProgType = ['stars','points'].includes(prog_type) ? prog_type : 'stars'
    const safeProgGoal = parseInt(prog_goal) > 0 ? parseInt(prog_goal) : 10
    // En la lógica nueva 1 punto = 1 peso, así que prog_pts queda como columna
    // inerte. La forzamos a 1 para no romper queries que la lean.
    const safeProgPts  = 1
    // Compra mínima: solo aplica para sistema 'stars'. NULL si no se pasó o
    // si el sistema es de puntos. Cualquier int > 0 es válido (sin tope).
    const safeProgMin  = (safeProgType === 'stars' && parseInt(prog_min_purchase) > 0)
      ? parseInt(prog_min_purchase) : null

    function buildPayload(currentSlug) {
      return {
        owner_id:     user.id,
        name:         name.trim(),
        slug:         currentSlug,
        category:     resolvedCategory,
        city_name:    city        || null,
        province:     province    || null,
        country:      country     || null,
        description:  description?.trim() || '',
        phone:        phone?.trim()       || null,
        address:      address?.trim()     || null,
        img_url:      img_url             || null,
        prog_type:    safeProgType,
        prog_goal:    safeProgGoal,
        prog_pts:     safeProgPts,
        prog_min_purchase: safeProgMin,
        reward_text:  'Próximamente...',
        reward_color: '#6F30DF',
        plan:         'pro',
        active:       true,
        featured:     false,
        rating:       5.0,
      }
    }

    let { data: commerce, error: commerceError } = await supabaseAdmin
      .from('commerces')
      .insert(buildPayload(slug))
      .select()
      .single()

    // Race-recovery: si dos registros simultáneos pelearon por el mismo slug,
    // uno gana y el otro recibe 23505. Reintentamos una vez con suffix random
    // antes de devolver error.
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

    if (commerceError) throw commerceError

    // Promovemos role a commerce_owner. Además sincronizamos user_intent
    // según el estado actual:
    //  - NULL  → 'merchant' (usuario que creó cuenta y vino directo al
    //                        wizard sin pasar por el step de intent).
    //  - 'client' → 'both'  (usuario que originalmente eligió ser cliente
    //                        y ahora abrió un comercio — el menú "¿Tenés
    //                        un comercio?" lo trae acá).
    //  - 'merchant' o 'both' → no tocar, ya está bien.
    // Esto cubre los casos del Cambio 3 del spec del dueño.
    const { data: profileBefore } = await supabaseAdmin
      .from('profiles')
      .select('user_intent')
      .eq('id', user.id)
      .single()
    const currentIntent = profileBefore?.user_intent || null
    let nextIntent = currentIntent
    if (currentIntent === null)         nextIntent = 'merchant'
    else if (currentIntent === 'client') nextIntent = 'both'
    await supabaseAdmin.from('profiles').update({
      role:                'commerce_owner',
      user_intent:         nextIntent,
      intent_prompt_shown: true,
    }).eq('id', user.id)

    // Si el wizard cargó un primer premio, lo creamos. Si falla, no abortamos
    // el registro del comercio (el comerciante puede crear premios después).
    if (first_prize?.name && first_prize?.cost > 0) {
      try {
        await supabaseAdmin.from('prizes').insert({
          commerce_id: commerce.id,
          name:        first_prize.name.trim(),
          cost:        parseInt(first_prize.cost) || 0,
          active:      true,
        })
      } catch (e) {
        console.warn('Failed to create first prize on register:', e.message)
      }
    }

    return NextResponse.json({ ok: true, commerce_id: commerce.id })
  } catch (err) {
    console.error('register-commerce error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
