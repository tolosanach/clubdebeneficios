'use client'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-static'

export default function PrivacidadPage() {
  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#F0EAFF', fontFamily:"'Inter', system-ui, sans-serif", padding:'24px 18px 80px' }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.55)', fontSize:13, marginBottom:24, textDecoration:'none' }}>
          <ChevronLeft size={16} strokeWidth={2} /> Volver
        </Link>

        <h1 style={{ fontFamily:"'Space Grotesk', system-ui, sans-serif", fontSize:32, fontWeight:900, letterSpacing:'-.02em', marginBottom:6, color:'#fff' }}>Política de Privacidad</h1>
        <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginBottom:32 }}>Última actualización: abril 2026</p>

        <div style={{ fontSize:14, lineHeight:1.7, color:'rgba(255,255,255,0.80)' }}>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>1. Quiénes somos</h2>
            <p>Benefix es una plataforma de fidelización para comercios con sede operativa en La Pampa, Argentina. Esta política describe cómo recolectamos, usamos y protegemos tus datos personales, en cumplimiento con la Ley 25.326 de Protección de Datos Personales.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>2. Qué datos recolectamos</h2>
            <p style={{ marginBottom:8 }}>Recolectamos los siguientes datos:</p>
            <ul style={{ paddingLeft:20, marginBottom:12 }}>
              <li><strong>Datos de cuenta</strong> (de Google al iniciar sesión): nombre, email, foto de perfil.</li>
              <li><strong>Datos de perfil</strong>: nombre completo, teléfono, ciudad, provincia, país (todos opcionales y completados por vos).</li>
              <li><strong>Datos de actividad</strong>: clubs a los que te sumaste, visitas registradas, puntos/estrellas acumulados, premios canjeados, promociones recibidas.</li>
              <li><strong>Datos de comercios</strong> (si sos comerciante): nombre del comercio, dirección, horarios, fotos, configuración del programa de fidelización.</li>
            </ul>
            <p>No recolectamos datos sensibles (salud, religión, ideología, etc.).</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>3. Para qué usamos tus datos</h2>
            <ul style={{ paddingLeft:20 }}>
              <li>Brindar el servicio de fidelización (acumular puntos, canjear premios, mostrar promociones).</li>
              <li>Mostrar al comerciante quiénes son sus clientes activos para que pueda atenderlos.</li>
              <li>Enviar notificaciones operativas relacionadas a tu cuenta (canjes, vencimientos de promociones, etc.).</li>
              <li>Mejorar la plataforma a través de análisis estadístico (siempre en forma agregada, sin identificación individual).</li>
            </ul>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>4. Quién accede a tus datos</h2>
            <ul style={{ paddingLeft:20 }}>
              <li><strong>Vos mismo</strong>: tenés acceso completo a tus datos desde la sección "Mi cuenta".</li>
              <li><strong>El comercio donde sos socio</strong>: el dueño del comercio puede ver tu nombre, teléfono (si lo cargaste) y tu actividad dentro de su club. No ve tu email salvo que vos lo compartas.</li>
              <li><strong>Benefix</strong>: nuestro equipo accede a los datos solo para soporte técnico, prevención de fraude o cumplimiento legal.</li>
              <li><strong>Proveedores</strong>: usamos servicios externos confiables como Supabase (base de datos), Google (autenticación), Vercel (hosting), Mercado Pago (pagos). Cada uno cumple sus propias políticas de privacidad.</li>
            </ul>
            <p style={{ marginTop:8 }}>No vendemos ni cedemos tus datos a terceros para fines comerciales.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>5. Tus derechos</h2>
            <p style={{ marginBottom:8 }}>Conforme a la Ley 25.326 tenés derecho a:</p>
            <ul style={{ paddingLeft:20 }}>
              <li><strong>Acceso</strong>: pedir copia de tus datos.</li>
              <li><strong>Rectificación</strong>: corregir datos inexactos.</li>
              <li><strong>Actualización</strong>: actualizar datos desactualizados.</li>
              <li><strong>Eliminación</strong>: pedir que borremos tu cuenta y tus datos. Podés hacerlo desde "Mi cuenta" → "Eliminar cuenta".</li>
            </ul>
            <p style={{ marginTop:8 }}>Para ejercer estos derechos podés escribirnos por <Link href="/ayuda" style={{ color:'#BD4BF8', textDecoration:'underline' }}>el canal de ayuda</Link>. Respondemos dentro de los 10 días hábiles.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>6. Cuánto tiempo guardamos tus datos</h2>
            <p>Tus datos se guardan mientras tu cuenta esté activa. Si pedís eliminar la cuenta, todos los datos personales se borran de la base de datos (algunas operaciones agregadas y anonimizadas pueden permanecer para fines estadísticos).</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>7. Seguridad</h2>
            <p>Implementamos medidas de seguridad razonables: encriptación HTTPS, autenticación segura por Google, almacenamiento en servicios con cifrado en reposo, y políticas de acceso restringido (Row Level Security en la base de datos). Sin embargo, ningún sistema es 100% inviolable; nos comprometemos a notificarte ante cualquier incidente que afecte tus datos personales.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>8. Cookies y almacenamiento local</h2>
            <p>Usamos cookies y almacenamiento local del navegador para mantener tu sesión activa y guardar preferencias (último club visitado, filtros aplicados). No usamos cookies de seguimiento de terceros para publicidad.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>9. Menores de edad</h2>
            <p>Benefix está destinado a personas mayores de 16 años. Si sos menor, necesitás autorización de tu representante legal para usar la plataforma.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>10. Cambios en esta política</h2>
            <p>Si actualizamos esta política significativamente, te avisaremos dentro de la plataforma. La versión vigente siempre estará disponible en esta página.</p>
          </section>

          <section style={{ marginBottom:28 }}>
            <h2 style={Section}>11. Contacto y reclamos</h2>
            <p>Para cualquier consulta o reclamo sobre el tratamiento de tus datos personales, escribinos por <Link href="/ayuda" style={{ color:'#BD4BF8', textDecoration:'underline' }}>nuestro canal de ayuda</Link>. Si considerás que no respondimos adecuadamente, podés presentar una denuncia ante la Agencia de Acceso a la Información Pública de Argentina, autoridad de aplicación de la Ley 25.326.</p>
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
