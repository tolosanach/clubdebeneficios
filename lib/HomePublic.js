'use client'
// ─────────────────────────────────────────────────────────────────────────────
// HomePublic — landing pública de clufix.com.ar
// Restyling oct 2026: mismo lenguaje visual que los comerciales en motion
// (HyperFrames). Placas de color plano por sección (naranja / violeta profundo /
// fucsia / violeta), títulos Archivo extra condensado black tono-sobre-tono con
// una línea resaltada, microtextos DM Mono en las esquinas, stickers torcidos,
// la mano de Vale con el celular y objetos de plastilina (assets en
// /public/landing). Animaciones en app/globals.css con prefijo cx-.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  IconScissors, IconPill, IconHanger, IconToolsKitchen2,
  IconBarbell, IconBuildingStore,
  IconUsersGroup, IconBroadcast, IconMapPin, IconBell, IconRobot,
  IconCheck, IconCrown, IconPercentage, IconMessages, IconFlame,
  IconChartBar, IconBrandWhatsapp, IconArrowRight, IconScan, IconStar, IconGift,
  IconVolume, IconVolumeOff,
} from '@tabler/icons-react'

// ─── Tokens (paleta de los comerciales) ───────────────────────────────────────
const ORA   = '#FE5000', ORA_T = '#A93100', ORA_M = '#7A2200'
const DEEP  = '#2A140D', DEEP_T = '#8F311C', DEEP_M = '#D68978'
const MAG   = '#F0603A', MAG_T = '#AA250E', MAG_M = '#801C0A'
const VIO   = '#E03E1B', VIO_T = '#C43D1F', VIO_M = '#FCD4CB'
const GOLD  = '#FFC83D'
const LAV   = '#FFEDE6'
const WA    = '#25D366'
const INK   = '#271B13'
const DISPLAY = "'Archivo', 'Arial Narrow', sans-serif"   // usar con fontStretch 62%
const MONO  = "'DM Mono', 'JetBrains Mono', monospace"
const SANS  = "'Inter', system-ui, sans-serif"

const LOGIN_URL = '/api/auth/google'   // mismo destino que handleLogin de la app
const WA_URL = 'https://wa.me/5492302351158?text=' + encodeURIComponent('Hola! Quiero saber más sobre Clufix para mi comercio.')

// ─── Estilos base ─────────────────────────────────────────────────────────────
const bigType = {
  fontFamily: DISPLAY, fontStretch: '62%', fontWeight: 900, textTransform: 'uppercase',
  lineHeight: 0.86, letterSpacing: '-0.012em', margin: 0,
}
const btn = {
  display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999,
  padding: '1rem 1.8rem', fontFamily: SANS, fontWeight: 800, fontSize: '1rem',
  border: 'none', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
}
const sec = { position: 'relative', overflow: 'hidden', padding: 'clamp(72px,11vh,130px) clamp(18px,5.5vw,80px)' }
const wrap = { position: 'relative', zIndex: 2, maxWidth: 1280, margin: '0 auto' }

// Botón de acción: si hay handler (home) es <button>; si no (páginas de rubro) va directo al login con Google.
function Act({ onClick, style, children }) {
  return onClick
    ? <button onClick={onClick} style={style}>{children}</button>
    : <a href={LOGIN_URL} style={style}>{children}</a>
}

// ─── Reveal on scroll ─────────────────────────────────────────────────────────
function useInView(threshold = 0.18) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, on]
}

function FadeIn({ children, style, delay = 0, className = '' }) {
  const [ref, on] = useInView(0.12)
  return (
    <div ref={ref} className={`${on ? 'cx-fade-up' : ''} ${className}`} style={{ opacity: on ? undefined : 0, animationDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

// Título póster: cada línea entra letra por letra subiendo con rebote (como en los videos).
// lines: [{ text, color }]
function Poster({ lines, size, as: Tag = 'h2', style }) {
  const [ref, on] = useInView(0.2)
  let k = 0
  return (
    <Tag ref={ref} style={{ ...bigType, fontSize: size, ...style }}>
      {lines.map((l, li) => (
        <span key={li} style={{ display: 'block', overflow: 'hidden', paddingTop: '0.08em', color: l.color }}>
          {l.text.split(' ').map((word, wi, arr) => (
            <span key={wi}>
              <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                {word.split('').map((ch, ci) => {
                  const d = (k++) * 22
                  return (
                    <span key={ci} className={on ? 'cx-char' : ''} style={{ display: 'inline-block', transform: on ? undefined : 'translateY(110%)', animationDelay: `${d}ms` }}>{ch}</span>
                  )
                })}
              </span>
              {wi < arr.length - 1 ? ' ' : null}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  )
}

// Microtextos mono en las esquinas de cada placa
function Corners({ left, right, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontFamily: MONO, fontWeight: 500, fontSize: '0.78rem', letterSpacing: '0.16em', textTransform: 'uppercase', color, marginBottom: 'clamp(20px,3vh,32px)' }}>
      <span>{left}</span><span className="cx-hide-sm">{right}</span>
    </div>
  )
}

// Sticker torcido que se pega con rebote
function Sticker({ children, bg, color, rot = -6, size = 'clamp(1.6rem,3.4vw,3rem)', style, delay = 300 }) {
  const [ref, on] = useInView(0.3)
  return (
    <span ref={ref} className={on ? 'cx-sticker' : ''} style={{
      position: 'absolute', zIndex: 6, display: 'inline-block', background: bg, color,
      fontFamily: DISPLAY, fontStretch: '62%', fontWeight: 900, textTransform: 'uppercase', fontSize: size,
      lineHeight: 1, padding: '0.32em 0.75em 0.18em', borderRadius: 999, whiteSpace: 'nowrap',
      boxShadow: '0 18px 40px rgba(41,28,19,0.32)', '--r': `${rot}deg`, opacity: on ? undefined : 0,
      transform: `rotate(${rot}deg)`, animationDelay: `${delay}ms`, ...style,
    }}>{children}</span>
  )
}

// Cartelito que va rotando entre características. Es decorativo (aria-hidden):
// el texto del hero ya dice "Sin papel, sin apps que descargar". Con
// prefers-reduced-motion no rota y queda fijo en la primera frase.
const STICKER_PHRASES = ['Sin papel', 'Sin descargar apps', 'Premios por compra', 'Todo en tu panel', 'Gratis para empezar', 'Con solo un QR']
function RotatingSticker({ phrases = STICKER_PHRASES, every = 2800, ...props }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => { if (!document.hidden) setI(n => (n + 1) % phrases.length) }, every)
    return () => clearInterval(id)
  }, [phrases.length, every])
  return (
    <Sticker {...props}>
      <span key={i} aria-hidden="true" className="cx-sticker-swap" style={{ display: 'inline-block' }}>{phrases[i]}</span>
    </Sticker>
  )
}

// Objeto de plastilina flotando
function Clay({ src, width, style, rot = 0, delay = 0, alt = '', className = '' }) {
  return (
    <img src={src} alt={alt} aria-hidden={alt ? undefined : 'true'} className={`cx-float ${className}`} loading="lazy" style={{
      position: 'absolute', zIndex: 5, width, height: 'auto', pointerEvents: 'none',
      filter: 'drop-shadow(0 26px 30px rgba(41,28,19,0.35))', '--r': `${rot}deg`, animationDelay: `${delay}ms`, ...style,
    }} />
  )
}

// ─── QR falso determinístico ──────────────────────────────────────────────────
function FakeQR({ size = 108, color = INK }) {
  const N = 21, cell = size / N
  let s = 421
  const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const cells = []
  const inFinder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!inFinder(x, y) && rnd() > 0.52) cells.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell * 0.94} height={cell * 0.94} fill={color} />)
  }
  const finder = (fx, fy) => (
    <g key={`f${fx}${fy}`}>
      <rect x={fx * cell + cell * 0.45} y={fy * cell + cell * 0.45} width={cell * 6.1} height={cell * 6.1} fill="none" stroke={color} strokeWidth={cell * 0.9} />
      <rect x={(fx + 2) * cell} y={(fy + 2) * cell} width={cell * 3} height={cell * 3} fill={color} />
    </g>
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {cells}{finder(0, 0)}{finder(N - 7, 0)}{finder(0, N - 7)}
    </svg>
  )
}

// ─── Pantalla de la billetera (se diseña a 300px de ancho y se escala) ────────
function WalletScreen() {
  return (
    <div style={{ width: 300, height: 652, background: '#F7F3FF', color: DEEP, fontFamily: SANS, padding: '44px 18px 0', boxSizing: 'border-box' }}>
      <div style={{ fontWeight: 800, fontSize: 21, marginBottom: 14 }}>Mi billetera</div>
      <div style={{ borderRadius: 20, background: `linear-gradient(135deg, ${VIO}, #8F2A12)`, color: '#fff', padding: '16px 18px 18px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Café Aroma</span>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', opacity: 0.75 }}>CLUFIX</span>
        </div>
        <div style={{ fontFamily: DISPLAY, fontStretch: '62%', fontWeight: 900, fontSize: 92, lineHeight: 0.95, marginTop: 10 }}>7<span style={{ fontSize: 34 }}> ★</span></div>
        <div style={{ height: 6, borderRadius: 9, background: 'rgba(255,255,255,0.22)', margin: '8px 0 8px', overflow: 'hidden' }}>
          <div className="cx-progress" style={{ height: '100%', width: '70%', background: GOLD, borderRadius: 9 }} />
        </div>
        <div style={{ fontSize: 12, color: '#FFE1D6' }}>Te faltan 3★ para tu café gratis</div>
      </div>
      <div style={{ display: 'flex', gap: 6, margin: '14px 4px 0' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <IconStar key={i} size={21} stroke={0} fill={i < 7 ? GOLD : '#F7E3DE'} />
        ))}
      </div>
      <div style={{ margin: '18px auto 0', width: 168, background: '#fff', borderRadius: 16, padding: 14, boxShadow: '0 8px 24px rgba(42,20,13,0.12)' }}>
        <FakeQR size={140} />
      </div>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, marginTop: 12 }}>María González</div>
      <div style={{ textAlign: 'center', color: '#A89A8C', fontSize: 11.5, marginTop: 2 }}>Mostralo al momento de comprar</div>
    </div>
  )
}

// ─── Mano de Vale sosteniendo el celular ──────────────────────────────────────
// La pantalla va DETRÁS de la foto recortada (los dedos quedan por delante).
// Medidas relativas al PNG de la mano (pantalla: x 34.15%, y 20.3%, w 31.64%, h 51.4%).
function HandPhone({ width, style, sway = true, mirror = false }) {
  const ref = useRef(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale((el.offsetWidth * 0.3164) / 300)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className={sway ? 'cx-sway' : ''} style={{ position: 'absolute', width, aspectRatio: '1100 / 1473', zIndex: 3, transformOrigin: '50% 100%', ...style }}>
      <div style={{ position: 'absolute', left: mirror ? '34.21%' : '34.15%', top: '20.3%', width: '31.64%', height: '51.4%', borderRadius: '13% / 6%', overflow: 'hidden', background: '#F7F3FF' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}><WalletScreen /></div>
        <div aria-hidden="true" className="cx-glare" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      </div>
      <img src="/landing/mano.webp" alt="Mano sosteniendo un celular con la billetera de Clufix" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2, transform: mirror ? 'scaleX(-1)' : undefined }} />
    </div>
  )
}

// ─── Panel del comercio (card) ────────────────────────────────────────────────
function PanelCard({ style }) {
  const rows = [
    ['Lucía', 'sumó 1 estrella', 'hace 2 min', VIO],
    ['Marcos', 'canjeó "Corte gratis"', 'hace 18 min', MAG],
    ['Sofía', 'se sumó a tu club', 'hace 1 h', VIO],
  ]
  return (
    <div style={{ background: '#fff', color: DEEP, borderRadius: 26, padding: 'clamp(20px,2.4vw,32px)', boxShadow: '0 40px 80px rgba(54,38,26,0.32)', fontFamily: SANS, ...style }}>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A89A8C' }}>clufix — Mi negocio</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
        {[['Clientes', '128', true], ['Visitas hoy', '14'], ['Canjes', '32']].map(([l, v, hi]) => (
          <div key={l} style={{ background: hi ? VIO : LAV, color: hi ? '#fff' : DEEP, borderRadius: 16, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</div>
            <div style={{ ...bigType, fontSize: 'clamp(2.6rem,4vw,3.6rem)', marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '16px 0 6px' }}>
        {['Nuevos', 'Frecuentes', 'VIP', 'Inactivos'].map((s, i) => (
          <span key={s} style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 99, background: i === 1 ? DEEP : 'transparent', color: i === 1 ? '#fff' : '#8C7564', border: i === 1 ? 'none' : '1px solid #F7E3DE' }}>{s}</span>
        ))}
      </div>
      {rows.map(([n, t, time, c]) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #FFEDE6', fontSize: 14.5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
          <span style={{ flex: 1 }}><b>{n}</b> {t}</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: '#A89A8C' }}>{time}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ onLoginClick, onLogoClick, onGoPanel, user, linkPrefix = '', navColor, navMuted }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const link = { fontFamily: MONO, fontWeight: 500, fontSize: '0.8rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: scrolled ? '#FFC0AA' : (navMuted || ORA_M), textDecoration: 'none', transition: 'color .25s' }
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 72,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(18px,5.5vw,80px)',
      background: scrolled ? DEEP : 'transparent', boxShadow: scrolled ? '0 10px 30px rgba(27,19,13,0.25)' : 'none',
      backdropFilter: scrolled ? 'blur(14px)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
      transition: 'background .25s ease',
    }}>
      {onLogoClick
        ? <button onClick={onLogoClick} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
            <img src="/clufix_logo.svg" alt="Clufix" style={{ height: 34, width: 'auto', display: 'block' }} />
          </button>
        : <Link href="/" style={{ display: 'flex' }}><img src="/clufix_logo.svg" alt="Clufix" style={{ height: 34, width: 'auto', display: 'block' }} /></Link>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px,2.6vw,36px)' }}>
        <a href="#como-funciona" className="cx-hide-sm" style={link}>Cómo funciona</a>
        <a href={`${linkPrefix}#rubros`} className="cx-hide-sm" style={link}>Rubros</a>
        <a href="#planes" className="cx-hide-sm" style={link}>Planes</a>
        {user
          ? <button onClick={onGoPanel} style={{ ...btn, padding: '0.65rem 1.3rem', fontSize: '0.9rem', background: '#fff', color: scrolled ? DEEP : ORA }}>Ir a mi panel</button>
          : <Act onClick={onLoginClick} style={{ ...btn, padding: '0.65rem 1.3rem', fontSize: '0.9rem', background: '#fff', color: scrolled ? DEEP : (navColor || ORA) }}>Empezar gratis</Act>}
      </div>
    </nav>
  )
}

// ─── Hero (placa naranja) ─────────────────────────────────────────────────────
const RUBRO_WORDS = ['peluquerías', 'farmacias', 'cafeterías', 'gimnasios', 'tiendas', 'veterinarias']

function Hero({ onLoginClick }) {
  const [wordIdx, setWordIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setWordIdx(i => (i + 1) % RUBRO_WORDS.length), 2600)
    return () => clearInterval(id)
  }, [])
  const word = RUBRO_WORDS[wordIdx]
  return (
    <section className="cx-grain" style={{ ...sec, background: ORA, minHeight: '100svh', paddingTop: 'clamp(110px,15vh,150px)', paddingBottom: 'clamp(60px,9vh,100px)' }}>
      <div aria-hidden="true" className="cx-ring" style={{ width: '110vw', height: '110vw', left: '-60vw', top: '-50vw' }} />
      <div style={wrap}>
        <Corners left="N°01 — Fidelización por QR para comercios" right="Hecho en La Pampa" color={ORA_M} />
        <div className="cx-hero-grid">
          <div className="cx-hero-text" style={{ position: 'relative', zIndex: 4 }}>
            <Poster as="h1" size="clamp(3.4rem, 8vw, 7.8rem)" lines={[
              { text: 'La tarjeta', color: ORA_T },
              { text: 'de fidelidad,', color: ORA_T },
              { text: 'sin tarjeta.', color: '#fff' },
            ]} />
            <FadeIn delay={500}>
              <p style={{ fontFamily: SANS, fontSize: 'clamp(1.05rem,1.6vw,1.25rem)', lineHeight: 1.55, color: '#FFE3D2', maxWidth: 540, margin: 'clamp(22px,3.5vh,34px) 0 10px' }}>
                Tus clientes escanean un QR, suman con cada compra y vuelven. Vos lo ves todo desde tu panel. Sin papel, sin apps que descargar.
              </p>
              <p style={{ fontFamily: MONO, fontSize: '0.85rem', letterSpacing: '0.08em', color: ORA_M, margin: '0 0 28px' }}>
                HECHA PARA{' '}
                <span key={word} style={{ color: '#fff', display: 'inline-block' }}>
                  {word.toUpperCase().split('').map((ch, i) => <span key={i} className="cx-char" style={{ display: 'inline-block', animationDelay: `${i * 35}ms` }}>{ch}</span>)}
                </span>
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={onLoginClick} style={{ ...btn, background: DEEP, color: '#fff' }}>Crear mi club gratis <IconArrowRight size={18} stroke={2.2} /></button>
                <a href={WA_URL} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: 'transparent', color: '#fff', border: '2px solid #fff' }}>
                  <IconBrandWhatsapp size={18} stroke={1.9} /> Escribinos
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
      <div className="cx-hero-hand">
        <HandPhone width="100%" mirror style={{ left: 0, top: 0 }} />
        <Clay src="/landing/star_tilt.webp" width="19%" rot={-12} style={{ left: '17%', top: '13%', zIndex: 4 }} />
        <RotatingSticker bg={MAG} color="#fff" rot={-7} size="clamp(2rem,4.2vw,4.2rem)" style={{ left: '17%', top: '62%' }} delay={900} />
      </div>
    </section>
  )
}

// ─── Franja de números (violeta profundo) ────────────────────────────────────
// ─── Video explicativo (violeta profundo) ────────────────────────────────────
// Horizontal en escritorio, vertical en celular. Arranca muteado al entrar en
// pantalla (con subtítulos quemados), se pausa al salir, y con un toque se
// activa el sonido desde el principio.
const EXPLAINER = {
  wide: { src: '/landing/video/clufix-explicativo-16x9', poster: '/landing/video/clufix-explicativo-16x9.jpg', ratio: '16 / 9' },
  tall: { src: '/landing/video/clufix-explicativo-9x16', poster: '/landing/video/clufix-explicativo-9x16.jpg', ratio: '9 / 16' },
}

function ExplainerVideoSection() {
  const videoRef = useRef(null)
  const boxRef = useRef(null)
  const [tall, setTall] = useState(false)
  const [muted, setMuted] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)')
    const apply = () => setTall(mq.matches)
    apply(); setReady(true)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const v = videoRef.current, box = boxRef.current
    if (!v || !box) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { v.play().catch(() => {}) } else { v.pause() }
    }, { threshold: 0.45 })
    obs.observe(box)
    return () => obs.disconnect()
  }, [tall, ready])

  const toggleSound = () => {
    const v = videoRef.current
    if (!v) return
    if (muted) { v.currentTime = 0; v.muted = false; setMuted(false); v.play().catch(() => {}) }
    else { v.muted = true; setMuted(true) }
  }

  const cfg = tall ? EXPLAINER.tall : EXPLAINER.wide
  return (
    <section id="video" className="cx-grain" style={{ ...sec, background: DEEP, paddingTop: 'clamp(64px,9vh,110px)', paddingBottom: 'clamp(64px,9vh,110px)' }}>
      <div style={wrap}>
        <Corners left="Clufix en 25 segundos" right="Para comercios y clientes" color={DEEP_M} />
        <FadeIn>
          <div ref={boxRef} style={{ position: 'relative', margin: '0 auto', width: tall ? 'min(100%, 420px)' : '100%', maxWidth: 1100, aspectRatio: cfg.ratio, borderRadius: 'clamp(20px,2.4vw,34px)', overflow: 'hidden', background: '#000', boxShadow: '0 40px 90px rgba(0,0,0,0.45)' }}>
            {ready && (
              <video
                key={cfg.src}
                ref={videoRef}
                poster={cfg.poster}
                muted={muted}
                playsInline
                loop
                preload="metadata"
                onClick={toggleSound}
                aria-label="Video: qué es Clufix, en 25 segundos"
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', cursor: 'pointer' }}
              >
                <source src={`${cfg.src}.webm`} type="video/webm" />
                <source src={`${cfg.src}.mp4`} type="video/mp4" />
              </video>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
            <button onClick={toggleSound} aria-pressed={!muted}
              style={{ ...btn, padding: '0.8rem 1.4rem', fontSize: '0.95rem', background: muted ? GOLD : 'transparent', color: muted ? DEEP : '#fff', border: muted ? 'none' : '2px solid rgba(255,255,255,0.4)' }}>
              {muted ? <IconVolume size={18} stroke={2.2} /> : <IconVolumeOff size={18} stroke={2.2} />}
              {muted ? 'Escuchalo con sonido' : 'Silenciar'}
            </button>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

function StatsMarquee() {
  const items = [['+240', 'membresías'], ['+100', 'premios canjeados'], ['2 min', 'para crear tu club'], ['0', 'tarjetitas perdidas'], ['3 meses', 'de Pro gratis']]
  return (
    <div style={{ background: DEEP, padding: '26px 0', overflow: 'hidden' }}>
      <div className="lx-marquee" style={{ display: 'flex', width: 'max-content' }}>
        {[0, 1].map(dup => (
          <div key={dup} style={{ display: 'flex', alignItems: 'center' }}>
            {items.map(([v, l], i) => (
              <span key={`${dup}-${l}`} style={{ ...bigType, fontSize: 'clamp(2.4rem,4.6vw,4.2rem)', display: 'inline-flex', alignItems: 'center', gap: '0.35em', paddingRight: '0.6em', whiteSpace: 'nowrap', color: DEEP_T }}>
                <span style={{ color: '#fff' }}>{v}</span> {l}
                <span style={{ color: i % 2 ? MAG : GOLD, paddingLeft: '0.35em' }}>★</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Producto (placa fucsia) ──────────────────────────────────────────────────
function ProductSection() {
  return (
    <section className="cx-grain" style={{ ...sec, background: MAG }}>
      <div style={wrap}>
        <Corners left="02 — El producto" right="Panel + billetera" color={MAG_M} />
        <div className="cx-split">
          <div>
            <Poster size="clamp(3.4rem,9vw,8.6rem)" lines={[
              { text: 'Vos ves', color: MAG_T }, { text: 'el negocio.', color: MAG_T },
              { text: 'Tu cliente', color: '#fff' }, { text: 've su premio.', color: '#fff' },
            ]} />
            <FadeIn delay={400}>
              <p style={{ fontFamily: SANS, fontSize: 'clamp(1rem,1.4vw,1.15rem)', lineHeight: 1.6, color: '#D5F5EF', maxWidth: 520, margin: '26px 0 0' }}>
                Un panel con tus clientes, visitas y canjes en tiempo real. Y del otro lado, una billetera que le muestra a cada cliente cuánto le falta para su próximo premio.
              </p>
            </FadeIn>
          </div>
          <div style={{ position: 'relative', minHeight: 420 }}>
            <FadeIn delay={200}><PanelCard style={{ transform: 'rotate(2deg)' }} /></FadeIn>
            <Clay src="/landing/regalo.webp" width="clamp(120px,15vw,210px)" rot={-10} style={{ left: '-16%', bottom: '-20%' }} />
            <Sticker bg="#fff" color={MAG} rot={-5} style={{ right: '2%', bottom: '-2%' }} delay={700}>En tiempo real</Sticker>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Cómo funciona (placa violeta) ────────────────────────────────────────────
const MERCHANT_STEPS = [
  { n: '01', a: 'Entrás con', b: 'Google', desc: 'Un click y tu cuenta está lista. Sin formularios eternos, sin tarjeta de crédito.' },
  { n: '02', a: 'Armás', b: 'tu club', desc: 'Elegís si premiás por visita o por monto, cargás tus premios y activás descuentos. Todo desde un panel simple.' },
  { n: '03', a: 'Mostrás tu', b: 'QR y listo', desc: 'Lo imprimís o lo mostrás en el mostrador. Tus clientes se suman solos y empiezan a acumular ese mismo día.' },
]

function HowItWorksSection() {
  return (
    <section id="como-funciona" className="cx-grain" style={{ ...sec, background: VIO }}>
      <Clay src="/landing/star_front.webp" width="clamp(110px,13vw,190px)" rot={-14} style={{ right: '5%', top: '7%' }} />
      <div style={wrap}>
        <Corners left="03 — Cómo funciona" right="Tu club, en tres pasos" color={VIO_M} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'clamp(28px,4vw,48px)' }}>
          {MERCHANT_STEPS.map((s, i) => (
            <FadeIn key={s.n} delay={i * 140}>
              <div style={{ ...bigType, fontSize: 'clamp(9rem,17vw,15rem)', color: VIO_T, lineHeight: 0.8 }}>{s.n}</div>
              <h3 style={{ ...bigType, fontSize: 'clamp(2.4rem,4vw,3.6rem)', color: '#fff', marginTop: '-0.35em' }}>
                {s.a}<br /><span style={{ color: GOLD }}>{s.b}</span>
              </h3>
              <p style={{ fontFamily: SANS, fontSize: '1.02rem', lineHeight: 1.6, color: '#FFE1D6', margin: '14px 0 0', maxWidth: 380 }}>{s.desc}</p>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── ¿Y tus clientes? (violeta profundo, compacto) ───────────────────────────
const CLIENT_STEPS = [
  { icon: IconScan, title: 'Escanea', desc: 'el QR de tu local y se suma en segundos', c: MAG },
  { icon: IconStar, title: 'Acumula', desc: 'estrellas o puntos con cada compra', c: GOLD },
  { icon: IconGift, title: 'Canjea', desc: 'su premio cuando llega al objetivo', c: WA },
]

function ClientStripSection() {
  return (
    <section className="cx-grain" style={{ ...sec, background: DEEP, paddingTop: 'clamp(56px,8vh,90px)', paddingBottom: 'clamp(56px,8vh,90px)' }}>
      <div style={wrap}>
        <Corners left="¿Y tus clientes?" right="Sin apps" color={DEEP_M} />
        <div className="cx-split" style={{ alignItems: 'center' }}>
          <Poster size="clamp(2.8rem,6.4vw,6rem)" lines={[{ text: 'Nada que', color: DEEP_T }, { text: 'descargar.', color: DEEP_T }, { text: 'Funciona en', color: '#fff' }, { text: 'el navegador.', color: '#fff' }]} />
          <div style={{ display: 'grid', gap: 12 }}>
            {CLIENT_STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <FadeIn key={s.title} delay={i * 110}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 22, padding: '18px 22px' }}>
                    <span style={{ width: 54, height: 54, borderRadius: 16, background: s.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={28} stroke={2} color={DEEP} />
                    </span>
                    <p style={{ margin: 0, fontFamily: SANS, fontSize: '1.05rem', color: '#FFE1D6', lineHeight: 1.45 }}>
                      <span style={{ ...bigType, fontSize: '1.9rem', color: '#fff', marginRight: 8 }}>{s.title}</span>{s.desc}
                    </p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Funcionalidades (violeta profundo) ──────────────────────────────────────
const FEATURES = [
  { img: '/landing/burbuja.webp', a: 'WhatsApp', b: 'semi-automático', c: WA, sub: 'Detecta el momento justo y te prepara el mensaje. Vos lo enviás con un tap.' },
  { img: '/landing/cupon.webp', a: 'Cupones', b: 'que vencen', c: MAG, sub: 'Descuentos con fecha para que tu cliente tenga un motivo para volver.' },
  { img: '/landing/regalo.webp', a: 'Premios', b: 'y canjes', c: GOLD, sub: 'Tu cliente ve su premio y lo canjea desde el celular cuando llega al objetivo.' },
  { icon: IconUsersGroup, a: 'Segmentación', b: 'automática', c: '#FFA588', sub: 'Nuevos, frecuentes, VIP e inactivos — Clufix agrupa a tus clientes solo.' },
  { icon: IconChartBar, a: 'Reportes', b: 'exportables', c: '#FFA588', sub: 'Visitas, canjes y clientes en planillas listas para descargar.' },
  { icon: IconMapPin, a: 'Directorio', b: 'público', c: '#FFA588', sub: 'Tu club aparece en el directorio de Clufix para sumar socios nuevos.' },
  { icon: IconBell, a: 'Notificaciones', b: 'push', c: '#FFA588', sub: 'Tus clientes se enteran de cada promo, cupón y premio al instante.' },
  { icon: IconBroadcast, a: 'Reactivar', b: 'inactivos', c: '#FFA588', sub: 'Te avisa quién dejó de venir para que lo invites a volver.' },
  { icon: IconRobot, a: 'Soporte', b: 'con IA', c: '#FFA588', sub: 'Respuestas al toque, 24/7, dentro de la app.' },
]

function FeaturesSection() {
  return (
    <section className="cx-grain" style={{ ...sec, background: DEEP, paddingTop: 0 }}>
      <div style={wrap}>
        <Corners left="04 — Funcionalidades" right="Desde el día uno" color={DEEP_M} />
        <Poster size="clamp(3.4rem,9vw,8.4rem)" lines={[{ text: 'Todo lo que', color: DEEP_T }, { text: 'necesitás.', color: '#fff' }]} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 'clamp(40px,6vh,64px)' }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <FadeIn key={f.a} delay={(i % 3) * 90}>
                <div className="cx-card" style={{ position: 'relative', height: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 26, padding: '26px 26px 28px', minHeight: 250 }}>
                  <div style={{ height: 96, position: 'relative' }}>
                    {f.img
                      ? <img src={f.img} alt="" aria-hidden="true" loading="lazy" className="cx-float" style={{ height: 104, width: 'auto', maxWidth: 130, objectFit: 'contain', position: 'absolute', left: -4, top: -12, filter: 'drop-shadow(0 18px 22px rgba(0,0,0,0.35))', '--r': '-6deg' }} />
                      : <span style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(250,171,153,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={34} stroke={1.6} color={f.c} /></span>}
                  </div>
                  <h3 style={{ ...bigType, fontSize: 'clamp(2rem,2.8vw,2.6rem)', color: '#fff' }}>{f.a}<br /><span style={{ color: f.c }}>{f.b}</span></h3>
                  <p style={{ fontFamily: SANS, fontSize: '0.98rem', lineHeight: 1.55, color: '#FFC0AA', margin: '12px 0 0' }}>{f.sub}</p>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Rubros (placa violeta) ───────────────────────────────────────────────────
const RUBROS = [
  { slug: 'peluquerias', label: 'Peluquerías', icon: IconScissors },
  { slug: 'farmacias', label: 'Farmacias', icon: IconPill },
  { slug: 'indumentaria', label: 'Indumentaria', icon: IconHanger },
  { slug: 'restaurantes', label: 'Restaurantes', icon: IconToolsKitchen2 },
  { slug: 'gimnasios', label: 'Gimnasios', icon: IconBarbell },
  { slug: 'jugeterias', label: 'Jugueterías', icon: IconBuildingStore },
]

function RubrosSection() {
  return (
    <section id="rubros" className="cx-grain" style={{ ...sec, background: VIO }}>
      <div style={wrap}>
        <Corners left="05 — Clufix se adapta" right="Elegí tu rubro" color={VIO_M} />
        <Poster size="clamp(3.4rem,9vw,8.4rem)" lines={[{ text: '¿Cuál es', color: VIO_T }, { text: 'tu negocio?', color: '#fff' }]} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginTop: 'clamp(36px,5vh,56px)' }}>
          {RUBROS.map((r, i) => {
            const Icon = r.icon
            return (
              <FadeIn key={r.slug} delay={i * 60}>
                <Link href={`/rubros/${r.slug}`} className="cx-rubro" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#fff', color: DEEP, borderRadius: 999, padding: '16px 22px 14px' }}>
                  <span style={{ ...bigType, fontSize: '1.9rem' }}>{r.label}</span>
                  <Icon size={24} stroke={1.8} color={VIO} />
                </Link>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Oferta fundador (placa fucsia) ───────────────────────────────────────────
const FOUNDER_BENEFITS = [
  { icon: IconCrown, label: 'Clientes ilimitados' },
  { icon: IconPercentage, label: 'Cupones de descuento' },
  { icon: IconMessages, label: 'WhatsApp semi-automático' },
  { icon: IconFlame, label: 'Días con puntos dobles' },
]

function FounderSection({ onLoginClick }) {
  return (
    <section className="cx-grain" style={{ ...sec, background: MAG }}>
      <div style={wrap}>
        <Corners left="Período de lanzamiento — hasta el 30/11" right="Comercios fundadores" color={MAG_M} />
        <div className="cx-split" style={{ alignItems: 'end' }}>
          <div style={{ position: 'relative' }}>
            <Poster size="clamp(3.6rem,10vw,9.6rem)" lines={[{ text: 'Tres meses', color: MAG_T }, { text: 'Pro.', color: MAG_T }, { text: 'Cero pesos.', color: '#fff' }]} />
            <Clay src="/landing/star_squash.webp" width="clamp(110px,12vw,180px)" rot={10} style={{ right: '4%', top: '-6%' }} />
          </div>
          <FadeIn delay={300}>
            <p style={{ fontFamily: SANS, fontSize: '1.08rem', lineHeight: 1.6, color: '#D5F5EF', margin: '0 0 22px' }}>
              Todos los comercios que se registren antes del 30 de noviembre acceden al plan Pro sin costo. Sin tarjeta, sin letra chica.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 26 }}>
              {FOUNDER_BENEFITS.map(b => {
                const Icon = b.icon
                return (
                  <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.16)', borderRadius: 16, padding: '12px 14px', color: '#fff', fontFamily: SANS, fontWeight: 700, fontSize: '0.92rem' }}>
                    <Icon size={20} stroke={2} /> {b.label}
                  </div>
                )
              })}
            </div>
            <button onClick={onLoginClick} style={{ ...btn, background: DEEP, color: '#fff' }}>Quiero ser comercio fundador <IconArrowRight size={18} stroke={2.2} /></button>
            <p style={{ fontFamily: MONO, fontSize: '0.75rem', letterSpacing: '0.08em', color: MAG_M, marginTop: 16 }}>
              DISPONIBLE HASTA EL 30 DE NOVIEMBRE DE 2026 · SIN PERMANENCIA · SIN HARDWARE
            </p>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ─── Planes (placa naranja) ───────────────────────────────────────────────────
const PLANS = [
  { name: 'Free', price: '$0', cta: 'Crear mi club gratis', features: ['Hasta 30 clientes', '2 premios activos', 'QR del local', 'Directorio público'], founder: ['Cupones de descuento', 'Días bonus ×2', 'WhatsApp semi-automático', 'Clientes ilimitados'] },
  { name: 'Starter', price: '$25.000', popular: true, cta: 'Empezar con Starter', features: ['Hasta 60 clientes', 'Premios ilimitados', 'Cupones de descuento', 'Días bonus ×2', 'Soporte prioritario'], founder: ['WhatsApp semi-automático', 'Reactivar inactivos', 'Clientes ilimitados'] },
  { name: 'Pro', price: '$45.000', cta: 'Empezar con Pro', features: ['Clientes ilimitados', 'Premios ilimitados', 'Cupones de descuento', 'Días bonus ×2', 'WhatsApp semi-automático', 'Reactivar inactivos', 'Soporte prioritario'], founder: [] },
]

function PlansSection({ onLoginClick, num }) {
  return (
    <section id="planes" className="cx-grain" style={{ ...sec, background: ORA }}>
      <div style={wrap}>
        <Corners left={`${num || "06"} — Planes`} right="Sin permanencia · sin hardware" color={ORA_M} />
        <Poster size="clamp(3.2rem,8.4vw,8rem)" lines={[{ text: 'Empezá gratis,', color: ORA_T }, { text: 'crecé cuando', color: '#fff' }, { text: 'estés listo.', color: '#fff' }]} />
        <FadeIn delay={300}>
          <p style={{ fontFamily: SANS, fontSize: '1.05rem', color: '#FFE3D2', margin: '18px 0 0' }}>Hasta el 30/11, todos los planes incluyen el Pro completo. Gratis.</p>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20, marginTop: 'clamp(44px,6vh,70px)', alignItems: 'start' }}>
          {PLANS.map((p, i) => {
            const dark = p.popular
            const fg = dark ? '#fff' : DEEP
            const line = dark ? DEEP_T : '#FAEAE7'
            return (
              <FadeIn key={p.name} delay={i * 110} style={{ position: 'relative' }}>
                {p.popular && <Sticker bg={GOLD} color={DEEP} rot={6} size="1.7rem" style={{ right: -6, top: -20 }} delay={600}>Más elegido</Sticker>}
                <div style={{ background: dark ? DEEP : '#fff', color: fg, borderRadius: 30, padding: 'clamp(28px,3vw,40px)', boxShadow: dark ? '0 30px 60px rgba(42,20,13,0.35)' : 'none', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: MONO, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: dark ? '#FFC0AA' : '#A89A8C' }}>{p.name}</div>
                  <div style={{ ...bigType, fontSize: 'clamp(4rem,6vw,5.6rem)', margin: '8px 0 4px' }}>{p.price}<span style={{ fontFamily: SANS, fontWeight: 600, fontSize: '1rem', textTransform: 'none', letterSpacing: 0, opacity: 0.6 }}> /mes</span></div>
                  <div style={{ marginTop: 14 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${line}`, fontFamily: SANS, fontSize: '0.98rem' }}>
                        <IconCheck size={17} stroke={2.4} color={dark ? GOLD : VIO} /> {f}
                      </div>
                    ))}
                  </div>
                  {p.founder.length > 0 && (
                    <div style={{ border: `2px dashed ${dark ? 'rgba(240,96,58,0.6)' : 'rgba(240,96,58,0.45)'}`, borderRadius: 18, padding: '14px 16px', marginTop: 18 }}>
                      <div style={{ fontFamily: MONO, fontSize: '0.7rem', letterSpacing: '0.14em', color: MAG, marginBottom: 6 }}>GRATIS HASTA EL 30/11</div>
                      {p.founder.map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontFamily: SANS, fontSize: '0.9rem', opacity: 0.85 }}>
                          <IconCheck size={15} stroke={2.4} color={MAG} /> {f}
                        </div>
                      ))}
                    </div>
                  )}
                  <Act onClick={onLoginClick} style={{ ...btn, justifyContent: 'center', width: '100%', boxSizing: 'border-box', marginTop: 24, background: dark ? MAG : DEEP, color: '#fff' }}>{p.cta}</Act>
                </div>
              </FadeIn>
            )
          })}
        </div>
        <p style={{ fontFamily: MONO, fontSize: '0.75rem', letterSpacing: '0.1em', color: ORA_M, textAlign: 'center', marginTop: 30 }}>PRECIOS EN PESOS ARGENTINOS · SIN PERMANENCIA · CANCELÁS CUANDO QUIERAS</p>
      </div>
    </section>
  )
}

// ─── Testimonios (lavanda) ────────────────────────────────────────────────────
const TESTIMONIOS = [
  { quote: 'Antes usaba tarjetitas de cartón que se perdían siempre. Ahora el cliente escanea y listo.', initials: 'MG', name: 'Marcela G.', role: 'Farmacia · General Pico', c: VIO },
  { quote: 'Activé los miércoles con puntos dobles y ese día se convirtió en el más movido de la semana.', initials: 'SC', name: 'Silvia C.', role: 'Peluquería · La Pampa', c: MAG },
  { quote: 'El cliente puede ver sus puntos desde el celular. Me preguntan menos y vienen más seguido.', initials: 'RL', name: 'Roberto L.', role: 'Local de ropa · La Pampa', c: ORA },
]

function TestimonialsSection({ num }) {
  return (
    <section style={{ ...sec, background: LAV }}>
      <Clay src="/landing/tarjeta.webp" width="clamp(120px,14vw,200px)" rot={14} className="cx-hide-sm" style={{ right: '5%', top: '6%', opacity: 0.95 }} />
      <div style={wrap}>
        <Corners left={`${num || "07"} — Lo que dicen`} right="Comercios reales" color="#A89A8C" />
        <Poster size="clamp(3.2rem,8vw,7.6rem)" lines={[{ text: 'Comercios que', color: '#F5C3B8' }, { text: 'ya usan Clufix.', color: DEEP }]} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 'clamp(40px,6vh,60px)' }}>
          {TESTIMONIOS.map((t, i) => (
            <FadeIn key={t.initials} delay={i * 100}>
              <div style={{ background: '#fff', borderRadius: 26, padding: '30px 28px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', transform: `rotate(${[-1.2, 0.8, -0.6][i]}deg)`, boxShadow: '0 20px 50px rgba(42,20,13,0.08)' }}>
                <span aria-hidden="true" style={{ ...bigType, fontSize: '4.4rem', lineHeight: 0.6, color: t.c }}>&ldquo;</span>
                <p style={{ fontFamily: SANS, fontSize: '1.05rem', lineHeight: 1.6, color: INK, margin: '10px 0 22px', flex: 1 }}>{t.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 42, height: 42, borderRadius: '50%', background: t.c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontWeight: 800, fontSize: '0.85rem' }}>{t.initials}</span>
                  <div>
                    <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: '0.95rem', color: DEEP }}>{t.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: '0.72rem', letterSpacing: '0.08em', color: '#A89A8C', textTransform: 'uppercase' }}>{t.role}</div>
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

// ─── CTA final + footer (violeta profundo) ───────────────────────────────────
function FinalCTASection({ onLoginClick, lines, size, sub }) {
  return (
    <section className="cx-grain" style={{ ...sec, background: DEEP, textAlign: 'center', paddingTop: 'clamp(90px,14vh,160px)' }}>
      <div aria-hidden="true" className="cx-ring cx-spin" style={{ width: 'min(620px,86vw)', height: 'min(620px,86vw)', left: '50%', top: 'clamp(40px,8vh,90px)', marginLeft: 'calc(min(620px,86vw) / -2)', border: '3px solid rgba(255,255,255,0.12)' }} />
      <Clay src="/landing/star_tilt.webp" width="clamp(100px,12vw,180px)" rot={10} className="cx-cta-star" style={{ right: '12%', top: '12%' }} />
      <div style={wrap}>
        <FadeIn>
          <img src="/clufix_logo.svg" alt="Clufix" style={{ width: 'min(420px,70vw)', height: 'auto', display: 'block', margin: '0 auto' }} />
        </FadeIn>
        <Poster size={size || 'clamp(3.4rem,9vw,8rem)'} style={{ marginTop: 'clamp(28px,5vh,48px)' }} lines={lines || [{ text: 'Tu club', color: '#fff' }, { text: 'te espera.', color: GOLD }]} />
        <FadeIn delay={300}>
          <p style={{ fontFamily: SANS, fontSize: '1.08rem', color: '#FFC0AA', margin: '22px auto 32px', maxWidth: 560 }}>{sub || 'Empezá gratis hoy. Sin tarjeta, sin hardware, sin complicaciones.'}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Act onClick={onLoginClick} style={{ ...btn, background: MAG, color: '#fff' }}>Crear mi club gratis <IconArrowRight size={18} stroke={2.2} /></Act>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,0.4)' }}>
              <IconBrandWhatsapp size={18} stroke={1.9} /> Hablar con una persona
            </a>
          </div>
          <p style={{ fontFamily: MONO, fontSize: '0.74rem', letterSpacing: '0.12em', color: DEEP_M, marginTop: 20 }}>PLAN FREE PARA SIEMPRE · SIN PERMANENCIA · SIN HARDWARE</p>
        </FadeIn>
      </div>
    </section>
  )
}

function Footer({ linkPrefix = '' }) {
  const col = { display: 'flex', flexDirection: 'column', gap: 10 }
  const flink = { fontFamily: SANS, fontSize: '0.92rem', color: '#FFC0AA', textDecoration: 'none' }
  const ftitle = { fontFamily: MONO, fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: DEEP_M, marginBottom: 4 }
  return (
    <footer style={{ background: DEEP, borderTop: '1px solid rgba(255,255,255,0.1)', padding: 'clamp(40px,6vh,64px) clamp(18px,5.5vw,80px) 30px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '36px 24px', marginBottom: 44 }}>
          <div style={{ ...col, gap: 14 }}>
            <Link href="/" style={{ alignSelf: 'flex-start', display: 'flex' }}><img src="/clufix_logo.svg" alt="Clufix" style={{ height: 40, width: 'auto' }} /></Link>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: '0.92rem', color: '#FFC0AA', lineHeight: 1.6, maxWidth: 260 }}>Tu club de beneficios. Fidelización por QR para comercios de verdad.</p>
          </div>
          <div style={col}>
            <span style={ftitle}>Producto</span>
            <a href={`${linkPrefix}#como-funciona`} style={flink}>Cómo funciona</a>
            <a href={`${linkPrefix}#planes`} style={flink}>Planes</a>
            <a href={`${linkPrefix}#rubros`} style={flink}>Rubros</a>
            <Link href="/demo" style={flink}>Ver demo</Link>
          </div>
          <div style={col}>
            <span style={ftitle}>Ayuda</span>
            <Link href="/ayuda" style={flink}>Centro de ayuda</Link>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" style={{ ...flink, display: 'inline-flex', alignItems: 'center', gap: 7 }}><IconBrandWhatsapp size={16} stroke={1.8} /> WhatsApp</a>
          </div>
          <div style={col}>
            <span style={ftitle}>Legal</span>
            <Link href="/terminos" style={flink}>Términos y condiciones</Link>
            <Link href="/privacidad" style={flink}>Política de privacidad</Link>
          </div>
        </div>
        {linkPrefix && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
            <Link href="/" style={{ ...btn, background: '#fff', color: DEEP }}><span aria-hidden="true">←</span> Volver al inicio</Link>
          </div>
        )}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 22, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontFamily: SANS, fontSize: '0.8rem', color: DEEP_M }}>© 2026 Clufix · clufix.com.ar</span>
          <span style={{ fontFamily: MONO, fontSize: '0.74rem', letterSpacing: '0.12em', color: DEEP_M }}>HECHO EN LA PAMPA, ARGENTINA</span>
        </div>
      </div>
    </footer>
  )
}

// ─── HomePublic ───────────────────────────────────────────────────────────────
export default function HomePublic({ onLoginClick, onLogoClick, onGoPanel, user }) {
  return (
    <div style={{ fontFamily: SANS, background: DEEP, overflowX: 'hidden', isolation: 'isolate' }}>
      <Nav onLoginClick={onLoginClick} onLogoClick={onLogoClick} onGoPanel={onGoPanel} user={user} />
      <Hero onLoginClick={onLoginClick} />
      <ExplainerVideoSection />
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

// Piezas compartidas con las páginas de rubro (lib/RubroPage.js)
export {
  ORA, ORA_T, ORA_M, DEEP, DEEP_T, DEEP_M, MAG, MAG_T, MAG_M, VIO, VIO_T, VIO_M, GOLD, LAV, WA, INK,
  DISPLAY, MONO, SANS, WA_URL, LOGIN_URL, bigType, btn, sec, wrap,
  Act, FadeIn, Poster, Corners, Sticker, Clay, HandPhone,
  Nav, PlansSection, TestimonialsSection, FinalCTASection, Footer,
}
