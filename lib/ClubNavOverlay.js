'use client'

// Pantalla de carga instantánea al tocar "Ir al club" en una tarjeta.
// El botón dispara 'clufix:club-nav'; como la navegación es una carga de
// página completa, sin esto el celular queda "muerto" hasta que llega el HTML.
import { useEffect, useState } from 'react'

export default function ClubNavOverlay() {
  const [name, setName] = useState(null)

  useEffect(() => {
    const onNav = e => setName(e?.detail?.name || '')
    // Volver atrás desde el club puede restaurar esta página desde caché
    // con el overlay todavía puesto: lo sacamos.
    const onShow = e => { if (e.persisted) setName(null) }
    window.addEventListener('clufix:club-nav', onNav)
    window.addEventListener('pageshow', onShow)
    return () => {
      window.removeEventListener('clufix:club-nav', onNav)
      window.removeEventListener('pageshow', onShow)
    }
  }, [])

  if (name === null) return null
  return (
    <div aria-live="polite" style={{
      position: 'fixed', inset: 0, zIndex: 100000, background: '#110D0A',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
      animation: 'clubnav-in 120ms ease-out',
    }}>
      <style>{'@keyframes clubnav-in{from{opacity:0}to{opacity:1}}'}</style>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.14)', borderTopColor: '#E03E1B',
        animation: 'spin 0.8s linear infinite',
      }} />
      {name ? <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 600 }}>Abriendo {name}…</div> : null}
    </div>
  )
}
