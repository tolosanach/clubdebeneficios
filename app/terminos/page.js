'use client'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-static'

export default function TerminosPage() {
  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#F0EAFF', fontFamily:"'Inter', system-ui, sans-serif", padding:'24px 18px 80px' }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.55)', fontSize:13, marginBottom:24, textDecoration:'none' }}>
          <ChevronLeft size={16} strokeWidth={2} /> Volver
        </Link>

        <h1 style={{ fontFamily:"'Space Grotesk', system-ui, sans-serif", fontSize:32, fontWeight:900, letterSpacing:'-.02em', marginBottom:6, color:'#fff' }}>Términos y Condiciones</h1>
        <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginBottom:32 }}>Última actualización: abril 2026</p>

        <div style={{ fontSize:14, lineHeight:1.7, color:'rgba(255,255,255,0.80)' }}>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>1. Aceptación de los términos</h2>
            <p>Al utilizar Benefix (la "Plataforma"), aceptás estos Términos y Condiciones. Si no estás de acuerdo, no uses el servicio.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>2. Descripción del servicio</h2>
            <p>Benefix es una plataforma digital de fidelización que conecta comercios con sus clientes mediante un sistema de puntos, estrellas, premios y promociones. Los comercios crean su "club" y los clientes acumulan beneficios por sus visitas.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>3. Cuentas de usuario</h2>
            <p style={{ marginBottom:8 }}>Existen dos tipos de cuenta:</p>
            <ul style={{ paddingLeft:20, marginBottom:8 }}>
              <li><strong>Cliente:</strong> persona física que se suma a clubs de comercios para acumular beneficios.</li>
              <li><strong>Comerciante:</strong> persona o entidad que registra un comercio y administra su programa de fidelización.</li>
            </ul>
            <p>Cada usuario es responsable de la veracidad de los datos que provee y de mantener la seguridad de su cuenta. La autenticación se realiza mediante Google.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>4. Uso aceptable</h2>
            <p style={{ marginBottom:8 }}>Te comprometés a no usar Benefix para:</p>
            <ul style={{ paddingLeft:20 }}>
              <li>Actividades ilegales, fraudulentas o engañosas.</li>
              <li>Falsificar visitas, escaneos QR o canjes.</li>
              <li>Acceder a cuentas ajenas o vulnerar la seguridad de la plataforma.</li>
              <li>Subir contenido que infrinja derechos de terceros, sea ofensivo o discriminatorio.</li>
            </ul>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>5. Programa de fidelización</h2>
            <p>Los puntos, estrellas, premios y promociones son emitidos por cada comercio individualmente. Benefix actúa como facilitador tecnológico pero <strong>no es responsable</strong> del cumplimiento de los premios ni de las condiciones específicas que defina cada comerciante. Ante cualquier disputa sobre canjes o premios, el cliente debe dirigirse directamente al comercio.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>6. Planes y pagos</h2>
            <p>Los comerciantes pueden contratar planes pagos (Starter, Pro) que habilitan funcionalidades adicionales. Los precios y condiciones de cada plan se publican en la sección "Planes" dentro de la plataforma. Los pagos se gestionan a través de Mercado Pago u otros medios habilitados. Las suscripciones son mensuales y se pueden cancelar en cualquier momento; no se realizan reintegros proporcionales por períodos no consumidos.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>7. Propiedad intelectual</h2>
            <p>El nombre Benefix, su logo, código y diseño son propiedad de Benefix. El contenido subido por los comerciantes (logos, descripciones, premios) es propiedad del comerciante, quien otorga a Benefix una licencia no exclusiva para mostrarlo dentro de la plataforma.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>8. Modificaciones</h2>
            <p>Benefix puede modificar estos términos en cualquier momento. Los cambios se notifican dentro de la plataforma. El uso continuado de Benefix tras los cambios implica aceptación de los nuevos términos.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>9. Limitación de responsabilidad</h2>
            <p>Benefix se ofrece "tal cual está". No garantizamos disponibilidad 100% del servicio, exactitud de la información provista por terceros (comerciantes), ni que esté libre de errores. En la máxima medida que permita la ley, Benefix no es responsable por daños indirectos, lucro cesante o pérdidas derivadas del uso o imposibilidad de uso de la plataforma.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>10. Cancelación de cuenta</h2>
            <p>Podés solicitar la eliminación de tu cuenta en cualquier momento desde la sección "Mi cuenta". Los comerciantes con un comercio activo deben primero solicitar la baja del comercio antes de cerrar su cuenta.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>11. Ley aplicable y jurisdicción</h2>
            <p>Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia será sometida a los tribunales ordinarios competentes con jurisdicción en la Provincia de La Pampa.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>12. Contacto</h2>
            <p>Para consultas, reclamos o solicitudes relacionadas con estos términos, podés escribirnos por <Link href="/ayuda" style={{ color:'#BD4BF8', textDecoration:'underline' }}>nuestro canal de ayuda</Link>.</p>
          </section>

        </div>
      </div>
    </div>
  )
}

const Section = {
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  fontSize: 18,
  fontWeight: 700,
  color: '#fff',
  marginBottom: 10,
  marginTop: 4,
}
