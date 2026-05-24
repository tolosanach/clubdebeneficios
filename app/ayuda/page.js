'use client'
import Link from 'next/link'
import { ChevronLeft, MessageCircle, Mail } from 'lucide-react'

export const dynamic = 'force-static'

const FAQ = [
  {
    q: '¿Cómo me sumo a un club?',
    a: 'Andá al comercio, buscá su QR (suele estar en la caja o en la entrada), abrí Clufix, apretá el botón QR del menú y escaneá. En segundos quedás registrado como socio del club y empezás a sumar puntos o estrellas en cada visita.',
  },
  {
    q: '¿Cómo canjeo un premio?',
    a: 'Cuando junte suficientes puntos o estrellas, abrí tu billetera (Mis Clubs), entrá al club, mirá la sección de premios y elegí el que quieras canjear. Mostrale el resultado al comerciante en el local — él aprueba el canje.',
  },
  {
    q: '¿Pierdo mis puntos si no visito el local seguido?',
    a: 'Depende del comercio. Algunos los hacen vencer, otros no. La fecha de vencimiento (si existe) aparece en el dorso de tu tarjeta del club.',
  },
  {
    q: 'Soy comerciante y quiero registrar mi negocio',
    a: 'Ingresá a Clufix con tu cuenta de Google, andá a "Mi cuenta" y elegí "Registrar mi comercio". Te lleva un par de minutos. El plan gratis te permite hasta 30 clientes activos.',
  },
  {
    q: 'Quiero cambiar de plan (Starter / Pro)',
    a: 'Desde tu panel de comercio, andá a la pestaña Planes y apretá el botón del plan que querés. Te abre un chat de WhatsApp con nosotros para coordinar el cobro por Mercado Pago. Una vez pagado, te activamos el plan en pocas horas.',
  },
  {
    q: '¿Cómo elimino mi cuenta?',
    a: 'Andá a "Mi cuenta" y abajo del todo encontrás "Eliminar cuenta". Tus datos personales se borran de nuestra base. Si sos comerciante con un negocio activo, primero tenés que solicitar la baja del comercio.',
  },
  {
    q: 'Encontré un error o algo no funciona',
    a: 'Mandanos un mensaje por WhatsApp con un breve resumen y, si podés, una captura de pantalla. Tratamos de resolver en menos de 24hs.',
  },
]

export default function AyudaPage() {
  const wa = '542302351158'
  const email = 'sitiospampa@gmail.com'

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#F0EAFF', fontFamily:"'Inter', system-ui, sans-serif", padding:'24px 18px 80px' }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.55)', fontSize:13, marginBottom:24, textDecoration:'none' }}>
          <ChevronLeft size={16} strokeWidth={2} /> Volver
        </Link>

        <h1 style={{ fontFamily:"'Space Grotesk', system-ui, sans-serif", fontSize:32, fontWeight:900, letterSpacing:'-.02em', marginBottom:6, color:'#fff' }}>Ayuda</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:32, lineHeight:1.6 }}>
          Estamos para ayudarte. Si no encontrás respuesta abajo, escribinos por WhatsApp y te respondemos lo antes posible.
        </p>

        {/* Botones de contacto */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:36 }}>
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola Clufix! Necesito ayuda con...')}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              padding:'14px 12px',
              background:'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              borderRadius:14, color:'#fff', textDecoration:'none',
              fontFamily:"'Space Grotesk', system-ui, sans-serif", fontSize:13, fontWeight:700,
              boxShadow:'0 4px 16px rgba(37,211,102,0.30)',
            }}>
            <MessageCircle size={16} strokeWidth={2.2} />
            WhatsApp
          </a>
          <a
            href={`mailto:${email}?subject=${encodeURIComponent('Consulta Clufix')}`}
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              padding:'14px 12px',
              background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:14, color:'#fff', textDecoration:'none',
              fontFamily:"'Space Grotesk', system-ui, sans-serif", fontSize:13, fontWeight:700,
            }}>
            <Mail size={16} strokeWidth={2.2} />
            Email
          </a>
        </div>

        {/* FAQ */}
        <h2 style={{ fontFamily:"'Space Grotesk', system-ui, sans-serif", fontSize:20, fontWeight:700, color:'#fff', marginBottom:18 }}>
          Preguntas frecuentes
        </h2>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {FAQ.map((item, i) => (
            <details key={i} style={{
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:14,
              padding:'14px 16px',
              cursor:'pointer',
            }}>
              <summary style={{
                fontFamily:"'Space Grotesk', system-ui, sans-serif",
                fontSize:14, fontWeight:700, color:'#fff',
                listStyle:'none', cursor:'pointer',
                outline:'none',
              }}>
                {item.q}
              </summary>
              <p style={{ marginTop:10, fontSize:13, color:'rgba(255,255,255,0.70)', lineHeight:1.65 }}>
                {item.a}
              </p>
            </details>
          ))}
        </div>

        {/* Footer info */}
        <div style={{ marginTop:40, padding:'18px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, fontSize:12, color:'rgba(255,255,255,0.55)', lineHeight:1.7 }}>
          <strong style={{ color:'#fff', fontFamily:"'Space Grotesk', system-ui, sans-serif" }}>Datos de contacto</strong><br />
          WhatsApp: +54 9 2302 35-1158<br />
          Email: {email}<br />
          <br />
          Atención lun-vie de 9 a 18hs (hora Argentina).
        </div>

        <div style={{ marginTop:24, fontSize:12, color:'rgba(255,255,255,0.45)', textAlign:'center', display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap' }}>
          <Link href="/terminos" style={{ color:'inherit', textDecoration:'underline' }}>Términos y Condiciones</Link>
          <Link href="/privacidad" style={{ color:'inherit', textDecoration:'underline' }}>Privacidad</Link>
        </div>
      </div>
    </div>
  )
}
