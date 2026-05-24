'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Logo from './Logo'
import {
  IconScissors, IconPill, IconHanger, IconToolsKitchen2,
  IconBarbell, IconBuildingStore,
  IconUsersGroup, IconBroadcast, IconMapPin, IconBell, IconRobot,
  IconCheck, IconX,
} from '@tabler/icons-react'

// ─── Design tokens ────────────────────────────────────────────────────────────
const V1 = '#1A0050'
const V2 = '#3D0A9E'
const V3 = '#6F30DF'
const V4 = '#F0E8FF'
const PK = '#FF199F'   // solo acentos de texto y labels
const DK = '#220033'   // oscuro base (botones, texto sobre fondo claro)
const LT = '#EDD5F6'   // claro base (botones, texto sobre fondo oscuro)
const FN = "'Inter', system-ui, sans-serif"
const FM = "'Tilt Warp', sans-serif"

// Sobre fondo oscuro (V1 / V2 / V3 / #2D1B4E)
const btnDark      = { background:LT, color:DK, padding:'0.9rem 2.25rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', border:'none', cursor:'pointer', fontFamily:FN, display:'inline-block', textDecoration:'none' }
const btnDarkGhost = { background:'transparent', color:LT, padding:'0.9rem 2.25rem', borderRadius:100, fontWeight:500, border:`1.5px solid ${LT}`, cursor:'pointer', fontFamily:FN, display:'inline-block', textDecoration:'none' }
// Sobre fondo claro (V4 / #EDD5F6 / #fff)
const btnLight      = { background:DK, color:LT, padding:'0.9rem 2.25rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', border:'none', cursor:'pointer', fontFamily:FN, display:'inline-block', textDecoration:'none' }
const label    = { display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'3px', color:PK, marginBottom:14 }
const h2style  = { fontFamily:FM, fontSize:'clamp(1.8rem, 4vw, 2.4rem)', fontWeight:400, letterSpacing:'0px', textTransform:'uppercase', lineHeight:1.1, margin:0 }

// ─── FadeIn wrapper ───────────────────────────────────────────────────────────
function FadeIn({ children, style, delay = 0 }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'none' }, delay)
          obs.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])
  return (
    <div ref={ref} style={{ opacity:0, transform:'translateY(18px)', transition:'opacity 0.5s ease, transform 0.5s ease', ...style }}>
      {children}
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
// No sticky: el AppRoot ya tiene su glass pill fijo (zIndex:200). Este nav es
// solo el header de la landing, scrollea con el contenido y desaparece al bajar.
function Nav({ onLoginClick }) {
  return (
    <nav style={{ height:80, background:'#2D1B4E', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 clamp(16px, 5vw, 48px)', fontFamily:FN }}>
      <a href="/" style={{ flexShrink:0, textDecoration:'none', height:'80px', display:'flex', alignItems:'center' }}>
        <img src="/clufix_logo.svg" alt="Clufix" style={{ height:'64px', width:'auto', display:'block' }} />
      </a>
      <button onClick={onLoginClick} style={{ background:LT, color:DK, padding:'0.5rem 1.25rem', borderRadius:100, border:'none', cursor:'pointer', fontFamily:FN, fontWeight:700, fontSize:'0.9rem' }}>
        Empezar gratis
      </button>
    </nav>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background:'rgba(15,8,32,0.96)', borderTop:'1px solid rgba(255,255,255,0.07)', padding:'32px clamp(16px,5vw,48px)', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:FN, flexWrap:'wrap', gap:12 }}>
      <Logo height={32} />
      <span style={{ color:'rgba(255,255,255,0.40)', fontSize:'0.85rem' }}>© 2026 · clufix.com.ar · General Pico, La Pampa</span>
    </footer>
  )
}

// ─── Plans data ───────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Free', price: '$0', period: '/mes', popular: false,
    features: [
      { label:'Hasta 30 clientes', ok:true },
      { label:'2 premios activos', ok:true },
      { label:'QR del local', ok:true },
      { label:'Directorio público', ok:true },
      { label:'Cupones de descuento', ok:false },
      { label:'Días bonus ×2', ok:false },
      { label:'Soporte prioritario', ok:false },
      { label:'WhatsApp automático', ok:false },
      { label:'Reactivar inactivos', ok:false },
    ],
  },
  {
    name: 'Starter', price: '$25.000', period: '/mes', popular: true,
    features: [
      { label:'Hasta 60 clientes', ok:true },
      { label:'Premios ilimitados', ok:true },
      { label:'QR del local', ok:true },
      { label:'Directorio público', ok:true },
      { label:'Cupones de descuento', ok:true },
      { label:'Días bonus ×2', ok:true },
      { label:'Soporte prioritario', ok:true },
      { label:'WhatsApp automático', ok:false },
      { label:'Reactivar inactivos', ok:false },
    ],
  },
  {
    name: 'Pro', price: '$45.000', period: '/mes', popular: false,
    features: [
      { label:'Clientes ilimitados', ok:true },
      { label:'Premios ilimitados', ok:true },
      { label:'QR del local', ok:true },
      { label:'Directorio público', ok:true },
      { label:'Cupones de descuento', ok:true },
      { label:'Días bonus ×2', ok:true },
      { label:'Soporte prioritario', ok:true },
      { label:'WhatsApp automático', ok:true },
      { label:'Reactivar inactivos', ok:true },
    ],
  },
]

// ─── Rubro icons map ──────────────────────────────────────────────────────────
const RUBRO_ICONS = {
  peluquerias:  <IconScissors size={32} stroke={1.5} color={LT} />,
  farmacias:    <IconPill size={32} stroke={1.5} color={LT} />,
  indumentaria: <IconHanger size={32} stroke={1.5} color={LT} />,
  restaurantes: <IconToolsKitchen2 size={32} stroke={1.5} color={LT} />,
  gimnasios:    <IconBarbell size={32} stroke={1.5} color={LT} />,
  jugeterias:   <IconBuildingStore size={32} stroke={1.5} color={LT} />,
}

const RUBROS = [
  { slug:'peluquerias',  label:'Peluquerías' },
  { slug:'farmacias',    label:'Farmacias' },
  { slug:'indumentaria', label:'Indumentaria' },
  { slug:'restaurantes', label:'Restaurantes' },
  { slug:'gimnasios',    label:'Gimnasios' },
  { slug:'jugeterias',   label:'Jugueterías' },
]

// ─── HomePublic ───────────────────────────────────────────────────────────────
export default function HomePublic({ onLoginClick }) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= 560)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const px = 'clamp(16px,5vw,48px)'
  const sectionPy = '80px'

  return (
    <div style={{ fontFamily:FN, overflowX:'hidden' }}>
      <Nav onLoginClick={onLoginClick} />

      {/* ── 2. Hero ─────────────────────────────────────────────────────── */}
      <section style={{ background:'#2D1B4E', padding:`80px ${px}`, textAlign:'center', color:'#fff' }}>
        <FadeIn>
          <span style={label}>Tu club de beneficios</span>
          <h1 style={{ fontFamily:"'Tilt Warp', sans-serif", fontSize:'clamp(2.8rem,8vw,5rem)', fontWeight:400, letterSpacing:'0px', textTransform:'uppercase', lineHeight:1.05, margin:'0 0 24px', maxWidth:700, marginLeft:'auto', marginRight:'auto' }}>
            <span style={{ color:'#C9B8E8' }}>Tus clientes ya existen.</span><br />
            <span style={{ color:'#FF199F' }}>Hacelos volver.</span>
          </h1>
          <p style={{ fontSize:'clamp(1rem,2vw,1.15rem)', color:'#C9B8E8', maxWidth:520, margin:'0 auto 36px', lineHeight:1.65 }}>
            El sistema de fidelización más simple del país. Sin hardware, sin complicaciones.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={onLoginClick} style={btnDark}>Crear mi club gratis</button>
            <a href="#como-funciona" style={btnDarkGhost}>Ver cómo funciona</a>
          </div>
          <p style={{ marginTop:40, fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', letterSpacing:'3px', textTransform:'uppercase' }}>
            Escaneá <span style={{ color:PK }}>✦</span> Acumulá <span style={{ color:PK }}>✦</span> Canjeá
          </p>
        </FadeIn>
      </section>

      {/* ── 3. Split intro ──────────────────────────────────────────────── */}
      <section style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr' }}>
        <FadeIn style={{ background:V1, padding:`${sectionPy} ${px}`, color:'#fff' }}>
          <span style={label}>Para el comercio</span>
          <h2 style={{ ...h2style, color:'#fff' }}>
            Vos ponés las <span style={{ color:PK }}>reglas.</span>
          </h2>
          <p style={{ marginTop:20, color:'rgba(255,255,255,0.65)', lineHeight:1.7, maxWidth:440 }}>
            Elegís el sistema (estrellas o puntos), los premios, los descuentos y los días con bonus. Tu club, tus condiciones.
          </p>
        </FadeIn>
        <FadeIn style={{ background:V4, padding:`${sectionPy} ${px}`, color:V1 }} delay={100}>
          <span style={{ ...label, color:V3 }}>Para el cliente</span>
          <h2 style={{ ...h2style, color:V1 }}>
            Ellos <span style={{ color:V3 }}>acumulan.</span>
          </h2>
          <p style={{ marginTop:20, color:'rgba(26,0,80,0.65)', lineHeight:1.7, maxWidth:440 }}>
            Escanean el QR, ven sus puntos desde el celular y canjean cuando llegan al premio. Sin app que descargar.
          </p>
        </FadeIn>
      </section>

      {/* ── 4. Flow steps ───────────────────────────────────────────────── */}
      <section id="como-funciona">
        {STEPS.map((step, i) => {
          const isEven = i % 2 === 1
          return (
            <FadeIn key={step.num} style={{ background:step.bg, color: step.light ? V1 : '#fff' }}>
              <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', maxWidth:1100, margin:'0 auto', padding:`${sectionPy} ${px}`, gap:40, alignItems:'center', direction: isEven && !mobile ? 'rtl' : 'ltr' }}>
                <div style={{ direction:'ltr' }}>
                  <span style={{ ...label, color: step.light ? V3 : PK }}>{step.tag}</span>
                  <div style={{ fontSize:'0.78rem', fontWeight:700, letterSpacing:'3px', color: step.light ? 'rgba(26,0,80,0.4)' : 'rgba(255,255,255,0.4)', marginBottom:12, textTransform:'uppercase' }}>
                    {step.num}
                  </div>
                  <h2 style={{ ...h2style, color: step.light ? V1 : '#fff' }}>{step.title}</h2>
                  <p style={{ marginTop:16, lineHeight:1.7, color: step.light ? 'rgba(26,0,80,0.65)' : 'rgba(255,255,255,0.70)', maxWidth:440 }}>
                    {step.desc}
                  </p>
                </div>
                <div style={{ direction:'ltr', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:180, height:180, borderRadius:24, background: step.light ? 'rgba(111,48,223,0.10)' : 'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:'4rem' }}>{step.visual}</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          )
        })}

        {/* Switch comercio → cliente */}
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr' }}>
          <div style={{ background:V1, padding:`48px ${px}`, color:'#fff' }}>
            <p style={{ fontWeight:700, fontSize:'1.1rem', margin:'0 0 8px' }}>Club configurado.</p>
            <p style={{ color:'rgba(255,255,255,0.55)', margin:0 }}>El QR está en el mostrador.</p>
          </div>
          <div style={{ background:V4, padding:`48px ${px}`, color:V1 }}>
            <p style={{ fontWeight:700, fontSize:'1.1rem', margin:'0 0 8px' }}>Llega el cliente.</p>
            <p style={{ color:'rgba(26,0,80,0.55)', margin:0 }}>Escanea el QR y empieza.</p>
          </div>
        </div>
      </section>

      {/* ── 5. Bento features ───────────────────────────────────────────── */}
      <section style={{ background:'#fff', padding:`${sectionPy} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <span style={label}>Funcionalidades</span>
          <h2 style={h2style}>Todo lo que necesitás,<br />desde el día uno.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap:16, maxWidth:1100, margin:'0 auto' }}>
          {BENTO.map((card, i) => (
            <FadeIn key={i} delay={i * 60}
              style={{
                gridColumn: card.wide && !mobile ? 'span 2' : undefined,
                background: card.bg, borderRadius:20,
                padding:'32px 28px',
                color: card.light ? V1 : '#fff',
                display:'flex', flexDirection:'column', justifyContent:'space-between', gap:16, minHeight:160,
              }}>
              {card.icon && <div style={{ opacity:0.85 }}>{card.icon}</div>}
              {card.big && <div style={{ fontSize:'3.2rem', fontWeight:900, letterSpacing:'-3px', lineHeight:1, color: card.light ? DK : PK }}>{card.big}</div>}
              <div>
                <p style={{ margin:0, fontWeight:700, fontSize:'1rem', color: card.light ? V1 : '#fff' }}>{card.title}</p>
                {card.sub && <p style={{ margin:'6px 0 0', fontSize:'0.85rem', color: card.light ? 'rgba(26,0,80,0.55)' : 'rgba(255,255,255,0.6)' }}>{card.sub}</p>}
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 6. Rubros ───────────────────────────────────────────────────── */}
      <section id="rubros" style={{ background:V1, padding:`${sectionPy} ${px}`, textAlign:'center' }}>
        <FadeIn style={{ marginBottom:48 }}>
          <span style={label}>Por rubro</span>
          <h2 style={{ ...h2style, color:'#fff' }}>¿Cuál es tu negocio?</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap:16, maxWidth:900, margin:'0 auto' }}>
          {RUBROS.map((r, i) => (
            <FadeIn key={r.slug} delay={i * 60}>
              <Link href={`/rubros/${r.slug}`} style={{ textDecoration:'none' }}>
                <div style={{ background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:16, padding:'28px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:14, cursor:'pointer', transition:'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>
                  {RUBRO_ICONS[r.slug]}
                  <span style={{ color:'#fff', fontWeight:600, fontSize:'0.95rem', fontFamily:FN }}>{r.label}</span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 7. Planes ───────────────────────────────────────────────────── */}
      <section id="planes" style={{ background:V4, padding:`${sectionPy} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <span style={{ ...label, color:V3 }}>Precios</span>
          <h2 style={{ ...h2style, color:V1 }}>Empezá gratis,<br />crecé cuando estés listo.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap:20, maxWidth:960, margin:'0 auto' }}>
          {PLANS.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 80}
              style={{
                background:'#fff', borderRadius:20,
                border: plan.popular ? `2px solid ${V3}` : '1.5px solid #e8dff8',
                padding:'32px 28px', position:'relative',
                display:'flex', flexDirection:'column',
              }}>
              {plan.popular && (
                <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:V3, color:'#fff', fontSize:'0.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', padding:'5px 14px', borderRadius:100 }}>
                  Más popular
                </div>
              )}
              <div style={{ marginBottom:8 }}>
                <p style={{ margin:'0 0 4px', fontWeight:700, fontSize:'1rem', color:V1, fontFamily:FN }}>{plan.name}</p>
                <p style={{ margin:0 }}>
                  <span style={{ fontSize:'2rem', fontWeight:900, color:V1, letterSpacing:'-2px', fontFamily:FN }}>{plan.price}</span>
                  <span style={{ color:'rgba(26,0,80,0.5)', fontSize:'0.85rem' }}>{plan.period}</span>
                </p>
              </div>
              <div style={{ borderTop:'1px solid #f0eaff', margin:'20px 0', flex:1 }}>
                {plan.features.map(f => (
                  <div key={f.label} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #f9f6ff' }}>
                    {f.ok
                      ? <IconCheck size={16} stroke={2.5} color={DK} />
                      : <IconX     size={16} stroke={2.5} color='rgba(34,0,51,0.25)' />
                    }
                    <span style={{ fontSize:'0.88rem', color: f.ok ? V1 : 'rgba(26,0,80,0.4)', fontFamily:FN }}>{f.label}</span>
                  </div>
                ))}
              </div>
              <button onClick={onLoginClick} style={{ ...btnLight, width:'100%', textAlign:'center', marginTop:8 }}>
                Empezar
              </button>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 8. Testimonios ──────────────────────────────────────────────── */}
      <section style={{ background:V2, padding:`${sectionPy} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <span style={label}>Lo que dicen</span>
          <h2 style={{ ...h2style, color:'#fff' }}>Comercios que ya usan Clufix.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap:20, maxWidth:1100, margin:'0 auto' }}>
          {TESTIMONIOS.map((t, i) => (
            <FadeIn key={i} delay={i * 80}
              style={{ background:'rgba(255,255,255,0.08)', borderRadius:20, padding:'28px 24px', border:'1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ margin:'0 0 24px', color:'rgba(255,255,255,0.85)', lineHeight:1.7, fontStyle:'italic', fontSize:'0.95rem', fontFamily:FN }}>
                "{t.quote}"
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:LT, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:DK, fontSize:'0.9rem', fontFamily:FN, flexShrink:0 }}>
                  {t.initials}
                </div>
                <div>
                  <p style={{ margin:0, fontWeight:700, color:'#fff', fontSize:'0.88rem', fontFamily:FN }}>{t.name}</p>
                  <p style={{ margin:0, color:'rgba(255,255,255,0.5)', fontSize:'0.8rem', fontFamily:FN }}>{t.role}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 9. CTA final ────────────────────────────────────────────────── */}
      <section style={{ background:V3, padding:`${sectionPy} ${px}`, textAlign:'center', color:'#fff' }}>
        <FadeIn>
          <h2 style={{ ...h2style, color:'#fff', marginBottom:28 }}>
            Tu negocio merece clientes que <span style={{ color:PK }}>vuelven.</span>
          </h2>
          <button onClick={onLoginClick} style={btnDark}>Crear mi club gratis</button>
          <p style={{ marginTop:20, color:'rgba(255,255,255,0.5)', fontSize:'0.85rem', fontFamily:FN }}>
            Plan Free para siempre · Sin permanencia · Sin hardware
          </p>
        </FadeIn>
      </section>

      <Footer />
    </div>
  )
}

// ─── Static data ──────────────────────────────────────────────────────────────
const STEPS = [
  { num:'01', tag:'El comercio', title:'Te registrás con Google',    desc:'En 2 minutos tenés tu cuenta lista. Solo necesitás tu email de Google — sin formularios largos.',              bg:V1,  light:false, visual:'🔑' },
  { num:'02', tag:'El comercio', title:'Configurás tu club',          desc:'Elegís el nombre, el sistema (estrellas o puntos), los premios y cuánto vale cada visita.',                  bg:V4,  light:true,  visual:'⚙️' },
  { num:'03', tag:'El comercio', title:'Tu kit físico está listo',    desc:'Imprimís el QR de tu local y lo ponés en el mostrador. Eso es todo lo que necesitás.',                       bg:V2,  light:false, visual:'📌' },
  { num:'04', tag:'El cliente',  title:'Escanea y se suma',           desc:'El cliente apunta la cámara al QR, se registra en segundos y recibe un cupón de bienvenida automático.',     bg:V4,  light:true,  visual:'📱' },
  { num:'05', tag:'El cliente',  title:'Acumula recompensas',         desc:'Cada visita suma. El cliente ve su progreso en tiempo real y tiene una razón concreta para volver.',        bg:V1,  light:false, visual:'⭐' },
  { num:'06', tag:'El cliente',  title:'Canjea su premio',            desc:'Cuando llega al tope, el sistema lo avisa y el cliente elige su premio. El stock se descuenta solo.',       bg:V3,  light:false, visual:'🎁' },
]

const BENTO = [
  { bg:V1,  light:false, big:'30"',    title:'Para registrar una visita',  sub:'Escaneás el QR del cliente y listo.' },
  { bg:V4,  light:true,  icon:<IconUsersGroup size={28} stroke={1.5} color={DK} />, title:'Segmentación automática', sub:'Nuevos, frecuentes, VIP e inactivos.' },
  { bg:V4,  light:true,  icon:<IconBroadcast  size={28} stroke={1.5} color={DK} />, title:'WhatsApp automático',      sub:'Mensajes de reactivación sin trabajo extra.' },
  { bg:V2,  light:false, wide:true, icon:<IconMapPin size={28} stroke={1.5} color={LT} />, title:'Directorio público de Clufix', sub:'Tu club aparece en el directorio para sumar nuevos socios.' },
  { bg:V4,  light:true,  icon:<IconBell   size={28} stroke={1.5} color={DK} />, title:'Notificaciones push', sub:'Tus clientes se enteran de todo.' },
  { bg:V1,  light:false, big:'$0',     title:'Para empezar hoy',  sub:'Plan Free para siempre, sin tarjeta.' },
  { bg:V4,  light:true,  icon:<IconRobot  size={28} stroke={1.5} color={DK} />, title:'Soporte con IA', sub:'Disponible 24/7 dentro de la app.' },
]

const TESTIMONIOS = [
  { quote:'Antes usaba tarjetitas de cartón que se perdían siempre. Ahora el cliente escanea y listo.', initials:'MG', name:'Marcela G.', role:'Farmacia · General Pico' },
  { quote:'Activé los miércoles con puntos dobles y ese día se convirtió en el más movido de la semana.', initials:'SC', name:'Silvia C.', role:'Peluquería · La Pampa' },
  { quote:'El cliente puede ver sus puntos desde el celular. Me preguntan menos y vienen más seguido.', initials:'RL', name:'Roberto L.', role:'Local de ropa · La Pampa' },
]
