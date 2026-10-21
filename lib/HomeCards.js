'use client'

// HomeCards — tarjetas acordeón del Inicio del comercio.
// Una tarjeta abierta (foto + texto + acción) y las demás como barras
// compactas. Se abre sola según el scroll, o al tocar una barra.
// No tiene lógica de negocio: arma las tarjetas desde los `items` ya
// calculados (configItems) y navega con `onItem`.

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

const COLLAPSED = 72
const EXPANDED = 248
const GAP = 10

const CARDS = [
  { id: 'firstPrize', photo: 'regalo', pos: '50% 58%',
    title: 'Cargá tu primer premio',
    desc: 'Tus clientes ya suman, pero todavía no tienen nada para canjear.',
    cta: 'Crear premio' },
  { id: 'doubleDays', photo: 'barberia', pos: '52% 58%',
    title: 'Duplicá tus días flojos',
    desc: 'Activá suma doble solo los días en que querés más visitas.',
    cta: 'Activar suma doble' },
  { id: 'messages', photo: 'whatsapp', pos: '38% 40%',
    title: 'Traé de vuelta a tus clientes',
    desc: 'Mensajes automáticos por WhatsApp para quienes dejaron de venir.',
    cta: 'Activar mensajes' },
  { id: 'discountNext', photo: 'cupon', pos: '38% 45%',
    title: 'Activá cupones de descuento',
    desc: 'Un % OFF para la próxima visita trae de vuelta a tus clientes.',
    cta: 'Activar cupón' },
]

const CHIP = {
  starter: { label: 'STARTER', color: '#2F5FC9', bg: 'rgba(91,141,239,0.18)' },
  pro:     { label: 'PRO',     color: '#9A5B00', bg: 'rgba(245,166,35,0.22)' },
}

export default function HomeCards({ items = [], onItem }) {
  const cards = useMemo(() => {
    const byId = Object.fromEntries(items.map(i => [i.id, i]))
    return CARDS.map(c => ({ ...c, item: byId[c.id] }))
      .filter(c => c.item && !c.item.done)
      .map(c => c.item.lockedByPlan
        ? { ...c, chip: CHIP[c.item.lockedByPlan], cta: c.item.lockedByPlan === 'pro' ? 'Ver plan PRO' : 'Ver plan Starter' }
        : c)
  }, [items])

  const [active, setActive] = useState(0)
  const groupRef = useRef(null)
  const manualUntil = useRef(0)

  // Abre sola la tarjeta que corresponde al scroll. La línea de lectura
  // viaja de arriba a abajo de la pantalla según el avance de la página:
  // arriba de todo abre la primera y al final la última (también al subir).
  useEffect(() => {
    if (cards.length < 2) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const update = () => {
      if (Date.now() < manualUntil.current || !groupRef.current) return
      const vh = window.innerHeight
      const max = Math.max(1, document.documentElement.scrollHeight - vh)
      const t = Math.max(0, Math.min(1, window.scrollY / max))
      const probe = 90 + (vh - 180) * t
      const r = groupRef.current.getBoundingClientRect()
      const p = (probe - r.top) / Math.max(1, r.height)
      const i = Math.max(0, Math.min(cards.length - 1, Math.floor(p * cards.length)))
      setActive(prev => (prev === i ? prev : i))
    }
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [cards.length])

  if (cards.length === 0) return null
  const current = Math.min(active, cards.length - 1)

  return (
    <section aria-label="Sugerencias para tu negocio">
      <div ref={groupRef} className="cx-acc-group"
        style={{ minHeight: EXPANDED + (cards.length - 1) * (COLLAPSED + GAP) }}>
        {cards.map((c, i) => {
          const on = i === current
          const photo = { backgroundImage: `url(/cards/${c.photo}.jpg)`, backgroundPosition: c.pos }
          return (
            <div key={c.id} className={`cx-acc${on ? ' on' : ''}`}>
              <button type="button" className="cx-acc-bar" inert={on}
                aria-expanded={on}
                onClick={() => { manualUntil.current = Date.now() + 2500; setActive(i) }}>
                <span className="cx-acc-th" style={photo} aria-hidden="true" />
                <span className="cx-acc-t">{c.title}</span>
                <span className="cx-acc-go" aria-hidden="true"><ArrowUpRight size={16} strokeWidth={2.4} /></span>
              </button>
              <div className="cx-acc-open" inert={!on}>
                <div className="cx-acc-col">
                  {c.chip && <span className="cx-acc-chip" style={{ color: c.chip.color, background: c.chip.bg }}>{c.chip.label}</span>}
                  <h2 className="cx-acc-h">{c.title}</h2>
                  <p className="cx-acc-p">{c.desc}</p>
                  <button type="button" className="cx-acc-cta" onClick={() => onItem?.(c.item)}>
                    {c.cta}<i aria-hidden="true"><ArrowUpRight size={16} strokeWidth={2.4} /></i>
                  </button>
                </div>
                <div className="cx-acc-photo" style={photo} role="img" aria-label="" />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
