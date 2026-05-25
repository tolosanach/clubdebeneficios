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
const DK = '#220033'   // oscuro
const LT = '#EDD5F6'   // claro
const WH = '#FFFFFF'   // blanco
const PK = '#FF199F'   // fucsia — solo en logo, h1 segunda línea y labels de sección
const FN = "'Inter', system-ui, sans-serif"
const FM = "'Tilt Warp', sans-serif"
const FL = "'Lato', sans-serif"

// Sobre fondo oscuro
const btnDark      = { background:LT, color:DK, padding:'0.9rem 2.25rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', border:'none', cursor:'pointer', fontFamily:FN, display:'inline-block', textDecoration:'none' }
const btnDarkGhost = { background:'transparent', color:LT, padding:'0.9rem 2.25rem', borderRadius:100, fontWeight:500, border:`1.5px solid ${LT}`, cursor:'pointer', fontFamily:FN, display:'inline-block', textDecoration:'none' }
// Sobre fondo claro
const btnLight     = { background:DK, color:LT, padding:'0.9rem 2.25rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', border:'none', cursor:'pointer', fontFamily:FN, display:'inline-block', textDecoration:'none' }
const label        = { display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'3px', color:PK, marginBottom:14 }
const h2style      = { fontFamily:FM, fontSize:'clamp(1.8rem,4vw,2.4rem)', fontWeight:400, letterSpacing:'0px', textTransform:'uppercase', lineHeight:1.1, margin:0 }

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
function Nav({ onLoginClick }) {
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setVisible(y < lastY.current || y < 10)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:100,
      height:'72px', background:DK, borderBottom:`1px solid rgba(237,213,246,0.12)`,
      display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1.5rem', fontFamily:FN,
      transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      transition:'transform 0.3s ease',
    }}>
      <a href="/" style={{ flexShrink:0, textDecoration:'none', display:'flex', alignItems:'center' }}>
        <img src="/clufix_logo.svg" alt="Clufix" style={{ height:'44px', width:'auto', display:'block' }} />
      </a>
      <button onClick={onLoginClick} style={{ height:'44px', background:LT, color:DK, padding:'0 1.5rem', borderRadius:100, border:'none', cursor:'pointer', fontFamily:FN, fontWeight:700, fontSize:'0.9rem' }}>
        Empezar gratis
      </button>
    </nav>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background:WH, borderTop:`1px solid rgba(34,0,51,0.1)`, padding:'32px clamp(16px,5vw,48px)', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:FN, flexWrap:'wrap', gap:12 }}>
      <Logo height={32} />
      <span style={{ color:'rgba(34,0,51,0.45)', fontSize:'0.85rem' }}>© 2026 · clufix.com.ar · General Pico, La Pampa</span>
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

// ─── Rubro icons ──────────────────────────────────────────────────────────────
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

// ─── Animated headline phrases ───────────────────────────────────────────────
const HERO_PHRASES = [
  'LOS CLIENTES VUELVEN',
  'LOS NEGOCIOS CRECEN',
  'TODOS GANAN',
  'TODO SUMA',
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

  const [phraseIdx, setPhraseIdx] = useState(0)
  const [animState, setAnimState] = useState('visible') // 'visible' | 'exit' | 'enter'

  useEffect(() => {
    const id = setInterval(() => {
      setAnimState('exit')
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % HERO_PHRASES.length)
        setAnimState('enter')
        setTimeout(() => setAnimState('visible'), 40)
      }, 400)
    }, 2500)
    return () => clearInterval(id)
  }, [])

  const [activeSteps, setActiveSteps] = useState(new Array(6).fill(false))
  const stepRefs = useRef([])

  useEffect(() => {
    const threshold = mobile ? 0.4 : 0.5
    const observers = stepRefs.current.map((el, i) => {
      if (!el) return null
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setActiveSteps(prev => { if (prev[i]) return prev; const next = [...prev]; next[i] = true; return next })
          obs.disconnect()
        }
      }, { threshold })
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [mobile])

  const px = 'clamp(16px,5vw,48px)'
  const sectionPy = '80px'

  const renderBlock = (isDark, headerLabel, h2Text, pText, steps, startIdx, sectionId) => {
    const railColor   = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(34,0,51,0.1)'
    const h2Color     = isDark ? WH : DK
    const pColor      = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(34,0,51,0.6)'
    const circleStyle = isDark ? { background:PK, color:WH } : { background:DK, color:LT }
    const titleColor  = isDark ? WH : DK
    const descColor   = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(34,0,51,0.65)'
    return (
      <section id={sectionId || undefined} style={{ background: isDark ? DK : LT, padding: mobile ? '3rem 2rem' : '4rem 10%' }}>
        <FadeIn>
          <div style={{ maxWidth:640 }}>
            <span style={{ display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'3px', color:PK, marginBottom:'0.5rem' }}>{headerLabel}</span>
            <h2 style={{ fontFamily:FL, fontWeight:900, textTransform:'uppercase', fontSize:'clamp(1.8rem,5vw,2.4rem)', lineHeight:1.05, color:h2Color, margin:0, marginBottom:'0.6rem' }}>{h2Text}</h2>
            <p style={{ fontSize:'0.9rem', lineHeight:1.6, color:pColor, margin:0, marginBottom:'2.5rem' }}>{pText}</p>
          </div>
        </FadeIn>

        <div style={{ position:'relative', paddingLeft:'56px' }}>
          {/* Rail vertical */}
          <div style={{ position:'absolute', left:15, top:0, bottom:0, width:2, background:railColor, pointerEvents:'none' }} />

          {steps.map((step, i) => {
            const globalIdx = startIdx + i
            const active    = activeSteps[globalIdx]
            return (
              <div
                key={step.num}
                ref={el => { stepRefs.current[globalIdx] = el }}
                style={{ position:'relative', marginBottom: i < steps.length - 1 ? '2.5rem' : 0, display:'flex', alignItems:'center' }}
              >
                <div style={{
                  position:'absolute', left:-56, top:'50%', transform:'translateY(-50%)',
                  width:32, height:32, borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:FL, fontWeight:900, fontSize:'0.72rem',
                  opacity: active ? 1 : 0.3,
                  transition:'opacity 0.4s ease',
                  ...circleStyle,
                }}>
                  {step.num}
                </div>
                <div style={{ opacity: active ? 1 : 0.4, transition:'opacity 0.4s ease' }}>
                  <p style={{ fontFamily:FL, fontWeight:900, textTransform:'uppercase', fontSize:'1.35rem', lineHeight:1.1, color:titleColor, margin:0, marginBottom:'0.5rem' }}>{step.title}</p>
                  <p style={{ fontFamily:FN, fontWeight:400, fontSize:'0.88rem', lineHeight:1.65, color:descColor, margin:0 }}>{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div style={{ fontFamily:FN, overflowX:'hidden', isolation:'isolate' }}>
      <Nav onLoginClick={onLoginClick} />
      <div style={{ height:72 }} />

      {/* ── Hero (oscuro) ───────────────────────────────────────────────── */}
      <section style={{ background:'#220033', padding:`80px ${px}`, textAlign:'center' }}>
        <FadeIn>
          <h1 style={{ fontFamily:FM, fontSize:'clamp(3.5rem,10vw,6rem)', fontWeight:400, letterSpacing:'0px', textTransform:'uppercase', lineHeight:0.9, margin:'0 0 20px', maxWidth:800, marginLeft:'auto', marginRight:'auto' }}>
            <span style={{ display:'block', color:'#FFFFFF' }}>EL LUGAR DONDE</span>
            <span style={{
              display:'block',
              position:'relative',
              minHeight:'clamp(210px, 30vw, 260px)',
              overflow:'hidden',
            }}>
              <span style={{
                position:'absolute',
                top:0, left:0, right:0,
                textAlign:'center',
                color:'#FF199F',
                opacity: animState === 'exit' ? 0 : 1,
                transform: animState === 'exit' ? 'translateY(-28px)' : animState === 'enter' ? 'translateY(28px)' : 'translateY(0)',
                transition: animState === 'exit' ? 'opacity 0.4s ease, transform 0.4s ease' : animState === 'visible' ? 'opacity 0.4s ease, transform 0.4s ease' : 'none',
              }}>
                {HERO_PHRASES[phraseIdx]}
              </span>
            </span>
          </h1>
          <p style={{ fontSize:'clamp(0.95rem,2vw,1.1rem)', color:'rgba(255,255,255,0.7)', maxWidth:520, margin:'0 auto 36px', lineHeight:1.65, fontWeight:400, textTransform:'none', fontFamily:FN }}>
            Bienvenido a Clufix.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={onLoginClick} style={btnDark}>Crear mi club gratis</button>
            <a href="#como-funciona" style={btnDarkGhost}>Ver cómo funciona</a>
          </div>
          <p style={{ marginTop:40, fontSize:'0.78rem', color:'rgba(255,255,255,0.35)', letterSpacing:'3px', textTransform:'uppercase' }}>
            Escaneá · Acumulá · Canjeá
          </p>
        </FadeIn>
      </section>

      {/* ── COMERCIO block ──────────────────────────────────────────────── */}
      {renderBlock(false, 'COMERCIO', 'VOS LO ARMÁS.', 'Tu club listo en 2 minutos. Tus reglas, tus premios, tu forma.', STEPS_COMMERCE, 0, 'como-funciona')}

      {/* ── Divisor ─────────────────────────────────────────────────────── */}
      <div style={{ background:WH, padding:'1.5rem', textAlign:'center' }}>
        <span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'3px', color:'#ccc' }}>Y ENTONCES...</span>
      </div>

      {/* ── CLIENTE block ───────────────────────────────────────────────── */}
      {renderBlock(true, 'CLIENTE', 'VOS LO DISFRUTÁS.', 'Escaneá, acumulá y canjeá. Sin descargar nada.', STEPS_CLIENT, 3)}

      {/* ── Features (fondo blanco, lista estilo Wise) ───────────────────── */}
      <section style={{ background:WH, padding:`${sectionPy} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:56 }}>
          <span style={label}>Funcionalidades</span>
          <h2 style={{ ...h2style, color:DK }}>Todo lo que necesitás,<br />desde el día uno.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap:'48px 80px', maxWidth:900, margin:'0 auto' }}>
          {FEATURES.map((f, i) => (
            <FadeIn key={i} delay={i * 60} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {f.icon ? (
                <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'#F5F5F5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {f.icon}
                </div>
              ) : (
                <div style={{ fontSize:'2.4rem', fontWeight:900, color:DK, lineHeight:1, letterSpacing:'-2px' }}>{f.big}</div>
              )}
              <div>
                <p style={{ margin:'0 0 6px', fontWeight:700, fontSize:'1rem', color:DK, fontFamily:FN }}>{f.title}</p>
                <p style={{ margin:0, fontSize:'0.88rem', color:'#666', lineHeight:1.65, fontFamily:FN }}>{f.sub}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Rubros (oscuro) ─────────────────────────────────────────────── */}
      <section id="rubros" style={{ background:DK, padding:`${sectionPy} ${px}`, textAlign:'center' }}>
        <FadeIn style={{ marginBottom:48 }}>
          <span style={label}>Clufix se adapta</span>
          <h2 style={{ ...h2style, color:WH }}>¿Cuál es tu negocio?</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap:16, maxWidth:900, margin:'0 auto' }}>
          {RUBROS.map((r, i) => (
            <FadeIn key={r.slug} delay={i * 60}>
              <Link href={`/rubros/${r.slug}`} style={{ textDecoration:'none' }}>
                <div style={{ background:'rgba(237,213,246,0.08)', border:'0.5px solid rgba(237,213,246,0.15)', borderRadius:16, padding:'28px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:14, cursor:'pointer', transition:'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,213,246,0.16)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(237,213,246,0.08)'}>
                  {RUBRO_ICONS[r.slug]}
                  <span style={{ color:WH, fontWeight:600, fontSize:'0.95rem', fontFamily:FN }}>{r.label}</span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Planes (claro) ──────────────────────────────────────────────── */}
      <section id="planes" style={{ background:LT, padding:`${sectionPy} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <span style={label}>Precios</span>
          <h2 style={{ ...h2style, color:DK }}>Empezá gratis,<br />crecé cuando estés listo.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap:20, maxWidth:960, margin:'0 auto' }}>
          {PLANS.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 80}
              style={{
                background:WH, borderRadius:20,
                border: plan.popular ? `2px solid ${DK}` : `1.5px solid rgba(34,0,51,0.2)`,
                padding:'32px 28px', position:'relative',
                display:'flex', flexDirection:'column',
              }}>
              {plan.popular && (
                <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:DK, color:LT, fontSize:'0.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', padding:'5px 14px', borderRadius:100 }}>
                  Más popular
                </div>
              )}
              <div style={{ marginBottom:8 }}>
                <p style={{ margin:'0 0 4px', fontWeight:700, fontSize:'1rem', color:DK, fontFamily:FN }}>{plan.name}</p>
                <p style={{ margin:0 }}>
                  <span style={{ fontSize:'2rem', fontWeight:900, color:DK, letterSpacing:'-2px', fontFamily:FN }}>{plan.price}</span>
                  <span style={{ color:'rgba(34,0,51,0.5)', fontSize:'0.85rem' }}>{plan.period}</span>
                </p>
              </div>
              <div style={{ borderTop:'1px solid rgba(34,0,51,0.1)', margin:'20px 0', flex:1 }}>
                {plan.features.map(f => (
                  <div key={f.label} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(34,0,51,0.06)' }}>
                    {f.ok
                      ? <IconCheck size={16} stroke={2.5} color={DK} />
                      : <IconX     size={16} stroke={2.5} color='rgba(34,0,51,0.25)' />
                    }
                    <span style={{ fontSize:'0.88rem', color: f.ok ? DK : 'rgba(34,0,51,0.4)', fontFamily:FN }}>{f.label}</span>
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

      {/* ── Testimonios (oscuro) ────────────────────────────────────────── */}
      <section style={{ background:DK, padding:`${sectionPy} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <span style={label}>Lo que dicen</span>
          <h2 style={{ ...h2style, color:WH }}>Comercios que ya usan Clufix.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap:20, maxWidth:1100, margin:'0 auto' }}>
          {TESTIMONIOS.map((t, i) => (
            <FadeIn key={i} delay={i * 80}
              style={{ background:'rgba(237,213,246,0.08)', borderRadius:20, padding:'28px 24px', border:'1px solid rgba(237,213,246,0.15)' }}>
              <p style={{ margin:'0 0 24px', color:'rgba(255,255,255,0.85)', lineHeight:1.7, fontStyle:'italic', fontSize:'0.95rem', fontFamily:FN }}>
                "{t.quote}"
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:LT, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:DK, fontSize:'0.9rem', fontFamily:FN, flexShrink:0 }}>
                  {t.initials}
                </div>
                <div>
                  <p style={{ margin:0, fontWeight:700, color:WH, fontSize:'0.88rem', fontFamily:FN }}>{t.name}</p>
                  <p style={{ margin:0, color:'rgba(255,255,255,0.5)', fontSize:'0.8rem', fontFamily:FN }}>{t.role}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── CTA final (claro) ───────────────────────────────────────────── */}
      <section style={{ background:LT, padding:`${sectionPy} ${px}`, textAlign:'center' }}>
        <FadeIn>
          <h2 style={{ ...h2style, color:DK, marginBottom:28 }}>
            Tu negocio merece clientes que vuelven.
          </h2>
          <button onClick={onLoginClick} style={btnLight}>Crear mi club gratis</button>
          <p style={{ marginTop:20, color:'rgba(34,0,51,0.5)', fontSize:'0.85rem', fontFamily:FN }}>
            Plan Free para siempre · Sin permanencia · Sin hardware
          </p>
        </FadeIn>
      </section>

      <Footer />
    </div>
  )
}

// ─── Static data ──────────────────────────────────────────────────────────────
const STEPS_COMMERCE = [
  { num:'01', tag:'El comercio', title:'ENTRÁS CON GOOGLE',       desc:'Un click y tu cuenta está lista. Sin formularios, sin tarjeta.',                                                                                                                                                                                                        light:true,  visual:'🔑' },
  { num:'02', tag:'El comercio', title:'ARMÁS TU CLUB',           desc:'Elegís si premiás por visita o por monto gastado. Creás tu catálogo de premios, activás descuentos para la próxima compra y ponés días con puntos dobles. Todo en un panel simple.',                                                                                    light:false, visual:'⚙️' },
  { num:'03', tag:'El comercio', title:'TU CLUB ESTÁ LISTO',      desc:'Tus clientes ya pueden sumarse y empezar a acumular beneficios con su QR.',                                                                                                                                                                                             light:true,  visual:'📌' },
]

const STEPS_CLIENT = [
  { num:'04', tag:'El cliente',  title:'ENTRA AL CLUB',           desc:'Escanea el QR, se registra en segundos y recibe su primer beneficio automáticamente.',                                                                                                                                                                                  light:false, visual:'📱' },
  { num:'05', tag:'El cliente',  title:'ACUMULA EN CADA VISITA',  desc:'Cada vez que compra, suma puntos o estrellas. Ve su progreso en el celular y tiene una razón concreta para volver.',                                                                                                                                                    light:true,  visual:'⭐' },
  { num:'06', tag:'El cliente',  title:'CANJEA SU PREMIO',        desc:'Cuando suma lo suficiente..., el sistema lo avisa. Elige su premio, vos confirmás con un escaneo. Simple y sin papel.',                                                                                                                                                        light:false, visual:'🎁' },
]

const FEATURES = [
  { icon:<IconUsersGroup size={28} stroke={1.5} color={DK} />, title:'Segmentación automática', sub:'Nuevos, frecuentes, VIP e inactivos.' },
  { icon:<IconBroadcast  size={28} stroke={1.5} color={DK} />, title:'WhatsApp automático',      sub:'Mensajes de reactivación sin trabajo extra.' },
  { icon:<IconMapPin     size={28} stroke={1.5} color={DK} />, title:'Directorio público',       sub:'Tu club aparece en el directorio para sumar nuevos socios.' },
  { icon:<IconBell       size={28} stroke={1.5} color={DK} />, title:'Notificaciones push',      sub:'Tus clientes se enteran de todo.' },
  { icon:<IconRobot      size={28} stroke={1.5} color={DK} />, title:'Soporte con IA',            sub:'Disponible 24/7 dentro de la app.' },
]

const TESTIMONIOS = [
  { quote:'Antes usaba tarjetitas de cartón que se perdían siempre. Ahora el cliente escanea y listo.', initials:'MG', name:'Marcela G.', role:'Farmacia · General Pico' },
  { quote:'Activé los miércoles con puntos dobles y ese día se convirtió en el más movido de la semana.', initials:'SC', name:'Silvia C.', role:'Peluquería · La Pampa' },
  { quote:'El cliente puede ver sus puntos desde el celular. Me preguntan menos y vienen más seguido.', initials:'RL', name:'Roberto L.', role:'Local de ropa · La Pampa' },
]
