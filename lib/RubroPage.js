'use client'
// ─────────────────────────────────────────────────────────────────────────────
// RubroPage — /rubros/[rubro]
// Mismo lenguaje que la landing (lib/HomePublic.js) y los comerciales: placas de
// color plano, títulos Archivo condensada tono sobre tono, micro-labels DM Mono,
// stickers, plastilina y la mano de Vale con el celular. Cada rubro tiene su
// color de hero (ver RUBRO_THEME).
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import Link from 'next/link'
import {
  IconScissors, IconPill, IconHanger, IconToolsKitchen2, IconBarbell, IconBuildingStore,
  IconQrcode, IconStar, IconTicket, IconBolt, IconMessageCircle, IconCoin, IconCalendar,
  IconUsers, IconBell, IconRobot, IconMapPin, IconChevronDown, IconArrowRight, IconBrandWhatsapp,
} from '@tabler/icons-react'
import { rubroList } from './rubros-data'
import {
  ORA, ORA_T, ORA_M, DEEP, DEEP_T, DEEP_M, MAG, MAG_T, MAG_M, VIO, VIO_T, VIO_M, GOLD, LAV, INK,
  MONO, SANS, WA_URL, LOGIN_URL, bigType, btn, sec, wrap,
  FadeIn, Poster, Corners, Sticker, Clay, HandPhone,
  Nav, PlansSection, TestimonialsSection, FinalCTASection, Footer,
} from './HomePublic'

// Color del hero + objeto de plastilina + sticker por rubro
const RUBRO_THEME = {
  peluquerias:  { bg: ORA, t: ORA_T, m: ORA_M, sub: '#FFE3D2', sticker: 'Corte gratis', stBg: MAG,  clay: '/landing/star_tilt.webp' },
  farmacias:    { bg: VIO, t: VIO_T, m: VIO_M, sub: '#FFE1D6', sticker: 'Puntos x receta', stBg: GOLD, stFg: DEEP, clay: '/landing/cupon.webp' },
  indumentaria: { bg: MAG, t: MAG_T, m: MAG_M, sub: '#D5F5EF', sticker: 'Vuelve a comprar', stBg: DEEP, clay: '/landing/regalo.webp' },
  restaurantes: { bg: ORA, t: ORA_T, m: ORA_M, sub: '#FFE3D2', sticker: 'Postre gratis', stBg: VIO,  clay: '/landing/star_tilt.webp' },
  gimnasios:    { bg: VIO, t: VIO_T, m: VIO_M, sub: '#FFE1D6', sticker: 'Doble estrellas', stBg: MAG, clay: '/landing/star_squash.webp' },
  jugeterias:   { bg: MAG, t: MAG_T, m: MAG_M, sub: '#D5F5EF', sticker: 'De regalo', stBg: GOLD, stFg: DEEP, clay: '/landing/regalo.webp' },
}

const ICONS = {
  scissors: IconScissors, pill: IconPill, hanger: IconHanger, 'tools-kitchen-2': IconToolsKitchen2,
  barbell: IconBarbell, 'building-store': IconBuildingStore,
  star: IconStar, ticket: IconTicket, bolt: IconBolt, 'message-circle': IconMessageCircle, coin: IconCoin, calendar: IconCalendar,
}

const APP_FEATURES = [
  { icon: IconQrcode, a: 'QR', b: 'instantáneo', c: GOLD, desc: 'Tu club tiene un QR único. Lo imprimís y lo ponés en el mostrador.' },
  { icon: IconUsers, a: 'Panel de', b: 'clientes', c: MAG, desc: 'Ves quién vino, cuándo y cuánto acumula cada uno.' },
  { icon: IconStar, a: 'Estrellas', b: 'o puntos', c: GOLD, desc: 'Elegís el sistema que mejor funciona para tu negocio.' },
  { icon: IconBell, a: 'Notificaciones', b: 'push', c: '#FFA588', desc: 'Tus clientes reciben avisos cuando canjearon o acumularon.' },
  { icon: IconRobot, a: 'Soporte', b: 'con IA', c: '#FFA588', desc: 'Asistente disponible 24/7 dentro de la app.' },
  { icon: IconMapPin, a: 'Directorio', b: 'público', c: '#FFA588', desc: 'Tu local aparece en el directorio de Clufix para que te descubran.' },
]

// Parte un título en dos mitades por palabras (para el tono sobre tono)
function splitHalf(text) {
  const w = text.split(' ')
  const h = Math.ceil(w.length / 2)
  return [w.slice(0, h).join(' '), w.slice(h).join(' ')]
}

export default function RubroPage({ rubro, slug }) {
  const th = RUBRO_THEME[slug] || RUBRO_THEME.peluquerias
  const [openFaq, setOpenFaq] = useState(0)
  const otros = rubroList.filter(r => r.slug !== slug)
  const [h1a, h1b] = rubro.heroTitle.split('\n')
  const RubroIcon = ICONS[rubro.icono] || IconBuildingStore
  const [ctaA, ctaB] = splitHalf(rubro.ctaTitle)

  return (
    <div style={{ fontFamily: SANS, background: DEEP, overflowX: 'hidden', isolation: 'isolate' }}>
      <Nav linkPrefix="/" navColor={th.bg} navMuted={th.m} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="cx-grain" style={{ ...sec, background: th.bg, minHeight: '100svh', paddingTop: 'clamp(110px,15vh,150px)', paddingBottom: 'clamp(60px,9vh,100px)' }}>
        <div aria-hidden="true" className="cx-ring" style={{ width: '110vw', height: '110vw', left: '-60vw', top: '-50vw' }} />
        <div style={wrap}>
          <Corners left={`Rubros — ${rubro.nombre}`} right="Hecho en La Pampa" color={th.m} />
          <div className="cx-hero-grid">
            <div className="cx-hero-text" style={{ position: 'relative', zIndex: 4 }}>
              <Poster as="h1" size="clamp(3rem, 6.6vw, 6.6rem)" lines={[
                { text: h1a, color: th.t },
                { text: h1b || '', color: '#fff' },
              ]} />
              <FadeIn delay={500}>
                <p style={{ fontFamily: SANS, fontSize: 'clamp(1.05rem,1.6vw,1.25rem)', lineHeight: 1.55, color: th.sub, maxWidth: 540, margin: 'clamp(22px,3.5vh,34px) 0 28px' }}>
                  {rubro.heroSub}
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <a href={LOGIN_URL} style={{ ...btn, background: DEEP, color: '#fff' }}>Crear mi club gratis <IconArrowRight size={18} stroke={2.2} /></a>
                  <a href="#como-funciona" style={{ ...btn, background: 'transparent', color: '#fff', border: '2px solid #fff' }}>Ver cómo funciona</a>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
        <div className="cx-hero-hand">
          <HandPhone width="100%" mirror style={{ left: 0, top: 0 }} />
          <Clay src={th.clay} width="19%" rot={-12} style={{ left: '17%', top: '13%', zIndex: 4 }} />
          <Sticker bg={th.stBg} color={th.stFg || '#fff'} rot={-7} size="clamp(1.8rem,3.8vw,3.8rem)" style={{ left: '14%', top: '62%' }} delay={900}>{th.sticker}</Sticker>
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="cx-grain" style={{ ...sec, background: DEEP }}>
        <Clay src="/landing/star_front.webp" width="clamp(100px,12vw,170px)" rot={-14} style={{ right: '5%', top: '6%' }} />
        <div style={wrap}>
          <Corners left="01 — Cómo funciona" right="Tu club, en tres pasos" color={DEEP_M} />
          <Poster size="clamp(3rem,7.4vw,7rem)" lines={[{ text: 'Tres pasos,', color: DEEP_T }, { text: 'y tu club anda.', color: '#fff' }]} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'clamp(28px,4vw,48px)', marginTop: 'clamp(36px,5vh,60px)' }}>
            {rubro.flujo.map((p, i) => (
              <FadeIn key={i} delay={i * 140}>
                <div style={{ ...bigType, fontSize: 'clamp(8rem,15vw,13rem)', color: DEEP_T, lineHeight: 0.8 }}>{String(i + 1).padStart(2, '0')}</div>
                <h3 style={{ ...bigType, fontSize: 'clamp(2.2rem,3.6vw,3.2rem)', color: '#fff', marginTop: '-0.35em' }}>
                  <span style={{ color: [GOLD, MAG, '#25D366'][i] }}>{p.titulo}</span>
                </h3>
                <p style={{ fontFamily: SANS, fontSize: '1.02rem', lineHeight: 1.6, color: '#FFC0AA', margin: '14px 0 0', maxWidth: 380 }}>{p.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ideas para el rubro ──────────────────────────────────────────── */}
      <section className="cx-grain" style={{ ...sec, background: MAG }}>
        <Clay src="/landing/regalo.webp" width="clamp(110px,13vw,190px)" rot={10} style={{ right: '4%', top: '5%' }} />
        <div style={wrap}>
          <Corners left={`02 — Para ${rubro.nombre.toLowerCase()}`} right="Ideas listas para usar" color={MAG_M} />
          <Poster size="clamp(3rem,7.4vw,7rem)" lines={[{ text: 'Ideas que', color: MAG_T }, { text: 'funcionan en', color: MAG_T }, { text: 'tu rubro.', color: '#fff' }]} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 'clamp(40px,6vh,64px)' }}>
            {rubro.beneficiosRubro.map((b, i) => {
              const Icon = ICONS[b.icono] || IconStar
              return (
                <FadeIn key={i} delay={(i % 2) * 110}>
                  <div className="cx-card" style={{ background: '#fff', color: DEEP, borderRadius: 26, padding: '26px 26px 28px', height: '100%', boxSizing: 'border-box', transform: `rotate(${[-0.8, 0.7, 0.5, -0.6][i % 4]}deg)`, boxShadow: '0 24px 50px rgba(111,24,9,0.22)' }}>
                    <span style={{ width: 54, height: 54, borderRadius: 16, background: [GOLD, MAG, VIO, '#25D366'][i % 4], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={28} stroke={2} color={i % 4 === 0 || i % 4 === 3 ? DEEP : '#fff'} />
                    </span>
                    <h3 style={{ ...bigType, fontSize: 'clamp(1.9rem,2.6vw,2.4rem)', margin: '18px 0 0' }}>{b.titulo}</h3>
                    <p style={{ fontFamily: SANS, fontSize: '0.98rem', lineHeight: 1.55, color: '#7D6656', margin: '10px 0 0' }}>{b.desc}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── La plataforma ───────────────────────────────────────────────── */}
      <section className="cx-grain" style={{ ...sec, background: VIO }}>
        <div style={wrap}>
          <Corners left="03 — La plataforma" right="Todo desde el celular" color={VIO_M} />
          <Poster size="clamp(3rem,7.4vw,7rem)" lines={[{ text: 'Todo para', color: VIO_T }, { text: 'fidelizar.', color: '#fff' }]} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 'clamp(40px,6vh,64px)' }}>
            {APP_FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <FadeIn key={f.a} delay={(i % 3) * 90}>
                  <div className="cx-card" style={{ height: '100%', boxSizing: 'border-box', background: 'rgba(42,20,13,0.22)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 26, padding: '26px 26px 28px' }}>
                    <span style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={30} stroke={1.7} color={f.c} /></span>
                    <h3 style={{ ...bigType, fontSize: 'clamp(2rem,2.8vw,2.5rem)', color: '#fff', marginTop: 18 }}>{f.a}<br /><span style={{ color: f.c }}>{f.b}</span></h3>
                    <p style={{ fontFamily: SANS, fontSize: '0.98rem', lineHeight: 1.55, color: '#FFE1D6', margin: '12px 0 0' }}>{f.desc}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Directorio ──────────────────────────────────────────────────── */}
      <section className="cx-grain" style={{ ...sec, background: DEEP }}>
        <div style={wrap}>
          <Corners left="04 — Directorio Clufix" right="Nuevos clientes" color={DEEP_M} />
          <div className="cx-split">
            <div>
              <Poster size="clamp(3rem,7vw,6.6rem)" lines={[{ text: 'Tu local en', color: DEEP_T }, { text: 'el directorio.', color: DEEP_T }, { text: 'Te encuentran.', color: '#fff' }]} />
              <FadeIn delay={300}>
                <p style={{ fontFamily: SANS, fontSize: '1.05rem', lineHeight: 1.6, color: '#FFC0AA', maxWidth: 480, margin: '22px 0 0' }}>
                  Todos los comercios con club activo aparecen en el directorio público de Clufix. Los usuarios pueden encontrarte, sumarse a tu club y acumular desde el primer día.
                </p>
              </FadeIn>
            </div>
            <FadeIn delay={200} style={{ position: 'relative' }}>
              <div style={{ background: '#fff', borderRadius: 26, padding: '26px 24px', transform: 'rotate(2deg)', boxShadow: '0 40px 80px rgba(0,0,0,0.35)' }}>
                <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A89A8C', marginBottom: 16 }}>clufix — Directorio</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ width: 56, height: 56, borderRadius: 16, background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><RubroIcon size={30} stroke={1.8} color="#fff" /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...bigType, fontSize: '1.9rem', color: DEEP }}>{slug === 'indumentaria' ? 'Tu local' : `Tu ${rubro.nombre.split(' ')[0].toLowerCase().replace(/s$/, '')}`}</div>
                    <div style={{ fontFamily: SANS, fontSize: '0.85rem', color: '#A89A8C' }}>General Pico, La Pampa</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #FFEDE6', marginTop: 18, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', color: '#25A35A' }}>● CLUB ACTIVO</span>
                  <span style={{ ...btn, padding: '0.5rem 1.1rem', fontSize: '0.85rem', background: MAG, color: '#fff' }}>Sumarme</span>
                </div>
              </div>
              <Sticker bg={GOLD} color={DEEP} rot={-6} size="clamp(1.5rem,2.6vw,2.2rem)" style={{ left: -10, bottom: -26 }} delay={600}>+ socios nuevos</Sticker>
            </FadeIn>
          </div>
        </div>
      </section>

      <TestimonialsSection num="05" />
      <PlansSection num="06" />

      {/* ── FAQs ────────────────────────────────────────────────────────── */}
      <section className="cx-grain" style={{ ...sec, background: LAV }}>
        <div style={{ ...wrap, maxWidth: 980 }}>
          <Corners left="07 — Preguntas frecuentes" right="Dudas comunes" color="#A89A8C" />
          <Poster size="clamp(3rem,7vw,6.4rem)" lines={[{ text: '¿Dudas?', color: '#F5C3B8' }, { text: 'Te contamos.', color: DEEP }]} />
          <div style={{ marginTop: 'clamp(30px,5vh,48px)', display: 'grid', gap: 12 }}>
            {rubro.faqs.map((f, i) => {
              const open = openFaq === i
              return (
                <FadeIn key={i} delay={i * 50}>
                  <div style={{ background: open ? DEEP : '#fff', color: open ? '#fff' : DEEP, borderRadius: 22, transition: 'background .25s, color .25s' }}>
                    <button onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}>
                      <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: '1.02rem' }}>{f.q}</span>
                      <IconChevronDown size={20} stroke={2.2} color={open ? GOLD : VIO} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
                    </button>
                    {open && <p style={{ margin: 0, padding: '0 24px 22px', fontFamily: SANS, fontSize: '0.98rem', lineHeight: 1.65, color: '#FFC0AA' }}>{f.a}</p>}
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      <FinalCTASection
        size="clamp(2.2rem,6vw,5.4rem)"
        lines={[{ text: ctaA, color: '#fff' }, { text: ctaB, color: GOLD }]}
        sub="Creá tu club gratis hoy. Sin tarjeta, sin hardware, sin complicaciones."
      />

      {/* ── Otros rubros ────────────────────────────────────────────────── */}
      <section className="cx-grain" style={{ ...sec, background: VIO, paddingTop: 'clamp(56px,8vh,90px)', paddingBottom: 'clamp(56px,8vh,90px)' }}>
        <div style={wrap}>
          <Corners left="Ver otros rubros" right="Clufix se adapta" color={VIO_M} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            {otros.map((r, i) => (
              <FadeIn key={r.slug} delay={i * 60}>
                <Link href={`/rubros/${r.slug}`} className="cx-rubro" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#fff', color: DEEP, borderRadius: 999, padding: '16px 22px 14px' }}>
                  <span style={{ ...bigType, fontSize: '1.9rem' }}>{r.label}</span>
                  <IconArrowRight size={22} stroke={2} color={VIO} />
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <Footer linkPrefix="/" />
    </div>
  )
}
