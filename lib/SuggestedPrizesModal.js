'use client'

// SuggestedPrizesModal — modal que ofrece plantillas de premios típicas
// según el rubro del comercio. El comerciante puede:
//   - Agregar premios individuales con un click ("+ Agregar" en cada card).
//   - Agregar todos los sugeridos con un solo botón.
//   - Cargar los suyos desde cero (cierra el modal).
//
// Se invoca desde:
//   - Modal de bienvenida al activar el sistema (primera vez).
//   - Botón "Ver premios sugeridos para mi rubro" del estado vacío de
//     la pestaña Premios.
//
// Props:
//   - open (bool)
//   - onClose() — callback al cerrar.
//   - categories (string[]) — categorías del comercio.
//   - systemType ('stars'|'points') — sistema actual.
//   - onAddOne(prize) — callback con un premio { name, cost, system_type }.
//     El padre se encarga del insert real en `prizes`.
//   - onAddAll(prizes) — callback con TODOS los sugeridos.
//   - busy (bool) — true mientras se persisten los premios; deshabilita
//     todos los botones para evitar dobles inserts.

import { Gift, Plus, Sparkles, X } from 'lucide-react'
import { getSuggestedPrizes } from './suggestedPrizesByCategory'

const FN = "'Inter', system-ui, sans-serif"

export default function SuggestedPrizesModal({
  open,
  onClose,
  categories = [],
  systemType = 'stars',
  onAddOne,
  onAddAll,
  busy = false,
  // addedPrizeNames: Set<string> — nombres ya agregados durante esta
  // sesión del modal, así desactivamos el botón "+ Agregar" del que ya
  // se cargó.
  addedPrizeNames = new Set(),
}) {
  if (!open) return null

  const suggestions = getSuggestedPrizes(categories, systemType)
  const sysColor    = systemType === 'points' ? '#EC4899' : '#8B5CF6'
  const sysColorD   = systemType === 'points' ? '#DB2777' : '#7C3AED'
  const unitLabel   = systemType === 'points' ? 'puntos' : 'estrellas'
  const unitIcon    = systemType === 'points' ? '◆' : '★'
  // Categoría matched para el copy "Estos son premios típicos para X".
  // Usamos la primera de las categorías como display, salvo que sea
  // '_default' (fallback).
  const displayCategory = (categories || [])[0] || ''

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 6000,
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 200ms var(--ease-out, ease)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="modal-in"
        style={{
          background: '#0d0818',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 22,
          width: '100%', maxWidth: 480,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          position: 'relative',
        }}
      >
        {/* Botón X arriba a la derecha */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.65)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <X size={14} strokeWidth={2.4} />
        </button>

        <div style={{ padding: '24px 22px 20px' }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 12,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg, ${sysColor}, ${sysColorD})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 8px 22px -6px ${sysColor}99`,
            }}>
              <Gift size={22} color="#fff" strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: FN, fontSize: 17, fontWeight: 800,
                color: '#fff', lineHeight: 1.25,
              }}>
                Tus clientes ya pueden acumular {unitLabel}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                ¿Qué van a poder canjear?
              </div>
            </div>
          </div>

          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.70)',
            lineHeight: 1.55, marginBottom: 18,
          }}>
            {displayCategory
              ? <>Estos son premios típicos para <strong style={{ color: '#fff' }}>{displayCategory.toLowerCase()}</strong>. Podés agregarlos con un click y editarlos después, o cargar los tuyos desde cero.</>
              : <>Te sugerimos algunos premios para empezar. Podés agregarlos con un click y editarlos después, o cargar los tuyos desde cero.</>}
          </div>

          {/* Lista de cards de premios sugeridos */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            marginBottom: 16,
          }}>
            {suggestions.map((p, i) => {
              const isAdded = addedPrizeNames.has(p.name)
              return (
                <div
                  key={`${p.name}-${i}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: isAdded ? `${sysColor}10` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isAdded ? `${sysColor}55` : 'rgba(255,255,255,0.08)'}`,
                    transition: 'background 200ms ease, border-color 200ms ease',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `${sysColor}1F`,
                    border: `1px solid ${sysColor}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    fontFamily: FN, fontSize: 15, fontWeight: 800,
                    color: sysColor,
                  }}>
                    {unitIcon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: FN, fontSize: 13.5, fontWeight: 700, color: '#fff',
                      lineHeight: 1.3,
                    }}>
                      {p.name}
                    </div>
                    <div style={{
                      fontSize: 11.5, color: sysColor,
                      marginTop: 2, fontWeight: 700,
                      letterSpacing: '.02em',
                    }}>
                      {p.cost} {unitLabel}
                    </div>
                  </div>
                  <button
                    onClick={() => onAddOne?.(p)}
                    disabled={busy || isAdded}
                    style={{
                      flexShrink: 0,
                      padding: '8px 12px',
                      borderRadius: 9,
                      background: isAdded
                        ? 'rgba(34,230,152,0.14)'
                        : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isAdded ? 'rgba(34,230,152,0.55)' : 'rgba(255,255,255,0.14)'}`,
                      color: isAdded ? '#22E698' : '#fff',
                      fontFamily: FN, fontSize: 11.5, fontWeight: 700,
                      cursor: (busy || isAdded) ? 'default' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      opacity: busy && !isAdded ? 0.5 : 1,
                      transition: 'background 180ms ease, border-color 180ms ease, color 180ms ease',
                    }}
                  >
                    {isAdded ? '✓ Agregado' : <><Plus size={12} strokeWidth={2.6} /> Agregar</>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Botones grandes */}
          <button
            onClick={() => onAddAll?.(suggestions)}
            disabled={busy || suggestions.every(p => addedPrizeNames.has(p.name))}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: 14,
              background: `linear-gradient(135deg, ${sysColor}, ${sysColorD})`,
              border: 'none',
              color: '#fff',
              fontFamily: FN, fontSize: 13.5, fontWeight: 800,
              cursor: busy ? 'wait' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: `0 8px 22px -6px ${sysColor}99`,
              marginBottom: 8,
              opacity: busy ? 0.7 : 1,
            }}
          >
            <Sparkles size={14} strokeWidth={2.4} />
            {busy ? 'Agregando…' : 'Agregar todos los sugeridos'}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.75)',
              fontFamily: FN, fontSize: 12.5, fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            Cargar los míos desde cero
          </button>
        </div>
      </div>
    </div>
  )
}
