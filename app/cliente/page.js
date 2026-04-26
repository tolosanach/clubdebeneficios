'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const FN = "'Space Grotesk', sans-serif"
const FI = "'Inter', sans-serif"
const C = {
  bg:    'transparent',
  bg2:   'rgba(255,255,255,0.05)',
  bg3:   'rgba(255,255,255,0.04)',
  rim:   'rgba(255,255,255,0.10)',
  mist:  '#9B85CC',
  dust:  '#5C4A88',
  white: '#F0EDFF',
  accent:'#a855f7',
  ok:    '#22C55E',
  warn:  '#F59E0B',
  stars: '#F5A623',
}

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
      <div style={{
        width:32, height:32, borderRadius:'50%',
        border:`3px solid ${C.rim}`, borderTopColor: C.accent,
        animation:'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ background: C.bg3, borderRadius:99, height:8, overflow:'hidden' }}>
      <div style={{
        height:'100%', borderRadius:99,
        width:`${pct}%`,
        background: pct >= 100
          ? `linear-gradient(90deg, ${C.ok}, #16a34a)`
          : `linear-gradient(90deg, ${color || C.accent}, ${color ? color + 'cc' : '#a78bfa'})`,
        transition:'width 0.6s ease',
      }} />
    </div>
  )
}

function ClienteContent() {
  const params     = useSearchParams()
  const userId     = params.get('u')
  const commerceId = params.get('c')

  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !commerceId) {
      setError('Link inválido')
      setLoading(false)
      return
    }
    fetch(`/api/client-view?u=${userId}&c=${commerceId}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setData(d)
        else setError(d.error || 'Error al cargar')
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [userId, commerceId])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Spinner />
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:16 }}>
      <div style={{ fontSize:48 }}>⚠️</div>
      <div style={{ fontFamily:FN, fontSize:18, fontWeight:700, color:C.white }}>Link inválido</div>
      <div style={{ fontFamily:FI, fontSize:13, color:C.mist, textAlign:'center' }}>{error}</div>
    </div>
  )

  const { profile, commerce, membership, prizes, promos } = data
  const isStars   = commerce.prog_type === 'stars'
  const unitIcon  = isStars ? '⭐' : '💎'
  const unitLabel = isStars ? 'estrellas' : 'puntos'
  const unitColor = isStars ? C.stars : C.accent
  const balance   = membership?.balance || 0
  const visits    = membership?.visits_count || 0

  // Premio más barato para progress bar
  const cheapest     = prizes.length > 0 ? prizes[0] : null
  const canRedeemAny = cheapest && balance >= cheapest.cost

  // Promos por tipo
  const doublePromo   = promos.find(p => p.type === 'double_points')
  const discountPromo = promos.find(p => p.type === 'discount')

  return (
    <div style={{ minHeight:'100vh', fontFamily:FI }}>
      {/* Header del comercio */}
      <div style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom:`1px solid ${C.rim}`,
        padding:'20px 20px 16px',
        display:'flex', alignItems:'center', gap:14,
      }}>
        {commerce.logo_url ? (
          <img src={commerce.logo_url} alt={commerce.name}
            style={{ width:52, height:52, borderRadius:14, objectFit:'cover', border:`1px solid ${C.rim}` }} />
        ) : (
          <div style={{
            width:52, height:52, borderRadius:14,
            background:`linear-gradient(135deg, ${C.accent}, #a78bfa)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:22,
          }}>🏪</div>
        )}
        <div>
          <div style={{ fontFamily:FN, fontSize:18, fontWeight:700, color:C.white, lineHeight:1.2 }}>
            {commerce.name}
          </div>
          <div style={{ fontSize:11, color:C.mist, marginTop:3 }}>
            Programa de fidelización
          </div>
        </div>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'16px 16px 40px' }}>

        {/* Tarjeta de saldo */}
        <div style={{
          background:'rgba(255,255,255,0.06)',
          backdropFilter:'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          border:`1px solid ${C.rim}`,
          borderRadius:20,
          padding:'20px 22px',
          marginBottom:14,
          position:'relative',
          overflow:'hidden',
        }}>
          {/* Decoración fondo */}
          <div style={{
            position:'absolute', top:-30, right:-30,
            width:120, height:120, borderRadius:'50%',
            background:`${unitColor}18`,
          }} />

          <div style={{ fontSize:12, color:C.mist, marginBottom:4 }}>Hola,</div>
          <div style={{ fontFamily:FN, fontSize:22, fontWeight:700, color:C.white, marginBottom:16 }}>
            {profile.full_name || 'Cliente'}
          </div>

          {/* Balance principal */}
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginBottom:16 }}>
            <div style={{ fontFamily:FN, fontSize:48, fontWeight:700, color:unitColor, lineHeight:1 }}>
              {balance}
            </div>
            <div style={{ fontSize:14, color:C.mist, paddingBottom:8 }}>{unitLabel}</div>
          </div>

          {/* Visitas */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom: cheapest ? 16 : 0 }}>
            <span style={{ fontSize:14 }}>🗓</span>
            <span style={{ fontSize:12, color:C.mist }}>
              {visits} {visits === 1 ? 'visita' : 'visitas'} registradas
            </span>
          </div>

          {/* Progress bar hacia el próximo premio */}
          {cheapest && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:11, color:C.mist }}>
                  {canRedeemAny ? '¡Podés canjear un premio!' : `Próximo: ${cheapest.name}`}
                </span>
                <span style={{ fontSize:11, color: canRedeemAny ? C.ok : C.mist, fontWeight:600 }}>
                  {balance}/{cheapest.cost}
                </span>
              </div>
              <ProgressBar value={balance} max={cheapest.cost} color={unitColor} />
              {canRedeemAny && (
                <div style={{
                  marginTop:10, padding:'8px 12px',
                  background:`${C.ok}18`, borderRadius:10, border:`1px solid ${C.ok}44`,
                  fontSize:12, color:C.ok, fontWeight:600, textAlign:'center',
                }}>
                  🎉 Presentá este código al local para canjear
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sin membresía todavía */}
        {!membership && (
          <div style={{
            background:'rgba(255,255,255,0.05)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:`1px solid ${C.rim}`, borderRadius:16,
            padding:'16px 18px', marginBottom:14, textAlign:'center',
          }}>
            <div style={{ fontSize:32, marginBottom:8 }}>👋</div>
            <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:C.white, marginBottom:4 }}>
              Todavía no sos parte
            </div>
            <div style={{ fontSize:12, color:C.mist }}>
              Visitá {commerce.name} y escaneá tu QR para sumarte al programa.
            </div>
          </div>
        )}

        {/* Promos activas */}
        {promos.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.mist, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Promociones activas
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {doublePromo && (
                <div style={{
                  background:`${C.warn}10`, border:`1px solid ${C.warn}44`,
                  borderRadius:14, padding:'12px 14px',
                  display:'flex', alignItems:'center', gap:12,
                }}>
                  <div style={{ fontSize:24 }}>🔥</div>
                  <div>
                    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.warn }}>
                      Doble {unitLabel}
                    </div>
                    <div style={{ fontSize:11, color:C.mist, marginTop:2 }}>
                      {doublePromo.description || `Ganás el doble de ${unitLabel} en cada visita`}
                      {doublePromo.expires_at && (
                        <> · Hasta {new Date(doublePromo.expires_at).toLocaleDateString('es-AR', { day:'numeric', month:'short' })}</>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {discountPromo && (
                <div style={{
                  background:`${C.ok}10`, border:`1px solid ${C.ok}44`,
                  borderRadius:14, padding:'12px 14px',
                  display:'flex', alignItems:'center', gap:12,
                }}>
                  <div style={{ fontSize:24 }}>🏷️</div>
                  <div>
                    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.ok }}>
                      {discountPromo.discount_pct}% de descuento
                    </div>
                    <div style={{ fontSize:11, color:C.mist, marginTop:2 }}>
                      {discountPromo.description || 'Descuento especial vigente'}
                      {discountPromo.expires_at && (
                        <> · Hasta {new Date(discountPromo.expires_at).toLocaleDateString('es-AR', { day:'numeric', month:'short' })}</>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Catálogo de premios */}
        {prizes.length > 0 && (
          <div>
            <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.mist, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Premios disponibles
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {prizes.map(p => {
                const affordable = balance >= p.cost
                const stockLow   = p.stock !== null && p.stock <= 3
                return (
                  <div key={p.id} style={{
                    background:'rgba(255,255,255,0.05)',
                    backdropFilter:'blur(16px)',
                    WebkitBackdropFilter:'blur(16px)',
                    border:`1px solid ${affordable ? C.ok + '55' : C.rim}`,
                    borderRadius:16,
                    overflow:'hidden',
                    display:'flex',
                    opacity: affordable ? 1 : 0.75,
                  }}>
                    {/* Imagen o placeholder */}
                    {p.img_url ? (
                      <img src={p.img_url} alt={p.name}
                        style={{ width:80, height:80, objectFit:'cover', flexShrink:0 }} />
                    ) : (
                      <div style={{
                        width:80, height:80, flexShrink:0,
                        background:C.bg3,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:28,
                      }}>🎁</div>
                    )}
                    <div style={{ padding:'12px 14px', flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:C.white, marginBottom:4 }}>
                        {p.name}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{
                          fontFamily:FN, fontSize:13, fontWeight:700,
                          color: affordable ? C.ok : unitColor,
                        }}>
                          {p.cost} {unitIcon}
                        </span>
                        {affordable && (
                          <span style={{
                            fontSize:10, fontWeight:700, color:C.ok,
                            background:`${C.ok}20`, borderRadius:99, padding:'2px 8px',
                          }}>
                            ¡Podés canjear!
                          </span>
                        )}
                        {stockLow && p.stock > 0 && (
                          <span style={{
                            fontSize:10, fontWeight:700, color:C.warn,
                            background:`${C.warn}20`, borderRadius:99, padding:'2px 8px',
                          }}>
                            ⚠ Últimos {p.stock}
                          </span>
                        )}
                      </div>
                      {!affordable && (
                        <div style={{ marginTop:6 }}>
                          <ProgressBar value={balance} max={p.cost} color={unitColor} />
                          <div style={{ fontSize:10, color:C.dust, marginTop:3 }}>
                            Te faltan {p.cost - balance} {unitLabel}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {prizes.length === 0 && (
          <div style={{
            textAlign:'center', padding:'24px 0',
            color:C.mist, fontSize:13,
          }}>
            Este comercio aún no tiene premios disponibles.
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:32, fontSize:11, color:C.dust }}>
          Benefix · {commerce.name}
        </div>
      </div>
    </div>
  )
}

export default function ClienteView() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{
          width:32, height:32, borderRadius:'50%',
          border:'3px solid #2A2545', borderTopColor:'#7C5CFC',
          animation:'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <ClienteContent />
    </Suspense>
  )
}
