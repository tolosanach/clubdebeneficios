'use client'

// SuggestedPrizesModal — "¿Qué premio das?" (simplificado oct 2026).
// Muestra los premios típicos del rubro ya marcados; el comerciante destilda
// los que no quiere y confirma con un solo botón. Alternativa: link para
// cargar los suyos desde cero. Sin X ni cierre por fondo: la idea es que el
// club no quede sin premios.
//
// Props: open, onClose, categories, systemType, onAddAll(prizes), busy,
// addedPrizeNames (Set de nombres ya cargados — se ocultan). onAddOne se
// mantiene en la firma por compatibilidad pero ya no se usa.

import { useEffect, useMemo, useState } from 'react'
import { Gift, Check } from 'lucide-react'
import { getSuggestedPrizes } from './suggestedPrizesByCategory'

const FN = "'Inter', system-ui, sans-serif"

export default function SuggestedPrizesModal({
  open,
  onClose,
  categories = [],
  systemType = 'stars',
  onAddAll,
  busy = false,
  addedPrizeNames = new Set(),
}) {
  const suggestions = useMemo(
    () => getSuggestedPrizes(categories, systemType).filter(s => !addedPrizeNames.has(s.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(categories), systemType, addedPrizeNames.size]
  )
  const [picked, setPicked] = useState(() => new Set())
  useEffect(() => { if (open) setPicked(new Set(suggestions.map(s => s.name))) }, [open, suggestions])

  if (!open) return null

  const sysColor  = systemType === 'points' ? '#FF199F' : '#6F30DF'
  const unitIcon  = systemType === 'points' ? '◆' : '★'
  const unitLabel = systemType === 'points' ? 'puntos' : 'estrellas'
  const n = picked.size
  const toggle = (name) => setPicked(prev => {
    const next = new Set(prev)
    next.has(name) ? next.delete(name) : next.add(name)
    return next
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 6000,
      background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      animation: 'fadeIn 200ms var(--ease-out, ease)',
    }}>
      <div className="modal-in" style={{
        background: '#0d0818', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 24,
        width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)', padding: '28px 22px 20px', fontFamily: FN,
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: sysColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 30px ${sysColor}66`, marginBottom: 18 }}>
          <Gift size={26} color="#fff" strokeWidth={1.9} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.15 }}>
          ¿Qué premio das?
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 6, marginBottom: 20 }}>
          Te sugerimos estos. Destildá los que no van.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {suggestions.map(s => {
            const on = picked.has(s.name)
            return (
              <button key={s.name} type="button" onClick={() => toggle(s.name)} disabled={busy}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                  padding: '14px 16px', borderRadius: 16, cursor: 'pointer', fontFamily: FN,
                  background: on ? `${sysColor}1F` : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${on ? sysColor : 'rgba(255,255,255,0.10)'}`,
                  transition: 'background 150ms, border-color 150ms',
                }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                  background: on ? sysColor : 'transparent', border: on ? 'none' : '1.5px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <Check size={15} color="#fff" strokeWidth={3} />}
                </span>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: on ? '#fff' : 'rgba(255,255,255,0.55)' }}>{s.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: on ? sysColor : 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }} title={`${s.cost} ${unitLabel}`}>
                  {s.cost} {unitIcon}
                </span>
              </button>
            )
          })}
        </div>

        <button type="button" disabled={busy || n === 0}
          onClick={() => onAddAll && onAddAll(suggestions.filter(s => picked.has(s.name)))}
          style={{
            width: '100%', marginTop: 20, padding: '16px', borderRadius: 16, border: 'none',
            background: sysColor, color: '#fff', fontFamily: FN, fontSize: 16, fontWeight: 800,
            cursor: busy || n === 0 ? 'not-allowed' : 'pointer', opacity: busy || n === 0 ? 0.45 : 1,
            boxShadow: n ? `0 10px 30px ${sysColor}55` : 'none',
          }}>
          {busy ? 'Guardando…' : n === 0 ? 'Elegí al menos uno' : `Listo, usar ${n === 1 ? 'este' : 'estos'}`}
        </button>
        <button type="button" onClick={onClose} disabled={busy}
          style={{ width: '100%', marginTop: 12, padding: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontFamily: FN, fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>
          Prefiero cargar los míos
        </button>
      </div>
    </div>
  )
}
