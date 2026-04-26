import { redirect } from 'next/navigation'

export default function JoinRedirect({ params, searchParams }) {
  const qs = new URLSearchParams(searchParams || {}).toString()
  redirect(`/club/${params.slug}${qs ? '?' + qs : ''}`)
}
