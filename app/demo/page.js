'use client'
// /demo — versión interactiva de Benefix con datos mock.
//
// El usuario entra y elige cómo quiere ver la app: como dueño de un
// comercio (panel del comerciante) o como cliente (billetera + premios).
// Puede alternar entre los dos roles en cualquier momento.
//
// Todo es standalone (no toca Supabase, no tiene auth real), así que los
// cambios que el usuario hace en el demo se descartan apenas refresca.
// Un banner sticky arriba lo aclara, y un CTA "Activá tu Benefix" lo
// rebota al registro real.

import { useState, useEffect } from 'react'
import {
  ArrowLeft, ArrowRight, Bell, Camera, Check, ChevronRight, Clock, Coffee, CreditCard,
  Gift, MapPin, Percent, Phone, Pizza, Plus, RefreshCw, Scissors, Settings,
  Sparkles, Star, Store, TrendingUp, User, UserPlus, Users, Wallet, X, Zap,
} from 'lucide-react'

// ─── PALETTE (idéntica a app/page.js) ────────────────────────────────────────
const G  = 'linear-gradient(135deg, #FE5000, #BD4BF8)'
const GV = 'linear-gradient(135deg, #3F0B78, #BD4BF8)'
const C  = {
  bg:'#000', bg2:'rgba(255,255,255,0.05)', bg3:'rgba(255,255,255,0.04)',
  card:'rgba(255,255,255,0.06)', cardH:'rgba(255,255,255,0.10)',
  rim:'rgba(255,255,255,0.10)', rimH:'rgba(255,255,255,0.20)',
  white:'#FFFFFF', pearl:'#F0EAFF', mist:'#9B85CC', dust:'#8370AD',
  o:'#FE5000', v:'#BD4BF8', v1:'#3F0B78',
  ok:'#22E698', warn:'#F59E0B', info:'#40C8FF',
}
const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

const PLANS = {
  free:    { label:'FREE',    color:'#9CA3AF' },
  starter: { label:'STARTER', color:'#BD4BF8' },
  pro:     { label:'PRO',     color:'#EC4899' },
}

// ─── DATOS MOCK ──────────────────────────────────────────────────────────────
function daysAgo(n)     { return new Date(Date.now() - n * 86400000).toISOString() }
function daysFromNow(n) { return new Date(Date.now() + n * 86400000).toISOString() }

const DEMO_COMMERCE = {
  id:'demo-aurora',
  name:'Aurora · Café & Brunch',
  category:'Cafeterías',
  categories:['Cafeterías', 'Brunch'],
  city_name:'Buenos Aires',
  prog_type:'points',
  prog_pts:1,
  prog_min_purchase:500,
  plan:'pro',
  description:'Café de especialidad, brunch los fines de semana y wifi para trabajar todo el día.',
  address:'Honduras 4823, Palermo, Buenos Aires',
  phone:'1145678910',
  instagram:'@aurora.cafebrunch',
  hours:'Lunes a viernes 8 a 20hs · Sábados y domingos 9 a 16hs',
}

const DEMO_MEMBERS = [
  { id:'m1',  name:'Tomás Herrera',     points:32, visits:12, last:daysAgo(0)  },
  { id:'m2',  name:'Victoria Méndez',   points:28, visits:10, last:daysAgo(1)  },
  { id:'m3',  name:'Diego Solari',      points:25, visits:9,  last:daysAgo(2)  },
  { id:'m4',  name:'Belén Sosa',        points:21, visits:8,  last:daysAgo(4)  },
  { id:'m5',  name:'Camila Pereyra',    points:18, visits:7,  last:daysAgo(3)  },
  { id:'m6',  name:'Matías Ledesma',    points:15, visits:5,  last:daysAgo(9)  },
  { id:'m7',  name:'Sofía Castelli',    points:12, visits:6,  last:daysAgo(2)  },
  { id:'m8',  name:'Joaquín Riva',      points:9,  visits:3,  last:daysAgo(5)  },
  { id:'m9',  name:'Ana Salinas',       points:7,  visits:2,  last:daysAgo(12) },
  { id:'m10', name:'Lucas Gómez',       points:5,  visits:2,  last:daysAgo(14) },
  { id:'m11', name:'Federico Aizen',    points:3,  visits:1,  last:daysAgo(3)  },
  { id:'m12', name:'Florencia Bustos',  points:0,  visits:1,  last:daysAgo(1)  },
]

const DEMO_PRIZES_INIT = [
  { id:'p1', name:'Café gratis',                cost:15, active:true,  stock:null, redeemed:14 },
  { id:'p2', name:'Medialunas x4',              cost:8,  active:true,  stock:6,    redeemed:8  },
  { id:'p3', name:'20% OFF en tu visita',       cost:25, active:true,  stock:null, redeemed:5  },
  { id:'p4', name:'Combo brunch + jugo natural', cost:30, active:false, stock:5,    redeemed:0  },
]

const DEMO_PROMOS_INIT = [
  { id:'pr1', type:'discount_next', value:10, description:'10% OFF próxima visita', active:true, expires_at:daysFromNow(14) },
  { id:'pr2', type:'double_points', days:[1], description:'Doble puntos los lunes', active:true, expires_at:daysFromNow(30) },
]

const DEMO_ACTIVITY = [
  { id:'a1', type:'visit',  text:'Tomás Herrera sumó 1 punto',                when:daysAgo(0) },
  { id:'a2', type:'redeem', text:'Victoria Méndez canjeó "Café gratis"',      when:daysAgo(0) },
  { id:'a3', type:'visit',  text:'Diego Solari sumó 1 punto',                 when:daysAgo(1) },
  { id:'a4', type:'visit',  text:'Florencia Bustos sumó 1 punto · 1ª visita', when:daysAgo(1) },
  { id:'a5', type:'visit',  text:'Federico Aizen sumó 1 punto · 1ª visita',   when:daysAgo(3) },
  { id:'a6', type:'config', text:'Premio "Combo brunch" pausado',             when:daysAgo(5) },
]

// ── Datos mock del CLIENTE (Sofía Castelli) ──
const DEMO_CLIENT_PROFILE = {
  id:'client-sofia',
  name:'Sofía Castelli',
  email:'sofia.castelli@example.com',
  phone:'1156782233',
}

const DEMO_CLIENT_MEMBERSHIPS = [
  {
    id:'cm1',
    commerce:{
      id:'demo-aurora',
      name:'Aurora · Café & Brunch',
      city_name:'Buenos Aires',
      categories:['Cafeterías', 'Brunch'],
      prog_type:'points',
    },
    points:12,
    nextPrize:{ name:'Café gratis', cost:15, missing:3 },
    activeCoupon:{ promo_id:'pr1', value:20, label:'20% OFF próxima visita', expires_at:daysFromNow(5) },
    Icon: Coffee,
    color:'#BD4BF8',
  },
  {
    id:'cm2',
    commerce:{
      id:'demo-ottavia',
      name:'Estética Ottavia',
      city_name:'Buenos Aires',
      categories:['Peluquerías'],
      prog_type:'stars',
    },
    stars:4,
    nextPrize:{ name:'Corte de pelo gratis', cost:8, missing:4 },
    activeCoupon:null,
    Icon: Scissors,
    color:'#8B5CF6',
  },
  {
    id:'cm3',
    commerce:{
      id:'demo-donvito',
      name:'Pizzería Don Vito',
      city_name:'Buenos Aires',
      categories:['Pizzerías'],
      prog_type:'points',
    },
    points:8,
    nextPrize:{ name:'Pizza muzzarella', cost:25, missing:17 },
    activeCoupon:null,
    Icon: Pizza,
    color:'#EC4899',
  },
]

const DEMO_CLIENT_PRIZES = [
  { id:'cp1', commerce:'Aurora · Café & Brunch', name:'Café gratis',          cost:15, isStars:false, balance:12, color:'#BD4BF8', Icon: Gift },
  { id:'cp2', commerce:'Aurora · Café & Brunch', name:'Medialunas x4',        cost:8,  isStars:false, balance:12, color:'#BD4BF8', Icon: Gift },
  { id:'cp3', commerce:'Aurora · Café & Brunch', name:'20% OFF en tu visita', cost:25, isStars:false, balance:12, color:'#BD4BF8', Icon: Percent },
  { id:'cp4', commerce:'Estética Ottavia',       name:'Corte de pelo gratis', cost:8,  isStars:true,  balance:4,  color:'#8B5CF6', Icon: Gift },
  { id:'cp5', commerce:'Pizzería Don Vito',      name:'Pizza muzzarella',     cost:25, isStars:false, balance:8,  color:'#EC4899', Icon: Gift },
]

const DEMO_CLIENT_HISTORY = [
  { id:'h1', kind:'visit',   commerce:'Aurora · Café & Brunch', label:'+1 punto',         when:daysAgo(2)  },
  { id:'h2', kind:'visit',   commerce:'Pizzería Don Vito',      label:'+1 punto',         when:daysAgo(4)  },
  { id:'h3', kind:'visit',   commerce:'Aurora · Café & Brunch', label:'+1 punto · ×2 lun', when:daysAgo(7)  },
  { id:'h4', kind:'redeem',  commerce:'Estética Ottavia',       label:'Lavado gratis',    when:daysAgo(11) },
  { id:'h5', kind:'visit',   commerce:'Estética Ottavia',       label:'+1 estrella',      when:daysAgo(15) },
  { id:'h6', kind:'join',    commerce:'Aurora · Café & Brunch', label:'Te sumaste al club', when:daysAgo(28) },
]

// ─── HELPERS DE UI ───────────────────────────────────────────────────────────
function timeAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 7)   return `hace ${d} días`
  if (d < 30)  return `hace ${Math.floor(d/7)} sem`
  return `hace ${Math.floor(d/30)} m`
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day:'numeric', month:'short' })
}

function Avatar({ name, size = 36, color = C.v }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}26`,
      border: `1px solid ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FN, fontSize: size * 0.36, fontWeight: 700,
      color, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function Pill({ children, color = C.v, soft = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 99,
      background: soft ? `${color}1f` : color,
      color: soft ? color : '#fff',
      border: soft ? `1px solid ${color}55` : 'none',
      fontFamily: FN, fontSize: 10, fontWeight: 700,
      letterSpacing: '.06em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function Card({ children, style, glow = false }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${glow ? `${C.v}55` : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 16,
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      boxShadow: glow ? `0 0 40px -10px ${C.v}66` : 'none',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── DEMO BANNER (sticky arriba siempre) ─────────────────────────────────────
function DemoBanner({ onCta }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 60,
      background: 'rgba(15, 8, 28, 0.86)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      borderBottom: `1px solid ${C.v}33`,
      padding: '10px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {/* Volver a la app real. href='/' lleva al home. Lo ponemos primero
            para que sea el elemento más a la izquierda — patrón clásico de
            navegación back. */}
        <a
          href="/"
          aria-label="Volver a Benefix"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 99,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.85)',
            fontFamily: FN, fontSize: 11, fontWeight: 700,
            textDecoration: 'none', cursor: 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          <ArrowLeft size={12} strokeWidth={2.4} /> Volver
        </a>
        <Pill color={C.v} soft>Modo demo</Pill>
        <span style={{
          fontFamily: FI, fontSize: 12, color: 'rgba(255,255,255,0.65)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          Probá la app · los cambios se descartan al refrescar
        </span>
      </div>
      <button
        onClick={onCta}
        style={{
          background: G, border: 'none', borderRadius: 10,
          padding: '8px 16px', color: '#fff',
          fontFamily: FN, fontSize: 12, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap',
          boxShadow: '0 4px 18px rgba(254,80,0,.35)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        Activá tu Benefix <ArrowRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}

// ─── ROLE PICKER MODAL (al entrar) ───────────────────────────────────────────
function RolePickerModal({ onPick }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(5, 2, 12, 0.78)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'linear-gradient(180deg, rgba(28,18,42,0.96), rgba(18,10,28,0.96))',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 22, padding: '28px 24px 24px',
        boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 60px -20px ${C.v}55`,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `${C.v}22`, border: `1px solid ${C.v}55`,
            margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={26} color={C.v} strokeWidth={2} />
          </div>
          <div style={{
            fontFamily: FN, fontSize: 22, fontWeight: 800,
            color: C.white, marginBottom: 6, letterSpacing: '-.01em',
          }}>
            ¿Cómo querés ver Benefix?
          </div>
          <div style={{
            fontFamily: FI, fontSize: 13, color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.5, maxWidth: 320, margin: '0 auto',
          }}>
            Tocá un rol para empezar a explorar. Después podés cambiar al otro
            cuando quieras.
          </div>
        </div>

        {/* Comerciante */}
        <button
          onClick={() => onPick('commerce')}
          style={{
            width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 14,
            background: 'rgba(254,80,0,0.10)',
            border: '1.5px solid rgba(254,80,0,0.32)',
            color: C.white, cursor: 'pointer', marginBottom: 10,
            transition: 'background 180ms ease, border 180ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(254,80,0,0.18)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(254,80,0,0.10)' }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(254,80,0,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Store size={20} color={C.o} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FN, fontSize: 14, fontWeight: 800, marginBottom: 3 }}>
              Soy un comercio
            </div>
            <div style={{ fontFamily: FI, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
              Panel para gestionar tu club: clientes, premios, promos y más.
            </div>
          </div>
          <ChevronRight size={18} color={C.o} strokeWidth={2.5} />
        </button>

        {/* Cliente */}
        <button
          onClick={() => onPick('client')}
          style={{
            width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 14,
            background: `${C.v}1a`,
            border: `1.5px solid ${C.v}55`,
            color: C.white, cursor: 'pointer',
            transition: 'background 180ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${C.v}33` }}
          onMouseLeave={e => { e.currentTarget.style.background = `${C.v}1a` }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: `${C.v}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Wallet size={20} color={C.v} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FN, fontSize: 14, fontWeight: 800, marginBottom: 3 }}>
              Soy un cliente
            </div>
            <div style={{ fontFamily: FI, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
              Mi billetera de clubes con puntos, premios y cupones activos.
            </div>
          </div>
          <ChevronRight size={18} color={C.v} strokeWidth={2.5} />
        </button>

        <a
          href="/"
          style={{
            display: 'block', textAlign: 'center',
            marginTop: 16, fontFamily: FI, fontSize: 12,
            color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
          }}
        >
          ← Volver al home
        </a>
      </div>
    </div>
  )
}

// ─── ROLE SWITCHER (chip flotante para cambiar de rol) ───────────────────────
function RoleSwitcher({ mode, onSwitch }) {
  const isCommerce = mode === 'commerce'
  return (
    <button
      onClick={onSwitch}
      style={{
        position: 'fixed', bottom: 22, right: 22, zIndex: 50,
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '12px 18px', borderRadius: 99,
        background: 'rgba(15, 8, 28, 0.92)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        border: `1px solid ${C.v}66`,
        boxShadow: `0 12px 32px rgba(0,0,0,0.5), 0 0 32px -10px ${C.v}80`,
        color: C.white, cursor: 'pointer',
        fontFamily: FN, fontSize: 12, fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      <RefreshCw size={14} color={C.v} strokeWidth={2.5} />
      Ver como {isCommerce ? 'cliente' : 'comercio'}
    </button>
  )
}

// ─── CTA MODAL (al hacer click en "Activá tu Benefix") ───────────────────────
function CtaModal({ onClose }) {
  const benefits = [
    'Empezá gratis con el plan FREE — sin tarjeta de crédito',
    'Hasta 30 clientes activos en menos de 5 minutos',
    'Escáner QR desde tu celular, sin instalar nada',
    'Tus clientes se suman con su QR personal',
  ]
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(5, 2, 12, 0.78)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: 'linear-gradient(180deg, rgba(28,18,42,0.96), rgba(18,10,28,0.96))',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 22, padding: '32px 26px 24px',
          boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 60px -20px ${C.v}80`,
          textAlign: 'center', position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: C.mist, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
        >
          <X size={14} strokeWidth={2} />
        </button>

        <div style={{
          width: 60, height: 60, borderRadius: 18,
          background: G, margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 32px rgba(254,80,0,.4)',
        }}>
          <Sparkles size={28} color="#fff" strokeWidth={2} />
        </div>

        <div style={{
          fontFamily: FN, fontSize: 22, fontWeight: 800,
          color: C.white, marginBottom: 8, letterSpacing: '-.01em',
        }}>
          Activá tu Benefix
        </div>
        <div style={{
          fontFamily: FI, fontSize: 13, color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.6, marginBottom: 22,
        }}>
          En unos minutos tu club está vivo y tus clientes empiezan a sumar.
        </div>

        <div style={{ marginBottom: 22 }}>
          {benefits.map(b => (
            <div key={b} style={{
              display: 'flex', alignItems: 'flex-start', gap: 9,
              marginBottom: 8, textAlign: 'left',
            }}>
              <span style={{
                width: 16, height: 16, borderRadius: '50%',
                background: `${C.v}26`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>
                <Check size={9} color={C.v} strokeWidth={3.5} />
              </span>
              <span style={{ fontFamily: FI, fontSize: 12.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.45 }}>
                {b}
              </span>
            </div>
          ))}
        </div>

        <a
          href="/"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px', borderRadius: 14,
            background: G, color: '#fff',
            fontFamily: FN, fontSize: 14, fontWeight: 800,
            textDecoration: 'none', cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(254,80,0,.4), inset 0 1px 0 rgba(255,255,255,.18)',
          }}
        >
          Empezar ahora <ArrowRight size={16} strokeWidth={2.5} />
        </a>
        <button
          onClick={onClose}
          style={{
            marginTop: 12, background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
            fontFamily: FI, fontSize: 12,
          }}
        >
          Seguir explorando el demo
        </button>
      </div>
    </div>
  )
}

// ─── COMMERCE DEMO (panel del comerciante) ──────────────────────────────────
function CommerceDemo() {
  const [tab, setTab]     = useState('dashboard')
  const [prizes, setPrizes] = useState(DEMO_PRIZES_INIT)
  const [promos, setPromos] = useState(DEMO_PROMOS_INIT)
  const [savedFlash, setSavedFlash] = useState(false)
  // Inicializamos con un check del window real (cuando estamos en cliente)
  // para evitar el flash de "desktop layout" que aparecía en mobile entre
  // hydration y el primer useEffect. typeof window guard para SSR.
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  // Detectar mobile para colapsar el sidebar lateral en un top-nav
  // horizontal scrolleable. <768 es el breakpoint que usa el resto de la
  // app real para dividir mobile/desktop.
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function flashSaved() {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }

  // Computeds para automatizaciones
  const cheapestActive = prizes.filter(p => p.active).sort((a, b) => a.cost - b.cost)[0]
  const inactives      = DEMO_MEMBERS.filter(m => new Date(m.last) < new Date(daysAgo(7)))
  const nearPrize      = cheapestActive
    ? DEMO_MEMBERS.filter(m => m.points >= cheapestActive.cost * 0.8 && m.points < cheapestActive.cost)
    : []
  const firstVisit     = DEMO_MEMBERS.filter(m => m.visits === 1)
  const totalDetected  = inactives.length + nearPrize.length + firstVisit.length

  const TABS = [
    { id:'dashboard',       label:'Dashboard',       Icon: TrendingUp },
    { id:'clientes',        label:'Clientes',        Icon: Users      },
    { id:'premios',         label:'Premios',         Icon: Gift       },
    { id:'promociones',     label:'Promociones',     Icon: Percent    },
    { id:'automatizaciones',label:'Automatizaciones',Icon: Sparkles   },
    { id:'planes',          label:'Planes',          Icon: CreditCard },
    { id:'configuracion',   label:'Configuración',   Icon: Settings   },
  ]

  function H1({ children }) {
    return (
      <div style={{
        fontFamily: FN, fontSize: 18, fontWeight: 900,
        color: C.white, letterSpacing: '.08em',
        textTransform: 'uppercase', marginBottom: 14,
      }}>
        {children}
      </div>
    )
  }

  // Header del comercio (ícono A + nombre + plan). Lo definimos una sola vez
  // y lo reusamos en sidebar (desktop) y top-bar (mobile).
  const CommerceHeader = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: G,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FN, fontSize: 16, fontWeight: 900, color: '#fff',
        flexShrink: 0,
      }}>
        A
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: FN, fontSize: 13, fontWeight: 800,
          color: C.white, lineHeight: 1.2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          Aurora · Café & Brunch
        </div>
        <div style={{ fontFamily: FI, fontSize: 11, color: C.mist, marginTop: 2 }}>
          Cafetería · Plan PRO
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      maxWidth: 1180, margin: '0 auto',
      minHeight: 'calc(100vh - 50px)',
    }}>
      {isMobile ? (
        // ─── MOBILE: header del comercio + tabs horizontales scrolleables ───
        <div style={{
          position: 'sticky', top: 50, zIndex: 30,
          background: 'rgba(0, 0, 0, 0.86)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ padding: '12px 16px' }}>{CommerceHeader}</div>
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            gap: 6,
            padding: '0 14px 12px',
          }}>
            {TABS.map(({ id, label, Icon }) => {
              const active = tab === id
              const showBadge = id === 'automatizaciones' && totalDetected > 0
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px',
                    flexShrink: 0,
                    background: active ? `${C.v}1f` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? `${C.v}66` : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 99,
                    color: active ? C.white : C.mist,
                    fontFamily: FN, fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all .15s',
                  }}
                >
                  <Icon size={13} strokeWidth={active ? 2.4 : 2} color={active ? C.v : C.mist} />
                  <span>{label}</span>
                  {showBadge && (
                    <span style={{
                      fontFamily: FN, fontSize: 10, fontWeight: 700,
                      color: '#fff', background: C.v,
                      borderRadius: 99, padding: '1px 6px',
                    }}>
                      {totalDetected}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        // ─── DESKTOP: sidebar lateral fija ───
        <aside style={{
          width: 240, flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: '20px 0',
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 50, alignSelf: 'flex-start',
          height: 'calc(100vh - 50px)', overflowY: 'auto',
        }}>
          <div style={{
            padding: '0 18px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 10,
          }}>
            {CommerceHeader}
          </div>

          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id
            const showBadge = id === 'automatizaciones' && totalDetected > 0
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '11px 18px',
                  background: active ? `${C.v}1a` : 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${active ? C.v : 'transparent'}`,
                  color: active ? C.white : C.mist,
                  fontFamily: FN, fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all .15s',
                }}
              >
                <Icon size={15} strokeWidth={active ? 2.4 : 2} color={active ? C.v : C.mist} />
                <span style={{ flex: 1 }}>{label}</span>
                {showBadge && (
                  <span style={{
                    fontFamily: FN, fontSize: 10, fontWeight: 700,
                    color: '#fff', background: C.v,
                    borderRadius: 99, padding: '1px 7px',
                  }}>
                    {totalDetected}
                  </span>
                )}
              </button>
            )
          })}

          {/* Plan badge fondo (solo desktop, en mobile es ruido visual) */}
          <div style={{
            margin: 'auto 14px 14px', padding: '11px 13px',
            background: `${PLANS.pro.color}1a`,
            border: `1px solid ${PLANS.pro.color}55`,
            borderRadius: 11,
          }}>
            <div style={{
              fontFamily: FN, fontSize: 9, fontWeight: 800,
              color: PLANS.pro.color, letterSpacing: '.10em',
              textTransform: 'uppercase', marginBottom: 2,
            }}>
              Plan PRO activo
            </div>
            <div style={{ fontFamily: FI, fontSize: 11, color: C.mist }}>
              Todas las funciones desbloqueadas.
            </div>
          </div>
        </aside>
      )}

      {/* Content */}
      <main style={{
        flex: 1,
        padding: isMobile ? '20px 16px 100px' : '28px 28px 100px',
        minWidth: 0,
      }}>

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div>
            <div style={{
              fontFamily: FN, fontSize: 22, fontWeight: 900,
              color: C.white, marginBottom: 4, letterSpacing: '-.01em',
            }}>
              Hola Aurora · Café & Brunch
            </div>
            <div style={{ fontFamily: FI, fontSize: 13, color: C.mist, marginBottom: 24 }}>
              Tu panel de control en un vistazo.
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12, marginBottom: 18,
            }}>
              {[
                { Icon: TrendingUp, label: 'Visitas este mes',     val: '47',  color: C.v },
                { Icon: Users,      label: 'Activos esta semana',  val: '8',   color: C.ok },
                { Icon: Gift,       label: 'Canjes este mes',      val: '5',   color: C.o },
              ].map((s, i) => (
                <Card key={i} style={{ padding: '16px 18px' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 9,
                    background: `${s.color}26`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <s.Icon size={15} color={s.color} strokeWidth={2.2} />
                  </div>
                  <div style={{
                    fontFamily: FN, fontSize: 26, fontWeight: 900,
                    color: s.color, lineHeight: 1, marginBottom: 4,
                  }}>
                    {s.val}
                  </div>
                  <div style={{ fontFamily: FI, fontSize: 11, color: C.mist }}>
                    {s.label}
                  </div>
                </Card>
              ))}
            </div>

            <Card style={{ padding: '16px 18px', marginBottom: 14 }}>
              <div style={{
                fontFamily: FN, fontSize: 11, fontWeight: 800,
                color: C.mist, letterSpacing: '.08em',
                textTransform: 'uppercase', marginBottom: 12,
              }}>
                Actividad reciente
              </div>
              {DEMO_ACTIVITY.slice(0, 5).map((a, i) => {
                const Icon = a.type === 'visit' ? Star
                  : a.type === 'redeem' ? Gift
                  : Settings
                const color = a.type === 'visit' ? C.v
                  : a.type === 'redeem' ? C.o
                  : C.mist
                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    padding: '9px 0',
                    borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: `${color}1a`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={13} color={color} strokeWidth={2.2} />
                    </div>
                    <div style={{ flex: 1, fontFamily: FI, fontSize: 12.5, color: C.pearl }}>
                      {a.text}
                    </div>
                    <div style={{ fontFamily: FI, fontSize: 10.5, color: C.dust, whiteSpace: 'nowrap' }}>
                      {timeAgo(a.when)}
                    </div>
                  </div>
                )
              })}
            </Card>

            <Card style={{ padding: '16px 18px', border: `1px solid ${C.v}44` }} glow>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Sparkles size={18} color={C.v} strokeWidth={2.2} />
                <div style={{ fontFamily: FN, fontSize: 13, fontWeight: 800, color: C.white }}>
                  Automatizaciones activas
                </div>
              </div>
              <div style={{ fontFamily: FI, fontSize: 12.5, color: C.pearl, lineHeight: 1.55 }}>
                Detectamos <strong style={{ color: C.v, fontWeight: 700 }}>{totalDetected} clientes</strong> para
                contactar hoy.{' '}
                <button
                  onClick={() => setTab('automatizaciones')}
                  style={{
                    background: 'none', border: 'none',
                    color: C.v, cursor: 'pointer',
                    fontFamily: FI, fontSize: 12.5,
                    padding: 0, textDecoration: 'underline',
                    fontWeight: 600,
                  }}
                >
                  Ver lista →
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* CLIENTES */}
        {tab === 'clientes' && (
          <div>
            <H1>Clientes</H1>
            <div style={{ fontFamily: FI, fontSize: 12.5, color: C.mist, marginBottom: 18 }}>
              {DEMO_MEMBERS.length} clientes activos · Plan PRO sin límite
            </div>
            {DEMO_MEMBERS.map((m, i) => {
              const days = Math.floor((Date.now() - new Date(m.last).getTime()) / 86400000)
              const canRedeem = cheapestActive && m.points >= cheapestActive.cost
              return (
                <Card key={m.id} style={{
                  padding: '12px 14px', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <Avatar name={m.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: FN, fontSize: 13, fontWeight: 700,
                      color: C.white,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {m.name}
                    </div>
                    <div style={{ fontFamily: FI, fontSize: 11, color: C.mist, marginTop: 2 }}>
                      {m.visits} visita{m.visits !== 1 ? 's' : ''} · última {days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days}d`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontFamily: FN, fontSize: 16, fontWeight: 800, color: C.v,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {m.points}
                      <span style={{ fontSize: 11, color: 'rgba(189,75,248,0.65)', fontWeight: 600 }}>pts</span>
                    </div>
                    {canRedeem && (
                      <div style={{
                        fontFamily: FN, fontSize: 9, fontWeight: 700,
                        color: C.ok, marginTop: 2, letterSpacing: '.05em',
                      }}>
                        ¡puede canjear!
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* PREMIOS */}
        {tab === 'premios' && (
          <div>
            <H1>Premios</H1>
            {prizes.map(p => (
              <Card key={p.id} style={{
                padding: '14px 16px', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: p.active ? 1 : 0.55,
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 11,
                  background: `${C.v}22`, border: `1px solid ${C.v}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Gift size={20} color={C.v} strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FN, fontSize: 13, fontWeight: 700, color: C.white }}>
                    {p.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: FN, fontSize: 11, fontWeight: 700, color: C.v }}>
                      {p.cost} puntos
                    </span>
                    <span style={{ fontSize: 9, color: C.dust }}>·</span>
                    <span style={{ fontFamily: FI, fontSize: 11, color: C.dust }}>
                      {p.redeemed} canjes
                    </span>
                    {p.stock !== null && (
                      <>
                        <span style={{ fontSize: 9, color: C.dust }}>·</span>
                        <span style={{
                          fontFamily: FI, fontSize: 11,
                          color: p.stock <= 3 ? C.warn : C.dust,
                        }}>
                          stock {p.stock}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPrizes(ps => ps.map(x => x.id === p.id ? { ...x, active: !x.active } : x))}
                  style={{
                    background: p.active ? `${C.ok}22` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${p.active ? `${C.ok}66` : 'rgba(255,255,255,0.10)'}`,
                    color: p.active ? C.ok : C.dust,
                    borderRadius: 8, padding: '5px 10px',
                    fontFamily: FN, fontSize: 9.5, fontWeight: 700,
                    cursor: 'pointer', letterSpacing: '.06em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.active ? 'Activo' : 'Inactivo'}
                </button>
              </Card>
            ))}
            <button
              onClick={flashSaved}
              style={{
                width: '100%', marginTop: 4, padding: '14px',
                background: G, border: 'none', borderRadius: 14,
                color: '#fff', fontFamily: FN, fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 24px rgba(254,80,0,.3)',
              }}
            >
              <Plus size={15} strokeWidth={2.5} /> Crear premio
            </button>
            {savedFlash && (
              <div style={{
                marginTop: 12, padding: '10px 14px',
                background: `${C.ok}1a`, border: `1px solid ${C.ok}44`,
                borderRadius: 10, fontFamily: FI, fontSize: 12, color: C.ok,
                textAlign: 'center',
              }}>
                ✓ En la app real, acá abrís el editor para crear el premio
              </div>
            )}
          </div>
        )}

        {/* PROMOCIONES */}
        {tab === 'promociones' && (
          <div>
            <H1>Promociones</H1>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 10, marginBottom: 22,
            }}>
              {[
                { Icon: Percent, label: 'Cupón próxima visita', desc: '% de descuento al escanear el QR del cliente', color: C.o },
                { Icon: Zap,     label: 'Doble puntos',          desc: 'Multiplicá los puntos por días o periodo',     color: C.v },
              ].map((t, i) => (
                <Card key={i} style={{ padding: '16px 14px', cursor: 'pointer', border: `1px solid ${t.color}44` }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${t.color}26`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 10,
                  }}>
                    <t.Icon size={17} color={t.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ fontFamily: FN, fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 4 }}>
                    {t.label}
                  </div>
                  <div style={{ fontFamily: FI, fontSize: 11.5, color: C.mist, lineHeight: 1.5 }}>
                    {t.desc}
                  </div>
                </Card>
              ))}
            </div>

            <div style={{
              fontFamily: FN, fontSize: 11, fontWeight: 800,
              color: C.mist, letterSpacing: '.08em',
              textTransform: 'uppercase', marginBottom: 10,
            }}>
              Activas ahora ({promos.filter(p => p.active).length})
            </div>
            {promos.filter(p => p.active).map(p => (
              <Card key={p.id} style={{ padding: '14px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: p.type === 'discount_next' ? `${C.o}22` : `${C.v}22`,
                    border: `1px solid ${p.type === 'discount_next' ? `${C.o}55` : `${C.v}55`}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {p.type === 'discount_next'
                      ? <Percent size={16} color={C.o} strokeWidth={2.2} />
                      : <Zap size={16} color={C.v} strokeWidth={2.2} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FN, fontSize: 13, fontWeight: 700, color: C.white }}>
                      {p.description}
                    </div>
                    <div style={{ fontFamily: FI, fontSize: 11, color: C.mist, marginTop: 2 }}>
                      Vence {fmtDate(p.expires_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => setPromos(ps => ps.map(x => x.id === p.id ? { ...x, active: false } : x))}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: C.mist, borderRadius: 8,
                      padding: '5px 9px', cursor: 'pointer',
                      fontFamily: FN, fontSize: 10.5, fontWeight: 600,
                    }}
                  >
                    Desactivar
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* AUTOMATIZACIONES */}
        {tab === 'automatizaciones' && (() => {
          const segments = [
            { key:'reactivacion',  label:'Reactivar inactivos', desc:'Sin visitar hace más de 7 días', color:'#6366F1', list:inactives    },
            { key:'cercaPremio',   label:'Cerca del premio',    desc:`≥80% hacia "${cheapestActive?.name || ''}"`, color:'#F59E0B', list:nearPrize },
            { key:'primeraVisita', label:'Bienvenida 1ª visita',desc:'Primera visita en los últimos días',color:'#22C55E', list:firstVisit  },
          ]
          return (
            <div>
              <H1>Automatizaciones</H1>
              <div style={{ fontFamily: FI, fontSize: 12.5, color: C.mist, marginBottom: 20 }}>
                Detectamos oportunidades de venta para que actúes con un click.
              </div>
              {segments.map(s => (
                <Card key={s.key} style={{
                  padding: '16px 18px', marginBottom: 12,
                  border: s.list.length > 0 ? `1px solid ${s.color}44` : '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: `${s.color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Sparkles size={17} color={s.color} strokeWidth={2.2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FN, fontSize: 13.5, fontWeight: 700, color: C.white }}>
                        {s.label}
                      </div>
                      <div style={{ fontFamily: FI, fontSize: 11, color: C.mist, marginTop: 2 }}>
                        {s.desc}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontFamily: FN, fontSize: 22, fontWeight: 900,
                        color: s.list.length > 0 ? s.color : C.dust,
                        lineHeight: 1,
                      }}>
                        {s.list.length}
                      </div>
                      <div style={{ fontFamily: FI, fontSize: 9, color: C.dust, marginTop: 2 }}>
                        detectados
                      </div>
                    </div>
                  </div>
                  {s.list.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {s.list.slice(0, 4).map(m => (
                        <span key={m.id} style={{
                          fontFamily: FN, fontSize: 11, fontWeight: 600,
                          color: C.pearl, background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 99, padding: '4px 10px',
                        }}>
                          {m.name.split(' ')[0]}
                        </span>
                      ))}
                      {s.list.length > 4 && (
                        <span style={{
                          fontFamily: FN, fontSize: 11, fontWeight: 600,
                          color: C.mist, padding: '4px 10px',
                        }}>
                          + {s.list.length - 4} más
                        </span>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )
        })()}

        {/* PLANES */}
        {tab === 'planes' && (
          <div>
            <H1>Planes</H1>
            <div style={{
              padding: '14px 16px', borderRadius: 14, marginBottom: 22,
              background: `linear-gradient(135deg, ${PLANS.pro.color}22, ${PLANS.pro.color}10)`,
              border: `1px solid ${PLANS.pro.color}44`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: `${PLANS.pro.color}33`,
                border: `1px solid ${PLANS.pro.color}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CreditCard size={20} color={PLANS.pro.color} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: FN, fontSize: 9, fontWeight: 800,
                  color: C.dust, letterSpacing: '.10em',
                  textTransform: 'uppercase', marginBottom: 2,
                }}>
                  Tu plan actual
                </div>
                <div style={{
                  fontFamily: FN, fontSize: 16, fontWeight: 900,
                  color: PLANS.pro.color,
                }}>
                  PRO
                </div>
              </div>
            </div>
            <div style={{ fontFamily: FI, fontSize: 12.5, color: C.mist }}>
              En el demo todas las funciones están desbloqueadas. En la app real
              elegís el plan según tu necesidad y lo cambiás cuando quieras.
            </div>
          </div>
        )}

        {/* CONFIGURACIÓN */}
        {tab === 'configuracion' && (
          <div>
            <H1>Configuración</H1>
            <Card style={{ padding: '18px 20px', marginBottom: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 14, paddingBottom: 12,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <Store size={15} color={C.v} strokeWidth={2.2} />
                <span style={{ fontFamily: FN, fontSize: 12.5, fontWeight: 700, color: C.white }}>
                  Información del negocio
                </span>
              </div>
              {[
                { label:'Nombre',       val: DEMO_COMMERCE.name },
                { label:'Categoría',    val: DEMO_COMMERCE.categories.join(' · ') },
                { label:'Descripción',  val: DEMO_COMMERCE.description, area: true },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 12 }}>
                  <div style={{
                    fontFamily: FN, fontSize: 10.5, fontWeight: 700,
                    color: C.mist, letterSpacing: '.05em',
                    marginBottom: 6,
                  }}>
                    {f.label}
                  </div>
                  {f.area ? (
                    <textarea
                      defaultValue={f.val}
                      rows={3}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        borderRadius: 10, padding: '10px 13px',
                        fontFamily: FI, fontSize: 13, color: C.pearl,
                        width: '100%', boxSizing: 'border-box', resize: 'vertical',
                      }}
                    />
                  ) : (
                    <input
                      defaultValue={f.val}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        borderRadius: 10, padding: '10px 13px',
                        fontFamily: FI, fontSize: 13, color: C.pearl,
                        width: '100%', boxSizing: 'border-box',
                      }}
                    />
                  )}
                </div>
              ))}
            </Card>

            <Card style={{ padding: '18px 20px', marginBottom: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 14, paddingBottom: 12,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <Phone size={15} color={C.v} strokeWidth={2.2} />
                <span style={{ fontFamily: FN, fontSize: 12.5, fontWeight: 700, color: C.white }}>
                  Contacto
                </span>
              </div>
              {[
                { Icon: Phone,  label: 'Teléfono / WhatsApp', val: DEMO_COMMERCE.phone },
                { Icon: Camera, label: 'Instagram',           val: DEMO_COMMERCE.instagram },
                { Icon: MapPin, label: 'Dirección',           val: DEMO_COMMERCE.address },
                { Icon: Clock,  label: 'Horarios',            val: DEMO_COMMERCE.hours },
              ].map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 11,
                  padding: '10px 0',
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <f.Icon size={14} color={C.mist} strokeWidth={2} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FN, fontSize: 10.5, fontWeight: 700, color: C.dust, marginBottom: 2 }}>
                      {f.label}
                    </div>
                    <div style={{ fontFamily: FI, fontSize: 13, color: C.pearl, wordBreak: 'break-word' }}>
                      {f.val}
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            <button
              onClick={flashSaved}
              style={{
                width: '100%', padding: '13px',
                background: G, border: 'none', borderRadius: 12,
                color: '#fff', fontFamily: FN, fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(254,80,0,.3)',
              }}
            >
              {savedFlash ? '✓ Cambios guardados (demo)' : 'Guardar cambios'}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}

// ─── CLIENT DEMO (panel del cliente / billetera) ─────────────────────────────
function ClientDemo() {
  const [tab, setTab] = useState('billetera')

  const TABS = [
    { id:'billetera',  label:'Mi billetera',   Icon: Wallet },
    { id:'beneficios', label:'Mis beneficios', Icon: Gift   },
    { id:'historial',  label:'Historial',      Icon: Clock  },
    { id:'perfil',     label:'Perfil',         Icon: User   },
  ]

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px 18px 100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Avatar name={DEMO_CLIENT_PROFILE.name} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FN, fontSize: 11, fontWeight: 700,
            color: C.mist, letterSpacing: '.08em',
            textTransform: 'uppercase', marginBottom: 2,
          }}>
            Hola
          </div>
          <div style={{
            fontFamily: FN, fontSize: 17, fontWeight: 900,
            color: C.white, lineHeight: 1.1, letterSpacing: '-.01em',
          }}>
            {DEMO_CLIENT_PROFILE.name}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 18,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          const isWallet = id === 'billetera'
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, padding: '10px 4px',
                background: 'transparent', border: 'none',
                cursor: 'pointer',
                color: active
                  ? (isWallet ? '#EC4899' : C.white)
                  : (isWallet ? 'rgba(236,72,153,0.65)' : C.mist),
                fontFamily: FN, fontSize: 11.5,
                fontWeight: active ? 800 : 600,
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}
            >
              <Icon size={15} strokeWidth={active ? 2.4 : 2} />
              <span style={{ fontSize: 10.5 }}>{label}</span>
              {active && (
                <div style={{
                  position: 'absolute', bottom: -1, left: '20%', right: '20%',
                  height: 2, borderRadius: 2,
                  background: isWallet ? '#EC4899' : C.v,
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* BILLETERA */}
      {tab === 'billetera' && (
        <div>
          <div style={{ fontFamily: FI, fontSize: 12, color: C.mist, marginBottom: 14 }}>
            {DEMO_CLIENT_MEMBERSHIPS.length} clubes activos
          </div>
          {DEMO_CLIENT_MEMBERSHIPS.map(m => {
            const balance = m.commerce.prog_type === 'stars' ? m.stars : m.points
            const unit    = m.commerce.prog_type === 'stars' ? 'estrella' : 'punto'
            const pct     = m.nextPrize ? Math.min(100, Math.round((balance / m.nextPrize.cost) * 100)) : 0
            return (
              <div key={m.id} style={{
                background: `linear-gradient(135deg, ${m.color}26, ${m.color}10)`,
                border: `1px solid ${m.color}55`,
                borderRadius: 18, padding: '18px 18px 16px',
                marginBottom: 14,
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Cupón activo, si lo tiene */}
                {m.activeCoupon && (
                  <div style={{
                    position: 'absolute', top: 14, right: 14,
                    background: C.o, color: '#fff',
                    fontFamily: FN, fontSize: 10, fontWeight: 800,
                    padding: '4px 9px', borderRadius: 99,
                    letterSpacing: '.06em', textTransform: 'uppercase',
                    boxShadow: `0 4px 14px rgba(254,80,0,.4)`,
                  }}>
                    {m.activeCoupon.value}% OFF
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `${m.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <m.Icon size={18} color={m.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: FN, fontSize: 14, fontWeight: 800,
                      color: C.white, lineHeight: 1.2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {m.commerce.name}
                    </div>
                    <div style={{ fontFamily: FI, fontSize: 11, color: C.mist, marginTop: 2 }}>
                      {m.commerce.categories.join(' · ')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <span style={{
                    fontFamily: FN, fontSize: 30, fontWeight: 900,
                    color: m.color, lineHeight: 1,
                  }}>
                    {balance}
                  </span>
                  <span style={{ fontFamily: FI, fontSize: 12, color: C.mist }}>
                    {unit}{balance !== 1 ? 's' : ''}
                  </span>
                </div>

                {m.nextPrize && (
                  <>
                    <div style={{ fontFamily: FI, fontSize: 11.5, color: C.pearl, marginBottom: 7 }}>
                      Te faltan <strong style={{ color: m.color, fontWeight: 700 }}>{m.nextPrize.missing}</strong> para{' '}
                      <strong style={{ color: C.white, fontWeight: 700 }}>{m.nextPrize.name}</strong>
                    </div>
                    <div style={{ height: 5, borderRadius: 5, background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: m.color, borderRadius: 5,
                        boxShadow: `0 0 12px ${m.color}80`,
                      }} />
                    </div>
                  </>
                )}

                {m.activeCoupon && (
                  <div style={{
                    marginTop: 12, padding: '9px 11px',
                    background: 'rgba(254,80,0,0.12)',
                    border: '1px solid rgba(254,80,0,0.32)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <Percent size={12} color={C.o} strokeWidth={2.4} />
                    <span style={{ fontFamily: FI, fontSize: 11, color: C.pearl, flex: 1 }}>
                      {m.activeCoupon.label}
                    </span>
                    <span style={{ fontFamily: FN, fontSize: 10, color: 'rgba(254,80,0,0.85)', fontWeight: 700 }}>
                      vence {fmtDate(m.activeCoupon.expires_at)}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MIS BENEFICIOS */}
      {tab === 'beneficios' && (
        <div>
          <div style={{ fontFamily: FI, fontSize: 12, color: C.mist, marginBottom: 14 }}>
            {DEMO_CLIENT_PRIZES.length} beneficios disponibles en tus clubes
          </div>
          {DEMO_CLIENT_PRIZES
            .sort((a, b) => {
              const aCanRedeem = a.balance >= a.cost
              const bCanRedeem = b.balance >= b.cost
              if (aCanRedeem !== bCanRedeem) return aCanRedeem ? -1 : 1
              return (b.balance / b.cost) - (a.balance / a.cost)
            })
            .map(p => {
              const canRedeem = p.balance >= p.cost
              const pct = Math.min(100, Math.round((p.balance / p.cost) * 100))
              return (
                <Card key={p.id} style={{ padding: '14px 16px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 11,
                      background: `${p.color}26`,
                      border: `1px solid ${p.color}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <p.Icon size={20} color={p.color} strokeWidth={2.2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: FN, fontSize: 13, fontWeight: 700,
                        color: C.white, lineHeight: 1.2,
                      }}>
                        {p.name}
                      </div>
                      <div style={{
                        fontFamily: FI, fontSize: 11, color: C.mist, marginTop: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {p.commerce}
                      </div>
                      <div style={{
                        fontFamily: FN, fontSize: 11, fontWeight: 700,
                        color: p.color, marginTop: 4,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        {p.isStars
                          ? <Star size={11} fill={p.color} stroke="none" />
                          : <Sparkles size={11} strokeWidth={2.4} />
                        }
                        {p.cost} {p.isStars ? 'estrella' : 'punto'}{p.cost !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {canRedeem ? (
                      <button style={{
                        background: p.color, border: 'none',
                        color: '#fff', borderRadius: 10,
                        padding: '8px 14px', cursor: 'pointer',
                        fontFamily: FN, fontSize: 11, fontWeight: 700,
                        whiteSpace: 'nowrap',
                        boxShadow: `0 6px 18px ${p.color}66`,
                      }}>
                        Canjear
                      </button>
                    ) : (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: FN, fontSize: 11, fontWeight: 700, color: C.mist }}>
                          {p.balance}/{p.cost}
                        </div>
                        <div style={{ width: 50, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginTop: 4 }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: p.color, borderRadius: 4,
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })
          }
        </div>
      )}

      {/* HISTORIAL */}
      {tab === 'historial' && (
        <div>
          <div style={{ fontFamily: FI, fontSize: 12, color: C.mist, marginBottom: 14 }}>
            Tu actividad reciente
          </div>
          {DEMO_CLIENT_HISTORY.map(h => {
            const Icon = h.kind === 'visit' ? Star
              : h.kind === 'redeem' ? Gift
              : UserPlus
            const color = h.kind === 'visit' ? C.v
              : h.kind === 'redeem' ? C.o
              : C.ok
            return (
              <Card key={h.id} style={{
                padding: '12px 14px', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: `${color}1f`, border: `1px solid ${color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={14} color={color} strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: FN, fontSize: 12.5, fontWeight: 700,
                    color: C.white, lineHeight: 1.3,
                  }}>
                    {h.label}
                  </div>
                  <div style={{
                    fontFamily: FI, fontSize: 11, color: C.mist, marginTop: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {h.commerce}
                  </div>
                </div>
                <div style={{ fontFamily: FI, fontSize: 10.5, color: C.dust, whiteSpace: 'nowrap' }}>
                  {timeAgo(h.when)}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* PERFIL */}
      {tab === 'perfil' && (
        <div>
          <Card style={{ padding: '20px 18px', marginBottom: 14, textAlign: 'center' }}>
            <Avatar name={DEMO_CLIENT_PROFILE.name} size={70} />
            <div style={{
              fontFamily: FN, fontSize: 17, fontWeight: 800,
              color: C.white, marginTop: 12, letterSpacing: '-.01em',
            }}>
              {DEMO_CLIENT_PROFILE.name}
            </div>
            <div style={{ fontFamily: FI, fontSize: 12, color: C.mist, marginTop: 3 }}>
              {DEMO_CLIENT_PROFILE.email}
            </div>
          </Card>

          <Card style={{ padding: '0' }}>
            {[
              { Icon: Wallet,  label: 'Mis clubes',     val: `${DEMO_CLIENT_MEMBERSHIPS.length} activos` },
              { Icon: Gift,    label: 'Beneficios',     val: `${DEMO_CLIENT_PRIZES.length} disponibles` },
              { Icon: Phone,   label: 'Teléfono',       val: DEMO_CLIENT_PROFILE.phone },
              { Icon: Bell,    label: 'Notificaciones', val: 'Activas' },
            ].map((it, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: `${C.v}1f`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <it.Icon size={14} color={C.v} strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FN, fontSize: 12, fontWeight: 700, color: C.white }}>
                    {it.label}
                  </div>
                  <div style={{ fontFamily: FI, fontSize: 11, color: C.mist, marginTop: 1 }}>
                    {it.val}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── DEMO PAGE (root) ────────────────────────────────────────────────────────
export default function DemoPage() {
  const [mode, setMode]       = useState(null)   // null | 'commerce' | 'client'
  const [showCta, setShowCta] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <DemoBanner onCta={() => setShowCta(true)} />

      {mode === 'commerce' && <CommerceDemo />}
      {mode === 'client'   && <ClientDemo />}

      {mode === null && <RolePickerModal onPick={setMode} />}
      {mode !== null && (
        <RoleSwitcher
          mode={mode}
          onSwitch={() => setMode(mode === 'commerce' ? 'client' : 'commerce')}
        />
      )}
      {showCta && <CtaModal onClose={() => setShowCta(false)} />}
    </div>
  )
}
