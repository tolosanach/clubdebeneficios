import { notFound } from 'next/navigation'
import RubroPage from '../../../lib/RubroPage'
import { rubros } from '../../../lib/rubros-data'

export async function generateStaticParams() {
  return Object.keys(rubros).map((rubro) => ({ rubro }))
}

export default async function Page({ params }) {
  const { rubro: slug } = await params
  const rubro = rubros[slug]
  if (!rubro) notFound()
  return <RubroPage rubro={rubro} slug={slug} />
}
