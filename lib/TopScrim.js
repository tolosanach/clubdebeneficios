'use client'

// TopScrim — tapa la franja superior de la pantalla (barra de estado del
// celu + el espacio entre el borde y el navbar flotante) para que el
// contenido que se scrollea no se vea por encima del menú superior.
//
// El navbar es `position: fixed` con margen arriba (top: 10) y la PWA usa
// status bar "black-translucent", así que todo lo que queda arriba del
// navbar era transparente. Medimos dónde termina el navbar en tiempo real
// (cambia con la notch / safe-area de cada celu) y pintamos un fondo del
// mismo color que la página hasta ahí, con un fundido corto abajo.

import { useEffect, useState } from 'react'

function pageBackground() {
  const pick = (el) => {
    const c = el && getComputedStyle(el).backgroundColor
    return c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)' ? c : null
  }
  return pick(document.body) || pick(document.documentElement) || '#0A0A0F'
}

export default function TopScrim({ watch }) {
  const [box, setBox] = useState(null) // { height, bg }

  useEffect(() => {
    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const nav = document.querySelector('nav.navbar-glass')
        if (!nav) { setBox(null); return }
        const r = nav.getBoundingClientRect()
        // Cubre hasta la mitad del navbar: arriba queda sólido y el navbar
        // (translúcido) tapa el resto, sin que se note un corte.
        setBox({ height: Math.max(0, Math.round(r.top + r.height / 2)), bg: pageBackground() })
      })
    }
    measure()
    const t = setTimeout(measure, 400) // por si el navbar monta tarde
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [watch])

  if (!box || box.height === 0) return null
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: box.height + 14,
        zIndex: 199, // justo debajo del navbar (200)
        pointerEvents: 'none',
        background: `linear-gradient(to bottom, ${box.bg} 0, ${box.bg} ${box.height}px, transparent 100%)`,
      }}
    />
  )
}
