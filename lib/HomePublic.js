'use client'
// ─────────────────────────────────────────────────────────────────────────────
// HomePublic — landing pública de clufix.com.ar
// Restyling jul 2026: sistema claro (crema + violeta acción + magenta acento),
// tipografía Instrument Sans/Serif, hero estilo Homie (celular + scroll),
// estética Optimus (grid lines, noise, radius chico, eyebrows mono).
// Tokens en app/globals.css bajo el prefijo --lx-.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  IconScissors, IconPill, IconHanger, IconToolsKitchen2,
  IconBarbell, IconBuildingStore,
  IconUsersGroup, IconBroadcast, IconMapPin, IconBell, IconRobot,
  IconCheck, IconCrown, IconPercentage, IconMessages, IconFlame,
  IconBrandGoogle, IconGift, IconQrcode, IconScan, IconStar,
  IconChartBar, IconBrandWhatsapp, IconArrowRight,
} from '@tabler/icons-react'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BG     = 'var(--lx-bg)'
const SURF   = 'var(--lx-surface)'
const TINT   = 'var(--lx-tint)'
const DARK   = 'var(--lx-dark)'
const INK    = 'var(--lx-ink)'
const INK2   = 'var(--lx-ink-2)'
const INK3   = 'var(--lx-ink-3)'
const LINE   = 'var(--lx-line)'
const VIOLET = 'var(--lx-violet)'
const VDEEP  = 'var(--lx-violet-deep)'
const PINK   = 'var(--lx-pink)'
const CREAM  = 'var(--lx-cream)'
const CREAM2 = 'var(--lx-cream-2)'
const CREAM3 = 'var(--lx-cream-3)'
const LINED  = 'var(--lx-line-dark)'
const SANS   = 'var(--lx-sans)'
const SERIF  = 'var(--lx-serif)'
const MONO   = 'var(--lx-mono)'
// Tipografía de títulos "vieja" (pre-Fable5), la misma que sigue usando
// lib/RubroPage.js (FM = 'Tilt Warp'). Solo para h1/h2/h3 reales — los
// números decorativos (stats, precio, KPIs) siguen en SERIF (Bricolage).
const TITLE  = "'Tilt Warp', sans-serif"
const R      = 'var(--lx-radius)'

const WA_URL = 'https://wa.me/5492302351158?text=' + encodeURIComponent('Hola! Quiero saber más sobre Clufix para mi comercio.')

// ─── Estilos base ─────────────────────────────────────────────────────────────
const btnPrimary = {
  display:'inline-flex', alignItems:'center', gap:8,
  background:VIOLET, color:'#fff', padding:'0.95rem 1.9rem', borderRadius:100,
  fontWeight:600, fontSize:'0.95rem', border:'none', cursor:'pointer',
  fontFamily:SANS, textDecoration:'none', transition:'background 0.2s ease',
}
const btnGhost = {
  display:'inline-flex', alignItems:'center', gap:8,
  background:'transparent', color:INK, padding:'0.95rem 1.9rem', borderRadius:100,
  fontWeight:500, fontSize:'0.95rem', border:`1.5px solid ${LINE}`, cursor:'pointer',
  fontFamily:SANS, textDecoration:'none',
}
const btnCream = {
  display:'inline-flex', alignItems:'center', gap:8,
  background:CREAM, color:'#1A0050', padding:'0.95rem 1.9rem', borderRadius:100,
  fontWeight:600, fontSize:'0.95rem', border:'none', cursor:'pointer',
  fontFamily:SANS, textDecoration:'none',
}
const h2serif = {
  fontFamily:TITLE, fontWeight:400, letterSpacing:'0px', textTransform:'uppercase',
  fontSize:'clamp(2rem, 4.6vw, 3.2rem)', lineHeight:1.1, margin:0, color:INK,
}

// Eyebrow mono con guión (Optimus)
function Eyebrow({ children, dark = false }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:12,
      fontFamily:MONO, fontSize:'0.78rem', fontWeight:400, letterSpacing:'0.06em',
      color: dark ? CREAM3 : INK3, marginBottom:18,
    }}>
      <span style={{ width:32, height:1, background: dark ? CREAM3 : INK3, display:'inline-block' }} />
      {children}
    </span>
  )
}

// ─── FadeIn (IntersectionObserver → clase lx-fade-up) ─────────────────────────
function FadeIn({ children, style, delay = 0 }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setOn(true); obs.disconnect() }
    }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={on ? 'lx-fade-up' : undefined}
      style={{ opacity: on ? undefined : 0, animationDelay:`${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

// ─── QR falso determinístico (SVG) ───────────────────────────────────────────
function FakeQR({ size = 108, color = '#17102A' }) {
  const N = 21
  const cell = size / N
  // PRNG determinístico (mulberry32) — mismo QR en SSR y cliente
  let s = 421
  const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const cells = []
  const inFinder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!inFinder(x, y) && rnd() > 0.52) cells.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell * 0.92} height={cell * 0.92} fill={color} />)
  }
  const finder = (fx, fy) => (
    <g key={`f${fx}${fy}`}>
      <rect x={fx * cell} y={fy * cell} width={cell * 7} height={cell * 7} fill="none" stroke={color} strokeWidth={cell * 0.9} />
      <rect x={(fx + 2) * cell} y={(fy + 2) * cell} width={cell * 3} height={cell * 3} fill={color} />
    </g>
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {cells}
      {finder(0, 0)}{finder(N - 7, 0)}{finder(0, N - 7)}
    </svg>
  )
}

// ─── Mockup del celular (vista cliente: wallet + ticket QR) ──────────────────
function PhoneMock({ width = 280 }) {
  const screenBg = '#120B26'
  return (
    <div style={{
      width, borderRadius:44, background:'#17102A', padding:10,
      boxShadow:'0 40px 90px rgba(23,16,42,0.45), 0 0 0 1px rgba(255,255,255,0.08) inset',
      flexShrink:0,
    }}>
      <div style={{ borderRadius:36, background:screenBg, overflow:'hidden', position:'relative' }}>
        {/* Notch */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10 }}>
          <div style={{ width:86, height:22, borderRadius:100, background:'#17102A' }} />
        </div>
        <div style={{ padding:'14px 16px 20px' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontFamily:SANS, fontWeight:600, fontSize:15, color:'#fff' }}>Mi billetera</span>
            <IconBell size={16} stroke={1.8} color="rgba(255,255,255,0.55)" />
          </div>
          {/* Wallet card */}
          <div style={{ borderRadius:16, background:`linear-gradient(135deg, ${'#6F30DF'}, ${'#3D0A9E'})`, padding:'14px 15px', marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:16 }}>
              <span style={{ fontFamily:SANS, fontWeight:600, fontSize:13.5, color:'#fff' }}>Café Aroma</span>
              <span style={{ fontFamily:MONO, fontSize:8.5, letterSpacing:'0.14em', color:'rgba(255,255,255,0.55)' }}>CLUFIX</span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:5, marginBottom:10 }}>
              <span style={{ fontFamily:SANS, fontWeight:700, fontSize:26, color:'#fff', letterSpacing:'-0.02em' }}>7</span>
              <IconStar size={14} stroke={0} fill="#FF199F" style={{ transform:'translateY(1px)' }} />
              <span style={{ fontFamily:SANS, fontSize:10.5, color:'rgba(255,255,255,0.65)', marginLeft:4 }}>estrellas</span>
            </div>
            <div style={{ height:5, borderRadius:99, background:'rgba(255,255,255,0.22)', overflow:'hidden', marginBottom:7 }}>
              <div style={{ height:'100%', width:'70%', borderRadius:99, background:'#FF199F', animation:'lx-progress 1.6s cubic-bezier(0.22,1,0.36,1) 1.2s both' }} />
            </div>
            <span style={{ fontFamily:SANS, fontSize:9.5, color:'rgba(255,255,255,0.75)' }}>Te faltan 3★ para tu Café gratis</span>
          </div>
          {/* Ticket troquelado con QR */}
          <div style={{ position:'relative' }}>
            <div style={{ background:'#fff', borderRadius:12, padding:'14px 14px 10px', textAlign:'center' }}>
              <div style={{ display:'flex', justifyContent:'center' }}><FakeQR size={104} /></div>
            </div>
            {/* Línea de troquel + muescas */}
            <div style={{ position:'relative', height:0 }}>
              <div style={{ position:'absolute', left:14, right:14, top:-1, borderTop:'2px dashed rgba(23,16,42,0.18)' }} />
              <div style={{ position:'absolute', left:-7, top:-8, width:16, height:16, borderRadius:'50%', background:screenBg }} />
              <div style={{ position:'absolute', right:-7, top:-8, width:16, height:16, borderRadius:'50%', background:screenBg }} />
            </div>
            <div style={{ background:'#fff', borderRadius:12, padding:'10px 14px 12px', textAlign:'center', marginTop:0 }}>
              <span style={{ display:'block', fontFamily:SANS, fontWeight:600, fontSize:12, color:'#17102A' }}>María González</span>
              <span style={{ display:'block', fontFamily:SANS, fontSize:9.5, color:'rgba(23,16,42,0.5)', marginTop:2 }}>Mostralo al momento de comprar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Mockup del panel comerciante ─────────────────────────────────────────────
function PanelMock() {
  const bars = [34, 52, 41, 66, 58, 82, 74]
  const rows = [
    { dot:'#6F30DF', text:'Lucía sumó 1 estrella',            time:'hace 2 min' },
    { dot:'#FF199F', text:'Marcos canjeó "Corte gratis"',      time:'hace 18 min' },
    { dot:'#6F30DF', text:'Sofía se sumó a tu club',           time:'hace 1 h' },
  ]
  return (
    <div style={{
      width:'100%', maxWidth:470, background:'#fff', borderRadius:12,
      border:`1px solid ${LINE}`, boxShadow:'0 24px 60px rgba(23,16,42,0.12)', overflow:'hidden',
    }}>
      {/* Barra de ventana */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:`1px solid ${LINE}` }}>
        <div style={{ display:'flex', gap:6 }}>
          {[0,1,2].map(i => <span key={i} style={{ width:9, height:9, borderRadius:'50%', background:'rgba(23,16,42,0.12)' }} />)}
        </div>
        <span style={{ fontFamily:MONO, fontSize:10, color:INK3 }}>clufix — Mi negocio</span>
      </div>
      <div style={{ padding:'16px 18px 18px' }}>
        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
          {[['Clientes','128'],['Visitas hoy','14'],['Canjes','32']].map(([l,v]) => (
            <div key={l} style={{ border:`1px solid ${LINE}`, borderRadius:8, padding:'10px 12px' }}>
              <span style={{ display:'block', fontFamily:MONO, fontSize:8.5, letterSpacing:'0.08em', color:INK3, textTransform:'uppercase', marginBottom:4 }}>{l}</span>
              <span style={{ fontFamily:SERIF, fontSize:24, color:INK, lineHeight:1 }}>{v}</span>
            </div>
          ))}
        </div>
        {/* Mini chart */}
        <div style={{ display:'flex', alignItems:'flex-end', gap:7, height:64, marginBottom:16, padding:'0 2px' }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex:1, height:`${h}%`, borderRadius:'3px 3px 0 0', background: i === 5 ? VIOLET : 'rgba(111,48,223,0.18)' }} />
          ))}
        </div>
        {/* Segmentos */}
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
          {['Nuevos','Frecuentes','VIP','Inactivos'].map((s, i) => (
            <span key={s} style={{
              fontFamily:SANS, fontSize:10.5, fontWeight:500, padding:'4px 10px', borderRadius:99,
              background: i === 1 ? VIOLET : 'transparent', color: i === 1 ? '#fff' : INK2,
              border: i === 1 ? '1px solid transparent' : `1px solid ${LINE}`,
            }}>{s}</span>
          ))}
        </div>
        {/* Actividad */}
        {rows.map((r, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderTop:`1px solid ${LINE}` }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:r.dot, flexShrink:0 }} />
            <span style={{ flex:1, fontFamily:SANS, fontSize:12, color:INK }}>{r.text}</span>
            <span style={{ fontFamily:MONO, fontSize:9.5, color:INK3 }}>{r.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ onLoginClick, onLogoClick, onGoPanel, user }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  // Sobre el hero violeta (top) el nav usa texto claro; al scrollear pasa a tinta.
  const link = { fontFamily:SANS, fontSize:'0.88rem', fontWeight:500, color: scrolled ? INK2 : 'rgba(255,255,255,0.88)', textDecoration:'none', transition:'color 0.25s ease' }
  const navBtn = { ...btnPrimary, padding:'0.6rem 1.3rem', fontSize:'0.88rem', ...(scrolled ? {} : { background:'#fff', color:VDEEP }) }
  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:100, height:68,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 clamp(16px,4vw,40px)',
      background: scrolled ? 'rgba(250,247,242,0.88)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? `1px solid ${LINE}` : '1px solid transparent',
      transition:'background 0.25s ease, border-color 0.25s ease',
    }}>
      {/* Sin chip violeta (jul 2026): el logo cambia de variante según el fondo
          real que tiene detrás — blanco sobre el hero oscuro (top), ink
          (#17102A) sobre el nav crema al scrollear. Mismo trazo, distinto .fil0. */}
      <button onClick={onLogoClick} style={{ background:'transparent', border:'none', padding:0, cursor:'pointer', display:'flex', alignItems:'center' }}>
        <img src={scrolled ? '/clufix_logo_ink.svg' : '/clufix_logo.svg'} alt="Clufix" style={{ height:26, width:'auto', display:'block', transition:'opacity 0.2s ease' }} />
      </button>
      <div style={{ display:'flex', alignItems:'center', gap:'clamp(14px,2.5vw,28px)' }}>
        <a href="#como-funciona" className="lx-nav-link" style={link}>Cómo funciona</a>
        <a href="#planes" className="lx-nav-link" style={link}>Planes</a>
        {user
          ? <button onClick={onGoPanel} style={navBtn}>Ir a mi panel</button>
          : <button onClick={onLoginClick} style={navBtn}>Empezar gratis</button>
        }
      </div>
      <style>{`@media (max-width: 620px) { .lx-nav-link { display: none !important; } }`}</style>
    </nav>
  )
}

// ─── Hero (mecánica Homie: media full-bleed que se achica al scroll) ──────────
const RUBRO_WORDS = ['peluquerías', 'farmacias', 'cafeterías', 'gimnasios', 'tiendas', 'veterinarias']

// URL del video de fondo del hero — PLACEHOLDER por ahora. Cuando tengas el
// clip definitivo poné acá el .mp4 (o adaptá con HLSVideoPlayer si es Mux).
// Mientras esté vacío se muestra el gradiente violeta de marca con noise.
const HERO_VIDEO_URL = ''

function Hero({ onLoginClick }) {
  const [wordIdx, setWordIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setWordIdx(i => (i + 1) % RUBRO_WORDS.length), 2600)
    return () => clearInterval(id)
  }, [])

  // Scroll suavizado con rAF (easing Homie)
  useEffect(() => {
    let raf, current = 0
    const onScroll = () => {
      const target = Math.min(window.scrollY / 420, 1)
      cancelAnimationFrame(raf)
      const step = () => {
        current += (target - current) * 0.1
        if (Math.abs(target - current) > 0.001) { setProgress(current); raf = requestAnimationFrame(step) }
        else setProgress(target)
      }
      step()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  const easeOutQuad  = t => t * (2 - t)
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3)
  // Mismos valores que Homie: el media pierde 15% de escala, gana 48px de
  // radius y baja de 100svh a ~62svh mientras el usuario scrollea.
  const mediaScale  = 1 - easeOutQuad(progress) * 0.15
  const mediaRadius = easeOutCubic(progress) * 48
  const mediaHeight = 100 - easeOutQuad(progress) * 37.5
  const word = RUBRO_WORDS[wordIdx]

  return (
    <section style={{ position:'relative', minHeight:'100svh', overflow:'hidden', background:BG, padding:'clamp(96px,14vh,150px) clamp(16px,5vw,48px) 0' }}>

      {/* ── Media full-bleed (video o gradiente placeholder) ── */}
      <div style={{ position:'absolute', inset:0, top:0 }}>
        <div className="lx-noise" style={{
          width:'100%', height:`${mediaHeight}svh`,
          transform:`scale(${mediaScale})`, borderRadius:mediaRadius,
          overflow:'hidden', willChange:'transform', position:'relative',
          background:'linear-gradient(160deg, #6F30DF 0%, #3D0A9E 52%, #1A0050 100%)',
        }}>
          {HERO_VIDEO_URL && (
            <video autoPlay loop muted playsInline src={HERO_VIDEO_URL}
              style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          )}
          {/* Overlay para garantizar contraste del texto sobre cualquier clip */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(26,0,80,0.30), rgba(26,0,80,0.06) 45%, rgba(26,0,80,0.30))', pointerEvents:'none' }} />
        </div>
      </div>

      {/* ── Wordmark gigante: cae y se apaga con el scroll (Homie) ── */}
      <div aria-hidden="true" style={{
        position:'absolute', left:0, right:0, bottom:0, height:'100%',
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        overflow:'hidden', pointerEvents:'none', zIndex:5,
        transform:`translateY(${progress * 150}px)`, opacity:1 - progress * 0.8,
        willChange:'transform, opacity',
      }}>
        <span style={{
          fontFamily:SERIF, fontWeight:800, color:'#fff',
          fontSize:'clamp(110px, 24vw, 300px)', lineHeight:0.74, letterSpacing:'-0.045em',
          userSelect:'none', textAlign:'center',
        }}>clufix</span>
      </div>

      {/* ── Contenido ── */}
      <div style={{ position:'relative', zIndex:10, maxWidth:1200, margin:'0 auto', textAlign:'center' }}>
        <FadeIn>
          <Eyebrow dark>Fidelización por QR para comercios</Eyebrow>
        </FadeIn>
        <FadeIn delay={80}>
          <h1 style={{
            fontFamily:TITLE, fontWeight:400, letterSpacing:'0px', textTransform:'uppercase',
            fontSize:'clamp(2.6rem, 8vw, 6rem)', lineHeight:1.02, margin:'0 auto 22px', maxWidth:920, color:'#fff',
          }}>
            La tarjeta de fidelidad,<br />
            <span style={{ color:PINK }}>sin tarjeta.</span>
          </h1>
        </FadeIn>
        <FadeIn delay={160}>
          <p style={{ fontFamily:SANS, fontSize:'clamp(1rem,2vw,1.15rem)', color:'rgba(255,255,255,0.82)', maxWidth:560, margin:'0 auto 10px', lineHeight:1.6 }}>
            Tus clientes escanean un QR, suman con cada compra y vuelven.
            Vos lo ves todo desde tu panel. Sin papel, sin apps que descargar.
          </p>
          <p style={{ fontFamily:MONO, fontSize:'0.82rem', color:'rgba(255,255,255,0.55)', margin:'0 0 30px' }}>
            hecha para{' '}
            <span key={word} style={{ color:PINK, display:'inline-block' }}>
              {word.split('').map((ch, i) => (
                <span key={`${word}-${i}`} className="lx-char-in" style={{ animationDelay:`${i * 40}ms` }}>{ch}</span>
              ))}
            </span>
          </p>
        </FadeIn>
        <FadeIn delay={240}>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:'clamp(30px,5vh,52px)' }}>
            <button onClick={onLoginClick} style={{ ...btnPrimary, background:'#fff', color:VDEEP }}>
              Crear mi club gratis <IconArrowRight size={17} stroke={2} />
            </button>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" style={{ ...btnGhost, color:'#fff', border:'1.5px solid rgba(255,255,255,0.35)' }}>
              <IconBrandWhatsapp size={17} stroke={1.8} /> Escribinos
            </a>
          </div>
        </FadeIn>

        {/* Celular: entra elevándose, por delante del wordmark (Homie) */}
        <div className="lx-rise" style={{ position:'relative', zIndex:10, display:'flex', justifyContent:'center' }}>
          <PhoneMock width={266} />
        </div>
      </div>
    </section>
  )
}

// ─── Marquee de stats (cierra el hero, sobre crema) ──────────────────────────
function StatsMarquee() {
  return (
    <div style={{ background:BG, padding:'clamp(40px,6vh,64px) 0 clamp(28px,4vh,44px)', overflow:'hidden',
      WebkitMaskImage:'linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)',
      maskImage:'linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)' }}>
      <div className="lx-marquee" style={{ display:'flex', width:'max-content', gap:64 }}>
        {[0,1].map(dup => (
          <div key={dup} style={{ display:'flex', gap:64, paddingRight:64 }}>
            {[
              ['+240', 'membresías activas'],
              ['+100', 'premios canjeados'],
              ['2 min', 'para crear tu club'],
              ['0', 'tarjetitas de cartón perdidas'],
              ['3 meses', 'de Pro gratis al registrarte'],
            ].map(([v, l]) => (
              <span key={`${dup}-${l}`} style={{ display:'inline-flex', alignItems:'baseline', gap:12, whiteSpace:'nowrap' }}>
                <span style={{ fontFamily:SERIF, fontWeight:600, fontSize:'clamp(1.7rem,3vw,2.4rem)', color:INK, letterSpacing:'-0.02em' }}>{v}</span>
                <span style={{ fontFamily:SANS, fontSize:'0.85rem', color:INK3 }}>{l}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sección: producto en pantalla ───────────────────────────────────────────
function ProductSection() {
  return (
    <section style={{ background:SURF, borderTop:`1px solid ${LINE}`, padding:'clamp(64px,10vh,110px) clamp(16px,5vw,48px)' }}>
      <div style={{ maxWidth:1140, margin:'0 auto' }}>
        <FadeIn>
          <Eyebrow>El producto</Eyebrow>
          <h2 style={{ ...h2serif, marginBottom:14 }}>
            Vos ves el negocio.<br />
            <span className="lx-grad-text">Tu cliente ve su premio.</span>
          </h2>
          <p style={{ fontFamily:SANS, fontSize:'1rem', color:INK2, maxWidth:520, lineHeight:1.65, margin:'0 0 56px' }}>
            Un panel con tus clientes, visitas y canjes en tiempo real.
            Y del otro lado, una billetera que le muestra a cada cliente
            cuánto le falta para su próximo premio.
          </p>
        </FadeIn>
        <div style={{ display:'flex', gap:'clamp(28px,5vw,64px)', alignItems:'flex-start', justifyContent:'center', flexWrap:'wrap' }}>
          <FadeIn delay={100} style={{ flex:'1 1 380px', maxWidth:470, display:'flex', flexDirection:'column', alignItems:'center', gap:18 }}>
            <PanelMock />
            <span style={{ fontFamily:MONO, fontSize:'0.78rem', color:INK3 }}>— el panel de tu comercio</span>
          </FadeIn>
          <FadeIn delay={220} style={{ flex:'0 1 300px', display:'flex', flexDirection:'column', alignItems:'center', gap:18 }}>
            <PhoneMock width={252} />
            <span style={{ fontFamily:MONO, fontSize:'0.78rem', color:INK3 }}>— lo que ve tu cliente</span>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ─── Sección: cómo funciona (comercio) ───────────────────────────────────────
const MERCHANT_STEPS = [
  {
    num:'I', icon:IconBrandGoogle,
    title:'Entrás con Google',
    desc:'Un click y tu cuenta está lista. Sin formularios eternos, sin tarjeta de crédito.',
  },
  {
    num:'II', icon:IconGift,
    title:'Armás tu club',
    desc:'Elegís si premiás por visita o por monto, cargás tus premios y activás descuentos. Todo desde un panel simple.',
  },
  {
    num:'III', icon:IconQrcode,
    title:'Mostrás tu QR y listo',
    desc:'Lo imprimís o lo mostrás en el mostrador. Tus clientes se suman solos y empiezan a acumular ese mismo día.',
  },
]

function HowItWorksSection() {
  return (
    <section id="como-funciona" style={{ background:BG, padding:'clamp(64px,10vh,110px) clamp(16px,5vw,48px)' }}>
      <div style={{ maxWidth:1140, margin:'0 auto' }}>
        <FadeIn>
          <Eyebrow>Cómo funciona</Eyebrow>
          <h2 style={{ ...h2serif, marginBottom:56 }}>
            Tu club, en tres pasos.
          </h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:0, borderTop:`1px solid ${LINE}` }}>
          {MERCHANT_STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <FadeIn key={s.num} delay={i * 120} style={{ padding:'32px clamp(4px,2vw,28px) 36px', borderBottom:`1px solid ${LINE}` }}>
                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:22 }}>
                  <span style={{ fontFamily:SERIF, fontSize:'2rem', color:INK3 }}>{s.num}</span>
                  <Icon size={40} stroke={1.1} color={VIOLET} />
                </div>
                <h3 style={{ fontFamily:TITLE, fontWeight:400, fontSize:'1.4rem', letterSpacing:'0px', textTransform:'uppercase', color:INK, margin:'0 0 10px' }}>{s.title}</h3>
                <p style={{ fontFamily:SANS, fontSize:'0.93rem', color:INK2, lineHeight:1.65, margin:0 }}>{s.desc}</p>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Sección: experiencia del cliente (strip compacto) ───────────────────────
const CLIENT_STEPS = [
  { icon:IconScan, title:'Escanea',  desc:'el QR de tu local y se suma en segundos' },
  { icon:IconStar, title:'Acumula',  desc:'estrellas o puntos con cada compra' },
  { icon:IconGift, title:'Canjea',   desc:'su premio cuando llega al objetivo' },
]

function ClientStripSection() {
  return (
    <section style={{ background:TINT, padding:'clamp(48px,7vh,72px) clamp(16px,5vw,48px)' }}>
      <div style={{ maxWidth:1140, margin:'0 auto', display:'flex', alignItems:'center', gap:'clamp(24px,4vw,56px)', flexWrap:'wrap' }}>
        <FadeIn style={{ flex:'1 1 260px' }}>
          <Eyebrow>¿Y tus clientes?</Eyebrow>
          <h2 style={{ ...h2serif, fontSize:'clamp(1.6rem,3vw,2.2rem)' }}>
            Nada que descargar.<br />Funciona desde el navegador.
          </h2>
        </FadeIn>
        <div style={{ flex:'2 1 480px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:14 }}>
          {CLIENT_STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <FadeIn key={s.title} delay={i * 100}>
                <div style={{ background:'rgba(255,255,255,0.7)', border:`1px solid ${LINE}`, borderRadius:R, padding:'20px 18px', height:'100%', boxSizing:'border-box' }}>
                  <Icon size={26} stroke={1.4} color={VIOLET} style={{ marginBottom:12 }} />
                  <p style={{ fontFamily:SANS, margin:0, fontSize:'0.92rem', color:INK, lineHeight:1.5 }}>
                    <strong style={{ fontWeight:600 }}>{s.title}</strong> {s.desc}
                  </p>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Sección: funcionalidades ─────────────────────────────────────────────────
const FEATURES = [
  { icon:IconUsersGroup, title:'Segmentación automática', sub:'Nuevos, frecuentes, VIP e inactivos — Clufix agrupa a tus clientes solo.' },
  { icon:IconBroadcast,  title:'WhatsApp semi-automático', sub:'Detecta el momento justo y te prepara el mensaje. Vos lo enviás con un tap.' },
  { icon:IconChartBar,   title:'Reportes exportables', sub:'Visitas, canjes y clientes en planillas listas para descargar.' },
  { icon:IconMapPin,     title:'Directorio público', sub:'Tu club aparece en el directorio de Clufix para sumar socios nuevos.' },
  { icon:IconBell,       title:'Notificaciones push', sub:'Tus clientes se enteran de cada promo, cupón y premio al instante.' },
  { icon:IconRobot,      title:'Soporte con IA', sub:'Respuestas al toque, 24/7, dentro de la app.' },
]

function FeaturesSection() {
  return (
    <section style={{ background:BG, padding:'clamp(64px,10vh,110px) clamp(16px,5vw,48px)' }}>
      <div style={{ maxWidth:1140, margin:'0 auto' }}>
        <FadeIn style={{ textAlign:'center', marginBottom:52 }}>
          <Eyebrow>Funcionalidades</Eyebrow>
          <h2 style={h2serif}>Todo lo que necesitás,<br /><span className="lx-grad-text">desde el día uno.</span></h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16 }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <FadeIn key={f.title} delay={i * 70}>
                <div className="lx-lift" style={{ background:SURF, border:`1px solid ${LINE}`, borderRadius:R, padding:'26px 24px', height:'100%', boxSizing:'border-box' }}>
                  <Icon size={28} stroke={1.4} color={VIOLET} style={{ marginBottom:16 }} />
                  <p style={{ margin:'0 0 6px', fontFamily:SANS, fontWeight:600, fontSize:'1rem', color:INK }}>{f.title}</p>
                  <p style={{ margin:0, fontFamily:SANS, fontSize:'0.9rem', color:INK2, lineHeight:1.6 }}>{f.sub}</p>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Sección: rubros ──────────────────────────────────────────────────────────
const RUBROS = [
  { slug:'peluquerias',  label:'Peluquerías',  icon:IconScissors },
  { slug:'farmacias',    label:'Farmacias',    icon:IconPill },
  { slug:'indumentaria', label:'Indumentaria', icon:IconHanger },
  { slug:'restaurantes', label:'Restaurantes', icon:IconToolsKitchen2 },
  { slug:'gimnasios',    label:'Gimnasios',    icon:IconBarbell },
  { slug:'jugeterias',   label:'Jugueterías',  icon:IconBuildingStore },
]

function RubrosSection() {
  return (
    <section id="rubros" style={{ background:SURF, borderTop:`1px solid ${LINE}`, borderBottom:`1px solid ${LINE}`, padding:'clamp(64px,10vh,110px) clamp(16px,5vw,48px)' }}>
      <div style={{ maxWidth:1140, margin:'0 auto' }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <Eyebrow>Clufix se adapta</Eyebrow>
          <h2 style={h2serif}>¿Cuál es tu negocio?</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14, maxWidth:900, margin:'0 auto' }}>
          {RUBROS.map((r, i) => {
            const Icon = r.icon
            return (
              <FadeIn key={r.slug} delay={i * 60}>
                <Link href={`/rubros/${r.slug}`} style={{ textDecoration:'none' }}>
                  <div className="lx-lift" style={{ background:BG, border:`1px solid ${LINE}`, borderRadius:R, padding:'26px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:12, cursor:'pointer' }}>
                    <Icon size={28} stroke={1.4} color={VIOLET} />
                    <span style={{ fontFamily:SANS, color:INK, fontWeight:500, fontSize:'0.92rem' }}>{r.label}</span>
                  </div>
                </Link>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Sección: oferta fundador (oscura) ────────────────────────────────────────
const FOUNDER_BENEFITS = [
  { icon:IconCrown,      label:'Clientes ilimitados' },
  { icon:IconPercentage, label:'Cupones de descuento' },
  { icon:IconMessages,   label:'WhatsApp semi-automático' },
  { icon:IconFlame,      label:'Días con puntos dobles' },
]

function FounderSection({ onLoginClick }) {
  return (
    <section className="lx-noise" style={{ background:DARK, padding:'clamp(72px,11vh,120px) clamp(16px,5vw,48px)', textAlign:'center', position:'relative' }}>
      <div style={{ position:'relative', zIndex:2, maxWidth:900, margin:'0 auto' }}>
        <FadeIn>
          <span style={{
            display:'inline-block', fontFamily:MONO, fontSize:'0.75rem', letterSpacing:'0.08em',
            color:CREAM, border:`1px solid ${LINED}`, borderRadius:100, padding:'7px 16px', marginBottom:28,
          }}>
            Período de lanzamiento — hasta el 31/08
          </span>
          <h2 style={{ fontFamily:TITLE, fontWeight:400, fontSize:'clamp(2.2rem,6vw,4rem)', lineHeight:1.05, margin:'0 0 18px', color:CREAM, letterSpacing:'0px', textTransform:'uppercase' }}>
            Tres meses Pro.<br />
            <span style={{ color:PINK }}>Cero pesos.</span>
          </h2>
          <p style={{ fontFamily:SANS, fontSize:'1rem', color:CREAM2, maxWidth:520, margin:'0 auto 44px', lineHeight:1.7 }}>
            Todos los comercios que se registren antes del 31 de agosto acceden
            al plan Pro sin costo. Sin tarjeta, sin letra chica.
          </p>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:12, maxWidth:800, margin:'0 auto 44px' }}>
          {FOUNDER_BENEFITS.map((b, i) => {
            const Icon = b.icon
            return (
              <FadeIn key={b.label} delay={i * 80}>
                <div style={{ border:`1px solid ${LINED}`, borderRadius:R, padding:'20px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                  <Icon size={24} stroke={1.4} color={CREAM} />
                  <span style={{ fontFamily:SANS, fontWeight:500, fontSize:'0.85rem', color:CREAM, lineHeight:1.35 }}>{b.label}</span>
                </div>
              </FadeIn>
            )
          })}
        </div>
        <FadeIn>
          <button onClick={onLoginClick} style={btnCream}>Quiero ser comercio fundador <IconArrowRight size={17} stroke={2} /></button>
          <p style={{ fontFamily:SANS, fontSize:'0.78rem', color:CREAM3, marginTop:16, marginBottom:0 }}>
            Disponible hasta el 31 de agosto de 2026 · Sin permanencia · Sin hardware
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Sección: planes ──────────────────────────────────────────────────────────
const PLANS = [
  {
    name:'Free', price:'$0', period:'/mes', popular:false, cta:'Crear mi club gratis',
    features:['Hasta 30 clientes', '2 premios activos', 'QR del local', 'Directorio público'],
    founder:['Cupones de descuento', 'Días bonus ×2', 'WhatsApp semi-automático', 'Clientes ilimitados'],
  },
  {
    name:'Starter', price:'$25.000', period:'/mes', popular:true, cta:'Empezar con Starter',
    features:['Hasta 60 clientes', 'Premios ilimitados', 'Cupones de descuento', 'Días bonus ×2', 'Soporte prioritario'],
    founder:['WhatsApp semi-automático', 'Reactivar inactivos', 'Clientes ilimitados'],
  },
  {
    name:'Pro', price:'$45.000', period:'/mes', popular:false, cta:'Empezar con Pro',
    features:['Clientes ilimitados', 'Premios ilimitados', 'Cupones de descuento', 'Días bonus ×2', 'WhatsApp semi-automático', 'Reactivar inactivos', 'Soporte prioritario'],
    founder:[],
  },
]

function PlansSection({ onLoginClick }) {
  return (
    <section id="planes" style={{ background:BG, padding:'clamp(64px,10vh,110px) clamp(16px,5vw,48px)' }}>
      <div style={{ maxWidth:1140, margin:'0 auto' }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <Eyebrow>Planes</Eyebrow>
          <h2 style={h2serif}>Empezá gratis,<br /><span className="lx-grad-text">crecé cuando estés listo.</span></h2>
          <p style={{ fontFamily:SANS, fontSize:'0.9rem', color:INK3, marginTop:14 }}>
            Hasta el 31/08, todos los planes incluyen el Pro completo. Gratis.
          </p>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:18, maxWidth:1020, margin:'0 auto' }}>
          {PLANS.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 90}>
              <div style={{
                background:SURF, borderRadius:12, position:'relative', height:'100%', boxSizing:'border-box',
                border: plan.popular ? `2px solid ${VIOLET}` : `1px solid ${LINE}`,
                padding:'28px 26px 30px', display:'flex', flexDirection:'column',
              }}>
                {plan.popular && (
                  <span style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:VIOLET, color:'#fff', fontFamily:MONO, fontSize:'0.68rem', letterSpacing:'0.1em', padding:'5px 14px', borderRadius:100, whiteSpace:'nowrap' }}>
                    MÁS ELEGIDO
                  </span>
                )}
                <p style={{ margin:'0 0 6px', fontFamily:MONO, fontSize:'0.78rem', letterSpacing:'0.08em', textTransform:'uppercase', color:INK3 }}>{plan.name}</p>
                <p style={{ margin:'0 0 20px' }}>
                  <span style={{ fontFamily:SERIF, fontWeight:600, fontSize:'2.4rem', color:INK, letterSpacing:'-0.03em' }}>{plan.price}</span>
                  <span style={{ fontFamily:SANS, color:INK3, fontSize:'0.85rem' }}>{plan.period}</span>
                </p>
                <div style={{ borderTop:`1px solid ${LINE}`, marginBottom:16, flex:1 }}>
                  {plan.features.map(feat => (
                    <div key={feat} style={{ padding:'9px 0', borderBottom:`1px solid ${LINE}`, display:'flex', alignItems:'center', gap:10 }}>
                      <IconCheck size={16} stroke={2.2} color={VIOLET} style={{ flexShrink:0 }} />
                      <span style={{ fontFamily:SANS, fontSize:'0.89rem', color:INK }}>{feat}</span>
                    </div>
                  ))}
                </div>
                {plan.founder.length > 0 && (
                  <div style={{ border:`1.5px dashed rgba(255,25,159,0.35)`, borderRadius:R, padding:'14px 15px', marginBottom:20 }}>
                    <span style={{ display:'block', fontFamily:MONO, fontSize:'0.66rem', letterSpacing:'0.1em', color:PINK, marginBottom:8 }}>
                      GRATIS HASTA EL 31/08
                    </span>
                    {plan.founder.map(feat => (
                      <div key={feat} style={{ padding:'4px 0', display:'flex', alignItems:'center', gap:8 }}>
                        <IconCheck size={14} stroke={2.2} color={PINK} style={{ flexShrink:0 }} />
                        <span style={{ fontFamily:SANS, fontSize:'0.84rem', color:INK2 }}>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={onLoginClick} style={{
                  ...btnPrimary, width:'100%', justifyContent:'center',
                  background: plan.popular ? VIOLET : INK,
                }}>
                  {plan.cta}
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn>
          <p style={{ textAlign:'center', fontFamily:SANS, fontSize:'0.8rem', color:INK3, marginTop:28 }}>
            Precios en pesos argentinos · Sin permanencia · Cancelás cuando quieras
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Sección: testimonios ─────────────────────────────────────────────────────
const TESTIMONIOS = [
  { quote:'Antes usaba tarjetitas de cartón que se perdían siempre. Ahora el cliente escanea y listo.', initials:'MG', name:'Marcela G.', role:'Farmacia · General Pico' },
  { quote:'Activé los miércoles con puntos dobles y ese día se convirtió en el más movido de la semana.', initials:'SC', name:'Silvia C.', role:'Peluquería · La Pampa' },
  { quote:'El cliente puede ver sus puntos desde el celular. Me preguntan menos y vienen más seguido.', initials:'RL', name:'Roberto L.', role:'Local de ropa · La Pampa' },
]

function TestimonialsSection() {
  return (
    <section style={{ background:SURF, borderTop:`1px solid ${LINE}`, padding:'clamp(64px,10vh,110px) clamp(16px,5vw,48px)' }}>
      <div style={{ maxWidth:1140, margin:'0 auto' }}>
        <FadeIn style={{ textAlign:'center', marginBottom:48 }}>
          <Eyebrow>Lo que dicen</Eyebrow>
          <h2 style={h2serif}>Comercios que ya usan Clufix.</h2>
        </FadeIn>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16 }}>
          {TESTIMONIOS.map((t, i) => (
            <FadeIn key={t.initials} delay={i * 90}>
              <div style={{ background:BG, border:`1px solid ${LINE}`, borderRadius:R, padding:'28px 26px', height:'100%', boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
                <span aria-hidden="true" style={{ fontFamily:SERIF, fontSize:'2.6rem', lineHeight:0.6, color:PINK, display:'block', marginBottom:14 }}>&ldquo;</span>
                <p style={{ margin:'0 0 24px', fontFamily:SANS, fontStyle:'italic', color:INK, lineHeight:1.7, fontSize:'0.97rem', flex:1 }}>
                  {t.quote}
                </p>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:TINT, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:600, color:VDEEP, fontSize:'0.85rem', flexShrink:0 }}>
                    {t.initials}
                  </div>
                  <div>
                    <p style={{ margin:0, fontFamily:SANS, fontWeight:600, color:INK, fontSize:'0.88rem' }}>{t.name}</p>
                    <p style={{ margin:0, fontFamily:SANS, color:INK3, fontSize:'0.8rem' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA final + Footer (oscuros, continuos) ──────────────────────────────────
function FinalCTASection({ onLoginClick }) {
  return (
    <section className="lx-noise" style={{ background:DARK, padding:'clamp(88px,14vh,150px) clamp(16px,5vw,48px) clamp(72px,10vh,110px)', textAlign:'center', position:'relative' }}>
      <div style={{ position:'relative', zIndex:2 }}>
        <FadeIn>
          <h2 style={{ fontFamily:TITLE, fontWeight:400, fontSize:'clamp(2.4rem,7vw,4.4rem)', color:CREAM, letterSpacing:'0px', textTransform:'uppercase', margin:'0 0 16px', lineHeight:1.05 }}>
            Tu club <span style={{ color:PINK }}>te espera.</span>
          </h2>
          <p style={{ fontFamily:SANS, fontSize:'1rem', color:CREAM2, margin:'0 0 36px' }}>
            Empezá gratis hoy. Sin tarjeta, sin hardware, sin complicaciones.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={onLoginClick} style={btnCream}>Crear mi club gratis <IconArrowRight size={17} stroke={2} /></button>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" style={{ ...btnGhost, color:CREAM, border:`1.5px solid ${LINED}` }}>
              <IconBrandWhatsapp size={17} stroke={1.8} /> Hablar con una persona
            </a>
          </div>
          <p style={{ fontFamily:SANS, fontSize:'0.78rem', color:CREAM3, marginTop:18, marginBottom:0 }}>
            Plan Free para siempre · Sin permanencia · Sin hardware
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

function Footer() {
  const col = { display:'flex', flexDirection:'column', gap:10 }
  const flink = { fontFamily:SANS, fontSize:'0.86rem', color:CREAM2, textDecoration:'none' }
  const ftitle = { fontFamily:MONO, fontSize:'0.7rem', letterSpacing:'0.12em', textTransform:'uppercase', color:CREAM3, marginBottom:4 }
  return (
    <footer style={{ background:DARK, borderTop:`1px solid ${LINED}`, padding:'clamp(40px,6vh,64px) clamp(16px,5vw,48px) 28px' }}>
      <div style={{ maxWidth:1140, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'36px 24px', marginBottom:44 }}>
          <div style={{ ...col, gap:14 }}>
            <img src="/clufix_logo.svg" alt="Clufix" style={{ height:36, width:'auto', display:'block' }} />
            <p style={{ margin:0, fontFamily:SANS, fontSize:'0.86rem', color:CREAM2, lineHeight:1.6, maxWidth:260 }}>
              Tu club de beneficios. Fidelización por QR para comercios de verdad.
            </p>
          </div>
          <div style={col}>
            <span style={ftitle}>Producto</span>
            <a href="#como-funciona" style={flink}>Cómo funciona</a>
            <a href="#planes" style={flink}>Planes</a>
            <a href="#rubros" style={flink}>Rubros</a>
            <Link href="/demo" style={flink}>Ver demo</Link>
          </div>
          <div style={col}>
            <span style={ftitle}>Ayuda</span>
            <Link href="/ayuda" style={flink}>Centro de ayuda</Link>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" style={{ ...flink, display:'inline-flex', alignItems:'center', gap:7 }}>
              <IconBrandWhatsapp size={15} stroke={1.8} /> WhatsApp
            </a>
          </div>
          <div style={col}>
            <span style={ftitle}>Legal</span>
            <Link href="/terminos" style={flink}>Términos y condiciones</Link>
            <Link href="/privacidad" style={flink}>Política de privacidad</Link>
          </div>
        </div>
        <div style={{ borderTop:`1px solid ${LINED}`, paddingTop:22, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <span style={{ fontFamily:SANS, fontSize:'0.76rem', color:CREAM3 }}>© 2026 Clufix · clufix.com.ar</span>
          <span style={{ fontFamily:MONO, fontSize:'0.72rem', color:CREAM3 }}>Hecho en La Pampa, Argentina</span>
        </div>
      </div>
    </footer>
  )
}

// ─── HomePublic ───────────────────────────────────────────────────────────────
export default function HomePublic({ onLoginClick, onLogoClick, onGoPanel, user }) {
  return (
    <div style={{ fontFamily:SANS, background:BG, overflowX:'hidden', isolation:'isolate' }}>
      <Nav onLoginClick={onLoginClick} onLogoClick={onLogoClick} onGoPanel={onGoPanel} user={user} />
      <Hero onLoginClick={onLoginClick} />
      <StatsMarquee />
      <ProductSection />
      <HowItWorksSection />
      <ClientStripSection />
      <FeaturesSection />
      <RubrosSection />
      <FounderSection onLoginClick={onLoginClick} />
      <PlansSection onLoginClick={onLoginClick} />
      <TestimonialsSection />
      <FinalCTASection onLoginClick={onLoginClick} />
      <Footer />
    </div>
  )
}
