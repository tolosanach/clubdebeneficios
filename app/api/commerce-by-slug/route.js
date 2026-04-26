// GET /api/commerce-by-slug?slug=cafe-el-encuentro
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const slug = new URL(request.url).searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'Falta slug' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('commerces')
    .select('id, name, description, img_url, slug, prog_type, category')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true, commerce: data })
}
