'use client'
// HeroV2Section — versión alternativa del hero del home, basada en el
// landing tipo "Synapse" / dark-themed que pidió el dueño.
//
// Características:
//   - Background video HLS (.m3u8) flotante, posicionado bottom-[35vh]
//     con altura 80vh — efecto de "video flotando detrás del texto"
//     pero empujado hacia arriba desde el borde inferior.
//   - Background sólido negro (#000), sin overlays oscuros sobre el video.
//   - Navbar global de Benefix se mantiene (no la duplicamos).
//   - Badges glass-effect "Integrado con [X]" en una fila arriba.
//   - Headline grande (~80px) con fade-in.
//   - Subtext de 2 líneas.
//   - Dos CTA buttons (uno solid black border blanco, uno transparent glass).
//   - Logo marquee al pie en grayscale + 40% opacity.
//   - Animaciones staggered fade-in-up con delay escalonado.
//
// HLS: usamos hls.js dinámicamente importado para browsers que no soportan
// HLS nativo (Chrome, Firefox). Safari/iOS soportan HLS nativo y no
// necesitan la librería. El video tiene fallback a poster si la carga falla.

import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Sparkles, MessageCircle, CreditCard,
  Coffee, Scissors, UtensilsCrossed, ShoppingBag, Dumbbell,
  IceCream, Croissant, Flower2, Car, Pizza, PawPrint,
} from 'lucide-react'

const FN = "'Inter', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

// VideoPlayer interno — handle del HLS stream + cleanup en unmount.
//
// Estrategia para hls.js: lo cargamos desde un CDN en runtime (no como
// módulo npm) inyectando un <script> tag. Eso evita problemas de
// resolución de módulo con Next/Turbopack si la lib no está en
// package.json, y deja el bundle más liviano (la lib solo se descarga
// si hace falta, después de que el componente monta).
//
// Browsers que soportan HLS nativo (Safari, iOS) saltean el CDN load.

const HLS_CDN_URL = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js'

let hlsScriptPromise = null
function ensureHlsLoaded() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.Hls) return Promise.resolve(window.Hls)
  if (hlsScriptPromise) return hlsScriptPromise
  hlsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-hls-cdn="1"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Hls || null))
      existing.addEventListener('error', () => reject(new Error('hls.js failed to load')))
      return
    }
    const s = document.createElement('script')
    s.src = HLS_CDN_URL
    s.async = true
    s.dataset.hlsCdn = '1'
    s.onload = () => resolve(window.Hls || null)
    s.onerror = () => reject(new Error('hls.js failed to load'))
    document.head.appendChild(s)
  })
  return hlsScriptPromise
}

// Exportado para reutilizar en otras secciones (ej: CtaSection del home).
export function HLSVideoPlayer({ src, ...rest }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // ── iOS Safari quirk handling ──
    // Setear muted/playsInline ANTES del src, programáticamente, vía
    // tanto property como setAttribute. El atributo HTML solo no es
    // suficiente en algunos iOS viejos: hay que setearlo como property
    // en JS además. Y `webkit-playsinline` es para iOS < 10 (legacy
    // pero sigue arriba en algunos devices).
    try {
      video.muted = true
      video.playsInline = true
      video.setAttribute('muted', '')
      video.setAttribute('playsinline', '')
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('autoplay', '')
    } catch {}

    // Helper: dispara play() y atrapa cualquier rechazo. Se llama en
    // múltiples eventos (loadedmetadata, loadeddata, canplay, canplaythrough)
    // porque distintos browsers disparan distintos eventos primero.
    const tryPlay = () => {
      try {
        if (!video.paused) return
        const p = video.play()
        if (p && typeof p.catch === 'function') {
          p.catch(err => {
            // Autoplay bloqueado — registramos en consola para debug
            // pero no rompemos nada; el video va a esperar interacción.
            if (typeof window !== 'undefined' && window.console) {
              console.warn('[HeroV2Section] autoplay bloqueado:', err?.message || err)
            }
          })
        }
      } catch {}
    }

    // Listener que arranca el video apenas hay CUALQUIER interacción
    // del usuario (touch, scroll, click) — eso garantiza que aunque el
    // browser haya bloqueado el autoplay inicial, igual se reproduce.
    const userActPlay = () => {
      tryPlay()
      // Removemos los listeners después del primer intento para no
      // estar peleando con el video en cada scroll.
      removeUserListeners()
    }
    const removeUserListeners = () => {
      try {
        document.removeEventListener('touchstart', userActPlay, true)
        document.removeEventListener('click', userActPlay, true)
        document.removeEventListener('scroll', userActPlay, true)
        document.removeEventListener('keydown', userActPlay, true)
      } catch {}
    }
    document.addEventListener('touchstart', userActPlay, { capture: true, passive: true })
    document.addEventListener('click', userActPlay, { capture: true })
    document.addEventListener('scroll', userActPlay, { capture: true, passive: true })
    document.addEventListener('keydown', userActPlay, { capture: true })

    // Eventos del video — todos disparan tryPlay() porque queremos
    // arrancar lo antes posible, y `once: true` evita loops.
    const playEvents = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough']
    playEvents.forEach(ev => video.addEventListener(ev, tryPlay, { once: true }))

    let hlsInstance = null
    // Safari + iOS soportan HLS nativo via src directamente.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      try { video.load() } catch {}
      tryPlay()
      return () => {
        playEvents.forEach(ev => { try { video.removeEventListener(ev, tryPlay) } catch {} })
        removeUserListeners()
        try {
          video.removeAttribute('src')
          video.load()
        } catch {}
      }
    }
    // Chrome/Firefox/Edge: cargamos hls.js desde CDN.
    let cancelled = false
    ensureHlsLoaded().then(Hls => {
      if (cancelled || !Hls) return
      if (Hls.isSupported && Hls.isSupported()) {
        hlsInstance = new Hls({ enableWorker: false })
        hlsInstance.loadSource(src)
        hlsInstance.attachMedia(video)
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, tryPlay)
        hlsInstance.on(Hls.Events.LEVEL_LOADED, tryPlay)
      }
    }).catch(err => {
      console.warn('[HeroV2Section] hls.js no disponible — el video de fondo no va a reproducirse:', err?.message || err)
    })
    return () => {
      cancelled = true
      playEvents.forEach(ev => { try { video.removeEventListener(ev, tryPlay) } catch {} })
      removeUserListeners()
      if (hlsInstance) {
        try { hlsInstance.destroy() } catch {}
        hlsInstance = null
      }
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      // @ts-ignore — atributo legacy iOS, no es estándar HTML5
      webkit-playsinline="true"
      preload="auto"
      {...rest}
    />
  )
}

export default function HeroV2Section({ setView, user, profile, onLogin }) {
  const sectionRef = useRef(null)
  const [revealed, setRevealed] = useState(false)
  const isOwner = profile?.role === 'commerce_owner'

  // Reveal: arranca FALSE en cada mount, se dispara a TRUE recién cuando
  // el hero entra al viewport (IntersectionObserver). Si el user ya está
  // mirando el hero al cargar, igual hay un pequeño delay (100ms) para
  // garantizar que se vea la animación correr — sino aparece "ya
  // animado" y no se nota nada. Esto es lo que arregla el reporte
  // "no tiene ninguna animación".
  useEffect(() => {
    if (!sectionRef.current) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        // Pequeño delay para que la animación se vea correr (sino React
        // termina de hidratar y renderiza ya con revealed=true antes que
        // el ojo llegue a percibir el estado inicial).
        setTimeout(() => setRevealed(true), 120)
        obs.disconnect()
      }
    }, { threshold: 0.1 })
    obs.observe(sectionRef.current)
    return () => obs.disconnect()
  }, [])

  function handleSignupCTA(role) {
    if (!user) {
      try { sessionStorage.setItem('benefix:signupAs', role) } catch {}
      onLogin && onLogin()
      return
    }
    if (role === 'client') {
      setView(isOwner ? 'commerce-settings' : 'client')
      return
    }
    if (isOwner) { setView('commerce-settings'); return }
    try { sessionStorage.setItem('benefix:signupAs', 'merchant') } catch {}
    window.dispatchEvent(new CustomEvent('benefix:open-signup', { detail: { mode: 'merchant' } }))
  }

  // Helper: estilo común para el stagger fade-in-up con blur-in.
  // Usa CSS keyframes (en vez de transitions React-state) porque las
  // transitions se mostraban como "ya animado" cuando React rehidrataba
  // del SSR (que renderea con `revealed: false` pero el DOM final ya
  // estaba en el destino). Con keyframes, el navegador siempre corre
  // la animación de from → to sin importar el estado del componente.
  // delay en ms (animation-delay).
  const fadeUp = (delay) => revealed ? {
    animation: `hero-v2-fade-in-up 900ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
  } : {
    // Antes de revealed=true, dejamos los elementos invisibles para que
    // no haya flash "ya visible" antes de que arranque la animación.
    opacity: 0,
  }

  // Badges "Integrado con [X]" — solo Mercado Pago + WhatsApp.
  // Antes había Google Auth pero el dueño lo quitó. Ahora se muestran
  // en marquee horizontal (right-to-left infinito) en una sola línea.
  // Los logos son SVGs inline con los colores OFICIALES de marca para
  // ganar reconocimiento instantáneo (vs. íconos lucide grises de antes).
  const WhatsAppLogo = (props) => (
    <svg viewBox="0 0 24 24" width={props.size || 14} height={props.size || 14} aria-hidden="true">
      <path
        fill="#25D366"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.075-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  )
  // Logo oficial de Mercado Pago (handshake) — PNG raster en public/logos/.
  // Lo subió el dueño como SVG con un PNG embedded; lo extrajimos al PNG
  // suelto a 185×128 para no inflar el bundle JS. El aspect ratio es ~1.45
  // así que el width queda más ancho que el height al renderizarlo.
  const MercadoPagoLogo = ({ size = 14 }) => (
    <img
      src="/logos/mercadopago.png"
      alt="Mercado Pago"
      width={Math.round(size * 1.45)}
      height={size}
      style={{ display: 'block', objectFit: 'contain' }}
      loading="lazy"
    />
  )
  const integrations = [
    { Logo: WhatsAppLogo,    label: 'WhatsApp'     },
    { Logo: MercadoPagoLogo, label: 'Mercado Pago' },
  ]
  // Pista del marquee: replicamos el array COMPLETO (no items sueltos)
  // varias veces, siempre conservando el orden W → M → W → M. El loop
  // translateX queda seamless porque cada mitad de la pista contiene los
  // mismos items en el mismo orden — el wrap de -50% → 0% no genera salto.
  const MARQUEE_REPEATS = 4
  const marqueeTrack = Array.from({ length: MARQUEE_REPEATS }, () => integrations).flat()

  // Logos del marquee inferior — usamos los íconos de rubros que ya
  // venimos usando en el otro hero, en grayscale + 40% opacity.
  const TRUST = [
    { Icon: Coffee,          label: 'Cafeterías'   },
    { Icon: Scissors,        label: 'Barberías'    },
    { Icon: UtensilsCrossed, label: 'Restaurantes' },
    { Icon: ShoppingBag,     label: 'Tiendas'      },
    { Icon: Dumbbell,        label: 'Gimnasios'    },
    { Icon: Sparkles,        label: 'Peluquerías'  },
    { Icon: IceCream,        label: 'Heladerías'   },
    { Icon: Croissant,       label: 'Panaderías'   },
    { Icon: Flower2,         label: 'Spa'          },
    { Icon: Car,             label: 'Lavaderos'    },
    { Icon: Pizza,           label: 'Pizzerías'    },
    { Icon: PawPrint,        label: 'Veterinarias' },
  ]

  return (
    <section ref={sectionRef} style={{
      position: 'relative',
      // 100svh = small-viewport-height — excluye la barra del browser en
      // mobile (a diferencia de 100vh, que sí la incluye y empuja
      // contenido fuera del fold). Soportado en iOS Safari 15.4+ y
      // Chrome 108+. minHeight con valor numérico como piso de seguridad.
      height: '100svh',
      minHeight: 580,
      background: '#000',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Keyframes globales para el stagger fade-in-up del hero V2 */}
      <style>{`
        @keyframes hero-v2-fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(36px);
            filter: blur(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        @keyframes hero-v2-fade-in-up-marquee {
          0% {
            opacity: 0;
            transform: translateY(20px);
            filter: grayscale(1) blur(8px);
          }
          100% {
            opacity: 0.40;
            transform: translateY(0);
            filter: grayscale(1) blur(0);
          }
        }
        /* Movimiento sutil "agua que fluye" para el video de fondo.
           Como el wrapper ya está full-bleed (inset:0), no necesita
           translate(-50%) — solo scale + rotación leves para sumar
           movimiento orgánico a lo que ya trae el clip de Mux. */
        @keyframes hero-v2-water-drift {
          0%   { transform: scale(1)    rotate(0deg); }
          50%  { transform: scale(1.04) rotate(0.4deg); }
          100% { transform: scale(1.07) rotate(-0.4deg); }
        }
        /* Marquee right-to-left infinito. El contenido se duplica en el
           DOM y la pista entera se traslada -50% para que parezca que
           nunca termina. Sin ease, lineal y sin pausa. */
        @keyframes hero-v2-marquee-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        /* Bloom de color de marca derivando lentamente — los dos halos
           radiales (naranja y violeta) se desplazan en sentidos opuestos
           para crear una sensación orgánica tipo "líquido en movimiento".
           Periodo largo (22s) para que la animación sea casi imperceptible
           pero genere "vida" sobre el video. */
        @keyframes hero-v2-color-bloom {
          0%   { transform: translate(0%, 0%)   scale(1); }
          50%  { transform: translate(3%, -2%)  scale(1.06); }
          100% { transform: translate(-3%, 3%)  scale(1.04); }
        }
        /* Ruido sutil derivando — translación lenta de la textura
           para que el grano "viva" y no parezca pegado. */
        @keyframes hero-v2-noise-drift {
          0%   { background-position: 0px 0px; }
          100% { background-position: 160px 240px; }
        }
      `}</style>
      {/* ── BACKGROUND VIDEO (full-bleed, organic water-like) ──
          Ahora el wrapper ocupa TODO el viewport (inset:0) para que
          el video se vea sí o sí: antes estaba constreñido a
          min(92vw,880px)×min(60vh,540px) y con la mask radial muy
          agresiva quedaba prácticamente invisible. Mantiene el
          water-drift (scale + rotación leve) y el mask suave en los
          bordes para que se funda con el negro del fondo. */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'hero-v2-water-drift 16s ease-in-out infinite alternate',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, rgba(0,0,0,0.85) 70%, rgba(0,0,0,0.4) 90%, transparent 100%)',
        maskImage:       'radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, rgba(0,0,0,0.85) 70%, rgba(0,0,0,0.4) 90%, transparent 100%)',
      }}>
        <HLSVideoPlayer
          src="https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Capa 1 — Gradiente de marca (naranja → fucsia → violeta).
            mixBlendMode 'overlay' tinta el video con el degradé de la
            marca SIN aplastarlo (las zonas claras toman color, las
            oscuras quedan oscuras). Opacidad bajada de 0.65 a 0.42
            para que el video se vea claramente reproduciéndose por
            debajo, no completamente cubierto por el color. */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(254,80,0,0.42) 0%, rgba(236,72,153,0.34) 50%, rgba(189,75,248,0.42) 100%)',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }} />

        {/* Capa 2 — Bloom radial de color derivando lentamente.
            Halos naranja+violeta+fucsia que se mueven ±3% — refuerza
            la sensación orgánica de líquido coloreado. mixBlendMode
            'screen' suma luz. Opacidades reducidas para no saturar. */}
        <div style={{
          position: 'absolute', inset: '-10%',
          background: 'radial-gradient(circle at 28% 42%, rgba(254,80,0,0.40), transparent 55%), radial-gradient(circle at 72% 60%, rgba(189,75,248,0.38), transparent 52%), radial-gradient(circle at 50% 50%, rgba(236,72,153,0.22), transparent 60%)',
          mixBlendMode: 'screen',
          animation: 'hero-v2-color-bloom 22s ease-in-out infinite alternate',
          pointerEvents: 'none',
          willChange: 'transform',
        }} />

        {/* Capa 3 — Ruido SVG fractal derivando lento. */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>")`,
          backgroundSize: '160px 160px',
          backgroundRepeat: 'repeat',
          opacity: 0.10,
          mixBlendMode: 'overlay',
          animation: 'hero-v2-noise-drift 28s linear infinite',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── ZONA SUPERIOR — Slider "Integrado con..." ──
          Sin flex:1, ocupa solo lo que necesita. paddingTop generoso
          para no quedar pegado al navbar global del top, paddingBottom
          chico porque el hero content queda inmediatamente abajo
          ya centrado en el espacio restante. */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        padding: '88px 0 0',
        ...fadeUp(100),
      }}>
        <div style={{
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          overflow: 'hidden',
          // Fade lateral en los bordes para que no haya un corte duro de
          // los pills al entrar/salir del viewport del marquee.
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)',
          maskImage:       'linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)',
        }}>
          <div style={{
            display: 'flex',
            width: 'max-content',
            gap: 10,
            animation: 'hero-v2-marquee-left 22s linear infinite',
          }}>
            {marqueeTrack.map(({ Logo, label }, i) => (
              <div key={`${i}-${label}`} className="liquid-glass" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '7px 14px',
                borderRadius: 99,
                fontSize: 12, fontFamily: FN, fontWeight: 500,
                color: 'rgba(255,255,255,0.85)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>Integrado con</span>
                <Logo size={14} />
                <span style={{ color: '#fff', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ZONA CENTRAL — Hero content (h1, subtext, CTAs) ──
          flex:1 para tomar todo el espacio restante entre el slider
          superior y el inferior, y justifyContent:center para que el
          headline "Tu club, tu marca." quede CENTRADO en esa zona
          libre. Eso lo deja visualmente al medio de la pantalla
          (entre los dos sliders) sin importar el tamaño del viewport. */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: 1100,
        margin: '0 auto',
        width: '100%',
        padding: '24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
      }}>
        {/* Headline corto y punzante — fade-in con keyframes.
            Antes era "Donde la fidelización encuentra a tu negocio."
            Lo cortamos a "Tu club, tu marca." que es más impactante
            y entra en una sola línea en cualquier viewport. */}
        <h1 style={{
          fontFamily: FN,
          fontSize: 'clamp(40px, 8vw, 80px)',
          fontWeight: 600,
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          color: '#fff',
          margin: 0,
          marginBottom: 20,
          maxWidth: 820,
          ...(revealed ? {
            animation: 'hero-v2-fade-in-up 1100ms cubic-bezier(0.22,1,0.36,1) 280ms both',
          } : { opacity: 0 }),
        }}>
          Tu club, tu marca.
        </h1>

        {/* Subtext corto — antes eran 2 líneas largas, ahora una sola
            frase punzante que cabe en 1-2 líneas. */}
        <p style={{
          fontFamily: FI,
          fontSize: 'clamp(15px, 1.8vw, 18px)',
          color: 'rgba(255,255,255,0.70)',
          lineHeight: 1.55,
          margin: 0,
          marginBottom: 40,
          maxWidth: 480,
          ...fadeUp(500),
        }}>
          Tus clientes suman puntos en cada visita y vuelven por el premio. Eso es Benefix.
        </p>

        {/* CTAs — uno solid black con border blanco, otro transparent glass */}
        <div style={{
          display: 'flex', flexWrap: 'wrap',
          justifyContent: 'center', gap: 12,
          ...fadeUp(700),
        }}>
          <button
            onClick={() => handleSignupCTA('client')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 22px',
              borderRadius: 99,
              background: '#000',
              border: '1px solid rgba(255,255,255,0.85)',
              color: '#fff',
              fontFamily: FN, fontSize: 14, fontWeight: 600,
              letterSpacing: '.01em',
              cursor: 'pointer',
              transition: 'transform 200ms ease, background 200ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#000' }}
          >
            Empezar gratis
            <ArrowRight size={15} strokeWidth={2.4} />
          </button>
          <a
            href="/demo"
            className="liquid-glass"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 22px',
              borderRadius: 99,
              color: '#fff',
              fontFamily: FN, fontSize: 14, fontWeight: 500,
              letterSpacing: '.01em',
              cursor: 'pointer',
              border: 'none',
              textDecoration: 'none',
              transition: 'transform 200ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            Probá el demo
          </a>
        </div>
      </div>

      {/* ── ZONA INFERIOR — Marquee de rubros ──
          Slide right-to-left con los rubros (Cafeterías, Barberías, etc.)
          en grayscale + 40% opacity según spec. Sin flex, así toma su
          tamaño natural y queda al pie de la sección (empujado hacia
          abajo por flex:1 del hero content). Padding-bottom 110px para
          que quede bien arriba del fondo del viewport — eso lo deja
          claramente visible en la primera impresión y por encima de los
          botones flotantes (SupportChat bottom 90, NotificationsBell
          bottom 156) y de la barra del browser en mobile. */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        padding: '0 0 110px',
        overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)',
        maskImage:       'linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)',
        ...(revealed ? {
          animation: 'hero-v2-fade-in-up-marquee 900ms cubic-bezier(0.22,1,0.36,1) 950ms both',
        } : { opacity: 0 }),
      }}>
        <div style={{
          display: 'flex',
          width: 'max-content',
          gap: 28,
          animation: 'hero-v2-marquee-left 38s linear infinite',
        }}>
          {[...TRUST, ...TRUST].map(({ Icon, label }, i) => (
            <div key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: FI, fontSize: 11,
              color: '#fff',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              <Icon size={16} strokeWidth={1.6} color="#fff" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
