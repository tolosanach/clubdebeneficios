'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getSupabase as getSharedSupabase } from '../../../lib/supabase'
import {
  Home, Gift, QrCode, User, Users,
  ChevronLeft, ChevronDown, ChevronRight,
  MapPin, Clock, Camera,
  Flame, Star, Gem, Sparkles,
  Coffee, Scissors, Utensils, ShoppingBag, Wrench, Building2,
  Shield, MessageCircle, ArrowRight, Check, Smartphone,
  ScanLine, LogOut, Percent,
  Eye, Store, LayoutDashboard, DoorOpen,
  Bell, BellOff, Pen, X, Calendar,
} from 'lucide-react'
import PhoneInput from '../../../lib/PhoneInput'
import HelpBanner from '../../../lib/HelpBanner'
import { FAMILIES_DATA } from '../../../lib/commerce-families-data'
// Floating action stack — los mismos que monta app/page.js. Se mantienen
// en /club/[slug] para que el user logueado conserve el acceso a la
// campana de notificaciones + chat de soporte sin importar qué página
// está mirando.
import FloatingActionsTab from '../../../lib/FloatingActionsTab'
import NotificationsBell from '../../../lib/NotificationsBell'
import SupportChat from '../../../lib/SupportChat'
import EnablePushPrompt from '../../../lib/EnablePushPrompt'
import SwRegister from '../../../lib/sw-register'

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

// Reusamos el cliente compartido (singleton de @supabase/ssr con cookies). El
// "getSupabase" local que existía antes creaba una NUEVA instancia con
// @supabase/supabase-js que usaba localStorage en vez de cookies — esa
// instancia no veía la sesión y rompía el flujo de unirse al club.
function getSupabase() {
  return getSharedSupabase()
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
  @keyframes brand-bar-flow {
    0%, 100% { background-position: 100% 0; }
    50%      { background-position:   0% 0; }
  }
  /* Pulse sutil para la barra cuando el cliente todavía no llegó al cost
     del premio. Solo varía el glow — el color del fill (violeta pleno) se
     mantiene quieto. Da sensación de "vivo" sin distraer. */
  @keyframes brand-bar-pulse {
    0%, 100% { box-shadow: 0 0 8px rgba(189,75,248,0.45), inset 0 0 6px rgba(255,255,255,0.20); }
    50%      { box-shadow: 0 0 14px rgba(189,75,248,0.70), inset 0 0 10px rgba(255,255,255,0.32); }
  }
  @keyframes gradient-slow {
    0%,100% { background-position: 0% 50%; }
    50%     { background-position: 100% 50%; }
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  html,body { background:#0a0a0f; }
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-thumb { background:rgba(168,85,247,0.4); border-radius:2px; }
  .prize-gallery-strip::-webkit-scrollbar { display:none; }
  .prize-gallery-strip { scrollbar-width: none; }
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
        {/* X cerrar — antes solo se cerraba con tap en el backdrop o con
            el CTA "Ver el club" del fondo. Algunos clientes no encontraban
            cómo descartar el modal sin entrar al club, así que agregamos
            la cruz arriba a la derecha como salida explícita. */}
        <button onClick={close} aria-label="Cerrar" title="Cerrar"
          style={{ position:'absolute', top:12, right:12, zIndex:5, width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }}>
          <X size={16} strokeWidth={2.4} />
        </button>
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

  // Proporciones iOS-style del slider "Deslizá para apagar":
  // - container alto: 78px (más generoso que el 64 anterior)
  // - thumb: 70px de diámetro con 4px de padding en todos los lados
  // - el offset del touch al centro del thumb es la mitad del diámetro = 35
  // maxSlide queda = width - thumbDiameter - paddingLeft - paddingRight
  //                = width - 70 - 4 - 4 = width - 78
  const maxSlide = () => (containerRef.current?.offsetWidth || 344) - 78

  const handleStart = () => { if (!isDemoClub) setIsDragging(true) }

  const handleMove = (clientX) => {
    if (!isDragging || isComplete || isDemoClub) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    // 39 = (thumb 70 / 2) + padding-left 4 — centra el thumb en el dedo.
    setSlideX(Math.max(0, Math.min(clientX - rect.left - 39, maxSlide())))
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
        // Altura 78px → mismas proporciones iOS-like del slider de "deslizar
        // para apagar": pill bien generoso con thumb grande y padding parejo.
        position:'relative', width:'100%', height:78,
        background:'rgba(168,85,247,0.08)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        border:'1px solid rgba(168,85,247,0.35)',
        borderRadius:9999, overflow:'hidden',
        userSelect:'none',
        // touchAction:'none' le dice al browser que este elemento no scrollea
        // ni hace zoom — así no necesitamos preventDefault en touchmove (que
        // ahora es passive por default y tira warnings cuando se llama).
        touchAction:'none',
        cursor: isDemoClub ? 'default' : 'pointer',
        boxShadow:'0 0 24px rgba(168,85,247,0.15)',
      }}
      onMouseMove={e => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchMove={e => handleMove(e.touches[0].clientX)}
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

      {/* Texto central — fontSize escalado al alto nuevo del pill (78px) */}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        <span style={{ color:'rgba(255,255,255,0.9)', fontSize:16, fontFamily:FN, fontWeight:600, opacity: slideX > 50 ? 0 : 1, transition:'opacity 0.2s', letterSpacing:'-0.01em' }}>
          {isDemoClub ? 'Negocio de ejemplo' : 'Deslizá para unirte'}
        </span>
        <span style={{ color:'#fff', fontSize:16, fontFamily:FN, fontWeight:600, position:'absolute', opacity: isComplete ? 1 : 0, transition:'opacity 0.3s' }}>
          ¡Bienvenido!
        </span>
      </div>

      {/* Flechas — corridas a la derecha del thumb agrandado (thumb=70 + left=4 + 14gap = 88) */}
      <div style={{ position:'absolute', left:88, top:0, bottom:0, display:'flex', alignItems:'center', gap:1, pointerEvents:'none', opacity: slideX > 30 ? 0 : 1, transition:'opacity 0.2s' }}>
        <ChevronRight size={18} color="rgba(168,85,247,0.9)" className="animate-arrow" style={{ animationDelay:'0ms' }} />
        <ChevronRight size={18} color="rgba(168,85,247,0.6)" className="animate-arrow" style={{ animationDelay:'200ms' }} />
        <ChevronRight size={18} color="rgba(168,85,247,0.35)" className="animate-arrow" style={{ animationDelay:'400ms' }} />
      </div>

      {/* Thumb — 70x70 con padding parejo de 4px arriba/abajo/izquierda
          (78 - 70 = 8 → 4 cada lado), proporciones iOS-style. */}
      <div
        style={{
          position:'absolute', top:4, left:4,
          width:70, height:70,
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
        onTouchStart={() => { if (!isDemoClub) handleStart() }}
      >
        {isComplete
          ? <Check size={30} color="#fff" strokeWidth={2.5} />
          : <ArrowRight size={28} color="#fff" strokeWidth={2.5} />
        }
      </div>
    </div>
  )
}

// InlineEditModal — modal de edición que aparece cuando el dueño toca un
// lápiz en /club/[slug]?edit=1. Replica los mismos campos del panel de
// configuración del negocio (no es una versión simplificada). Al guardar,
// llama a /api/save-commerce-config (para campos del comercio) o updatea
// la tabla prizes directo via supabase (para premios). El padre se entera
// vía onSavedCommerce / onSavedPrize / onDeletedPrize.
function InlineEditModal({ title, field, initial, inputStyle, labelStyle, onClose, onSavedCommerce, onSavedPrize, onDeletedPrize }) {
  const supabase = getSharedSupabase()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  // Estado del form — varía según `field`. Para campos simples (name, etc.)
  // es un string. Para 'address' y 'prize' son objetos.
  const [val, setVal] = useState(() => {
    if (field === 'address') {
      return {
        country:   initial?.country   || '',
        province:  initial?.province  || '',
        city_name: initial?.city_name || '',
        address:   initial?.address   || '',
      }
    }
    if (field === 'prize') {
      return {
        name:        initial?.name        || '',
        description: initial?.description || '',
        cost:        initial?.cost ?? '',
        stock:       initial?.stock ?? '',
        img_url:     initial?.img_url     || '',
        active:      initial?.active !== false,
      }
    }
    if (field === 'category') {
      // Hasta 3 categorías. initial.categories es la fuente de verdad; si no
      // viene, caemos al singular legacy.
      const arr = Array.isArray(initial?.categories) && initial.categories.length
        ? initial.categories
        : (initial?.category ? [initial.category] : [])
      return { categories: arr.slice(0, 3), customDraft: '' }
    }
    if (field === 'name')        return initial?.name        || ''
    if (field === 'description') return initial?.description || ''
    if (field === 'instagram')   return initial?.instagram   || ''
    if (field === 'facebook')    return initial?.facebook    || ''
    if (field === 'phone')       return initial?.phone       || ''
    return ''
  })

  async function save() {
    setError('')
    setSaving(true)
    try {
      // ── Campos del comercio ──
      if (field !== 'prize') {
        const payload = { commerce_id: initial?.id }
        if (field === 'address') {
          payload.country   = val.country?.trim()   || null
          payload.province  = val.province?.trim()  || null
          payload.city_name = val.city_name?.trim() || null
          payload.address   = val.address?.trim()   || null
        } else if (field === 'category') {
          // Validación local — al menos una categoría.
          const cats = (val.categories || []).map(c => (c || '').trim()).filter(Boolean)
          if (cats.length === 0) {
            setError('Elegí al menos una categoría.')
            setSaving(false)
            return
          }
          if (cats.length > 3) {
            setError('Máximo 3 categorías.')
            setSaving(false)
            return
          }
          payload.categories = cats
        } else {
          payload[field] = (val || '').trim() || null
        }
        const res = await fetch('/api/save-commerce-config', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(payload),
        })
        const d = await res.json()
        if (!res.ok || d.error) {
          setError(d.message || d.error || 'No se pudo guardar')
          setSaving(false)
          return
        }
        // Devolvemos solo los campos que cambiaron para mergear local
        const updates = {}
        if (field === 'address') {
          updates.country   = payload.country
          updates.province  = payload.province
          updates.city_name = payload.city_name
          updates.address   = payload.address
          if (d.lat !== undefined) updates.lat = d.lat
          if (d.lng !== undefined) updates.lng = d.lng
        } else if (field === 'category') {
          updates.categories = payload.categories
          updates.category   = payload.categories[0]
        } else {
          updates[field] = payload[field]
        }
        onSavedCommerce?.(updates)
        return
      }
      // ── Premio ──
      const updates = {
        name:        val.name?.trim() || initial.name,
        description: val.description?.trim() || null,
        cost:        parseInt(val.cost, 10) || 0,
        stock:       val.stock === '' || val.stock === null ? null : parseInt(val.stock, 10),
        img_url:     val.img_url || null,
        active:      !!val.active,
      }
      const { data: updated, error: upErr } = await supabase
        .from('prizes').update(updates).eq('id', initial.id).select().single()
      if (upErr) { setError(upErr.message || 'No se pudo guardar'); setSaving(false); return }
      onSavedPrize?.(updated || { ...initial, ...updates })
    } catch (e) {
      setError(e?.message || 'Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  async function deletePrize() {
    if (field !== 'prize' || !initial?.id) return
    if (typeof window !== 'undefined') {
      const ok = window.confirm(`¿Borrar el premio "${initial.name}"? Esta acción no se puede deshacer.`)
      if (!ok) return
    }
    setSaving(true)
    try {
      const { error: delErr } = await supabase.from('prizes').delete().eq('id', initial.id)
      if (delErr) { setError(delErr.message || 'No se pudo borrar'); setSaving(false); return }
      onDeletedPrize?.(initial.id)
    } catch (e) {
      setError(e?.message || 'Error de conexión')
      setSaving(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:900, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)' }} />
      <div style={{
        position:'relative', width:'100%', maxWidth:520, maxHeight:'92vh',
        background:'#0a0a14',
        border:'1px solid rgba(189,75,248,0.30)',
        borderRadius:'24px 24px 0 0',
        overflow:'hidden',
        display:'flex', flexDirection:'column',
        animation:'fadeUp .3s cubic-bezier(0.16,1,0.3,1)',
        boxShadow:'0 -16px 64px rgba(0,0,0,0.55)',
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div style={{ fontSize:10, color:'#BD4BF8', fontWeight:800, letterSpacing:'.18em', textTransform:'uppercase', marginBottom:4, fontFamily:'inherit' }}>Editar</div>
            <h2 style={{ fontSize:18, fontWeight:900, color:'#fff', margin:0, letterSpacing:'-.01em', fontFamily:'inherit' }}>{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'50%', width:32, height:32, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
            <X size={15} strokeWidth={2.4} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>
          {/* Campos según tipo */}
          {field === 'name' && (
            <div>
              <label style={labelStyle}>Nombre</label>
              <input type="text" value={val} onChange={e => setVal(e.target.value)} placeholder="Nombre del negocio" style={inputStyle} autoFocus />
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:8 }}>
                Solo podés cambiar el nombre cada 20 días.
              </p>
            </div>
          )}
          {field === 'description' && (
            <div>
              <label style={labelStyle}>Descripción</label>
              <textarea value={val} onChange={e => setVal(e.target.value)} placeholder="Contale a tus clientes qué hacés, qué ofrecés y por qué te elegirían…" rows={6}
                style={{ ...inputStyle, resize:'vertical', minHeight:120, lineHeight:1.5 }} autoFocus />
            </div>
          )}
          {field === 'instagram' && (
            <div>
              <label style={labelStyle}>Instagram</label>
              <input type="text" value={val} onChange={e => setVal(e.target.value)} placeholder="@tuusuario" style={inputStyle} autoFocus />
            </div>
          )}
          {field === 'facebook' && (
            <div>
              <label style={labelStyle}>Facebook</label>
              <input type="text" value={val} onChange={e => setVal(e.target.value)} placeholder="facebook.com/tunegocio" style={inputStyle} autoFocus />
            </div>
          )}
          {field === 'phone' && (
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input type="tel" value={val} onChange={e => setVal(e.target.value)} placeholder="+54 9 11 …" style={inputStyle} autoFocus />
            </div>
          )}
          {field === 'address' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={labelStyle}>País</label>
                <input type="text" value={val.country} onChange={e => setVal(v => ({ ...v, country: e.target.value }))} placeholder="Argentina" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Provincia</label>
                <input type="text" value={val.province} onChange={e => setVal(v => ({ ...v, province: e.target.value }))} placeholder="Ej: La Pampa" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Localidad</label>
                <input type="text" value={val.city_name} onChange={e => setVal(v => ({ ...v, city_name: e.target.value }))} placeholder="Ej: General Pico" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <input type="text" value={val.address} onChange={e => setVal(v => ({ ...v, address: e.target.value }))} placeholder="Calle y número" style={inputStyle} autoFocus />
              </div>
            </div>
          )}
          {field === 'category' && (() => {
            const selected = val.categories || []
            const customDraft = val.customDraft || ''
            const toggleCat = (name) => {
              setVal(v => {
                const cur = v.categories || []
                if (cur.includes(name)) {
                  return { ...v, categories: cur.filter(c => c !== name) }
                }
                if (cur.length >= 3) return v
                return { ...v, categories: [...cur, name] }
              })
            }
            const addCustom = () => {
              const t = (customDraft || '').trim()
              if (!t) return
              setVal(v => {
                const cur = v.categories || []
                if (cur.includes(t)) return { ...v, customDraft: '' }
                if (cur.length >= 3) return { ...v, customDraft: '' }
                return { ...v, categories: [...cur, t], customDraft: '' }
              })
            }
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={labelStyle}>Categorías seleccionadas (máx 3)</label>
                  {selected.length === 0 ? (
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', padding:'10px 12px', background:'rgba(255,255,255,0.04)', border:'1px dashed rgba(255,255,255,0.16)', borderRadius:10 }}>
                      Todavía no elegiste ninguna.
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {selected.map(c => (
                        <span key={c} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 10px 6px 12px', background:'linear-gradient(135deg, rgba(124,58,237,0.30), rgba(189,75,248,0.30))', border:'1px solid rgba(189,75,248,0.45)', borderRadius:99, fontSize:12, color:'#fff', fontWeight:700 }}>
                          {c}
                          <button onClick={() => toggleCat(c)} aria-label={`Sacar ${c}`}
                            style={{ background:'rgba(0,0,0,0.30)', border:'none', borderRadius:'50%', width:18, height:18, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                            <X size={10} strokeWidth={2.6} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Otro (rubro personalizado)</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <input type="text" value={customDraft}
                      onChange={e => setVal(v => ({ ...v, customDraft: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                      placeholder="Ej: Estudio de tatuajes"
                      style={{ ...inputStyle, flex:1 }} />
                    <button onClick={addCustom} disabled={!customDraft.trim() || selected.length >= 3}
                      style={{ padding:'0 14px', background:'rgba(189,75,248,0.18)', color:'#fff', border:'1px solid rgba(189,75,248,0.45)', borderRadius:10, fontSize:12, fontWeight:800, cursor: !customDraft.trim() || selected.length >= 3 ? 'not-allowed' : 'pointer', opacity: !customDraft.trim() || selected.length >= 3 ? 0.5 : 1, fontFamily:'inherit', whiteSpace:'nowrap' }}>
                      Añadir
                    </button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Elegí desde la lista</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:14, maxHeight:340, overflowY:'auto', padding:'4px 2px' }}>
                    {FAMILIES_DATA.map(fam => (
                      <div key={fam.id}>
                        <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:6 }}>
                          {fam.name}
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {fam.subs.map(s => {
                            const isSel = selected.includes(s.name)
                            const disabled = !isSel && selected.length >= 3
                            return (
                              <button key={s.name} onClick={() => toggleCat(s.name)} disabled={disabled}
                                style={{
                                  padding:'6px 10px', borderRadius:99, fontSize:11.5, fontWeight:700, fontFamily:'inherit',
                                  cursor: disabled ? 'not-allowed' : 'pointer',
                                  background: isSel ? 'linear-gradient(135deg, #7C3AED, #BD4BF8)' : 'rgba(255,255,255,0.05)',
                                  color: isSel ? '#fff' : 'rgba(255,255,255,0.78)',
                                  border: isSel ? '1px solid rgba(189,75,248,0.55)' : '1px solid rgba(255,255,255,0.10)',
                                  opacity: disabled ? 0.4 : 1,
                                }}>
                                {s.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
          {field === 'prize' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Imagen */}
              <div>
                <label style={labelStyle}>Foto del premio</label>
                {val.img_url ? (
                  <div style={{ position:'relative', display:'inline-block' }}>
                    <img src={val.img_url} alt="" style={{ width:96, height:96, borderRadius:12, objectFit:'cover', display:'block' }} />
                    <button onClick={() => setVal(v => ({ ...v, img_url:'' }))}
                      style={{ position:'absolute', top:-6, right:-6, background:'#000', border:'1px solid rgba(255,255,255,0.20)', borderRadius:'50%', width:24, height:24, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input type="file" accept="image/*" id="inline-edit-prize-img" style={{ display:'none' }}
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (!file) return
                        setSaving(true)
                        try {
                          const ext = (file.name.split('.').pop()||'jpg').toLowerCase()
                          const path = `${initial.commerce_id || 'prize'}/${Date.now()}.${ext}`
                          const { error } = await supabase.storage.from('prize-images').upload(path, file, { upsert:false })
                          if (error) throw error
                          const { data } = supabase.storage.from('prize-images').getPublicUrl(path)
                          setVal(v => ({ ...v, img_url: data.publicUrl }))
                        } catch (err) { setError(err.message || 'Error al subir foto') }
                        finally { setSaving(false) }
                      }} />
                    <label htmlFor="inline-edit-prize-img"
                      style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 14px', background:'rgba(255,255,255,0.04)', border:'1px dashed rgba(255,255,255,0.20)', borderRadius:10, fontSize:12, color:'rgba(255,255,255,0.65)', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                      <Camera size={14} strokeWidth={2} /> Subir foto
                    </label>
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Título</label>
                <input type="text" value={val.name} onChange={e => setVal(v => ({ ...v, name: e.target.value }))} placeholder="Café gratis" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Descripción (opcional)</label>
                <textarea value={val.description} onChange={e => setVal(v => ({ ...v, description: e.target.value }))} placeholder="Detalle del premio…" rows={3}
                  style={{ ...inputStyle, resize:'vertical', minHeight:70, lineHeight:1.5 }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={labelStyle}>Costo</label>
                  <input type="number" min="1" value={val.cost} onChange={e => setVal(v => ({ ...v, cost: e.target.value }))} placeholder="10" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Stock (opcional)</label>
                  <input type="number" min="0" value={val.stock ?? ''} onChange={e => setVal(v => ({ ...v, stock: e.target.value }))} placeholder="∞" style={inputStyle} />
                </div>
              </div>
              {/* Toggle activo */}
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none', padding:'10px 12px', background:'rgba(255,255,255,0.04)', borderRadius:10, border:'1px solid rgba(255,255,255,0.10)' }}>
                <input type="checkbox" checked={!!val.active} onChange={e => setVal(v => ({ ...v, active: e.target.checked }))}
                  style={{ width:18, height:18, accentColor:'#BD4BF8' }} />
                <span style={{ fontSize:13, color:'#fff', fontFamily:'inherit', fontWeight:600 }}>Activo en el catálogo</span>
              </label>
              {/* Botón eliminar */}
              <button onClick={deletePrize} disabled={saving}
                style={{ marginTop:6, padding:'10px 14px', background:'transparent', color:'#f87171', border:'1px solid rgba(248,113,113,0.40)', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Eliminar premio
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginTop:14, padding:'10px 12px', background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.36)', borderRadius:10, fontSize:12, color:'#fca5a5' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px calc(14px + env(safe-area-inset-bottom, 0px))', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:10 }}>
          <button onClick={onClose} disabled={saving}
            style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.06)', color:'#fff', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            style={{ flex:2, padding:'12px', background:'linear-gradient(135deg, #7C3AED, #BD4BF8)', color:'#fff', border:'none', borderRadius:12, fontSize:13, fontWeight:800, cursor: saving ? 'wait' : 'pointer', boxShadow:'0 6px 18px rgba(189,75,248,0.45)', fontFamily:'inherit', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ClubNotifyBell — versión compacta de ClubNotifyToggle, diseñada para
// vivir flotando sobre la esquina superior-derecha de la portada del club.
// Botón circular 40x40 (igual que el back button del cover). Al cargar
// muestra el ícono apagado; con animación de "wiggle" cada 2s para llamar
// la atención del usuario que aún no se suscribió. Al activar la suscripción
// el ícono pasa a fucsia/violeta sólido y la animación se apaga.
function ClubNotifyBell({ commerceId, commerceName, onToggleResult }) {
  const [loaded,     setLoaded]     = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy,       setBusy]       = useState(false)
  useEffect(() => {
    if (!commerceId) return
    fetch(`/api/club-subscription?commerce_id=${commerceId}`, { cache:'no-store' })
      .then(r => r.json())
      .then(d => { if (d?.ok) setSubscribed(!!d.subscribed) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [commerceId])
  async function toggle(e) {
    e?.stopPropagation?.()
    if (busy || !commerceId) return
    setBusy(true)
    const next = !subscribed
    setSubscribed(next)
    let success = true
    try {
      const res = await fetch('/api/club-subscription', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commerce_id: commerceId }),
      })
      if (!res.ok) success = false
    } catch {
      success = false
      setSubscribed(!next)
    } finally {
      setBusy(false)
    }
    // Reportar el resultado al padre para que pueda mostrar un toast
    // y darle feedback al user. Sin esto, el unico cambio era el icono
    // pasando de blanco a fucsia, dificil de notar.
    if (typeof onToggleResult === 'function') {
      onToggleResult({ subscribed: success ? next : !next, success, commerceName })
    }
  }
  // Animación de campanita: shake/wiggle cada 2 segundos cuando el cliente
  // todavía NO está suscripto. Una vez activado, se apaga (no necesita
  // pedir más atención).
  return (
    <button
      onClick={toggle}
      aria-label={subscribed ? 'Desactivar notificaciones del club' : 'Activar notificaciones del club'}
      title={subscribed ? 'Recibís novedades de este club' : 'Avisame de premios y promos'}
      style={{
        position:'absolute', top:16, right:16, zIndex:20,
        width:40, height:40, borderRadius:'50%',
        background: subscribed
          ? 'linear-gradient(135deg, #BD4BF8, #EC4899)'
          : 'rgba(0,0,0,0.50)',
        backdropFilter: subscribed ? 'none' : 'blur(12px)',
        WebkitBackdropFilter: subscribed ? 'none' : 'blur(12px)',
        border: subscribed ? 'none' : '1px solid rgba(255,255,255,0.18)',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor: busy ? 'wait' : 'pointer',
        color:'#fff', padding:0,
        boxShadow: subscribed
          ? '0 4px 16px rgba(189,75,248,0.55)'
          : '0 4px 12px rgba(0,0,0,0.35)',
        transition: 'background 220ms ease, box-shadow 220ms ease',
        opacity: loaded ? 1 : 0.7,
      }}>
      <style>{`
        @keyframes bell-wiggle {
          0%, 88%, 100% { transform: rotate(0deg); }
          90% { transform: rotate(-12deg); }
          92% { transform: rotate(10deg); }
          94% { transform: rotate(-8deg); }
          96% { transform: rotate(6deg); }
          98% { transform: rotate(-3deg); }
        }
      `}</style>
      <Bell
        size={18}
        strokeWidth={2.4}
        style={{
          animation: subscribed ? 'none' : 'bell-wiggle 2s ease-in-out infinite',
          transformOrigin: '50% 0%',
        }}
      />
    </button>
  )
}

// ClubNotifyToggle — campanita para que el cliente reciba notificaciones
// cuando este comercio carga premio nuevo o promo nueva. La preferencia
// se guarda en la tabla `club_subscriptions` vía /api/club-subscription.
// Inicialmente lee el estado al montar; mientras tanto muestra el ícono
// con opacidad reducida. Toggle anima al toque (off → on enciende un
// glow). El cliente puede no ser miembro y aún así suscribirse — la idea
// es enterarse de novedades aunque no haya entrado todavía al club.
function ClubNotifyToggle({ commerceId, commerceName }) {
  const [loaded,     setLoaded]     = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy,       setBusy]       = useState(false)
  useEffect(() => {
    if (!commerceId) return
    fetch(`/api/club-subscription?commerce_id=${commerceId}`, { cache:'no-store' })
      .then(r => r.json())
      .then(d => { if (d?.ok) { setSubscribed(!!d.subscribed) } })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [commerceId])
  async function toggle() {
    if (busy || !commerceId) return
    setBusy(true)
    const next = !subscribed
    setSubscribed(next)  // optimistic
    try {
      if (next) {
        await fetch('/api/club-subscription', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ commerce_id: commerceId }),
        })
      } else {
        await fetch('/api/club-subscription', {
          method:'DELETE',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ commerce_id: commerceId }),
        })
      }
    } catch {
      setSubscribed(!next)  // rollback en error
    } finally {
      setBusy(false)
    }
  }
  return (
    <button onClick={toggle}
      aria-label={subscribed ? 'Desactivar notificaciones' : 'Activar notificaciones'}
      style={{
        display:'flex', alignItems:'center', gap:10,
        width:'100%', padding:'12px 14px',
        background: subscribed
          ? 'linear-gradient(135deg, rgba(189,75,248,0.20), rgba(236,72,153,0.18))'
          : 'rgba(255,255,255,0.04)',
        border: subscribed
          ? '1px solid rgba(189,75,248,0.45)'
          : '1px solid rgba(255,255,255,0.10)',
        borderRadius: 14,
        cursor: busy ? 'wait' : 'pointer',
        opacity: loaded ? 1 : 0.55,
        transition: 'background 200ms ease, border-color 200ms ease',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: subscribed
          ? 'linear-gradient(135deg, #BD4BF8, #EC4899)'
          : 'rgba(255,255,255,0.06)',
        border: subscribed ? 'none' : '1px solid rgba(255,255,255,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: subscribed ? '0 4px 14px rgba(189,75,248,0.40)' : 'none',
      }}>
        {subscribed
          ? <Bell size={16} color="#fff" strokeWidth={2.4} />
          : <BellOff size={16} color="rgba(255,255,255,0.55)" strokeWidth={2.2} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: FN }}>
          {subscribed ? 'Recibís novedades de este club' : 'Avisame de premios y promos nuevas'}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
          {subscribed
            ? `Te avisamos cuando ${commerceName || 'el comercio'} cargue algo nuevo`
            : 'Tap para activar la campanita'}
        </div>
      </div>
      {/* Switch visual */}
      <div style={{
        flexShrink: 0,
        width: 38, height: 22, borderRadius: 99,
        background: subscribed ? 'rgba(189,75,248,0.55)' : 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.14)',
        position: 'relative',
        transition: 'background 220ms ease',
      }}>
        <div style={{
          position: 'absolute',
          top: 2, left: subscribed ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.30)',
          transition: 'left 220ms cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>
    </button>
  )
}

function MemberBadge({ createdAt }) {
  const since = createdAt
    ? new Date(createdAt).toLocaleDateString('es-AR', { month:'long', year:'numeric' })
    : null
  // Versión minimal: solo una línea de texto violeta + ícono outline.
  // Sin contenedor de fondo, sin border, sin padding pesado.
  // Efecto de brillo: la base es violeta, y un highlight más claro
  // recorre el texto de izquierda a derecha en loop sutil. El gradient
  // se clipea al texto vía background-clip para que el shine "viva
  // adentro" del trazo de las letras.
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:7,
      fontFamily:FN, fontSize:13, fontWeight:600,
      letterSpacing:'.005em',
      padding:'2px 2px',
      color:'#BD4BF8',
    }}>
      <style>{`
        @keyframes member-badge-shimmer {
          0%   { background-position: 150% 0; }
          100% { background-position: -50% 0; }
        }
      `}</style>
      <Check size={14} color="#BD4BF8" strokeWidth={2.2}
        style={{ flexShrink: 0 }}
      />
      <span style={{
        background: 'linear-gradient(100deg, #BD4BF8 0%, #BD4BF8 40%, #F0C2FF 50%, #BD4BF8 60%, #BD4BF8 100%)',
        backgroundSize: '300% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'member-badge-shimmer 3.5s linear infinite',
      }}>
        Ya sos parte de este club.
        {since && (
          <span style={{ fontWeight: 400, opacity: 0.85 }}> (desde {since})</span>
        )}
      </span>
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
            .select('id, redeemed_at, created_at, points_spent, kind, discount_value, prize:prizes(name), promotion:promotions(value, description)')
            .eq('user_id', user.id).eq('commerce_id', commerceId)
            .order('created_at', { ascending: false }).limit(50),
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
    ...redemptions.map(r => {
      const isDiscount = r.kind === 'discount'
      // discount_value es el % off, prefiero leer del propio registro para
      // que el historial mantenga el dato aunque la promo se haya editado.
      const discountVal = r.discount_value ?? r.promotion?.value
      return {
        kind: isDiscount ? 'discount' : 'redeem',
        date: r.redeemed_at || r.created_at,
        points: r.points_spent,
        prizeName: r.prize?.name,
        discountVal,
        id: 'r-'+r.id,
      }
    }),
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
            <div style={{ width:38, height:38, borderRadius:10, background: isVisit ? 'rgba(168,85,247,0.12)' : it.kind === 'discount' ? 'rgba(254,80,0,0.14)' : 'rgba(236,72,153,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {isVisit
                ? <UnitIcon size={16} {...unitIconProps} color={unitColor} />
                : it.kind === 'discount'
                  ? <Percent size={16} color="#FE5000" strokeWidth={2} />
                  : <Gift size={16} color="#EC4899" strokeWidth={2} />}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:FN, fontSize:13, fontWeight:600, color:C.white, marginBottom:2 }}>
                {isVisit
                  ? 'Visita registrada'
                  : it.kind === 'discount'
                    ? `Descuento aplicado${it.discountVal ? ` · ${it.discountVal}% OFF` : ''}`
                    : `Canje: ${it.prizeName || 'Premio'}`}
              </div>
              <div style={{ fontSize:11, color:C.mist }}>{dateStr} · {timeStr}{isVisit && it.amount > 0 ? ` · $${Number(it.amount).toLocaleString('es-AR')}` : ''}</div>
            </div>
            <div style={{ flexShrink:0, fontFamily:FN, fontSize:13, fontWeight:700, color: isVisit ? unitColor : it.kind === 'discount' ? '#FE5000' : '#EC4899' }}>
              {isVisit
                ? `+${it.points || 1} ${unitLabel === 'estrellas' ? '★' : 'pts'}`
                : it.kind === 'discount'
                  ? (it.discountVal ? `${it.discountVal}%` : 'OFF')
                  : `-${it.points || 0} ${unitLabel === 'estrellas' ? '★' : 'pts'}`}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Nav de pestañas — pegado arriba abajo del navbar global, con gradient
// naranja-violeta. Mismo formato que el nav cliente (Mis Clubs / Historial / Mi QR).
// CoverSlideshowAutoAdvance — wrapper que solo monta un useEffect con
// setInterval para llamar onAdvance cada 4.5s. Se separa del HERO
// para mantener los hooks contenidos en su propio componente y evitar
// que un re-render del HERO reinicie el timer.
function CoverSlideshowAutoAdvance({ count, onAdvance }) {
  useEffect(() => {
    if (count < 2) return
    const id = setInterval(onAdvance, 4500)
    return () => clearInterval(id)
  }, [count, onAdvance])
  return null
}

// CoverLightboxGallery — lightbox full-screen con scroll horizontal +
// scroll-snap entre todas las portadas del comercio. Antes era una sola
// imagen estática y el cliente tenía que cerrar para ver la siguiente; ahora
// puede swipear entre todas en zoom, igual que en Instagram. La imagen
// inicial se selecciona con scrollLeft = startIdx * vw apenas se monta.
function CoverLightboxGallery({ covers, startIdx, onClose, scrollRef }) {
  const [activeIdx, setActiveIdx] = useState(startIdx)
  const innerRef = scrollRef || useRef(null)

  // Posicionamos el scroll en la imagen inicial al montar.
  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollLeft = startIdx * el.clientWidth
    })
  }, [startIdx, innerRef])

  // Trackear cuál imagen está visible para los dots de paginación.
  function onScroll() {
    const el = innerRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== activeIdx) setActiveIdx(idx)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.94)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 220ms ease',
      }}
    >
      {/* Track scrolleable horizontal con scroll-snap por imagen */}
      <div
        ref={innerRef}
        onScroll={onScroll}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', height: '100%',
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {covers.map((url, i) => (
          <div key={url + i} style={{
            flex: '0 0 100%', height: '100%',
            scrollSnapAlign: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, boxSizing: 'border-box',
          }}>
            <img
              src={url}
              alt=""
              style={{
                maxWidth: '100%', maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 14,
                boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
                userSelect: 'none',
                pointerEvents: 'none', // para que el tap caiga en el contenedor (close)
              }}
            />
          </div>
        ))}
      </div>

      {/* Cerrar */}
      <button
        onClick={onClose}
        aria-label="Cerrar"
        style={{
          position: 'absolute', top: 24, right: 24, zIndex: 2,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.20)',
          color: '#fff', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={18} strokeWidth={2.4} />
      </button>

      {/* Dots de paginación */}
      {covers.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 30, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: 6, zIndex: 2,
        }}>
          {covers.map((_, i) => (
            <span key={i} style={{
              width: i === activeIdx ? 24 : 8, height: 8,
              borderRadius: 99,
              background: i === activeIdx ? '#fff' : 'rgba(255,255,255,0.40)',
              transition: 'width 280ms ease, background 280ms ease',
              boxShadow: i === activeIdx ? '0 0 8px rgba(255,255,255,0.55)' : 'none',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

// LimitedTimeBenefitsSlider — slider auto-rotatorio que muestra las promos
// activas del comercio en la pestaña Catálogo. Estilo marketinero, gradient
// fuerte, ícono grande, contador de días con barra de progreso. Se cicla
// automáticamente cada AUTOSCROLL_MS milisegundos. También permite scroll
// horizontal manual (swipe en mobile, drag/scroll en desktop). Cuando el
// user interactúa, pausamos la auto-rotación temporalmente.
function LimitedTimeBenefitsSlider({ promos, unitLabel, editMode = false, onEdit }) {
  // Slider con auto-scroll CONTINUO LENTO + drag manual con el dedo. El
  // track avanza solo via rAF, pero si el user pone el dedo y arrastra,
  // pausamos el auto-scroll y movemos el track segun el delta del finger.
  // Al soltar, el auto-scroll vuelve desde la posicion actual sin saltos.
  //
  // El offset vive en un ref (no state) para evitar 60 re-renders por
  // segundo — lo aplicamos al DOM directo via trackRef.style.transform.
  // Las cards estan duplicadas ([...list, ...list]) para que cuando el
  // offset llegue al 50% del track, podamos saltar a 0% sin que se vea
  // (el contenido ahi es identico).
  const list  = promos || []
  const count = list.length
  const dupList = count > 0 ? [...list, ...list] : []

  const trackRef     = useRef(null)
  const containerRef = useRef(null)
  const offsetRef    = useRef(0)        // 0..50 (% del track duplicado)
  const draggingRef  = useRef(false)
  const dragStartXRef     = useRef(0)
  const dragStartYRef     = useRef(0)
  const dragStartOffRef   = useRef(0)
  const dragHorizontalRef = useRef(false) // se activa cuando el delta horizontal supera al vertical

  // Auto-scroll loop via rAF. Velocidad: 12s por card. Movimiento
  // expresado como % por ms del track duplicado (50% = 1 ciclo de cards).
  useEffect(() => {
    if (count < 2) return
    const PCT_PER_MS = 50 / (count * 12 * 1000)
    let last = performance.now()
    let rafId
    const tick = (now) => {
      const dt = now - last
      last = now
      if (!draggingRef.current) {
        offsetRef.current += PCT_PER_MS * dt
        if (offsetRef.current >= 50) offsetRef.current -= 50
        if (offsetRef.current < 0)  offsetRef.current += 50
      }
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${-offsetRef.current}%)`
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [count])

  // Drag handlers compartidos entre touch y mouse. dx en pixeles →
  // delta de offset del track, escalado por el ancho del container:
  // mover el dedo `containerWidth` pixeles equivale a 50% del track
  // (= 1 set completo de cards originales).
  const startDrag = (clientX, clientY) => {
    draggingRef.current      = true
    dragStartXRef.current    = clientX
    dragStartYRef.current    = clientY
    dragStartOffRef.current  = offsetRef.current
    dragHorizontalRef.current = false
  }
  const moveDrag = (clientX, clientY) => {
    if (!draggingRef.current) return
    const dx = clientX - dragStartXRef.current
    const dy = clientY - dragStartYRef.current
    // Lock direccional: hasta no decidir, dejamos pasar el scroll vertical.
    // Una vez que abs(dx) > abs(dy) + 4, lockeamos en horizontal y manejamos
    // el drag. Si nunca lockeamos y el user soltar, no hicimos nada.
    if (!dragHorizontalRef.current) {
      if (Math.abs(dy) > Math.abs(dx) + 4) {
        // Es scroll vertical → abortamos drag
        draggingRef.current = false
        return
      }
      if (Math.abs(dx) > Math.abs(dy) + 4) {
        dragHorizontalRef.current = true
      } else {
        return
      }
    }
    const containerW = containerRef.current?.offsetWidth || 1
    // Track duplicado tiene 200% de ancho del container, asi que recorrer
    // containerW pixeles = 50% del track (= 1 set de cards).
    const dxPct = (dx / containerW) * 50
    let next = dragStartOffRef.current - dxPct
    while (next < 0)   next += 50
    while (next >= 50) next -= 50
    offsetRef.current = next
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${-next}%)`
    }
  }
  const endDrag = () => {
    draggingRef.current = false
    dragHorizontalRef.current = false
  }

  const onTouchStart = (e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)
  const onTouchMove  = (e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)
  const onTouchEnd   = () => endDrag()

  const onMouseDown  = (e) => startDrag(e.clientX, e.clientY)
  const onMouseMove  = (e) => moveDrag(e.clientX, e.clientY)
  const onMouseUp    = () => endDrag()
  const onMouseLeave = () => endDrag()

  // Sin promos activas: en modo público no se muestra nada. En editMode
  // sí mostramos un container placeholder con header + lápiz para que el
  // dueño descubra esta sección y vaya a configurar promos. Sin esto, el
  // dueño que entra a editar la página pública nunca sabría que existe
  // este bloque (solo aparecería cuando ya tiene promos activas).
  if (count === 0) {
    if (!editMode) return null
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={16} color="#fff" strokeWidth={2.4} />
            <h3 style={{ fontFamily: FN, fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '.10em', textTransform: 'uppercase', margin: 0 }}>
              Beneficios
            </h3>
          </div>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              title="Editar beneficios"
              aria-label="Editar beneficios"
              style={{
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                width:28, height:28, borderRadius:'50%',
                background:'linear-gradient(135deg, #B45309, #F5A623)',
                border:'1px solid rgba(255,255,255,0.22)',
                color:'#fff', cursor:'pointer', padding:0,
                boxShadow:'0 4px 12px rgba(245,166,35,0.50)',
                flexShrink: 0,
              }}>
              <Pen size={13} strokeWidth={2.4} />
            </button>
          )}
        </div>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.14)',
          textAlign: 'center',
        }}>
          <Flame size={28} color="rgba(255,255,255,0.40)" strokeWidth={1.8} style={{ marginBottom: 10 }} />
          <div style={{ fontFamily: FN, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>
            Sin beneficios activos
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            Activá un %OFF próxima compra o Suma doble para que aparezcan acá.
          </div>
        </div>
      </div>
    )
  }

  // ── Cálculo de urgencia ──
  // Paleta restringida a BLANCO + VIOLETA. La urgencia se comunica con:
  // (a) tamaño/llenado de la barra (mientras más urgente, más llena)
  // (b) intensidad del pulse (HOY/MAÑANA/≤3 días pulsan)
  // (c) microcopy ("¡última chance!", "¡aprovechá ya!", etc)
  // El color del texto/ícono SIEMPRE es blanco; el accent SIEMPRE es violeta.
  const calcUrgency = (promo) => {
    if (promo.expiration_type === 'relative' && promo.expiration_days) {
      return {
        mode: 'relative',
        daysLeft: promo.expiration_days,
        urgencyPct: 35,
        bigText:  `${promo.expiration_days}`,
        bigUnit:  promo.expiration_days === 1 ? 'día' : 'días',
        subtext:  'desde que la activás',
        pulse:    false,
      }
    }
    const target = promo.expiration_date || promo.expires_at
    if (!target) return null
    const now      = Date.now()
    const expMs    = new Date(target).getTime()
    const diffMs   = expMs - now
    const daysLeft = Math.max(0, Math.ceil(diffMs / (24*60*60*1000)))
    let urgencyPct, bigText, bigUnit, subtext, pulse
    if (diffMs <= 0) {
      urgencyPct = 100; bigText = 'YA'; bigUnit = 'no aplica'; subtext = 'venció';            pulse = false
    } else if (daysLeft === 0) {
      urgencyPct = 98;  bigText = 'HOY';     bigUnit = '';     subtext = '¡última chance!';  pulse = true
    } else if (daysLeft === 1) {
      urgencyPct = 92;  bigText = 'MAÑANA';  bigUnit = '';     subtext = '¡última chance!';  pulse = true
    } else if (daysLeft <= 3) {
      urgencyPct = 78;  bigText = String(daysLeft); bigUnit = 'días'; subtext = '¡aprovechá ya!';   pulse = true
    } else if (daysLeft <= 7) {
      urgencyPct = 58;  bigText = String(daysLeft); bigUnit = 'días'; subtext = 'termina pronto';   pulse = false
    } else if (daysLeft <= 14) {
      urgencyPct = 38;  bigText = String(daysLeft); bigUnit = 'días'; subtext = 'tiempo limitado';  pulse = false
    } else {
      urgencyPct = 18;  bigText = String(daysLeft); bigUnit = 'días'; subtext = 'por tiempo limitado'; pulse = false
    }
    const expDate = new Date(target)
    const dd = String(expDate.getDate()).padStart(2,'0')
    const mm = String(expDate.getMonth()+1).padStart(2,'0')
    return { mode: 'fixed', daysLeft, urgencyPct, bigText, bigUnit, subtext, expiryLabel: `Hasta el ${dd}/${mm}`, pulse }
  }

  return (
    // Sin marginBottom propio — el padre (tab unificado) ya provee el
    // gap:16 entre containers, así que cualquier margen extra rompe la
    // grilla de spacing.
    <div>
      {/* Keyframes globales del slider — el shimmer de la barra del
          termómetro de urgencia se reusa entre todas las cards. */}
      <style>{`
        @keyframes urgency-shimmer {
          0%   { background-position: -120% 0; }
          100% { background-position: 220% 0; }
        }
      `}</style>
      {/* Header del bloque */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={16} color="#fff" strokeWidth={2.4} />
          <h3 style={{ fontFamily: FN, fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '.10em', textTransform: 'uppercase', margin: 0 }}>
            Beneficios
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {editMode && onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              title="Editar beneficios"
              aria-label="Editar beneficios"
              style={{
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                width:28, height:28, borderRadius:'50%',
                background:'linear-gradient(135deg, #15803D, #22E698)',
                border:'1px solid rgba(255,255,255,0.22)',
                color:'#fff', cursor:'pointer', padding:0,
                boxShadow:'0 4px 12px rgba(34,230,152,0.50)',
                flexShrink: 0,
              }}>
              <Pen size={13} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>

      {/* Track con auto-scroll continuo + drag manual. rAF en el
          parent de este div maneja la animacion via trackRef.style.
          touch-action: pan-y deja al browser scrollear vertical, pero
          el horizontal lo manejamos nosotros. */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 20,
          touchAction: 'pan-y',
          cursor: count > 1 ? 'grab' : 'default',
          userSelect: 'none',
        }}
      >
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            width: `${count * 200}%`,
            willChange: 'transform',
          }}>
        {dupList.map((promo, i) => {
            const isDouble   = promo.type === 'double_points'
            const isDiscount = promo.type === 'discount_next'
            // Número grande estilo display: para % OFF mostramos el value
            // (ej "10%"), para double_points mostramos "×2". El nombre
            // descriptivo de la promo va como subtítulo abajo.
            const bigDisplay = isDouble
              ? '×2'
              : (promo.value != null ? `${promo.value}%` : '%')
            const subBig     = isDouble ? `Doble ${unitLabel}` : 'OFF'
            const subtitle   = promo.description || (isDouble
              ? 'Acumulás el doble en cada compra'
              : 'En tu próxima visita')
            const urgency    = calcUrgency(promo)

            return (
              <div key={`${promo.id}-${i}`} style={{
                width: `${100 / (count * 2)}%`,
                flexShrink: 0,
                padding: '0 2px',
                boxSizing: 'border-box',
              }}>
                <div style={{
                  // Base muy oscura — el inner glow violeta hace todo el
                  // trabajo visual. Sin animaciones de gradiente: el glow
                  // estático le da personalidad y profundidad sin distraer.
                  background: 'linear-gradient(180deg, #0a0510 0%, #14081f 100%)',
                  borderRadius: 22,
                  padding: '26px 22px 22px',
                  position: 'relative',
                  // overflow hidden siempre — el lápiz ahora vive adentro
                  // de la card, no necesita sobresalir.
                  overflow: 'hidden',
                  minHeight: 240,
                  border: '1px solid rgba(189,75,248,0.22)',
                  // El inner glow: múltiples sombras inset para crear el
                  // efecto "luz violeta saliendo desde los bordes hacia
                  // adentro". Combinado con una sombra externa sutil que
                  // ancla la card al fondo.
                  boxShadow: `
                    inset 0 0 90px 12px rgba(189,75,248,0.55),
                    inset 0 0 30px 4px rgba(189,75,248,0.45),
                    inset 0 0 0 1px rgba(255,255,255,0.06),
                    0 18px 40px rgba(0,0,0,0.50),
                    0 4px 14px rgba(189,75,248,0.18)
                  `,
                  animation: urgency?.pulse ? `card-glow-pulse-${i} 1.8s ease-in-out infinite` : 'none',
                }}>
                  <style>{`
                    @keyframes card-glow-pulse-${i} {
                      0%, 100% {
                        box-shadow:
                          inset 0 0 90px 12px rgba(189,75,248,0.55),
                          inset 0 0 30px 4px rgba(189,75,248,0.45),
                          inset 0 0 0 1px rgba(255,255,255,0.06),
                          0 18px 40px rgba(0,0,0,0.50),
                          0 4px 14px rgba(189,75,248,0.18);
                      }
                      50% {
                        box-shadow:
                          inset 0 0 110px 18px rgba(189,75,248,0.75),
                          inset 0 0 40px 8px  rgba(189,75,248,0.65),
                          inset 0 0 0 1px rgba(255,255,255,0.10),
                          0 18px 44px rgba(0,0,0,0.55),
                          0 4px 22px rgba(189,75,248,0.40);
                      }
                    }
                    @keyframes wave-rise {
                      from { background-position: 0 0; }
                      to   { background-position: 0 -200px; }
                    }
                  `}</style>

                  {/* ── Capa de líneas onduladas que suben lento ──
                      Patrón SVG inline con tres curvas verticales que tilea
                      vertical (200px de alto). Lo animamos con
                      background-position-y para que se sienta un flujo
                      continuo "subiendo" detrás del contenido, encima del
                      glow violeta del fondo. preserveAspectRatio='none' lo
                      estira al ancho de la card; la altura tilea para loop
                      seamless. */}
                  <div aria-hidden style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 200' width='80' height='200' preserveAspectRatio='none'><g fill='none' stroke='rgba(255,255,255,0.13)' stroke-width='1'><path d='M10,0 C25,15 30,35 30,50 C30,65 25,85 10,100 C-5,115 -10,135 -10,150 C-10,165 -5,185 10,200'/><path d='M40,0 C55,15 60,35 60,50 C60,65 55,85 40,100 C25,115 20,135 20,150 C20,165 25,185 40,200'/><path d='M70,0 C85,15 90,35 90,50 C90,65 85,85 70,100 C55,115 50,135 50,150 C50,165 55,185 70,200'/></g></svg>\")",
                    backgroundRepeat: 'repeat',
                    backgroundSize: '80px 200px',
                    animation: 'wave-rise 18s linear infinite',
                    pointerEvents: 'none',
                    zIndex: 0,
                    opacity: 0.85,
                    mixBlendMode: 'screen',
                  }} />

                  {/* Lapiz inline de cada card eliminado: el unico
                      lapiz visible ahora es el del header del slider
                      (al lado del titulo "Beneficios"), para evitar
                      duplicacion y dejar las cards limpias. */}

                  {/* ═══ CONTENIDO CENTRADO ═══ */}
                  {/* Tag superior — los días vigentes son INFO CRÍTICA
                      sobre todo para las cards x2 (donde el cliente
                      necesita saber qué día acumular el doble). Por eso:
                      • Para x2: si tiene días → "LUNES Y JUEVES" etc.
                                 sin días → "TODOS LOS DÍAS" (no "Activo ahora").
                      • Para %OFF: mismo patrón pero sin días → "Activo ahora". */}
                  {(() => {
                    // Los days vienen como integers 0-6 con la convencion
                    // JS Date.getDay (0=domingo, 1=lunes...). Antes el
                    // codigo hacia String(d).toUpperCase() y mostraba "1",
                    // "2" en vez de los nombres reales. Mapeamos contra
                    // DAY_NAMES para que se lea "LUNES Y MARTES".
                    const DAY_NAMES = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO']
                    const days = promo.days || []
                    const hasDays = days.length > 0
                    let tagLabel
                    if (hasDays) {
                      const upper = days.map(d => {
                        const n = Number(d)
                        if (Number.isFinite(n) && DAY_NAMES[n]) return DAY_NAMES[n]
                        return String(d).toUpperCase()
                      })
                      if (upper.length === 1)      tagLabel = upper[0]
                      else if (upper.length === 2) tagLabel = `${upper[0]} Y ${upper[1]}`
                      else                          tagLabel = `${upper.slice(0, -1).join(', ')} Y ${upper[upper.length - 1]}`
                    } else {
                      tagLabel = isDouble ? 'TODOS LOS DÍAS' : 'Activo ahora'
                    }
                    // Para x2 hacemos el tag más prominente (los días son
                    // parte del valor del beneficio). Para %OFF queda más
                    // discreto. Ambos viven en la misma posición.
                    const prominentDays = isDouble && hasDays
                    return (
                      <div style={{ position: 'relative', textAlign: 'center', marginBottom: 18, zIndex: 1 }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: prominentDays ? '7px 16px' : '5px 12px',
                          background: prominentDays
                            ? 'linear-gradient(135deg, rgba(189,75,248,0.30), rgba(124,58,237,0.30))'
                            : 'rgba(255,255,255,0.06)',
                          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                          border: prominentDays ? '1px solid rgba(216,180,254,0.55)' : '1px solid rgba(255,255,255,0.20)',
                          borderRadius: 99,
                          fontSize: prominentDays ? 11 : 10,
                          fontWeight: 800,
                          letterSpacing: '.14em', textTransform: 'uppercase',
                          color: '#fff',
                          boxShadow: prominentDays ? '0 4px 14px rgba(189,75,248,0.35)' : 'none',
                        }}>
                          <Calendar size={prominentDays ? 12 : 11} strokeWidth={2.6} color="#fff" /> {tagLabel}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Display gigante — número del descuento en grande,
                      tipografía display heavy para impacto visual.
                      Estilo del reference (85%, 23%): bold pesado, blanco
                      sobre el fondo glow violeta. */}
                  <div style={{ position: 'relative', textAlign: 'center', marginBottom: 4, zIndex: 1 }}>
                    <div style={{
                      fontFamily: FN,
                      fontSize: bigDisplay.length <= 3 ? 78 : bigDisplay.length <= 4 ? 64 : 52,
                      fontWeight: 900,
                      color: '#fff',
                      lineHeight: 0.95,
                      letterSpacing: '-0.04em',
                      textShadow: '0 4px 24px rgba(189,75,248,0.50), 0 0 1px rgba(255,255,255,0.6)',
                      // Stretch tipográfico para sentir un display heavy
                      transform: 'scaleY(1.08)',
                      transformOrigin: 'center',
                    }}>
                      {bigDisplay}
                    </div>
                    <div style={{
                      fontFamily: FN, fontSize: 13, fontWeight: 800, color: '#fff',
                      letterSpacing: '.18em', textTransform: 'uppercase',
                      marginTop: 4, opacity: 0.85,
                    }}>
                      {subBig}
                    </div>
                  </div>

                  {/* Subtítulo descriptivo. Los días ya viven arriba en el tag,
                      así que acá no se duplican. */}
                  <div style={{ position: 'relative', textAlign: 'center', marginTop: 10, marginBottom: 16, zIndex: 1 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 500,
                      color: 'rgba(255,255,255,0.72)',
                      lineHeight: 1.4,
                    }}>
                      {subtitle}
                    </div>
                  </div>

                  {/* ── Termómetro de urgencia eliminado del slider público ──
                      Antes mostrábamos contador + barra + "Hasta el DD/MM" /
                      "X días desde activación". Pero el slider del catálogo
                      es para promocionar el beneficio (qué % OFF, en qué
                      días aplica), NO para apurar al cliente con un timer.
                      La vigencia del cupón se muestra solo en la tarjeta
                      personal (WalletCard) cuando el cliente ya lo tiene
                      otorgado — ahí sí tiene sentido la fecha porque es
                      info útil que afecta al titular. */}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dots eliminados: con marquee continuo no hay posicion discreta. */}
    </div>
  )
}

function ClubTopNav({ tab, setTab, prizesCount, editMode = false }) {
  // Nav interno del club. Diseñado como pill flotante al fondo de la
  // pantalla (estilo iOS dock / safari mobile). Mientras el cliente esté
  // dentro del club queda siempre visible, sin importar la sección.
  //
  // En modo `editMode` (dueño previsualizando), escondemos la pestaña
  // Historial — ahí van las visitas/canjes del CLIENTE, no aplica para
  // el dueño viendo su propia vista pública.
  // Inicio + Catálogo se unificaron: ahora es UN solo tab "Inicio" que
  // contiene tanto la info del negocio (en accordions colapsables) como
  // el slider de beneficios + el catálogo de premios. Antes eran dos
  // pestañas separadas que duplicaban contexto.
  const TABS = [
    { id:'inicio',    label:'Inicio',    Icon: Store, badge: prizesCount },
    ...(editMode ? [] : [{ id:'historial', label:'Historial', Icon: Clock }]),
  ]
  return (
    <nav style={{
      position: 'fixed',
      bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 150,
      // Look limpio: fondo blanco sólido + silueta fucsia visible. Sin glow:
      // ningún boxShadow para que la pill quede plana, solo el contorno fucsia
      // la define contra el fondo.
      background: '#ffffff',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      borderRadius: 9999,
      border: '1.5px solid #EC4899',
      padding: 6,
      display: 'flex',
      gap: 6,
      boxShadow: 'none',
    }}>
      {TABS.map(({ id, label, Icon, badge }) => {
        const active = tab === id
        return (
          <button key={id}
            onClick={() => setTab(id)}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            style={{
              // Activo: fondo fucsia, texto e ícono blanco.
              // Inactivo: fondo blanco, ícono negro — sin glow, sin sombras.
              background: active ? '#EC4899' : '#ffffff',
              border: 'none',
              borderRadius: 9999,
              padding: active ? '12px 18px' : '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              color: active ? '#ffffff' : '#000000',
              fontFamily: FN,
              fontSize: 14,
              fontWeight: active ? 800 : 600,
              letterSpacing: '.01em',
              transition: 'background 220ms ease, padding 220ms ease, color 220ms ease, transform 160ms cubic-bezier(0.23,1,0.32,1)',
              position: 'relative',
              boxShadow: 'none',
              whiteSpace: 'nowrap',
            }}>
            <Icon size={22} strokeWidth={2.4} />
            {active && <span>{label}</span>}
            {badge > 0 && !active && (
              <span style={{
                position:'absolute', top:-3, right:-3,
                background:'#EC4899', color:'#fff',
                fontSize:10, fontWeight:800, fontFamily:FN,
                borderRadius:9999, padding:'2px 6px',
                minWidth:16, textAlign:'center', lineHeight:1.4,
                border:'1.5px solid #ffffff',
              }}>{badge}</span>
            )}
          </button>
        )
      })}
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
  // Slideshow de portadas: cuando el comercio tiene varias fotos
  // (commerce.cover_images), las cyclamos automáticamente con fade
  // suave entre ellas. coverIdx = índice visible actual. coverLightbox
  // = URL ampliada (modal) cuando el cliente tappea para ver más grande.
  const [coverIdx, setCoverIdx]           = useState(0)
  // coverLightbox: número (idx de la cover abierta) o null. Antes guardaba la
  // URL como string; ahora idx para que el lightbox pueda navegar entre todas
  // las portadas (swipe / scroll horizontal en zoom).
  const [coverLightbox, setCoverLightbox] = useState(null)
  // showWelcomeMerchantBanner: banner verde "¡Tu club ya está vivo!" que
  // aparece la primera vez que el dueño llega al ojo recién registrado.
  // Se dispara desde sessionStorage `benefix:welcome-merchant` que setea
  // el MinimalSignupModal al terminar el signup merchant. Se descarta al
  // tocar la X o salir del modo edición.
  const [showWelcomeMerchantBanner, setShowWelcomeMerchantBanner] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (sessionStorage.getItem('benefix:welcome-merchant') === '1') {
        setShowWelcomeMerchantBanner(true)
      }
    } catch {}
  }, [])
  // Refs de touch para el swipe horizontal entre portadas en el HERO.
  const heroTouchStartXRef = useRef(0)
  const heroTouchEndXRef   = useRef(0)
  // Refs y estado del lightbox: scroll-snap de las imágenes ampliadas.
  const lightboxScrollRef  = useRef(null)
  // showAboutBusiness state removido — la info "Sobre el negocio" ahora
  // vive adentro del expandable de la card principal del negocio,
  // controlado por `cardOpen` (chevron al pie de la card).
  // Accordion "Mi historial en este club" — antes era una pestaña aparte.
  // Ahora vive como sección colapsable al fondo del tab unificado, solo
  // visible si el cliente es miembro (los no-miembros no tienen historial).
  const [showHistory, setShowHistory] = useState(false)
  const [qrDataUrl, setQrDataUrl]     = useState(null)
  const [tab, setTab]                 = useState('inicio')
  // Card del negocio arranca CERRADA. La info "Sobre el negocio"
  // (descripción, horarios, ubicación, redes) vive adentro y se
  // despliega cuando el cliente toca la flecha del fondo de la card.
  const [cardOpen, setCardOpen]       = useState(false)
  const [showSplash, setShowSplash]   = useState(false)
  const [isDemo, setIsDemo]           = useState(false)
  const autoJoinDone                  = useRef(false)

  // Canjes
  const [redeeming, setRedeeming]       = useState(null)   // prize.id being processed
  const [confirmPrize, setConfirmPrize] = useState(null)   // prize awaiting confirmation
  const [prizeDetail,  setPrizeDetail]  = useState(null)   // prize abierto en vista "ecommerce"
  // Editor inline: cuando el dueño está en ?edit=1 y toca un lápiz, se
  // abre este modal con los campos correspondientes. Estructura:
  //   { field: 'name'|'description'|'address'|'instagram'|'facebook'|'phone'|'prize', prize?: <object>, label? }
  const [inlineEdit, setInlineEdit] = useState(null)
  // Galería del prize detail: solo manual. El auto-loop fue removido
  // porque peleaba con el scroll-snap nativo y bloqueaba el swipe del
  // usuario (apenas el user empezaba a scrollear, el setInterval lo
  // tiraba al próximo slide). Ahora la galería es 100% interactiva: el
  // cliente swipea horizontalmente para ver las imágenes a su ritmo.
  const galleryStripRef = useRef(null)
  // Index activo de la galería — se actualiza cuando el user scrollea
  // manualmente, para iluminar el dot correspondiente. Se resetea a 0
  // cada vez que se abre un prize distinto.
  const [galleryIdx, setGalleryIdx] = useState(0)
  useEffect(() => { setGalleryIdx(0) }, [prizeDetail])
  const handleGalleryScroll = () => {
    const el = galleryStripRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== galleryIdx && idx >= 0) setGalleryIdx(idx)
  }
  const [toasts, setToasts]             = useState([])
  // bellModal: ventana centrada que aparece tras tocar la campanita de
  // suscripcion al club. La fila se setea con { message, success } y se
  // cierra con la X (no auto-dismiss) para asegurar que el user vea el
  // resultado de su accion.
  const [bellModal, setBellModal] = useState(null)

  function addToast(type, msg) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  // Construye una URL wa.me con un mensaje pre-llenado. Limpia el número
  // (saca espacios, guiones, paréntesis, '+') y prepende '54' si parece
  // local Argentina y no trae código de país.
  function buildWhatsappUrl(phone, message) {
    if (!phone) return null
    let digits = String(phone).replace(/\D/g, '')
    if (!digits) return null
    if (!digits.startsWith('54') && digits.length >= 8 && digits.length <= 12) {
      digits = '54' + digits
    }
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
  }

  async function doRedeem(prize) {
    if (!membership?.id || !user?.id) return
    // SINCRONICO: abrimos un tab vacio durante el click para no perder
    // el contexto de "user gesture". Si el canje sale OK, redirigimos
    // ese tab a wa.me. Sin esto, Safari iOS bloquea el window.open que
    // se llama despues del await async.
    const waWin = (typeof window !== 'undefined') ? window.open('', '_blank') : null
    setRedeeming(prize.id)
    try {
      const res = await fetch('/api/redeem-request', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ membership_id: membership.id, prize_id: prize.id, commerce_id: commerce.id, user_id: user.id }),
      })
      const d = await res.json()
      if (res.ok && d.ok) {
        addToast('success', `Solicitud enviada. ${prize.name}: esperando confirmacion del comercio.`)
        // El saldo se reserva al crear el pending (en /api/redeem-request),
        // asi que descontamos localmente para reflejar el cambio inmediato.
        const field = d.prog_type === 'stars' ? 'stars' : 'points'
        setMembership(prev => ({ ...prev, [field]: Math.max(0, (prev?.[field] || 0) - (prize.cost || 0)) }))
        setPrizeDetail(null)
        // Armamos el mensaje de WhatsApp con el codigo del canje. El
        // comercio lo lee y al confirmar desde su panel cierra el canje.
        const userName = (userProfile?.name || '').trim() || 'un cliente'
        const isStars  = d.prog_type === 'stars'
        const unitTxt  = isStars ? `${prize.cost} estrella${prize.cost === 1 ? '' : 's'}` : `${prize.cost} puntos`
        const message  = (
          `Hola ${d.commerce?.name || commerce?.name}! Soy ${userName}.\n\n` +
          `Vine a canjear:\n` +
          `🎁 ${prize.name}\n` +
          `${isStars ? '⭐' : '💎'} Costo: ${unitTxt}\n\n` +
          `Codigo de canje: *${d.code}*\n\n` +
          `Confirma desde tu app cuando me lo entregues. Gracias!`
        )
        const phoneSrc = d.commerce?.phone || commerce?.phone
        const waUrl    = buildWhatsappUrl(phoneSrc, message)
        if (waUrl && waWin) {
          try { waWin.location.href = waUrl } catch { try { waWin.close() } catch {} }
        } else if (waWin) {
          // Sin telefono cargado â cerramos el tab vacio.
          try { waWin.close() } catch {}
        }
      } else {
        if (waWin) { try { waWin.close() } catch {} }
        addToast('error', d.error || 'Error al canjear')
      }
    } catch {
      if (waWin) { try { waWin.close() } catch {} }
      addToast('error', 'Error de conexion')
    }
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
  // Spotlight: aparece SOLO la primera vez que el cliente entra a este club
  // por QR. Después se persiste en localStorage para no volver a interrumpir.
  const [spotlightSeen, setSpotlightSeen] = useState(true)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const slugParam = (typeof slug === 'string' ? slug : '') || ''
    if (!slugParam) return
    const fromQrFlag = searchParams?.get('from_qr') === '1'
    const key = `benefix:spotlight_${slugParam}`
    if (localStorage.getItem(key)) {
      setSpotlightSeen(true)
    } else {
      setSpotlightSeen(false)
      if (fromQrFlag) localStorage.setItem(key, '1')
    }
  }, [slug, searchParams])

  useEffect(() => {
    // Triple cache-bust:
    //  1) cache:'no-store' → browser HTTP cache + Next.js fetch cache.
    //  2) Cache-Control header → reverse proxies / CDN entre browser y server.
    //  3) timestamp en query → URL única por request, esquiva cualquier
    //     capa de cache que matchee por URL exacta (incluido service workers
    //     viejos que pudieran estar interceptando).
    fetch(`/api/club-profile?slug=${slug}&_=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
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

  // useEffect viejo que abría la card al cambiar a inicio fue removido —
  // ahora la card arranca cerrada y solo se abre por interacción del user.

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
      // queryParams.prompt='select_account' fuerza a Google a mostrar el
      // picker de cuentas siempre — evita que después de un logout te re-loguee
      // automáticamente con el último mail.
      options:{
        redirectTo:`${window.location.origin}/auth/callback?next=${encodeURIComponent(`/club/${slug}?auto_join=1`)}`,
        queryParams:{ prompt:'select_account' },
      },
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
  // La API ya filtra por active=true en el SELECT pero NO incluye la columna
  // `active` en la lista de campos devueltos (ni en prizes ni en promos).
  // Si filtramos acá por p.active descartamos todo (undefined es falsy). La
  // API ya garantiza que solo devuelve activos, así que tomamos directamente
  // el array sin re-filtrar.
  const activePromo  = (promos || [])[0] || null
  const activePrizes = prizes || []
  // Spotlight cuando el cliente entra escaneando el QR del negocio.
  const fromQr       = searchParams.get('from_qr') === '1'
  // Modo edición: el dueño llegó acá vía el ojo del navbar (?edit=1).
  // Combina ownership real (user.id === commerce.owner_id) + flag URL —
  // si solo está la flag pero no es dueño, NO se renderizan los pencils.
  const editMode     = searchParams.get('edit') === '1'
                       && !!user?.id && !!commerce?.owner_id
                       && user.id === commerce.owner_id
  // Helper: pequeño botón Pen que abre un modal inline con los campos de
  // edición correspondientes (mismo conjunto de inputs que el panel de
  // configuración del negocio). Para casi todos los campos NO navega afuera
  // — el dueño edita acá mismo, guarda, y los cambios se reflejan
  // instantáneamente en la página pública.
  // Excepción: 'hours' usa un editor de horarios muy complejo (7 días con
  // múltiples turnos) que no tendría sentido replicar en miniatura, así
  // que ese pencil sí navega al panel completo.
  // Mapeo de field → tab + section del panel de configuración. Cada lápiz
  // del modo edición redirige al panel del comercio, abriendo el accordion
  // correspondiente al campo que se quiere editar. Antes algunos lápices
  // abrían modales inline sobre la previsualización; ahora todos navegan
  // al panel completo así el dueño edita en el contexto correcto y no
  // pelea con previews chiquitos.
  const FIELD_NAV_MAP = {
    name:         { tab: 'configuracion', section: 'basica' },
    description:  { tab: 'configuracion', section: 'basica' },
    img_url:      { tab: 'configuracion', section: 'basica' },
    cover:        { tab: 'configuracion', section: 'basica' },
    cover_images: { tab: 'configuracion', section: 'basica' },
    category:     { tab: 'configuracion', section: 'basica' },
    hours:        { tab: 'configuracion', section: 'horarios' },
    address:      { tab: 'configuracion', section: 'ubicacion' },
    phone:        { tab: 'configuracion', section: 'contacto' },
    instagram:    { tab: 'configuracion', section: 'contacto' },
    facebook:     { tab: 'configuracion', section: 'contacto' },
    prize:        { tab: 'premios',       section: null },
    // Beneficios: el lápiz va directo a la sub-tab "Descuento próxima
    // compra" de Recompensas (donde se gestionan las promos discount_next
    // + suma doble). subTab pasa por URL como `subTab=discount`.
    promo:        { tab: 'recompensas',   section: null, subTab: 'discount' },
  }
  const navigateEditField = (field) => {
    const mapping = FIELD_NAV_MAP[field] || { tab: 'configuracion', section: null }
    try {
      sessionStorage.setItem('benefix:loginNext', 'commerce-settings')
      sessionStorage.setItem('benefix:nextTab', mapping.tab)
      if (mapping.section) sessionStorage.setItem('benefix:edit-section', mapping.section)
      else sessionStorage.removeItem('benefix:edit-section')
      // Flag "vine del preview con slug X" — el panel CommerceSettingsView
      // lo lee al montar para mostrar un banner "Volver al preview" arriba
      // que devuelve a /club/[slug]?edit=1. Slug lo sacamos del prop del
      // componente padre. El flag se borra cuando el dueño efectivamente
      // toca "Volver al preview" o sale del panel.
      if (slug) sessionStorage.setItem('benefix:preview-back-slug', slug)
    } catch {}
    if (typeof window !== 'undefined') {
      const params = []
      params.push(`tab=${encodeURIComponent(mapping.tab)}`)
      if (mapping.section) params.push(`section=${encodeURIComponent(mapping.section)}`)
      if (mapping.subTab)  params.push(`subTab=${encodeURIComponent(mapping.subTab)}`)
      window.location.href = `/?view=commerce-settings&${params.join('&')}`
    }
  }
  // editPencil — boton circular con icono Pen que aparece al lado de cada
  // campo editable cuando editMode=true. Acepta un 3er parametro `done`
  // boolean: true=campo ya tiene info → fondo verde; false=campo vacío →
  // fondo amarillo. Asi el dueño ve de un vistazo qué le falta cargar.
  // Default `done=true` para mantener compat: si el caller no pasa el
  // dato, asumimos que ya tiene contenido (no se pinta de amarillo
  // espuriamente).
  const editPencil = (field, label = 'Editar', done = true) => {
    if (!editMode) return null
    const grad = done
      ? 'linear-gradient(135deg, #15803D, #22E698)'
      : 'linear-gradient(135deg, #B45309, #F5A623)'
    const shadow = done
      ? '0 4px 12px rgba(34,230,152,0.40)'
      : '0 4px 12px rgba(245,166,35,0.45)'
    return (
      <button
        onClick={(e) => { e.stopPropagation(); navigateEditField(field) }}
        title={label}
        aria-label={label}
        style={{
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          width:28, height:28, borderRadius:'50%',
          background: grad,
          border:'1px solid rgba(255,255,255,0.22)',
          color:'#fff', cursor:'pointer', padding:0,
          boxShadow: shadow,
          marginLeft:8,
          flexShrink:0,
        }}>
        <Pen size={13} strokeWidth={2.4} />
      </button>
    )
  }

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

      {/* Banner de modo edición — flotante en el tope cuando el dueño
          llegó vía el ojo del navbar (?edit=1). Le recuerda que está
          viendo la versión editable y le da un atajo para irse al panel
          completo de configuración. */}
      {/* El banner "Modo edición" se renderiza más abajo (justo después
          del spacer del navbar), no acá. Lo dejamos en su lugar real
          para que aparezca exactamente entre el navbar superior y la
          portada, sin overlap con la imagen del cover. */}

      {isDemo && (
        // Banner de demo — se planta justo abajo del bloque navbar+sub-nav
        // (navbar 58px + sub-nav ~44px = 102px).
        <div style={{
          position:'fixed', top:102, left:0, right:0, zIndex:190,
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

      {/* ── NAVBAR FIJO ──
            Espejamos el set completo de botones del navbar de la app principal
            (app/page.js) según el role del user. Si no, al venir desde "Mis
            Clubes" el dueño/admin perdía Vista pública / Mi Negocio / Panel
            admin y la barra superior se sentía "rota". El role viene de
            /api/club-profile (profile.role). */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:200 }}>
        <nav style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:`1px solid ${C.rim}`, padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', height:58 }}>
          <Logo />
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {(() => {
              // Estilos locales: NEUTRAL (default), ACTIVE (gradient G como en
              // el navbar principal de app/page.js cuando un botón coincide
              // con la vista actual), TRANSP (logout, sin fondo).
              const NEUTRAL = { display:'flex', alignItems:'center', justifyContent:'center', width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, cursor:'pointer', color:'rgba(255,255,255,0.78)', textDecoration:'none' }
              const ACTIVE  = { display:'flex', alignItems:'center', justifyContent:'center', width:34, height:34, borderRadius:9, background:G, border:'none', cursor:'default', color:'#fff', boxShadow:'0 2px 10px rgba(168,85,247,0.42)', textDecoration:'none' }
              // PRIMARY: idéntico al ACTIVE de gradient pero clickeable. Lo
              // usamos para el botón del User en esta vista — el cliente está
              // navegando en el "área de billetera" (los clubes a los que se
              // sumó), así que el ícono User queda iluminado siempre.
              const PRIMARY = { display:'flex', alignItems:'center', justifyContent:'center', width:34, height:34, borderRadius:9, background:G, border:'none', cursor:'pointer', color:'#fff', boxShadow:'0 2px 10px rgba(168,85,247,0.42)', textDecoration:'none' }
              const TRANSP  = { display:'flex', alignItems:'center', justifyContent:'center', width:34, height:34, borderRadius:9, background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.70)', padding:0 }

              const role = userProfile?.role
              // ¿El club que se está viendo es el del propio dueño? Si sí,
              // iluminamos el botón "Vista pública" porque esta página ES
              // exactamente esa vista.
              const isOwnerOfThisClub = role === 'commerce_owner' && user?.id && commerce?.owner_id && user.id === commerce.owner_id
              const eyeStyle = isOwnerOfThisClub ? ACTIVE : NEUTRAL
              const eyeColor = isOwnerOfThisClub ? '#fff' : 'rgba(255,255,255,0.78)'

              const doLogout = async () => {
                const sb = getSupabase()
                await sb.auth.signOut()
                if (typeof window !== 'undefined') window.location.href = '/'
              }

              if (role === 'admin') {
                const goHref = (href) => (e) => {
                  e.preventDefault()
                  if (typeof window !== 'undefined') window.location.href = href
                }
                return (
                  <>
                    <a href="/?view=admin" title="Panel admin" style={NEUTRAL} onClick={goHref('/?view=admin')}>
                      <LayoutDashboard size={15} strokeWidth={2} />
                    </a>
                    <a href="/?view=client" title="Mi cuenta" style={PRIMARY} onClick={goHref('/?view=client')}>
                      <User size={15} strokeWidth={2} />
                    </a>
                    <button title="Salir" onClick={doLogout} style={TRANSP}>
                      <DoorOpen size={15} strokeWidth={2} />
                    </button>
                  </>
                )
              }

              if (role === 'commerce_owner') {
                // Si el dueño está previsualizando SU propio club (modo ojo),
                // el botón User va NEUTRAL — no estamos "en el área cliente",
                // estamos en la vista pública del propio comercio. Solo el
                // ojo queda iluminado, evitando confundir al usuario con dos
                // íconos activos a la vez.
                const userStyleOwner = isOwnerOfThisClub ? NEUTRAL : PRIMARY
                // Forzamos navegación full-reload con window.location.href en
                // los onClick además del href — algunos casos raros (Service
                // Worker, prefetch agresivo) pueden tragarse el click del <a>
                // en App Router, así que reforzamos.
                const goHref = (href) => (e) => {
                  e.preventDefault()
                  if (typeof window !== 'undefined') window.location.href = href
                }
                return (
                  <>
                    <a href="/?view=scanner" title="Escanear QR" style={NEUTRAL} onClick={goHref('/?view=scanner')}>
                      <ScanLine size={15} strokeWidth={2} />
                    </a>
                    {isOwnerOfThisClub ? (
                      <span title="Vista pública de mi club" style={eyeStyle} aria-current="page">
                        <Eye size={15} strokeWidth={2} color={eyeColor} />
                      </span>
                    ) : (
                      <a href="/?view=commerce" title="Vista pública de mi club" style={NEUTRAL} onClick={goHref('/?view=commerce')}>
                        <Eye size={15} strokeWidth={2} />
                      </a>
                    )}
                    <a href="/?view=commerce-settings" title="Mi Negocio" style={NEUTRAL} onClick={goHref('/?view=commerce-settings')}>
                      <Store size={15} strokeWidth={2} />
                    </a>
                    <a href="/?view=client" title="Mi cuenta" style={userStyleOwner} onClick={goHref('/?view=client')}>
                      <User size={15} strokeWidth={2} />
                    </a>
                    <button title="Cerrar sesión" onClick={doLogout} style={TRANSP}>
                      <LogOut size={15} strokeWidth={2} />
                    </button>
                  </>
                )
              }

              // Cliente regular (con o sin sesión). Sin user no mostramos
              // logout; el resto se mantiene como atajos.
              const goHref = (href) => (e) => {
                e.preventDefault()
                if (typeof window !== 'undefined') window.location.href = href
              }
              return (
                <>
                  <a href="/?view=scanner" title="Escanear QR" style={NEUTRAL} onClick={goHref('/?view=scanner')}>
                    <ScanLine size={15} strokeWidth={2} />
                  </a>
                  <a href="/?view=client" title="Mi cuenta" style={PRIMARY} onClick={goHref('/?view=client')}>
                    <User size={15} strokeWidth={2} />
                  </a>
                  {user && (
                    <button title="Cerrar sesión" onClick={doLogout} style={TRANSP}>
                      <LogOut size={15} strokeWidth={2} />
                    </button>
                  )}
                </>
              )
            })()}
          </div>
        </nav>
        {/* ── SUB-NAV CLIENTE ──
              Espejo del ClientBottomNav del app principal. Visible para
              clientes/socios que navegan dentro de un club, NO en modo
              edición del dueño (editMode). Cuando el dueño previsualiza
              su propio club vía el ojo, no tiene sentido mostrar atajos
              al área de cliente — está actuando como dueño. */}
        {!editMode && (
        <nav style={{
          background: 'rgba(10, 10, 10, 0.75)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            maxWidth: 520, margin: '0 auto',
            display: 'flex', alignItems: 'stretch', justifyContent: 'center',
            padding: '8px 16px 0',
          }}>
            {[
              { id: 'mis clubs', label: 'Mi billetera' },
              { id: 'premios',   label: 'Mis beneficios' },
              { id: 'historial', label: 'Historial'    },
              { id: 'cuenta',    label: 'Perfil'       },
            ].map(({ id, label }) => {
              // En la página del club, "Mi billetera" siempre va activa —
              // estamos parados dentro de uno de los clubes de la billetera.
              const active   = id === 'mis clubs'
              const isWallet = id === 'mis clubs'
              const color    = isWallet
                ? (active ? '#EC4899' : 'rgba(236,72,153,0.75)')
                : (active ? '#fff'    : 'rgba(255,255,255,0.55)')
              return (
                <a key={id}
                  href={`/?view=client&tab=${encodeURIComponent(id)}`}
                  style={{
                    flex: 1, textAlign:'center',
                    background: 'transparent',
                    border: 'none',
                    color,
                    fontFamily: FN,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    letterSpacing: '.02em',
                    padding: '10px 8px 12px',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    position: 'relative',
                  }}>
                  {label}
                  {active && (
                    <span style={{
                      position:'absolute', bottom:-1, left:'25%', right:'25%',
                      height: 2, borderRadius: 2,
                      background:'linear-gradient(135deg, #FE5000, #BD4BF8)',
                    }} />
                  )}
                </a>
              )
            })}
          </div>
        </nav>
        )}{/* fin del condicional !editMode del sub-nav cliente */}
        {/* El ClubTopNav también está oculto ahora — la navegación interna
            del club se mergeó en una sola pestaña Inicio. */}
      </div>

      {/* Spacer: navbar superior (58px) + sub-nav cliente (~44px) + banner demo si aplica.
          En editMode el sub-nav cliente está oculto, así que descontamos esos 44px. */}
      <div style={{ height: isDemo ? (editMode ? 92 : 136) : (editMode ? 58 : 102) }} />

      {/* Banner "Modo edición" — render INLINE (no fixed) inmediatamente
          después del spacer del navbar. Toma su propio espacio vertical y
          empuja la portada para abajo, sin overlap. Solo aparece cuando
          el dueño está previsualizando con el ojo.
          El boton de la derecha lleva al PANEL del comercio (no a la
          version publica del mismo club), porque el dueño llego al ojo
          desde el panel y la salida natural es volver alli. Antes iba a
          /club/${slug} (mismo club sin edit) — eso confundia: parecia que
          "Salir" no hacia nada. */}
      {editMode && (
        <div style={{
          background:'linear-gradient(135deg, rgba(124,58,237,0.96), rgba(189,75,248,0.96))',
          borderTop:'1px solid rgba(255,255,255,0.10)',
          borderBottom:'1px solid rgba(255,255,255,0.18)',
          padding:'10px 16px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
          fontFamily:FI,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <Pen size={14} color="#fff" strokeWidth={2.4} style={{ flexShrink:0 }} />
            <div style={{ fontSize:12, color:'#fff', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              Modo edición — los <strong style={{ fontWeight:800 }}>lápices violetas</strong> te llevan a editar
            </div>
          </div>
          <a href="/?view=commerce-settings"
            onClick={(e) => {
              // Forzamos full reload — App Router puede tragarse el click
              // del <a> en transiciones entre Next.js pages distintas.
              e.preventDefault()
              if (typeof window !== 'undefined') window.location.href = '/?view=commerce-settings'
            }}
            style={{ display:'inline-flex', alignItems:'center', gap:4, fontFamily:FN, fontSize:11, fontWeight:800, color:'#fff', background:'rgba(0,0,0,0.30)', padding:'6px 12px', borderRadius:99, textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>
            ← Volver al panel
          </a>
        </div>
      )}

      {/* Banner de bienvenida post-signup — sessionStorage flag que setea
          el wizard de registro al terminar (welcome-merchant). Aparece UNA
          vez, explicando que esto es la página pública de su club, que los
          lápices editan campos sueltos, y que el botón "Mi Negocio" del
          navbar permite acceder al panel completo (premios, beneficios,
          mensajes, clientes, análisis). Click en X o "Entendido" lo
          descarta y nunca vuelve a aparecer. */}
      {editMode && showWelcomeMerchantBanner && (
        <div style={{
          background:'linear-gradient(135deg, rgba(34,230,152,0.16), rgba(34,197,94,0.10))',
          borderTop:'1px solid rgba(34,230,152,0.30)',
          borderBottom:'1px solid rgba(34,230,152,0.40)',
          padding:'14px 16px',
          fontFamily:FI,
          position:'relative',
        }}>
          <button onClick={() => {
              try { sessionStorage.removeItem('benefix:welcome-merchant') } catch {}
              setShowWelcomeMerchantBanner(false)
            }}
            aria-label="Cerrar"
            style={{
              position:'absolute', top:8, right:10,
              width:24, height:24, borderRadius:'50%',
              background:'rgba(255,255,255,0.06)',
              border:'1px solid rgba(255,255,255,0.14)',
              color:'rgba(255,255,255,0.70)',
              cursor:'pointer', padding:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:14, lineHeight:1,
            }}>×</button>
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, paddingRight:24 }}>
            <div style={{
              width:28, height:28, borderRadius:8,
              background:'rgba(34,230,152,0.20)',
              border:'1px solid rgba(34,230,152,0.45)',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
              color:'#22E698',
              fontSize:14, fontWeight:900,
            }}>✓</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:FN, fontSize:13, fontWeight:800, color:'#fff', marginBottom:4 }}>
                ¡Tu club ya está vivo!
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.78)', lineHeight:1.5 }}>
                Esto es lo que ven tus clientes. Tocá los <strong style={{ color:'#fff' }}>lápices violetas</strong> para
                editar lo que falta, o entrá a <strong style={{ color:'#fff' }}>Mi Negocio</strong> (ícono <Store size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> en el navbar) para cargar premios, beneficios y mensajes.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. HERO - portada (slideshow con fade) ──
          Soporta hasta 5 fotos en `commerce.cover_images`. Si solo hay
          una (o solo el legacy `cover_image`), se renderiza como
          imagen estática. Si hay varias, se hace un fade automático
          cada 4.5s entre ellas. Click en la portada → abre el
          lightbox con la imagen actual ampliada. */}
      {(() => {
        const covers = (Array.isArray(commerce.cover_images) && commerce.cover_images.length > 0)
          ? commerce.cover_images
          : (commerce.cover_image ? [commerce.cover_image] : [])
        // Auto-advance del slideshow — solo activo si hay 2+ fotos.
        // Touch handlers permiten al cliente swipear horizontalmente entre
        // portadas en mobile además de dejar correr el fade automático.
        const onHeroTouchStart = (e) => {
          heroTouchStartXRef.current = e.touches[0].clientX
          heroTouchEndXRef.current   = e.touches[0].clientX
        }
        const onHeroTouchMove = (e) => {
          heroTouchEndXRef.current = e.touches[0].clientX
        }
        const onHeroTouchEnd = () => {
          if (covers.length < 2) return
          const dx = heroTouchEndXRef.current - heroTouchStartXRef.current
          if (Math.abs(dx) < 40) return
          if (dx < 0) setCoverIdx(i => (i + 1) % covers.length)
          else        setCoverIdx(i => (i - 1 + covers.length) % covers.length)
        }
        return (
          <>
            {covers.length > 1 && (
              <CoverSlideshowAutoAdvance
                count={covers.length}
                onAdvance={() => setCoverIdx(i => (i + 1) % covers.length)}
              />
            )}
            <section
              onTouchStart={onHeroTouchStart}
              onTouchMove={onHeroTouchMove}
              onTouchEnd={onHeroTouchEnd}
              style={{ position:'relative', width:'100%', height:'35vh', minHeight:240, overflow:'hidden' }}>
              {covers.length === 0 && (
                <div
                  className="animate-gradient-slow"
                  style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, #1a1a2e, #2d1f3d, #1a1a2e)' }}>
                  <div style={{ position:'absolute', top:'20%', left:'10%', width:240, height:240, borderRadius:'50%', background:'rgba(236,72,153,0.18)', filter:'blur(70px)' }} />
                  <div style={{ position:'absolute', bottom:'10%', right:'8%', width:200, height:200, borderRadius:'50%', background:'rgba(168,85,247,0.22)', filter:'blur(60px)' }} />
                </div>
              )}
              {covers.map((url, i) => (
                <img
                  key={url + i}
                  src={url}
                  alt=""
                  onClick={() => setCoverLightbox(i)}
                  style={{
                    position:'absolute', inset:0,
                    width:'100%', height:'100%',
                    objectFit:'cover',
                    opacity: i === coverIdx ? 1 : 0,
                    transition: 'opacity 1.2s ease-in-out',
                    cursor: 'zoom-in',
                  }}
                />
              ))}
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, #0a0a0f 0%, rgba(10,10,15,0.55) 50%, transparent 100%)', pointerEvents:'none' }} />
              {/* Indicador de cuántas portadas hay — pequeños dots al pie */}
              {covers.length > 1 && (
                <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5, zIndex:15 }}>
                  {covers.map((_, i) => (
                    <span key={i} style={{
                      width: i === coverIdx ? 18 : 6, height: 6,
                      borderRadius: 99,
                      background: i === coverIdx ? '#fff' : 'rgba(255,255,255,0.50)',
                      transition: 'width 320ms ease, background 320ms ease',
                      boxShadow: i === coverIdx ? '0 0 8px rgba(255,255,255,0.50)' : 'none',
                    }} />
                  ))}
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); typeof window !== 'undefined' && window.history.back() }}
                style={{ position:'absolute', top:16, left:16, zIndex:20, width:40, height:40, borderRadius:'50%', background:'rgba(0,0,0,0.50)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
                <ChevronLeft size={20} />
              </button>
              {user?.id && commerce?.id && (
                <ClubNotifyBell
                  commerceId={commerce.id}
                  commerceName={commerce.name}
                  onToggleResult={({ subscribed, success, commerceName }) => {
                    if (!success) {
                      setBellModal({
                        success: false,
                        title: 'No se pudo guardar',
                        body: 'Intenta de nuevo en un momento.',
                      })
                      return
                    }
                    if (subscribed) {
                      setBellModal({
                        success: true,
                        title: 'Notificaciones activadas',
                        body: `Te vamos a avisar cuando ${commerceName || 'este club'} suba premios o promociones nuevas.`,
                      })
                    } else {
                      setBellModal({
                        success: true,
                        title: 'Notificaciones desactivadas',
                        body: `Ya no vas a recibir avisos de ${commerceName || 'este club'}. Pode reactivar la campanita cuando quieras.`,
                      })
                    }
                  }}
                />
              )}
              {/* Lápiz "editar portada" — solo en modo ojo del dueño,
                  posicionado debajo de la campanita en la esquina sup-derecha.
                  Tap → navega a Configuración → Información básica donde
                  vive el upload multi-portada. */}
              {editMode && (() => {
                const hasCovers = covers.length > 0
                const grad = hasCovers
                  ? 'linear-gradient(135deg, #15803D, #22E698)'
                  : 'linear-gradient(135deg, #B45309, #F5A623)'
                const shadow = hasCovers
                  ? '0 4px 14px rgba(34,230,152,0.50)'
                  : '0 4px 14px rgba(245,166,35,0.55)'
                return (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigateEditField('cover_images') }}
                    title="Editar portadas"
                    aria-label="Editar portadas"
                    style={{
                      position: 'absolute',
                      top: 64, right: 16, zIndex: 21,
                      width: 40, height: 40, borderRadius: '50%',
                      background: grad,
                      border: '1px solid rgba(255,255,255,0.22)',
                      color: '#fff', cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: shadow,
                    }}
                  >
                    <Pen size={16} strokeWidth={2.4} />
                  </button>
                )
              })()}
            </section>
            {/* Lightbox modal — imagen ampliada full-screen con backdrop
                oscuro. Tap fuera de la imagen / X cierra. */}
            {coverLightbox != null && (
              <CoverLightboxGallery
                covers={covers}
                startIdx={coverLightbox}
                onClose={() => setCoverLightbox(null)}
                scrollRef={lightboxScrollRef}
              />
            )}
          </>
        )
      })()}

      {/* ── CONTENIDO PRINCIPAL (bajo el hero) ── */}
      {/* paddingBottom amplio: el ClubTopNav ahora flota como pill al fondo
          (~50px alto + 16px gap + safe-area iOS). Reservamos espacio extra
          para que con scroll máximo el último contenido no quede tapado
          por la pill ni se sienta apretado contra ella. */}
      <div style={{ maxWidth:600, margin:'0 auto', paddingBottom:140 }}>

        {/* ── CARD DEL NEGOCIO (collapsible, sobre la portada) ── */}
        <div style={{ margin:'-80px 16px 0', position:'relative', zIndex:10 }}>
          <div style={{
            background:'rgba(255,255,255,0.05)',
            backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
            border:'1px solid rgba(255,255,255,0.10)',
            borderRadius:20, overflow:'hidden',
          }}>
            {/* Header siempre visible. Era un <button> pero se rompe la
                hidratación si tiene pencils anidados (no se permite button
                dentro de button en HTML). Lo cambié a div + role="button"
                + onClick — los pencils internos sí siguen siendo botones
                válidos y stopPropagation evita que toggleen el card. */}
            <div
              role="button" tabIndex={0}
              onClick={() => setCardOpen(v => !v)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCardOpen(v => !v) } }}
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
                    <div style={{ display:'flex', alignItems:'center' }}>
                      <div style={{ fontFamily:FN, fontSize:16, fontWeight:700, color:C.white, lineHeight:1.2 }}>{commerce.name}</div>
                      <span onClick={e => e.stopPropagation()} style={{ display:'inline-flex' }}>
                        {editPencil('name', 'Editar nombre', !!commerce.name)}
                      </span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)', background:'rgba(255,255,255,0.08)', borderRadius:99, padding:'2px 8px' }}>{commerce.category}</span>
                      {REVIEWS_ENABLED && (reviewsAvg !== null || commerce.rating) && (
                        <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'#ec4899' }}>
                          <Star size={11} strokeWidth={0} fill="currentColor" /> {reviewsAvg ?? commerce.rating}
                        </span>
                      )}
                      <span onClick={e => e.stopPropagation()} style={{ display:'inline-flex' }}>
                        {editPencil('category', 'Editar categoría', !!commerce.category || (Array.isArray(commerce.categories) && commerce.categories.length > 0))}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Indicador "Abierto ahora · 09–22" en el header — antes
                    vivía adentro del desplegable, pero el cliente quiere
                    ese dato sin tener que abrir nada. Se calcula inline a
                    partir de hours_structured + hora actual. Si no hay
                    horarios cargados, no se renderiza nada. */}
                {(() => {
                  const hs = commerce.hours_structured
                  if (!hs) return null
                  const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
                  const today = hs[dayKeys[new Date().getDay()]]
                  if (!today) return null
                  let openNow = false, summary = 'Cerrado'
                  if (today.open && today.shifts?.length) {
                    const nowMin = new Date().getHours()*60 + new Date().getMinutes()
                    openNow = today.shifts.some(s => {
                      const [fh, fm] = (s.from || '0:0').split(':').map(Number)
                      const [th, tm] = (s.to   || '0:0').split(':').map(Number)
                      return nowMin >= (fh*60+fm) && nowMin <= (th*60+tm)
                    })
                    summary = today.shifts.map(s => `${s.from}–${s.to}`).join(' · ')
                  }
                  return (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, marginRight:8, flexShrink:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background: openNow ? '#22c55e' : '#888', flexShrink:0, animation: openNow ? 'pulse 2s ease-in-out infinite' : 'none' }} />
                        <span style={{ color: openNow ? '#4ade80' : '#888', fontSize:11, fontFamily:FI, fontWeight:600 }}>{openNow ? 'Abierto ahora' : 'Cerrado'}</span>
                      </div>
                      <span style={{ color:'rgba(255,255,255,0.50)', fontSize:11, fontFamily:FI, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:140 }}>{summary}</span>
                    </div>
                  )
                })()}
                {/* Chevron viejo del top-right removido — ahora hay una
                    flecha grande al pie de la card (centrada) que indica
                    "tocá para desplegar info". */}
              </div>
            </div>

            {/* Contenido expandible — TODA la info "Sobre el negocio" vive
                acá adentro: descripción, horarios completos, ubicación y
                redes sociales. Antes esto estaba partido en dos accordions
                (uno arriba con descripción y otro abajo con el resto);
                ahora todo unificado en uno solo. */}
            <div style={{
              maxHeight: cardOpen ? 900 : 0,
              opacity: cardOpen ? 1 : 0,
              overflow:'hidden',
              transition:'max-height 0.4s ease-out, opacity 0.25s ease-out',
            }}>
              <div style={{ padding:'0 16px 8px' }}>
                {/* Ciudad badge */}
                {commerce.city?.name && (
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)', background:'rgba(255,255,255,0.08)', borderRadius:99, padding:'3px 10px', display:'flex', alignItems:'center', gap:4 }}>
                      <MapPin size={11} strokeWidth={2} /> {commerce.city.name}
                    </span>
                  </div>
                )}
                {/* Descripción — siempre con placeholder cuando vacía. */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:14 }}>
                  <p style={{ fontSize:13, color: commerce.description ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.30)', fontStyle: commerce.description ? 'normal' : 'italic', lineHeight:1.6, margin:0, flex:1, minWidth:0 }}>
                    {commerce.description || 'Este negocio todavía no agregó una descripción.'}
                  </p>
                  {editPencil('description', 'Editar descripción', !!(commerce.description && commerce.description.trim()))}
                </div>
              </div>

              {/* Horarios full week — desde hours_structured */}
              {commerce.hours_structured ? (() => {
                const dayKeys   = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
                const dayLabels = { monday:'Lun', tuesday:'Mar', wednesday:'Mié', thursday:'Jue', friday:'Vie', saturday:'Sáb', sunday:'Dom' }
                const todayKey  = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
                const today     = commerce.hours_structured[todayKey]
                const todayShifts = today?.open ? (today.shifts || []).map(s => `${s.from}–${s.to}`).join(' · ') : 'Cerrado'
                const hasAny = dayKeys.some(k => commerce.hours_structured[k]?.open && commerce.hours_structured[k]?.shifts?.length)
                if (!hasAny) return null
                return (
                  <>
                    <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ display:'flex', alignItems:'center', padding:'0 12px 0 0' }}>
                      <button
                        onClick={() => setShowHours(v => !v)}
                        style={{ flex:1, background:'transparent', border:'none', cursor:'pointer', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:FI, textAlign:'left' }}
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
                      {editPencil('hours', 'Editar horarios', true /* en este branch ya hay horarios cargados */)}
                    </div>
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
                  </>
                )
              })() : (
                <>
                  <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }} />
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 16px' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.20)', flexShrink:0 }} />
                    <span style={{ color:'rgba(255,255,255,0.35)', fontSize:12, fontFamily:FI, fontStyle:'italic' }}>Horarios no informados</span>
                  </div>
                </>
              )}

              {/* Ubicación + Cómo llegar */}
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }} />
              {(commerce.address || (commerce.lat && commerce.lng)) ? (
                <div style={{ display:'flex', alignItems:'center', padding:'0 12px 0 0' }}>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', textDecoration:'none', fontFamily:FI }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <MapPin size={18} strokeWidth={2} color="rgba(255,255,255,0.6)" />
                      <div>
                        <p style={{ color:C.white, fontSize:14, fontWeight:500, margin:0 }}>{commerce.address || 'Ver en el mapa'}</p>
                        {commerce.city && <p style={{ color:'rgba(255,255,255,0.45)', fontSize:12, margin:'2px 0 0' }}>{commerce.city.name}</p>}
                      </div>
                    </div>
                    <span style={{ background:'transparent', color:'#BD4BF8', border:'1.5px solid #BD4BF8', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:700, fontFamily:FN, whiteSpace:'nowrap', flexShrink:0 }}>Cómo llegar →</span>
                  </a>
                  {editPencil('address', 'Editar ubicación', true /* en este branch hay address o coords */)}
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', fontFamily:FI }}>
                  <MapPin size={18} strokeWidth={2} color="rgba(255,255,255,0.25)" />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:'rgba(255,255,255,0.35)', fontSize:14, fontWeight:500, margin:0, fontStyle:'italic' }}>Dirección no informada</p>
                    {commerce.city?.name && <p style={{ color:'rgba(255,255,255,0.30)', fontSize:12, margin:'2px 0 0' }}>{commerce.city.name}</p>}
                  </div>
                  {editPencil('address', 'Agregar ubicación', false /* sin info, va amarillo */)}
                </div>
              )}

              {/* Instagram */}
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }} />
              {commerce.instagram ? (
                <div style={{ display:'flex', alignItems:'center', padding:'0 12px 0 0' }}>
                  <a href={`https://instagram.com/${commerce.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', textDecoration:'none', fontFamily:FI }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <Camera size={18} strokeWidth={2} color="rgba(255,255,255,0.6)" />
                      <p style={{ color:C.white, fontSize:14, fontWeight:500, margin:0 }}>{commerce.instagram}</p>
                    </div>
                    <ChevronRight size={18} color="rgba(255,255,255,0.35)" />
                  </a>
                  {editPencil('instagram', 'Editar Instagram', !!commerce.instagram)}
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', fontFamily:FI }}>
                  <Camera size={18} strokeWidth={2} color="rgba(255,255,255,0.25)" />
                  <p style={{ flex:1, color:'rgba(255,255,255,0.35)', fontSize:14, fontWeight:500, margin:0, fontStyle:'italic' }}>Sin redes sociales</p>
                  {editPencil('instagram', 'Agregar Instagram', false /* sin info, va amarillo */)}
                </div>
              )}
            </div>

            {/* Flecha al pie de la card — siempre visible (incluso cuando
                la card está cerrada). Indica "tocá para desplegar la info
                del negocio". Click en la flecha o cualquier parte de la
                card hace toggle del cardOpen. */}
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setCardOpen(v => !v) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCardOpen(v => !v) } }}
              aria-label={cardOpen ? 'Ocultar info del negocio' : 'Mostrar info del negocio'}
              style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'10px 16px',
                borderTop:'1px solid rgba(255,255,255,0.08)',
                cursor:'pointer',
                color:'rgba(255,255,255,0.55)',
                fontFamily:FN, fontSize:11, fontWeight:600,
                letterSpacing:'.10em', textTransform:'uppercase',
                transition:'background 200ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {cardOpen ? 'Ocultar' : 'Sobre el negocio'}
              <ChevronDown
                size={16}
                strokeWidth={2.4}
                style={{
                  transform: cardOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* El ClubTopNav (Inicio / Catálogo / Historial) ahora vive como
            pill flotante al fondo de la pantalla (ver render más abajo,
            fuera del flujo del contenido). Mientras el cliente esté dentro
            de la página del club queda siempre visible y la card del
            negocio sigue arriba como contexto persistente. */}

        {/* ── SLIDE TO JOIN / MEMBER BADGE (siempre visible) ──
              Cuando el cliente viene del QR del negocio (?from_qr=1) y todavía
              no es socio, ponemos un overlay oscuro encima de toda la pantalla
              y elevamos el slider con z-index alto para que sea lo único
              visible. Al deslizar, el overlay desaparece (porque deja de
              aplicar la condición !isMember). */}
        {fromQr && !isMember && !spotlightSeen && (
          <div style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', pointerEvents:'none' }} />
        )}
        <div style={{ padding:'20px 16px 0', position: fromQr && !isMember && !spotlightSeen ? 'relative' : 'static', zIndex: fromQr && !isMember && !spotlightSeen ? 200 : 'auto' }}>
          {isMember ? (
            <>
              {/* "Sos parte de este club" solo aparece en la pestaña Inicio
                  — en Catálogo e Historial el cliente quiere foco en el
                  contenido específico, no en la confirmación de pertenencia.
                  La campanita ya vive sobre la portada (visible en las 3
                  pestañas), así que no se duplica acá. */}
              {tab === 'inicio' && (
                <MemberBadge createdAt={membership?.joined_at} />
              )}
            </>
          ) : (
            <>
              {fromQr && !spotlightSeen && (
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
                  // Si ya tenemos user + teléfono → unir directo. Si no, hacer
                  // re-fetch (la sesión puede no estar hidratada en el state local
                  // tras un full reload, pero sí estar viva en cookies).
                  let currentUser = user
                  let currentPhone = (userProfile?.phone || phone || '').trim()
                  const sb = getSupabase()

                  if (!currentUser) {
                    try {
                      const { data: sess } = await sb.auth.getSession()
                      currentUser = sess?.session?.user || null
                      if (!currentUser) {
                        const { data } = await sb.auth.getUser()
                        currentUser = data.user || null
                      }
                      if (currentUser) setUser(currentUser)
                    } catch {}
                  }

                  if (currentUser && !currentPhone) {
                    try {
                      const { data: prof } = await sb.from('profiles').select('phone').eq('id', currentUser.id).maybeSingle()
                      if (prof?.phone) {
                        currentPhone = prof.phone.trim()
                        setUserProfile(p => ({ ...(p || {}), phone: prof.phone }))
                      }
                    } catch {}
                  }

                  if (currentUser && currentPhone) {
                    handleJoin(currentPhone)
                  } else {
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

            {/* HelpBanner — solo se muestra al cliente común. En modo
                edición del ojo (editMode) no aparece — el dueño está
                previsualizando su propio club, no necesita el copy
                introductorio orientado a clientes nuevos. */}
            {!editMode && (
              <HelpBanner
                id="club-inicio"
                title="Conociste un club nuevo"
                body="Esta es la página pública del comercio. Acá ves los premios, datos y cómo sumarte."
                details="Si te sumás al club, vas a poder acumular puntos o estrellas con cada compra y canjearlos directamente desde tu billetera."
              />
            )}

            {/* La card "Tu saldo" se movió a la pestaña Catálogo — ahí
                conviven el balance del cliente y los premios que puede
                canjear, evitando que Inicio sea un compendio de TODO. */}

            {/* El accordion "Sobre el negocio" que vivía acá fue absorbido
                por la card del negocio (arriba). Ahora todo (descripción +
                horarios + ubicación + redes) vive adentro de un único
                desplegable controlado por la flecha al pie de esa card. */}

            {/* La card "Promoción activa" se removió porque ahora el slider
                "Beneficios" (más abajo en este mismo
                tab) muestra TODAS las promos activas con su countdown,
                evitando duplicación visual. */}

            {/* El catálogo de premios ya no se muestra en Inicio — ahora vive
                exclusivamente en la pestaña "Catálogo", junto con el balance
                del cliente. Antes esto causaba duplicación visual entre las
                dos pestañas. */}

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

            {/* Footer "Benefix · Ciudad" eliminado de acá: quedaba flotando
                en el medio de la página después de mergear los tabs. Si se
                quiere volver a mostrar, va al final de todo el contenido. */}
          </div>
        )}

        {/* ━━━ CATÁLOGO (parte del tab unificado "Inicio") ━━━
            Se mergeó con el tab "inicio" para evitar la división artificial.
            El bloque sigue siendo independiente porque tiene su propia
            lógica (slider + saldo + lista de premios) y se renderiza
            DESPUÉS del bloque de info principal en el flujo del DOM.
            Mismo `gap:16` flex que el bloque de arriba para spacing
            consistente entre todos los containers de la página. */}
        {tab === 'inicio' && (
          <div style={{ margin:'16px 16px 0', animation:'fadeUp .3s ease', display:'flex', flexDirection:'column', gap:16 }}>

            {/* ── TU SALDO ── (solo miembros) */}
            {isMember && (
              <div style={{ background:'rgba(255,255,255,0.05)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:20, padding:'20px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:GA }} />
                <div style={{ position:'absolute', top:-40, right:-30, width:140, height:140, borderRadius:'50%', background:'rgba(168,85,247,0.1)', filter:'blur(40px)', pointerEvents:'none' }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
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
                {/* La barra de "progreso hacia la recompensa" se removió:
                    asumía que el cliente apunta al premio más barato, lo cual
                    no siempre es así. Cada premio tiene su propia barra de
                    progreso en su card del catálogo (más abajo) — eso le da
                    al cliente control total sobre qué meta perseguir. */}
                {/* Compra mínima visible al cliente (solo en stars). */}
                {isStars && commerce.prog_min_purchase > 0 && (
                  <div style={{ fontSize:11, color:'rgba(251,191,36,0.85)', marginTop:14, display:'flex', alignItems:'center', gap:5 }}>
                    <Star size={11} strokeWidth={0} fill="currentColor" />
                    Compra mínima para sumar estrella: <strong>${commerce.prog_min_purchase.toLocaleString('es-AR')}</strong>
                  </div>
                )}
              </div>
            )}

            {/* ── BENEFICIOS POR TIEMPO LIMITADO ──
                Slider auto-rotatorio con las promos activas (descuentos,
                doble puntaje, etc). Va ANTES del catálogo de premios para
                que el primer impacto del cliente sean los beneficios
                urgentes con vencimiento, y después navegue tranquilo el
                catálogo de premios canjeables. */}
            <LimitedTimeBenefitsSlider promos={promos} unitLabel={unitLabel} editMode={editMode} onEdit={() => navigateEditField('promo')} />

            {/* Header "Premios" + subtítulo agrupados en un solo bloque
                (sin marginBottom propio) para que el gap:16 del padre se
                aplique de forma consistente entre header→primera card.
                En editMode mostramos un lápiz al lado del título que
                navega a la pestaña Premios del panel del comercio para
                que el dueño pueda agregar/editar/desactivar. */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <h2 style={{ fontFamily:FN, fontSize:20, fontWeight:700, color:C.white, margin:0, letterSpacing:'-0.02em' }}>Premios</h2>
                {editMode && editPencil('prize', 'Editar premios', activePrizes.length > 0)}
              </div>
              <div style={{ fontSize:13, color:C.mist, marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
                {isMember
                  ? <><UnitIcon size={13} {...unitIconProps} /> <span style={{ color:unitColor, fontWeight:600 }}>{bal}</span> {unitLabel} disponibles</>
                  : `Necesitás ${unitLabel} para canjear premios.`}
              </div>
            </div>

            {activePrizes.length === 0 ? (
              <GlassCard style={{ textAlign:'center', padding:'48px 20px', borderRadius:20 }} hover={false}>
                <div style={{ marginBottom:14 }}><Gift size={44} strokeWidth={1.5} color="rgba(255,255,255,0.4)" /></div>
                <div style={{ fontFamily:FN, fontSize:16, fontWeight:700, color:C.white, marginBottom:8 }}>Sin premios disponibles</div>
                <div style={{ fontSize:13, color:C.mist, marginBottom: editMode ? 16 : 0 }}>El negocio aún no tiene premios activos.</div>
                {editMode && (
                  <button
                    onClick={() => navigateEditField('prize')}
                    style={{
                      padding: '10px 18px', borderRadius: 12,
                      // Estado vacio = sin premios cargados → amarillo.
                      background: 'linear-gradient(135deg, #B45309, #F5A623)',
                      border: '1px solid rgba(255,255,255,0.22)',
                      color: '#fff',
                      fontFamily: FN, fontSize: 12.5, fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(245,166,35,0.50)',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                    <Pen size={12} strokeWidth={2.4} /> Agregar premios
                  </button>
                )}
              </GlassCard>
            ) : (
              <div style={{
                // Grilla de 2 columnas para mostrar más premios en menos
                // scroll. Cards verticales (foto arriba, info abajo). Antes
                // era flex column con cards horizontales — el reformat a
                // grid multiplica la densidad sin sacrificar legibilidad
                // porque las fotos se mantienen prominentes.
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}>
                {activePrizes.map((prize, idx) => {
                  const canRedeem      = isMember && bal >= prize.cost
                  const progressPct    = isMember ? Math.min(100, Math.round((bal / prize.cost) * 100)) : 0
                  const pointsLeft     = Math.max(prize.cost - bal, 0)
                  const isOos          = prize.stock === 0
                  // Tag "NUEVO" para premios creados en los últimos 7 días.
                  // Se renderiza diagonal en la esquina sup-izq de la foto.
                  const isNew = (() => {
                    if (!prize.created_at) return false
                    const createdMs = new Date(prize.created_at).getTime()
                    const weekMs = 7 * 24 * 60 * 60 * 1000
                    return (Date.now() - createdMs) < weekMs
                  })()
                  return (
                    <div
                      key={prize.id}
                      role="button" tabIndex={0}
                      onClick={() => setPrizeDetail(prize)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPrizeDetail(prize) } }}
                      style={{
                        position:'relative',
                        width:'100%',
                        background:'rgba(255,255,255,0.05)',
                        backdropFilter:'blur(20px)',
                        WebkitBackdropFilter:'blur(20px)',
                        border:`1px solid ${canRedeem ? 'rgba(34,230,152,0.35)' : 'rgba(255,255,255,0.10)'}`,
                        borderRadius:16,
                        overflow: editMode ? 'visible' : 'hidden',
                        opacity: isOos ? 0.5 : 1,
                        animation:`cardIn .35s ease ${idx * 0.07}s both`,
                        padding:0,
                        textAlign:'left',
                        cursor: 'pointer',
                        fontFamily:'inherit',
                        transition:'transform 160ms ease, border-color 160ms ease',
                      }}
                      onMouseEnter={e => { if (!isOos) e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
                      {/* Pen icon — solo en edit mode. Tap → abre el
                          wizard de edicion de ese premio especifico en
                          el panel del comercio. Storeamos el prize.id en
                          sessionStorage; el panel lo lee al montar y
                          dispara startEditPrize(prize) automaticamente,
                          asi que el dueno aterriza directo en el form
                          de ese premio sin tener que buscarlo. */}
                      {editMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            try { sessionStorage.setItem('benefix:edit-prize-id', prize.id) } catch {}
                            navigateEditField('prize')
                          }}
                          aria-label={`Editar ${prize.name}`}
                          style={{
                            position:'absolute', top:-8, right:-8, zIndex:5,
                            width:30, height:30, borderRadius:'50%',
                            // Premio activo (renderizado en la grilla) = ya cargado → verde.
                            background:'linear-gradient(135deg, #15803D, #22E698)',
                            border:'2px solid #0a0a14',
                            color:'#fff', cursor:'pointer', padding:0,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            boxShadow:'0 4px 14px rgba(34,230,152,0.55)',
                          }}>
                          <Pen size={13} strokeWidth={2.4} />
                        </button>
                      )}
                      <div style={{ display:'flex', flexDirection:'column' }}>

                        {/* Imagen arriba — full width 4:3 para que se vea
                            generosa pero la card no quede demasiado alta
                            cuando hay muchos premios. */}
                        <div style={{ width:'100%', aspectRatio:'4 / 3', position:'relative', overflow:'hidden', background:'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.15))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {prize.img_url
                            ? <img src={prize.img_url} alt={prize.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : <Gift size={36} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
                          }
                          {/* Banner "NUEVO" diagonal sobre la esquina sup-izq.
                              Solo aparece si el premio se cargó hace menos de
                              7 días. Diseño tipo "ribbon" inclinado a -45° con
                              gradient violeta de marca y un sutil glow para
                              que se destaque sobre cualquier imagen de fondo. */}
                          {isNew && (
                            <div style={{
                              position: 'absolute',
                              top: 10,
                              left: -28,
                              transform: 'rotate(-45deg)',
                              background: 'linear-gradient(135deg, #7C3AED 0%, #BD4BF8 50%, #A855F7 100%)',
                              color: '#fff',
                              fontFamily: FN,
                              fontSize: 9,
                              fontWeight: 900,
                              letterSpacing: '.18em',
                              textTransform: 'uppercase',
                              padding: '3px 32px',
                              boxShadow: '0 2px 8px rgba(124,58,237,0.55), 0 0 0 1px rgba(255,255,255,0.18) inset',
                              textShadow: '0 1px 2px rgba(0,0,0,0.40)',
                              pointerEvents: 'none',
                              zIndex: 2,
                            }}>
                              Nuevo
                            </div>
                          )}
                        </div>

                        {/* Contenido inferior — sigue siendo flex column con
                            info arriba y progreso abajo, pero con paddings
                            y tipografía un poco más compactos para que la
                            card vertical no quede gigante en la grilla 2x. */}
                        <div style={{ padding:'12px 12px 12px', display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>

                          {/* Info superior */}
                          <div>
                            <div style={{
                              fontFamily:FN, fontSize:13, fontWeight:600, color:C.white,
                              lineHeight:1.3,
                              // Truncamos a 2 líneas para evitar que un nombre largo
                              // descuadre la altura de la card respecto a la vecina.
                              display:'-webkit-box',
                              WebkitLineClamp:2,
                              WebkitBoxOrient:'vertical',
                              overflow:'hidden',
                              minHeight: 'calc(1.3em * 2)',
                            }}>
                              {prize.name}
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                              <Gem size={13} color="#a855f7" strokeWidth={2} />
                              <span style={{ color:'#a855f7', fontSize:12, fontWeight:600, fontFamily:FN }}>
                                {prize.cost} {unitLabel}
                              </span>
                              {prize.stock !== null && (
                                <span style={{ marginLeft:'auto', fontSize:10, color: isOos ? C.o : prize.stock <= 2 ? C.o : C.dust, fontWeight:600 }}>
                                  {isOos ? 'Agotado' : `${prize.stock} disp.`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Barra de progreso + estado.
                              • canRedeem (100%): degradé de marca naranja→violeta
                                fluyendo lento (4.5s). Glow doble naranja + violeta.
                              • Aún no llegó al cost: violeta de marca pleno
                                (#BD4BF8) sin animación de flow, con pulse muy
                                sutil para que se sienta "vivo" sin distraer. */}
                          <div>
                            <div style={{
                              height:10,
                              background:'rgba(0,0,0,0.55)',
                              borderRadius:9999,
                              overflow:'hidden',
                              border:'1px solid rgba(255,255,255,0.08)',
                            }}>
                              <div
                                style={{
                                  height:'100%',
                                  width:`${progressPct}%`,
                                  minWidth: progressPct > 0 ? 10 : 0,
                                  borderRadius:9999,
                                  background: canRedeem
                                    ? 'linear-gradient(90deg, #FE5000 0%, #BD4BF8 50%, #FE5000 100%)'
                                    : '#BD4BF8',
                                  backgroundSize: canRedeem ? '200% 100%' : 'auto',
                                  boxShadow: canRedeem
                                    ? '0 0 12px rgba(254,80,0,0.65), 0 0 22px rgba(189,75,248,0.55), inset 0 0 10px rgba(255,255,255,0.30)'
                                    : '0 0 8px rgba(189,75,248,0.45), inset 0 0 6px rgba(255,255,255,0.20)',
                                  animation: canRedeem
                                    ? 'brand-bar-flow 4.5s ease-in-out infinite'
                                    : 'brand-bar-pulse 2.8s ease-in-out infinite',
                                }}
                              />
                            </div>
                            <div style={{ marginTop:5, display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                              <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', margin:0, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {canRedeem
                                  ? <span style={{ color:'#22E698', fontWeight:600 }}>Disponible</span>
                                  : isMember
                                    ? <><span style={{ color:C.white, fontWeight:600 }}>{pointsLeft}</span> {unitLabel}</>
                                    : `${prize.cost} ${unitLabel}`}
                              </p>
                              <ChevronRight size={12} strokeWidth={2.6} color="#a855f7" style={{ flexShrink:0 }} />
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

        {/* ━━━ HISTORIAL (accordion al fondo del tab unificado) ━━━
            Antes era una pestaña aparte; ahora vive como accordion abajo
            del catálogo de premios. Solo se muestra a miembros — los
            no-miembros no tienen visitas ni canjes que ver. En modo
            edición del dueño (editMode), tampoco aparece (es info del
            cliente, no del comercio). */}
        {tab === 'inicio' && isMember && !editMode && (
          <div style={{ margin:'16px 16px 0', animation:'fadeUp .3s ease' }}>
            <div style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:16, overflow:'hidden' }}>
              <button
                onClick={() => setShowHistory(v => !v)}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  cursor: 'pointer', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: FI, textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(189,75,248,0.14)', border: '1px solid rgba(189,75,248,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={16} color="#fff" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p style={{ color: C.white, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FN }}>Mi historial en este club</p>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: '2px 0 0' }}>Visitas y canjes</p>
                  </div>
                </div>
                <ChevronDown size={18} color="rgba(255,255,255,0.45)" style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform .25s ease' }} />
              </button>
              {showHistory && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 0' }}>
                  <ClubHistory user={user} commerceId={commerce.id} unitLabel={unitLabel} unitColor={unitColor} UnitIcon={UnitIcon} unitIconProps={unitIconProps} />
                </div>
              )}
            </div>
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
            style={{ position:'relative', width:'100%', maxWidth:340, background:'rgba(20,16,32,0.98)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:18, padding:'22px 20px', boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>
            <button onClick={() => !leaving && setLeaveConfirm(false)} aria-label="Cerrar" title="Cerrar" disabled={leaving}
              style={{ position:'absolute', top:10, right:10, width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', color:'#fff', cursor: leaving ? 'wait' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
              <X size={14} strokeWidth={2.4} />
            </button>
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

      {/* ── BOTTOM NAV FLOTANTE DEL CLUB ── (REMOVIDO)
            Antes era una pill flotante con Inicio/Catálogo/Historial. Como
            unificamos Inicio + Catálogo en un solo tab y movimos Historial
            adentro de un accordion en la página de Inicio, el bottom nav
            quedó sin función real. Lo escondemos siempre. Si en el futuro
            hace falta multi-pestaña, se puede volver a montar:
            <ClubTopNav tab={tab} setTab={setTab} prizesCount={activePrizes.length} editMode={editMode} />
       */}

      {/* ── JOIN MODAL ── */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.80)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', zIndex:999, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e => { if (e.target===e.currentTarget) setShowModal(false) }}>
          <div style={{ position:'relative', background:'rgba(255,255,255,0.08)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'28px 28px 0 0', width:'100%', maxWidth:560, padding:'24px 24px 44px', animation:'fadeUp .3s ease', boxShadow:'0 -8px 40px rgba(0,0,0,0.4)' }}>
            <button onClick={() => setShowModal(false)} aria-label="Cerrar" title="Cerrar"
              style={{ position:'absolute', top:14, right:14, width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, zIndex:2 }}>
              <X size={16} strokeWidth={2.4} />
            </button>
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

      {/* ── INLINE EDIT MODAL — los lápices del modo edición abren acá ──
            Re-implementa los mismos campos que la pantalla de configuración
            del negocio. Para campos del comercio (name, description, address,
            instagram, facebook, phone) llama a /api/save-commerce-config y
            actualiza el state local de `data.commerce`. Para premios usa
            supabase directo (RLS permite al owner editar sus propios prizes)
            y refresca el array local. */}
      {inlineEdit && (() => {
        const f = inlineEdit.field
        const inputStyle = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:12, padding:'12px 14px', fontSize:14, color:'#fff', fontFamily:'inherit', boxSizing:'border-box', outline:'none' }
        const labelStyle = { fontSize:11, color:'rgba(255,255,255,0.55)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', display:'block', marginBottom:6, fontFamily:FN }
        const TITLE = {
          name:        'Nombre del negocio',
          description: 'Descripción',
          address:     'Ubicación',
          instagram:   'Instagram',
          facebook:    'Facebook',
          phone:       'Teléfono',
          category:    'Categorías',
          prize:       inlineEdit.prize ? `Premio: ${inlineEdit.prize.name}` : 'Premio',
        }
        return (
          <InlineEditModal
            title={TITLE[f] || 'Editar'}
            field={f}
            initial={inlineEdit.prize || data?.commerce}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            onClose={() => setInlineEdit(null)}
            onSavedCommerce={updates => {
              // Mergeamos los campos actualizados al commerce local sin
              // perder la galería de prizes ni promos.
              setData(prev => prev ? ({ ...prev, commerce: { ...prev.commerce, ...updates } }) : prev)
              setInlineEdit(null)
            }}
            onSavedPrize={updatedPrize => {
              setData(prev => {
                if (!prev) return prev
                const nextPrizes = (prev.prizes || []).map(p => p.id === updatedPrize.id ? { ...p, ...updatedPrize } : p)
                return { ...prev, prizes: nextPrizes }
              })
              setInlineEdit(null)
            }}
            onDeletedPrize={prizeId => {
              setData(prev => {
                if (!prev) return prev
                const nextPrizes = (prev.prizes || []).filter(p => p.id !== prizeId)
                return { ...prev, prizes: nextPrizes }
              })
              setInlineEdit(null)
            }}
          />
        )
      })()}

      {/* ── PRIZE DETAIL MODAL ──
            Vista estilo "producto de ecommerce" del premio: imagen grande,
            nombre, costo en puntos/estrellas, descripción del comercio,
            stock y un CTA "Canjear" sticky al fondo. Si el cliente no tiene
            puntos suficientes se muestra cuánto le falta. Tap en X o backdrop
            cierra. El "Canjear" abre el confirmPrize modal existente que
            ya maneja el confirm + doRedeem (que ahora también dispara WA). */}
      {prizeDetail && (() => {
        const p = prizeDetail
        const canRedeem  = isMember && bal >= p.cost
        const isOos      = p.stock === 0
        const pointsLeft = Math.max(p.cost - bal, 0)
        const progressPct = isMember ? Math.min(100, Math.round((bal / p.cost) * 100)) : 0
        // Galería de imágenes — usa el array `images` si existe; sino cae a
        // [img_url] (legacy). Si no hay nada, se renderea el placeholder
        // dentro del slide único.
        const gallery = (Array.isArray(p.images) && p.images.length > 0)
          ? p.images
          : (p.img_url ? [p.img_url] : [])
        return (
          <div style={{ position:'fixed', inset:0, zIndex:850, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
            {/* Backdrop oscuro */}
            <div onClick={() => setPrizeDetail(null)}
              style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)' }} />
            {/* Sheet del detalle — sube desde abajo, ocupa hasta 92vh */}
            <div style={{
              position:'relative',
              width:'100%', maxWidth:520,
              maxHeight:'92vh',
              background:'#0a0a14',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:'24px 24px 0 0',
              overflow:'hidden',
              display:'flex', flexDirection:'column',
              animation:'fadeUp .3s cubic-bezier(0.16,1,0.3,1)',
              boxShadow:'0 -16px 64px rgba(0,0,0,0.55)',
            }}>
              {/* Botón X cerrar */}
              <button onClick={() => setPrizeDetail(null)}
                aria-label="Cerrar"
                style={{
                  position:'absolute', top:14, right:14, zIndex:5,
                  width:38, height:38, borderRadius:'50%',
                  background:'rgba(0,0,0,0.55)',
                  backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
                  border:'1px solid rgba(255,255,255,0.18)',
                  color:'#fff',
                  cursor:'pointer', padding:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                <ChevronDown size={20} strokeWidth={2.4} />
              </button>

              {/* Scrollable content */}
              <div style={{ flex:1, overflowY:'auto' }}>
                {/* Galería de imágenes (4:3) — carrusel horizontal con
                    scroll-snap. Si hay 1+ imágenes, las muestra en orden
                    swipeables con dots indicadores abajo. Si no hay ninguna,
                    cae al placeholder con ícono Gift centrado. */}
                <div style={{
                  width:'100%',
                  aspectRatio:'4 / 3',
                  background:'linear-gradient(135deg, rgba(168,85,247,0.30), rgba(236,72,153,0.20))',
                  position:'relative',
                  overflow:'hidden',
                }}>
                  {gallery.length === 0 ? (
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Gift size={84} strokeWidth={1.2} color="rgba(255,255,255,0.50)" />
                    </div>
                  ) : (
                    <>
                      <div
                        ref={galleryStripRef}
                        onScroll={handleGalleryScroll}
                        className="prize-gallery-strip"
                        style={{
                          width:'100%', height:'100%',
                          display:'flex',
                          overflowX:'auto', overflowY:'hidden',
                          scrollSnapType:'x mandatory',
                          WebkitOverflowScrolling:'touch',
                          scrollbarWidth:'none',
                          msOverflowStyle:'none',
                        }}>
                        {gallery.map((src, i) => (
                          <div key={i} style={{
                            flex:'0 0 100%',
                            width:'100%', height:'100%',
                            scrollSnapAlign:'start',
                            scrollSnapStop:'always',
                          }}>
                            <img
                              src={src}
                              alt={`${p.name} — imagen ${i + 1} de ${gallery.length}`}
                              loading={i === 0 ? 'eager' : 'lazy'}
                              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                            />
                          </div>
                        ))}
                      </div>
                      {/* Contador "1/3" — estilo ecommerce, esquina inferior-derecha */}
                      {gallery.length > 1 && (
                        <span style={{
                          position:'absolute', bottom:14, right:14,
                          padding:'5px 12px',
                          background:'rgba(0,0,0,0.55)',
                          color:'#fff', fontSize:11, fontWeight:700,
                          letterSpacing:'.06em',
                          borderRadius:99, fontFamily:FN,
                          backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
                          display:'flex', alignItems:'center', gap:4,
                        }}>
                          <Camera size={11} strokeWidth={2.4} /> {gallery.length}
                        </span>
                      )}
                      {/* Dots indicadores: barritas centradas abajo. El dot
                          activo se ensancha y queda blanco sólido — se sync
                          con el scroll manual del user vía onScroll arriba. */}
                      {gallery.length > 1 && (
                        <div style={{
                          position:'absolute', bottom:16, left:0, right:0,
                          display:'flex', justifyContent:'center', gap:6,
                          pointerEvents:'none',
                        }}>
                          {gallery.map((_, i) => {
                            const active = i === galleryIdx
                            return (
                              <span key={i} style={{
                                width: active ? 24 : 6, height: 4, borderRadius: 99,
                                background: active ? '#fff' : 'rgba(255,255,255,0.40)',
                                border: '1px solid rgba(0,0,0,0.20)',
                                transition: 'width 280ms cubic-bezier(0.22,1,0.36,1), background 280ms ease',
                              }} />
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                  {/* Stock badge top-left */}
                  {p.stock !== null && (
                    <span style={{
                      position:'absolute', top:14, left:14,
                      padding:'5px 10px',
                      background: isOos ? 'rgba(239,68,68,0.92)' : (p.stock <= 2 ? 'rgba(254,80,0,0.92)' : 'rgba(0,0,0,0.55)'),
                      color:'#fff', fontSize:10, fontWeight:800,
                      letterSpacing:'.10em', textTransform:'uppercase',
                      borderRadius:99, fontFamily:FN,
                      backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
                      zIndex:2,
                    }}>
                      {isOos ? 'Agotado' : `${p.stock} disp.`}
                    </span>
                  )}
                </div>

                {/* Body: título + costo + descripción */}
                <div style={{ padding:'20px 20px 12px' }}>
                  {/* Migaja "Catálogo · Comercio" */}
                  <div style={{ fontFamily:FN, fontSize:10, fontWeight:700, color:C.dust, letterSpacing:'.14em', textTransform:'uppercase', marginBottom:8 }}>
                    Premio · {commerce.name}
                  </div>
                  <h2 style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, margin:'0 0 10px', lineHeight:1.2, letterSpacing:'-0.01em' }}>
                    {p.name}
                  </h2>
                  {/* Pill grande con el costo en puntos */}
                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:8,
                    padding:'8px 14px', borderRadius:99,
                    background:'rgba(168,85,247,0.14)',
                    border:'1px solid rgba(168,85,247,0.40)',
                    color:'#c084fc',
                    fontFamily:FN, fontSize:14, fontWeight:800,
                    marginBottom:18,
                  }}>
                    <Gem size={16} strokeWidth={2.2} />
                    {p.cost} {unitLabel}
                  </div>

                  {/* Descripción */}
                  {p.description ? (
                    <p style={{ fontSize:14, color:'rgba(255,255,255,0.78)', lineHeight:1.6, margin:'0 0 18px', whiteSpace:'pre-wrap' }}>
                      {p.description}
                    </p>
                  ) : (
                    <p style={{ fontSize:13, color:'rgba(255,255,255,0.40)', fontStyle:'italic', margin:'0 0 18px' }}>
                      El comercio no agregó descripción para este premio.
                    </p>
                  )}

                  {/* Tu progreso (solo miembros) */}
                  {isMember && (
                    <div style={{
                      background:'rgba(255,255,255,0.04)',
                      border:'1px solid rgba(255,255,255,0.08)',
                      borderRadius:14, padding:'12px 14px',
                      marginBottom:14,
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <span style={{ fontSize:12, color:C.mist, fontWeight:600 }}>Tu progreso</span>
                        <span style={{ fontSize:12, color: canRedeem ? '#22E698' : '#c084fc', fontWeight:700 }}>
                          {bal} / {p.cost} {unitLabel}
                        </span>
                      </div>
                      <div style={{ height:10, background:'rgba(0,0,0,0.55)', borderRadius:9999, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{
                          height:'100%',
                          width:`${progressPct}%`,
                          minWidth: progressPct > 0 ? 10 : 0,
                          borderRadius:9999,
                          background: canRedeem
                            ? 'linear-gradient(90deg, #FE5000 0%, #BD4BF8 50%, #FE5000 100%)'
                            : '#BD4BF8',
                          backgroundSize: canRedeem ? '200% 100%' : 'auto',
                          boxShadow: canRedeem
                            ? '0 0 14px rgba(254,80,0,0.70), 0 0 26px rgba(189,75,248,0.60), inset 0 0 12px rgba(255,255,255,0.35)'
                            : '0 0 8px rgba(189,75,248,0.45), inset 0 0 6px rgba(255,255,255,0.20)',
                          animation: canRedeem
                            ? 'brand-bar-flow 4.5s ease-in-out infinite'
                            : 'brand-bar-pulse 2.8s ease-in-out infinite',
                        }} />
                      </div>
                      {!canRedeem && (
                        <div style={{ marginTop:8, fontSize:12, color:C.mist }}>
                          Te faltan <strong style={{ color:C.white }}>{pointsLeft} {unitLabel}</strong> — seguí visitando para sumarlos.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aviso WhatsApp — adelantamos al cliente que al canjear se
                      le va a abrir el chat con el comercio para coordinar el
                      retiro. Solo si el comercio tiene número cargado. */}
                  {commerce?.phone && canRedeem && (
                    <div style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'10px 12px', borderRadius:12,
                      background:'rgba(34,230,152,0.08)',
                      border:'1px solid rgba(34,230,152,0.25)',
                      marginBottom:6,
                    }}>
                      <MessageCircle size={16} color="#22E698" strokeWidth={2.2} style={{ flexShrink:0 }} />
                      <span style={{ fontSize:12, color:'rgba(220,255,236,0.85)', lineHeight:1.4 }}>
                        Al canjear te abrimos un WhatsApp con {commerce.name} para coordinar el retiro.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA sticky al fondo */}
              <div style={{
                padding:'14px 20px calc(14px + env(safe-area-inset-bottom, 0px))',
                background:'rgba(10,10,20,0.92)',
                borderTop:'1px solid rgba(255,255,255,0.08)',
                backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
              }}>
                {!isMember ? (
                  <div style={{ textAlign:'center', fontSize:13, color:C.mist, padding:'10px 0' }}>
                    Sumate al club para poder canjear
                  </div>
                ) : isOos ? (
                  <div style={{ textAlign:'center', fontSize:13, color:'#fb7185', padding:'10px 0', fontWeight:600 }}>
                    Sin stock — el comercio repondrá pronto
                  </div>
                ) : !canRedeem ? (
                  <div style={{
                    textAlign:'center',
                    padding:'12px',
                    background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:12,
                  }}>
                    <div style={{ fontSize:13, color:C.mist }}>
                      Te faltan <strong style={{ color:C.white }}>{pointsLeft} {unitLabel}</strong> para canjear este premio
                    </div>
                  </div>
                ) : (
                  <button
                    disabled={redeeming === p.id}
                    onClick={() => { setPrizeDetail(null); setConfirmPrize(p) }}
                    style={{
                      width:'100%', padding:'14px 0',
                      // Violeta de marca con un toque de profundidad —
                      // mismo degradé que usamos en otros CTAs primarios
                      // del comercio (#7C3AED → #BD4BF8).
                      background:'linear-gradient(135deg, #7C3AED, #BD4BF8)',
                      border:'none', borderRadius:14,
                      color:'#fff', fontFamily:FN, fontSize:15, fontWeight:800,
                      letterSpacing:'.02em',
                      cursor: redeeming === p.id ? 'not-allowed' : 'pointer',
                      opacity: redeeming === p.id ? 0.6 : 1,
                      boxShadow:'0 8px 24px rgba(189,75,248,0.50)',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    }}>
                    <Gift size={18} strokeWidth={2.4} />
                    {redeeming === p.id ? 'Procesando…' : `Canjear por ${p.cost} ${unitLabel}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── CONFIRM CANJE MODAL ── */}
      {confirmPrize && (
        <div style={{ position:'fixed', inset:0, zIndex:800, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={() => setConfirmPrize(null)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }} />
          <div style={{ position:'relative', background:'rgba(14,8,28,0.97)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:22, padding:'26px 22px', width:'100%', maxWidth:320, boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>
            <button onClick={() => setConfirmPrize(null)} aria-label="Cerrar" title="Cerrar"
              style={{ position:'absolute', top:10, right:10, width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
              <X size={14} strokeWidth={2.4} />
            </button>
            <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(189,75,248,0.18)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <Gift size={22} strokeWidth={1.5} color="#BD4BF8" />
            </div>
            <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:'#fff', textAlign:'center', marginBottom:6 }}>¿Canjear {confirmPrize.name}?</div>
            <div style={{ fontSize:12, color:C.mist, textAlign:'center', lineHeight:1.6, marginBottom:20 }}>
              Se descontarán <strong style={{ color:'#fff' }}>{confirmPrize.cost} {unitLabel}</strong> de tu cuenta.
              {commerce?.phone
                ? <> Te abrimos un WhatsApp con <strong style={{ color:'#fff' }}>{commerce.name}</strong> para coordinar el retiro.</>
                : <> Mostrá la pantalla al encargado del negocio.</>}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmPrize(null)} style={{ flex:1, padding:'11px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
              <button onClick={() => { const p = confirmPrize; setConfirmPrize(null); doRedeem(p) }}
                style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#7C3AED,#BD4BF8)', border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(189,75,248,0.45)' }}>
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
            <button onClick={() => setShowLoginPrompt(false)} aria-label="Cerrar" title="Cerrar"
              style={{ position:'absolute', top:10, right:10, width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
              <X size={14} strokeWidth={2.4} />
            </button>
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

      {/* Modal centrado de confirmacion de la campanita de suscripcion al
          club. NO se cierra solo: el user lo descarta con la X o tocando
          el fondo. Mas notorio que un toast porque la accion es importante
          (activar/desactivar suscripcion al feed del comercio). */}
      {bellModal && (() => {
        const color = bellModal.success ? '#22E698' : '#F87444'
        return (
          <div
            onClick={() => setBellModal(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2100,
              background: 'rgba(8,4,18,0.62)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
              animation: 'fadeUp .24s ease',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Notificaciones del club"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: 380, width: '100%',
                padding: '24px 22px 20px',
                borderRadius: 18,
                background: 'linear-gradient(180deg, rgba(28,18,48,0.98), rgba(18,12,32,0.98))',
                border: `1px solid ${color}55`,
                boxShadow: '0 32px 64px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)',
                fontFamily: FN, color: '#fff',
              }}
            >
              <button
                onClick={() => setBellModal(null)}
                aria-label="Cerrar"
                style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.78)',
                  cursor: 'pointer', padding: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={15} strokeWidth={2.4} />
              </button>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: `${color}22`,
                border: `1px solid ${color}55`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <Bell size={26} color={color} strokeWidth={2.2} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3, marginBottom: 6, paddingRight: 36 }}>
                {bellModal.title}
              </div>
              {bellModal.body && (
                <div style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.5, color: 'rgba(255,255,255,0.72)', marginBottom: 18 }}>
                  {bellModal.body}
                </div>
              )}
              <button
                onClick={() => setBellModal(null)}
                style={{
                  width: '100%', padding: '12px 16px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #FE5000, #BD4BF8)',
                  border: 'none', color: '#fff',
                  fontFamily: FN, fontSize: 13.5, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 10px 24px rgba(189,75,248,0.40)',
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── FLOATING ACTIONS STACK (chat soporte + campana de notifs) ──
          Espejamos lo que monta app/page.js para que el user logueado
          conserve sus shortcuts también acá. Los componentes con
          hideButton se montan para que sus drawers existan, y el
          FloatingActionsTab agrupa los dos shortcuts en una sola pill
          flotante a la derecha. */}
      {user && (
        <>
          <SwRegister />
          <FloatingActionsTab />
          <NotificationsBell hideButton role="client" />
          <SupportChat hideButton role="client" />
          <EnablePushPrompt />
        </>
      )}
    </div>
  )
}
