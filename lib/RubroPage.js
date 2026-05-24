'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  IconScissors, IconPill, IconHanger, IconToolsKitchen2,
  IconBarbell, IconBuildingStore,
  IconQrcode, IconStar, IconTicket, IconBolt, IconMessageCircle,
  IconCoin, IconCalendar, IconUsers, IconBell, IconRobot, IconMapPin,
  IconCheck, IconX, IconChevronDown,
} from '@tabler/icons-react'
import { rubroList } from './rubros-data'

// ─── Design tokens ────────────────────────────────────────────────────────────
const V1 = '#1A0050'
const V2 = '#3D0A9E'
const V3 = '#6F30DF'
const V4 = '#F0E8FF'
const PK = '#FF199F'
const FN = "'Inter', system-ui, sans-serif"
const FM = "'Tilt Warp', sans-serif"

const btnPk    = { background:PK, color:'#fff', padding:'0.9rem 2.25rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', border:'none', cursor:'pointer', fontFamily:FN, display:'inline-block', textDecoration:'none' }
const btnGhost = { background:'#F0E8FF', color:'#1A0050', padding:'0.9rem 2.25rem', borderRadius:100, fontWeight:500, border:'none', cursor:'pointer', fontFamily:FN, display:'inline-block', textDecoration:'none' }
const label    = { display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'3px', color:PK, marginBottom:14 }
const h2style  = { fontFamily:FM, fontSize:'clamp(1.8rem,4vw,2.4rem)', fontWeight:400, letterSpacing:'0px', textTransform:'uppercase', lineHeight:1.1, margin:0 }

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
function Nav() {
  return (
    <nav style={{ position:'sticky', top:0, zIndex:100, height:68, background:'#fff', borderBottom:'1px solid #f0eaff', display:'flex', alignItems:'center', padding:'0 clamp(16px,5vw,48px)', gap:32, fontFamily:FN }}>
      <Link href="/" style={{ flexShrink:0 }}>
        <img src="/clufix_logo.svg" alt="Clufix" height={36} style={{ display:'block' }} />
      </Link>
      <div style={{ flex:1, display:'flex', alignItems:'center', gap:28 }}>
        <Link href="/#planes" style={{ color:V1, fontSize:'0.9rem', fontWeight:500, textDecoration:'none' }}>Precios</Link>
        <Link href="/#rubros" style={{ color:V1, fontSize:'0.9rem', fontWeight:500, textDecoration:'none' }}>Rubros</Link>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <Link href="/" style={{ color:V1, padding:'0.5rem 1rem', borderRadius:100, border:'1.5px solid #ddd', fontFamily:FN, fontWeight:500, fontSize:'0.9rem', textDecoration:'none', display:'inline-block' }}>
          Iniciar sesión
        </Link>
        <Link href="/" style={{ background:V1, color:'#fff', padding:'0.5rem 1.25rem', borderRadius:100, fontFamily:FN, fontWeight:700, fontSize:'0.9rem', textDecoration:'none', display:'inline-block' }}>
          Registrarse
        </Link>
      </div>
    </nav>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background:'#fff', borderTop:'1px solid #f0eaff', padding:'32px clamp(16px,5vw,48px)', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:FN, flexWrap:'wrap', gap:12 }}>
      <img src="/clufix_logo.svg" alt="Clufix" height={32} style={{ display:'block' }} />
      <span style={{ color:'#9990BB', fontSize:'0.85rem' }}>© 2026 · clufix.com.ar · General Pico, La Pampa</span>
    </footer>
  )
}

// ─── Plans ────────────────────────────────────────────────────────────────────
const PLANS = [
  { name:'Free', price:'$0', period:'/mes', popular:false, features:[
    { label:'Hasta 30 clientes', ok:true }, { label:'2 premios activos', ok:true },
    { label:'QR del local', ok:true }, { label:'Directorio público', ok:true },
    { label:'Cupones de descuento', ok:false }, { label:'Días bonus ×2', ok:false },
    { label:'WhatsApp automático', ok:false }, { label:'Reactivar inactivos', ok:false },
  ]},
  { name:'Starter', price:'$25.000', period:'/mes', popular:true, features:[
    { label:'Hasta 60 clientes', ok:true }, { label:'Premios ilimitados', ok:true },
    { label:'QR del local', ok:true }, { label:'Directorio público', ok:true },
    { label:'Cupones de descuento', ok:true }, { label:'Días bonus ×2', ok:true },
    { label:'WhatsApp automático', ok:false }, { label:'Reactivar inactivos', ok:false },
  ]},
  { name:'Pro', price:'$45.000', period:'/mes', popular:false, features:[
    { label:'Clientes ilimitados', ok:true }, { label:'Premios ilimitados', ok:true },
    { label:'QR del local', ok:true }, { label:'Directorio público', ok:true },
    { label:'Cupones de descuento', ok:true }, { label:'Días bonus ×2', ok:true },
    { label:'WhatsApp automático', ok:true }, { label:'Reactivar inactivos', ok:true },
  ]},
]

// ─── Benefit icons ────────────────────────────────────────────────────────────
const BENEFIT_ICONS = {
  star:           <IconStar size={22} stroke={1.5} color={V3} />,
  ticket:         <IconTicket size={22} stroke={1.5} color={V3} />,
  bolt:           <IconBolt size={22} stroke={1.5} color={V3} />,
  'message-circle': <IconMessageCircle size={22} stroke={1.5} color={V3} />,
  coin:           <IconCoin size={22} stroke={1.5} color={V3} />,
  calendar:       <IconCalendar size={22} stroke={1.5} color={V3} />,
  pill:           <IconPill size={22} stroke={1.5} color={V3} />,
}

// ─── App benefits ─────────────────────────────────────────────────────────────
const APP_FEATURES = [
  { icon:<IconQrcode size={24} stroke={1.5} color={V3} />,  title:'QR instantáneo',        desc:'Tu club tiene un QR único. Lo imprimís y lo ponés en el mostrador.' },
  { icon:<IconUsers size={24} stroke={1.5} color={V3} />,   title:'Panel de clientes',      desc:'Ves quién vino, cuándo y cuánto acumula cada uno.' },
  { icon:<IconStar size={24} stroke={1.5} color={V3} />,    title:'Estrellas o puntos',     desc:'Elegís el sistema que mejor funciona para tu negocio.' },
  { icon:<IconBell size={24} stroke={1.5} color={V3} />,    title:'Notificaciones push',    desc:'Tus clientes reciben avisos cuando canjearon o acumularon.' },
  { icon:<IconRobot size={24} stroke={1.5} color={V3} />,   title:'Soporte con IA',         desc:'Asistente disponible 24/7 dentro de la app.' },
  { icon:<IconMapPin size={24} stroke={1.5} color={V3} />,  title:'Directorio público',     desc:'Tu local aparece en el directorio de Clufix para que te descubran.' },
]

// ─── Rubro icons ──────────────────────────────────────────────────────────────
const RUBRO_ICON_MAP = {
  scissors:          <IconScissors size={28} stroke={1.5} color="#fff" />,
  pill:              <IconPill size={28} stroke={1.5} color="#fff" />,
  hanger:            <IconHanger size={28} stroke={1.5} color="#fff" />,
  'tools-kitchen-2': <IconToolsKitchen2 size={28} stroke={1.5} color="#fff" />,
  barbell:           <IconBarbell size={28} stroke={1.5} color="#fff" />,
  'building-store':  <IconBuildingStore size={28} stroke={1.5} color="#fff" />,
}

// ─── RubroPage ────────────────────────────────────────────────────────────────
export default function RubroPage({ rubro, slug }) {
  const [mobile, setMobile] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= 560)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const px = 'clamp(16px,5vw,48px)'
  const py = '80px'
  const otros = rubroList.filter(r => r.slug !== slug)

  return (
    <div style={{ fontFamily:FN, overflowX:'hidden' }}>
      <Nav />

      {/* ── 2. Hero ─────────────────────────────────────────────────────── */}
      <section style={{ background:V1, padding:`80px ${px}`, textAlign:'center', color:'#fff' }}>
        <FadeIn>
          <div style={{ display:'inline-block', background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:100, padding:'8px 20px', fontSize:'0.9rem', fontWeight:600, marginBottom:28 }}>
            {rubro.pill}
          </div>
          <h1 style={{ fontFamily:FM, fontSize:'clamp(2.8rem,8vw,5rem)', fontWeight:400, letterSpacing:'0px', textTransform:'uppercase', lineHeight:1.05, margin:'0 0 24px', maxWidth:680, marginLeft:'auto', marginRight:'auto', whiteSpace:'pre-line' }}>
            {rubro.heroTitle}
          </h1>
          <p style={{ fontSize:'clamp(0.95rem,2vw,1.1rem)', color:'rgba(255,255,255,0.68)', maxWidth:500, margin:'0 auto 36px', lineHeight:1.65 }}>
            {rubro.heroSub}
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/" style={btnPk}>Crear mi club gratis</Link>
            <a href="#como-funciona" style={btnGhost}>Ver cómo funciona</a>
          </div>
        </FadeIn>
      </section>

      {/* ── 3. Flujo 3 pasos ─────────────────────────────────────────────── */}
      <section id="como-funciona" style={{ background:'#fff', padding:`${py} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <span style={{ ...label, color:V3 }}>Cómo funciona</span>
          <h2 style={{ ...h2style, color:V1 }}>Tres pasos, y tu club está funcionando.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap:24, maxWidth:960, margin:'0 auto' }}>
          {rubro.flujo.map((paso, i) => (
            <FadeIn key={i} delay={i * 80}
              style={{ background:V4, borderRadius:20, padding:'32px 24px' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:V3, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.9rem', marginBottom:16, fontFamily:FN }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3 style={{ margin:'0 0 12px', color:V1, fontSize:'1.05rem', fontWeight:400, fontFamily:FM, textTransform:'uppercase' }}>{paso.titulo}</h3>
              <p style={{ margin:0, color:'rgba(26,0,80,0.65)', lineHeight:1.65, fontSize:'0.9rem' }}>{paso.desc}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 4. Kit físico (placeholder) ──────────────────────────────────── */}
      <section style={{ background:V4, padding:`${py} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:40 }}>
          <span style={{ ...label, color:V3 }}>El kit físico</span>
          <h2 style={{ ...h2style, color:V1 }}>Lo imprimís, lo ponés.<br />Tu club está en el mostrador.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap:20, maxWidth:800, margin:'0 auto' }}>
          {['Display para el mostrador', 'Calco para la puerta'].map((item, i) => (
            <FadeIn key={i} delay={i * 80}
              style={{ background:'rgba(111,48,223,0.08)', border:'1.5px dashed rgba(111,48,223,0.3)', borderRadius:20, padding:'48px 24px', textAlign:'center', color:V1 }}>
              <p style={{ margin:0, fontWeight:600, fontSize:'0.95rem', fontFamily:FN }}>{item}</p>
              <p style={{ margin:'8px 0 0', fontSize:'0.8rem', color:'rgba(26,0,80,0.45)', fontFamily:FN }}>Disponible al activar el plan</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 5. Mockup celular (placeholder) ──────────────────────────────── */}
      <section style={{ background:V1, padding:`${py} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:40 }}>
          <span style={label}>La app</span>
          <h2 style={{ ...h2style, color:'#fff' }}>Todo desde el celular.<br />Sin descargar nada.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr 1fr', gap:16, maxWidth:900, margin:'0 auto' }}>
          {['Tarjeta del cliente', 'Historial de visitas', 'Canje de premios'].map((screen, i) => (
            <FadeIn key={i} delay={i * 80}
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'40px 20px', textAlign:'center' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>{['📱','📊','🎁'][i]}</div>
              <p style={{ margin:0, color:'rgba(255,255,255,0.8)', fontWeight:600, fontSize:'0.9rem', fontFamily:FN }}>{screen}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 6. Beneficios de la app ───────────────────────────────────────── */}
      <section style={{ background:'#fff', padding:`${py} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <span style={{ ...label, color:V3 }}>La plataforma</span>
          <h2 style={{ ...h2style, color:V1 }}>Todo lo que necesitás para fidelizar.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap:20, maxWidth:960, margin:'0 auto' }}>
          {APP_FEATURES.map((f, i) => (
            <FadeIn key={i} delay={i * 60}
              style={{ background:V4, borderRadius:16, padding:'24px 22px', display:'flex', gap:16, alignItems:'flex-start' }}>
              <div style={{ flexShrink:0, marginTop:2 }}>{f.icon}</div>
              <div>
                <p style={{ margin:'0 0 6px', fontWeight:700, color:V1, fontSize:'0.95rem', fontFamily:FN }}>{f.title}</p>
                <p style={{ margin:0, color:'rgba(26,0,80,0.60)', fontSize:'0.85rem', lineHeight:1.6 }}>{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 7. Beneficios del rubro ───────────────────────────────────────── */}
      <section style={{ background:V4, padding:`${py} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <span style={{ ...label, color:V3 }}>Para {rubro.nombre.toLowerCase()}</span>
          <h2 style={{ ...h2style, color:V1 }}>Ideas que funcionan en tu rubro.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap:20, maxWidth:800, margin:'0 auto' }}>
          {rubro.beneficiosRubro.map((b, i) => (
            <FadeIn key={i} delay={i * 60}
              style={{ background:'#fff', borderRadius:16, padding:'24px 22px', display:'flex', gap:16, alignItems:'flex-start', border:'1px solid #e8dff8' }}>
              <div style={{ flexShrink:0, marginTop:2 }}>{BENEFIT_ICONS[b.icono] || <IconStar size={22} stroke={1.5} color={V3} />}</div>
              <div>
                <p style={{ margin:'0 0 6px', fontWeight:700, color:V1, fontSize:'0.95rem', fontFamily:FN }}>{b.titulo}</p>
                <p style={{ margin:0, color:'rgba(26,0,80,0.60)', fontSize:'0.85rem', lineHeight:1.6 }}>{b.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 8. Directorio ─────────────────────────────────────────────────── */}
      <section style={{ background:V1, padding:`${py} ${px}` }}>
        <FadeIn style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap:48, maxWidth:960, margin:'0 auto', alignItems:'center' }}>
          <div>
            <span style={label}>Directorio Clufix</span>
            <h2 style={{ ...h2style, color:'#fff', marginBottom:20 }}>
              Tu local en el directorio.<br />Nuevos clientes te encuentran.
            </h2>
            <p style={{ color:'rgba(255,255,255,0.65)', lineHeight:1.7, maxWidth:400 }}>
              Todos los comercios con club activo aparecen en el directorio público de Clufix. Los usuarios pueden encontrarte, sumarse a tu club y acumular desde el primer día.
            </p>
          </div>
          <div style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'28px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:V3, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {RUBRO_ICON_MAP[rubro.icono]}
              </div>
              <div>
                <p style={{ margin:0, fontWeight:700, color:'#fff', fontSize:'0.95rem', fontFamily:FN }}>Tu {rubro.nombre}</p>
                <p style={{ margin:0, color:'rgba(255,255,255,0.45)', fontSize:'0.78rem', fontFamily:FN }}>General Pico, La Pampa</p>
              </div>
            </div>
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.82rem', fontFamily:FN }}>Club activo</span>
              <div style={{ background:PK, color:'#fff', borderRadius:100, padding:'4px 12px', fontSize:'0.75rem', fontWeight:700, fontFamily:FN }}>Sumarme</div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── 9. Testimonios (placeholders) ────────────────────────────────── */}
      <section style={{ background:V2, padding:`${py} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <span style={label}>Lo que dicen</span>
          <h2 style={{ ...h2style, color:'#fff' }}>Comercios que ya usan Clufix.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap:20, maxWidth:1100, margin:'0 auto' }}>
          {TESTIMONIOS_GENERIC.map((t, i) => (
            <FadeIn key={i} delay={i * 80}
              style={{ background:'rgba(255,255,255,0.08)', borderRadius:20, padding:'28px 24px', border:'1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ margin:'0 0 24px', color:'rgba(255,255,255,0.8)', lineHeight:1.7, fontStyle:'italic', fontSize:'0.95rem' }}>"{t.quote}"</p>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:PK, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:'0.9rem', flexShrink:0 }}>
                  {t.initials}
                </div>
                <div>
                  <p style={{ margin:0, fontWeight:700, color:'#fff', fontSize:'0.88rem', fontFamily:FN }}>{t.name}</p>
                  <p style={{ margin:0, color:'rgba(255,255,255,0.45)', fontSize:'0.8rem', fontFamily:FN }}>{t.role}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 10. Planes ────────────────────────────────────────────────────── */}
      <section style={{ background:V4, padding:`${py} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <span style={{ ...label, color:V3 }}>Precios</span>
          <h2 style={{ ...h2style, color:V1 }}>Empezá gratis, crecé cuando estés listo.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap:20, maxWidth:960, margin:'0 auto' }}>
          {PLANS.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 80}
              style={{ background:'#fff', borderRadius:20, border: plan.popular ? `2px solid ${V3}` : '1.5px solid #e8dff8', padding:'32px 28px', position:'relative', display:'flex', flexDirection:'column' }}>
              {plan.popular && (
                <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:V3, color:'#fff', fontSize:'0.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', padding:'5px 14px', borderRadius:100 }}>
                  Más popular
                </div>
              )}
              <p style={{ margin:'0 0 4px', fontWeight:700, fontSize:'1rem', color:V1, fontFamily:FN }}>{plan.name}</p>
              <p style={{ margin:'0 0 20px' }}>
                <span style={{ fontSize:'2rem', fontWeight:900, color:V1, letterSpacing:'-2px', fontFamily:FN }}>{plan.price}</span>
                <span style={{ color:'rgba(26,0,80,0.5)', fontSize:'0.85rem' }}>{plan.period}</span>
              </p>
              <div style={{ borderTop:'1px solid #f0eaff', flex:1 }}>
                {plan.features.map(f => (
                  <div key={f.label} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #f9f6ff' }}>
                    {f.ok ? <IconCheck size={16} stroke={2.5} color={V3} /> : <IconX size={16} stroke={2.5} color='rgba(26,0,80,0.2)' />}
                    <span style={{ fontSize:'0.88rem', color: f.ok ? V1 : 'rgba(26,0,80,0.35)', fontFamily:FN }}>{f.label}</span>
                  </div>
                ))}
              </div>
              <Link href="/" style={{ ...btnPk, width:'100%', textAlign:'center', marginTop:20, display:'block', boxSizing:'border-box' }}>
                Empezar
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 11. FAQs ─────────────────────────────────────────────────────── */}
      <section style={{ background:'#fff', padding:`${py} ${px}` }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <span style={{ ...label, color:V3 }}>Preguntas frecuentes</span>
          <h2 style={{ ...h2style, color:V1 }}>Dudas comunes sobre Clufix.</h2>
        </FadeIn>
        <div style={{ maxWidth:680, margin:'0 auto' }}>
          {rubro.faqs.map((faq, i) => (
            <FadeIn key={i} delay={i * 40}>
              <div style={{ borderBottom:'1px solid #f0eaff' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 0', background:'none', border:'none', cursor:'pointer', textAlign:'left', gap:16 }}>
                  <span style={{ fontWeight:600, color:V1, fontSize:'0.95rem', fontFamily:FN }}>{faq.q}</span>
                  <IconChevronDown size={18} stroke={2} color={V3}
                    style={{ flexShrink:0, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.25s' }} />
                </button>
                {openFaq === i && (
                  <p style={{ margin:'0 0 20px', color:'rgba(26,0,80,0.65)', lineHeight:1.7, fontSize:'0.92rem', fontFamily:FN }}>
                    {faq.a}
                  </p>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── 12. CTA final ────────────────────────────────────────────────── */}
      <section style={{ background:V3, padding:`${py} ${px}`, textAlign:'center', color:'#fff' }}>
        <FadeIn>
          <h2 style={{ ...h2style, color:'#fff', marginBottom:28 }}>
            <span style={{ color:PK }}>{rubro.ctaTitle.split(' ').slice(0, 3).join(' ')}</span>
            {' '}{rubro.ctaTitle.split(' ').slice(3).join(' ')}
          </h2>
          <Link href="/" style={btnPk}>Crear mi club gratis</Link>
          <p style={{ marginTop:20, color:'rgba(255,255,255,0.5)', fontSize:'0.85rem', fontFamily:FN }}>
            Plan Free para siempre · Sin permanencia · Sin hardware
          </p>
        </FadeIn>
      </section>

      {/* ── 13. Otros rubros ─────────────────────────────────────────────── */}
      <section style={{ background:V4, padding:`48px ${px}`, textAlign:'center' }}>
        <FadeIn>
          <p style={{ marginBottom:20, color:'rgba(26,0,80,0.55)', fontSize:'0.85rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'2px', fontFamily:FN }}>
            Ver otros rubros
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center' }}>
            {otros.map(r => (
              <Link key={r.slug} href={`/rubros/${r.slug}`}
                style={{ background:'#fff', color:V1, border:'1.5px solid #e8dff8', borderRadius:100, padding:'0.55rem 1.2rem', fontSize:'0.88rem', fontWeight:600, textDecoration:'none', fontFamily:FN, display:'inline-flex', alignItems:'center', gap:6 }}>
                {r.emoji} {r.label}
              </Link>
            ))}
          </div>
        </FadeIn>
      </section>

      <Footer />
    </div>
  )
}

// ─── Static data ──────────────────────────────────────────────────────────────
const TESTIMONIOS_GENERIC = [
  { quote:'Antes usaba tarjetitas de cartón que se perdían siempre. Ahora el cliente escanea y listo.', initials:'MG', name:'Marcela G.', role:'Farmacia · General Pico' },
  { quote:'Activé los miércoles con puntos dobles y ese día se convirtió en el más movido de la semana.', initials:'SC', name:'Silvia C.', role:'Peluquería · La Pampa' },
  { quote:'El cliente puede ver sus puntos desde el celular. Me preguntan menos y vienen más seguido.', initials:'RL', name:'Roberto L.', role:'Local de ropa · La Pampa' },
]
