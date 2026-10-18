// Bloque "Volver al inicio" para el final de las páginas que no son la home.
import Link from 'next/link'

export default function BackHome({ tone = 'dark', style }) {
  const dark = tone === 'dark'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '36px 0 8px', ...style }}>
      <Link href="/" aria-label="Ir al inicio de Clufix" style={{ display: 'flex' }}>
        <img src="/clufix_logo.svg" alt="Clufix" style={{ height: 34, width: 'auto', display: 'block' }} />
      </Link>
      <Link href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '0.85rem 1.6rem',
        background: dark ? '#fff' : '#1A0050', color: dark ? '#1A0050' : '#fff',
        fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none',
      }}>
        <span aria-hidden="true">←</span> Volver al inicio
      </Link>
    </div>
  )
}
