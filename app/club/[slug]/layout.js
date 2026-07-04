// Server component — handles SEO metadata for /club/[slug]
// The child page.js is 'use client', so metadata must live here.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BASE = process.env.NEXT_PUBLIC_URL || 'https://clufix.com.ar'

export async function generateMetadata({ params }) {
  const { slug } = await params

  const { data: c } = await supabase
    .from('commerces')
    .select('name, description, img_url, cover_image')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!c) {
    return {
      title: 'Club no encontrado | Clufix',
      robots: { index: false },
    }
  }

  const title = `${c.name} | Clufix`
  const description = c.description
    || `Sumate al club de ${c.name} y acumulá puntos para canjear premios exclusivos.`
  const image = c.cover_image || c.img_url || `${BASE}/opengraph-image`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${BASE}/club/${slug}`,
      images: [{ url: image, width: 1200, height: 630, alt: c.name }],
      siteName: 'Clufix',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default function ClubLayout({ children }) {
  return children
}
