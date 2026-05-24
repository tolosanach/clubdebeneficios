import { notFound } from 'next/navigation'
import RubroPage from '../../../lib/RubroPage'
import { rubros } from '../../../lib/rubros-data'

export async function generateStaticParams() {
  return Object.keys(rubros).map((rubro) => ({ rubro }))
}

export default function Page({ params }) {
  const rubro = rubros[params.rubro]
  if (!rubro) notFound()
  return <RubroPage rubro={rubro} slug={params.rubro} />
}
