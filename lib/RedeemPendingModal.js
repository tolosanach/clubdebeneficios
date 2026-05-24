'use client'
// RedeemPendingModal — modal que se abre cuando el cliente toca "Canjear"
// en su wallet. El modal muestra:
//   • Código corto del canje (BNX-XXXX) — decorativo, lo usa el cliente
//     para que el comercio lo identifique en el WhatsApp.
//   • Premio + costo + comercio.
//   • Botón GRANDE "Avisar al comercio por WhatsApp" → abre wa.me con
//     el mensaje pre-armado ("Hola [comercio], soy [cliente]. Vine a
//     canjear: [premio]. Código: BNX-XXXX").
//   • Estado "Esperando confirmación" — el dueño es el único que cierra
//     el canje (queda pending hasta entonces).
//   • Si el comercio no tiene phone cargado, se ofrece copiar el
//     mensaje al portapapeles como fallback.
//
// El modal se construye sobre la respuesta de POST /api/redeem-request,
// que ya creó la fila en redemptions con status='pending' y devolvió el
// código + datos del comercio/premio.

import { useState } from 'react'
import { Gift, MessageCircle, Copy, X, Clock, CheckCircle, Star, Gem } from 'lucide-react'

const FN = "'Inter', system-ui, sans-serif"
// G — antes era gradient orange→fucsia. Rebrand mayo 2026 fase 2:
// violeta brand sólido. Mantengo el nombre G por compat de call sites.
const G  = '#6F30DF'

export default function RedeemPendingModal({
  data,
  clientName,
  onClose,
}) {
  // data shape: { redemption_id, code, status, commerce: {id,name,slug,phone},
  //               prize: {id,name,cost}, prog_type }
  const [copied, setCopied] = useState(false)
  if (!data) return null

  const isStars  = data.prog_type === 'stars'
  const unitTxt  = isStars ? `${data.prize.cost} estrella${data.prize.cost === 1 ? '' : 's'}` : `${data.prize.cost} puntos`
  const UnitIcon = isStars ? Star : Gem

  // Mensaje pre-armado para el WhatsApp. Lo armamos sin caracteres
  // especiales raros para que se vea bien en cualquier cliente WA.
  const message = (
    `Hola ${data.commerce.name}! Soy ${clientName || 'un cliente'}.\n\n` +
    `Vine a canjear:\n` +
    `🎁 ${data.prize.name}\n` +
    `${isStars ? '⭐' : '💎'} Costo: ${unitTxt}\n\n` +
    `Código de canje: *${data.code}*\n\n` +
    `Confirmá desde tu app cuando me lo entregues. ¡Gracias!`
  )

  // wa.me/<phone>?text=<encoded>. Limpiamos el phone de espacios y +
  // (wa.me lo acepta sin +). Si el comercio no tiene phone cargado,
  // showsAlternate fallback con copiar al clipboard.
  const phoneClean = (data.commerce.phone || '').replace(/[^\d]/g, '')
  const hasPhone   = phoneClean.length >= 8  // mínimo razonable
  const waUrl      = hasPhone
    ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(message)}`
    : null

  function handleCopy() {
    try {
      navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  function openWhatsApp() {
    if (!waUrl) {
      handleCopy()
      return
    }
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:300,
        background:'rgba(8,4,18,0.78)',
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:20,
        animation:'fadeIn 200ms ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'linear-gradient(180deg, #15091F 0%, #0a0612 100%)',
          border:'1px solid rgba(113,49,225,0.40)',
          borderRadius:24,
          padding:'28px 24px 22px',
          maxWidth:420, width:'100%',
          boxShadow:'0 24px 64px rgba(0,0,0,0.6)',
          fontFamily:FN,
          position:'relative',
        }}
      >
        {/* Botón cerrar */}
        <button onClick={onClose} aria-label="Cerrar"
          style={{
            position:'absolute', top:14, right:14,
            background:'transparent', border:'none',
            color:'rgba(255,255,255,0.55)', cursor:'pointer',
            padding:6, lineHeight:0,
          }}>
          <X size={20} strokeWidth={2} />
        </button>

        {/* Hero: ícono regalo + estado */}
        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{
            width:64, height:64, borderRadius:20,
            background:G,
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 14px',
            boxShadow:'0 12px 32px rgba(113,49,225,0.50)',
          }}>
            <Gift size={30} color="#fff" strokeWidth={2} />
          </div>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'5px 12px', borderRadius:99,
            background:'rgba(245,166,35,0.14)',
            border:'1px solid rgba(245,166,35,0.45)',
            fontSize:11, fontWeight:800, color:'#FF199F',
            letterSpacing:'.10em', textTransform:'uppercase',
            marginBottom:14,
          }}>
            <Clock size={11} strokeWidth={2.5} />
            Pendiente de entrega
          </div>
          <div style={{ fontSize:21, fontWeight:900, color:'#fff', marginBottom:6, letterSpacing:'-.01em' }}>
            ¡Tu canje está reservado!
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.65)', lineHeight:1.55 }}>
            Avisale al comercio por WhatsApp para que te lo entregue.
          </div>
        </div>

        {/* Detalle del premio */}
        <div style={{
          background:'rgba(255,255,255,0.04)',
          border:'1px solid rgba(255,255,255,0.10)',
          borderRadius:14,
          padding:'14px 16px',
          marginBottom:14,
        }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.50)', letterSpacing:'.10em', textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>
            Premio
          </div>
          <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:4 }}>
            {data.prize.name}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'rgba(255,255,255,0.65)' }}>
            <UnitIcon size={13} {...(isStars ? { strokeWidth:0, fill:'#6F30DF' } : { strokeWidth:2, color:'#6F30DF' })} />
            <span>{unitTxt}</span>
            <span style={{ color:'rgba(255,255,255,0.30)' }}>·</span>
            <span>{data.commerce.name}</span>
          </div>
        </div>

        {/* Código de canje — bloque destacado para que el comercio lo
            verifique en el WhatsApp */}
        <div style={{
          background:'rgba(113,49,225,0.10)',
          border:'1px solid rgba(113,49,225,0.40)',
          borderRadius:14,
          padding:'14px 16px',
          marginBottom:18,
          textAlign:'center',
        }}>
          <div style={{ fontSize:11, color:'rgba(216,180,254,0.85)', letterSpacing:'.10em', textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>
            Tu código de canje
          </div>
          <div className="font-display" style={{
            fontSize:32, fontWeight:400, color:'#fff',
            letterSpacing:'.08em', lineHeight:1,
          }}>
            {data.code}
          </div>
        </div>

        {/* CTA principal: WhatsApp */}
        {hasPhone ? (
          <button
            onClick={openWhatsApp}
            style={{
              width:'100%',
              padding:'14px 18px',
              borderRadius:14,
              background:'#25D366',
              border:'none',
              color:'#fff',
              fontFamily:FN, fontSize:15, fontWeight:800,
              letterSpacing:'.02em',
              cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              boxShadow:'0 8px 24px rgba(37,211,102,0.45)',
              marginBottom:10,
            }}
          >
            <MessageCircle size={18} strokeWidth={2.4} />
            Avisar por WhatsApp
          </button>
        ) : (
          <>
            <button
              onClick={handleCopy}
              style={{
                width:'100%',
                padding:'14px 18px',
                borderRadius:14,
                background:G,
                border:'none',
                color:'#fff',
                fontFamily:FN, fontSize:15, fontWeight:800,
                letterSpacing:'.02em',
                cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                boxShadow:'0 8px 24px rgba(113,49,225,0.45)',
                marginBottom:10,
              }}
            >
              <Copy size={18} strokeWidth={2.4} />
              {copied ? '¡Copiado!' : 'Copiar mensaje'}
            </button>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', textAlign:'center', marginBottom:10, lineHeight:1.5 }}>
              Este comercio no cargó WhatsApp. Pegale el mensaje en su número o mostrale tu código en el local.
            </div>
          </>
        )}

        {/* Aviso secundario sobre el flujo */}
        <div style={{
          display:'flex', alignItems:'flex-start', gap:8,
          padding:'10px 12px',
          background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:10,
          fontSize:11.5, color:'rgba(255,255,255,0.65)', lineHeight:1.5,
        }}>
          <CheckCircle size={13} color="rgba(113,49,225,0.85)" strokeWidth={2.4} style={{ flexShrink:0, marginTop:1 }} />
          <span>
            <strong style={{ color:'#fff', fontWeight:700 }}>Tus puntos siguen intactos</strong> hasta que el comercio confirme el canje. Si por algún motivo no se completa, no perdés nada.
          </span>
        </div>
      </div>
    </div>
  )
}
