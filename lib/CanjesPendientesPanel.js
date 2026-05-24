'use client'
// CanjesPendientesPanel — sección del panel del DUEÑO donde se listan los
// canjes que llegaron del wallet del cliente y están esperando que el
// comercio los confirme. Cada fila tiene:
//   • Datos del cliente (nombre, teléfono opcional)
//   • Premio + costo
//   • Código BNX-XXXX (el mismo que el cliente envió por WhatsApp)
//   • Hora del pedido
//   • Botón Confirmar (verde) → POST /api/redemption-confirm
//   • Botón Rechazar (rojo) → POST /api/redemption-cancel con motivo opcional
//
// Cuando se confirma/rechaza, refrescamos la lista localmente y disparamos
// 'clufix:notifications-refresh' para que la campana también se actualice.

import { useState, useEffect, useCallback } from 'react'
import { Gift, Check, X, Clock, Phone, MessageCircle, Star, Gem, AlertCircle } from 'lucide-react'

const FN = "'Inter', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

export default function CanjesPendientesPanel({ commerce, unitIcon, unitLabel, onChange }) {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [busyId, setBusyId]     = useState(null)        // redemption_id en proceso
  const [rejectingId, setRejectingId] = useState(null)  // canje al que el dueño está escribiendo motivo
  const [rejectReason, setRejectReason] = useState('')
  const [progType, setProgType] = useState('points')

  const load = useCallback(async () => {
    if (!commerce?.id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/redemptions-pending?commerce_id=${commerce.id}`)
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo cargar la lista de canjes pendientes.')
        setItems([])
      } else {
        setItems(data.pending || [])
        setProgType(data.prog_type || 'points')
      }
    } catch (e) {
      setError('Error de red. Probá refrescar.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [commerce?.id])

  useEffect(() => { load() }, [load])

  // Refresh externo cuando llega push de un nuevo canje pendiente.
  useEffect(() => {
    function onRefresh() { load() }
    window.addEventListener('clufix:notifications-refresh', onRefresh)
    return () => window.removeEventListener('clufix:notifications-refresh', onRefresh)
  }, [load])

  async function handleConfirm(item) {
    if (busyId) return
    // SINCRONICO durante el click: abrimos un tab vacio para no perder
    // el contexto de user-gesture. Si la confirmacion sale OK y el
    // cliente tiene telefono cargado, redirigimos ese tab a wa.me con un
    // mensaje de confirmacion. Sino lo cerramos.
    const phoneClean = (item.client?.phone || '').replace(/[^\d]/g, '')
    const hasPhone   = phoneClean.length >= 8
    const waWin = (hasPhone && typeof window !== 'undefined') ? window.open('', '_blank') : null
    setBusyId(item.id)
    setError('')
    try {
      const res = await fetch('/api/redemption-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemption_id: item.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (waWin) { try { waWin.close() } catch {} }
        setError(data.error || 'No se pudo confirmar el canje.')
      } else {
        // Sacar el item localmente â el dueno ya no lo ve en pendientes.
        setItems(arr => arr.filter(x => x.id !== item.id))
        onChange?.()
        try { window.dispatchEvent(new CustomEvent('clufix:notifications-refresh')) } catch {}
        // Avisarle al cliente por WhatsApp â mensaje pre-armado con
        // los datos del canje. Si waWin es null (sin telefono o popup
        // blocker), simplemente no se abre, no rompemos el flujo.
        if (waWin) {
          const isStars = progType === 'stars'
          const unitTxt = isStars
            ? `${item.prize.cost} estrella${item.prize.cost === 1 ? '' : 's'}`
            : `${item.prize.cost} puntos`
          const message = (
            `Hola ${item.client?.name || 'cliente'}!\n\n` +
            `✅ Tu canje fue confirmado:\n` +
            `🎁 ${item.prize.name}\n` +
            `${isStars ? '⭐' : '💎'} Costo: ${unitTxt}\n\n` +
            `Codigo: *${item.code || ''}*\n\n` +
            `Pasa a retirarlo cuando quieras. Gracias!`
          )
          try {
            waWin.location.href = `https://wa.me/${phoneClean}?text=${encodeURIComponent(message)}`
          } catch { try { waWin.close() } catch {} }
        }
      }
    } catch (e) {
      if (waWin) { try { waWin.close() } catch {} }
      setError('Error de red. Proba de nuevo.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(item, reason) {
    if (busyId) return
    setBusyId(item.id)
    setError('')
    try {
      const res = await fetch('/api/redemption-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemption_id: item.id, reason: reason || null }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo rechazar el canje.')
      } else {
        setItems(arr => arr.filter(x => x.id !== item.id))
        setRejectingId(null)
        setRejectReason('')
        onChange?.()
        try { window.dispatchEvent(new CustomEvent('clufix:notifications-refresh')) } catch {}
      }
    } catch (e) {
      setError('Error de red. Probá de nuevo.')
    } finally {
      setBusyId(null)
    }
  }

  function timeAgo(iso) {
    const ms = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 1) return 'recién'
    if (mins < 60) return `hace ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs} h`
    const days = Math.floor(hrs / 24)
    return `hace ${days} d`
  }

  const isStars  = progType === 'stars'
  const UnitIcon = isStars ? Star : Gem

  return (
    <div>
      {/* Header tab */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: FN, fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Canjes pendientes
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
          Pedidos de canje que llegaron desde la app del cliente. Confirmá cuando entregues el premio para descontar sus {unitLabel || 'puntos'}.
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(248,116,68,0.12)', border: '1px solid rgba(248,116,68,0.35)', borderRadius: 12, marginBottom: 16, fontSize: 12.5, color: '#f87444' }}>
          <AlertCircle size={14} strokeWidth={2.2} />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
          ⟳ Cargando canjes pendientes...
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && !error && (
        <div style={{
          textAlign: 'center', padding: '52px 24px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
        }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(34,230,152,0.10)', border: '1px solid rgba(34,230,152,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check size={28} color="rgba(34,230,152,0.85)" strokeWidth={2.2} />
          </div>
          <div style={{ fontFamily: FN, fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.85)', marginBottom: 8 }}>
            ¡Sin canjes pendientes!
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>
            Cuando un cliente toque "Canjear" en su tarjeta, vas a recibir un WhatsApp y el pedido va a aparecer acá.
          </div>
        </div>
      )}

      {/* Lista */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => {
            const isBusy = busyId === item.id
            const isRejecting = rejectingId === item.id
            return (
              <div key={item.id} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 16,
                padding: '16px 18px',
                opacity: isBusy ? 0.6 : 1,
                transition: 'opacity 200ms ease',
              }}>
                {/* Top row: cliente + tiempo + código */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: FN, fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {item.client.name}
                      {item.client.phone && (
                        <a
                          href={`https://wa.me/${item.client.phone.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(37,211,102,0.14)', border: '1px solid rgba(37,211,102,0.40)', color: '#25D366', textDecoration: 'none' }}
                          title="Abrir WhatsApp del cliente"
                        >
                          <MessageCircle size={10} strokeWidth={2.4} />
                          WhatsApp
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.50)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={11} strokeWidth={2} />
                      {timeAgo(item.created_at)}
                    </div>
                  </div>
                  {/* Código del canje — el mismo que el cliente le pasó por WhatsApp */}
                  <div style={{
                    padding: '5px 11px',
                    borderRadius: 8,
                    background: 'rgba(113,49,225,0.14)',
                    border: '1px solid rgba(113,49,225,0.40)',
                    fontFamily: FN,
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: '#D8B4FE',
                    letterSpacing: '.06em',
                    flexShrink: 0,
                  }}>
                    {item.code || '—'}
                  </div>
                </div>

                {/* Premio */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: 'rgba(113,49,225,0.06)',
                  border: '1px solid rgba(113,49,225,0.20)',
                  borderRadius: 12,
                  marginBottom: 14,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: '#7131E1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Gift size={18} color="#fff" strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FN, fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                      {item.prize.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <UnitIcon size={11} {...(isStars ? { strokeWidth: 0, fill: '#7131E1' } : { strokeWidth: 2, color: '#7131E1' })} />
                      {item.prize.cost} {unitLabel || (isStars ? 'estrellas' : 'puntos')}
                    </div>
                  </div>
                </div>

                {/* Modo rechazo: textarea opcional + botones cancelar/confirmar rechazo */}
                {isRejecting ? (
                  <div>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Motivo (opcional). Ej: sin stock, error, etc."
                      rows={2}
                      maxLength={200}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 13,
                        fontFamily: FI,
                        resize: 'vertical',
                        marginBottom: 10,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason('') }}
                        disabled={isBusy}
                        style={{
                          flex: 1, padding: '10px 14px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          borderRadius: 10,
                          color: 'rgba(255,255,255,0.85)',
                          fontFamily: FN, fontSize: 13, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Volver
                      </button>
                      <button
                        onClick={() => handleCancel(item, rejectReason)}
                        disabled={isBusy}
                        style={{
                          flex: 2, padding: '10px 14px',
                          background: 'rgba(248,116,68,0.18)',
                          border: '1px solid rgba(248,116,68,0.45)',
                          borderRadius: 10,
                          color: '#f87444',
                          fontFamily: FN, fontSize: 13, fontWeight: 700,
                          cursor: isBusy ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        <X size={14} strokeWidth={2.4} />
                        Confirmar rechazo
                      </button>
                    </div>
                  </div>
                ) : (
                  // Modo normal: 2 botones grandes Confirmar / Rechazar
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setRejectingId(item.id)}
                      disabled={isBusy}
                      style={{
                        flex: 1, padding: '11px 14px',
                        background: 'transparent',
                        border: '1px solid rgba(248,116,68,0.40)',
                        borderRadius: 10,
                        color: '#f87444',
                        fontFamily: FN, fontSize: 13, fontWeight: 700,
                        cursor: isBusy ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <X size={14} strokeWidth={2.4} />
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleConfirm(item)}
                      disabled={isBusy}
                      style={{
                        flex: 2, padding: '11px 14px',
                        background: 'linear-gradient(135deg, #22E698, #16A34A)',
                        border: 'none',
                        borderRadius: 10,
                        color: '#fff',
                        fontFamily: FN, fontSize: 13, fontWeight: 800,
                        cursor: isBusy ? 'wait' : 'pointer',
                        boxShadow: '0 6px 18px rgba(34,230,152,0.40)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <Check size={14} strokeWidth={2.6} />
                      {isBusy ? 'Confirmando...' : 'Confirmar canje'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
