'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Home, Gift, QrCode, User, Users,
  ChevronLeft, ChevronDown, ChevronRight,
  MapPin, Clock, Camera,
  Flame, Star, Gem, Sparkles,
  Coffee, Scissors, Utensils, ShoppingBag, Wrench, Building2,
  Shield, MessageCircle, ArrowRight, Check, Smartphone,
  ScanLine, LogOut,
} from 'lucide-react'
import PhoneInput from '../../../lib/PhoneInput'

// Feature flag — sistema de reseñas/rating apagado hasta tener masa crítica.
// Sincronizado con el flag del mismo nombre en app/page.js.
const REVIEWS_ENABLED = false

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  bg:      'transparent',
  bg2:     'rgba(255,255,255,0.05)',
  bg3:     'rgba(255,255,255,0.04)',
  card:    'rgba(255,255,255,0.06)',
  cardHov: 'rgba(255,255,255,0.10)',
  rim:     'rgba(255,255,255,0.10)',
  rimH:    'rgba(255,255,255,0.20)',
  white:   '#ffffff',
  pearl:   '#f0f0ff',
  mist:    '#a1a1aa',
  dust:    '#71717a',
  v:       '#a855f7',
  pink:    '#ec4899',
  o:       '#FE5000',
  ok:      '#22E698',
  okBg:    'rgba(0,31,16,0.8)',
}

const G   = 'linear-gradient(135deg, #FE5000, #a855f7)'
const GA  = 'linear-gradient(135deg, #a855f7, #ec4899)'

const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

const DAYS_MAP = { lunes:'Lu', martes:'Ma', miércoles:'Mi', jueves:'Ju', viernes:'Vi', sábado:'Sa', domingo:'Do' }
const CAT_ICON = { cafe:Coffee, barber:Scissors, restaurant:Utensils, health:Building2, fashion:ShoppingBag, services:Wrench }


// ── Global CSS ─────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;900&family=Inter:wght@400;500;600;700&display=swap');
  @keyframes spin        { to { transform: rotate(360deg) } }
  @keyframes fadeUp      { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn      { from { opacity:0 } to { opacity:1 } }
  @keyframes slideDown   { from { opacity:0; transform:translateY(-16px) } to { opacity:1; transform:translateY(0) } }
  @keyframes levelPop    { 0%{transform:scale(.7) rotate(-8deg)} 60%{transform:scale(1.15) rotate(3deg)} 100%{transform:scale(1) rotate(0)} }
  @keyframes pulse       { 0%,100%{opacity:1} 50%{opacity:.45} }
  @keyframes shimmer     { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes glowPulse   { 0%,100%{box-shadow:0 0 20px rgba(168,85,247,0.3)} 50%{box-shadow:0 0 40px rgba(168,85,247,0.6)} }
  @keyframes cardIn      { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes gradient-slow {
    0%,100% { background-position: 0% 50%; }
    50%     { background-position: 100% 50%; }
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  html,body { background:#0a0a0f; }
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-thumb { background:rgba(168,85,247,0.4); border-radius:2px; }
  .animate-gradient-slow {
    background-size: 200% 200%;
    animation: gradient-slow 8s ease infinite;
  }
  .glass-card {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.10);
    transition: all 0.25s ease;
  }
  .glass-card:hover {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.18);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
  }
  .prize-card {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
  }
  .prize-card:hover {
    background: rgba(255,255,255,0.09);
    border-color: rgba(168,85,247,0.35);
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 16px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(168,85,247,0.15);
  }
  .info-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    padding: 14px 16px;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  .info-row:hover {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.18);
  }
  .btn-pulse:active { transform: scale(0.97) !important; opacity:0.9 !important; }
  .nav-tab { transition: all 0.2s ease; }
  .nav-tab:hover { color: rgba(255,255,255,0.8) !important; }
`

// ── Skeleton loader ────────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 16, r = 8, mb = 0 }) {
  return (
    <div style={{
      width:w, height:h, borderRadius:r, marginBottom:mb,
      background:'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
      backgroundSize:'200% 100%',
      animation:'shimmer 1.6s infinite',
    }} />
  )
}

function PageSkeleton() {
  return (
    <div style={{ minHeight:'100vh', background:C.bg }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ height:'70vh', minHeight:500, background:'rgba(255,255,255,0.04)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.8s infinite' }} />
      </div>
      <div style={{ maxWidth:600, margin:'0 auto', padding:'24px 16px' }}>
        <Skeleton h={28} r={8} mb={12} w="60%" />
        <Skeleton h={14} r={6} mb={8} w="40%" />
        <div style={{ height:24 }} />
        <Skeleton h={120} r={20} mb={12} />
        <Skeleton h={80}  r={16} mb={8}  />
        <Skeleton h={80}  r={16} mb={8}  />
      </div>
    </div>
  )
}

// ── Level badge ────────────────────────────────────────────────────────────────
// ── Splash ─────────────────────────────────────────────────────────────────────
function Splash({ commerce, UnitIcon, unitIconProps, unitLabel, onClose }) {
  const [vis, setVis] = useState(false)
  useEffect(() => { setTimeout(() => setVis(true), 40) }, [])
  function close() { setVis(false); setTimeout(onClose, 340) }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background: vis ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0)',
      backdropFilter: vis ? 'blur(20px)' : 'blur(0px)',
      WebkitBackdropFilter: vis ? 'blur(20px)' : 'blur(0px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
      transition:'all .34s ease',
    }} onClick={close}>
      <div style={{
        background:'rgba(255,255,255,0.06)',
        backdropFilter:'blur(24px)',
        WebkitBackdropFilter:'blur(24px)',
        border:'1px solid rgba(255,255,255,0.12)',
        borderRadius:28, padding:'36px 28px 28px',
        maxWidth:380, width:'100%', textAlign:'center',
        transform: vis ? 'scale(1) translateY(0)' : 'scale(.88) translateY(28px)',
        opacity: vis ? 1 : 0,
        transition:'all .34s cubic-bezier(.34,1.56,.64,1)',
        position:'relative', overflow:'hidden',
        boxShadow:'0 40px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ position:'absolute', top:-60, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(168,85,247,0.12)', filter:'blur(50px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, left:-30, width:160, height:160, borderRadius:'50%', background:'rgba(236,72,153,0.10)', filter:'blur(40px)', pointerEvents:'none' }} />

        <div style={{ width:84, height:84, borderRadius:24, background:GA, display:'flex', alignItems:'center', justifyContent:'center', fontSize:38, margin:'0 auto 20px', boxShadow:'0 16px 48px rgba(168,85,247,0.5)', position:'relative', zIndex:1 }}>
          {commerce.img_url
            ? <img src={commerce.img_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:24 }} />
            : <CatIcon category={commerce.category} size={38} color="#fff" />
          }
        </div>

        <div style={{ fontFamily:FN, fontSize:24, fontWeight:900, color:C.white, marginBottom:4, lineHeight:1.1, position:'relative', zIndex:1 }}>
          {commerce.name}
        </div>
        {commerce.city && (
          <div style={{ fontSize:12, color:C.mist, marginBottom:20, position:'relative', zIndex:1 }}>
            <MapPin size={12} strokeWidth={2.5} style={{display:'inline',verticalAlign:'middle',marginRight:3}} /> {commerce.city.name}, {commerce.city.province}
          </div>
        )}

        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'16px 18px', marginBottom:24, textAlign:'left', position:'relative', zIndex:1 }}>
          <div style={{ fontSize:10, color:C.mist, marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.1em' }}>Cómo funciona</div>
          {[
            { Icon:UnitIcon, iconProps:unitIconProps, text:`Sumás ${unitLabel} en cada visita` },
            { Icon:Gift,     iconProps:{strokeWidth:2},  text:'Canjeás premios exclusivos' },
            { Icon:Smartphone, iconProps:{strokeWidth:2}, text:'Tu QR personal siempre a mano' },
          ].map(b => (
            <div key={b.text} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <b.Icon size={18} color="rgba(255,255,255,0.8)" {...b.iconProps} />
              <span style={{ fontSize:13, color:C.pearl }}>{b.text}</span>
            </div>
          ))}
        </div>

        {/* Socios escondidos en perfiles de club — no aporta valor exponer la
            cantidad y mostrar 0 desincentiva al primer cliente. */}

        <button onClick={close} className="btn-pulse" style={{
          width:'100%', padding:'15px', background:GA, border:'none', borderRadius:16,
          color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:'pointer',
          boxShadow:'0 8px 28px rgba(168,85,247,0.45)', transition:'all .2s ease',
          position:'relative', zIndex:1,
        }}>
          Ver el club →
        </button>
      </div>
    </div>
  )
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = GA, height = 8, glow = true }) {
  return (
    <div style={{ height, borderRadius:99, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
      <div style={{
        height:'100%', width:`${pct}%`, borderRadius:99,
        background: color,
        boxShadow: glow ? '0 0 12px rgba(168,85,247,0.5)' : 'none',
        transition:'width .7s cubic-bezier(.4,0,.2,1)',
      }} />
    </div>
  )
}

// ── Star row (display only) ────────────────────────────────────────────────────
function StarRow({ rating, size = 14 }) {
  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size} strokeWidth={0} fill="currentColor" style={{ color: s <= Math.round(rating) ? '#ec4899' : 'rgba(236,72,153,0.2)' }} />
      ))}
    </div>
  )
}

// ── Category icon helper ────────────────────────────────────────────────────────
function CatIcon({ category, size=20, color='currentColor' }) {
  const Ic = CAT_ICON[category] || Building2
  return <Ic size={size} strokeWidth={2} color={color} />
}

// ── Glass card wrapper ─────────────────────────────────────────────────────────
function GlassCard({ children, style = {}, hover = true, onClick, className }) {
  return (
    <div
      className={`${hover ? 'glass-card' : ''} ${className || ''}`}
      onClick={onClick}
      style={{
        background:'rgba(255,255,255,0.05)',
        backdropFilter:'blur(16px)',
        WebkitBackdropFilter:'blur(16px)',
        border:'1px solid rgba(255,255,255,0.10)',
        borderRadius:20,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Logo (idéntico al del home) ────────────────────────────────────────────────
function Logo() {
  const sz = 34
  return (
    <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
      <div style={{ width:sz, height:sz, borderRadius:Math.round(sz*.28), background:G, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px #FE500044', flexShrink:0 }}>
        <svg width={sz*.72} height={sz*.72} viewBox="0 0 28 28" fill="none">
          <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
          <rect x="16" y="5.5" width="8" height="5" rx="2.5" fill="white" opacity=".9"/>
          <rect x="16" y="12" width="9" height="5.5" rx="2.75" fill="white"/>
        </svg>
      </div>
      <div>
        <div style={{ fontFamily:FN, fontSize:14, fontWeight:900, color:C.white, lineHeight:1, letterSpacing:'-.01em' }}>club de</div>
        <div style={{ fontFamily:FN, fontSize:15, fontWeight:900, lineHeight:1, letterSpacing:'-.01em', background:G, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>beneficios</div>
      </div>
    </a>
  )
}


// ── Bottom Nav ─────────────────────────────────────────────────────────────────
function SlideToJoinButton({ onJoin, isDemoClub }) {
  const [slideX, setSlideX]       = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const containerRef = useRef(null)

  const maxSlide = () => (containerRef.current?.offsetWidth || 344) - 64

  const handleStart = () => { if (!isDemoClub) setIsDragging(true) }

  const handleMove = (clientX) => {
    if (!isDragging || isComplete || isDemoClub) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setSlideX(Math.max(0, Math.min(clientX - rect.left - 32, maxSlide())))
  }

  const handleEnd = () => {
    if (isDemoClub) return
    setIsDragging(false)
    const max = maxSlide()
    if (slideX >= max * 0.85) {
      setIsComplete(true)
      setSlideX(max)
      setTimeout(onJoin, 300)
    } else {
      setSlideX(0)
    }
  }

  const fillOpacity = maxSlide() > 0 ? slideX / maxSlide() : 0

  return (
    <div
      ref={containerRef}
      style={{
        position:'relative', width:'100%', height:64,
        background:'rgba(168,85,247,0.08)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        border:'1px solid rgba(168,85,247,0.35)',
        borderRadius:9999, overflow:'hidden',
        userSelect:'none',
        cursor: isDemoClub ? 'default' : 'pointer',
        boxShadow:'0 0 24px rgba(168,85,247,0.15)',
      }}
      onMouseMove={e => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchMove={e => { e.preventDefault(); handleMove(e.touches[0].clientX) }}
      onTouchEnd={handleEnd}
    >
      {/* Gradiente de fondo base (siempre visible, sutil) */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(135deg, #a855f7, #ec4899)',
        opacity: 0.12,
        pointerEvents:'none',
      }} />

      {/* Relleno de gradiente al deslizar */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(135deg, #a855f7, #ec4899)',
        opacity: fillOpacity * 0.88,
        transition: isDragging ? 'none' : 'opacity 0.3s ease',
        pointerEvents:'none',
      }} />

      {/* Texto central */}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        <span style={{ color:'rgba(255,255,255,0.9)', fontSize:14, fontFamily:FN, fontWeight:600, opacity: slideX > 50 ? 0 : 1, transition:'opacity 0.2s', letterSpacing:'-0.01em' }}>
          {isDemoClub ? 'Negocio de ejemplo' : 'Deslizá para unirte'}
        </span>
        <span style={{ color:'#fff', fontSize:14, fontFamily:FN, fontWeight:600, position:'absolute', opacity: isComplete ? 1 : 0, transition:'opacity 0.3s' }}>
          ¡Bienvenido!
        </span>
      </div>

      {/* Flechas */}
      <div style={{ position:'absolute', left:72, top:0, bottom:0, display:'flex', alignItems:'center', gap:1, pointerEvents:'none', opacity: slideX > 30 ? 0 : 1, transition:'opacity 0.2s' }}>
        <ChevronRight size={16} color="rgba(168,85,247,0.9)" className="animate-arrow" style={{ animationDelay:'0ms' }} />
        <ChevronRight size={16} color="rgba(168,85,247,0.6)" className="animate-arrow" style={{ animationDelay:'200ms' }} />
        <ChevronRight size={16} color="rgba(168,85,247,0.35)" className="animate-arrow" style={{ animationDelay:'400ms' }} />
      </div>

      {/* Thumb */}
      <div
        style={{
          position:'absolute', top:4, left:4,
          width:56, height:56,
          background: isComplete
            ? 'linear-gradient(135deg, #22c55e, #10b981)'
            : 'linear-gradient(135deg, #a855f7, #ec4899)',
          borderRadius:'50%',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 20px rgba(168,85,247,0.55)',
          transform:`translateX(${slideX}px)`,
          transition: isDragging ? 'background 0.3s ease' : 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease',
          cursor: isDemoClub ? 'default' : 'grab',
          flexShrink:0,
        }}
        onMouseDown={e => { if (!isDemoClub) { e.preventDefault(); handleStart() } }}
        onTouchStart={e => { if (!isDemoClub) { e.preventDefault(); handleStart() } }}
      >
        {isComplete
          ? <Check size={24} color="#fff" strokeWidth={2.5} />
          : <ArrowRight size={22} color="#fff" strokeWidth={2.5} />
        }
      </div>
    </div>
  )
}

function MemberBadge({ createdAt }) {
  const since = createdAt
    ? new Date(createdAt).toLocaleDateString('es-AR', { month:'long', year:'numeric' })
    : null
  return (
    <div style={{
      width:'100%',
      background:'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.15))',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      border:'1px solid rgba(168,85,247,0.30)',
      borderRadius:16, padding:16,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{
          width:40, height:40, borderRadius:'50%', flexShrink:0,
          background:'linear-gradient(135deg, #a855f7, #ec4899)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Check size={20} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ color:'#fff', fontSize:14, fontWeight:600, fontFamily:FN, margin:0 }}>Ya sos parte del club</p>
          {since && <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, margin:'2px 0 0', fontFamily:FI }}>Miembro desde {since}</p>}
        </div>
      </div>
    </div>
  )
}

// ClubHistory — lista combinada de visitas + canjes del cliente en este comercio.
// Carga directo desde supabase con el cliente normal (RLS restringe al propio user).
function ClubHistory({ user, commerceId, unitLabel, unitColor, UnitIcon, unitIconProps }) {
  const [visits,      setVisits]      = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!user?.id || !commerceId) return
    let cancelled = false
    ;(async () => {
      try {
        const sb = getSupabase()
        const [{ data: vData }, { data: rData }] = await Promise.all([
          sb.from('visits')
            .select('id, scanned_at, points_earned, amount_spent')
            .eq('user_id', user.id).eq('commerce_id', commerceId)
            .order('scanned_at', { ascending: false }).limit(50),
          sb.from('redemptions')
            .select('id, redeemed_at, points_spent, prize:prizes(name)')
            .eq('user_id', user.id).eq('commerce_id', commerceId)
            .order('redeemed_at', { ascending: false }).limit(50),
        ])
        if (!cancelled) {
          setVisits(vData || [])
          setRedemptions(rData || [])
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id, commerceId])

  const items = [
    ...visits.map(v => ({ kind:'visit', date: v.scanned_at, points: v.points_earned, amount: v.amount_spent, id: 'v-'+v.id })),
    ...redemptions.map(r => ({ kind:'redeem', date: r.redeemed_at, points: r.points_spent, prizeName: r.prize?.name, id: 'r-'+r.id })),
  ].sort((a,b) => new Date(b.date) - new Date(a.date))

  if (loading) {
    return <div style={{ textAlign:'center', padding:'40px 0', color:C.dust, fontSize:13 }}>Cargando...</div>
  }
  if (items.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'40px 20px 20px' }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(168,85,247,0.12)', border:'1px solid rgba(168,85,247,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Clock size={28} strokeWidth={1.5} color={C.v} />
          </div>
        </div>
        <div style={{ fontFamily:FN, fontSize:16, fontWeight:600, color:C.white, marginBottom:8 }}>Sin movimientos todavía</div>
        <div style={{ fontSize:12, color:C.mist, lineHeight:1.6, maxWidth:280, margin:'0 auto' }}>
          Tus visitas y canjes en este negocio van a aparecer acá.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {items.map(it => {
        const d = new Date(it.date)
        const dateStr = d.toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'2-digit' })
        const timeStr = d.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' })
        const isVisit = it.kind === 'visit'
        return (
          <div key={it.id} style={{
            display:'flex', alignItems:'center', gap:12,
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:12, padding:'12px 14px',
          }}>
            <div style={{ width:38, height:38, borderRadius:10, background: isVisit ? 'rgba(168,85,247,0.12)' : 'rgba(236,72,153,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {isVisit
                ? <UnitIcon size={16} {...unitIconProps} color={unitColor} />
                : <Gift size={16} color="#EC4899" strokeWidth={2} />}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:FN, fontSize:13, fontWeight:600, color:C.white, marginBottom:2 }}>
                {isVisit ? `Visita registrada` : `Canje: ${it.prizeName || 'Premio'}`}
              </div>
              <div style={{ fontSize:11, color:C.mist }}>{dateStr} · {timeStr}{isVisit && it.amount > 0 ? ` · $${Number(it.amount).toLocaleString('es-AR')}` : ''}</div>
            </div>
            <div style={{ flexShrink:0, fontFamily:FN, fontSize:13, fontWeight:700, color: isVisit ? unitColor : '#EC4899' }}>
              {isVisit ? `+${it.points || 1}` : `-${it.points || 0}`} {unitLabel === 'estrellas' ? '★' : 'pts'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Nav de pestañas — pegado arriba abajo del navbar global, con gradient
// naranja-violeta. Mismo formato que el nav cliente (Mis Clubs / Historial / Mi QR).
function ClubTopNav({ tab, setTab, prizesCount }) {
  const TABS = [
    { id:'inicio',    label:'Inicio'   },
    { id:'premios',   label:'Premios', badge: prizesCount },
    { id:'historial', label:'Historial' },
  ]
  return (
    <nav style={{
      background: 'linear-gradient(135deg, #FE5000, #BD4BF8)',
      boxShadow: '0 8px 24px -8px rgba(0,0,0,0.45)',
    }}>
      <div style={{
        maxWidth: 520, margin: '0 auto',
        display: 'flex', alignItems: 'stretch', justifyContent: 'center',
        padding: '12px 16px',
      }}>
        {TABS.map(({ id, label, badge }, i) => {
          const active = tab === id
          const isLast = i === TABS.length - 1
          return (
            <button key={id}
              onClick={() => setTab(id)}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                borderRight: isLast ? 'none' : '1px solid rgba(255,255,255,0.35)',
                color: '#fff',
                fontFamily: FN,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                letterSpacing: '.02em',
                opacity: active ? 1 : 0.78,
                padding: '4px 8px',
                cursor: 'pointer',
                transition: 'opacity 180ms ease, font-weight 180ms ease, transform 160ms cubic-bezier(0.23,1,0.32,1)',
                position: 'relative',
              }}>
              {label}
              {badge > 0 && (
                <span style={{
                  position:'absolute', top:-6, right: isLast ? 0 : 6,
                  background:'rgba(255,255,255,0.95)', color:'#7C3AED',
                  fontSize:9, fontWeight:800, fontFamily:FN,
                  borderRadius:9999, padding:'1px 5px',
                  minWidth:16, textAlign:'center', lineHeight:1.5,
                }}>{badge}</span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Demo data (slug: cafe-berlin) ─────────────────────────────────────────────
const CAFE_BERLIN_DEMO = {
  ok: true,
  commerce: {
    id: 'demo-cafe-berlin', name: 'Café Berlín', category: 'cafe',
    prog_type: 'points', prog_goal: 30, prog_pts: 1,
    description: 'El mejor espresso de la ciudad. Pastelería artesanal, desayunos especiales y espacio de trabajo para los que aman el café de verdad.',
    address: 'Corrientes 1420, Buenos Aires', lat: -34.6037, lng: -58.3816,
    phone: '1140001234', hours: 'Lun–Vie 7:30–20 · Sáb 8–14',
    instagram: '@cafeberlin.ar', facebook: 'facebook.com/cafeberlin',
    img_url: '', logo_url: '', slug: 'cafe-berlin',
    city: { name: 'Buenos Aires', province: 'CABA' },
    member_count: 84,
  },
  prizes: [
    { id: 'dp1', name: 'Café gratis',      cost: 10, active: true,  stock: null, img_url: '' },
    { id: 'dp2', name: 'Medialunas x4',    cost: 6,  active: true,  stock: 5,    img_url: '' },
    { id: 'dp3', name: '20% de descuento', cost: 20, active: true,  stock: null, img_url: '' },
  ],
  promos: [
    { id: 'dpr1', type: 'discount_next', active: true, description: '10% OFF en tu próxima visita', discount_pct: 10, expires_at: new Date(Date.now() + 14 * 86400000).toISOString() },
  ],
  membership: null, profile: null, clientPromos: [],
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function ClubProfilePage() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const slug         = params.slug

  const [data, setData]               = useState(null)
  const [pageState, setPageState]     = useState('loading')
  const [user, setUser]               = useState(undefined)
  const [membership, setMembership]   = useState(null)
  const [userProfile, setUserProfile] = useState(null)

  const [showModal, setShowModal]     = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [phone, setPhone]             = useState('')
  const [phoneErr, setPhoneErr]       = useState('')
  const [consent, setConsent]         = useState(false)
  const [joining, setJoining]         = useState(false)
  const [joinError, setJoinError]     = useState('')

  const [showHours, setShowHours]     = useState(false)
  const [qrDataUrl, setQrDataUrl]     = useState(null)
  const [tab, setTab]                 = useState('inicio')
  const [cardOpen, setCardOpen]       = useState(true)
  const [showSplash, setShowSplash]   = useState(false)
  const [isDemo, setIsDemo]           = useState(false)
  const autoJoinDone                  = useRef(false)

  // Canjes
  const [redeeming, setRedeeming]       = useState(null)   // prize.id being processed
  const [confirmPrize, setConfirmPrize] = useState(null)   // prize awaiting confirmation
  const [toasts, setToasts]             = useState([])

  function addToast(type, msg) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  async function doRedeem(prize) {
    if (!membership?.id || !user?.id) return
    setRedeeming(prize.id)
    try {
      const res = await fetch('/api/redeem', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ membership_id: membership.id, prize_id: prize.id, commerce_id: commerce.id, user_id: user.id }),
      })
      const d = await res.json()
      if (d.ok) {
        addToast('success', `¡${prize.name} canjeado! Mostralo en caja.`)
        const field = d.prog_type === 'stars' ? 'stars' : 'points'
        setMembership(prev => ({ ...prev, [field]: d.new_balance }))
      } else {
        addToast('error', d.error || 'Error al canjear')
      }
    } catch { addToast('error', 'Error de conexión') }
    setRedeeming(null)
  }

  // Reseñas
  const [reviews, setReviews]           = useState([])
  const [reviewsAvg, setReviewsAvg]     = useState(null)
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [userReview, setUserReview]     = useState(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewHover, setReviewHover]   = useState(0)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError]   = useState('')
  // Modal de confirmación para "dejar de ser parte del club"
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [leaving,      setLeaving]      = useState(false)

  useEffect(() => {
    fetch(`/api/club-profile?slug=${slug}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) {
          if (slug === 'cafe-berlin') { setData(CAFE_BERLIN_DEMO); setIsDemo(true); setPageState('ok'); return }
          setPageState('not_found'); return
        }
        setData(d)
        setMembership(d.membership)
        setUserProfile(d.profile)
        setPageState('ok')
        if (d.profile?.phone) setPhone(d.profile.phone)
      })
      .catch(() => {
        if (slug === 'cafe-berlin') { setData(CAFE_BERLIN_DEMO); setIsDemo(true); setPageState('ok'); return }
        setPageState('not_found')
      })
  }, [slug])

  useEffect(() => {
    if (pageState !== 'ok') return
    const key = `splash_${slug}`
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
      setTimeout(() => setShowSplash(true), 220)
    }
  }, [pageState, slug])

  useEffect(() => {
    const sb = getSupabase()
    sb.auth.getUser().then(({ data }) => setUser(data.user || null))
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (autoJoinDone.current) return
    if (!user || !data || membership) return
    if (searchParams.get('auto_join') !== '1') return
    autoJoinDone.current = true
    const savedPhone = sessionStorage.getItem('club_join_phone') || ''
    sessionStorage.removeItem('club_join_phone')
    handleJoin(savedPhone)
  }, [user, data, membership])

  useEffect(() => {
    // El QR personal es ÚNICO y existe desde que el user se loguea —
    // no depende de ser miembro de este club ni de ninguno. Lo generamos
    // apenas haya user para mostrarlo también en el flujo pre-join.
    if (!user) return
    import('qrcode').then(QRCode => {
      QRCode.default.toDataURL(`CLUB-${user.id}`, {
        width:220, margin:2,
        color: { dark:'#000000', light:'#FFFFFF' },
      }).then(setQrDataUrl)
    })
  }, [user])

  // Cargar reseñas cuando tenemos el commerce_id
  useEffect(() => {
    if (!data?.commerce?.id) return
    fetch(`/api/reviews?commerce_id=${data.commerce.id}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return
        setReviews(d.reviews || [])
        setReviewsAvg(d.avg)
        setReviewsTotal(d.total)
        if (d.userReview) {
          setUserReview(d.userReview)
          setReviewRating(d.userReview.rating)
          setReviewComment(d.userReview.comment || '')
        }
      })
      .catch(() => {})
  }, [data?.commerce?.id])

  useEffect(() => { setCardOpen(tab === 'inicio') }, [tab])

  async function handleSubmitReview() {
    if (!reviewRating) { setReviewError('Elegí una cantidad de estrellas'); return }
    setSubmittingReview(true); setReviewError('')
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commerce_id: data.commerce.id, rating: reviewRating, comment: reviewComment }),
    })
    const result = await res.json()
    if (result.ok) {
      setUserReview(result.review)
      setShowReviewForm(false)
      // Refrescar lista
      fetch(`/api/reviews?commerce_id=${data.commerce.id}`)
        .then(r => r.json())
        .then(d => { if (d.ok) { setReviews(d.reviews); setReviewsAvg(d.avg); setReviewsTotal(d.total) } })
    } else {
      setReviewError(result.error || 'Error al enviar')
    }
    setSubmittingReview(false)
  }


  async function handleJoin(phoneArg) {
    if (!user || !data) return
    const phoneVal = (phoneArg || phone || '').trim()
    if (!phoneVal && !phoneArg) { setPhoneErr('Ingresá tu celular'); return }
    if (!consent && !phoneArg) { setJoinError('Necesitás aceptar los términos'); return }
    setJoining(true); setJoinError('')
    const res = await fetch('/api/join', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ commerce_id:data.commerce.id, phone:phoneVal }),
    })
    const result = await res.json()
    if (result.ok) {
      setMembership({ id:result.membership_id, points:0, stars:0, visits_count:0, status:'pending' })
      setShowModal(false)
    } else {
      setJoinError(result.error || 'Error al unirte')
    }
    setJoining(false)
  }

  function handleGoogleLogin() {
    // Interstitial: si el usuario tocó sin querer, puede cancelar antes de
    // saltar a Google (donde no podemos agregar un botón "volver").
    setShowLoginPrompt(true)
  }
  function confirmGoogleLogin() {
    setShowLoginPrompt(false)
    if (phone.trim()) sessionStorage.setItem('club_join_phone', phone.trim())
    const sb = getSupabase()
    sb.auth.signInWithOAuth({
      provider:'google',
      // Pasamos por /auth/callback (server-side exchange del code) y le decimos
      // a dónde volver con ?next=. Encodeamos porque el next contiene ? y =.
      options:{ redirectTo:`${window.location.origin}/auth/callback?next=${encodeURIComponent(`/club/${slug}?auto_join=1`)}` },
    })
  }

  function validatePhone(val) {
    setPhone(val)
    if (val && !/^\+?[\d\s\-]{8,15}$/.test(val.trim())) {
      setPhoneErr('Formato inválido. Ej: +54 9 2954 123456')
    } else {
      setPhoneErr('')
    }
  }

  // ── Loading & errors ──────────────────────────────────────────────────────────
  if (pageState === 'loading') return <PageSkeleton />

  if (pageState === 'not_found') return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:24, fontFamily:FI }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ color:C.mist }}><Shield size={52} strokeWidth={1.5} /></div>
      <div style={{ fontFamily:FN, fontSize:20, fontWeight:700, color:C.white }}>Comercio no encontrado</div>
      <div style={{ fontSize:14, color:C.mist, textAlign:'center', maxWidth:280, lineHeight:1.6 }}>El link puede ser incorrecto o el comercio no está activo.</div>
      <a href="/" style={{ marginTop:8, fontSize:13, color:C.v, textDecoration:'none', fontFamily:FN, fontWeight:600 }}>← Volver al inicio</a>
    </div>
  )

  const { commerce, prizes, promos, clientPromos = [] } = data
  const isMember     = !!membership
  const isStars      = commerce.prog_type === 'stars'
  const UnitIcon     = isStars ? Star : Gem
  const unitLabel    = isStars ? 'estrellas' : 'puntos'
  const unitColor    = isStars ? '#fbbf24' : C.v
  const unitIconProps = isStars
    ? { strokeWidth:0, fill:'currentColor' }
    : { strokeWidth:2 }
  const bal          = isMember ? (isStars ? (membership.stars||0) : (membership.points||0)) : 0
  const visits       = membership?.visits_count || 0
  const goal         = commerce.prog_goal || (isStars ? 5 : 500)
  const pct          = Math.min(100, Math.round((bal / goal) * 100))
  const activePromo  = promos.find(p => p.active)
  const activePrizes = prizes.filter(p => p.active)
  // Spotlight cuando el cliente entra escaneando el QR del negocio.
  const fromQr       = searchParams.get('from_qr') === '1'

  // URL "Cómo llegar" — siempre direcciones (con destino), no solo búsqueda.
  // Con coords es más preciso; sin coords usamos dirección + ciudad + provincia
  // para mejorar el match cuando hay nombres de calles repetidos.
  const mapsDestination = commerce.lat && commerce.lng
    ? `${commerce.lat},${commerce.lng}`
    : encodeURIComponent([commerce.address, commerce.city?.name, commerce.city?.province, 'Argentina'].filter(Boolean).join(', '))
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsDestination}`

  return (
    <div style={{ position:'relative', minHeight:'100vh', width:'100%', background:C.bg, overflowX:'hidden', fontFamily:FI, WebkitFontSmoothing:'antialiased' }}>
      <style>{GLOBAL_CSS}</style>

      {isDemo && (
        <div style={{
          position:'fixed', top:58, left:0, right:0, zIndex:190,
          background:'rgba(168,85,247,0.18)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          borderBottom:'1px solid rgba(168,85,247,0.30)',
          padding:'8px 16px', textAlign:'center',
          fontSize:12, color:'rgba(240,232,255,0.85)', fontFamily:FI,
        }}>
          Modo demo · Esta página es un ejemplo de cómo verán tu club tus clientes
        </div>
      )}

      {showSplash && (
        <Splash commerce={commerce} UnitIcon={UnitIcon} unitIconProps={unitIconProps} unitLabel={unitLabel} onClose={() => setShowSplash(false)} />
      )}

      {/* ── NAVBAR FIJO ── */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:200 }}>
        <nav style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:`1px solid ${C.rim}`, padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', height:58 }}>
          <Logo />
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {/* Escanear QR — atajo a la cámara */}
            <a href="/?view=scanner" title="Escanear QR" style={{ display:'flex', alignItems:'center', justifyContent:'center', width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, cursor:'pointer', color:'rgba(255,255,255,0.78)', textDecoration:'none' }}>
              <ScanLine size={15} strokeWidth={2} />
            </a>
            {/* Mi cuenta */}
            <a href="/?view=client" title="Mi cuenta" style={{ display:'flex', alignItems:'center', justifyContent:'center', width:34, height:34, borderRadius:9, background:G, border:'none', cursor:'pointer', color:'#fff', boxShadow:'0 4px 14px #FE500033', textDecoration:'none' }}>
              <User size={15} strokeWidth={2} />
            </a>
            {/* Cerrar sesión — solo si hay user */}
            {user && (
              <button title="Cerrar sesión"
                onClick={async () => {
                  const sb = getSupabase()
                  await sb.auth.signOut()
                  if (typeof window !== 'undefined') window.location.href = '/'
                }}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', width:34, height:34, borderRadius:9, background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.70)', padding:0 }}>
                <LogOut size={15} strokeWidth={2} />
              </button>
            )}
          </div>
        </nav>
        {/* ── NAV DE PESTAÑAS (Inicio / Premios / Mi QR) — pegado abajo del navbar
              con el gradiente de marca, mismo formato que el nav cliente. ── */}
        <ClubTopNav tab={tab} setTab={setTab} prizesCount={activePrizes.length} />
      </div>

      {/* Spacer: 58 navbar + 50 nav de pestañas = 108 (+ banner demo si aplica) */}
      <div style={{ height: isDemo ? 142 : 108 }} />

      {/* ── 2. HERO - portada ── */}
      <section style={{ position:'relative', width:'100%', height:'35vh', minHeight:240, overflow:'hidden' }}>
        {commerce.cover_image
          ? <img src={commerce.cover_image} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
          : <div
              className="animate-gradient-slow"
              style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, #1a1a2e, #2d1f3d, #1a1a2e)' }}>
              <div style={{ position:'absolute', top:'20%', left:'10%', width:240, height:240, borderRadius:'50%', background:'rgba(236,72,153,0.18)', filter:'blur(70px)' }} />
              <div style={{ position:'absolute', bottom:'10%', right:'8%', width:200, height:200, borderRadius:'50%', background:'rgba(168,85,247,0.22)', filter:'blur(60px)' }} />
            </div>
        }
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, #0a0a0f 0%, rgba(10,10,15,0.55) 50%, transparent 100%)' }} />
        <button
          onClick={() => typeof window !== 'undefined' && window.history.back()}
          style={{ position:'absolute', top:16, left:16, zIndex:20, width:40, height:40, borderRadius:'50%', background:'rgba(0,0,0,0.50)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
          <ChevronLeft size={20} />
        </button>
      </section>

      {/* ── CONTENIDO PRINCIPAL (bajo el hero) ── */}
      <div style={{ maxWidth:600, margin:'0 auto', paddingBottom:100 }}>

        {/* ── CARD DEL NEGOCIO (collapsible, sobre la portada) ── */}
        <div style={{ margin:'-80px 16px 0', position:'relative', zIndex:10 }}>
          <div style={{
            background:'rgba(255,255,255,0.05)',
            backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
            border:'1px solid rgba(255,255,255,0.10)',
            borderRadius:20, overflow:'hidden',
          }}>
            {/* Header siempre visible */}
            <button
              onClick={() => setCardOpen(v => !v)}
              style={{ width:'100%', background:'transparent', border:'none', cursor:'pointer', padding:'14px 16px', display:'block' }}
            >
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:48, height:48, borderRadius:14, overflow:'hidden', background:'rgba(255,255,255,0.10)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {commerce.img_url
                      ? <img src={commerce.img_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <CatIcon category={commerce.category} size={22} color="rgba(255,255,255,0.5)" />
                    }
                  </div>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontFamily:FN, fontSize:16, fontWeight:700, color:C.white, lineHeight:1.2 }}>{commerce.name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)', background:'rgba(255,255,255,0.08)', borderRadius:99, padding:'2px 8px' }}>{commerce.category}</span>
                      {REVIEWS_ENABLED && (reviewsAvg !== null || commerce.rating) && (
                        <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'#ec4899' }}>
                          <Star size={11} strokeWidth={0} fill="currentColor" /> {reviewsAvg ?? commerce.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronDown size={18} color="rgba(255,255,255,0.45)"
                  style={{ transform: cardOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.3s ease', flexShrink:0 }} />
              </div>
            </button>

            {/* Contenido expandible */}
            <div style={{
              maxHeight: cardOpen ? 420 : 0,
              opacity: cardOpen ? 1 : 0,
              overflow:'hidden',
              transition:'max-height 0.3s ease-out, opacity 0.2s ease-out',
            }}>
              <div style={{ padding:'0 16px 16px' }}>
                {/* Badges ciudad + socios */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                  {commerce.city?.name && (
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)', background:'rgba(255,255,255,0.08)', borderRadius:99, padding:'3px 10px', display:'flex', alignItems:'center', gap:4 }}>
                      <MapPin size={11} strokeWidth={2} /> {commerce.city.name}
                    </span>
                  )}
                  {/* Socios escondidos en el perfil del club. */}
                </div>
                {/* Descripción — siempre visible. Si está vacía, mostrar placeholder
                    para que el dueño vea el espacio que tiene que llenar. */}
                <p style={{ fontSize:13, color: commerce.description ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.30)', fontStyle: commerce.description ? 'normal' : 'italic', lineHeight:1.6, margin:'0 0 12px' }}>
                  {commerce.description || 'Este negocio todavía no agregó una descripción.'}
                </p>
                {/* Horarios — siempre visible para mantener estructura,
                    con placeholder cuando no están configurados. */}
                {(() => {
                  const hs = commerce.hours_structured
                  // Sin info de horarios — placeholder
                  if (!hs) {
                    return (
                      <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.20)', flexShrink:0 }} />
                        <span style={{ color:'rgba(255,255,255,0.35)', fontSize:12, fontFamily:FI, fontStyle:'italic' }}>Horarios no informados</span>
                      </div>
                    )
                  }
                  const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
                  const today = hs[dayKeys[new Date().getDay()]]
                  if (!today || !today.open || !today.shifts?.length) {
                    return (
                      <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:'#888', flexShrink:0 }} />
                        <span style={{ color:'#888', fontSize:12, fontFamily:FI }}>Cerrado hoy</span>
                      </div>
                    )
                  }
                  const nowMin = new Date().getHours()*60 + new Date().getMinutes()
                  const openNow = today.shifts.some(s => {
                    const [fh, fm] = (s.from || '0:0').split(':').map(Number)
                    const [th, tm] = (s.to   || '0:0').split(':').map(Number)
                    return nowMin >= (fh*60+fm) && nowMin <= (th*60+tm)
                  })
                  const summary = today.shifts.map(s => `${s.from}–${s.to}`).join(' · ')
                  return (
                    <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background: openNow ? '#22c55e' : '#888', flexShrink:0, animation: openNow ? 'pulse 2s ease-in-out infinite' : 'none' }} />
                      <span style={{ color: openNow ? '#4ade80' : '#888', fontSize:12, fontFamily:FI }}>{openNow ? 'Abierto ahora' : 'Cerrado'}</span>
                      <span style={{ color:'rgba(255,255,255,0.45)', fontSize:12 }}>· {summary}</span>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* ── SLIDE TO JOIN / MEMBER BADGE (siempre visible) ──
              Cuando el cliente viene del QR del negocio (?from_qr=1) y todavía
              no es socio, ponemos un overlay oscuro encima de toda la pantalla
              y elevamos el slider con z-index alto para que sea lo único
              visible. Al deslizar, el overlay desaparece (porque deja de
              aplicar la condición !isMember). */}
        {fromQr && !isMember && (
          <div style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', pointerEvents:'none' }} />
        )}
        <div style={{ padding:'20px 16px 0', position: fromQr && !isMember ? 'relative' : 'static', zIndex: fromQr && !isMember ? 200 : 'auto' }}>
          {isMember ? (
            <>
              {/* Banner cuando viene del QR y ya es miembro */}
              {fromQr && (
                <div style={{ marginBottom:14, padding:'12px 14px', background:'rgba(34,197,94,0.10)', border:'1px solid rgba(34,197,94,0.30)', borderRadius:12, display:'flex', alignItems:'center', gap:10 }}>
                  <Check size={18} color='#22c55e' strokeWidth={2.5} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:'#fff', marginBottom:2 }}>Ya sos parte de {commerce.name}</div>
                    <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.65)', lineHeight:1.5 }}>Mostrá tu QR personal en caja para sumar {unitLabel}.</div>
                  </div>
                </div>
              )}
              <MemberBadge createdAt={membership?.created_at} />
            </>
          ) : (
            <>
              {fromQr && (
                <div style={{ textAlign:'center', marginBottom:16 }}>
                  <div style={{ fontFamily:FN, fontSize:18, fontWeight:800, color:'#fff', marginBottom:6, textShadow:'0 2px 12px rgba(0,0,0,0.6)' }}>
                    Estás a un paso
                  </div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.85)', textShadow:'0 2px 8px rgba(0,0,0,0.6)' }}>
                    Deslizá para unirte al club de {commerce.name}
                  </div>
                </div>
              )}
              <SlideToJoinButton
                onJoin={async () => {
                  console.log('[SlideToJoin] inicio. user state:', user?.email || 'null', 'phone state:', userProfile?.phone || phone || 'vacío')
                  let currentUser = user
                  let currentPhone = (userProfile?.phone || phone || '').trim()
                  const sb = getSupabase()

                  // Re-fetch del user si el state local está vacío
                  if (!currentUser) {
                    try {
                      const { data } = await sb.auth.getUser()
                      currentUser = data.user || null
                      if (currentUser) {
                        console.log('[SlideToJoin] user re-fetched:', currentUser.email)
                        setUser(currentUser)
                      } else {
                        console.log('[SlideToJoin] no hay sesion activa')
                      }
                    } catch (e) { console.log('[SlideToJoin] error fetching user:', e) }
                  }

                  // Re-fetch del teléfono SIEMPRE que falte y haya user
                  // (el bug previo era que solo se refetcheaba si el user state estaba null).
                  if (currentUser && !currentPhone) {
                    try {
                      const { data: prof } = await sb.from('profiles').select('phone').eq('id', currentUser.id).maybeSingle()
                      if (prof?.phone) {
                        currentPhone = prof.phone.trim()
                        setUserProfile(p => ({ ...(p || {}), phone: prof.phone }))
                        console.log('[SlideToJoin] phone re-fetched del profile:', currentPhone)
                      } else {
                        console.log('[SlideToJoin] profile no tiene phone')
                      }
                    } catch (e) { console.log('[SlideToJoin] error fetching profile:', e) }
                  }

                  console.log('[SlideToJoin] decision. user:', !!currentUser, 'phone:', !!currentPhone)
                  if (currentUser && currentPhone) {
                    console.log('[SlideToJoin] uniendo directo via handleJoin')
                    handleJoin(currentPhone)
                  } else {
                    console.log('[SlideToJoin] abriendo modal porque falta', !currentUser ? 'user' : '', !currentPhone ? 'phone' : '')
                    setShowModal(true)
                  }
                }}
                isDemoClub={false} />
            </>
          )}
        </div>

        {/* ━━━ TAB: INICIO ━━━ */}
        {tab === 'inicio' && (
          <div style={{ animation:'fadeUp .35s ease', padding:'16px 16px 0', display:'flex', flexDirection:'column', gap:16 }}>

            {/* Card de progreso (miembro) */}
            {isMember && (
              <div style={{ background:'rgba(255,255,255,0.05)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:20, padding:'20px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:GA }} />
                <div style={{ position:'absolute', top:-40, right:-30, width:140, height:140, borderRadius:'50%', background:'rgba(168,85,247,0.1)', filter:'blur(40px)', pointerEvents:'none' }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:11, color:C.mist, marginBottom:6, fontWeight:500 }}>Tu saldo</div>
                    <div style={{ fontFamily:FN, fontSize:36, fontWeight:900, color:unitColor, lineHeight:1, display:'flex', alignItems:'center', gap:8 }}>
                      <UnitIcon size={28} {...unitIconProps} /> {bal}
                    </div>
                    <div style={{ fontSize:12, color:C.mist, marginTop:4 }}>{unitLabel}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, color:C.mist }}>{visits} visita{visits!==1?'s':''}</div>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:11, color:C.mist }}>Progreso hacia la recompensa</span>
                  <span style={{ fontSize:11, color:C.v, fontWeight:700 }}>{pct}%</span>
                </div>
                <ProgressBar pct={pct} />
                <div style={{ fontSize:11, color:C.mist, marginTop:8, display:'flex', alignItems:'center', gap:5 }}><Gift size={11} strokeWidth={2} /> {commerce.reward_text || `Meta: ${goal} ${unitLabel}`}</div>
                {/* Compra mínima visible al cliente (solo en stars). Le da
                    transparencia sobre cuándo le suma estrella y cuándo no. */}
                {isStars && commerce.prog_min_purchase > 0 && (
                  <div style={{ fontSize:11, color:'rgba(251,191,36,0.85)', marginTop:6, display:'flex', alignItems:'center', gap:5 }}>
                    <Star size={11} strokeWidth={0} fill="currentColor" />
                    Compra mínima para sumar estrella: <strong>${commerce.prog_min_purchase.toLocaleString('es-AR')}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Bloque de info unificado — siempre visible para mantener estructura
                consistente. Cada sección muestra placeholder cuando está vacía. */}
            {(
              <div style={{ background:'rgba(255,255,255,0.05)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:16, overflow:'hidden' }}>

                {/* Horarios — desde hours_structured (JSONB con días y turnos) */}
                {commerce.hours_structured && (() => {
                  const dayKeys   = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
                  const dayLabels = { monday:'Lun', tuesday:'Mar', wednesday:'Mié', thursday:'Jue', friday:'Vie', saturday:'Sáb', sunday:'Dom' }
                  const todayKey  = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
                  const today     = commerce.hours_structured[todayKey]
                  const todayShifts = today?.open ? (today.shifts || []).map(s => `${s.from}–${s.to}`).join(' · ') : 'Cerrado'

                  // Solo mostrar el bloque si al menos un día tiene horario
                  const hasAny = dayKeys.some(k => commerce.hours_structured[k]?.open && commerce.hours_structured[k]?.shifts?.length)
                  if (!hasAny) return null

                  return (
                    <>
                      <button
                        onClick={() => setShowHours(v => !v)}
                        style={{ width:'100%', background:'transparent', border:'none', cursor:'pointer', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:FI, textAlign:'left' }}
                      >
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <Clock size={18} strokeWidth={2} color="rgba(255,255,255,0.6)" />
                          <div>
                            <p style={{ color:C.white, fontSize:14, fontWeight:500, margin:0 }}>Horarios</p>
                            {!showHours && <p style={{ color:'rgba(255,255,255,0.45)', fontSize:12, margin:'2px 0 0' }}>Hoy: {todayShifts}</p>}
                          </div>
                        </div>
                        <ChevronDown size={18} color="rgba(255,255,255,0.35)" style={{ transform: showHours ? 'rotate(180deg)' : 'none', transition:'transform .2s', flexShrink:0 }} />
                      </button>
                      <div style={{ maxHeight: showHours ? 320 : 0, overflow:'hidden', transition:'max-height 0.25s ease-out' }}>
                        <div style={{ padding:'0 16px 14px 46px', fontSize:13, color:C.mist, lineHeight:1.9 }}>
                          {dayKeys.map(k => {
                            const d = commerce.hours_structured[k]
                            const txt = d?.open && d?.shifts?.length
                              ? d.shifts.map(s => `${s.from}–${s.to}`).join(' · ')
                              : 'Cerrado'
                            return (
                              <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                                <span style={{ color: k === todayKey ? C.white : C.mist, fontWeight: k === todayKey ? 600 : 400 }}>{dayLabels[k]}</span>
                                <span style={{ color: k === todayKey ? C.white : C.mist }}>{txt}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      {(commerce.address || commerce.lat || commerce.lng || commerce.instagram) && (
                        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }} />
                      )}
                    </>
                  )
                })()}

                {/* Ubicación — siempre visible. Si tiene dirección, link a Maps;
                    si no, placeholder gris en italic. */}
                {(commerce.address || (commerce.lat && commerce.lng)) ? (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', textDecoration:'none', fontFamily:FI }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <MapPin size={18} strokeWidth={2} color="rgba(255,255,255,0.6)" />
                      <div>
                        <p style={{ color:C.white, fontSize:14, fontWeight:500, margin:0 }}>{commerce.address || 'Ver en el mapa'}</p>
                        {commerce.city && <p style={{ color:'rgba(255,255,255,0.45)', fontSize:12, margin:'2px 0 0' }}>{commerce.city.name}</p>}
                      </div>
                    </div>
                    {/* Botón outline fucsia — formato consistente con tags activos. */}
                    <span style={{ background:'transparent', color:'#EC4899', border:'1.5px solid #EC4899', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:700, fontFamily:FN, whiteSpace:'nowrap', flexShrink:0 }}>Cómo llegar →</span>
                  </a>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', fontFamily:FI, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    <MapPin size={18} strokeWidth={2} color="rgba(255,255,255,0.25)" />
                    <div>
                      <p style={{ color:'rgba(255,255,255,0.35)', fontSize:14, fontWeight:500, margin:0, fontStyle:'italic' }}>Dirección no informada</p>
                      {commerce.city?.name && <p style={{ color:'rgba(255,255,255,0.30)', fontSize:12, margin:'2px 0 0' }}>{commerce.city.name}</p>}
                    </div>
                  </div>
                )}
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }} />

                {/* Instagram — siempre visible. Si está vacío, placeholder. */}
                {commerce.instagram ? (
                  <a href={`https://instagram.com/${commerce.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', textDecoration:'none', fontFamily:FI }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <Camera size={18} strokeWidth={2} color="rgba(255,255,255,0.6)" />
                      <p style={{ color:C.white, fontSize:14, fontWeight:500, margin:0 }}>{commerce.instagram}</p>
                    </div>
                    <ChevronRight size={18} color="rgba(255,255,255,0.35)" />
                  </a>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', fontFamily:FI }}>
                    <Camera size={18} strokeWidth={2} color="rgba(255,255,255,0.25)" />
                    <p style={{ color:'rgba(255,255,255,0.35)', fontSize:14, fontWeight:500, margin:0, fontStyle:'italic' }}>Sin redes sociales</p>
                  </div>
                )}
              </div>
            )}

            {/* Promoción activa */}
            {activePromo && (() => {
              const clientPromo = clientPromos.find(cp => cp.promotion_id === activePromo.id && cp.status === 'active')
              const daysLeft = clientPromo
                ? Math.ceil((new Date(clientPromo.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
                : null
              const expiringSoon = daysLeft !== null && daysLeft <= 3
              const accentColor = expiringSoon ? '#fb923c' : '#c084fc'
              const bgColor     = expiringSoon
                ? 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(254,80,0,0.15))'
                : 'linear-gradient(135deg, rgba(168,85,247,0.20), rgba(236,72,153,0.20))'
              const borderColor = expiringSoon ? 'rgba(251,146,60,0.35)' : 'rgba(168,85,247,0.30)'
              const iconBg      = expiringSoon ? 'rgba(251,146,60,0.25)' : 'rgba(168,85,247,0.30)'
              const countdownText = daysLeft === null ? null
                : daysLeft <= 0 ? '¡Vence hoy!'
                : daysLeft === 1 ? '¡Vence mañana!'
                : `Vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`

              return (
                <div style={{ background:bgColor, backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderRadius:16, padding:'16px', border:`1px solid ${borderColor}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: countdownText ? 10 : 0 }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Sparkles size={20} strokeWidth={2} color={accentColor} />
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ color:accentColor, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:FI, marginBottom:3 }}>
                        {isMember ? 'Tu promoción activa' : 'Promoción activa'}
                      </p>
                      <p style={{ color:C.white, fontSize:14, fontWeight:500, fontFamily:FI }}>
                        {activePromo.description || (activePromo.type==='double_points' ? `Doble ${unitLabel}` : `${activePromo.value}% de descuento`)}
                      </p>
                      {activePromo.days?.length > 0 && (
                        <div style={{ display:'flex', gap:5, marginTop:6 }}>
                          {activePromo.days.map(d => (
                            <span key={d} style={{ fontSize:10, background:`${accentColor}22`, color:accentColor, borderRadius:6, padding:'3px 8px', fontWeight:600 }}>
                              {DAYS_MAP[d] || d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {countdownText && (
                    <div style={{ paddingLeft:52 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
                        <Clock size={12} color={accentColor} strokeWidth={2} />
                        <span style={{ fontSize:12, fontWeight:700, color:accentColor }}>{countdownText}</span>
                      </div>
                      {daysLeft > 0 && activePromo.expiration_type === 'relative' && (
                        <div style={{ height:3, borderRadius:99, background:'rgba(255,255,255,0.10)', overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:99, background:accentColor, width:`${Math.min(100, Math.round(daysLeft / (activePromo.expiration_days || 7) * 100))}%`, transition:'width 400ms ease' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Catálogo */}
            {activePrizes.length > 0 && (
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <h2 style={{ fontFamily:FN, fontSize:17, fontWeight:600, color:C.white, letterSpacing:'-0.02em', margin:0 }}>Catálogo</h2>
                  <button onClick={() => setTab('premios')} style={{ background:'transparent', border:'none', color:C.v, fontSize:13, fontWeight:500, fontFamily:FI, cursor:'pointer' }}>
                    Ver todos →
                  </button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {activePrizes.slice(0, 3).map((prize, idx) => {
                    const canRedeem  = isMember && bal >= prize.cost
                    const progressPct = isMember ? Math.min(100, Math.round((bal / prize.cost) * 100)) : 0
                    const pointsLeft  = Math.max(prize.cost - bal, 0)
                    return (
                      <div key={prize.id}
                        style={{
                          width:'100%', background:'rgba(255,255,255,0.05)',
                          backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
                          border:`1px solid ${canRedeem ? 'rgba(34,230,152,0.35)' : 'rgba(255,255,255,0.10)'}`,
                          borderRadius:16, overflow:'hidden',
                          animation:`cardIn .35s ease ${idx * 0.07}s both`,
                        }}>
                        <div style={{ display:'flex' }}>
                          <div style={{ width:'30%', flexShrink:0, aspectRatio:'1', background:'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.15))', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                            {prize.img_url
                              ? <img src={prize.img_url} alt={prize.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              : <Gift size={28} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
                            }
                          </div>
                          <div style={{ flex:1, padding:'12px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between', minWidth:0 }}>
                            <div>
                              <div style={{ fontFamily:FN, fontSize:13, fontWeight:600, color:C.white, lineHeight:1.3 }}>{prize.name}</div>
                              <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                                <Gem size={13} color="#a855f7" strokeWidth={2} />
                                <span style={{ color:'#a855f7', fontSize:12, fontWeight:500, fontFamily:FN }}>{prize.cost} {unitLabel}</span>
                              </div>
                            </div>
                            <div style={{ marginTop:10 }}>
                              <div style={{ height:10, background:'rgba(255,255,255,0.10)', borderRadius:9999, overflow:'visible' }}>
                                <div className="fluorescent-bar" style={{ position:'relative', height:'100%', borderRadius:9999, width:`${progressPct}%`, minWidth: progressPct > 0 ? 10 : 0 }} />
                              </div>
                              {canRedeem ? (
                                <button
                                  disabled={redeeming === prize.id}
                                  onClick={() => setConfirmPrize(prize)}
                                  style={{ width:'100%', marginTop:5, padding:'5px 0', background:'linear-gradient(135deg,#22c55e,#10b981)', border:'none', borderRadius:8, color:'#fff', fontFamily:FN, fontSize:11, fontWeight:600, cursor:redeeming===prize.id?'not-allowed':'pointer', opacity:redeeming===prize.id?0.6:1 }}>
                                  {redeeming === prize.id ? '...' : 'Canjear'}
                                </button>
                              ) : (
                                <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)', margin:'4px 0 0' }}>
                                  {isMember ? <><span style={{ color:C.white, fontWeight:600 }}>{pointsLeft}</span> {unitLabel} para canjear</> : `Necesitás ${prize.cost} ${unitLabel}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* RESEÑAS — desactivadas via REVIEWS_ENABLED (ver flag al top del archivo) */}
            {REVIEWS_ENABLED && (reviews.length > 0 || isMember) && (
              <div style={{ margin:'24px 16px 0' }}>
                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <h2 style={{ fontFamily:FN, fontSize:17, fontWeight:600, color:C.white, letterSpacing:'-0.02em', marginBottom:4, display:'flex', alignItems:'center', gap:8 }}>
                      <Star size={17} strokeWidth={0} fill="currentColor" style={{ color:'#ec4899' }} /> Reseñas
                    </h2>
                    {reviewsAvg !== null && (
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontFamily:FN, fontSize:28, fontWeight:700, color:'#ec4899', lineHeight:1 }}>{reviewsAvg}</span>
                        <div>
                          <StarRow rating={reviewsAvg} size={14} />
                          <p style={{ fontSize:11, color:C.mist, marginTop:2 }}>{reviewsTotal} reseña{reviewsTotal!==1?'s':''}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {isMember && (
                    <button
                      onClick={() => setShowReviewForm(v => !v)}
                      style={{
                        background: showReviewForm ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${showReviewForm ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.12)'}`,
                        borderRadius:9999, padding:'8px 16px',
                        color: showReviewForm ? C.v : C.mist,
                        fontFamily:FN, fontSize:13, fontWeight:600,
                        cursor:'pointer', transition:'all .2s',
                      }}>
                      {userReview ? 'Editar reseña' : '+ Opinar'}
                    </button>
                  )}
                </div>

                {/* Formulario */}
                {showReviewForm && isMember && (
                  <div style={{ background:'rgba(168,85,247,0.06)', border:'1px solid rgba(168,85,247,0.2)', borderRadius:16, padding:'18px', marginBottom:16, animation:'fadeUp .25s ease' }}>
                    <p style={{ fontSize:13, color:C.mist, marginBottom:12, fontFamily:FI }}>
                      {userReview ? 'Actualizá tu reseña' : 'Contales a otros socios tu experiencia'}
                    </p>
                    {/* Estrellas interactivas */}
                    <div style={{ display:'flex', gap:6, marginBottom:14 }}>
                      {[1,2,3,4,5].map(s => (
                        <button key={s}
                          onMouseEnter={() => setReviewHover(s)}
                          onMouseLeave={() => setReviewHover(0)}
                          onClick={() => setReviewRating(s)}
                          style={{ background:'none', border:'none', cursor:'pointer', padding:2, fontSize:28, lineHeight:1, color:'#ec4899', transition:'transform .1s', transform: (reviewHover||reviewRating) >= s ? 'scale(1.15)' : 'scale(1)' }}>
                          <Star size={28} strokeWidth={0} fill="currentColor" style={{ opacity: (reviewHover||reviewRating) >= s ? 1 : 0.25 }} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="¿Qué te pareció? (opcional)"
                      rows={3}
                      style={{
                        width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)',
                        borderRadius:12, padding:'12px 14px', color:C.white, fontSize:14, fontFamily:FI,
                        outline:'none', resize:'vertical', lineHeight:1.6,
                      }}
                    />
                    {reviewError && <p style={{ fontSize:12, color:'#f87171', marginTop:8 }}>{reviewError}</p>}
                    <div style={{ display:'flex', gap:10, marginTop:12 }}>
                      <button onClick={() => { setShowReviewForm(false); setReviewError('') }}
                        style={{ flex:1, padding:'11px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:12, color:C.mist, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                        Cancelar
                      </button>
                      <button onClick={handleSubmitReview} disabled={submittingReview || !reviewRating}
                        className="btn-pulse"
                        style={{ flex:2, padding:'11px', background: !reviewRating ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #a855f7, #ec4899)', border:'none', borderRadius:12, color: !reviewRating ? C.dust : '#fff', fontFamily:FN, fontSize:13, fontWeight:600, cursor: !reviewRating ? 'not-allowed' : 'pointer', transition:'all .2s' }}>
                        {submittingReview ? 'Enviando...' : userReview ? 'Actualizar' : 'Publicar reseña'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de reseñas */}
                {reviews.length === 0 && !showReviewForm && (
                  <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'24px', textAlign:'center' }}>
                    <MessageCircle size={32} strokeWidth={1.5} color="rgba(255,255,255,0.3)" style={{ marginBottom:8 }} />
                    <p style={{ fontSize:14, color:C.mist, fontFamily:FI }}>
                      {isMember ? 'Sé el primero en opinar sobre este lugar.' : 'Todavía no hay reseñas.'}
                    </p>
                  </div>
                )}
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {reviews.map(r => (
                    <div key={r.id} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 16px', animation:'cardIn .3s ease' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          {r.profile?.avatar_url
                            ? <img src={r.profile.avatar_url} alt="" style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                            : <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg, #a855f7, #ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', flexShrink:0 }}>
                                {(r.profile?.name || '?')[0].toUpperCase()}
                              </div>
                          }
                          <div>
                            <p style={{ fontFamily:FN, fontSize:13, fontWeight:600, color:C.white, marginBottom:2 }}>
                              {r.profile?.name || 'Socio'}
                            </p>
                            {r.membership?.visits_count > 0 && (
                              <p style={{ fontSize:10, color:C.mist }}>{r.membership.visits_count} visitas</p>
                            )}
                          </div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                          <StarRow rating={r.rating} size={12} />
                          <p style={{ fontSize:10, color:C.dust }}>{new Date(r.created_at).toLocaleDateString('es-AR', { day:'numeric', month:'short' })}</p>
                        </div>
                      </div>
                      {r.comment && (
                        <p style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.6, fontFamily:FI }}>{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>

                {!isMember && reviews.length === 0 && (
                  <p style={{ fontSize:12, color:C.dust, textAlign:'center', marginTop:10 }}>
                    Unite al club para poder dejar tu reseña
                  </p>
                )}
              </div>
            )}

            <div style={{ textAlign:'center', marginTop:28, marginBottom:8, fontSize:12, color:C.dust }}>
              Benefix · {commerce.city?.name || ''}
            </div>
          </div>
        )}

        {/* ━━━ TAB: PREMIOS ━━━ */}
        {tab === 'premios' && (
          <div style={{ margin:'16px 16px 0', animation:'fadeUp .3s ease' }}>
            <h2 style={{ fontFamily:FN, fontSize:20, fontWeight:700, color:C.white, marginBottom:4, letterSpacing:'-0.02em' }}>Catálogo</h2>
            <div style={{ fontSize:13, color:C.mist, marginBottom:20, display:'flex', alignItems:'center', gap:5 }}>
              {isMember
                ? <><UnitIcon size={13} {...unitIconProps} /> <span style={{ color:unitColor, fontWeight:600 }}>{bal}</span> {unitLabel} disponibles</>
                : `Necesitás ${unitLabel} para canjear premios.`}
            </div>

            {activePrizes.length === 0 ? (
              <GlassCard style={{ textAlign:'center', padding:'48px 20px', borderRadius:20 }} hover={false}>
                <div style={{ marginBottom:14 }}><Gift size={44} strokeWidth={1.5} color="rgba(255,255,255,0.4)" /></div>
                <div style={{ fontFamily:FN, fontSize:16, fontWeight:700, color:C.white, marginBottom:8 }}>Sin premios disponibles</div>
                <div style={{ fontSize:13, color:C.mist }}>El negocio aún no tiene premios activos.</div>
              </GlassCard>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {activePrizes.map((prize, idx) => {
                  const canRedeem      = isMember && bal >= prize.cost
                  const progressPct    = isMember ? Math.min(100, Math.round((bal / prize.cost) * 100)) : 0
                  const pointsLeft     = Math.max(prize.cost - bal, 0)
                  const isOos          = prize.stock === 0
                  return (
                    <div key={prize.id}
                      style={{
                        width:'100%',
                        background:'rgba(255,255,255,0.05)',
                        backdropFilter:'blur(20px)',
                        WebkitBackdropFilter:'blur(20px)',
                        border:`1px solid ${canRedeem ? 'rgba(34,230,152,0.35)' : 'rgba(255,255,255,0.10)'}`,
                        borderRadius:16,
                        overflow:'hidden',
                        opacity: isOos ? 0.5 : 1,
                        animation:`cardIn .35s ease ${idx * 0.07}s both`,
                      }}>
                      <div style={{ display:'flex' }}>

                        {/* Imagen izquierda */}
                        <div style={{ width:'30%', flexShrink:0, aspectRatio:'1', position:'relative', overflow:'hidden', background:'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.15))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {prize.img_url
                            ? <img src={prize.img_url} alt={prize.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : <Gift size={32} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
                          }
                        </div>

                        {/* Contenido derecho */}
                        <div style={{ flex:1, padding:'14px 14px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between', minWidth:0 }}>

                          {/* Info superior */}
                          <div>
                            <div style={{ fontFamily:FN, fontSize:14, fontWeight:600, color:C.white, lineHeight:1.3 }}>
                              {prize.name}
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                              <Gem size={14} color="#a855f7" strokeWidth={2} />
                              <span style={{ color:'#a855f7', fontSize:13, fontWeight:500, fontFamily:FN }}>
                                {prize.cost} {unitLabel}
                              </span>
                              {prize.stock !== null && (
                                <span style={{ marginLeft:'auto', fontSize:11, color: isOos ? C.o : prize.stock <= 2 ? C.o : C.dust, fontWeight:600 }}>
                                  {isOos ? 'Agotado' : `${prize.stock} disp.`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Barra de progreso + texto */}
                          <div style={{ marginTop:12 }}>
                            <div style={{ height:12, background:'rgba(255,255,255,0.10)', borderRadius:9999, overflow:'visible' }}>
                              <div
                                className="fluorescent-bar"
                                style={{ position:'relative', height:'100%', borderRadius:9999, width:`${progressPct}%`, minWidth: progressPct > 0 ? 12 : 0 }}
                              />
                            </div>
                            <div style={{ marginTop:6 }}>
                              {canRedeem ? (
                                <button
                                  disabled={redeeming === prize.id || isOos}
                                  onClick={() => setConfirmPrize(prize)}
                                  style={{
                                    width:'100%', padding:'7px 0',
                                    background:'linear-gradient(135deg, #22c55e, #10b981)',
                                    border:'none', borderRadius:10,
                                    color:'#fff', fontFamily:FN, fontSize:13, fontWeight:600,
                                    cursor: (redeeming === prize.id || isOos) ? 'not-allowed' : 'pointer',
                                    opacity: (redeeming === prize.id || isOos) ? 0.6 : 1,
                                    boxShadow:'0 4px 14px rgba(34,197,94,0.35)',
                                  }}>
                                  {redeeming === prize.id ? 'Procesando...' : 'Canjear premio'}
                                </button>
                              ) : (
                                <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:0 }}>
                                  {isMember
                                    ? <><span style={{ color:C.white, fontWeight:600 }}>{pointsLeft}</span> {unitLabel} para canjear</>
                                    : `Necesitás ${prize.cost} ${unitLabel} para canjear`}
                                </p>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        )}

        {/* ━━━ TAB: HISTORIAL — visitas y canjes del cliente en este negocio ━━━ */}
        {tab === 'historial' && (
          <div style={{ margin:'16px 16px 0', animation:'fadeUp .3s ease' }}>
            {isMember ? (
              <ClubHistory user={user} commerceId={commerce.id} unitLabel={unitLabel} unitColor={unitColor} UnitIcon={UnitIcon} unitIconProps={unitIconProps} />
            ) : (
              <div style={{ textAlign:'center', padding:'40px 20px 20px' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(168,85,247,0.12)', border:'1px solid rgba(168,85,247,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Clock size={28} strokeWidth={1.5} color={C.v} />
                  </div>
                </div>
                <div style={{ fontFamily:FN, fontSize:18, fontWeight:700, color:C.white, marginBottom:10 }}>
                  Tu historial te espera
                </div>
                <div style={{ fontSize:13, color:C.mist, lineHeight:1.6, marginBottom:24, maxWidth:300, margin:'0 auto 24px' }}>
                  Cuando seas socio de {commerce.name} vas a ver acá tus visitas y los premios que canjeaste.
                </div>
                <button onClick={() => setShowModal(true)}
                  style={{
                    padding:'12px 24px',
                    background:'linear-gradient(135deg, #a855f7, #ec4899)',
                    border:'none', borderRadius:14, color:'#fff',
                    fontFamily:FN, fontSize:14, fontWeight:600, cursor:'pointer',
                  }}>
                  Unirme al club
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Link sutil "dejar de ser parte" — solo si es miembro de este club ── */}
      {isMember && (
        <div style={{ textAlign:'center', padding:'8px 16px 28px' }}>
          <button
            onClick={() => setLeaveConfirm(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.40)',
              fontFamily: 'inherit',
              fontSize: 12,
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: '4px 8px',
            }}>
            Dejar de ser parte de este club
          </button>
        </div>
      )}

      {/* Modal de confirmación de "dejar el club" */}
      {leaveConfirm && (
        <div onClick={() => !leaving && setLeaveConfirm(false)}
          style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:'100%', maxWidth:340, background:'rgba(20,16,32,0.98)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:18, padding:'22px 20px', boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
              <div style={{ width:52, height:52, borderRadius:14, background:'rgba(248,116,68,0.14)', border:'1px solid rgba(248,116,68,0.32)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <LogOut size={24} color='#f87444' strokeWidth={2} />
              </div>
            </div>
            <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:C.white, textAlign:'center', marginBottom:8 }}>
              ¿Dejar el club?
            </div>
            <div style={{ fontSize:13, color:C.mist, textAlign:'center', lineHeight:1.55, marginBottom:20 }}>
              Vas a perder tus <strong style={{ color:C.white }}>{bal} {unitLabel}</strong> acumulados en {commerce.name}. Si después querés volver, te tenés que unir de nuevo.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setLeaveConfirm(false)} disabled={leaving}
                style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:C.pearl, fontFamily:FN, fontSize:13, fontWeight:600, cursor: leaving ? 'wait' : 'pointer', opacity: leaving ? 0.5 : 1 }}>
                Cancelar
              </button>
              <button disabled={leaving}
                onClick={async () => {
                  setLeaving(true)
                  try {
                    const r = await fetch('/api/leave-club', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ commerce_id: commerce.id }),
                    })
                    const d = await r.json().catch(() => ({}))
                    if (r.ok && d.ok) {
                      if (typeof window !== 'undefined') window.location.href = '/?view=client'
                    } else {
                      alert(d.error || 'No se pudo dejar el club. Probá de nuevo.')
                      setLeaving(false)
                    }
                  } catch {
                    alert('Sin conexión. Probá de nuevo.')
                    setLeaving(false)
                  }
                }}
                style={{ flex:1, padding:'12px', background:'#dc2626', border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor: leaving ? 'wait' : 'pointer', opacity: leaving ? 0.5 : 1 }}>
                {leaving ? 'Saliendo...' : 'Sí, salir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nav de pestañas pasó arriba (ClubTopNav) — abajo no va más. */}

      {/* ── JOIN MODAL ── */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.80)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', zIndex:999, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e => { if (e.target===e.currentTarget) setShowModal(false) }}>
          <div style={{ background:'rgba(255,255,255,0.08)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'28px 28px 0 0', width:'100%', maxWidth:560, padding:'24px 24px 44px', animation:'fadeUp .3s ease', boxShadow:'0 -8px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ width:40, height:4, background:'rgba(255,255,255,0.15)', borderRadius:2, margin:'0 auto 24px' }} />
            <div style={{ fontFamily:FN, fontSize:20, fontWeight:700, color:C.white, marginBottom:4, letterSpacing:'-0.02em' }}>
              Ser parte de {commerce.name}
            </div>
            <div style={{ fontSize:13, color:C.mist, marginBottom:24 }}>
              Dejanos tu celular para avisarte de promociones.
            </div>

            {!user ? (
              <>
                <div style={{ marginBottom:18 }}>
                  <label style={{ fontSize:11, color:C.mist, fontWeight:600, display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Tu celular (opcional)</label>
                  <PhoneInput value={phone} onChange={validatePhone} size="md" />
                  {phoneErr && <div style={{ fontSize:12, color:'#f87171', marginTop:6 }}>{phoneErr}</div>}
                </div>
                <button onClick={handleGoogleLogin}
                  className="btn-pulse"
                  style={{ width:'100%', padding:'15px', background:'linear-gradient(135deg, #a855f7, #ec4899)', border:'none', borderRadius:15, color:'#fff', fontFamily:FN, fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, boxShadow:'0 8px 28px rgba(168,85,247,0.45)', transition:'all .2s ease' }}>
                  <span style={{ fontWeight:900, fontSize:17 }}>G</span>Continuar con Google
                </button>
                <div style={{ textAlign:'center', marginTop:12, fontSize:11, color:C.dust }}>Gratis · Sin spam · Cancelá cuando quieras</div>
              </>
            ) : (
              <>
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:11, color:C.mist, fontWeight:600, display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Tu celular</label>
                  <PhoneInput value={phone} onChange={validatePhone} size="md" />
                  {phoneErr && <div style={{ fontSize:12, color:'#f87171', marginTop:6 }}>{phoneErr}</div>}
                </div>
                <label style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:20, cursor:'pointer' }}>
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop:2, accentColor:C.v, width:17, height:17, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:C.mist, lineHeight:1.6 }}>Acepto recibir notificaciones y promociones de {commerce.name} por WhatsApp.</span>
                </label>
                {joinError && <div style={{ fontSize:13, color:'#f87171', marginBottom:14 }}>{joinError}</div>}
                <button onClick={() => handleJoin()} disabled={joining||!!phoneErr||!consent}
                  className="btn-pulse"
                  style={{ width:'100%', padding:'15px', background:'linear-gradient(135deg, #a855f7, #ec4899)', border:'none', borderRadius:15, color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:joining||!consent?'not-allowed':'pointer', opacity:joining||!consent?0.6:1, boxShadow:'0 8px 28px rgba(168,85,247,0.4)', transition:'all .2s ease' }}>
                  {joining ? '⟳ Uniéndome...' : 'Unirme al club →'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CONFIRM CANJE MODAL ── */}
      {confirmPrize && (
        <div style={{ position:'fixed', inset:0, zIndex:800, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={() => setConfirmPrize(null)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }} />
          <div style={{ position:'relative', background:'rgba(14,8,28,0.97)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:22, padding:'26px 22px', width:'100%', maxWidth:320, boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(34,230,152,0.18)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <Gift size={22} strokeWidth={1.5} color="#22E698" />
            </div>
            <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:'#fff', textAlign:'center', marginBottom:6 }}>¿Canjear {confirmPrize.name}?</div>
            <div style={{ fontSize:12, color:C.mist, textAlign:'center', lineHeight:1.6, marginBottom:20 }}>
              Se descontarán <strong style={{ color:'#fff' }}>{confirmPrize.cost} {unitLabel}</strong> de tu cuenta. Mostrá la pantalla al encargado del negocio.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmPrize(null)} style={{ flex:1, padding:'11px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
              <button onClick={() => { const p = confirmPrize; setConfirmPrize(null); doRedeem(p) }}
                style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(34,197,94,0.35)' }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOASTS ── */}
      {/* ── LOGIN INTERSTITIAL ── Antes de saltar a Google, dejar volver. */}
      {showLoginPrompt && (
        <div style={{ position:'fixed', inset:0, zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => { if (e.target===e.currentTarget) setShowLoginPrompt(false) }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }} />
          <div style={{ position:'relative', borderRadius:24, padding:'28px 22px', width:'100%', maxWidth:340, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)', boxShadow:'0 32px 80px rgba(0,0,0,0.6)', animation:'fadeUp .3s ease' }}>
            <div style={{ width:50, height:50, borderRadius:'50%', background:'rgba(189,75,248,0.18)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <span style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:'#BD4BF8' }}>G</span>
            </div>
            <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:C.white, textAlign:'center', marginBottom:8 }}>Iniciar sesión con Google</div>
            <div style={{ fontSize:13, color:C.mist, textAlign:'center', lineHeight:1.7, marginBottom:22 }}>Te vamos a redirigir a Google para iniciar sesión. Después volvés a Benefix automáticamente.</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowLoginPrompt(false)} style={{ flex:1, padding:'11px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:'#F0EAFF', fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>← Volver</button>
              <button onClick={confirmGoogleLogin} style={{ flex:1, padding:'11px', background:'linear-gradient(135deg, #BD4BF8, #FE5000)', border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer' }}>Continuar →</button>
            </div>
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div style={{ position:'fixed', top:16, left:16, right:16, zIndex:900, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
          {toasts.map(t => {
            const isOk = t.type === 'success'
            return (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background: isOk ? 'rgba(34,230,152,0.14)' : 'rgba(248,116,68,0.14)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:`1px solid ${isOk ? 'rgba(34,230,152,0.30)' : 'rgba(248,116,68,0.30)'}`, borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', animation:'fadeUp .3s ease' }}>
                <span style={{ fontSize:15 }}>{isOk ? '✓' : '!'}</span>
                <span style={{ fontSize:13, color:'#F0EAFF', fontFamily:FI, lineHeight:1.4, flex:1 }}>{t.msg}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
