'use client'
import './globals.css'
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Cropper from 'react-easy-crop'
import { HexColorPicker } from 'react-colorful'
import { createPortal } from 'react-dom'
import { getSupabase } from '../lib/supabase'
import { exportToCSV, exportToExcel } from '../lib/export'
import { hashToCardColor, cardColors } from '../lib/cardColors'
import { FAMILIES_DATA } from '../lib/commerce-families-data'
import PhoneInput from '../lib/PhoneInput'
import SupportChat from '../lib/SupportChat'
import NotificationsBell from '../lib/NotificationsBell'
import EnablePushPrompt from '../lib/EnablePushPrompt'
import SwRegister from '../lib/sw-register'
import InfoHint from '../lib/InfoHint'
import HelpBanner, { resetAllHelpBanners } from '../lib/HelpBanner'
import JsQrScanner from '../lib/JsQrScanner'
import { QRCodeSVG } from 'qrcode.react'
import {
  Menu, QrCode, User, Home, LayoutDashboard, Users, Star, Gift,
  Flame, Bot, History, Settings, CreditCard, LogOut, X,
  BarChart2, Target, Building2, DoorOpen,
  Gem, Eye, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, Zap,
  Mail, Phone, CheckCircle, Lock, RefreshCw, Trash2, UserPlus, ScanLine,
  Package, Rocket, Clock, Bell, Camera, MapPin, Search,
  Copy, AlertTriangle, AlertCircle, Smartphone, Palette,
  Activity, TrendingUp, TrendingDown, Download, Ban, Check, Plus, Globe, Printer, ArrowRight, ArrowLeft, ArrowUp, CornerLeftUp, Upload,
  Coffee, UtensilsCrossed, Wine, Croissant, IceCream, Pizza,
  Beer, Drumstick, Truck,
  Scissors, Sparkles, Hand, Pen,
  Dumbbell, ShoppingBag, Pill as PillIcon, Store,
  Flower2, Flower, Car, PawPrint,
  HeartPulse, PersonStanding, Leaf, Brain, Smile,
  Shirt, Footprints, Sofa,
  WashingMachine, Wrench,
  GraduationCap, Languages, Music, MoreHorizontal, Wallet,
  MessageCircle, ArrowUpDown, Percent,
} from 'lucide-react'

const MENU_ICONS = {
  dashboard:       LayoutDashboard,
  clientes:        Users,
  // recompensas — sistema base + promociones (lo que el cliente recibe en el scan).
  recompensas:     Sparkles,
  premios:         Gift,
  // mensajes — automatizaciones de WhatsApp (comunicación fuera del scan).
  mensajes:        MessageCircle,
  // analisis — mergea reportes + segmentación.
  analisis:        BarChart2,
  historial:       History,
  configuracion:   Settings,
  planes:          CreditCard,  // sigue existiendo internamente para los teasers
}

// Feature flags — desactivar funcionalidades no listas para MVP sin borrar código.
// Reseñas/rating: tabla y endpoints siguen vivos en la DB; solo escondemos la UI.
// Cuando haya masa crítica de comercios y reseñas, flippear a true.
const REVIEWS_ENABLED = false

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const G  = 'linear-gradient(135deg, #FE5000, #BD4BF8)'
const GV = 'linear-gradient(135deg, #3F0B78, #BD4BF8)'
const GH = 'linear-gradient(160deg, #3F0B78 0%, #6B11C0 40%, #BD4BF8 75%, #FE5000 100%)'
const C = {
  bg:'transparent', bg2:'rgba(255,255,255,0.05)', bg3:'rgba(255,255,255,0.04)',
  card:'rgba(255,255,255,0.06)', cardH:'rgba(255,255,255,0.10)',
  rim:'rgba(255,255,255,0.10)', rimH:'rgba(255,255,255,0.20)',
  white:'#FFFFFF', pearl:'#F0EAFF', mist:'#9B85CC', dust:'#8370AD',
  o:'#FE5000', v:'#BD4BF8', v1:'#3F0B78',
  ok:'#22E698', okBg:'rgba(0,31,16,0.8)', info:'#40C8FF',
}
const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"
const PLANS = {
  free:    { label:'FREE',    limit:30,   price:0,      color:'#9CA3AF', badge:'#2E2E2E' },
  starter: { label:'STARTER', limit:60,   price:25000,  color:'#5B8DEF', badge:'#1A2A4A' },
  pro:     { label:'PRO',     limit:null, price:45000,  color:'#F5A623', badge:'#2A1E00' },
}

const CATS = [
  { id:'all',label:'Todos' }, { id:'cafe',label:'Cafeterías' },
  { id:'barber',label:'Barberías' }, { id:'restaurant',label:'Restaurantes' },
  { id:'health',label:'Salud' }, { id:'fashion',label:'Indumentaria' },
  { id:'services',label:'Servicios' },
]

const fmt  = (n) => new Intl.NumberFormat('es-AR').format(n)
const fmtK = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n)


// ─── TOAST SYSTEM ────────────────────────────────────────────────────────────
let _addToast = null
function showToast(type, msg, ms = 3500) {
  if (_addToast) _addToast({ id: Date.now() + Math.random(), type, msg, ms })
}
function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    _addToast = t => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.ms)
    }
    return () => { _addToast = null }
  }, [])
  if (!toasts.length) return null
  return createPortal(
    <div style={{ position:'fixed', top:16, left:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
      {toasts.map(t => {
        const cfg = {
          success: { bg:'rgba(34,230,152,0.14)', border:'rgba(34,230,152,0.32)', color:C.ok,     Icon:Check        },
          error:   { bg:'rgba(248,116,68,0.14)',  border:'rgba(248,116,68,0.32)',  color:'#f87444', Icon:AlertTriangle },
          info:    { bg:'rgba(64,200,255,0.14)',   border:'rgba(64,200,255,0.32)',  color:C.info,   Icon:AlertCircle  },
          warn:    { bg:'rgba(254,80,0,0.14)',     border:'rgba(254,80,0,0.32)',    color:C.o,      Icon:AlertTriangle },
        }[t.type] || { bg:'rgba(189,75,248,0.14)', border:'rgba(189,75,248,0.32)', color:C.v, Icon:Bell }
        return (
          <div key={t.id} className="modal-in" style={{ pointerEvents:'auto', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:cfg.bg, backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:`1px solid ${cfg.border}`, borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.40)' }}>
            <cfg.Icon size={15} color={cfg.color} strokeWidth={2} style={{ flexShrink:0 }} />
            <span style={{ fontSize:13, color:C.pearl, fontFamily:FI, flex:1, lineHeight:1.4 }}>{t.msg}</span>
          </div>
        )
      })}
    </div>,
    typeof document !== 'undefined' ? document.body : null
  )
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
let _setConfirm = null
function showConfirm(opts) {
  return new Promise(resolve => {
    if (!_setConfirm) { resolve(false); return }
    _setConfirm({ ...opts, resolve })
  })
}
function ConfirmModal() {
  const [modal, setModal] = useState(null)
  useEffect(() => { _setConfirm = setModal; return () => { _setConfirm = null } }, [])
  if (!modal) return null
  const { title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false, resolve } = modal
  const confirm = () => { setModal(null); resolve(true)  }
  const cancel  = () => { setModal(null); resolve(false) }
  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={cancel} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }} />
      <div className="modal-in liquid-glass-strong" style={{ position:'relative', borderRadius:24, padding:'28px 22px', width:'100%', maxWidth:340, boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ width:50, height:50, borderRadius:'50%', background: danger ? 'rgba(248,116,68,0.18)' : 'rgba(189,75,248,0.18)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <AlertTriangle size={22} color={danger ? '#f87444' : C.v} strokeWidth={1.5} />
        </div>
        <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:C.white, textAlign:'center', marginBottom:8 }}>{title}</div>
        <div style={{ fontSize:13, color:C.mist, textAlign:'center', lineHeight:1.7, marginBottom:22 }}>{message}</div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={cancel}  style={{ flex:1, padding:'11px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:C.pearl, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>{cancelText}</button>
          <button onClick={confirm} style={{ flex:1, padding:'11px', background: danger ? 'linear-gradient(135deg,#f87444,#ef4444)' : GV, border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer' }}>{confirmText}</button>
        </div>
      </div>
    </div>,
    typeof document !== 'undefined' ? document.body : null
  )
}

// ─── LOGIN PROMPT MODAL ──────────────────────────────────────────────────────
// Interstitial antes de redirigir a Google. Sin esto, "Entrar" mandaba directo
// al picker de Google y si el usuario se arrepentía no había una forma clara
// de volver a Benefix (la pantalla de Google es de Google, no le podemos
// agregar un botón "volver"). Promise-based, mismo patrón que showConfirm.
let _setLoginPrompt = null
function showLoginPrompt() {
  return new Promise(resolve => {
    if (!_setLoginPrompt) { resolve(false); return }
    _setLoginPrompt({ resolve })
  })
}
function LoginPromptModal() {
  const [modal, setModal] = useState(null)
  useEffect(() => { _setLoginPrompt = setModal; return () => { _setLoginPrompt = null } }, [])
  if (!modal) return null
  const { resolve } = modal
  const confirm = () => { setModal(null); resolve(true)  }
  const cancel  = () => { setModal(null); resolve(false) }
  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={cancel} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }} />
      <div className="modal-in liquid-glass-strong" style={{ position:'relative', borderRadius:24, padding:'28px 22px', width:'100%', maxWidth:340, boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>
        <button onClick={cancel} aria-label="Cerrar"
          style={{ position:'absolute', top:12, right:12, width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.40)', border:'1px solid rgba(255,255,255,0.18)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, zIndex:5 }}>
          <X size={14} strokeWidth={2.5} />
        </button>
        <div style={{ width:50, height:50, borderRadius:'50%', background:'rgba(189,75,248,0.18)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <span style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.v }}>G</span>
        </div>
        <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:C.white, textAlign:'center', marginBottom:8 }}>Iniciar sesión con Google</div>
        <div style={{ fontSize:13, color:C.mist, textAlign:'center', lineHeight:1.7, marginBottom:22 }}>Te vamos a redirigir a Google para iniciar sesión. Después volvés a Benefix automáticamente.</div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={cancel}  style={{ flex:1, padding:'11px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:C.pearl, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>← Volver</button>
          <button onClick={confirm} style={{ flex:1, padding:'11px', background:GV, border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer' }}>Continuar →</button>
        </div>
      </div>
    </div>,
    typeof document !== 'undefined' ? document.body : null
  )
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function Sk({ w = '100%', h = 14, r = 8, style: s = {} }) {
  return <div className="skeleton" style={{ width:w, height:h, borderRadius:r, flexShrink:0, ...s }} />
}
function SkeletonCard() {
  return (
    <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:12 }}>
      <Sk w={48} h={48} r={12} />
      <div style={{ flex:1 }}>
        <Sk h={13} w="60%" style={{ marginBottom:8 }} />
        <Sk h={10} w="40%" />
      </div>
      <Sk w={60} h={28} r={8} />
    </div>
  )
}
function SkeletonList({ rows = 3 }) {
  return <>{[...Array(rows)].map((_,i) => <SkeletonCard key={i} />)}</>
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ type = 'clubs', title, description, actionLabel, onAction }) {
  const cfg = {
    clubs:    { Icon: Gift,    grad: G,  defTitle: 'Todavía no estás en ningún club',  defDesc: 'Escaneá el QR de un negocio para empezar a acumular puntos.' },
    historial:{ Icon: Clock,   grad: GV, defTitle: 'Sin visitas todavía',              defDesc: 'Tus visitas a negocios aparecerán acá.' },
    premios:  { Icon: Gift,    grad: G,  defTitle: 'Sin premios disponibles',           defDesc: 'Este comercio todavía no agregó premios.' },
    clientes: { Icon: Users,   grad: GV, defTitle: 'Sin clientes todavía',             defDesc: 'Compartí el QR para que tus clientes se unan.' },
  }[type] || { Icon: Gift, grad: G, defTitle: '', defDesc: '' }
  const { Icon, grad } = cfg
  const ttl = title || cfg.defTitle
  const dsc = description || cfg.defDesc
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'44px 20px', textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:22, background:grad, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18, boxShadow:'0 8px 32px rgba(189,75,248,0.25)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.08)' }} />
        <Icon size={30} color="white" strokeWidth={1.5} style={{ position:'relative' }} />
      </div>
      <div style={{ fontFamily:FN, fontSize:16, fontWeight:800, color:C.white, marginBottom:8, letterSpacing:'-.01em' }}>{ttl}</div>
      <div style={{ fontSize:13, color:C.mist, lineHeight:1.6, maxWidth:260, marginBottom: actionLabel ? 20 : 0 }}>{dsc}</div>
      {actionLabel && onAction && (
        <button onClick={onAction} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 22px', borderRadius:50, background:grad, border:'none', color:'#fff', fontFamily:FN, fontSize:12, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(189,75,248,0.35)' }}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// ─── PULL TO REFRESH ──────────────────────────────────────────────────────────
function PullToRefresh({ onRefresh, children }) {
  const [pullY,      setPullY]      = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const pullYRef  = useRef(0)
  const THRESHOLD = 70

  useEffect(() => {
    const onTouchStart = e => {
      if (window.scrollY !== 0) return
      startYRef.current = e.touches[0].clientY
    }
    const onTouchMove = e => {
      if (!startYRef.current) return
      if (window.scrollY !== 0) { startYRef.current = 0; return }
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) { startYRef.current = 0; return }
      pullingRef.current = true
      const clamped = Math.min(dy * 0.5, THRESHOLD + 20)
      pullYRef.current = clamped
      setPullY(clamped)
      if (e.cancelable) e.preventDefault()
    }
    const onTouchEnd = async () => {
      if (!pullingRef.current) return
      const triggered = pullYRef.current >= THRESHOLD * 0.5
      pullingRef.current = false; pullYRef.current = 0; startYRef.current = 0
      setPullY(0)
      if (triggered) { setRefreshing(true); await onRefresh?.(); setRefreshing(false) }
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: false })
    document.addEventListener('touchend',   onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onRefresh])

  const progress  = Math.min(pullY / (THRESHOLD * 0.5), 1)
  const triggered = pullY >= THRESHOLD * 0.5
  const showing   = pullY > 0 || refreshing

  return (
    <div style={{ position:'relative' }}>
      {showing && (
        <div style={{ position:'absolute', top: pullY > 0 ? -pullY : -36, left:0, right:0, display:'flex', justifyContent:'center', zIndex:10, pointerEvents:'none', transition: pullY > 0 ? 'none' : 'top 300ms ease' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(189,75,248,0.15)', border:`1px solid rgba(189,75,248,${triggered ? 0.65 : 0.30})`, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', transform:`scale(${0.4 + progress * 0.6})`, transition: pullY > 0 ? 'none' : 'transform 300ms ease' }}>
            <RefreshCw size={16} color={C.v} style={{ transform: pullY > 0 ? `rotate(${progress * 360}deg)` : 'none', animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </div>
        </div>
      )}
      <div style={{ transform: pullY > 0 ? `translateY(${pullY}px)` : 'translateY(0)', transition: pullY > 0 ? 'none' : 'transform 300ms ease' }}>
        {children}
      </div>
    </div>
  )
}

// ─── INSTALL PROMPT ───────────────────────────────────────────────────────────
//
// Banner "Instalá la app" para que el user la guarde en la pantalla de inicio.
// Maneja dos casos según el navegador:
//
// 1. Chrome / Edge / Samsung Internet (Android + desktop): el navegador dispara
//    el evento `beforeinstallprompt` cuando considera que el sitio es
//    instalable. Nosotros lo capturamos, lo guardamos, y al click en "Instalar"
//    le pedimos al navegador que muestre el dialog nativo.
//
// 2. iOS Safari: NO dispara `beforeinstallprompt` (Apple no lo soporta). En
//    iPhone hay que abrir el menú "Compartir" y tocar "Añadir a inicio" a
//    mano. Detectamos iOS y mostramos un mini-tutorial con esa instrucción.
//
// Si el user ya está corriendo la app instalada (display-mode standalone),
// no mostramos nada — ya está instalada.
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible,        setVisible]        = useState(false)
  const [iosMode,        setIosMode]        = useState(false)
  const [showIosHelp,    setShowIosHelp]    = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('install_dismissed')) return

    // Si ya corre como app instalada, no mostrar nada.
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (isStandalone) return

    // Detectar iOS (Safari + Chrome para iOS también, todos sin BIP).
    const ua = navigator.userAgent || ''
    const isIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
    if (isIos) {
      setIosMode(true)
      // En iOS no esperamos evento — mostramos el banner a los 6s.
      const t = setTimeout(() => setVisible(true), 6000)
      return () => clearTimeout(t)
    }

    // Resto: esperar el evento beforeinstallprompt y mostrar al toque (3s).
    const handler = e => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setVisible(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Si el user instala la app desde el menú del navegador, ocultar.
    const onInstalled = () => {
      sessionStorage.setItem('install_dismissed', '1')
      setVisible(false)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!visible) return null
  if (!iosMode && !deferredPrompt) return null

  function dismiss() { sessionStorage.setItem('install_dismissed', '1'); setVisible(false); setShowIosHelp(false) }

  async function install() {
    if (iosMode) { setShowIosHelp(true); return }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    sessionStorage.setItem('install_dismissed', '1')
    setVisible(false)
    if (outcome === 'accepted') showToast('success', '¡App instalada!')
  }

  return (
    <>
      {/* El banner flota a `right:86` (no a 16) para que su borde derecho NO
          se cruce con los botones flotantes (chat + campana, ambos a right:18
          con width:52, ocupan hasta right:70). Así la X de cerrar nunca queda
          tapada por nada. En desktop (donde sobra ancho) queda igual de
          legible; en mobile el banner se ve un poco más angosto pero entero. */}
      <div className="modal-in" style={{ position:'fixed', bottom:88, left:16, right:86, zIndex:190, background:'rgba(18,10,32,0.97)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(189,75,248,0.35)', borderRadius:18, padding:'14px 16px', boxShadow:'0 8px 40px rgba(0,0,0,0.5)', display:'flex', alignItems:'center', gap:12 }}>
        {/* X de cerrar — esquina superior izquierda, fuera de la trayectoria
            de los botones flotantes que están a la derecha. */}
        <button onClick={dismiss} aria-label="Cerrar"
          style={{ position:'absolute', top:6, left:6, width:24, height:24, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, zIndex:1 }}>
          <X size={11} color={C.mist} strokeWidth={2.4} />
        </button>
        <div style={{ width:42, height:42, borderRadius:12, background:G, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:12 }}>
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <rect x="16" y="5.5" width="8" height="5" rx="2.5" fill="white" opacity=".9"/>
            <rect x="16" y="12" width="9" height="5.5" rx="2.75" fill="white"/>
          </svg>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, marginBottom:2 }}>Instalá la app</div>
          <div style={{ fontSize:11, color:C.mist, lineHeight:1.4 }}>
            {iosMode ? 'Sumala a tu pantalla de inicio en 2 toques.' : 'Accedé más rápido desde tu pantalla de inicio.'}
          </div>
        </div>
        <button onClick={install} style={{ padding:'8px 14px', borderRadius:10, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0, boxShadow:'0 4px 16px rgba(254,80,0,0.35)' }}>
          <Download size={13} strokeWidth={2} />
          {iosMode ? 'Cómo' : 'Instalar'}
        </button>
      </div>

      {/* Mini-tutorial para iOS — Safari no permite prompt programático. */}
      {iosMode && showIosHelp && (
        <div onClick={() => setShowIosHelp(false)}
          style={{ position:'fixed', inset:0, zIndex:9998, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:C.card, border:`1px solid ${C.rim}`, borderRadius:20, padding:'24px 22px', maxWidth:340, width:'100%', position:'relative' }}>
            <button onClick={() => setShowIosHelp(false)} aria-label="Cerrar"
              style={{ position:'absolute', top:12, right:12, width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.4)', border:`1px solid ${C.rim}`, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={14} strokeWidth={2.5} />
            </button>
            <div style={{ fontFamily:FN, fontSize:11, fontWeight:800, color:C.v, letterSpacing:'.10em', textTransform:'uppercase', marginBottom:6 }}>iPhone / iPad</div>
            <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, marginBottom:14, lineHeight:1.3 }}>Sumá Benefix a tu inicio</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:`${C.v}22`, color:C.v, fontFamily:FN, fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>1</div>
                <div style={{ fontSize:13, color:C.pearl, lineHeight:1.5 }}>Tocá el botón <strong style={{ color:C.white }}>Compartir</strong> en la barra de Safari (cuadrado con flecha hacia arriba).</div>
              </div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:`${C.v}22`, color:C.v, fontFamily:FN, fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>2</div>
                <div style={{ fontSize:13, color:C.pearl, lineHeight:1.5 }}>Bajá y tocá <strong style={{ color:C.white }}>"Añadir a inicio"</strong> (o "Add to Home Screen").</div>
              </div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:`${C.v}22`, color:C.v, fontFamily:FN, fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>3</div>
                <div style={{ fontSize:13, color:C.pearl, lineHeight:1.5 }}>Confirmá tocando <strong style={{ color:C.white }}>"Añadir"</strong>. Listo, ya la tenés en el inicio.</div>
              </div>
            </div>
            <button onClick={dismiss}
              style={{ marginTop:20, width:'100%', padding:'12px', background:G, border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer' }}>
              Listo, lo hice
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
const LOCATIONS = {
  argentina: {
    name: 'Argentina',
    provinces: {
      buenosAires:       { name: 'Buenos Aires',          cities: ['La Plata','Mar del Plata','Bahía Blanca','Tandil','Olavarría','Pergamino','Junín','Necochea','San Nicolás','Zárate','Campana','Pilar','Tigre','San Isidro','Vicente López','Avellaneda','Quilmes','Lanús','Lomas de Zamora','Morón','Merlo','Moreno','La Matanza','Florencio Varela','Berazategui'] },
      caba:              { name: 'CABA',                  cities: ['Ciudad Autónoma de Buenos Aires'] },
      cordoba:           { name: 'Córdoba',               cities: ['Córdoba','Villa Carlos Paz','Río Cuarto','Villa María','San Francisco','Jesús María','Alta Gracia','La Falda','Cosquín','Bell Ville'] },
      santaFe:           { name: 'Santa Fe',              cities: ['Rosario','Santa Fe','Rafaela','Venado Tuerto','Reconquista','Villa Gobernador Gálvez','Casilda','Esperanza','San Lorenzo'] },
      mendoza:           { name: 'Mendoza',               cities: ['Mendoza','San Rafael','Godoy Cruz','Guaymallén','Las Heras','Maipú','Luján de Cuyo','Tunuyán','San Martín'] },
      tucuman:           { name: 'Tucumán',               cities: ['San Miguel de Tucumán','Yerba Buena','Tafí Viejo','Concepción','Banda del Río Salí','Alderetes','Aguilares','Monteros'] },
      entreRios:         { name: 'Entre Ríos',            cities: ['Paraná','Concordia','Gualeguaychú','Concepción del Uruguay','Gualeguay','Villaguay','Chajarí','Victoria','Colón'] },
      salta:             { name: 'Salta',                 cities: ['Salta','San Ramón de la Nueva Orán','Tartagal','General Güemes','Metán','Cafayate','Rosario de la Frontera'] },
      misiones:          { name: 'Misiones',              cities: ['Posadas','Oberá','Eldorado','Puerto Iguazú','Apóstoles','Jardín América','Leandro N. Alem','Montecarlo'] },
      chaco:             { name: 'Chaco',                 cities: ['Resistencia','Presidencia Roque Sáenz Peña','Villa Ángela','General San Martín','Charata','Barranqueras'] },
      corrientes:        { name: 'Corrientes',            cities: ['Corrientes','Goya','Paso de los Libres','Mercedes','Curuzú Cuatiá','Santo Tomé','Bella Vista','Monte Caseros'] },
      santiagoDelEstero: { name: 'Santiago del Estero',   cities: ['Santiago del Estero','La Banda','Termas de Río Hondo','Añatuya','Frías','Fernández'] },
      sanJuan:           { name: 'San Juan',              cities: ['San Juan','Rawson','Chimbas','Rivadavia','Santa Lucía','Pocito','Caucete','Albardón'] },
      jujuy:             { name: 'Jujuy',                 cities: ['San Salvador de Jujuy','Palpalá','San Pedro','Libertador General San Martín','Perico','La Quiaca','Humahuaca','Tilcara'] },
      rioNegro:          { name: 'Río Negro',             cities: ['Viedma','San Carlos de Bariloche','General Roca','Cipolletti','Allen','Villa Regina','El Bolsón'] },
      neuquen:           { name: 'Neuquén',               cities: ['Neuquén','San Martín de los Andes','Zapala','Centenario','Plottier','Cutral Có','Villa La Angostura'] },
      formosa:           { name: 'Formosa',               cities: ['Formosa','Clorinda','Pirané','El Colorado','Ingeniero Juárez'] },
      chubut:            { name: 'Chubut',                cities: ['Rawson','Comodoro Rivadavia','Trelew','Puerto Madryn','Esquel','Sarmiento','Rada Tilly'] },
      sanLuis:           { name: 'San Luis',              cities: ['San Luis','Villa Mercedes','Merlo','La Punta','Justo Daract','Juana Koslay'] },
      catamarca:         { name: 'Catamarca',             cities: ['San Fernando del Valle de Catamarca','Recreo','Tinogasta','Andalgalá','Belén','Santa María'] },
      laRioja:           { name: 'La Rioja',              cities: ['La Rioja','Chilecito','Aimogasta','Chamical','Chepes'] },
      laPampa:           { name: 'La Pampa',              cities: ['Santa Rosa','General Pico','Toay','General Acha','Eduardo Castex','Realicó','Victorica','Intendente Alvear','25 de Mayo','Macachín'] },
      santaCruz:         { name: 'Santa Cruz',            cities: ['Río Gallegos','Caleta Olivia','El Calafate','Pico Truncado','Puerto Deseado','Las Heras','Puerto San Julián'] },
      tierraDelFuego:    { name: 'Tierra del Fuego',      cities: ['Ushuaia','Río Grande','Tolhuin'] },
    },
  },
}

function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name:     user?.user_metadata?.full_name || '',
    phone:    '',
    // Argentina pre-seleccionada — único país soportado por ahora.
    // Cuando se sumen más, volver a string vacío y obligar a elegir.
    country:  'argentina',
    province: '',
    city:     '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [animKey, setAnimKey] = useState(0)

  function go(n) { setAnimKey(k => k + 1); setStep(n) }
  const next = () => go(step + 1)
  const prev = () => go(Math.max(1, step - 1))

  const showHeader  = step >= 2 && step <= 5
  // step 5 (ubicación) ya no es skippable — necesitamos saber dónde está el cliente
  // para mostrarle comercios cerca. Sin esto el directorio queda vacío.
  const canSkip     = step === 2
  const progressPct = step >= 2 && step <= 5 ? ((step - 1) / 4) * 100 : 0
  const phoneValid      = form.phone.replace(/\D/g, '').length >= 8
  const locProvinces    = form.country ? Object.entries(LOCATIONS[form.country]?.provinces || {}) : []
  const locCities       = form.country && form.province ? LOCATIONS[form.country]?.provinces[form.province]?.cities || [] : []
  const canFinishLoc    = !!(form.country && form.province && form.city)

  function setCountry(val)  { setForm(f => ({ ...f, country: val, province: '', city: '' })) }
  function setProvince(val) { setForm(f => ({ ...f, province: val, city: '' })) }
  function setCity(val)     { setForm(f => ({ ...f, city: val })) }

  async function save() {
    setSaveError('')
    setSaving(true)
    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim(), country: form.country, province: form.province, city: form.city }),
      })
      if (res.ok) {
        go(6)
      } else {
        const json = await res.json().catch(() => ({}))
        setSaveError(json.error || 'Error al guardar. Intentá de nuevo.')
      }
    } catch {
      setSaveError('Sin conexión. Revisá tu internet e intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9990, background:'#000', display:'flex', flexDirection:'column' }}>
      {/* Blobs */}
      <div style={{ position:'fixed', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.40) 0%, rgba(139,92,246,0) 70%)', filter:'blur(80px)', zIndex:-1, pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.35) 0%, rgba(236,72,153,0) 70%)', filter:'blur(80px)', zIndex:-1, pointerEvents:'none' }} />

      {/* Header: back + skip + progress */}
      {showHeader && (
        <div style={{ padding:'16px 20px 10px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <button onClick={prev} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', color:'rgba(255,255,255,0.55)', fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer', padding:'4px 0' }}>
              <ChevronLeft size={18} strokeWidth={2} />
              Atrás
            </button>
            {canSkip && (
              <button onClick={step === 5 ? save : next} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.40)', fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer', padding:'4px 0' }}>
                Saltar
              </button>
            )}
          </div>
          <div style={{ height:3, background:'rgba(255,255,255,0.10)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, background:G, width:`${progressPct}%`, transition:'width 400ms cubic-bezier(0.23,1,0.32,1)' }} />
          </div>
        </div>
      )}

      {/* Step content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 24px 32px' }}>
        <div key={animKey} className="fu" style={{ maxWidth:400, width:'100%', margin:'0 auto' }}>

          {/* ── Paso 1: Bienvenida ── */}
          {step === 1 && (
            <div style={{ textAlign:'center' }}>
              <div style={{ width:96, height:96, borderRadius:28, background:G, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', boxShadow:'0 16px 48px rgba(254,80,0,0.35)' }}>
                <svg width="52" height="52" viewBox="0 0 28 28" fill="none">
                  <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  <rect x="16" y="5.5" width="8" height="5" rx="2.5" fill="white" opacity=".9"/>
                  <rect x="16" y="12" width="9" height="5.5" rx="2.75" fill="white"/>
                </svg>
              </div>
              <div style={{ fontFamily:FN, fontSize:30, fontWeight:900, color:C.white, marginBottom:10, letterSpacing:'-.02em' }}>¡Bienvenido!</div>
              <div style={{ fontSize:16, color:C.mist, lineHeight:1.6, marginBottom:36 }}>
                Configuremos tu cuenta en<br/>menos de 1 minuto
              </div>
              <button onClick={next} style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(254,80,0,0.35)' }}>
                Empezar
              </button>
            </div>
          )}

          {/* ── Paso 2: Nombre (opcional) ── */}
          {step === 2 && (
            <div>
              <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, marginBottom:6, letterSpacing:'-.02em' }}>¿Cómo te llamás?</div>
              <div style={{ fontSize:14, color:C.mist, marginBottom:24, lineHeight:1.5 }}>Así te saludaremos en la app</div>
              <input
                type="text" autoFocus value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                placeholder="Tu nombre"
                style={{ width:'100%', padding:'14px 16px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:14, color:C.white, fontSize:16, fontFamily:FI, marginBottom:20, boxSizing:'border-box' }}
              />
              <button onClick={next} style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(254,80,0,0.35)' }}>
                Continuar
              </button>
            </div>
          )}

          {/* ── Paso 3: Teléfono (obligatorio) ── */}
          {step === 3 && (
            <div>
              <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, marginBottom:6, letterSpacing:'-.02em' }}>Tu teléfono</div>
              <div style={{ fontSize:14, color:C.mist, marginBottom:24, lineHeight:1.5 }}>Para que los comercios puedan contactarte</div>
              <PhoneInput
                value={form.phone}
                onChange={v => setForm(f => ({ ...f, phone: v }))}
                autoFocus
                size="lg"
              />
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.32)', margin:'8px 0 20px' }}>* Campo obligatorio — mínimo 8 dígitos</div>
              <button onClick={next} disabled={!phoneValid}
                style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor: phoneValid ? 'pointer' : 'not-allowed', opacity: phoneValid ? 1 : 0.40, boxShadow: phoneValid ? '0 8px 32px rgba(254,80,0,0.35)' : 'none', transition:'opacity 200ms ease' }}>
                Continuar
              </button>
            </div>
          )}

          {/* ── Paso 4: Confirmar teléfono ── */}
          {step === 4 && (
            <div>
              <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, marginBottom:6, letterSpacing:'-.02em' }}>¿Es correcto?</div>
              <div style={{ fontSize:14, color:C.mist, marginBottom:24, lineHeight:1.5 }}>Confirmá que tu número esté bien escrito</div>
              <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:18, padding:'24px', textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:11, color:C.dust, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8, fontFamily:FN, fontWeight:700 }}>Tu número de teléfono</div>
                <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, letterSpacing:'-.01em', wordBreak:'break-all' }}>{form.phone}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button onClick={next}
                  style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(254,80,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <Check size={18} strokeWidth={2.5} />
                  Sí, es correcto
                </button>
                <button onClick={prev}
                  style={{ width:'100%', padding:'16px', borderRadius:16, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:C.pearl, fontFamily:FN, fontSize:15, fontWeight:600, cursor:'pointer' }}>
                  No, quiero corregirlo
                </button>
              </div>
            </div>
          )}

          {/* ── Paso 5: Ubicación ── */}
          {step === 5 && (
            <div>
              <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, marginBottom:6, letterSpacing:'-.02em' }}>¿De dónde sos?</div>
              <div style={{ fontSize:14, color:C.mist, marginBottom:24, lineHeight:1.5 }}>Te mostraremos comercios cerca tuyo</div>

              {/* País */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:C.dust, fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:7 }}>País</div>
                <select
                  className="ob-select"
                  value={form.country}
                  onChange={e => setCountry(e.target.value)}
                  style={{ width:'100%', padding:'13px 44px 13px 16px', background:'rgba(255,255,255,0.06)', border:`1px solid ${form.country ? C.rim : 'rgba(255,255,255,0.12)'}`, borderRadius:14, color: form.country ? C.white : C.dust, fontSize:15, fontFamily:FI, boxSizing:'border-box', cursor:'pointer' }}>
                  <option value="" style={{ background:'#0D0818', color:C.mist }}>Seleccioná un país</option>
                  <option value="argentina" style={{ background:'#0D0818', color:C.white }}>Argentina</option>
                </select>
              </div>

              {/* Provincia */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color: form.country ? C.dust : 'rgba(255,255,255,0.20)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:7, transition:'color 180ms ease' }}>Provincia</div>
                <select
                  className="ob-select"
                  value={form.province}
                  onChange={e => setProvince(e.target.value)}
                  disabled={!form.country}
                  style={{ width:'100%', padding:'13px 44px 13px 16px', background:'rgba(255,255,255,0.06)', border:`1px solid ${form.province ? C.rim : 'rgba(255,255,255,0.12)'}`, borderRadius:14, color: form.province ? C.white : C.dust, fontSize:15, fontFamily:FI, boxSizing:'border-box', cursor: form.country ? 'pointer' : 'default' }}>
                  <option value="" style={{ background:'#0D0818', color:C.mist }}>Seleccioná una provincia</option>
                  {locProvinces.map(([key, prov]) => (
                    <option key={key} value={key} style={{ background:'#0D0818', color:C.white }}>{prov.name}</option>
                  ))}
                </select>
              </div>

              {/* Localidad */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, color: form.province ? C.dust : 'rgba(255,255,255,0.20)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:7, transition:'color 180ms ease' }}>Localidad</div>
                <select
                  className="ob-select"
                  value={form.city}
                  onChange={e => setCity(e.target.value)}
                  disabled={!form.province}
                  style={{ width:'100%', padding:'13px 44px 13px 16px', background:'rgba(255,255,255,0.06)', border:`1px solid ${form.city ? C.rim : 'rgba(255,255,255,0.12)'}`, borderRadius:14, color: form.city ? C.white : C.dust, fontSize:15, fontFamily:FI, boxSizing:'border-box', cursor: form.province ? 'pointer' : 'default' }}>
                  <option value="" style={{ background:'#0D0818', color:C.mist }}>Seleccioná una localidad</option>
                  {locCities.map(name => (
                    <option key={name} value={name} style={{ background:'#0D0818', color:C.white }}>{name}</option>
                  ))}
                </select>
              </div>

              {form.province && locCities.length > 0 && (
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)', textAlign:'center', marginBottom:16, lineHeight:1.5 }}>
                  ¿No encontrás tu localidad? Elegí la más cercana.
                </div>
              )}

              {saveError && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 14px', background:'rgba(248,116,68,0.12)', border:'1px solid rgba(248,116,68,0.35)', borderRadius:12, marginBottom:14, fontSize:13, color:'#f87444', lineHeight:1.4 }}>
                  <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink:0 }} />
                  {saveError}
                </div>
              )}
              <button onClick={save} disabled={saving || !canFinishLoc}
                style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor: (saving || !canFinishLoc) ? 'not-allowed' : 'pointer', opacity: (saving || !canFinishLoc) ? 0.45 : 1, boxShadow: canFinishLoc && !saving ? '0 8px 32px rgba(254,80,0,0.35)' : 'none', transition:'opacity 220ms ease, box-shadow 220ms ease' }}>
                {saving ? 'Guardando...' : 'Finalizar'}
              </button>
            </div>
          )}

          {/* ── Paso 6: ¿Tenés un negocio? ── */}
          {step === 6 && (
            <div style={{ textAlign:'center' }}>
              <div style={{ width:88, height:88, borderRadius:'50%', background:'rgba(189,75,248,0.14)', border:`2px solid rgba(189,75,248,0.40)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 22px', boxShadow:'0 8px 28px rgba(189,75,248,0.28)' }}>
                <Check size={44} color={C.v} strokeWidth={2} />
              </div>
              <div style={{ fontFamily:FN, fontSize:24, fontWeight:900, color:C.white, marginBottom:8, letterSpacing:'-.02em' }}>¡Cuenta lista!</div>
              <div style={{ fontSize:14, color:C.mist, lineHeight:1.55, marginBottom:24 }}>
                Una pregunta más para terminar de configurarte:
              </div>

              <div style={{ fontFamily:FN, fontSize:18, fontWeight:700, color:C.white, marginBottom:16 }}>
                ¿Tenés un negocio?
              </div>

              <div style={{ fontSize:12, color:C.dust, lineHeight:1.55, marginBottom:20, padding:'10px 14px', background:'rgba(189,75,248,0.08)', border:'1px solid rgba(189,75,248,0.20)', borderRadius:12 }}>
                Si registrás un negocio, también vas a poder usar Benefix como cliente
                de otros comercios y acumular beneficios. Es la misma cuenta.
              </div>

              <button
                onClick={() => onComplete({ goTo: 'register-commerce' })}
                style={{ width:'100%', padding:'15px', borderRadius:14, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 28px rgba(254,80,0,0.32)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:10 }}>
                <Store size={16} strokeWidth={2.2} />
                Sí, registrar mi negocio
              </button>

              <button
                onClick={() => onComplete()}
                style={{ width:'100%', padding:'14px', borderRadius:14, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, color:C.pearl, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                No, soy solo cliente
              </button>

              <div style={{ fontSize:11, color:C.dust, marginTop:14, lineHeight:1.5 }}>
                Podés cambiar esto más adelante desde tu cuenta.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
function Logo({ big = false }) {
  const sz = big ? 44 : 34
  const fs = big ? 22 : 15
  const dotSz = big ? 5 : 4
  const dotTop = big ? -7 : -5
  return (
    <div style={{ display:'flex', alignItems:'center', gap: big ? 12 : 10 }}>
      <div style={{ width:sz, height:sz, borderRadius:Math.round(sz*.28), background:G, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px #FE500044', flexShrink:0 }}>
        <svg width={sz*.72} height={sz*.72} viewBox="0 0 28 28" fill="none">
          <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
          <rect x="16" y="5.5" width="8" height="5" rx="2.5" fill="white" opacity=".9"/>
          <rect x="16" y="12" width="9" height="5.5" rx="2.75" fill="white"/>
        </svg>
      </div>
      <div style={{ fontFamily:FN, fontSize:fs, fontWeight:900, color:C.white, lineHeight:1, letterSpacing:'-.02em' }}>
        Benefix
      </div>
    </div>
  )
}

function GBtn({ children, onClick, sm, outline, style:s={}, disabled }) {
  const [hov, setHov] = useState(false)
  const [active, setActive] = useState(false)
  const scale = active ? 'scale(0.97)' : hov ? 'translateY(-1px)' : 'none'
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{ setHov(false); setActive(false) }}
      onMouseDown={()=>setActive(true)} onMouseUp={()=>setActive(false)}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, borderRadius:10, fontFamily:FN, fontWeight:700, fontSize:sm?12:14, padding:sm?'7px 16px':'12px 28px', transition:'transform 160ms cubic-bezier(0.23,1,0.32,1), background 200ms cubic-bezier(0.23,1,0.32,1), box-shadow 200ms cubic-bezier(0.23,1,0.32,1), opacity 160ms ease', border:'none', opacity:disabled?.6:1, cursor:disabled?'not-allowed':'pointer',
        ...(outline ? { background:'transparent', color:C.v, border:`1.5px solid ${C.v}`, transform:scale }
          : { background:hov?'linear-gradient(135deg,#FF7733,#D47DFF)':G, color:'#fff', boxShadow:hov?'0 8px 26px #FE500066':'0 4px 18px #FE500044', transform:scale }), ...s }}>
      {children}
    </button>
  )
}

function Pill({ children, color=C.v }) {
  return <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:99, background:`${color}18`, color, border:`1px solid ${color}35`, fontSize:10, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', fontFamily:FN }}>{children}</span>
}

function PCard({ children, style:s={}, gradBorder, ...rest }) {
  if (gradBorder) return (
    <div style={{ background:G, padding:'1.5px', borderRadius:18, ...s }} {...rest}>
      <div style={{ background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:17, overflow:'hidden' }}>{children}</div>
    </div>
  )
  return <div style={{ background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:16, overflow:'hidden', ...s }} {...rest}>{children}</div>
}

function InfoBanner({ type = 'info', icon: CustomIcon, children, action, subtle = false }) {
  if (subtle) {
    const Icon = CustomIcon || AlertCircle
    return (
      <div role="status" style={{ background:'linear-gradient(135deg,rgba(139,92,246,0.18),rgba(124,58,237,0.28))', border:'1px solid rgba(139,92,246,0.45)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', borderRadius:16, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 8px 24px -6px rgba(139,92,246,0.35)' }}>
        <Icon size={22} color='#A78BFA' strokeWidth={1.8} style={{ flexShrink:0 }} />
        <div style={{ fontSize:14, lineHeight:1.5 }}>{children}</div>
      </div>
    )
  }
  const cfgMap = {
    info:    { bg:'rgba(189,75,248,0.08)',  bd:`1px solid rgba(189,75,248,0.25)`, iconBg:'rgba(189,75,248,0.18)', iconCol:C.v,   tc:C.pearl },
    warning: { bg:`${C.o}0d`,              bd:`1px solid ${C.o}44`,              iconBg:`${C.o}20`,             iconCol:C.o,   tc:C.pearl },
    limit:   { bg:'linear-gradient(135deg,rgba(139,92,246,0.10),rgba(236,72,153,0.10))', bd:'1px solid rgba(139,92,246,0.30)', iconBg:'linear-gradient(135deg,#8B5CF6,#EC4899)', iconCol:'#fff', tc:C.pearl },
    success: { bg:`${C.ok}0d`,             bd:`1px solid ${C.ok}44`,             iconBg:`${C.ok}20`,            iconCol:C.ok,  tc:C.pearl },
  }
  const cfg = cfgMap[type] || cfgMap.info
  const DefaultIcon = type === 'limit' ? Lock : type === 'warning' ? AlertTriangle : type === 'success' ? CheckCircle : AlertCircle
  const Icon = CustomIcon || DefaultIcon
  return (
    <div style={{ background:cfg.bg, border:cfg.bd, borderRadius:16, padding:'16px', display:'flex', alignItems:'flex-start', gap:14 }}>
      <div style={{ width:42, height:42, borderRadius:12, background:cfg.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={20} color={cfg.iconCol} strokeWidth={1.8} />
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, color:cfg.tc, lineHeight:1.65 }}>{children}</div>
        {action && <div style={{ marginTop:10 }}>{action}</div>}
      </div>
    </div>
  )
}

function StatusLED({ active }) {
  return (
    <div
      role="status"
      aria-label={active ? 'Promoción activa' : 'Promoción desactivada'}
      style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'rgba(0,0,0,0.30)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, flexShrink:0 }}>
      <div aria-hidden="true" className={active ? 'led-on' : 'led-off'} />
      <span style={{ fontFamily:FN, fontWeight:700, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color: active ? '#22C55E' : 'rgba(255,255,255,0.45)', lineHeight:1 }}>
        {active ? 'Activa' : 'Desactivada'}
      </span>
    </div>
  )
}

function Inp({ value, onChange, placeholder, style:s={} }) {
  return <input value={value} onChange={onChange} placeholder={placeholder}
    style={{ background:'rgba(0,0,0,0.30)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 13px', fontSize:13, color:C.pearl, width:'100%', transition:'border-color .2s', ...s }} />
}

function InfoTooltip({ text }) {
  const [open, setOpen]   = useState(false)
  const [pos, setPos]     = useState({ top:0, left:0 })
  const iconRef  = useRef(null)
  const timerRef = useRef(null)

  function openTip() {
    clearTimeout(timerRef.current)
    if (iconRef.current) {
      const r = iconRef.current.getBoundingClientRect()
      setPos({ top: r.top - 8, left: r.left + r.width / 2 })
    }
    setOpen(true)
  }
  function closeTip() {
    timerRef.current = setTimeout(() => setOpen(false), 80)
  }

  useEffect(() => {
    if (!open) return
    const close = e => { if (!iconRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <>
      <span ref={iconRef}
        style={{ display:'inline-flex', alignItems:'center', verticalAlign:'middle', marginLeft:5 }}
        onMouseEnter={openTip}
        onMouseLeave={closeTip}
        onClick={e => { e.stopPropagation(); open ? setOpen(false) : openTip() }}
      >
        <span style={{ width:16, height:16, borderRadius:'50%', background:`${C.info}1a`, border:`1.5px solid ${C.info}55`, color:C.info, fontSize:9, fontWeight:800, fontFamily:FN, display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', userSelect:'none', flexShrink:0 }}>i</span>
      </span>
      {open && typeof document !== 'undefined' && createPortal(
        <span
          onMouseEnter={() => { clearTimeout(timerRef.current); setOpen(true) }}
          onMouseLeave={closeTip}
          style={{ position:'fixed', top:pos.top, left:pos.left, transform:'translateX(-50%) translateY(-100%)', background:'rgba(14,7,24,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:12, padding:'10px 13px 16px', fontSize:11, color:'#F0EAFF', lineHeight:1.6, width:232, zIndex:9999, boxShadow:'0 8px 28px rgba(0,0,0,0.70)', fontFamily:FI, fontWeight:400, whiteSpace:'normal', display:'block' }}>
          {text}
          <span style={{ position:'absolute', bottom:5, left:'50%', transform:'translateX(-50%) rotate(45deg)', width:8, height:8, background:'rgba(14,7,24,0.92)', borderRight:'1px solid rgba(255,255,255,0.18)', borderBottom:'1px solid rgba(255,255,255,0.18)' }} />
        </span>,
        document.body
      )}
    </>
  )
}

// ─── FEATURE GATES ───────────────────────────────────────────────────────────
const PLAN_ORDER = ['free', 'starter', 'pro']

const PLAN_PERMISSIONS = {
  free:    { max_clients: 30,   max_rewards: 2,    promotions_enabled: false },
  starter: { max_clients: 60,   max_rewards: null, promotions_enabled: true  },
  pro:     { max_clients: null, max_rewards: null, promotions_enabled: true  },
}
function getPlanPermissions(plan) {
  return PLAN_PERMISSIONS[plan || 'free'] || PLAN_PERMISSIONS.free
}

const FEATURE_GATES = {
  promotions: {
    minPlan:     'starter',
    Icon:        Flame,
    title:       'Activá promociones',
    description: 'Hacé que tus clientes vuelvan más seguido con descuentos automáticos.',
    bullets:     ['Creá promociones en segundos', 'Incentivá nuevas visitas', 'Aumentá la frecuencia de compra'],
    ctaPlan:     'starter',
    ctaLabel:    'Actualizar a STARTER',
  },
  rewards: {
    minPlan:     'starter',
    Icon:        Gift,
    title:       'Desbloqueá más recompensas',
    description: 'Ofrecé más premios para incentivar a tus clientes y mejorar la fidelización.',
    bullets:     ['Creá múltiples recompensas sin límite', 'Mejorá la fidelización con variedad', 'Motivá más visitas con mejores premios'],
    ctaPlan:     'starter',
    ctaLabel:    'Actualizar a STARTER',
  },
  automatizaciones: {
    minPlan:     'pro',
    Icon:        Bot,
    title:       'Clientes que vuelven solos',
    description: 'Activá automatizaciones para reactivar clientes y aumentar tus ventas sin esfuerzo.',
    bullets:     ['Recordatorios automáticos', 'Clientes cerca de su premio', 'Mensajes listos para enviar'],
    ctaPlan:     'pro',
    ctaLabel:    'Actualizar a PRO',
  },
  clients: {
    minPlan:     'starter',
    Icon:        Users,
    title:       'Estás creciendo',
    description: 'Alcanzaste el límite de clientes de tu plan actual.',
    bullets:     ['Sumá más clientes sin límite', 'Seguí registrando visitas', 'No pierdas oportunidades de venta'],
    ctaPlan:     'starter',
    ctaLabel:    'Pasar a STARTER',
  },
}

function canUseFeature(plan, feature) {
  const gate = FEATURE_GATES[feature]
  if (!gate) return true
  return PLAN_ORDER.indexOf(plan || 'free') >= PLAN_ORDER.indexOf(gate.minPlan)
}

// ─── SLUG HELPER ──────────────────────────────────────────────────────────────
function makeSlug(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

// ─── QR GENERATOR WITH EXCAVATED LOGO ─────────────────────────────────────────
// Cuts a clean circular gap from the center of the QR and draws the app logo
// into that space so no QR modules overlap the logo.
async function makeQR(value, { width = 300, margin = 2, dark, light }, _logoColor /* unused */) {
  // QR limpio sin logo central. El logo previo (la "C" de Benefix) rompía
  // la detección de jsQR — ahora el QR es 100% legible para cualquier scanner.
  // Mantenemos errorCorrectionLevel 'H' por las dudas de manchas/dobleces
  // físicos cuando se imprima.
  const QRCode = (await import('qrcode')).default
  return await QRCode.toDataURL(value, {
    width, margin, errorCorrectionLevel: 'H', color: { dark, light },
  })
}

// ─── LOGO CROP UTILITIES ──────────────────────────────────────────────────────
function validateImageFile(file) {
  if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type))
    return 'Formato no válido. Usá JPG, PNG o WEBP.'
  if (file.size > 5 * 1024 * 1024)
    return 'La imagen es muy grande. Máximo 5MB.'
  return null
}

function checkImageDimensions(file) {
  // Validación deliberadamente laxa: solo exige que el lado MÁS LARGO sea
  // de al menos 400px. Antes era el lado más corto ≥ 400, lo que rechazaba
  // imágenes con proporción rara (ej: 1500×300 logos panorámicos) que el
  // LogoCropper justamente puede arreglar via makeSquareWithPadding.
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const longestSide = Math.max(img.naturalWidth, img.naturalHeight)
      resolve(longestSide >= 400 ? null : 'La imagen es muy chica. Necesitamos al menos 400 px en su lado más largo.')
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

function _createCropImage(url) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => res(img)
    img.onerror = rej
    img.src = url
  })
}

async function getCroppedBlob(imageSrc, pixelCrop, outputSize = 512) {
  const image  = await _createCropImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  // Limpiamos el canvas a transparente. Si el pixelCrop pisa zonas fuera de
  // la imagen original (caso "fit con padding" para logos de proporciones
  // extremas), esas zonas quedan transparentes en el output.
  ctx.clearRect(0, 0, outputSize, outputSize)
  // Clamp del source rect a las dimensiones reales de la imagen.
  const sx = Math.max(0, pixelCrop.x)
  const sy = Math.max(0, pixelCrop.y)
  const sw = Math.min(image.width  - sx, pixelCrop.x + pixelCrop.width  - sx)
  const sh = Math.min(image.height - sy, pixelCrop.y + pixelCrop.height - sy)
  if (sw > 0 && sh > 0) {
    const scale = outputSize / pixelCrop.width
    const dx = (sx - pixelCrop.x) * scale
    const dy = (sy - pixelCrop.y) * scale
    const dw = sw * scale
    const dh = sh * scale
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
  }
  const px = ctx.getImageData(0, 0, outputSize, outputSize).data
  let hasAlpha = false
  for (let i = 3; i < px.length; i += 4) { if (px[i] < 255) { hasAlpha = true; break } }
  const fmt = hasAlpha ? 'image/png' : 'image/jpeg'
  const blob = await new Promise(res => canvas.toBlob(res, fmt, hasAlpha ? 1 : 0.85))
  if (!hasAlpha && blob.size > 200 * 1024)
    return await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.75))
  return blob
}

// Pre-procesamiento de imágenes con proporción extrema: genera un dataURL
// cuadrado con la imagen centrada y el resto en transparente. Sirve para
// logos de texto largo (ej "ENIGMA") que sin esto quedan recortados al centro.
async function makeSquareWithPadding(imageSrc) {
  const img = await _createCropImage(imageSrc)
  const w = img.naturalWidth, h = img.naturalHeight
  const ratio = w / h
  // Si ya es ~cuadrada, no hacemos nada — devolvemos la original sin tocar.
  if (ratio >= 0.85 && ratio <= 1.15) return { src: imageSrc, padded: false }
  const size = Math.max(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, size, size)
  const dx = (size - w) / 2
  const dy = (size - h) / 2
  ctx.drawImage(img, dx, dy, w, h)
  return { src: canvas.toDataURL('image/png'), padded: true }
}

// ─── LOGO CROPPER MODAL ────────────────────────────────────────────────────────
function LogoCropper({ imageSrc, onSave, onCancel }) {
  const [crop,      setCrop]      = useState({ x:0, y:0 })
  const [zoom,      setZoom]      = useState(1)
  const [pixelCrop, setPixelCrop] = useState(null)
  const [saving,    setSaving]    = useState(false)
  // Si la imagen no es cuadrada la pre-procesamos para meterla en un cuadrado
  // con padding transparente. Eso evita el problema de "solo veo el centro"
  // cuando subís un logo de texto largo, banner, etc.
  const [processedSrc, setProcessedSrc] = useState(null)
  const [wasPadded,    setWasPadded]    = useState(false)

  useEffect(() => {
    let cancelled = false
    setProcessedSrc(null)
    makeSquareWithPadding(imageSrc).then(({ src, padded }) => {
      if (cancelled) return
      setProcessedSrc(src)
      setWasPadded(padded)
      setCrop({ x:0, y:0 })
      setZoom(1)
    }).catch(() => { if (!cancelled) setProcessedSrc(imageSrc) })
    return () => { cancelled = true }
  }, [imageSrc])

  const onCropComplete = useCallback((_, px) => setPixelCrop(px), [])

  async function handleSave() {
    if (!pixelCrop || !processedSrc) return
    setSaving(true)
    try { onSave(await getCroppedBlob(processedSrc, pixelCrop)) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.94)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:480, marginBottom:14 }}>
        <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:C.white, marginBottom:4 }}>Ajustá tu logo</div>
        <div style={{ fontSize:12, color:C.mist, lineHeight:1.5 }}>
          {wasPadded
            ? 'Tu logo no era cuadrado, lo encuadramos automáticamente con bordes transparentes. Igual podés mover y zoom.'
            : 'Arrastrá y hacé zoom para encuadrar. Todos los logos son cuadrados.'}
        </div>
      </div>
      <div style={{ width:'100%', maxWidth:480, aspectRatio:'1/1', position:'relative', borderRadius:16, overflow:'hidden', background:'#111', border:`1px solid ${C.rim}` }}>
        {processedSrc && (
          <Cropper
            image={processedSrc} crop={crop} zoom={zoom} aspect={1}
            cropShape="rect" showGrid={false} restrictPosition
            onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius:16 },
              cropAreaStyle: { border:'2px solid rgba(139,92,246,0.85)', borderRadius:10, boxShadow:'0 0 0 9999px rgba(0,0,0,0.55)' },
            }}
          />
        )}
        {!processedSrc && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:C.mist, fontSize:12 }}>
            Procesando imagen…
          </div>
        )}
      </div>
      <div style={{ width:'100%', maxWidth:480, marginTop:16, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:12, color:C.mist }}>−</span>
        <input type="range" min={1} max={3} step={0.01} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          style={{ flex:1, accentColor:'#8B5CF6', cursor:'pointer', height:4 }} />
        <span style={{ fontSize:12, color:C.mist }}>+</span>
      </div>
      <div style={{ width:'100%', maxWidth:480, display:'flex', gap:10, marginTop:18 }}>
        <button onClick={onCancel} disabled={saving}
          style={{ flex:1, padding:'13px', borderRadius:12, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.rim}`, color:C.pearl, fontSize:13, fontFamily:FN, fontWeight:600, cursor:'pointer' }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving || !pixelCrop}
          style={{ flex:2, padding:'13px', borderRadius:12, background:G, border:'none', color:'#fff', fontSize:13, fontFamily:FN, fontWeight:700, cursor:saving?'default':'pointer', opacity:saving||!pixelCrop?.7:1 }}>
          {saving ? 'Guardando…' : 'Guardar logo'}
        </button>
      </div>
    </div>
  )
}

// ─── COLOR PICKER MODAL ───────────────────────────────────────────────────────
function _luminance(hex) {
  const h = (hex||'#000').replace('#','')
  const r = parseInt(h.slice(0,2),16)/255, g = parseInt(h.slice(2,4),16)/255, b = parseInt(h.slice(4,6),16)/255
  const lin = c => c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4
  return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b)
}

function ColorPickerModal({ initialColor, onApply, onClose }) {
  const [draft, setDraft] = useState(initialColor || '#7D5C8A')
  const [hex,   setHex]   = useState(initialColor || '#7D5C8A')
  const modalRef  = useRef(null)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMobile(window.innerWidth < 600)
    const el = modalRef.current?.querySelector('button,input')
    if (el) el.focus()
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = [...modalRef.current.querySelectorAll('button,[tabindex]:not([tabindex="-1"]),input')]
        const first = focusable[0], last = focusable[focusable.length-1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function onPickerChange(val) { setDraft(val); setHex(val) }
  function onHexInput(val) {
    setHex(val)
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setDraft(val)
  }

  const pc = cardColors(draft)
  const lBg   = _luminance(draft)
  const lText = _luminance(pc.text)
  const ratio = (Math.max(lBg,lText)+0.05)/(Math.min(lBg,lText)+0.05)

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, zIndex:9998, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', display:'flex', alignItems: mobile ? 'flex-end' : 'center', justifyContent:'center', padding: mobile ? 0 : 16 }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Elegí el color de tu tarjeta"
        style={{ width:'100%', maxWidth:340, background:'#0E0B18', border:`1px solid rgba(255,255,255,0.12)`, boxShadow:'0 24px 64px rgba(0,0,0,0.7)', borderRadius: mobile ? '20px 20px 0 0' : 20, padding: mobile ? '24px 20px 32px' : '24px 20px 20px', display:'flex', flexDirection:'column', gap:14 }}
      >
        <div style={{ fontFamily:FN, fontSize:16, fontWeight:800, color:C.white }}>Elegí el color de tu tarjeta</div>

        <HexColorPicker color={draft} onChange={onPickerChange} style={{ width:'100%', height:180 }} />

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:6, background:draft, border:`1px solid rgba(255,255,255,0.18)`, flexShrink:0 }} />
          <input
            value={hex}
            onChange={e => onHexInput(e.target.value)}
            maxLength={7}
            spellCheck={false}
            style={{ flex:1, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, borderRadius:8, padding:'7px 10px', fontSize:13, fontFamily:'monospace', color:C.white, outline:'none', letterSpacing:'0.05em' }}
          />
        </div>

        <div style={{ borderRadius:10, overflow:'hidden', background: pc.bg, padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', border:`1px solid ${pc.detail}` }}>
          <div>
            <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color: pc.text, lineHeight:1 }}>+150</div>
            <div style={{ fontFamily:FN, fontSize:7, fontWeight:700, color: pc.textSub, letterSpacing:'0.11em', marginTop:2 }}>PUNTOS</div>
          </div>
          <div style={{ fontFamily:FN, fontSize:10, fontWeight:700, color: pc.text, opacity:0.75, letterSpacing:'0.06em' }}>VISTA PREVIA</div>
        </div>

        {ratio < 4.5 && (
          <div style={{ fontSize:11, color:'#F59E0B', display:'flex', alignItems:'center', gap:5, background:'rgba(245,158,11,0.10)', borderRadius:7, padding:'6px 10px' }}>
            <AlertTriangle size={12} strokeWidth={2} color="#F59E0B" />
            Este color puede dificultar la lectura del texto.
          </div>
        )}

        <div style={{ display:'flex', gap:10, marginTop:2 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'11px', borderRadius:12, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.rim}`, color:C.pearl, fontSize:13, fontFamily:FN, fontWeight:600, cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={() => { onApply(draft); onClose() }}
            style={{ flex:2, padding:'11px', borderRadius:12, background:G, border:'none', color:'#fff', fontSize:13, fontFamily:FN, fontWeight:700, cursor:'pointer' }}>
            Aplicar color
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── COMMERCE LOGO (placeholder with initials if no img_url) ──────────────────
function logoInitials(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}
function nameToHsl(name) {
  let h = 0; for (const c of (name||'')) { h = (h * 31 + c.charCodeAt(0)) >>> 0 }
  return { bg: `hsl(${h%360},40%,18%)`, text: `hsl(${h%360},60%,72%)` }
}
function CommerceLogo({ commerce, size = 54, radius = 6 }) {
  const url  = commerce?.img_url
  const name = commerce?.name || ''
  const { bg, text } = nameToHsl(name)
  const inits = logoInitials(name)
  const fs    = size * (inits.length === 1 ? 0.38 : 0.30)
  return (
    <div style={{
      width:size, height:size, borderRadius:radius, flexShrink:0, overflow:'hidden',
      background: url ? 'transparent' : bg,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      {url
        ? <img src={url} alt={name}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
        : <span style={{ fontFamily:FN, fontSize:fs, fontWeight:900, color:text, lineHeight:1, userSelect:'none' }}>{inits}</span>
      }
    </div>
  )
}

// ─── INSTAGRAM STORY TEMPLATE (off-screen, captured by html2canvas) ──────────
function InstagramStoryQR({ commerce, qrDataUrl }) {
  return (
    <div style={{
      width:1080, height:1920,
      background:'linear-gradient(180deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%)',
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center',
      fontFamily:'system-ui, -apple-system, sans-serif',
      position:'relative', boxSizing:'border-box',
    }}>

      {/* ── Header absoluto ── */}
      <div style={{ position:'absolute', top:100, display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:56, height:56, borderRadius:16, background:'rgba(255,255,255,0.20)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
            <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <rect x="16" y="5.5" width="8" height="5" rx="2.5" fill="white" opacity=".9"/>
            <rect x="16" y="12" width="9" height="5.5" rx="2.75" fill="white"/>
          </svg>
        </div>
        <div style={{ fontSize:40, fontWeight:700, color:'white', letterSpacing:'-.02em' }}>
          Benefix
        </div>
      </div>

      {/* ── Contenido central ── */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:56 }}>

        {/* Título */}
        <div style={{ fontSize:104, fontWeight:800, color:'white', lineHeight:1.0, letterSpacing:'-4px', textTransform:'uppercase', textAlign:'center' }}>
          ¡Sumate<br/>y ganá!
        </div>

        {/* QR blanco sólido + nombre */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:34 }}>
          <div style={{
            background:'white', borderRadius:36, padding:28,
            boxShadow:'0 32px 80px rgba(0,0,0,0.25)',
          }}>
            {qrDataUrl && <img src={qrDataUrl} style={{ width:320, height:320, display:'block' }} />}
          </div>
          <div style={{ color:'white', fontSize:52, fontWeight:700, textAlign:'center', letterSpacing:'-.02em', lineHeight:1.15 }}>
            {commerce.name}
          </div>
        </div>

        {/* Beneficios: texto blanco simple */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:22 }}>
          {['Sumá puntos en cada compra', 'Canjeá premios increíbles', 'Recibí promos exclusivas'].map((text, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'rgba(255,255,255,0.65)', flexShrink:0 }} />
              <span style={{ color:'rgba(255,255,255,0.92)', fontSize:30, fontWeight:400 }}>{text}</span>
            </div>
          ))}
        </div>

      </div>

      {/* ── Footer absoluto ── */}
      <div style={{ position:'absolute', bottom:100, textAlign:'center' }}>
        <span style={{ color:'rgba(255,255,255,0.55)', fontSize:24, fontWeight:400 }}>Escaneá con tu cámara</span>
      </div>

    </div>
  )
}

// ─── QR DEL NEGOCIO ───────────────────────────────────────────────────────────
function CommerceQRCard({ commerce }) {
  const [qrDataUrl,      setQrDataUrl]      = useState(null)
  const [printQrDataUrl, setPrintQrDataUrl] = useState(null)
  const [copied,         setCopied]         = useState(false)
  const [slug,           setSlug]           = useState(commerce?.slug || '')
  const [savingSlug,     setSavingSlug]     = useState(false)
  const [showDownload,   setShowDownload]   = useState(false)
  const [downloading,    setDownloading]    = useState(false)
  const storyRef = useRef(null)
  const printRef = useRef(null)
  const supabase = getSupabase()

  // ?from_qr=1 activa el "spotlight" sobre el slider en /club/[slug] cuando
  // el cliente entra escaneando este QR (oscurece el resto de la pantalla
  // y enfoca al botón "Deslizá para unirte").
  const joinUrl = typeof window !== 'undefined' && slug
    ? `${window.location.origin}/club/${slug}?from_qr=1`
    : ''

  useEffect(() => {
    if (commerce?.id && !commerce?.slug) {
      const generated = makeSlug(commerce.name) + '-' + commerce.id.slice(0, 4)
      setSavingSlug(true)
      supabase.from('commerces').update({ slug: generated }).eq('id', commerce.id)
        .then(() => { setSlug(generated); setSavingSlug(false) })
    }
  }, [commerce?.id])

  useEffect(() => {
    if (!joinUrl) return
    // QR negro sobre blanco puro: máxima detectabilidad para cualquier scanner.
    // Antes era blanco sobre transparente (estético pero peor para detectar).
    makeQR(joinUrl, { width: 300, margin: 2, dark: '#000000', light: '#FFFFFF' }).then(setQrDataUrl)
    makeQR(joinUrl, { width: 400, margin: 3, dark: '#000000', light: '#FFFFFF' }).then(setPrintQrDataUrl)
  }, [joinUrl])

  function copyLink() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function downloadDigital() {
    if (!storyRef.current) return
    setDownloading('digital')
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(storyRef.current, {
        scale: 2, useCORS: true, backgroundColor: null, logging: false,
        width: 1080, height: 1920,
      })
      const a = document.createElement('a')
      a.download = `${slug}-historia.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  async function downloadPrint() {
    if (!printRef.current) return
    setDownloading('print')
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(printRef.current, {
        scale: 3, useCORS: true, backgroundColor: '#FFFFFF', logging: false,
      })
      const a = document.createElement('a')
      a.download = `qr-${slug}-imprimir.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  if (savingSlug || !slug) return null

  return (
    <>
      <PCard style={{ padding:'20px', marginBottom:14, border:`1px solid ${C.v}33` }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
          <QrCode size={13} color='rgba(255,255,255,0.70)' strokeWidth={2} />
          <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>QR de tu negocio</div>
          <InfoTooltip text="Este QR lleva a la página de registro de tu club. Pegalo en la caja o mostralo en tu negocio para que los clientes se unan escaneándolo." />
        </div>
        <div style={{ fontSize:11, color:C.mist, marginBottom:16 }}>Compartilo para que tus clientes se unan al club.</div>

        {/* Gradient QR card */}
        <div style={{
          background:'linear-gradient(135deg, #6d28d9 0%, #a855f7 45%, #ec4899 100%)',
          borderRadius:20, padding:'20px 20px 16px', marginBottom:14,
          position:'relative', overflow:'hidden',
        }}>
          <div className="qr-shimmer" style={{
            position:'absolute', inset:0, pointerEvents:'none',
            background:'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
          }} />
          <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.60)', textTransform:'uppercase', letterSpacing:'0.10em', marginBottom:2 }}>Benefix</div>
              <div style={{ fontFamily:FN, fontSize:17, fontWeight:700, color:'#fff' }}>{commerce?.name}</div>
            </div>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Store size={18} color="white" strokeWidth={1.5} />
            </div>
          </div>
          <div style={{ position:'relative', display:'flex', justifyContent:'center', marginBottom:14 }}>
            <div style={{ background:'rgba(255,255,255,0.12)', borderRadius:16, padding:12, position:'relative', display:'inline-block' }}>
              {qrDataUrl
                ? <img src={qrDataUrl} alt="QR" style={{ width:160, height:160, display:'block' }} />
                : <div style={{ width:160, height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.50)', fontSize:11 }}>Generando...</div>
              }
            </div>
          </div>
          <div style={{ position:'relative', textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.55)' }}>Escaneá para unirte al club</div>
        </div>

        {/* URL pill */}
        <div style={{ background:C.bg3, borderRadius:10, padding:'8px 12px', marginBottom:12 }}>
          <span style={{ fontSize:11, color:C.mist, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block', fontFamily:FI }}>{joinUrl}</span>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={copyLink} style={{
            flex:1, padding:'10px 12px',
            background: copied ? `${C.ok}22` : C.bg3,
            border:`1px solid ${copied ? C.ok : C.rim}`,
            borderRadius:10, color: copied ? C.ok : C.mist,
            fontFamily:FN, fontSize:11, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>
            {copied ? <><CheckCircle size={12} strokeWidth={2.5} />Copiado!</> : <><Copy size={12} strokeWidth={2} />Copiar link</>}
          </button>
          <button onClick={() => setShowDownload(true)} disabled={!qrDataUrl} style={{
            flex:1, padding:'10px 12px',
            background:`linear-gradient(135deg, ${C.v}, #ec4899)`,
            border:'none', borderRadius:10, color:'#fff',
            fontFamily:FN, fontSize:11, fontWeight:700,
            cursor:qrDataUrl ? 'pointer' : 'not-allowed', opacity:qrDataUrl ? 1 : 0.5,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>
            <Download size={12} strokeWidth={2} />Descargar
          </button>
        </div>
      </PCard>

      {/* Download options modal */}
      {showDownload && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.80)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => !downloading && setShowDownload(false)}>
          <div className="modal-in" onClick={e => e.stopPropagation()} style={{
            background:'rgba(255,255,255,0.07)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
            border:`1px solid ${C.rim}`, borderRadius:24, padding:24, maxWidth:340, width:'100%',
            boxShadow:'0 24px 80px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontFamily:FN, fontSize:16, fontWeight:700, color:C.white }}>Descargar QR</div>
              <button onClick={() => setShowDownload(false)} style={{ background:'none', border:'none', cursor:'pointer', color:C.mist, padding:4, lineHeight:0 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button onClick={downloadDigital} disabled={!!downloading} style={{
                width:'100%', padding:16, background:C.bg3, border:`1px solid ${C.rim}`,
                borderRadius:16, cursor:downloading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', gap:14, textAlign:'left',
                opacity: downloading === 'digital' ? 0.6 : 1,
              }}>
                <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg, #6d28d9, #ec4899)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Smartphone size={22} color="white" strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontFamily:FN, fontSize:13, fontWeight:600, color:C.white, marginBottom:3 }}>
                    {downloading === 'digital' ? 'Generando...' : 'Para pantallas'}
                  </div>
                  <div style={{ fontSize:11, color:C.mist }}>WhatsApp, Instagram, redes sociales</div>
                </div>
              </button>
              <button onClick={downloadPrint} disabled={!!downloading} style={{
                width:'100%', padding:16, background:C.bg3, border:`1px solid ${C.rim}`,
                borderRadius:16, cursor:downloading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', gap:14, textAlign:'left',
                opacity: downloading === 'print' ? 0.6 : 1,
              }}>
                <div style={{ width:48, height:48, borderRadius:12, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Printer size={22} color="#1a1a2e" strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontFamily:FN, fontSize:13, fontWeight:600, color:C.white, marginBottom:3 }}>
                    {downloading === 'print' ? 'Generando...' : 'Para imprimir'}
                  </div>
                  <div style={{ fontSize:11, color:C.mist }}>QR negro, fondo blanco, ahorra tinta</div>
                </div>
              </button>
            </div>
            <div style={{ textAlign:'center', fontSize:10, color:C.dust, marginTop:14 }}>
              Ambas versiones incluyen el logo y datos de tu negocio
            </div>
          </div>
        </div>
      )}

      {/* Hidden Instagram story template (captured by html2canvas) */}
      <div ref={storyRef} style={{ position:'fixed', top:'-9999px', left:'-9999px', width:1080, height:1920 }}>
        <InstagramStoryQR commerce={commerce} qrDataUrl={printQrDataUrl} />
      </div>

      {/* Hidden printable template (captured by html2canvas) */}
      <div ref={printRef} style={{
        position:'fixed', top:'-9999px', left:'-9999px',
        width:400, padding:40, background:'#ffffff', textAlign:'center',
        fontFamily:'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#9333ea', textTransform:'uppercase', letterSpacing:'0.08em' }}>Benefix</span>
        </div>
        <div style={{ fontSize:26, fontWeight:700, color:'#111', marginBottom:24, lineHeight:1.2 }}>{commerce?.name}</div>
        <div style={{ display:'inline-block', padding:20, border:'2px solid #e5e7eb', borderRadius:16, marginBottom:20, position:'relative' }}>
          {printQrDataUrl && (
            <img src={printQrDataUrl} alt="QR" style={{ width:200, height:200, display:'block' }} />
          )}
        </div>
        <div style={{ fontSize:15, color:'#555', marginBottom:6 }}>Escaneá el código QR para unirte</div>
        <div style={{ fontSize:13, color:'#888', marginBottom:16 }}>y empezar a acumular beneficios</div>
        <div style={{ fontSize:11, color:'#bbb' }}>{joinUrl}</div>
      </div>
    </>
  )
}

// ─── UPGRADE MODAL ────────────────────────────────────────────────────────────
function UpgradeModal({ feature, onUpgrade, onViewPlans, onClose }) {
  const gate = FEATURE_GATES[feature]
  if (!gate) return null
  const planDef = PLANS[gate.ctaPlan]
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="modal-in"
        style={{ background:'rgba(255,255,255,0.08)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)', border:`1px solid ${C.v}44`, borderRadius:20, padding:28, maxWidth:380, width:'100%', position:'relative',
          boxShadow:`0 0 0 1px ${C.v}22, 0 24px 64px rgba(0,0,0,.6), 0 0 80px rgba(189,75,248,.15)` }}>
        {/* Glow top */}
        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:180, height:2, background:GV, borderRadius:2 }} />

        <button onClick={onClose}
          style={{ position:'absolute', top:14, right:16, background:'transparent', border:'none', color:C.mist, fontSize:18, cursor:'pointer', lineHeight:1 }}>✕</button>

        {/* Icon */}
        <div style={{ width:52, height:52, borderRadius:14, background:`${C.v}22`, border:`1px solid ${C.v}44`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
          {(() => { const I = gate.Icon; return I ? <I size={24} color='rgba(255,255,255,0.80)' strokeWidth={2} /> : null })()}
        </div>

        <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, marginBottom:8, lineHeight:1.2 }}>{gate.title}</div>
        <div style={{ fontSize:13, color:C.mist, lineHeight:1.6, marginBottom:16 }}>{gate.description}</div>

        <ul style={{ margin:'0 0 20px', padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:6 }}>
          {gate.bullets.map(b => (
            <li key={b} style={{ fontSize:12, color:C.pearl, display:'flex', alignItems:'flex-start', gap:8 }}>
              <span style={{ color:planDef.color, fontWeight:700, flexShrink:0 }}>✓</span> {b}
            </li>
          ))}
        </ul>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <span style={{ fontFamily:FN, fontSize:10, fontWeight:700, color:planDef.color, background:planDef.badge, padding:'2px 8px', borderRadius:6, letterSpacing:'.07em' }}>{planDef.label}</span>
          <span style={{ fontFamily:FN, fontSize:14, fontWeight:900, color:C.white }}>${planDef.price.toLocaleString('es-AR')} / mes</span>
          <span style={{ fontSize:10, color:C.dust }}>· menos de $850/día</span>
        </div>

        <button onClick={() => onUpgrade(gate.ctaPlan)}
          style={{ width:'100%', padding:'13px', background:GV, border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer', marginBottom:10, boxShadow:`0 4px 16px rgba(189,75,248,.4)`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <Zap size={14} strokeWidth={2} /> {gate.ctaLabel}
        </button>
        <button onClick={onViewPlans}
          style={{ width:'100%', padding:'10px', background:'transparent', border:`1px solid ${C.rim}`, borderRadius:12, color:C.mist, fontFamily:FN, fontSize:12, fontWeight:600, cursor:'pointer' }}>
          Ver todos los planes
        </button>
      </div>
    </div>
  )
}

// ─── BTN — shared button variants ────────────────────────────────────────────
// variant: 'primary' | 'secondary' | 'ghost' | 'outline'
// size:    'sm' | 'md' | 'lg'
function Btn({ variant = 'primary', size = 'md', onClick, children, style: xs, ...rest }) {
  const [hov, setHov] = useState(false)
  const pad  = { sm:'10px 20px', md:'14px 28px', lg:'16px 36px' }
  const fs   = { sm:12, md:14, lg:16 }
  const base = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
    padding:pad[size], borderRadius:9999,
    fontFamily:FN, fontSize:fs[size], fontWeight:700,
    cursor:'pointer', border:'none', outline:'none',
    transition:'transform 160ms cubic-bezier(0.23,1,0.32,1), box-shadow 160ms ease, color 160ms ease',
  }
  const V = {
    primary: {
      background: G, color:'#fff',
      boxShadow: hov ? '0 8px 32px rgba(254,80,0,0.35)' : '0 4px 16px rgba(254,80,0,0.18)',
      transform: hov ? 'scale(1.04)' : 'scale(1)',
    },
    secondary: {
      background:'rgba(255,255,255,0.08)', color:C.white,
      border:'1px solid rgba(255,255,255,0.14)',
      backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      transform: hov ? 'scale(1.02)' : 'scale(1)',
    },
    ghost: {
      background:'transparent', border:'none',
      color: hov ? C.white : 'rgba(255,255,255,0.55)',
      transform:'scale(1)',
    },
    outline: {
      background:'transparent',
      border:`1px solid ${hov ? 'rgba(168,85,247,0.65)' : 'rgba(168,85,247,0.40)'}`,
      color: hov ? '#d8b4fe' : '#c084fc',
      transform: hov ? 'scale(1.02)' : 'scale(1)',
    },
  }
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...base, ...(V[variant] || V.primary), ...xs }}
      {...rest}
    >
      {children}
    </button>
  )
}

// ─── PLAN CARDS ──────────────────────────────────────────────────────────────
// currentPlan: 'free'|'starter'|'pro'|null  (null = vista pública sin sesión)
// clientCount/planLimit: para barra de uso (solo en panel)
// onUpgrade(key): callback al hacer upgrade
// onCTA: callback para botón en home (registro)
function PlanCards({ currentPlan=null, clientCount=0, planLimit=null, onUpgrade, onCTA }) {
  const PLAN_LIST = [
    {
      key:'free',
      Icon: Package,
      tagline:'Probá la plataforma sin costo',
      sub:'Perfecto para empezar sin compromiso',
      features:[
        'Hasta 30 clientes activos',
        'Sistema de puntos o estrellas',
        'Hasta 2 premios activos',
        'Escáner QR desde el celular',
        'Historial de actividad básico',
      ],
      price:0,
      priceHint:null,
      cta:null,
    },
    {
      key:'starter',
      Icon: Zap,
      tagline:'El plan ideal para fidelizar clientes',
      sub:'Convertí visitas en clientes recurrentes',
      badge:'★ Más elegido',
      features:[
        'Hasta 60 clientes activos',
        'Premios ilimitados',
        'Promociones: descuentos y doble puntos',
        'Carga manual de clientes',
        'Soporte prioritario',
        'Todo lo del plan Free incluido',
      ],
      price:25000,
      priceHint:'Menos de $850 por día',
      cta:'Empezá con STARTER →',
    },
    {
      key:'pro',
      Icon: Rocket,
      tagline:'Escalá sin límites',
      sub:'Para negocios con alto volumen de clientes',
      features:[
        'Clientes ilimitados',
        'Automatizaciones con WhatsApp',
        'Recordatorios a clientes inactivos',
        'Alertas de premios próximos',
        'Estadísticas avanzadas (próximamente)',
        'Soporte dedicado 24/7',
      ],
      price:45000,
      priceHint:null,
      cta:'Activá PRO →',
    },
  ]

  function fmtPrice(p) {
    if (p === 0) return 'Gratis'
    return `$${p.toLocaleString('es-AR')} / mes`
  }

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function renderCard({ key, Icon, tagline, sub, badge, features, price, priceHint, cta }) {
    const def          = PLANS[key]
    const isCurrent    = currentPlan === key
    const isStarter    = key === 'starter'
    const planOrder    = ['free','starter','pro']
    const isUpgrade    = currentPlan && planOrder.indexOf(currentPlan) < planOrder.indexOf(key)
    const showUsageBar = isCurrent && planLimit !== null

    return (
      <div key={key} style={{
        background: isStarter ? 'linear-gradient(160deg,#1E0840 0%,#241255 100%)' : C.card,
        border: isStarter ? `2px solid ${C.v}` : isCurrent ? `2px solid ${def.color}` : `1px solid ${C.rim}`,
        borderRadius: 18,
        padding: isStarter ? '28px 24px' : '20px',
        position: 'relative',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        boxShadow: isStarter ? `0 0 0 1px ${C.v}33, 0 16px 56px rgba(189,75,248,.28), 0 4px 16px rgba(0,0,0,.4)` : 'none',
        transform: (isStarter && !isMobile) ? 'scale(1.03)' : 'none',
        overflow: 'visible',
        display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box',
        transition: 'box-shadow .2s',
      }}>

        {/* Badge "Más elegido" */}
        {badge && (
          <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:GV, borderRadius:20, padding:'4px 14px', fontSize:10, fontWeight:700, fontFamily:FN, color:'#fff', letterSpacing:'.08em', whiteSpace:'nowrap', boxShadow:'0 4px 12px rgba(189,75,248,.5)' }}>
            {badge}
          </div>
        )}
        {isCurrent && !badge && (
          <div style={{ position:'absolute', top:-11, right:14, background:def.color, color:'#000', fontFamily:FN, fontSize:9, fontWeight:700, padding:'3px 10px', borderRadius:20, letterSpacing:'.08em' }}>
            PLAN ACTUAL
          </div>
        )}
        {isCurrent && badge && (
          <div style={{ position:'absolute', top:12, right:14, background:`${def.color}33`, border:`1px solid ${def.color}66`, color:def.color, fontFamily:FN, fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20, letterSpacing:'.06em' }}>
            ACTUAL
          </div>
        )}

        {/* Ícono + nombre */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, marginTop: badge ? 8 : 0 }}>
          {(() => { const I = Icon; return I ? <I size={20} color={def.color} strokeWidth={2} /> : null })()}
          <span style={{ fontFamily:FN, fontSize:17, fontWeight:900, color:def.color, letterSpacing:'-.01em' }}>{def.label}</span>
        </div>

        {/* Descripción */}
        <div style={{ fontSize:12, color: isStarter ? C.pearl : C.white, fontFamily:FN, fontWeight:600, lineHeight:1.35, marginBottom:4 }}>{tagline}</div>
        <div style={{ fontSize:11, color:C.mist, marginBottom:16, lineHeight:1.5 }}>{sub}</div>

        {/* Precio */}
        <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color: isStarter ? '#fff' : C.white, lineHeight:1.1, marginBottom:4 }}>
          {fmtPrice(price)}
        </div>
        {/* Slot fijo para priceHint — mantiene alineación entre planes */}
        <div style={{ fontSize:10, color: isStarter ? `${C.v}cc` : C.dust, minHeight:18, marginBottom:16 }}>
          {priceHint ?? ''}
        </div>

        {/* Barra de uso — solo en panel, plan actual */}
        {showUsageBar && (
          <div style={{ marginBottom:14, background:C.bg3, borderRadius:10, padding:'10px 12px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:C.mist, marginBottom:6 }}>
              <span>Clientes usados</span>
              <span style={{ fontFamily:FN, fontWeight:700, color:C.white }}>{clientCount} / {planLimit}</span>
            </div>
            <div style={{ height:4, borderRadius:4, background:C.rim }}>
              <div style={{ height:'100%', width:`${Math.min(100,(clientCount/planLimit)*100)}%`, background: clientCount>=planLimit ? '#f87444' : clientCount>=planLimit*.8 ? C.o : def.color, borderRadius:4, transition:'width .4s' }} />
            </div>
          </div>
        )}

        {/* Features — flex:1 ancla el CTA al fondo */}
        <ul style={{ margin:'0 0 20px', padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:8, flex:1 }}>
          {features.map(f => (
            <li key={f} style={{ fontSize:11, color: isStarter ? C.pearl : C.mist, display:'flex', alignItems:'flex-start', gap:7, lineHeight:1.45 }}>
              <span style={{ color:def.color, fontWeight:700, flexShrink:0, marginTop:1 }}>✓</span>
              {f}
            </li>
          ))}
        </ul>

        {/* CTA — siempre al fondo */}
        {isCurrent ? (
          <div style={{ textAlign:'center', fontSize:11, color: isStarter ? `${def.color}cc` : C.dust, padding:'8px 0' }}>
            ✓ Plan activo
          </div>
        ) : onUpgrade && isUpgrade ? (
          <Btn
            variant={isStarter ? 'primary' : 'secondary'}
            style={{ width:'100%', padding:'11px', borderRadius:10, fontSize:12 }}
            onClick={() => onUpgrade(key)}>
            {isStarter ? <><Zap size={13} strokeWidth={2} />{cta}</> : cta}
          </Btn>
        ) : onUpgrade && !isUpgrade && currentPlan ? (
          <Btn
            variant="ghost"
            style={{ width:'100%', padding:'9px', borderRadius:10, fontSize:11 }}
            onClick={() => onUpgrade(key)}>
            Cambiar a {def.label}
          </Btn>
        ) : onCTA && cta ? (
          <Btn
            variant={isStarter ? 'primary' : 'secondary'}
            style={{ width:'100%', padding:'11px', borderRadius:10, fontSize:12 }}
            onClick={onCTA}>
            {isStarter ? <><Zap size={13} strokeWidth={2} />{cta}</> : cta}
          </Btn>
        ) : null}
      </div>
    )
  }

  return (
    <div style={isMobile
      ? { display:'flex', flexDirection:'column', gap:20, paddingTop:16 }
      : { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, alignItems:'stretch', paddingTop:16 }
    }>
      {PLAN_LIST.map(plan => renderCard(plan))}
    </div>
  )
}

function GradLine() {
  return <div style={{ height:2, background:G, borderRadius:99 }} />
}

function CoverImg({ src, height, children, style:s={} }) {
  const [hov, setHov] = useState(false)
  return (
    <div style={{ position:'relative', height, overflow:'hidden', ...s }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(.65) saturate(1.3)', transform:hov?'scale(1.04)':'scale(1)', transition:'transform .6s' }} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#FE500010,#BD4BF815)', mixBlendMode:'color', pointerEvents:'none' }} />
      <div style={{ position:'absolute', inset:0, background:`linear-gradient(to bottom,rgba(13,8,24,.05) 0%,rgba(13,8,24,.85) 80%,${C.bg} 100%)`, pointerEvents:'none' }} />
      {children}
    </div>
  )
}

function FloatCover({ src, size=92 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', flexShrink:0, boxShadow:`0 12px 34px rgba(0,0,0,.65), 0 0 0 2.5px ${C.card}, 0 0 0 4.5px ${C.v}55` }}>
      <img src={src || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=70'} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(.85) saturate(1.2)' }} />
    </div>
  )
}

function Spinner() {
  return <div style={{ width:32, height:32, border:`3px solid ${C.rim}`, borderTop:`3px solid ${C.v}`, borderRadius:'50%', animation:'spin 1s linear infinite', margin:'40px auto' }} />
}

// ─── BENEFIX LOADER ───────────────────────────────────────────────────────────
function BenefixLoader({ size = 80 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" width={size} height={size}>
        <style>{`@keyframes bf-snake{to{stroke-dashoffset:-120.6}}.bf-p{stroke-dasharray:55 66;stroke-dashoffset:0;animation:bf-snake 3s linear infinite}`}</style>
        <defs>
          <linearGradient id="bfg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="55%" stopColor="#c026d3" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <path className="bf-p"
          d="M 32 32 C 32 20, 12 20, 12 32 C 12 44, 32 44, 32 32 C 32 20, 52 20, 52 32 C 52 44, 32 44, 32 32 Z"
          stroke="url(#bfg)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
      </svg>
    </div>
  )
}

// ─── LOADING SCREEN (primera visita por sesión) ───────────────────────────────
function LoadingScreen({ onComplete }) {
  const [count,     setCount]     = useState(0)
  const [wordIndex, setWordIndex] = useState(0)
  const WORDS = ['Sumando', 'Canjeando', 'Fidelizando']

  useEffect(() => {
    const duration = 2500
    const t0 = performance.now()
    let raf
    const tick = now => {
      const p = Math.min((now - t0) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setCount(Math.floor(e * 100))
      if (p < 1) { raf = requestAnimationFrame(tick) }
      else { setTimeout(onComplete, 400) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onComplete])

  useEffect(() => {
    const iv = setInterval(() => setWordIndex(i => (i + 1) % WORDS.length), 800)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'#0a0a0f', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Blobs */}
      <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.30) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />

      {/* Logo */}
      <div style={{ padding:'24px', opacity:0.5 }}><Logo /></div>

      {/* Palabras rotativas */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ position:'relative', height:96, width:'100%', overflow:'hidden', textAlign:'center' }}>
          {WORDS.map((word, i) => (
            <span key={word} style={{
              position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily: FN, fontSize:'clamp(40px,8vw,72px)', fontWeight:900, letterSpacing:'-0.03em',
              background:'linear-gradient(135deg,#a855f7,#ec4899)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              opacity:    i === wordIndex ? 1 : 0,
              transform:  i === wordIndex ? 'translateY(0)' : 'translateY(28px)',
              transition: 'opacity 0.45s ease, transform 0.45s ease',
              pointerEvents:'none',
            }}>
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* Contador + barra */}
      <div style={{ padding:'20px 24px 32px' }}>
        <div style={{ textAlign:'right', marginBottom:12 }}>
          <span style={{
            fontFamily:FN, fontWeight:900, fontSize:'clamp(52px,10vw,80px)',
            fontVariantNumeric:'tabular-nums', letterSpacing:'-0.04em',
            background:'linear-gradient(135deg,#fff,rgba(255,255,255,0.45))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>
            {String(count).padStart(3, '0')}
          </span>
        </div>
        <div style={{ height:3, background:'rgba(255,255,255,0.10)', borderRadius:99, overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:99,
            background:'linear-gradient(to right,#a855f7,#ec4899)',
            boxShadow:'0 0 20px rgba(168,85,247,0.55)',
            width:`${count}%`,
            transition:'width 80ms linear',
          }} />
        </div>
      </div>
    </div>
  )
}

function FullscreenLoader({ message }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9990, background:'#000', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.30) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
      <BenefixLoader size={100} />
      {message && <p style={{ fontFamily:FI, fontSize:13, color:'rgba(255,255,255,0.50)', marginTop:24, margin:'24px 0 0' }}>{message}</p>}
    </div>
  )
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({ setView, cityName, user, profile, onLogin, onLogout, currentView, clientTab, onOwnerProfile }) {
  const role = profile?.role || 'client'

  // ── Shared style helpers ──────────────────────────────────────────────────
  // Botones dentro del contenedor glass: transparentes por defecto,
  // gradient G como "indicador" en el botón activo (mismo patrón que ClientBottomNav).
  const BTN = { position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'center', width:34, height:34, borderRadius:9, flexShrink:0, transition:'background 220ms ease, box-shadow 220ms ease' }
  const NEUTRAL = { background:'transparent', border:'none' }
  // Activo = degradé de marca
  const GRAD_ACTIVE = { background:G, border:'none', boxShadow:'0 2px 10px rgba(168,85,247,0.42)' }
  // Aliases legacy (mantenidos para compatibilidad de los call sites; ahora todos
  // los activos usan el mismo gradient)
  const QR_HINT = NEUTRAL
  const BUILDING_ACTIVE = GRAD_ACTIVE

  function bs(targetView /* , variant */) {
    return currentView === targetView ? GRAD_ACTIVE : NEUTRAL
  }
  function ic(targetView) {
    return currentView === targetView ? '#fff' : 'rgba(255,255,255,0.70)'
  }
  // Botón "Mi cuenta" se prende SOLO cuando el cliente está en el tab cuenta —
  // el resto de los tabs del nav inferior (mis clubs, historial, mi qr) tienen
  // su propio highlight ahí abajo. Coordinación entre nav superior y nav inferior.
  const accountActive = currentView === 'client' && clientTab === 'cuenta'
  const bsAccount     = accountActive ? GRAD_ACTIVE : NEUTRAL
  const icAccount     = accountActive ? '#fff' : 'rgba(255,255,255,0.70)'

  const NAV = { position:'fixed', top:10, left:10, right:10, zIndex:200, borderRadius:14, height:52, display:'flex', alignItems:'center', justifyContent:'space-between' }

  // ── No logged-in user ─────────────────────────────────────────────────────
  if (!user) return (
    <nav className="navbar-glass" style={{ ...NAV, padding:'0 20px' }}>
      <div style={{ cursor:'pointer' }} onClick={() => setView('home')}><Logo /></div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        {cityName && <span style={{ fontSize:11, color:C.mist, padding:'4px 10px', borderRadius:99, background:C.bg3, border:`1px solid ${C.rim}`, display:'inline-flex', alignItems:'center', gap:4 }}><MapPin size={10} color={C.mist} strokeWidth={2} />{cityName}</span>}
        <button onClick={() => setView('register-commerce')} style={{ background:'transparent', border:`1px solid ${C.rim}`, color:C.mist, fontSize:11, padding:'6px 11px', borderRadius:8, cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5 }}>
          <Building2 size={11} strokeWidth={2} /> Tu negocio
        </button>
        <GBtn sm onClick={onLogin}><span style={{ fontWeight:900 }}>G</span> Entrar</GBtn>
      </div>
    </nav>
  )

  // ── Logged-in user ────────────────────────────────────────────────────────
  return (
    <nav className="navbar-glass" style={{ ...NAV, padding:'0 16px' }}>
      <div style={{ cursor:'pointer' }} onClick={() => setView('home')}><Logo /></div>
      <div className="liquid-glass-strong" style={{ position:'relative', display:'flex', gap:3, alignItems:'center', borderRadius:12, padding:4, overflow:'hidden' }}>

        {role === 'admin' && (<>
          <button title="Panel admin" onClick={() => setView('admin')}
            style={{ ...BTN, ...bs('admin'), cursor: currentView==='admin' ? 'default' : 'pointer' }}>
            <LayoutDashboard size={16} color={ic('admin')} />
          </button>
          <button title="Mi cuenta" onClick={() => window.dispatchEvent(new CustomEvent('benefix:navigate', { detail: { view: 'client', tab: 'cuenta' } }))}
            style={{ ...BTN, ...bsAccount, cursor: 'pointer' }}>
            <User size={16} color={icAccount} />
          </button>
          <button title="Salir" onClick={onLogout} style={{ ...BTN, ...NEUTRAL, cursor:'pointer' }}>
            <DoorOpen size={16} color="rgba(255,255,255,0.70)" />
          </button>
        </>)}

        {role === 'commerce_owner' && (<>
          <button title="Escanear QR" onClick={currentView==='scanner' ? undefined : () => setView('scanner')}
            style={{ ...BTN, ...bs('scanner','qr'), cursor: currentView==='scanner' ? 'default' : 'pointer' }}>
            <ScanLine size={16} color={ic('scanner')} strokeWidth={2} />
          </button>
          <button title="Vista pública de mi club" onClick={currentView==='commerce' ? undefined : onOwnerProfile}
            style={{ ...BTN, ...bs('commerce','building'), cursor: currentView==='commerce' ? 'default' : 'pointer' }}>
            <Eye size={16} color={currentView==='commerce' ? '#fff' : 'rgba(255,255,255,0.70)'} strokeWidth={2} />
          </button>
          {/* "Mi Negocio" — solo se enciende con gradient cuando es la vista activa,
              igual que el resto de los botones del navbar. Consistencia visual.
              Cada click (esté o no en commerce-settings) re-dispara el intent
              picker: el dueño re-tappea el icono cuando arranca un nuevo flow
              en el local (un nuevo cliente entró, una nueva compra recién
              arrancó), así que el picker tiene que aparecer cada vez. */}
          <button title="Mi Negocio"
            onClick={() => {
              if (currentView !== 'commerce-settings') setView('commerce-settings')
              window.dispatchEvent(new CustomEvent('benefix:merchant-intent'))
            }}
            style={{ ...BTN, ...bs('commerce-settings'), cursor: 'pointer' }}>
            <Store size={16} color={ic('commerce-settings')} strokeWidth={2} />
          </button>
          <button title="Mi cuenta" onClick={() => window.dispatchEvent(new CustomEvent('benefix:navigate', { detail: { view: 'client', tab: 'cuenta' } }))}
            style={{ ...BTN, ...bsAccount, cursor: 'pointer' }}>
            <User size={16} color={icAccount} strokeWidth={2} />
          </button>
          <button title="Cerrar sesión" onClick={onLogout} style={{ ...BTN, ...NEUTRAL, cursor:'pointer' }}>
            <LogOut size={16} color="rgba(255,255,255,0.70)" strokeWidth={2} />
          </button>
        </>)}

        {role !== 'admin' && role !== 'commerce_owner' && (<>
          <button title="Escanear QR" onClick={currentView==='scanner' ? undefined : () => setView('scanner')}
            style={{ ...BTN, ...bs('scanner','qr'), cursor: currentView==='scanner' ? 'default' : 'pointer' }}>
            <ScanLine size={16} color={ic('scanner')} strokeWidth={2} />
          </button>
          <button title="Mi cuenta" onClick={() => window.dispatchEvent(new CustomEvent('benefix:navigate', { detail: { view: 'client', tab: 'cuenta' } }))}
            style={{ ...BTN, ...bsAccount, cursor: 'pointer' }}>
            <User size={16} color={icAccount} strokeWidth={2} />
          </button>
          <button title="Cerrar sesión" onClick={onLogout} style={{ ...BTN, ...NEUTRAL, cursor:'pointer' }}>
            <LogOut size={16} color="rgba(255,255,255,0.70)" strokeWidth={2} />
          </button>
        </>)}

      </div>
    </nav>
  )
}

// ─── REVIEWS SECTION ──────────────────────────────────────────────────────────
const REVIEWS = [
  // Page 1
  { id:1,  name:'Martín Rodríguez',  role:'dueño',   business:'Café Aroma',            text:'Mis clientes vuelven más seguido desde que uso el sistema de puntos. En 2 meses aumenté un 30% las visitas recurrentes.' },
  { id:2,  name:'Lucía Fernández',   role:'cliente',                                   text:'Me encanta juntar puntos y canjearlos por cafés gratis. Ya soy cliente VIP en 3 lugares.' },
  { id:3,  name:'Carlos Méndez',     role:'dueño',   business:'Barbería Premium',       text:'El sistema de estrellas es perfecto para mi barbería. Mis clientes se motivan a completar las 10 visitas.' },
  { id:4,  name:'Valentina Torres',  role:'cliente',                                   text:'Un solo QR para todos mis lugares favoritos. No tengo que llevar más tarjetas de papel.' },
  // Page 2
  { id:5,  name:'Diego Ramírez',     role:'dueño',   business:'Heladería Dolce',        text:'Las automatizaciones PRO son un golazo. Me avisa cuando un cliente no viene hace días y le mando un mensaje.' },
  { id:6,  name:'Camila Sánchez',    role:'cliente',                                   text:'Canjeé mi primer premio ayer: medialunas gratis. La app es muy fácil de usar.' },
  { id:7,  name:'Roberto Paz',       role:'dueño',   business:'Pizzería Don Roberto',   text:'Empecé con el plan gratuito y en un mes ya tenía 25 clientes fidelizados. Ahora estoy en PRO.' },
  { id:8,  name:'María José López',  role:'cliente',                                   text:'Lo mejor es que puedo ver cuántos puntos me faltan para cada premio. Me motiva a volver.' },
  // Page 3
  { id:9,  name:'Fernando García',   role:'dueño',   business:'Gym Power',              text:'Mis socios acumulan estrellas por cada clase. Al llegar a 20, les regalo una clase gratis. Funciona increíble.' },
  { id:10, name:'Ana Martínez',      role:'cliente',                                   text:'Ya recomendé la app a todos mis amigos. Es genial tener todos los beneficios en un solo lugar.' },
  { id:11, name:'Sofía Álvarez',     role:'dueño',   business:'Boutique Luna',          text:'Mis clientas guardan los puntos para temporadas de descuentos. El engagement subió muchísimo.' },
  { id:12, name:'Sebastián Ruiz',    role:'cliente',                                   text:'Es increíble llegar a una nueva cafetería y poder unirte al instante escaneando el QR.' },
  // Page 4
  { id:13, name:'Pablo Herrera',     role:'dueño',   business:'Farmacia Central',       text:'Implementarlo fue cuestión de minutos. Mis clientes frecuentes ahora acumulan puntos en cada compra.' },
  { id:14, name:'Florencia Ibáñez',  role:'cliente',                                   text:'Nunca pensé que juntar puntos fuera tan fácil. Ya canjié tres premios este mes.' },
  { id:15, name:'Laura Giménez',     role:'dueño',   business:'Panadería La Tradición', text:'El plan gratuito me alcanzó para arrancar. Mis 40 clientes más fieles ya están registrados.' },
  { id:16, name:'Tomás Fernández',   role:'cliente',                                   text:'La interfaz es limpia y rápida. Reviso mis puntos en segundos cada vez que salgo.' },
  // Page 5
  { id:17, name:'Nicolás Costa',     role:'dueño',   business:'Restaurante El Puerto',  text:'Nuestros comensales habituales compiten por llegar primero al premio. Generó mucho boca a boca.' },
  { id:18, name:'Agustina Pérez',    role:'cliente',                                   text:'Tengo puntos en la peluquería, el gym y mi café favorito. Todo en un solo lugar, genial.' },
  { id:19, name:'Daniela Moreno',    role:'dueño',   business:'Spa Serena',             text:'El reporte de visitas me ayuda a saber qué días son los más flojos y lanzar promociones justo ahí.' },
  { id:20, name:'Ignacio Castro',    role:'cliente',                                   text:'La primera vez que canjié una recompensa pensé que era demasiado fácil. Pero funciona perfecto.' },
]

function ReviewCard({ review }) {
  const isOwner = review.role === 'dueño'
  const initials = review.name.split(' ').map(n=>n[0]).join('')
  return (
    <div className="liquid-glass" style={{
      flexShrink: 0, width: 300, marginRight: 14,
      borderRadius: 20, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Stars */}
      <div style={{ display:'flex', gap:2 }}>
        {[1,2,3,4,5].map(s => <Star key={s} size={12} strokeWidth={0} fill='#facc15' color='#facc15' />)}
      </div>
      {/* Text */}
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.80)', lineHeight:1.65, fontFamily:FI, flex:1 }}>
        &ldquo;{review.text}&rdquo;
      </p>
      {/* Author */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          {/* Avatar: photo if available, initials as fallback */}
          {review.avatarUrl ? (
            <img src={review.avatarUrl} alt={review.name}
              style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid rgba(255,255,255,0.12)' }} />
          ) : (
            <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#a855f7,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FN, fontSize:13, fontWeight:800, color:'#fff', flexShrink:0 }}>
              {initials}
            </div>
          )}
          <div style={{ minWidth:0 }}>
            {/* Name + verified badge */}
            <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
              <p style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{review.name}</p>
              {review.verified && (
                <CheckCircle size={13} color='#a855f7' strokeWidth={2.5} style={{ flexShrink:0 }} />
              )}
            </div>
            {/* Business name (owners) or location */}
            {isOwner && review.business && (
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.50)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{review.business}</p>
            )}
            {review.location && (
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:1 }}>{review.location}</p>
            )}
          </div>
        </div>
        <span style={{ flexShrink:0, fontSize:10, fontWeight:700, fontFamily:FN, padding:'3px 9px', borderRadius:99, background: isOwner ? 'rgba(168,85,247,0.18)' : 'rgba(236,72,153,0.18)', color: isOwner ? C.v : '#ec4899', border:`1px solid ${isOwner ? 'rgba(168,85,247,0.30)' : 'rgba(236,72,153,0.30)'}` }}>
          {isOwner ? 'Negocio' : 'Cliente'}
        </span>
      </div>
    </div>
  )
}

function ReviewsSection() {
  const row1 = REVIEWS.slice(0, 10)
  const row2 = REVIEWS.slice(10, 20)

  return (
    <section className="section-secondary" style={{ padding:'100px 0 92px', overflow:'hidden', position:'relative' }}>
      {/* Edge fades */}
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:120, background:'linear-gradient(to right, #0f0820, transparent)', zIndex:10, pointerEvents:'none' }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:120, background:'linear-gradient(to left, #0f0820, transparent)', zIndex:10, pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:52, padding:'0 20px', position:'relative', zIndex:20 }}>
        <div style={{ display:'inline-block', borderRadius:99, padding:'5px 16px', fontSize:11, fontFamily:FN, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase', color:'rgba(255,255,255,0.50)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', marginBottom:16 }}>
          +500 comercios confían en nosotros
        </div>
        <h2 style={{ fontFamily:FN, fontSize:'clamp(24px,3.5vw,42px)', fontWeight:900, color:C.white, lineHeight:1.1 }}>
          Lo que dicen de <span style={{ background:G, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Benefix</span>
        </h2>
      </div>

      {/* Row 1 — scrolls left */}
      <div style={{ overflow:'hidden', marginBottom:14 }}>
        <div className="animate-scroll-left" style={{ display:'flex', width:'fit-content' }}>
          {[...row1, ...row1].map((r, i) => <ReviewCard key={i} review={r} />)}
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div style={{ overflow:'hidden' }}>
        <div className="animate-scroll-right" style={{ display:'flex', width:'fit-content' }}>
          {[...row2, ...row2].map((r, i) => <ReviewCard key={i} review={r} />)}
        </div>
      </div>
    </section>
  )
}

// ─── BENEFICIO WORD — entrance blur + continuous fuchsia shimmer ──────────────
function BeneficioWord({ delay = 0 }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShow(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <span ref={ref} style={{
      display: 'inline-block',
      opacity:   show ? 1 : 0,
      filter:    show ? 'blur(0px)' : 'blur(10px)',
      transform: show ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.7s ease, filter 0.7s ease, transform 0.7s cubic-bezier(0.23,1,0.32,1)`,
      transitionDelay: `${delay}ms`,
      background: 'linear-gradient(90deg, #ec4899, #BD4BF8, #f472b6, #BD4BF8, #ec4899)',
      backgroundSize: '300% 100%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animation: 'beneficio-flow 3s ease-in-out infinite',
      textShadow: 'none',
    }}>
      beneficio.
    </span>
  )
}

// ─── BLUR TEXT ANIMATION ──────────────────────────────────────────────────────
// Pass `active` bool to control externally, or omit to use IntersectionObserver
function BlurText({ text, delay = 0, active }) {
  const words = text.split(' ')
  const [inView, setInView] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (active !== undefined) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const show = active !== undefined ? active : inView
  return (
    <span ref={ref}>
      {words.map((word, i) => (
        <span key={i} style={{
          display:'inline-block', marginRight:'0.25em',
          opacity:   show ? 1 : 0,
          filter:    show ? 'blur(0px)' : 'blur(10px)',
          transform: show ? 'translateY(0)' : 'translateY(20px)',
          transition:`opacity 0.7s ease, filter 0.7s ease, transform 0.7s cubic-bezier(0.23,1,0.32,1)`,
          transitionDelay:`${delay + i * 100}ms`,
        }}>{word}</span>
      ))}
    </span>
  )
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
function HeroSection({ setView, user, profile }) {
  const [loaded, setLoaded] = useState(false)
  const isOwner = profile?.role === 'commerce_owner'

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 60)
    return () => clearTimeout(t)
  }, [])

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
    <section className="animated-gradient-bg" style={{ position:'relative', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', overflow:'hidden', padding:'80px 24px 48px' }}>

      {/* Background blobs */}
      <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.40) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.35) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'absolute', top:'40%', right:'-5%', width:'35vw', height:'35vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.20) 0%, transparent 70%)', filter:'blur(60px)', pointerEvents:'none', zIndex:0 }} />

      {/* Content */}
      <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:780, width:'100%' }}>

        {/* Animated badge */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8, borderRadius:9999,
          padding:'4px 6px', marginBottom:40,
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(20px)',
          transition:'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s',
        }} className="liquid-glass">
          <span style={{ background:G, color:'#fff', fontSize:11, fontWeight:700, fontFamily:FN, padding:'4px 12px', borderRadius:9999, letterSpacing:'.04em' }}>
            Nuevo
          </span>
          <span style={{ fontSize:13, color:'rgba(255,255,255,0.65)', fontFamily:FI, paddingRight:10 }}>
            La forma más fácil de fidelizar
          </span>
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily:FN, fontWeight:900, fontSize:'clamp(38px,7vw,80px)', lineHeight:1.05, letterSpacing:'-.03em', margin:'0 0 28px', color:'#fff' }}>
          <span style={{ display:'block' }}>
            <BlurText text="Cada visita" delay={300} />
          </span>
          <span style={{ display:'block' }}>
            <BlurText text="te acerca a tu" delay={500} />
          </span>
          <span style={{ display:'block' }}>
            <BeneficioWord delay={700} />
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize:'clamp(15px,1.8vw,19px)', color:'rgba(255,255,255,0.58)', maxWidth:520, margin:'0 auto 44px', lineHeight:1.75, fontFamily:FI,
          opacity: loaded ? 1 : 0,
          filter:  loaded ? 'blur(0)' : 'blur(10px)',
          transform: loaded ? 'translateY(0)' : 'translateY(20px)',
          transition:'opacity 0.7s ease 1s, filter 0.7s ease 1s, transform 0.7s ease 1s',
        }}>
          Sistema de fidelización para comercios. Tus clientes suman puntos
          y canjean premios con un simple QR.
        </p>

        {/* CTAs */}
        <div style={{
          display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:14,
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(20px)',
          transition:'opacity 0.7s ease 1.2s, transform 0.7s ease 1.2s',
        }}>
          <Btn onClick={() => setView(user ? (isOwner ? 'commerce-settings' : 'client') : null) || (!user && profile === null && setView('client'))}>
            Soy cliente <ArrowRight size={16} strokeWidth={2.5} />
          </Btn>
          <Btn variant="ghost" onClick={() => setView(isOwner ? 'commerce-settings' : 'register-commerce')}>
            {isOwner ? 'Mi panel' : 'Soy comercio'} <ArrowRight size={16} strokeWidth={2.5} />
          </Btn>
        </div>

        {/* Trust badges — marquee infinito */}
        <div style={{
          marginTop:64,
          opacity: loaded ? 1 : 0,
          transition:'opacity 0.7s ease 1.5s',
        }}>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.46)', fontFamily:FI, marginBottom:20, letterSpacing:'.04em' }}>
            Más de 500 comercios confían en nosotros
          </p>
          <div
            aria-label="Rubros de comercios que usan Benefix"
            style={{
              overflow: 'hidden',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 60px, black calc(100% - 60px), transparent 100%)',
              maskImage: 'linear-gradient(to right, transparent 0%, black 60px, black calc(100% - 60px), transparent 100%)',
            }}
          >
            <div className="trust-marquee">
              {TRUST.map(({ Icon, label }) => (
                <div key={label} className="trust-marquee-item">
                  <Icon size={24} color="#BD4BF8" strokeWidth={1.5} />
                  <span>{label}</span>
                </div>
              ))}
              {/* Duplicado para loop seamless — oculto a lectores de pantalla */}
              {TRUST.map(({ Icon, label }) => (
                <div key={`d-${label}`} className="trust-marquee-item" aria-hidden="true">
                  <Icon size={24} color="#BD4BF8" strokeWidth={1.5} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Scroll indicator */}
      <div style={{
        position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', zIndex:1,
        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
        opacity: loaded ? 1 : 0,
        transition:'opacity 1s ease 2s',
      }}>
        <span style={{ fontFamily:FN, fontSize:10, color:'rgba(255,255,255,0.35)', letterSpacing:'0.15em', textTransform:'uppercase' }}>Scroll</span>
        <div style={{ width:1, height:48, background:'rgba(255,255,255,0.15)', position:'relative', overflow:'hidden', borderRadius:1 }}>
          <div className="scroll-light" style={{ position:'absolute', top:0, left:0, width:'100%', height:16, background:'linear-gradient(to bottom,#a855f7,#ec4899)', borderRadius:1 }} />
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:120, background:'linear-gradient(to bottom, transparent, #0a0a0f)', pointerEvents:'none', zIndex:2 }} />
    </section>
  )
}

// ─── COUNT-UP ──────────────────────────────────────────────────────────────────
function CountUp({ end, duration = 2000, suffix = '', prefix = '', decimals = 0 }) {
  const [count,     setCount]     = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setIsVisible(true); obs.disconnect() } },
      { threshold: 0.3 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return
    const factor = Math.pow(10, decimals)
    const target = Math.round(end * factor)
    let startTime
    function step(ts) {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [isVisible, end, duration, decimals])

  const factor = Math.pow(10, decimals)
  const display = decimals > 0
    ? (count / factor).toFixed(decimals)
    : count.toLocaleString('es-AR')

  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

// ─── STATS ─────────────────────────────────────────────────────────────────────
function StatsSection() {
  const stats = [
    { end: 500,   suffix: '+',  label: 'Comercios activos',  duration: 2000 },
    { end: 15000, suffix: '+',  label: 'Clientes felices',   duration: 2200 },
    { end: 50000, suffix: '+',  label: 'Puntos canjeados',   duration: 2400 },
    { end: 4.9,   suffix: ' ★', label: 'Rating promedio',   duration: 2000, decimals: 1 },
  ]
  return (
    <section className="section-secondary" style={{ padding:'100px 20px', position:'relative' }}>
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'70vw', maxWidth:900, height:'50vh', borderRadius:'50%', background:'radial-gradient(circle, rgba(147,51,234,0.18) 0%, transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }} />
      <div style={{ maxWidth:960, margin:'0 auto', position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:14 }}>
          <span className="liquid-glass" style={{ display:'inline-block', borderRadius:99, padding:'6px 20px', fontSize:11, color:'rgba(255,255,255,0.55)', fontFamily:FN, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase' }}>Números que hablan</span>
        </div>
        <h2 style={{ fontFamily:FN, fontSize:'clamp(22px,3.5vw,38px)', fontWeight:900, color:C.white, textAlign:'center', marginBottom:52, lineHeight:1.1 }}>
          <BlurText text="Resultados reales." delay={100} />
        </h2>
        <div className="liquid-glass" style={{ borderRadius:28, padding:'52px 36px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:40 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:FN, fontSize:'clamp(36px,4.5vw,54px)', fontWeight:900, marginBottom:10, background:'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.65) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', lineHeight:1 }}>
                  <CountUp end={s.end} suffix={s.suffix} duration={s.duration} decimals={s.decimals || 0} />
                </div>
                <div style={{ fontSize:13, color:C.mist, lineHeight:1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── HOW IT WORKS ──────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    { num:'01', Icon:QrCode, title:'Escaneá',  desc:'Mostrá tu QR en el local y unite al club en segundos.',        grad:'linear-gradient(135deg, #8B5CF6D9, #7C3AEDF2)' },
    { num:'02', Icon:Plus,   title:'Sumás',    desc:'Cada visita suma puntos automáticamente en tu cuenta.',         grad:'linear-gradient(135deg, #EC4899D9, #DB2777F2)' },
    { num:'03', Icon:Gift,   title:'Canjeás',  desc:'Usá tus puntos para canjear premios y beneficios exclusivos.',  grad:'linear-gradient(135deg, #F97316D9, #EA580CF2)' },
  ]

  const containerRef = useRef(null)
  const cardRefs     = useRef([])

  const [isMobile,      setIsMobile]      = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [activeCard,    setActiveCard]    = useState(0)
  const [showDots,      setShowDots]      = useState(false)
  const [transforms,    setTransforms]    = useState([
    { scale:1, opacity:1 }, { scale:1, opacity:1 }, { scale:1, opacity:1 },
  ])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const h = e => setReducedMotion(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (reducedMotion) { setShowDots(false); return }
    const topBase = isMobile ? 80  : 100
    const topStep = isMobile ? 25  : 30

    function handleScroll() {
      if (!containerRef.current) return
      const rect  = containerRef.current.getBoundingClientRect()
      const inView = rect.top < window.innerHeight - 60 && rect.bottom > 60
      setShowDots(inView)
      if (!inView) return

      let active = 0
      steps.forEach((_, i) => {
        const el = cardRefs.current[i]
        if (!el) return
        if (el.getBoundingClientRect().top <= topBase + i * topStep + 4) active = i
      })

      setActiveCard(active)
      setTransforms(steps.map((_, i) => ({
        scale:   i < active ? 0.97 : 1,
        opacity: i < active ? 0.85 : 1,
      })))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [reducedMotion, isMobile])

  const topBase = isMobile ? 80  : 100
  const topStep = isMobile ? 25  : 30
  const cardH   = isMobile ? 400 : 460
  const cardMT  = isMobile ? 160 : 200
  const iconSz  = isMobile ? 64  : 80
  const iconISz = isMobile ? 28  : 36

  const cardBase = (s, i, extra = {}) => ({
    borderRadius:        32,
    padding:             isMobile ? '32px 24px' : '48px',
    boxSizing:           'border-box',
    background:          s.grad,
    backdropFilter:      'blur(20px)',
    WebkitBackdropFilter:'blur(20px)',
    border:              '1px solid rgba(255,255,255,0.18)',
    boxShadow:           '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
    display:             'flex',
    flexDirection:       'column',
    alignItems:          'center',
    justifyContent:      'center',
    textAlign:           'center',
    gap:                 isMobile ? 20 : 28,
    position:            'relative',
    overflow:            'hidden',
    ...extra,
  })

  const CardInner = ({ s }) => (<>
    <div style={{ position:'absolute', top: isMobile ? 16 : 20, left: isMobile ? 20 : 28, fontFamily:FN, fontWeight:900, fontSize: isMobile ? 80 : 120, color:'rgba(255,255,255,0.12)', lineHeight:1, userSelect:'none', pointerEvents:'none' }}>{s.num}</div>
    <div style={{ width:iconSz, height:iconSz, borderRadius:24, background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <s.Icon size={iconISz} color="#fff" strokeWidth={1.8} />
    </div>
    <div style={{ fontFamily:FN, fontSize: isMobile ? 26 : 32, fontWeight:700, color:'#fff' }}>{s.title}</div>
    <div style={{ fontSize: isMobile ? 16 : 18, color:'rgba(255,255,255,0.85)', lineHeight:1.6, maxWidth:480 }}>{s.desc}</div>
  </>)

  const sectionHeader = (
    <>
      <div style={{ textAlign:'center', marginBottom:14 }}>
        <span className="liquid-glass" style={{ display:'inline-block', borderRadius:99, padding:'6px 20px', fontSize:11, color:'rgba(255,255,255,0.55)', fontFamily:FN, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase' }}>Así de fácil</span>
      </div>
      <h2 style={{ fontFamily:FN, fontSize:'clamp(22px,3.5vw,38px)', fontWeight:900, color:C.white, textAlign:'center', marginBottom: isMobile ? 40 : 52, lineHeight:1.1 }}>
        <BlurText text="Cómo funciona." delay={100} />
      </h2>
    </>
  )

  /* ── Reduced motion: plain vertical stack ── */
  if (reducedMotion) return (
    <section style={{ padding:'100px 20px' }}>
      {sectionHeader}
      <div style={{ maxWidth:720, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
        {steps.map((s, i) => (
          <div key={i} style={cardBase(s, i, { minHeight: isMobile ? 280 : 320 })}>
            <CardInner s={s} />
          </div>
        ))}
      </div>
    </section>
  )

  /* ── Scroll-stacking layout ── */
  return (
    <section style={{ padding:'100px 20px 0' }}>
      {sectionHeader}

      <div ref={containerRef} style={{ position:'relative', paddingBottom: isMobile ? 120 : 160 }}>
        {steps.map((s, i) => (
          <div
            key={i}
            ref={el => cardRefs.current[i] = el}
            style={{ position:'sticky', top: topBase + i * topStep, zIndex: i + 1, marginTop: i > 0 ? cardMT : 0 }}
          >
            <div style={cardBase(s, i, {
              height:     cardH,
              maxWidth:   720,
              margin:     '0 auto',
              transform:  `scale(${transforms[i].scale})`,
              opacity:    transforms[i].opacity,
              transition: 'transform 0.35s cubic-bezier(0.23,1,0.32,1), opacity 0.35s ease',
              willChange: 'transform, opacity',
            })}>
              <CardInner s={s} />
            </div>
          </div>
        ))}
      </div>

      {/* Progress dots — fixed at viewport bottom while section is in view */}
      {showDots && (
        <div style={{ position:'fixed', bottom:24, left:0, right:0, display:'flex', justifyContent:'center', zIndex:300, pointerEvents:'none' }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', padding:'7px 14px', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', borderRadius:99, border:'1px solid rgba(255,255,255,0.12)' }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width:6, height:6, borderRadius:'50%', background:'#fff',
                opacity:   i <= activeCard ? 1 : 0.3,
                transform: i === activeCard ? 'scale(1.3)' : 'scale(1)',
                transition:'opacity 0.3s ease, transform 0.3s ease',
              }} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// HeroSlider removed — replaced by HeroSection
function _HeroSlider({ setView, profile }) {
  const [current, setCurrent]   = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const resumeRef   = useRef(null)
  const touchStartX = useRef(null)

  const isOwner = profile?.role === 'commerce_owner'

  const slides = [
    {
      id: 1,
      title: 'Tus beneficios.',
      accent: 'Un solo QR.',
      sub:   'Sumá puntos en tus negocios favoritos y canjeá recompensas increíbles.',
      cta:   isOwner ? 'Ir a mi panel' : 'Ver mis clubes',
      onCta: () => setView(isOwner ? 'commerce-settings' : 'client'),
      Icon:  QrCode,
      blob1: 'rgba(189,75,248,0.28)', blob2: 'rgba(254,80,0,0.18)',
      bg:    'radial-gradient(ellipse at 28% 38%, #3F0B78 0%, #1a0040 50%, #09000e 100%)',
    },
    {
      id: 2,
      title: 'Fidelizá a',
      accent: 'tus clientes.',
      sub:   'Sistema de puntos y estrellas que hace que vuelvan una y otra vez.',
      cta:   'Crear mi club',
      onCta: () => setView('register-commerce'),
      Icon:  Users,
      blob1: 'rgba(254,80,0,0.22)', blob2: 'rgba(189,75,248,0.18)',
      bg:    'radial-gradient(ellipse at 72% 30%, #6B11C0 0%, #1a0040 50%, #09000e 100%)',
    },
    {
      id: 3,
      title: 'Premios que',
      accent: 'enamoran.',
      sub:   'Creá un catálogo irresistible y convertí visitas en clientes fieles.',
      cta:   'Ver ejemplo',
      onCta: () => { window.location.href = '/club/cafe-berlin' },
      Icon:  Gift,
      blob1: 'rgba(236,72,153,0.28)', blob2: 'rgba(189,75,248,0.18)',
      bg:    'radial-gradient(ellipse at 50% 60%, #7c1fa0 0%, #1a0040 50%, #09000e 100%)',
    },
    {
      id: 4,
      title: 'Marketing',
      accent: 'automático.',
      sub:   'Mensajes a clientes inactivos, cerca de premiar o recién llegados. Sin esfuerzo.',
      cta:   'Empezar gratis',
      onCta: () => setView('register-commerce'),
      Icon:  Bot,
      blob1: 'rgba(64,200,255,0.14)', blob2: 'rgba(189,75,248,0.22)',
      bg:    'radial-gradient(ellipse at 18% 70%, #3F0B78 0%, #1a0040 50%, #09000e 100%)',
    },
    {
      id: 5,
      title: 'Empezá',
      accent: 'gratis.',
      sub:   'Sin tarjeta. Sin compromiso. Probá el plan gratuito y escalá cuando quieras.',
      cta:   'Crear cuenta',
      onCta: () => setView(isOwner ? 'commerce-settings' : 'client'),
      Icon:  Rocket,
      blob1: 'rgba(189,75,248,0.32)', blob2: 'rgba(254,80,0,0.22)',
      bg:    'radial-gradient(ellipse at 62% 28%, #BD4BF8 0%, #1a0040 50%, #09000e 100%)',
    },
  ]

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!autoPlay) return
    const id = setInterval(() => setCurrent(p => (p + 1) % slides.length), 5000)
    return () => clearInterval(id)
  }, [autoPlay, slides.length])

  useEffect(() => () => { if (resumeRef.current) clearTimeout(resumeRef.current) }, [])

  function goTo(index) {
    setCurrent(index)
    setAutoPlay(false)
    if (resumeRef.current) clearTimeout(resumeRef.current)
    resumeRef.current = setTimeout(() => setAutoPlay(true), 10000)
  }
  const next = () => goTo((current + 1) % slides.length)
  const prev = () => goTo((current - 1 + slides.length) % slides.length)

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev()
    touchStartX.current = null
  }

  return (
    <div
      style={{ position:'relative', width:'100%', height:'85vh', minHeight:600, overflow:'hidden', background:'#09000e' }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    >
      {slides.map((s, i) => (
        <div key={s.id} style={{
          position:'absolute', inset:0,
          opacity: i === current ? 1 : 0,
          transform: i === current ? 'scale(1)' : 'scale(1.03)',
          transition: 'opacity 700ms cubic-bezier(0.23,1,0.32,1), transform 700ms cubic-bezier(0.23,1,0.32,1)',
          pointerEvents: i === current ? 'auto' : 'none',
        }}>
          {/* Background */}
          <div style={{ position:'absolute', inset:0, background:s.bg }} />
          <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'65vw', height:'65vw', borderRadius:'50%', background:`radial-gradient(circle, ${s.blob1} 0%, transparent 70%)`, filter:'blur(70px)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'55vw', height:'55vw', borderRadius:'50%', background:`radial-gradient(circle, ${s.blob2} 0%, transparent 70%)`, filter:'blur(90px)', pointerEvents:'none' }} />

          {/* Content — absolute fill so flex centering works against the full slide height */}
          <div style={{ position:'absolute', inset:0, zIndex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{
              width:'100%', maxWidth:1100,
              padding: isDesktop ? '0 64px' : '0 28px',
              display:'flex',
              flexDirection: isDesktop ? 'row' : 'column',
              alignItems:'center',
              justifyContent:'center',
              gap: isDesktop ? 64 : 36,
              textAlign: isDesktop ? 'left' : 'center',
            }}>
              {/* Text */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems: isDesktop ? 'flex-start' : 'center', gap:20 }}>
                <h1 style={{ fontFamily:FN, fontWeight:900, fontSize:'clamp(42px,7.5vw,78px)', lineHeight:0.93, letterSpacing:'-.03em', margin:0 }}>
                  <span style={{ color:'#fff', display:'block' }}>
                    <BlurText text={s.title} active={i === current} delay={0} />
                  </span>
                  <span style={{ display:'block', background:G, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                    <BlurText text={s.accent} active={i === current} delay={160} />
                  </span>
                </h1>
                <p style={{ fontSize:'clamp(15px,1.8vw,18px)', color:C.mist, maxWidth:460, lineHeight:1.75, margin:0 }}>
                  <BlurText text={s.sub} active={i === current} delay={360} />
                </p>
                <div style={{ opacity: i===current ? 1 : 0, transform: i===current ? 'translateY(0)' : 'translateY(10px)', transition:'opacity 550ms ease-out 480ms, transform 550ms cubic-bezier(0.23,1,0.32,1) 480ms' }}>
                  <GBtn onClick={s.onCta} style={{ fontSize:15, padding:'14px 32px', marginTop:4 }}>
                    {s.cta} →
                  </GBtn>
                </div>
              </div>

              {/* Visual placeholder */}
              <div style={{
                flexShrink:0,
                width: isDesktop ? 260 : 140, height: isDesktop ? 340 : 140,
                borderRadius: isDesktop ? 36 : 32,
                background:'rgba(255,255,255,0.06)',
                backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
                border:'1px solid rgba(255,255,255,0.12)',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16,
                boxShadow:'0 32px 80px rgba(0,0,0,0.45)',
                position:'relative', overflow:'hidden',
              }}>
                <div style={{ position:'absolute', top:-20, left:-20, width:120, height:120, borderRadius:'50%', background:'rgba(189,75,248,0.18)', filter:'blur(30px)', pointerEvents:'none' }} />
                <s.Icon size={isDesktop ? 64 : 44} strokeWidth={1.1} color='rgba(255,255,255,0.80)' style={{ position:'relative', zIndex:1 }} />
                {isDesktop && (
                  <>
                    <div style={{ width:'70%', height:6, borderRadius:99, background:'rgba(255,255,255,0.10)', position:'relative', zIndex:1 }} />
                    <div style={{ width:'50%', height:6, borderRadius:99, background:'rgba(255,255,255,0.06)', position:'relative', zIndex:1 }} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Left arrow */}
      <button onClick={prev}
        onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.16)'}
        onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
        style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', zIndex:20, width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.08)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', transition:'background .2s' }}>
        <ChevronLeft size={22} strokeWidth={2} />
      </button>

      {/* Right arrow */}
      <button onClick={next}
        onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.16)'}
        onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
        style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', zIndex:20, width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.08)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', transition:'background .2s' }}>
        <ChevronRight size={22} strokeWidth={2} />
      </button>

      {/* Dot indicators */}
      <div style={{ position:'absolute', bottom:36, left:'50%', transform:'translateX(-50%)', zIndex:20, display:'flex', alignItems:'center', gap:8 }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            onMouseEnter={e => { if (i !== current) e.currentTarget.style.background='rgba(255,255,255,0.60)' }}
            onMouseLeave={e => { if (i !== current) e.currentTarget.style.background='rgba(255,255,255,0.35)' }}
            style={{ width: i === current ? 28 : 8, height:8, borderRadius:99, background: i === current ? '#fff' : 'rgba(255,255,255,0.35)', border:'none', padding:0, cursor:'pointer', transition:'all 300ms cubic-bezier(0.23,1,0.32,1)' }}
          />
        ))}
      </div>

      {/* Autoplay progress bar */}
      {autoPlay && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(255,255,255,0.08)', zIndex:20, overflow:'hidden' }}>
          <div key={current} style={{ height:'100%', background:G, transformOrigin:'left', animation:'slider-progress 5s linear forwards' }} />
        </div>
      )}

      {/* Bottom section fade */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:120, background:'linear-gradient(to bottom, transparent, #09000e)', pointerEvents:'none', zIndex:10 }} />
    </div>
  )
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
function TestimonialsSection() {
  const items = [
    { name:'María González', role:'Dueña de Café Aroma',     location:'Buenos Aires', text:'Aumentamos un 40% las visitas recurrentes en solo 2 meses. Mis clientes aman juntar estrellitas.' },
    { name:'Carlos Rodríguez', role:'Barbería Premium',       location:'Córdoba',      text:'La app es súper fácil de usar. Mis clientes vuelven más seguido para completar su tarjeta.' },
    { name:'Laura Martínez', role:'Heladería Dolce',          location:'Rosario',      text:'El mejor sistema de fidelización que probé. Simple, bonito y mis clientes lo entienden al toque.' },
  ]
  const [hov, setHov] = useState(-1)
  return (
    <section style={{ padding:'80px 20px', position:'relative', overflow:'hidden' }}>
      {/* bg blob */}
      <div style={{ position:'absolute', top:0, right:0, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }} />

      <div style={{ maxWidth:1080, margin:'0 auto' }}>
        {/* Badge */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
          <span className="liquid-glass" style={{ borderRadius:99, padding:'6px 20px', fontSize:11, color:'rgba(255,255,255,0.55)', fontFamily:FN, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase' }}>Testimonios</span>
        </div>

        {/* Title */}
        <h2 style={{ fontFamily:FN, fontSize:'clamp(24px,4vw,42px)', fontWeight:900, color:C.white, textAlign:'center', marginBottom:14, lineHeight:1.1 }}>
          <BlurText text="Lo que dicen nuestros clientes" delay={100} />
        </h2>
        <p style={{ fontFamily:FI, fontSize:15, color:'rgba(255,255,255,0.50)', textAlign:'center', marginBottom:56, maxWidth:560, margin:'0 auto 56px' }}>
          Comercios de toda Argentina ya confían en Benefix para fidelizar a sus clientes.
        </p>

        {/* Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:20 }}>
          {items.map((t, i) => (
            <div key={i} className="liquid-glass"
              style={{ borderRadius:24, padding:'28px 28px 24px', display:'flex', flexDirection:'column', gap:0, transition:'transform 280ms cubic-bezier(0.23,1,0.32,1)', transform: hov===i ? 'scale(1.02)' : 'scale(1)' }}
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}>
              {/* Quote mark */}
              <div style={{ fontFamily:'Georgia, serif', fontSize:72, lineHeight:1, color:'rgba(168,85,247,0.25)', marginBottom:8, marginTop:-8 }}>"</div>
              {/* Text */}
              <p style={{ fontFamily:FI, fontSize:15, color:'rgba(255,255,255,0.80)', lineHeight:1.65, marginBottom:20, flex:1, fontStyle:'italic' }}>{t.text}</p>
              {/* Stars */}
              <div style={{ display:'flex', gap:3, marginBottom:20 }}>
                {[0,1,2,3,4].map(j => <Star key={j} size={16} color='#facc15' fill='#facc15' strokeWidth={0} />)}
              </div>
              {/* Author */}
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#a855f7,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontFamily:FN, fontSize:14, fontWeight:900, color:'#fff' }}>
                    {t.name.split(' ').map(n=>n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{t.name}</div>
                  <div style={{ fontSize:11, color:C.mist, marginTop:1 }}>{t.role}</div>
                  <div style={{ fontSize:10, color:C.dust, marginTop:1 }}>{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA FINAL ────────────────────────────────────────────────────────────────
function CtaSection({ setView }) {
  return (
    <section style={{ padding:'100px 20px', position:'relative' }}>
      {/* bg gradient */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, transparent 0%, rgba(147,51,234,0.10) 50%, transparent 100%)', pointerEvents:'none' }} />

      <div style={{ maxWidth:720, margin:'0 auto', textAlign:'center', position:'relative' }}>
        <h2 style={{ fontFamily:FN, fontSize:'clamp(28px,5vw,52px)', fontWeight:900, color:C.white, marginBottom:20, lineHeight:1.1 }}>
          <BlurText text="¿Listo para fidelizar?" delay={100} />
        </h2>
        <p style={{ fontFamily:FI, fontSize:16, color:'rgba(255,255,255,0.55)', marginBottom:40, lineHeight:1.7, maxWidth:480, margin:'0 auto 40px' }}>
          Empezá gratis hoy. Sin tarjeta de crédito, sin compromiso.<br />
          Creá tu programa de beneficios en minutos.
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', marginBottom:24 }}>
          <Btn style={{ fontSize:15, padding:'14px 32px' }} onClick={() => setView('register-commerce')}>
            Empezá gratis <ArrowRight size={18} strokeWidth={2.5} />
          </Btn>
          <Btn variant="outline" style={{ fontSize:15, padding:'14px 32px' }} onClick={() => window.open('/demo', '_blank')}>
            Ver demo
          </Btn>
        </div>
        <p style={{ fontFamily:FI, fontSize:12, color:'rgba(255,255,255,0.40)' }}>
          Sin contrato · Sin permanencia · Cancelá cuando quieras
        </p>
      </div>
    </section>
  )
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer({ setView }) {
  const col = { fontFamily:FN, fontSize:12, fontWeight:700, color:C.white, marginBottom:16, letterSpacing:'.04em' }
  const link = { display:'block', fontFamily:FI, fontSize:13, color:'rgba(255,255,255,0.50)', marginBottom:10, cursor:'pointer', textDecoration:'none', transition:'color 160ms ease' }
  const [hovLinks, setHovLinks] = useState({})
  const hl = (k) => ({ ...link, color: hovLinks[k] ? C.white : 'rgba(255,255,255,0.50)' })

  return (
    <footer style={{ borderTop:`1px solid ${C.rim}`, padding:'64px 20px 32px' }}>
      <div style={{ maxWidth:1080, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:40, marginBottom:48 }}>

          {/* Brand */}
          <div style={{ gridColumn:'span 1' }}>
            <div style={{ marginBottom:14 }}><Logo /></div>
            <p style={{ fontFamily:FI, fontSize:13, color:'rgba(255,255,255,0.50)', lineHeight:1.7, maxWidth:220, marginBottom:20 }}>
              Sistema de fidelización para comercios. Tus clientes suman puntos y canjean premios.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              {[
                { k:'ig', d:'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
                { k:'tw', d:'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { k:'li', d:'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
              ].map(({ k, d }) => (
                <button key={k}
                  onMouseEnter={() => setHovLinks(h=>({...h,[k]:true}))}
                  onMouseLeave={() => setHovLinks(h=>({...h,[k]:false}))}
                  style={{ width:36, height:36, borderRadius:'50%', background: hovLinks[k] ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.09)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 160ms ease' }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="rgba(255,255,255,0.65)"><path d={d} /></svg>
                </button>
              ))}
            </div>
          </div>

          {/* Producto */}
          <div>
            <div style={col}>Producto</div>
            {[
              { label:'Para comercios', k:'pc', fn: () => setView('register-commerce') },
              { label:'Para clientes',  k:'cl', fn: () => setView('client')            },
              { label:'Precios',        k:'pr', fn: () => setView('home')              },
            ].map(({ label, k, fn }) => (
              <a key={k} style={hl(k)} onClick={fn}
                onMouseEnter={() => setHovLinks(h=>({...h,[k]:true}))}
                onMouseLeave={() => setHovLinks(h=>({...h,[k]:false}))}>
                {label}
              </a>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div style={col}>Legal y soporte</div>
            {[
              { label:'Términos y condiciones', href:'/terminos'   },
              { label:'Política de privacidad', href:'/privacidad' },
              { label:'Ayuda y contacto',       href:'/ayuda'      },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={link}
                onMouseEnter={e => e.currentTarget.style.color = C.white}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.50)'}>
                {label}
              </a>
            ))}
          </div>

          {/* Contacto */}
          <div>
            <div style={col}>Contacto</div>
            {[
              { label:'hola@benefix.app',  href:'mailto:hola@benefix.app' },
              { label:'Centro de ayuda',   href:'#' },
              { label:'Soporte',           href:'#' },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={link}
                onMouseEnter={e => e.currentTarget.style.color = C.white}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.50)'}>
                {label}
              </a>
            ))}
          </div>

        </div>

        {/* Copyright */}
        <div style={{ borderTop:`1px solid ${C.rim}`, paddingTop:24, display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <p style={{ fontFamily:FI, fontSize:12, color:'rgba(255,255,255,0.30)' }}>© 2026 Benefix. Todos los derechos reservados.</p>
          <p style={{ fontFamily:FI, fontSize:12, color:'rgba(255,255,255,0.30)', display:'flex', alignItems:'center', gap:6 }}>
            Hecho con <span style={{ color:'#f87171' }}>♥</span> en Argentina 🇦🇷
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── SECTION DIVIDER ──────────────────────────────────────────────────────────
function SectionDivider() {
  return <div className="section-divider" />
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeView({ setView, user, profile }) {
  return (
    <div>
      {/* ── HERO ── */}
      <HeroSection setView={setView} user={user} profile={profile} />

      <SectionDivider />

      {/* ── STATS ── */}
      <StatsSection />

      <SectionDivider />

      {/* ── PROCESO: 3 PASOS ── */}
      <HowItWorksSection />

      <SectionDivider />

      {/* ── PARA COMERCIOS ── */}
      <section className="section-secondary" style={{ padding:'100px 20px', position:'relative', overflow:'hidden', textAlign:'center' }}>
        {/* bg blob */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, rgba(147,51,234,0.18) 0%, transparent 68%)', pointerEvents:'none' }} />

        <div style={{ maxWidth:640, margin:'0 auto', position:'relative' }}>
          {/* Badge */}
          <div style={{ display:'inline-block', borderRadius:99, padding:'6px 18px', fontSize:11, fontFamily:FN, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase', color:'#c084fc', background:'rgba(168,85,247,0.12)', border:'1px solid rgba(168,85,247,0.28)', marginBottom:28 }}>
            Para comercios
          </div>

          {/* Title */}
          <h2 style={{ fontFamily:FN, fontSize:'clamp(32px,6vw,60px)', fontWeight:900, color:C.white, lineHeight:1.05, marginBottom:20 }}>
            Que tus clientes<br />
            <span style={{ background:'linear-gradient(90deg,#a855f7,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>siempre vuelvan.</span>
          </h2>

          {/* Subtitle */}
          <p style={{ fontFamily:FI, fontSize:18, color:'rgba(255,255,255,0.55)', marginBottom:36, lineHeight:1.6 }}>
            Creá tu programa de beneficios en 2 minutos. Gratis.
          </p>

          {/* CTA */}
          <Btn size="lg" onClick={() => setView('register-commerce')}>
            Empezá ahora <ArrowRight size={18} strokeWidth={2.5} />
          </Btn>

          {/* Trust microcopy */}
          <p style={{ fontFamily:FI, fontSize:12, color:'rgba(255,255,255,0.30)', marginTop:16 }}>
            Sin tarjeta · Setup en 2 min · Cancelá cuando quieras
          </p>
        </div>
      </section>

      <SectionDivider />

      {/* ── PLANES ── */}
      <div style={{ padding:'100px 20px 108px' }}>
        <div style={{ maxWidth:920, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ fontFamily:FN, fontSize:10, color:C.v, fontWeight:800, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:10 }}>✦ Planes para negocios</div>
            <h2 style={{ fontFamily:FN, fontSize:'clamp(22px,3.5vw,36px)', fontWeight:900, color:C.white, marginBottom:12, lineHeight:1.1 }}>
              Empezá gratis.<br />
              <span style={{ background:GV, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Escalá cuando quieras.</span>
            </h2>
            <p style={{ fontSize:14, color:C.mist, maxWidth:400, margin:'0 auto', lineHeight:1.7 }}>
              Sin contratos, sin sorpresas. Cambiá de plan en cualquier momento.
            </p>
          </div>
          <PlanCards onCTA={() => setView('register-commerce')} />
          <div style={{ textAlign:'center', marginTop:28, fontSize:12, color:C.dust }}>
            Sin contrato · Sin permanencia · Cancelá cuando quieras
          </div>
        </div>
      </div>

      <SectionDivider />

      {/* ── TESTIMONIOS ── */}
      <ReviewsSection />

      <SectionDivider />

      {/* ── CTA FINAL ── */}
      <CtaSection setView={setView} />

      <SectionDivider />

      {/* ── FOOTER ── */}
      <Footer setView={setView} />
    </div>
  )
}

function CityCard({ city:c, delay, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div className="fu" style={{ animationDelay:`${delay}ms`, background:C.card, border:`1px solid ${hov?C.rimH:C.rim}`, borderRadius:15, padding:'20px 18px', cursor:'pointer', transition:'transform 220ms cubic-bezier(0.23,1,0.32,1), box-shadow 220ms cubic-bezier(0.23,1,0.32,1), border-color 220ms ease, background 220ms ease', transform:hov?'translateY(-3px)':'none', position:'relative', overflow:'hidden', boxShadow:hov?`0 14px 34px rgba(0,0,0,.4), 0 0 0 1px ${C.v}44`:'none' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onClick}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:hov?G:'transparent', transition:'background .3s' }} />
      <div style={{ fontSize:9, color:C.dust, letterSpacing:'.14em', textTransform:'uppercase', fontFamily:FN, fontWeight:700, marginBottom:8 }}>{c.province}</div>
      <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:C.white, marginBottom:14 }}>{c.name}</div>
      <div style={{ height:1, background:C.rim, marginBottom:12 }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:FN, fontSize:17, fontWeight:900, color:C.white }}>{c.commerce_count || 0}</div>
          <div style={{ fontSize:9, color:C.dust }}>negocios</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:FN, fontSize:17, fontWeight:900, color:C.white }}>{fmtK(c.member_count || 0)}</div>
          <div style={{ fontSize:9, color:C.dust }}>socios</div>
        </div>
        <div style={{ width:26, height:26, borderRadius:'50%', background:hov?G:C.bg3, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:hov?'#fff':C.mist, transition:'transform 220ms cubic-bezier(0.23,1,0.32,1), box-shadow 220ms cubic-bezier(0.23,1,0.32,1), border-color 220ms ease, background 220ms ease' }}>→</div>
      </div>
    </div>
  )
}

// ─── DIRECTORY ────────────────────────────────────────────────────────────────
function DirectoryView({ citySlug, cities, setView, setCommerce }) {
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')
  const [commerces, setCommerces] = useState([])
  const [loading, setLoading] = useState(true)
  const cityData = cities.find(c => c.slug === citySlug) || {}
  const supabase = getSupabase()

  useEffect(() => {
    if (!citySlug) return
    setLoading(true)
    supabase
      .from('commerces')
      .select('*')
      .eq('active', true)
      .eq('city_id', cityData.id)
      .then(({ data }) => { setCommerces(data || []); setLoading(false) })
  }, [citySlug, cityData.id])

  // Filtro por categoría: matchea si la categoría seleccionada está en
  // `categories` (nuevo, array) o si es la legacy `category` (string).
  const list = commerces.filter(c => {
    if (cat !== 'all') {
      const cats = Array.isArray(c.categories) && c.categories.length > 0 ? c.categories : (c.category ? [c.category] : [])
      if (!cats.includes(cat)) return false
    }
    return c.name.toLowerCase().includes(search.toLowerCase())
  })
  const featured = list.filter(c => c.featured)
  const regular  = list.filter(c => !c.featured)

  return (
    <div style={{ maxWidth:980, margin:'0 auto', padding:'30px 18px 80px' }}>
      <div className="fu" style={{ marginBottom:26 }}>
        <div style={{ fontSize:10, color:C.mist, fontFamily:FN, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}><MapPin size={10} color={C.mist} strokeWidth={2} />{cityData.province}</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:10, marginBottom:11 }}>
          <h1 style={{ fontFamily:FN, fontSize:'clamp(28px,5vw,50px)', fontWeight:900, color:C.white, letterSpacing:'-.02em' }}>{cityData.name}</h1>
          <div style={{ display:'flex', gap:18 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, background:G, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{cityData.commerce_count || 0}</div>
              <div style={{ fontSize:10, color:C.mist }}>negocios</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:C.v }}>{fmtK(cityData.member_count || 0)}</div>
              <div style={{ fontSize:10, color:C.mist }}>socios</div>
            </div>
          </div>
        </div>
        <GradLine />
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:22, flexWrap:'wrap', alignItems:'center' }}>
        <Inp value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{ width:170, fontSize:12 }} />
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {CATS.map(c => (
            <button key={c.id} onClick={()=>setCat(c.id)} style={{ padding:'6px 12px', borderRadius:99, background:cat===c.id?G:'transparent', color:cat===c.id?'#fff':C.mist, border:cat===c.id?'none':`1px solid ${C.rim}`, fontSize:11, fontWeight:600, cursor:'pointer', boxShadow:cat===c.id?'0 4px 12px #FE500044':'none', transition:'background 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms cubic-bezier(0.23,1,0.32,1), box-shadow 160ms ease' }}>{c.label}</button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {featured.length > 0 && (
            <div style={{ marginBottom:30 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:13 }}>
                <Pill color={C.o}>✦ Destacados</Pill>
                <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${C.o}44,transparent)` }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(270px, 1fr))', gap:13, paddingTop:54 }}>
                {featured.map((c,i) => <DirCard key={c.id} commerce={c} delay={i*80} onOpen={()=>{ setCommerce(c); setView('commerce') }} />)}
              </div>
            </div>
          )}
          {regular.length > 0 && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:13 }}>
                <span style={{ fontSize:10, color:C.mist, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', fontFamily:FN }}>Todos los negocios</span>
                <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${C.rim},transparent)` }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(230px, 1fr))', gap:11, paddingTop:50 }}>
                {regular.map((c,i) => <DirCard key={c.id} commerce={c} delay={i*60} onOpen={()=>{ setCommerce(c); setView('commerce') }} />)}
              </div>
            </div>
          )}
          {list.length === 0 && <div style={{ color:C.mist, fontSize:13, textAlign:'center', paddingTop:40 }}>No hay negocios en esta categoría aún.</div>}
        </>
      )}
    </div>
  )
}

function DirCard({ commerce:c, delay, onOpen }) {
  const [hov, setHov] = useState(false)
  const img = c.img_url || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=70'
  return (
    <div className="fu" style={{ animationDelay:`${delay}ms`, background:C.card, border:`1px solid ${hov?C.rimH:C.rim}`, borderRadius:17, overflow:'visible', cursor:'pointer', transition:'transform 220ms cubic-bezier(0.23,1,0.32,1), box-shadow 220ms cubic-bezier(0.23,1,0.32,1), border-color 220ms ease, background 220ms ease', transform:hov?'translateY(-5px)':'none', position:'relative', boxShadow:hov?`0 18px 42px rgba(0,0,0,.5), 0 0 0 1px ${c.reward_color||C.v}44`:'none' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onOpen}>
      <div style={{ position:'absolute', top:-46, left:'50%', transform:`translateX(-50%) ${hov?'scale(1.06)':'scale(1)'}`, zIndex:3, transition:'transform .3s' }}>
        <FloatCover src={img} size={92} />
      </div>
      <div style={{ height:2, background:hov?G:`${c.reward_color||C.v}55`, borderRadius:'17px 17px 0 0', transition:'background .3s' }} />
      <div style={{ padding:'50px 15px 15px', textAlign:'center' }}>
        <div style={{ fontFamily:FN, fontSize:16, fontWeight:900, color:C.white, marginBottom:3 }}>{c.name}</div>
        <div style={{ fontSize:11, color:C.mist, marginBottom:10 }}>{c.emoji}{REVIEWS_ENABLED && <> <span style={{ color:C.o, display:'inline-flex', alignItems:'center', gap:2 }}><Star size={10} color={C.o} fill={C.o} strokeWidth={0} />{c.rating}</span></>}</div>
        <div style={{ height:1, background:C.rim, marginBottom:10 }} />
        <div style={{ background:C.bg3, borderRadius:8, padding:'9px 11px', borderLeft:`3px solid ${c.reward_color||C.v}`, display:'flex', alignItems:'center', gap:7, textAlign:'left', marginBottom:11 }}>
          <Gift size={13} color={c.reward_color||C.v} strokeWidth={2} />
          <div>
            <div style={{ fontSize:9, color:C.dust, textTransform:'uppercase', letterSpacing:'.06em', fontFamily:FN, fontWeight:700 }}>Recompensa</div>
            <div style={{ fontSize:11, fontWeight:700, color:c.reward_color||C.v, fontFamily:FN }}>{c.reward_text}</div>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, color:C.dust, display:'flex', alignItems:'center', gap:4 }}><Users size={11} color={C.dust} strokeWidth={2} />{fmt(c.member_count||0)}</span>
          <div style={{ width:24, height:24, borderRadius:'50%', background:hov?G:C.bg3, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:hov?'#fff':C.mist, transition:'transform 220ms cubic-bezier(0.23,1,0.32,1), box-shadow 220ms cubic-bezier(0.23,1,0.32,1), border-color 220ms ease, background 220ms ease' }}>→</div>
        </div>
      </div>
    </div>
  )
}

// ─── COMMERCE PROFILE ─────────────────────────────────────────────────────────
function CommerceView({ commerce:c, setView, user, onLoginRequired, onCommerceUpdate }) {
  const [joined,  setJoined]  = useState(false)
  const [joining, setJoining] = useState(false)
  const [progress, setProgress] = useState(null)
  const [bal, setBal] = useState(0)  // saldo actual del cliente (stars o points)
  const [prizes,  setPrizes]  = useState([])
  const [activePromos, setActivePromos] = useState([])  // promociones activas (descuento, doble pts)
  const [logoZoom, setLogoZoom] = useState(false)  // modal de logo maximizado
  const [editField, setEditField] = useState(null) // { key, value, label, type, placeholder }
  const [editValue, setEditValue] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const supabase = getSupabase()
  const isOwner = !!(user?.id && c?.owner_id && user.id === c.owner_id)
  if (!c) return null

  function openEdit(field) {
    setEditField(field)
    setEditValue(field.value ?? '')
  }

  // Sube una imagen al bucket commerce-images y devuelve la URL pública.
  async function uploadImage(file, kind) {
    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${c.id}/${kind}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('commerce-images').upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('commerce-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function saveEdit() {
    if (!editField) return
    setEditSaving(true)
    try {
      // Tipo 'prize' — insert directo a la tabla prizes, no a commerces.
      if (editField.type === 'prize') {
        const v = editValue || {}
        if (!v.name?.trim()) { showToast('error', 'Falta el título del premio'); setEditSaving(false); return }
        const cost = parseInt(v.cost, 10)
        if (!Number.isFinite(cost) || cost <= 0) { showToast('error', 'Falta el costo del premio'); setEditSaving(false); return }
        const insert = {
          commerce_id: c.id,
          name:        v.name.trim(),
          description: v.description?.trim() || null,
          cost,
          stock:       v.stock !== '' && v.stock !== null && Number.isFinite(parseInt(v.stock,10)) ? parseInt(v.stock,10) : null,
          img_url:     v.img_url || null,
          active:      true,
        }
        const { data, error } = await supabase.from('prizes').insert(insert).select().single()
        if (error) {
          showToast('error', error.message || 'No se pudo crear el premio')
        } else {
          setPrizes(p => [...p, data])
          setEditField(null)
          showToast('success', 'Premio creado')
        }
        setEditSaving(false)
        return
      }

      // Construir payload + actualización local según el tipo de campo.
      const payload = { commerce_id: c.id }
      const localUpdate = {}

      if (editField.type === 'category') {
        // Soportamos dos formas:
        //   { categories: string[] } (multi, nuevo)
        //   { category, customCategory } (single, legacy)
        if (Array.isArray(editValue?.categories)) {
          if (editValue.categories.length === 0) {
            showToast('error', 'Elegí al menos una categoría')
            setEditSaving(false)
            return
          }
          payload.categories     = editValue.categories
          localUpdate.categories = editValue.categories
          localUpdate.category   = editValue.categories[0]   // espejo legacy
        } else {
          payload.category       = editValue?.category || ''
          payload.customCategory = editValue?.customCategory || ''
          const resolvedSingle   = editValue?.category === '__otro__'
            ? (editValue?.customCategory?.trim() || '')
            : (editValue?.category || '')
          localUpdate.category   = resolvedSingle
          localUpdate.categories = resolvedSingle ? [resolvedSingle] : []
        }
      } else if (editField.type === 'hours') {
        // editValue: { monday: {open, shifts}, ... }
        payload.hours_structured = editValue || null
        localUpdate.hours_structured = editValue || null
      } else if (editField.type === 'image') {
        // editValue: URL pública (ya subida) o '' para borrar
        payload[editField.key] = editValue || null
        localUpdate[editField.key] = editValue || null
      } else if (editField.type === 'location') {
        // editValue: { country, city_name, address }
        const v = editValue || {}
        payload.country   = v.country?.trim()   || null
        payload.city_name = v.city_name?.trim() || null
        payload.address   = v.address?.trim()   || null
        localUpdate.country   = payload.country
        localUpdate.city_name = payload.city_name
        localUpdate.address   = payload.address
      } else {
        // text / textarea / number
        const val = editField.type === 'number'
          ? (editValue === '' ? null : parseInt(editValue, 10) || null)
          : (editValue || null)
        payload[editField.key] = val
        localUpdate[editField.key] = val
      }

      const res = await fetch('/api/save-commerce-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.ok || res.ok) {
        onCommerceUpdate?.(localUpdate)
        setEditField(null)
        showToast('success', 'Guardado')
      } else {
        showToast('error', data.error || 'No se pudo guardar')
      }
    } catch (e) {
      showToast('error', e?.message || 'Error de conexión')
    } finally {
      setEditSaving(false)
    }
  }

  // Portada: usa cover_image (foto de fondo). Si no hay, fallback a un
  // gradient violeta/fucsia de la marca. NUNCA usamos img_url como cover
  // porque eso es el LOGO (cuadrado, va al lado del nombre).
  const coverSrc = c.cover_image || null

  useEffect(() => {
    if (!c?.id) return
    // Cargar premios activos del comercio (visible para todos en el preview)
    supabase.from('prizes').select('id, name, description, cost, img_url, stock, created_at').eq('commerce_id', c.id).eq('active', true).order('cost', { ascending: true })
      .then(({ data }) => setPrizes(data || []))

    // Promociones activas (descuento próx. compra, doble puntos, etc.)
    supabase.from('promotions').select('id, type, value, description, expires_at').eq('commerce_id', c.id).eq('active', true)
      .then(({ data }) => {
        const now = Date.now()
        setActivePromos((data || []).filter(p => !p.expires_at || new Date(p.expires_at).getTime() > now))
      })

    if (!user) return
    // Verificar si ya es socio + obtener balance
    supabase.from('memberships').select('id, stars, points').eq('user_id', user.id).eq('commerce_id', c.id).single()
      .then(({ data }) => {
        if (data) {
          setJoined(true)
          const isStars = c.prog_type === 'stars'
          setBal(isStars ? (data.stars || 0) : (data.points || 0))
        }
      })
    // Obtener progreso
    supabase.from('visits').select('*', { count:'exact', head:true }).eq('user_id', user.id).eq('commerce_id', c.id)
      .then(({ count }) => setProgress(count || 0))
  }, [user, c.id])

  async function handleJoin() {
    if (!user) { onLoginRequired(); return }
    setJoining(true)
    // Pasamos por /api/join (server-side) en vez de hacer insert directo desde
    // cliente. Así se aplican: límite de plan, status='pending' inicial,
    // detección de membership existente, y pending_grants por phone si el
    // perfil tiene uno cargado.
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commerce_id: c.id }),
      })
      const data = await res.json()
      if (data.ok) {
        setJoined(true)
      } else if (data.error === 'plan_limit_reached') {
        showToast('error', 'Este comercio alcanzó el límite de su plan. No podés unirte por ahora.')
      } else {
        showToast('error', data.error || 'No se pudo unir al club. Probá de nuevo.')
      }
    } catch (err) {
      showToast('error', 'Error de conexión. Probá de nuevo.')
    } finally {
      setJoining(false)
    }
  }

  const visitCount = progress || 0
  const goalReached = c.prog_type === 'stars' && visitCount >= c.prog_goal
  const pointsGoalReached = c.prog_type === 'points' && visitCount >= c.prog_goal

  return (
    <div style={{ maxWidth:760, margin:'0 auto', paddingBottom:80 }}>
      {/* "← Volver" — solo visible para clientes que llegaron desde el directorio.
          Para el dueño previsualizando su propio club no tiene sentido (ya tiene
          el navbar arriba con todos los accesos). */}
      {user?.id !== c?.owner_id && (
        <button onClick={()=>setView('directory')} style={{ background:'transparent', border:'none', color:C.mist, fontSize:12, padding:'18px 18px 6px', display:'block', cursor:'pointer' }}>← Volver</button>
      )}
      {user?.id === c?.owner_id && (
        <div style={{ margin:'0 18px 12px' }}>
          <HelpBanner
            id="commerce-public-preview"
            title="Vista pública de tu club"
            body="Esta es la página que ven tus clientes cuando escanean el QR o entran al directorio."
            details={<>
              Acá se muestran tu portada, logo, nombre, categorías, horarios, ubicación, premios disponibles y promos activas. Cualquier dato vacío o sin imagen se nota — usá los lapicitos del propio preview para corregir, o tocá el ícono <strong style={{ color:'#fff' }}>"Mi Negocio"</strong> del navbar para ir al panel completo.<br/><br/>
              Recordá que el slider <strong style={{ color:'#fff' }}>"Deslizá para unirte"</strong> aparece solo cuando un cliente nuevo abre la página, no cuando vos previsualizás.
            </>}
          />
        </div>
      )}
      {/* Header con portada de fondo. Si no hay cover_image, se ve un gradient
          violeta/fucsia de marca (definido inline cuando coverSrc es null).
          El logo (img_url) se muestra al lado del nombre como avatar circular,
          NO se estira como cover. */}
      <div style={{ position:'relative', width:'100%', height:260, overflow:'hidden', background: coverSrc ? '#000' : 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' }}>
        {coverSrc && (
          <img src={coverSrc} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
        )}
        {/* Lápiz para editar la foto de portada — solo owner. Esquina sup. derecha. */}
        {isOwner && (
          <button onClick={() => openEdit({ key:'cover_image', value:c.cover_image||'', label:'Foto de portada', type:'image', kind:'cover' })}
            aria-label="Cambiar portada"
            style={{ position:'absolute', top:14, right:14, zIndex:5, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.20)', borderRadius:99, padding:'7px 11px', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, fontFamily:FN }}>
            <Pen size={11} strokeWidth={2.5} />
            Portada
          </button>
        )}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:120, background:'linear-gradient(to bottom,transparent,rgba(0,0,0,0.92))', zIndex:3 }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:4, padding:'0 22px 20px' }}>
          {c.featured && <div style={{ marginBottom:7 }}><Pill color={C.o}>✦ Destacado</Pill></div>}
          {/* Logo a la izquierda + nombre. Click en logo → maximiza. Owner puede
              editar logo y nombre con un lápiz. Logo se edita desde Configuración
              (necesita upload UI). */}
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:8 }}>
            {c.img_url ? (
              <div style={{ position:'relative', flexShrink:0 }}>
                <button onClick={() => setLogoZoom(true)} aria-label="Ver logo"
                  style={{ background:'none', border:'none', padding:0, cursor:'pointer' }}>
                  <img src={c.img_url} alt="" style={{ width:64, height:64, borderRadius:14, objectFit:'cover', display:'block', border:'2px solid rgba(255,255,255,0.25)', boxShadow:'0 6px 20px rgba(0,0,0,0.45)' }} />
                </button>
                {isOwner && (
                  <button onClick={() => openEdit({ key:'img_url', value:c.img_url||'', label:'Logo', type:'image', kind:'logo' })} aria-label="Cambiar logo"
                    style={{ position:'absolute', top:-4, right:-4, background:'#000', border:'1px solid rgba(255,255,255,0.20)', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
                    <Pen size={10} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ) : isOwner ? (
              <button onClick={() => openEdit({ key:'img_url', value:'', label:'Logo', type:'image', kind:'logo' })} aria-label="Subir logo"
                style={{ width:64, height:64, borderRadius:14, background:'rgba(0,0,0,0.40)', border:'2px dashed rgba(255,255,255,0.40)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, cursor:'pointer', color:'rgba(255,255,255,0.7)', flexShrink:0 }}>
                <Camera size={18} strokeWidth={2} />
                <span style={{ fontSize:8, fontWeight:700, letterSpacing:'.05em' }}>LOGO</span>
              </button>
            ) : null}
            <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:8 }}>
              <h1 style={{ fontFamily:FN, fontSize:'clamp(24px,5vw,40px)', fontWeight:900, color:'#fff', lineHeight:1, textShadow:'0 2px 12px rgba(0,0,0,.6)', minWidth:0, wordBreak:'break-word', margin:0 }}>{c.name}</h1>
              {isOwner && (
                <button onClick={() => openEdit({ key:'name', value:c.name||'', label:'Nombre del negocio', type:'text', placeholder:'Tu nombre comercial', warn:'name', changedAt: c.name_changed_at })}
                  aria-label="Editar nombre"
                  style={{ background:'rgba(0,0,0,0.40)', border:'1px solid rgba(255,255,255,0.20)', borderRadius:8, padding:5, cursor:'pointer', color:'#fff', display:'flex', flexShrink:0 }}>
                  <Pen size={12} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, fontSize:12, color:'rgba(255,255,255,.85)', alignItems:'center', flexWrap:'wrap' }}>
            {(() => {
              // Soportamos categorías múltiples. Si hay categories array, las
              // mostramos todas; si no, fallback a category (legacy single).
              const cats = Array.isArray(c.categories) && c.categories.length > 0
                ? c.categories
                : (c.category ? [c.category] : [])
              if (cats.length === 0 && !isOwner) return null
              const initialCategories = cats
              return (
                <>
                  {cats.map((cat, i) => (
                    <span key={cat + i} style={{ background:'rgba(255,255,255,0.14)', borderRadius:99, padding:'3px 4px 3px 10px', textTransform:'capitalize', display:'inline-flex', alignItems:'center', gap:6 }}>
                      <span>{cat}</span>
                      {/* El botón de editar va solo en el último chip — abre el picker
                          cargado con todas las categorías actuales. */}
                      {isOwner && i === cats.length - 1 && (
                        <button onClick={() => openEdit({ key:'categories', value:{ categories: initialCategories, customCategory: '' }, label:'Categorías del negocio', type:'category' })}
                          aria-label="Editar categorías"
                          style={{ background:'rgba(0,0,0,0.4)', border:'none', borderRadius:99, width:18, height:18, padding:0, cursor:'pointer', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                          <Pen size={9} strokeWidth={2.5} />
                        </button>
                      )}
                    </span>
                  ))}
                  {cats.length === 0 && isOwner && (
                    <span style={{ background:'rgba(255,255,255,0.14)', borderRadius:99, padding:'3px 4px 3px 10px', display:'inline-flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontStyle:'italic', opacity:0.6 }}>Sin categoría</span>
                      <button onClick={() => openEdit({ key:'categories', value:{ categories: [], customCategory: '' }, label:'Categorías del negocio', type:'category' })}
                        aria-label="Editar categoría"
                        style={{ background:'rgba(0,0,0,0.4)', border:'none', borderRadius:99, width:18, height:18, padding:0, cursor:'pointer', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                        <Pen size={9} strokeWidth={2.5} />
                      </button>
                    </span>
                  )}
                </>
              )
            })()}
            {(() => {
              // Abierto / Cerrado en vivo según hours_structured
              const hs = c.hours_structured
              if (!hs) return null
              const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
              const today = hs[dayKeys[new Date().getDay()]]
              if (!today || !today.open || !today.shifts?.length) {
                return (
                  <span style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(0,0,0,0.35)', borderRadius:99, padding:'3px 10px' }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'#888' }} />
                    Cerrado hoy
                  </span>
                )
              }
              const nowMin = new Date().getHours()*60 + new Date().getMinutes()
              const openNow = today.shifts.some(s => {
                const [fh, fm] = (s.from || '0:0').split(':').map(Number)
                const [th, tm] = (s.to   || '0:0').split(':').map(Number)
                return nowMin >= (fh*60+fm) && nowMin <= (th*60+tm)
              })
              return (
                <span style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(0,0,0,0.35)', borderRadius:99, padding:'3px 10px' }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background: openNow ? '#22c55e' : '#888', animation: openNow ? 'pulse 2s ease-in-out infinite' : 'none' }} />
                  <span style={{ color: openNow ? '#4ade80' : '#bbb', fontWeight:600 }}>{openNow ? 'Abierto ahora' : 'Cerrado'}</span>
                </span>
              )
            })()}
            {REVIEWS_ENABLED && <span style={{ display:'flex', alignItems:'center', gap:3 }}><Star size={11} color={C.o} fill={C.o} strokeWidth={0} />{c.rating}</span>}
            {/* Conteo de socios escondido en el perfil — el negocio no necesita
                exponerlo y mostrar 0 socios al inicio desincentiva al cliente. */}
          </div>
        </div>
      </div>

      <div style={{ padding:'0 20px' }}>
        {/* Descripción — siempre visible. Placeholder si no la cargaron. */}
        <div style={{ position:'relative', marginTop:16, marginBottom:14 }}>
          <p style={{ fontSize:14, color: c.description ? C.mist : 'rgba(255,255,255,0.30)', fontStyle: c.description ? 'normal' : 'italic', lineHeight:1.7, margin:0, paddingRight: isOwner ? 32 : 0 }}>
            {c.description || 'Este negocio todavía no agregó una descripción.'}
          </p>
          {isOwner && (
            <button onClick={() => openEdit({ key:'description', value:c.description||'', label:'Descripción', type:'textarea', placeholder:'Contale a tus clientes qué te hace especial...' })}
              aria-label="Editar descripción"
              style={{ position:'absolute', top:0, right:0, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:8, padding:5, cursor:'pointer', color:C.mist, display:'flex' }}>
              <Pen size={12} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Horarios de hoy — resumen rápido. Editar horarios es complejo
            (jsonb por días + turnos), redirigimos a Configuración. */}
        {(() => {
          const hs = c.hours_structured
          const editBtn = isOwner ? (
            <button onClick={() => openEdit({ key:'hours_structured', value: c.hours_structured || {}, label:'Horarios de atención', type:'hours' })}
              aria-label="Editar horarios"
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:8, padding:5, cursor:'pointer', color:C.mist, display:'flex', flexShrink:0 }}>
              <Pen size={12} strokeWidth={2} />
            </button>
          ) : null
          if (!hs) {
            return (
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, padding:'11px 14px', background:C.bg3, borderRadius:10, border:`1px solid ${C.rim}` }}>
                <Clock size={18} color="rgba(255,255,255,0.30)" strokeWidth={2} />
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', fontStyle:'italic', flex:1 }}>Horarios no informados</div>
                {editBtn}
              </div>
            )
          }
          const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
          const today = hs[dayKeys[new Date().getDay()]]
          const summary = today?.open && today?.shifts?.length
            ? today.shifts.map(s => `${s.from}–${s.to}`).join(' · ')
            : 'Cerrado hoy'
          return (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, padding:'11px 14px', background:C.bg3, borderRadius:10, border:`1px solid ${C.rim}` }}>
              <Clock size={18} color={C.mist} strokeWidth={2} />
              <div style={{ fontSize:12, color:C.mist, flex:1 }}>Hoy: <span style={{ color:C.white, fontWeight:600 }}>{summary}</span></div>
              {editBtn}
            </div>
          )
        })()}

        {/* Ubicación — siempre visible. Placeholder si no la cargaron.
            "Cómo llegar" abre Google Maps con direcciones desde la ubicación
            del usuario. Si hay lat/lng usa coords (más preciso); sino, usa
            la dirección escrita con el nombre de la ciudad para mejor match. */}
        {(c.address || (c.lat && c.lng)) ? (() => {
          const mapsUrl = c.lat && c.lng
            ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
            : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([c.address, c.city_name, c.province, 'Argentina'].filter(Boolean).join(', '))}`
          return (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, padding:'11px 14px', background:C.bg3, borderRadius:10, border:`1px solid ${C.rim}` }}>
              <MapPin size={18} color={C.mist} strokeWidth={2} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:C.mist, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.address || `${c.lat}, ${c.lng}`}</div>
              </div>
              {isOwner && (
                <button onClick={() => openEdit({ key:'location', value:{ country:c.country||'', city_name:c.city_name||'', address:c.address||'' }, label:'Ubicación', type:'location' })}
                  aria-label="Editar ubicación"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:8, padding:5, cursor:'pointer', color:C.mist, display:'flex', flexShrink:0 }}>
                  <Pen size={12} strokeWidth={2} />
                </button>
              )}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                style={{ background:'transparent', color:'#BD4BF8', border:'1.5px solid #BD4BF8', borderRadius:8, padding:'6px 12px', fontSize:11, fontWeight:700, fontFamily:FN, cursor:'pointer', textDecoration:'none', whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:4, transition:'background .15s' }}>
                Cómo llegar →
              </a>
            </div>
          )
        })() : (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, padding:'11px 14px', background:C.bg3, borderRadius:10, border:`1px solid ${C.rim}` }}>
            <MapPin size={18} color="rgba(255,255,255,0.30)" strokeWidth={2} />
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', fontStyle:'italic', flex:1 }}>Dirección no informada</div>
            {isOwner && (
              <button onClick={() => openEdit({ key:'location', value:{ country:c.country||'', city_name:c.city_name||'', address:c.address||'' }, label:'Ubicación', type:'location' })}
                aria-label="Agregar ubicación"
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:8, padding:5, cursor:'pointer', color:C.mist, display:'flex', flexShrink:0 }}>
                <Pen size={12} strokeWidth={2} />
              </button>
            )}
          </div>
        )}

        {/* Descuento activo — banner llamativo con el % de la promo discount_next.
            Se muestra cuando hay al menos una promo activa de ese tipo. */}
        {(() => {
          const discount = activePromos.find(p => p.type === 'discount_next')
          if (!discount) return null
          const expDate = discount.expires_at ? new Date(discount.expires_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit' }) : null
          return (
            <div style={{ marginBottom:13, padding:'14px 16px', background:'linear-gradient(135deg, rgba(124,58,237,0.20), rgba(189,75,248,0.18))', border:'1px solid rgba(189,75,248,0.45)', borderRadius:14, display:'flex', alignItems:'center', gap:14, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-30, right:-20, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.30) 0%, transparent 70%)', filter:'blur(20px)', pointerEvents:'none' }} />
              <div style={{ width:54, height:54, borderRadius:14, background:'linear-gradient(135deg, #7C3AED, #BD4BF8)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative', zIndex:1, boxShadow:'0 4px 14px rgba(168,85,247,0.40)' }}>
                <Flame size={26} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ flex:1, minWidth:0, position:'relative', zIndex:1 }}>
                <div style={{ fontFamily:FN, fontSize:9, fontWeight:800, color:'#D8B4FE', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:3 }}>Descuento activo</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:FN, fontSize:24, fontWeight:900, background:'linear-gradient(135deg, #BD4BF8, #A855F7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', lineHeight:1 }}>{discount.value}% OFF</span>
                  <span style={{ fontSize:12, color:C.mist }}>en tu próxima compra</span>
                </div>
                {(discount.description || expDate) && (
                  <div style={{ fontSize:11, color:C.dust, marginTop:4 }}>
                    {discount.description}
                    {discount.description && expDate && ' · '}
                    {expDate && <>Hasta {expDate}</>}
                  </div>
                )}
              </div>
              {isOwner && (
                <button onClick={() => {
                  try { localStorage.setItem('benefix:cameFromPreview', '1') } catch {}
                  window.dispatchEvent(new CustomEvent('benefix:navigate', { detail: { view: 'commerce-settings', tab: 'recompensas' } }))
                }}
                  aria-label="Editar promoción"
                  style={{ position:'relative', zIndex:1, background:'rgba(0,0,0,0.30)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:8, padding:6, cursor:'pointer', color:C.mist, display:'flex', flexShrink:0 }}>
                  <Pen size={12} strokeWidth={2} />
                </button>
              )}
            </div>
          )
        })()}

        {/* Catálogo de premios — siempre visible para el preview, con placeholder
            cuando el dueño aún no cargó ninguno. Usa la misma unidad (★/pts) del programa. */}
        {(() => {
          const isStars = c.prog_type === 'stars'
          const unitLabel = isStars ? 'estrellas' : 'puntos'
          const unitIcon  = isStars ? '★' : '◆'
          const unitColor = isStars ? '#8B5CF6' : '#EC4899'  // violeta / fucsia (paleta de sistemas)
          return (
            <PCard style={{ padding:18, marginBottom:13 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:13, gap:8 }}>
                <div style={{ fontFamily:FN, fontSize:10, color:'#BD4BF8', fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', display:'flex', alignItems:'center', gap:7 }}>
                  <Gift size={12} strokeWidth={2.5} color="#BD4BF8" /> Catálogo de premios
                </div>
                {isOwner && (
                  <button onClick={() => {
                    try { localStorage.setItem('benefix:cameFromPreview', '1') } catch {}
                    window.dispatchEvent(new CustomEvent('benefix:navigate', { detail: { view: 'commerce-settings', tab: 'premios' } }))
                  }}
                    style={{ background:'transparent', border:'none', color:'#BD4BF8', fontSize:11, fontFamily:FN, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4, padding:0, flexShrink:0 }}>
                    Ver catálogo <ArrowRight size={11} strokeWidth={2.5} />
                  </button>
                )}
              </div>
              {prizes.length === 0 ? (
                <div style={{ padding:'18px 14px', textAlign:'center', border:'1px dashed rgba(255,255,255,0.12)', borderRadius:10, background:'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', fontStyle:'italic' }}>Todavía no hay premios cargados</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {prizes.map(p => {
                    const out = p.stock === 0
                    // Premio creado en los últimos 7 días → badge "NUEVO" violeta
                    const isNew = p.created_at && (Date.now() - new Date(p.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
                    return (
                      <div key={p.id} style={{ position:'relative', display:'flex', alignItems:'center', gap:11, padding:'10px 12px', background:C.bg3, borderRadius:10, border:`1px solid ${isNew ? '#8B5CF6' : C.rim}`, opacity: out ? 0.55 : 1 }}>
                        {isNew && (
                          <span style={{ position:'absolute', top:-6, right:8, background:'linear-gradient(135deg, #8B5CF6, #A855F7)', color:'#fff', fontFamily:FN, fontSize:9, fontWeight:800, letterSpacing:'.1em', padding:'2px 8px', borderRadius:99, boxShadow:'0 2px 8px rgba(139,92,246,0.45)' }}>NUEVO</span>
                        )}
                        {p.img_url
                          ? <img src={p.img_url} alt="" style={{ width:46, height:46, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
                          : <div style={{ width:46, height:46, borderRadius:8, background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Gift size={20} color={C.mist} strokeWidth={1.5} /></div>
                        }
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                          {p.description && (
                            <div style={{ fontSize:11, color:C.mist, marginTop:2, lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.description}</div>
                          )}
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3, flexWrap:'wrap' }}>
                            <span style={{ fontSize:11, color:unitColor, fontWeight:700 }}>{unitIcon} {p.cost} {unitLabel}</span>
                            {p.stock !== null && p.stock !== undefined && (
                              <span style={{ fontSize:10, fontWeight:700, color: p.stock === 0 ? '#f87444' : p.stock === 1 ? C.o : C.dust, background: p.stock === 0 ? '#f874441a' : p.stock === 1 ? `${C.o}18` : 'transparent', padding:'1px 6px', borderRadius:6, border:`1px solid ${p.stock === 0 ? '#f8744433' : p.stock === 1 ? `${C.o}44` : C.rim}` }}>
                                {p.stock === 0 ? 'Sin stock' : p.stock === 1 ? 'Último' : `Stock: ${p.stock}`}
                              </span>
                            )}
                          </div>
                          {/* Barra de progreso del cliente hacia este premio.
                              Solo se muestra si el viewer es socio (joined) y no es el dueño. */}
                          {joined && !isOwner && (() => {
                            const pct = p.cost > 0 ? Math.min(100, Math.round((bal / p.cost) * 100)) : 0
                            const reached = bal >= p.cost
                            const missing = Math.max(0, p.cost - bal)
                            return (
                              <div style={{ marginTop:6 }}>
                                <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden' }}>
                                  <div style={{ width:`${pct}%`, height:'100%', background: reached ? '#22c55e' : unitColor, borderRadius:99, transition:'width .4s ease' }} />
                                </div>
                                <div style={{ fontSize:10, color: reached ? '#4ade80' : C.dust, marginTop:3, fontWeight: reached ? 700 : 400 }}>
                                  {reached ? '✓ Ya podés canjearlo' : `Te faltan ${fmt(missing)} ${unitLabel}`}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </PCard>
          )
        })()}

        {/* Compra mínima — debajo del catálogo. Solo cuando aplica
            (stars + valor configurado, o si el viewer es owner). */}
        {c.prog_type === 'stars' && (c.prog_min_purchase > 0 || isOwner) && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:13, padding:'8px 12px', background: c.prog_min_purchase > 0 ? 'rgba(189,75,248,0.10)' : 'rgba(255,255,255,0.03)', border: `1px solid ${c.prog_min_purchase > 0 ? 'rgba(189,75,248,0.30)' : 'rgba(255,255,255,0.08)'}`, borderRadius:10, fontSize:12 }}>
            <Star size={13} color={c.prog_min_purchase > 0 ? '#D8B4FE' : 'rgba(255,255,255,0.30)'} fill="currentColor" strokeWidth={0} />
            <span style={{ flex:1, color: c.prog_min_purchase > 0 ? '#D8B4FE' : 'rgba(255,255,255,0.40)' }}>
              {c.prog_min_purchase > 0
                ? <>Compra mínima para sumar estrella: <strong>${c.prog_min_purchase.toLocaleString('es-AR')}</strong></>
                : <span style={{ fontStyle:'italic' }}>Sin compra mínima configurada</span>
              }
            </span>
            {isOwner && (
              <button onClick={() => openEdit({ key:'prog_min_purchase', value: c.prog_min_purchase || '', label:'Compra mínima para sumar estrella', type:'number', placeholder:'Ej: 1500 (vacío = sin mínimo)' })}
                aria-label="Editar compra mínima"
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:6, padding:'3px 5px', cursor:'pointer', color:C.mist, display:'flex' }}>
                <Pen size={10} strokeWidth={2} />
              </button>
            )}
          </div>
        )}

        {/* CTA de unirse — solo para visitantes/clientes. El dueño no puede ser
            socio de su propio club, así que escondemos todo el contenedor.
            Si está en preview viendo su propio comercio, ya tiene el banner
            arriba "Así ven tu club los clientes" con link a editar. */}
        {user?.id !== c?.owner_id && (
        <div style={{ background:joined?C.okBg:'linear-gradient(135deg,#FE50000D,#BD4BF80D)', border:`1px solid ${joined?C.ok:C.v}44`, borderRadius:15, padding:24, textAlign:'center', transition:'background 400ms ease, border-color 400ms ease' }}>
          {joined ? (
            <>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:9 }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:`${C.ok}22`, border:`2px solid ${C.ok}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CheckCircle size={26} color={C.ok} strokeWidth={2} />
                </div>
              </div>
              <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:C.ok, marginBottom:6 }}>Bienvenido al club.</div>
              <div style={{ fontSize:13, color:C.mist, marginBottom:18, lineHeight:1.7 }}>Sos socio de <strong style={{ color:C.white }}>{c.name}</strong>.</div>
              <GBtn onClick={()=>setView('client')} style={{ background:C.ok, boxShadow:`0 4px 16px ${C.ok}44`, color:'#000' }}>Ver mi QR y beneficios →</GBtn>
            </>
          ) : (
            <>
              <div style={{ fontFamily:FN, fontSize:'clamp(16px,3vw,22px)', fontWeight:900, color:C.white, marginBottom:8, lineHeight:1.1 }}>
                Unirte es gratis.<br /><span style={{ background:G, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>La diferencia es inmediata.</span>
              </div>
              <div style={{ fontSize:13, color:C.mist, marginBottom:20, lineHeight:1.7 }}>Iniciá sesión con Google y tu perfil se crea automáticamente.</div>
              <GBtn onClick={handleJoin} disabled={joining} style={{ fontSize:14, padding:'13px 36px' }}>
                {joining ? '⟳ Creando...' : <><span style={{ fontWeight:900, fontSize:14 }}>G</span> Continuar con Google</>}
              </GBtn>
              <div style={{ fontSize:11, color:C.dust, marginTop:11 }}>Sin contraseñas · Sin spam · Sin apps</div>
            </>
          )}
        </div>
        )}
      </div>

      {/* Modal: edición inline de campo. Genérico — soporta text/textarea/number,
          image (logo/cover), category (familias+subs), hours (7 días con turnos).
          Save → POST a /api/save-commerce-config. Cambios reflejan inmediato. */}
      {editField && (
        <div onClick={() => !editSaving && setEditField(null)}
          style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e => e.stopPropagation()} className="modal-in liquid-glass-strong"
            style={{ position:'relative', borderRadius:20, padding:'22px 20px', width:'100%', maxWidth: editField.type === 'hours' || editField.type === 'category' ? 440 : 380, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>
            {/* Cerrar — esquina superior derecha, deshabilitado mientras guarda. */}
            <button onClick={() => !editSaving && setEditField(null)} aria-label="Cerrar"
              disabled={editSaving}
              style={{ position:'absolute', top:12, right:12, width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.40)', border:'1px solid rgba(255,255,255,0.18)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor: editSaving ? 'not-allowed' : 'pointer', padding:0, zIndex:5, opacity: editSaving ? 0.5 : 1 }}>
              <X size={14} strokeWidth={2.5} />
            </button>
            <div style={{ fontFamily:FN, fontSize:11, color:C.v, fontWeight:800, letterSpacing:'.10em', textTransform:'uppercase', marginBottom:8, paddingRight:36 }}>Editar</div>
            <div style={{ fontFamily:FN, fontSize:16, fontWeight:800, color:C.white, marginBottom:14, paddingRight:36 }}>{editField.label}</div>

            {/* Warning especial para cambio de nombre — 20 días de lock entre cambios. */}
            {editField.warn === 'name' && (() => {
              const changedAt = editField.changedAt ? new Date(editField.changedAt) : null
              const ms20 = 20 * 24 * 60 * 60 * 1000
              const lockedUntil = changedAt ? new Date(changedAt.getTime() + ms20) : null
              const isLocked = lockedUntil && lockedUntil.getTime() > Date.now()
              const daysLeft = isLocked ? Math.ceil((lockedUntil.getTime() - Date.now()) / (24*60*60*1000)) : 0
              if (isLocked) {
                return (
                  <div style={{ padding:'12px 14px', marginBottom:14, background:'rgba(248,116,68,0.10)', border:'1px solid rgba(248,116,68,0.32)', borderRadius:10, fontSize:12, color:'#fbb89a', lineHeight:1.55, display:'flex', alignItems:'flex-start', gap:9 }}>
                    <Lock size={14} strokeWidth={2} color="#f87444" style={{ flexShrink:0, marginTop:1 }} />
                    <div>
                      <strong style={{ color:'#f87444' }}>Cambio bloqueado.</strong> Cambiaste el nombre el <strong>{changedAt.toLocaleDateString('es-AR')}</strong>. Vas a poder cambiarlo de nuevo el <strong>{lockedUntil.toLocaleDateString('es-AR')}</strong> ({daysLeft} día{daysLeft===1?'':'s'}).
                    </div>
                  </div>
                )
              }
              return (
                <div style={{ padding:'12px 14px', marginBottom:14, background:'rgba(254,80,0,0.10)', border:'1px solid rgba(254,80,0,0.32)', borderRadius:10, fontSize:12, color:'#fcb89a', lineHeight:1.55, display:'flex', alignItems:'flex-start', gap:9 }}>
                  <AlertTriangle size={14} strokeWidth={2} color={C.o} style={{ flexShrink:0, marginTop:1 }} />
                  <div>
                    <strong style={{ color:C.o }}>Atención:</strong> una vez que cambies el nombre, <strong>no vas a poder cambiarlo de nuevo durante 20 días</strong>. Tus clientes ya conocen este nombre — un cambio puede confundirlos.
                  </div>
                </div>
              )
            })()}

            {editField.type === 'textarea' && (
              <textarea value={editValue} onChange={e => setEditValue(e.target.value)} placeholder={editField.placeholder} rows={4} autoFocus
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:12, padding:'12px 14px', fontSize:14, color:C.white, fontFamily:'inherit', resize:'vertical', lineHeight:1.5, boxSizing:'border-box' }} />
            )}

            {(editField.type === 'text' || editField.type === 'number') && (
              <input type={editField.type === 'number' ? 'number' : 'text'} value={editValue} onChange={e => setEditValue(e.target.value)} placeholder={editField.placeholder} autoFocus
                inputMode={editField.type === 'number' ? 'numeric' : 'text'}
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:12, padding:'12px 14px', fontSize:15, color:C.white, fontFamily:'inherit', boxSizing:'border-box' }} />
            )}

            {editField.type === 'location' && (() => {
              const v = editValue || {}
              const upd = (k, val) => setEditValue({ ...v, [k]: val })
              const inputStyle = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:12, padding:'12px 14px', fontSize:14, color:C.white, fontFamily:'inherit', boxSizing:'border-box' }
              const labelStyle = { fontSize:11, color:C.dust, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:6 }
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div>
                    <label style={labelStyle}>País</label>
                    <input type="text" value={v.country || ''} onChange={e => upd('country', e.target.value)} placeholder="Argentina" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Localidad</label>
                    <input type="text" value={v.city_name || ''} onChange={e => upd('city_name', e.target.value)} placeholder="Ej: General Pico" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Dirección</label>
                    <input type="text" value={v.address || ''} onChange={e => upd('address', e.target.value)} placeholder="Calle y número" style={inputStyle} autoFocus />
                  </div>
                </div>
              )
            })()}

            {/* Prize creator — todos los campos del premio + foto opcional. */}
            {editField.type === 'prize' && (() => {
              const v = editValue || {}
              const set = patch => setEditValue({ ...v, ...patch })
              const isStars = c.prog_type === 'stars'
              const unitLabel = isStars ? 'estrellas' : 'puntos'
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {/* Foto */}
                  <div>
                    {v.img_url ? (
                      <div style={{ position:'relative', display:'inline-block' }}>
                        <img src={v.img_url} alt="" style={{ width:80, height:80, borderRadius:12, objectFit:'cover', display:'block' }} />
                        <button onClick={() => set({ img_url:'' })}
                          style={{ position:'absolute', top:-6, right:-6, background:'#000', border:'1px solid rgba(255,255,255,0.20)', borderRadius:'50%', width:22, height:22, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <X size={11} strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input type="file" accept="image/*" id="inline-prize-img" style={{ display:'none' }}
                          onChange={async e => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            if (!file) return
                            setEditSaving(true)
                            try {
                              const ext = (file.name.split('.').pop()||'jpg').toLowerCase()
                              const path = `${c.id}/prizes/${Date.now()}.${ext}`
                              const { error } = await supabase.storage.from('prize-images').upload(path, file, { upsert:false })
                              if (error) throw error
                              const { data } = supabase.storage.from('prize-images').getPublicUrl(path)
                              set({ img_url: data.publicUrl })
                            } catch (err) { showToast('error', err.message || 'Error al subir foto') }
                            finally { setEditSaving(false) }
                          }} />
                        <label htmlFor="inline-prize-img"
                          style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 13px', background:'rgba(255,255,255,0.04)', border:'1px dashed rgba(255,255,255,0.18)', borderRadius:10, fontSize:12, color:C.mist, cursor:'pointer', fontFamily:FN, fontWeight:600 }}>
                          <Camera size={13} strokeWidth={2} /> Foto del premio (opcional)
                        </label>
                      </>
                    )}
                  </div>

                  {/* Título */}
                  <div>
                    <label style={{ fontSize:11, color:C.dust, fontWeight:600, marginBottom:4, display:'block' }}>Título <span style={{ color:'#f87444' }}>·</span></label>
                    <input type="text" value={v.name} onChange={e => set({ name: e.target.value })}
                      placeholder="Ej: Café gratis, 20% OFF..."
                      style={{ width:'100%', padding:'10px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:10, color:C.white, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }} />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label style={{ fontSize:11, color:C.dust, fontWeight:600, marginBottom:4, display:'block' }}>Descripción <span style={{ color:C.dust, fontWeight:400 }}>(opcional)</span></label>
                    <textarea value={v.description} onChange={e => set({ description: e.target.value })}
                      placeholder="Detalles para el cliente. Ej: válido lun a vie..."
                      rows={2}
                      style={{ width:'100%', padding:'10px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:10, color:C.white, fontSize:13, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box', lineHeight:1.45 }} />
                  </div>

                  {/* Costo + stock */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div>
                      <label style={{ fontSize:11, color:C.dust, fontWeight:600, marginBottom:4, display:'block' }}>Costo en {unitLabel} <span style={{ color:'#f87444' }}>·</span></label>
                      <input type="number" min={1} value={v.cost} onChange={e => set({ cost: e.target.value })}
                        placeholder={isStars ? 'Ej: 10' : 'Ej: 5000'}
                        style={{ width:'100%', padding:'10px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:10, color:C.white, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:C.dust, fontWeight:600, marginBottom:4, display:'block' }}>Stock <span style={{ color:C.dust, fontWeight:400 }}>(opc.)</span></label>
                      <input type="number" min={1} value={v.stock} onChange={e => set({ stock: e.target.value })}
                        placeholder="Ilimitado"
                        style={{ width:'100%', padding:'10px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:10, color:C.white, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }} />
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:C.dust }}>Vacío = sin tope · <span style={{ color:'#f87444' }}>·</span> obligatorios</div>
                </div>
              )
            })()}

            {/* Image picker — logo o cover. Sube al storage y guarda la URL. */}
            {editField.type === 'image' && (() => {
              const isLogo = editField.kind === 'logo'
              return (
                <div>
                  {editValue ? (
                    <div style={{ marginBottom:12 }}>
                      <img src={editValue} alt=""
                        style={{ width:'100%', maxHeight: isLogo ? 200 : 160, objectFit: isLogo ? 'contain' : 'cover', borderRadius:12, background:'rgba(255,255,255,0.04)' }} />
                    </div>
                  ) : (
                    <div style={{ width:'100%', height: isLogo ? 160 : 120, borderRadius:12, background:'rgba(255,255,255,0.04)', border:'2px dashed rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                      <Camera size={32} color="rgba(255,255,255,0.30)" strokeWidth={1.5} />
                    </div>
                  )}
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" id="inline-img-input" style={{ display:'none' }}
                    onChange={async e => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      setEditSaving(true)
                      try {
                        const url = await uploadImage(file, editField.kind)
                        setEditValue(url)
                      } catch (err) {
                        showToast('error', err.message || 'Error subiendo imagen')
                      } finally {
                        setEditSaving(false)
                      }
                    }} />
                  <div style={{ display:'flex', gap:8 }}>
                    <label htmlFor="inline-img-input"
                      style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'10px 14px', background:'rgba(255,255,255,0.06)', border:`1px dashed rgba(255,255,255,0.20)`, borderRadius:10, fontSize:13, color:C.pearl, cursor:'pointer', fontFamily:FN, fontWeight:600 }}>
                      <Upload size={14} strokeWidth={2} />
                      {editValue ? 'Cambiar imagen' : 'Subir imagen'}
                    </label>
                    {editValue && (
                      <button onClick={() => setEditValue('')}
                        style={{ background:'rgba(248,116,68,0.10)', border:'1px solid rgba(248,116,68,0.30)', borderRadius:10, padding:'10px 14px', cursor:'pointer', color:'#f87444', fontSize:12, fontFamily:FN, fontWeight:600 }}>
                        Quitar
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:C.dust, marginTop:8 }}>
                    {isLogo ? 'Cuadrada se ve mejor. JPG, PNG o WebP.' : 'Apaisada (16:9 o similar). Se ve atrás del nombre.'}
                  </div>
                </div>
              )
            })()}

            {/* Category picker — multi-select. Hasta 3 categorías por comercio,
                de FAMILIES_DATA o custom via "Otro" (texto libre). */}
            {editField.type === 'category' && (() => {
              // editValue: { categories: string[], customCategory: string, _famId: string }
              // Migración del formato viejo (single { category, customCategory }) → array.
              const raw = editValue || {}
              const initialArr = Array.isArray(raw.categories)
                ? raw.categories
                : (raw.category && raw.category !== '__otro__' ? [raw.category] : [])
              const cur = { categories: initialArr, customCategory: raw.customCategory || '', _famId: raw._famId }
              const MAX = 3
              const allFamilies = FAMILIES_DATA
              const activeFamId = cur._famId || (cur.categories[0]
                ? (allFamilies.find(f => f.subs.some(s => s.name === cur.categories[0]))?.id)
                : null)
              const setActiveFamId = (id) => setEditValue({ ...cur, _famId: id })

              const toggleCat = (name) => {
                const has = cur.categories.includes(name)
                let next
                if (has) {
                  next = cur.categories.filter(c => c !== name)
                } else {
                  if (cur.categories.length >= MAX) {
                    showToast('error', `Máximo ${MAX} categorías`)
                    return
                  }
                  next = [...cur.categories, name]
                }
                setEditValue({ ...cur, categories: next })
              }
              const removeCat = (name) => {
                setEditValue({ ...cur, categories: cur.categories.filter(c => c !== name) })
              }
              const addOtroCat = (txt) => {
                const t = (txt || '').trim()
                if (!t) return
                if (cur.categories.length >= MAX) {
                  showToast('error', `Máximo ${MAX} categorías`)
                  return
                }
                if (!cur.categories.includes(t)) {
                  setEditValue({ ...cur, categories: [...cur.categories, t], customCategory: '' })
                }
              }
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {/* Chips seleccionadas */}
                  {cur.categories.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'8px 10px', background:'rgba(189,75,248,0.10)', border:'1px solid rgba(189,75,248,0.30)', borderRadius:10 }}>
                      {cur.categories.map(cat => (
                        <span key={cat} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 6px 4px 10px', borderRadius:99, background:'rgba(255,255,255,0.10)', fontSize:12, color:C.white, fontWeight:600 }}>
                          {cat}
                          <button onClick={() => removeCat(cat)}
                            aria-label={`Quitar ${cat}`}
                            style={{ background:'rgba(0,0,0,0.4)', border:'none', borderRadius:'50%', width:18, height:18, padding:0, cursor:'pointer', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                            <X size={10} strokeWidth={2.5} />
                          </button>
                        </span>
                      ))}
                      <span style={{ fontSize:10, color:C.mist, alignSelf:'center', marginLeft:'auto' }}>{cur.categories.length}/{MAX}</span>
                    </div>
                  )}
                  <div style={{ fontSize:11, color:C.dust }}>
                    Elegí hasta {MAX} categorías para tu negocio. Pueden venir de distintas familias.
                  </div>
                  {/* Selector de familia */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:6 }}>
                    {allFamilies.map(fam => {
                      const sel = activeFamId === fam.id
                      return (
                        <button key={fam.id} onClick={() => setActiveFamId(fam.id)}
                          style={{ padding:'10px 8px', borderRadius:10, background: sel ? `${C.v}22` : 'rgba(255,255,255,0.04)', border:`1px solid ${sel ? C.v : 'rgba(255,255,255,0.10)'}`, cursor:'pointer', fontSize:11, fontWeight:600, color: sel ? C.white : 'rgba(255,255,255,0.65)', textAlign:'center' }}>
                          {fam.name}
                        </button>
                      )
                    })}
                    <button onClick={() => setActiveFamId('otro')}
                      style={{ padding:'10px 8px', borderRadius:10, background: activeFamId === 'otro' ? `${C.v}22` : 'rgba(255,255,255,0.04)', border:`1px solid ${activeFamId === 'otro' ? C.v : 'rgba(255,255,255,0.10)'}`, cursor:'pointer', fontSize:11, fontWeight:600, color: activeFamId === 'otro' ? C.white : 'rgba(255,255,255,0.65)', textAlign:'center' }}>
                      Otro
                    </button>
                  </div>
                  {/* Subcategorías toggle (no exclusivas) */}
                  {activeFamId && activeFamId !== 'otro' && (() => {
                    const fam = allFamilies.find(f => f.id === activeFamId)
                    if (!fam) return null
                    return (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, paddingTop:6, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                        {fam.subs.map(sub => {
                          const sel = cur.categories.includes(sub.name)
                          return (
                            <button key={sub.name} onClick={() => toggleCat(sub.name)}
                              style={{ padding:'7px 12px', borderRadius:99, background: sel ? G : 'rgba(255,255,255,0.06)', border:`1px solid ${sel ? 'transparent' : 'rgba(255,255,255,0.10)'}`, cursor:'pointer', fontSize:12, fontWeight:600, color: sel ? '#fff' : 'rgba(255,255,255,0.75)', display:'inline-flex', alignItems:'center', gap:5 }}>
                              {sel && <Check size={11} strokeWidth={2.5} />}
                              {sub.name}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()}
                  {activeFamId === 'otro' && (
                    <div style={{ paddingTop:6, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                      <label style={{ fontSize:11, color:C.dust, display:'block', marginBottom:6 }}>Describí tu rubro y tocá agregar</label>
                      <div style={{ display:'flex', gap:8 }}>
                        <input type="text" maxLength={40} value={cur.customCategory || ''}
                          onChange={e => setEditValue({ ...cur, customCategory: e.target.value, _famId:'otro' })}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOtroCat(cur.customCategory) } }}
                          placeholder="Ej: Kinesiólogo, Fotocopias..."
                          style={{ flex:1, padding:'10px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:10, color:C.white, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }} />
                        <button onClick={() => addOtroCat(cur.customCategory)} disabled={!cur.customCategory?.trim()}
                          style={{ padding:'10px 14px', background: cur.customCategory?.trim() ? G : 'rgba(255,255,255,0.06)', border:'none', borderRadius:10, color:'#fff', fontFamily:FN, fontSize:12, fontWeight:700, cursor: cur.customCategory?.trim() ? 'pointer' : 'default', flexShrink:0 }}>
                          Agregar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Hours editor — toggle "siempre abierto" arriba + 7 filas con
                toggle día por día + 2 inputs time. Multi-shift va a Configuración. */}
            {editField.type === 'hours' && (() => {
              const dayKeys   = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
              const dayLabels = { monday:'Lun', tuesday:'Mar', wednesday:'Mié', thursday:'Jue', friday:'Vie', saturday:'Sáb', sunday:'Dom' }
              const hs = editValue || {}
              const always247 = !!hs.__always_open
              function setDay(k, patch) {
                const next = { ...hs, [k]: { ...(hs[k] || { open:false, shifts:[] }), ...patch } }
                setEditValue(next)
              }
              function setShift(k, idx, patch) {
                const cur = hs[k] || { open:true, shifts:[{ from:'09:00', to:'18:00' }] }
                const shifts = [...(cur.shifts || [])]
                shifts[idx] = { ...(shifts[idx] || { from:'09:00', to:'18:00' }), ...patch }
                setDay(k, { shifts })
              }
              function toggleAlwaysOpen() {
                if (always247) {
                  // Desactivar — limpiar el flag, dejar los días como estaban (por default todos abiertos 09-18)
                  const next = {}
                  dayKeys.forEach(k => { next[k] = { open:true, shifts:[{ from:'09:00', to:'18:00' }] } })
                  setEditValue(next)
                } else {
                  // Activar — todos los días abiertos 24h
                  const next = { __always_open: true }
                  dayKeys.forEach(k => { next[k] = { open:true, shifts:[{ from:'00:00', to:'23:59' }] } })
                  setEditValue(next)
                }
              }
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {/* Toggle "Siempre abierto" — atajo para 24/7 */}
                  <button onClick={toggleAlwaysOpen}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', marginBottom:4, background: always247 ? `${C.v}22` : 'rgba(255,255,255,0.04)', border:`1.5px solid ${always247 ? C.v : 'rgba(255,255,255,0.10)'}`, borderRadius:10, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                    <div style={{ width:36, height:22, borderRadius:99, background: always247 ? '#22c55e' : 'rgba(255,255,255,0.15)', position:'relative', flexShrink:0, transition:'background .15s' }}>
                      <span style={{ position:'absolute', top:2, left: always247 ? 16 : 2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .15s' }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color: always247 ? C.white : 'rgba(255,255,255,0.85)' }}>Siempre abierto (24/7)</div>
                      <div style={{ fontSize:11, color: always247 ? 'rgba(255,255,255,0.65)' : C.dust, marginTop:1 }}>
                        {always247 ? 'Tu negocio aparece como abierto a cualquier hora' : 'Para negocios que atienden 24 horas todos los días'}
                      </div>
                    </div>
                  </button>
                  {!always247 && dayKeys.map(k => {
                    const d = hs[k] || { open:false, shifts:[{ from:'09:00', to:'18:00' }] }
                    return (
                      <div key={k} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'rgba(255,255,255,0.04)', borderRadius:10 }}>
                        <button onClick={() => setDay(k, { open: !d.open, shifts: !d.open && (!d.shifts || !d.shifts.length) ? [{ from:'09:00', to:'18:00' }] : d.shifts })}
                          style={{ width:36, height:22, borderRadius:99, background: d.open ? '#22c55e' : 'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', position:'relative', flexShrink:0, transition:'background .15s' }}>
                          <span style={{ position:'absolute', top:2, left: d.open ? 16 : 2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .15s' }} />
                        </button>
                        <span style={{ width:34, fontSize:12, fontWeight:700, color: d.open ? C.white : C.dust, fontFamily:FN, flexShrink:0 }}>{dayLabels[k]}</span>
                        {d.open ? (
                          <div style={{ flex:1, display:'flex', alignItems:'center', gap:6 }}>
                            <input type="time" value={d.shifts?.[0]?.from || '09:00'} onChange={e => setShift(k, 0, { from: e.target.value })}
                              style={{ flex:1, minWidth:0, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'6px 8px', fontSize:12, color:C.white, fontFamily:'inherit', colorScheme:'dark' }} />
                            <span style={{ fontSize:11, color:C.dust }}>–</span>
                            <input type="time" value={d.shifts?.[0]?.to || '18:00'} onChange={e => setShift(k, 0, { to: e.target.value })}
                              style={{ flex:1, minWidth:0, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'6px 8px', fontSize:12, color:C.white, fontFamily:'inherit', colorScheme:'dark' }} />
                          </div>
                        ) : (
                          <span style={{ flex:1, fontSize:11, color:C.dust, fontStyle:'italic' }}>Cerrado</span>
                        )}
                      </div>
                    )
                  })}
                  <div style={{ fontSize:10, color:C.dust, marginTop:4 }}>
                    Para múltiples turnos por día (ej: cierre al mediodía), usá la pestaña Configuración.
                  </div>
                </div>
              )
            })()}

            {(() => {
              // Si el lock del nombre está activo, deshabilitamos el Save
              const nameLocked = editField.warn === 'name' && editField.changedAt
                && (new Date(editField.changedAt).getTime() + 20*24*60*60*1000) > Date.now()
              const disabled = editSaving || nameLocked
              return (
                <div style={{ display:'flex', gap:10, marginTop:18 }}>
                  <button onClick={() => setEditField(null)} disabled={editSaving}
                    style={{ flex:1, padding:'11px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:12, color:C.pearl, fontFamily:FN, fontSize:13, fontWeight:600, cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.5 : 1 }}>Cancelar</button>
                  <button onClick={saveEdit} disabled={disabled}
                    style={{ flex:1, padding:'11px', background: nameLocked ? 'rgba(255,255,255,0.06)' : GV, border:'none', borderRadius:12, color: nameLocked ? C.dust : '#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: nameLocked ? 0.5 : 1 }}>{editSaving ? 'Guardando...' : (nameLocked ? 'Bloqueado' : 'Guardar')}</button>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Modal: logo maximizado. Click sobre el backdrop oscuro o sobre la
          imagen → cierra. Sin botón explícito para mantener simple. */}
      {logoZoom && c.img_url && (
        <div
          onClick={() => setLogoZoom(false)}
          style={{
            position:'fixed', inset:0, zIndex:9999,
            background:'rgba(0,0,0,0.88)',
            backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:24, cursor:'zoom-out',
            animation:'fadeIn .18s ease',
          }}
          role="dialog"
          aria-label="Logo del comercio"
        >
          <button onClick={e => { e.stopPropagation(); setLogoZoom(false) }} aria-label="Cerrar"
            style={{ position:'absolute', top:20, right:20, width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.55)', border:'1px solid rgba(255,255,255,0.20)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, zIndex:5 }}>
            <X size={16} strokeWidth={2.5} />
          </button>
          <img
            src={c.img_url}
            alt=""
            style={{
              maxWidth:'min(80vw, 400px)', maxHeight:'80vh',
              borderRadius:24, objectFit:'contain',
              boxShadow:'0 30px 80px rgba(0,0,0,0.55)',
              animation:'modal-in .25s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
          <div style={{ position:'absolute', bottom:30, left:0, right:0, textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.55)', pointerEvents:'none' }}>
            Tap para cerrar
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CLIENT BOTTOM NAV ────────────────────────────────────────────────────────
function ClientBottomNav({ tab, setTab, profile, setView }) {
  // Nav superior de la vista cliente. Va fijo justo abajo del Navbar global.
  // Solo 3 pestañas porque "Mi Cuenta" y "Mi Negocio" ya tienen su botón
  // dedicado en el Navbar global de arriba.
  const TABS = [
    { id: 'mis clubs', label: 'Mi billetera' },
    { id: 'premios',   label: 'Premios'   },
    { id: 'historial', label: 'Historial' },
    { id: 'mi qr',     label: 'Mi QR'     },
  ]

  return (
    <nav style={{
      // Pegado al fondo del Navbar global. El Navbar es una "isla" fixed top:10
      // con altura 52, así que termina en y=62 — ahí arranca este nav, sin gap.
      position: 'fixed', top: 62, left: 0, right: 0, zIndex: 200,
      background: 'linear-gradient(135deg, #FE5000, #BD4BF8)',
      boxShadow: '0 8px 24px -8px rgba(0,0,0,0.45)',
    }}>
      <div style={{
        maxWidth: 520, margin: '0 auto',
        display: 'flex', alignItems: 'stretch', justifyContent: 'center',
        padding: '12px 16px',
      }}>
        {TABS.map(({ id, label }, i) => {
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
              }}>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ─── DYNAMIC GREETING ─────────────────────────────────────────────────────────
function DynamicGreeting({ name, type = 'client', style = {} }) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const n    = name?.trim().split(' ')[0] || ''
    const hasN = n.length > 0

    const clientGreetings = hasN ? [
      `¡${n}! Lindo día para sumar puntos`,
      `¡Hola ${n}! ¿Sumamos puntos hoy?`,
      `¡${n}! Tus premios te esperan`,
      `¡${n}! Cada compra te acerca a tu premio`,
      `¡Hola ${n}! A acumular beneficios`,
      `¡${n}! ¿Listo para sumar?`,
      `¡${n}! Tus puntos extrañan crecer`,
      `¡Hola ${n}! Hay premios con tu nombre`,
      `¡${n}! Hoy es buen día para canjear`,
      `¡${n}! Tus comercios favoritos te esperan`,
      `¡Hola ${n}! Seguimos sumando`,
      `¡${n}! Un café más cerca de tu premio`,
      `¡${n}! Tus beneficios no se suman solos`,
      `¡Hola ${n}! ¿Canjeamos algo hoy?`,
      `¡${n}! El próximo premio está cerca`,
    ] : [
      `¡Hola! Lindo día para sumar puntos`,
      `¡Hola! ¿Sumamos puntos hoy?`,
      `¡Hola! Tus premios te esperan`,
      `¡Hola! A acumular beneficios`,
      `¡Hola! Hay premios esperándote`,
    ]

    const commerceGreetings = hasN ? [
      `¡Hola ${n}! Tus clientes te esperan`,
      `¡${n}! Lindo día para fidelizar`,
      `¡${n}! ¿Cuántos puntos regalamos hoy?`,
      `¡Hola ${n}! A sumar visitas`,
      `¡${n}! Tus clientes quieren volver`,
      `¡${n}! Hoy se suman nuevos clientes`,
      `¡Hola ${n}! Los puntos están volando`,
      `¡${n}! Buen día para premiar clientes`,
      `¡${n}! Tu club está creciendo`,
      `¡Hola ${n}! ¿Listos para fidelizar?`,
      `¡${n}! Tus clientes suman, vos ganás`,
      `¡${n}! Cada visita cuenta`,
      `¡Hola ${n}! Los premios llaman clientes`,
    ] : [
      `¡Hola! Tus clientes te esperan`,
      `¡Hola! Lindo día para fidelizar`,
      `¡Hola! A sumar visitas`,
      `¡Hola! Buen día para premiar clientes`,
    ]

    const options = type === 'commerce' ? commerceGreetings : clientGreetings

    const key  = `greeting_${type}`
    const last = sessionStorage.getItem(key)
    let idx
    do { idx = Math.floor(Math.random() * options.length) }
    while (idx === parseInt(last) && options.length > 1)
    sessionStorage.setItem(key, idx.toString())

    setGreeting(options[idx])
  }, [name, type])

  if (!greeting) return null

  return (
    <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, ...style }}>
      {greeting}
    </div>
  )
}

// ─── CHIP EMV DECORATIVO ─────────────────────────────────────────────────────
function ChipEMV() {
  return (
    <svg width="44" height="34" viewBox="0 0 44 34" fill="none" aria-hidden="true">
      {/* Base gold body */}
      <rect x="0.5" y="0.5" width="43" height="33" rx="4.5" fill="#C9A227" stroke="#8B6914" strokeWidth="0.8"/>
      {/* Top-left highlight — metallic sheen */}
      <rect x="0.5" y="0.5" width="43" height="11" rx="4.5" fill="rgba(255,245,160,0.22)"/>
      {/* Vertical contact grooves */}
      <rect x="14"   y="0.5" width="1.2" height="33" fill="#7A5200" opacity="0.55"/>
      <rect x="28.8" y="0.5" width="1.2" height="33" fill="#7A5200" opacity="0.55"/>
      {/* Horizontal contact grooves */}
      <rect x="0.5" y="10.5" width="43" height="1.2" fill="#7A5200" opacity="0.55"/>
      <rect x="0.5" y="22.3" width="43" height="1.2" fill="#7A5200" opacity="0.55"/>
      {/* Centre contact pad — darker gold */}
      <rect x="15.2" y="11.7" width="13.6" height="10.6" rx="1.5" fill="#A67C00"/>
      {/* Sheen stripe on centre pad */}
      <rect x="15.2" y="11.7" width="13.6" height="3.2" rx="1.5" fill="rgba(255,248,180,0.28)"/>
    </svg>
  )
}

// ─── BENEFIX WATERMARK ───────────────────────────────────────────────────────
function BenefixWatermark({ color = 'rgba(255,255,255,0.09)', size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <rect x="16" y="5.5" width="8" height="5" rx="2.5" fill={color}/>
      <rect x="16" y="12" width="9" height="5.5" rx="2.75" fill={color}/>
    </svg>
  )
}

// ─── WALLET CARD FRONT ───────────────────────────────────────────────────────
function WalletCardFront({ club, colors, onFlip, visible }) {
  const { commerce, points, stars } = club
  const isStars  = commerce?.prog_type === 'stars'
  const bal      = isStars ? (stars || 0) : (points || 0)
  const unit     = isStars ? 'ESTRELLAS' : 'PUNTOS'
  const initial  = (commerce?.name || '?')[0].toUpperCase()
  const catLabel = commerce?.category || null
  const rating   = REVIEWS_ENABLED ? commerce?.rating : null

  const now = new Date()
  const activePromo = (commerce?.promotions || []).find(p =>
    p.active && (!p.expires_at || new Date(p.expires_at) > now)
  )
  const promoBadge  = activePromo?.type === 'discount_next' ? `${activePromo.value}% OFF` : null
  const promoSub    = activePromo?.type === 'discount_next' ? 'PRÓX. VISITA' : null
  const doublePromo = (commerce?.promotions || []).find(p =>
    p.active && p.type === 'double_points' && (!p.expires_at || new Date(p.expires_at) > now))

  // Counting animation — runs each time front becomes visible
  const [displayBal,      setDisplayBal]      = useState(0)
  const [displayPromoVal, setDisplayPromoVal] = useState(0)
  const promoVal = activePromo?.type === 'discount_next' ? (activePromo.value || 0) : 0

  useEffect(() => {
    if (!visible) { setDisplayBal(0); setDisplayPromoVal(0); return }
    const duration = 650
    const t0 = performance.now()
    const ease = t => 1 - Math.pow(1 - t, 3)
    let raf
    const tick = now => {
      const p = Math.min((now - t0) / duration, 1)
      const e = ease(p)
      setDisplayBal(Math.round(bal * e))
      if (promoVal) setDisplayPromoVal(Math.round(promoVal * e))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, bal, promoVal])

  return (
    <div
      onClick={onFlip}
      style={{ width:'100%', height:'100%', borderRadius:20, background:colors.bg, overflow:'hidden', cursor: onFlip ? 'pointer' : 'default', position:'relative', userSelect:'none' }}
    >
      {/* Watermark — behind everything */}
      <div style={{ position:'absolute', right:'-6%', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:0 }}>
        <BenefixWatermark color={colors.watermark} size={220} />
      </div>

      {/* Content layer */}
      <div style={{ position:'absolute', inset:0, padding:'16px 22px 18px', display:'flex', flexDirection:'column', zIndex:1 }}>

        {/* Row 1: Logo top-left + metric top-right */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
          <CommerceLogo commerce={commerce} size={56} radius={11} />
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:FN, fontSize:44, fontWeight:900, color:colors.text, lineHeight:1, letterSpacing:'-0.03em', opacity:0.80 }}>+{displayBal}</div>
            <div style={{ fontFamily:FN, fontSize:12, fontWeight:700, color:colors.textSub, letterSpacing:'0.12em', marginTop:3, textTransform:'uppercase' }}>{unit}</div>
            {promoBadge && (
              <>
                <div style={{ fontFamily:FN, fontSize:19, fontWeight:900, color:colors.text, letterSpacing:'-0.01em', marginTop:6, opacity:0.80 }}>{activePromo?.type === 'discount_next' ? `${displayPromoVal}% OFF` : promoBadge}</div>
                <div style={{ fontFamily:FN, fontSize:11, fontWeight:700, color:colors.textSub, letterSpacing:'0.09em' }}>{promoSub}</div>
              </>
            )}
            {doublePromo && (
              <div style={{ marginTop:6, paddingTop:5, borderTop:`1px solid ${colors.detail}` }}>
                <div style={{ fontFamily:FN, fontSize:17, fontWeight:900, color:colors.text, letterSpacing:'-0.01em', lineHeight:1, opacity:0.80 }}>×2 {isStars ? 'ESTRELLAS' : 'PUNTOS'}</div>
                <div style={{ fontFamily:FN, fontSize:10, fontWeight:700, color:colors.textSub, letterSpacing:'0.09em', marginTop:2, textTransform:'uppercase' }}>{doublePromo.days || 'TODOS LOS DÍAS'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Spacer — pushes bottom group up from logo. */}
        <div style={{ flex:1, minHeight:8 }} />

        {/* Row 2: Chip (gold, standalone) */}
        <div style={{ flexShrink:0 }}>
          <ChipEMV />
        </div>

        {/* Row 3: 12 masked dots + balance */}
        <div style={{ marginTop:5, flexShrink:0, fontFamily:'monospace', fontSize:13, fontWeight:500, color:colors.text, letterSpacing:'0.18em', opacity:0.45, display:'flex', alignItems:'baseline', gap:10 }}>
          <span>{'●●●● ●●●● ●●●●'}</span>
          <span style={{ fontFamily:FN, fontSize:18, fontWeight:800, letterSpacing:'0.02em' }}>{displayBal}</span>
        </div>

        {/* Row 4: Name + rating/category */}
        <div style={{ marginTop:5, flexShrink:0, minWidth:0 }}>
          <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:colors.text, letterSpacing:'0.03em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.1 }}>
            {commerce?.name}
          </div>
          {(rating || catLabel) && (
            <div style={{ fontFamily:FN, fontSize:12, color:colors.textSub, letterSpacing:'0.05em', marginTop:3, display:'flex', alignItems:'center', gap:4, flexWrap:'nowrap', overflow:'hidden', opacity:0.55 }}>
              {rating && <span style={{ display:'flex', alignItems:'center', gap:2 }}><Star size={11} fill="#FBBC04" color="#FBBC04" strokeWidth={0} />{rating}</span>}
              {rating && catLabel && <span style={{ opacity:0.40 }}>&nbsp;|&nbsp;</span>}
              {catLabel && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{catLabel.toUpperCase()}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── WALLET CARD BACK ────────────────────────────────────────────────────────
function WalletCardBack({ club, colors, onFlip, userId }) {
  const { commerce, points, stars, client_promotions } = club
  const isStars = commerce?.prog_type === 'stars'
  const [showQr, setShowQr] = useState(false)
  const bal     = isStars ? (stars || 0) : (points || 0)
  const unit    = isStars ? 'ESTRELLAS' : 'PUNTOS'
  const initial = (commerce?.name || '?')[0].toUpperCase()

  const now = new Date()
  const activePromo = (commerce?.promotions || []).find(p =>
    p.active && (!p.expires_at || new Date(p.expires_at) > now)
  )
  // Cupón del cliente — solo cuenta si status='active' Y todavía no venció.
  // Si quedó como 'used' o 'declined' (porque el dueño no le renovó tras
  // canjearlo), o si pasó la fecha, el badge desaparece.
  const clientPromo = activePromo
    ? (client_promotions || []).find(cp =>
        cp.promotion_id === activePromo?.id
        && cp.status === 'active'
        && (!cp.expires_at || new Date(cp.expires_at) > now)
      )
    : null
  const promoExpiry = (clientPromo?.expires_at || activePromo?.expires_at)
    ? new Date(clientPromo?.expires_at || activePromo.expires_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit' })
    : null

  const promoBadge = activePromo
    ? (activePromo.type === 'discount_next' ? `${activePromo.value}% OFF` : '×2 PTS')
    : null
  const promoSub = activePromo
    ? (activePromo.type === 'discount_next' ? 'PRÓX. VISITA' : 'SUMA DOBLE')
    : null

  const toNext = commerce?.prog_goal > 0 ? Math.max(0, commerce.prog_goal - bal) : null

  const divider = <div style={{ height:1, background:colors.detail, margin:'5px 0 4px' }} />

  return (
    <div
      onClick={onFlip}
      style={{ width:'100%', height:'100%', borderRadius:20, background:colors.bg, overflow:'hidden', cursor:'pointer', position:'relative', userSelect:'none' }}
    >
      {/* QR overlay */}
      {showQr && (
        <div
          onClick={e => { e.stopPropagation(); setShowQr(false) }}
          style={{ position:'absolute', inset:0, background:colors.bg, borderRadius:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:20, backdropFilter:'blur(4px)' }}
        >
          <div style={{ background:'#fff', padding:12, borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.40)' }}>
            <QRCodeSVG value={`CLUB-${userId || 'demo'}`} size={110} bgColor="#ffffff" fgColor="#0a0a0a" level="M" />
          </div>
          <div style={{ fontFamily:FN, fontSize:11, color:colors.textSub, marginTop:10, opacity:0.65 }}>tap para cerrar</div>
        </div>
      )}

      {/* Watermark */}
      <div style={{ position:'absolute', right:'-6%', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:0 }}>
        <BenefixWatermark color={colors.watermark} size={220} />
      </div>

      <div style={{ position:'absolute', inset:0, padding:'16px 22px 18px', display:'flex', flexDirection:'column', justifyContent:'space-between', zIndex:1 }}>

        {/* Row 1: Logo */}
        <CommerceLogo commerce={commerce} size={56} radius={11} />

        {/* Row 2: Two data blocks */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, minWidth:0 }}>
          {/* Left: balance */}
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:FN, fontSize:23, fontWeight:900, color:colors.text, lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>+{bal}</div>
            <div style={{ fontFamily:FN, fontSize:10, fontWeight:700, color:colors.textSub, letterSpacing:'0.10em', marginTop:2 }}>{unit}</div>
            {divider}
            <div style={{ fontFamily:FN, fontSize:9, fontWeight:600, color:colors.textSub, letterSpacing:'0.08em', textTransform:'uppercase' }}>VENCIMIENTO</div>
            <div style={{ fontFamily:FN, fontSize:12, fontWeight:800, color:colors.text, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Sin vencimiento</div>
          </div>

          {/* Right: promo or next prize */}
          <div style={{ minWidth:0 }}>
            {promoBadge ? (
              <>
                <div style={{ fontFamily:FN, fontSize:23, fontWeight:900, color:colors.text, lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{promoBadge}</div>
                <div style={{ fontFamily:FN, fontSize:10, fontWeight:700, color:colors.textSub, letterSpacing:'0.08em', marginTop:2 }}>{promoSub}</div>
                {divider}
                <div style={{ fontFamily:FN, fontSize:9, fontWeight:600, color:colors.textSub, letterSpacing:'0.08em', textTransform:'uppercase' }}>VENCIMIENTO</div>
                <div style={{ fontFamily:FN, fontSize:12, fontWeight:800, color:colors.text, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{promoExpiry || 'Sin vencimiento'}</div>
              </>
            ) : toNext !== null ? (
              <>
                <div style={{ fontFamily:FN, fontSize:23, fontWeight:900, color:colors.text, lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{toNext}</div>
                <div style={{ fontFamily:FN, fontSize:10, fontWeight:700, color:colors.textSub, letterSpacing:'0.08em', marginTop:2 }}>PARA PREMIO</div>
                {divider}
                <div style={{ fontFamily:FN, fontSize:9, fontWeight:600, color:colors.textSub, letterSpacing:'0.08em', textTransform:'uppercase' }}>OBJETIVO</div>
                <div style={{ fontFamily:FN, fontSize:12, fontWeight:800, color:colors.text, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{commerce.prog_goal} {isStars ? 'est.' : 'pts'}</div>
              </>
            ) : null}
          </div>
        </div>

        {/* Row 3: CTA — stopPropagation wrapper prevents flip */}
        <div onClick={e => e.stopPropagation()} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button
            onClick={e => { e.stopPropagation(); setShowQr(true) }}
            style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:`1px solid ${colors.detail}`, borderRadius:8, padding:'6px 10px', cursor:'pointer', fontFamily:FN, fontSize:12, fontWeight:700, color:colors.text, opacity:0.75 }}
          >
            <QrCode size={13} strokeWidth={2} color={colors.text} />
            Mi QR
          </button>
          {commerce?.slug
            ? <a
                href={`/club/${commerce.slug}`}
                onClick={e => e.stopPropagation()}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  background: colors.text,
                  color: colors.bg,
                  padding:'7px 14px',
                  borderRadius:9,
                  fontFamily:FN,
                  fontSize:12,
                  fontWeight:800,
                  letterSpacing:'0.06em',
                  textTransform:'uppercase',
                  textDecoration:'none',
                  boxShadow:`0 4px 14px ${colors.text}40`,
                }}
              >
                <span>Ir al club</span>
                <ArrowRight size={13} strokeWidth={2.5} color={colors.bg} />
              </a>
            : <span style={{ fontFamily:FN, fontSize:11, color:colors.textSub, opacity:0.40 }}>tap para volver</span>
          }
        </div>
      </div>
    </div>
  )
}

// ─── WALLET CARD (flip container) ────────────────────────────────────────────
function WalletCard({ club, variant, isActive, onScrollTo, isMock, userId }) {
  const [flipped, setFlipped] = useState(false)
  // Si el usuario ya tocó la tarjeta, cancelamos el auto-flip de descubrimiento.
  const userTouchedRef = useRef(false)

  useEffect(() => {
    if (!isActive) {
      setFlipped(false)
      userTouchedRef.current = false
      return
    }
    // Demo de descubrimiento: a los 2s la tarjeta se da vuelta sola, y a los 4s
    // vuelve sola a su posición original. Sirve para que el usuario entienda
    // que la tarjeta es giratoria. Si tocó antes, cancelamos toda la secuencia.
    const flipTimer = setTimeout(() => {
      if (!userTouchedRef.current) setFlipped(true)
    }, 2000)
    const unflipTimer = setTimeout(() => {
      if (!userTouchedRef.current) setFlipped(false)
    }, 4000)
    return () => {
      clearTimeout(flipTimer)
      clearTimeout(unflipTimer)
    }
  }, [isActive])

  const base     = club.commerce?.brand_color || hashToCardColor(club.commerce?.name || '')
  const colors   = cardColors(base)
  const flipCard = isActive
    ? () => { userTouchedRef.current = true; setFlipped(f => !f) }
    : undefined

  if (variant === 'peek') {
    return (
      <button
        onClick={onScrollTo}
        aria-label={`Ver ${club.commerce?.name}`}
        style={{ width:'100%', height:72, overflow:'hidden', borderRadius:'18px 18px 6px 6px', border:'none', padding:0, cursor:'pointer', opacity:0.76, display:'block' }}
      >
        <div style={{ width:'100%', paddingTop:'63.04%', position:'relative' }}>
          <div style={{ position:'absolute', inset:0 }}>
            <WalletCardFront club={club} colors={colors} onFlip={() => {}} />
          </div>
        </div>
      </button>
    )
  }

  // variant === 'active'
  return (
    <div>
      <div
        className="card-flip-scene"
        style={{ boxShadow:'0 20px 44px rgba(0,0,0,0.48), 0 4px 12px rgba(0,0,0,0.28)', borderRadius:20 }}
      >
        {/* Aspect-ratio container */}
        <div style={{ width:'100%', paddingTop:'63.04%', position:'relative' }}>
          {/* Flip inner */}
          <div
            className={`card-flip-inner${flipped ? ' flipped' : ''}`}
            style={{ position:'absolute', inset:0 }}
          >
            {/* Front */}
            <div aria-hidden={flipped} className="card-face">
              <WalletCardFront club={club} colors={colors} onFlip={flipCard} visible={!flipped && isActive} />
            </div>
            {/* Back */}
            <div aria-hidden={!flipped} className="card-face card-face-back">
              <WalletCardBack club={club} colors={colors} onFlip={flipCard} userId={userId} />
            </div>
          </div>
          {/* Glass rim — above card faces */}
          <div style={{ position:'absolute', inset:0, borderRadius:20, border:'1px solid rgba(255,255,255,0.14)', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.22)', pointerEvents:'none', zIndex:100 }} />
        </div>
      </div>

      {isMock && (
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.30)', display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
          <Eye size={12} strokeWidth={2} />
          Vista previa — unite a un negocio para ver tus datos reales
        </div>
      )}
    </div>
  )
}

// ─── WALLET VIEW (cylindrical 3D carousel — infinite, rAF-driven) ─────────────
function WalletView({ clubs, isMock, userId }) {
  const [stageW,     setStageW]    = useState(0)
  const [visualPos,  setVisualPos] = useState(0)   // float — drives all transforms
  const containerRef = useRef(null)
  const touchStartY  = useRef(null)
  const targetPos    = useRef(0)   // where we're heading (accumulates infinitely)
  const currentPos   = useRef(0)   // mirrors visualPos for rAF (avoids stale closure)
  const rafId        = useRef(null)
  const wheelAccum   = useRef(0)
  const wheelReset   = useRef(null)

  const n = clubs.length

  useEffect(() => {
    const compute = () => { if (containerRef.current) setStageW(containerRef.current.offsetWidth) }
    compute()
    const ro = new ResizeObserver(compute)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Cleanup on unmount
  useEffect(() => () => { cancelAnimationFrame(rafId.current); clearTimeout(wheelReset.current) }, [])

  // rAF spring: lerp currentPos → targetPos, push to React state once per frame
  const startAnim = useCallback(() => {
    if (rafId.current) return
    const tick = () => {
      const diff = targetPos.current - currentPos.current
      if (Math.abs(diff) < 0.005) {
        currentPos.current = targetPos.current
        setVisualPos(targetPos.current)
        rafId.current = null
        return
      }
      currentPos.current += diff * 0.19   // lerp factor — tune for feel
      setVisualPos(currentPos.current)
      rafId.current = requestAnimationFrame(tick)
    }
    rafId.current = requestAnimationFrame(tick)
  }, [])

  // navigate: push targetPos further, kick off animation
  const navigate = useCallback((steps) => {
    targetPos.current += steps
    startAnim()
  }, [startAnim])

  // Non-passive wheel — accumulate deltaY, advance N cards per threshold
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const THRESHOLD = 60
    const onWheel = (e) => {
      e.preventDefault()
      wheelAccum.current += e.deltaY
      const steps = Math.trunc(wheelAccum.current / THRESHOLD)
      if (steps !== 0) { navigate(steps); wheelAccum.current -= steps * THRESHOLD }
      clearTimeout(wheelReset.current)
      wheelReset.current = setTimeout(() => { wheelAccum.current = 0 }, 200)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [navigate])

  // Touch — swipe distance → card count
  const handleTouchStart = useCallback((e) => { touchStartY.current = e.touches[0].clientY }, [])
  const handleTouchEnd   = useCallback((e) => {
    if (touchStartY.current === null) return
    const delta  = touchStartY.current - e.changedTouches[0].clientY
    const cardH_ = stageW > 0 ? Math.round(stageW * 0.6304) : 220
    const steps  = Math.round(delta / (cardH_ * 0.45))
    if (steps !== 0) navigate(steps)
    touchStartY.current = null
  }, [navigate, stageW])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowDown') navigate(1)
      else if (e.key === 'ArrowUp') navigate(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  if (n === 1) return <WalletCard club={clubs[0]} variant="active" isActive isMock={isMock} userId={userId} />

  const cardH      = stageW > 0 ? Math.round(stageW * 0.6304) : 220
  const containerH = cardH + 90

  // Derive active card from settled position (round)
  const activeIndex = ((Math.round(visualPos) % n) + n) % n

  return (
    <div ref={containerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
         style={{ position:'relative', height:containerH, overflow:'hidden',
                  perspective:'900px', perspectiveOrigin:'50% 50%', touchAction:'none' }}>
      {clubs.map((club, i) => {
        // Float circular offset — proper modulo so it works for any visualPos value
        let offset = ((i - visualPos) % n + n) % n   // normalize to [0, n)
        if (offset > n / 2) offset -= n              // shift to [-n/2, n/2]

        const abs  = Math.abs(offset)
        const sign = Math.sign(offset) || 1

        // Interpolate transforms from the float offset (no CSS transitions needed)
        let ty, rx, tz, op, sc
        if (abs <= 1) {
          ty = sign * cardH * 0.82 * abs
          rx = -sign * 48 * abs
          tz = -120 * abs
          op = 1 - 0.35 * abs
          sc = 1 - 0.10 * abs
        } else if (abs <= 2) {
          const t = abs - 1
          ty = sign * cardH * (0.82 + 0.73 * t)
          rx = -sign * (48 + 32 * t)
          tz = -(120 + 160 * t)
          op = 0.65 * (1 - t)
          sc = 0.90
        } else {
          ty = sign * cardH * 1.55; rx = -sign * 80; tz = -280; op = 0; sc = 0.90
        }

        const isActive  = i === activeIndex
        const transform = abs < 0.004 ? 'none'
          : `translateY(${ty}px) rotateX(${rx}deg) translateZ(${tz}px) scale(${sc})`

        return (
          <div key={club.id}
               onClick={!isActive ? () => navigate(Math.round(offset)) : undefined}
               style={{
                 position:     'absolute',
                 top:          '50%',
                 left:         0,
                 right:        0,
                 marginTop:    `-${Math.round(cardH / 2)}px`,
                 transform,
                 transition:   'none',   // rAF drives this — CSS transitions would fight it
                 opacity:      Math.max(0, Math.min(1, op)),
                 zIndex:       isActive ? 10 : Math.max(1, 5 - Math.floor(abs)),
                 cursor:       isActive ? 'default' : 'pointer',
                 pointerEvents: abs <= 1.5 ? 'auto' : 'none',
               }}>
            <WalletCard club={club} variant="active" isActive={isActive} isMock={isActive && isMock} userId={userId} />
          </div>
        )
      })}
    </div>
  )
}

// ─── FILTER PILLS ─────────────────────────────────────────────────────────────
function FilterPills({ pills, selected, onSelect, label, size }) {
  const rowRef  = useRef(null)
  const isLarge = size === 'lg'

  function handleKeyDown(e) {
    const btns = [...rowRef.current.querySelectorAll('button')]
    const idx  = btns.indexOf(document.activeElement)
    if (e.key === 'ArrowRight') { e.preventDefault(); btns[(idx + 1) % btns.length]?.focus() }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); btns[(idx - 1 + btns.length) % btns.length]?.focus() }
  }

  // Wrapper externo: ancho máximo igual al contenedor padre, clip + scroll
  // horizontal forzado. Inner: width:max-content + flex-wrap:nowrap garantiza
  // que los pills NO se distribuyan en varias filas — siempre una sola línea
  // con scroll horizontal. Antes algunos navegadores (Safari iOS especialmente)
  // permitían wrap en ciertos contextos cuando el padre era flex column.
  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
      // Scroll snap suave para que al deslizar quede algún chip alineado.
      scrollSnapType: 'x proximity',
    }}>
      <div
        role="radiogroup"
        aria-label={label}
        ref={rowRef}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 6,
          width: 'max-content',
          minWidth: '100%',
          paddingBottom: 4,
          paddingRight: 4,
          opacity: isLarge ? 1 : 0.82,
        }}
      >
        {pills.map(p => {
          const active = p === selected
          const text   = p !== 'Todos' && p.length > 20 ? p.slice(0, 19) + '…' : p
          return (
            <div
              key={p}
              role="radio"
              aria-checked={active}
              tabIndex={0}
              onClick={() => onSelect(p)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(p) } }}
              style={{
                flexShrink:   0,
                scrollSnapAlign: 'start',
                padding:      isLarge ? '8px 14px' : '6px 12px',
                borderRadius: isLarge ? 18 : 16,
                fontSize:     isLarge ? 13 : 11,
                fontFamily:   FN,
                fontWeight:   active ? 700 : 500,
                // Activo: outline + relleno fucsia tenue. Inactivo: outline gris
                // sin relleno (mismo formato pero más sutil).
                color:        active ? '#EC4899' : 'rgba(255,255,255,0.50)',
                background:   active ? 'rgba(236,72,153,0.10)' : 'transparent',
                border:       `1.5px solid ${active ? '#EC4899' : 'rgba(255,255,255,0.30)'}`,
                cursor:       'pointer',
                transition:   'all 150ms ease',
                whiteSpace:   'nowrap',
                lineHeight:   1,
                display:      'inline-flex',
                alignItems:   'center',
                gap:          6,
              }}
            >
              {text}
              {/* ✕ solo en tags activos que NO sean "Todos". Click → vuelve a "Todos". */}
              {active && p !== 'Todos' && (
                <span
                  role="button"
                  aria-label="Quitar filtro"
                  onClick={e => { e.stopPropagation(); onSelect('Todos') }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: isLarge ? 16 : 14, height: isLarge ? 16 : 14, borderRadius: '50%',
                    background: 'rgba(236,72,153,0.20)', color: '#EC4899',
                    fontSize: isLarge ? 11 : 9, fontWeight: 800, cursor: 'pointer', lineHeight: 1,
                  }}
                >×</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── CLIENT PORTAL ────────────────────────────────────────────────────────────
function ClientView({ setView, user, profile, onLogout }) {
  const [tab, setTab] = useState('mis clubs')
  const [memberships, setMemberships] = useState([])
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [passQrUrl, setPassQrUrl] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)
  // Mi cuenta state
  const [acctForm,   setAcctForm]   = useState({ name: profile?.name || '', phone: profile?.phone || '' })
  const [acctSaving, setAcctSaving] = useState(false)
  const [acctStats,  setAcctStats]  = useState(null)
  // Cartel "¿Tenés un negocio?" — máquina de estados con 2 ubicaciones:
  //   top-collapsed   → arriba, primera vez, con Sí/No
  //   top-expanded    → arriba, después de tocar Sí, con texto + link
  //   bottom-collapsed/expanded → abajo de "Guardar cambios", versión compacta
  //                                con flecha desplegable (sin Sí/No)
  // Si tocó "No" o "Sí" en una sesión previa, arranca directo en bottom-collapsed.
  // Persistencia: localStorage guarda answer ('yes'|'no'). Solo un cartel
  // visible a la vez (nunca duplicado).
  const [bizState, setBizState] = useState(() => {
    if (typeof window === 'undefined') return 'top-collapsed'
    try {
      const answer = localStorage.getItem('benefix:bizAnswer')
      if (answer === 'yes' || answer === 'no') return 'bottom-collapsed'
      return 'top-collapsed'
    } catch { return 'top-collapsed' }
  })

  function bizAnswerYes() {
    try { localStorage.setItem('benefix:bizAnswer', 'yes') } catch {}
    setBizState('top-expanded')
  }
  function bizAnswerNo() {
    try { localStorage.setItem('benefix:bizAnswer', 'no') } catch {}
    // Movimiento inmediato a la posición de abajo, compacto.
    setBizState('bottom-collapsed')
  }
  function bizToggleBottom() {
    setBizState(s => s === 'bottom-expanded' ? 'bottom-collapsed' : 'bottom-expanded')
  }
  const supabase = getSupabase()

  // Club filters
  const [filterCity,     setFilterCity]     = useState('Todos')
  const [filterCategory, setFilterCategory] = useState('Todos')

  // El bloque de filtros + wallet usa position:sticky para que, al hacer scroll
  // hacia abajo, el saludo + header se oculten naturalmente y el bloque se
  // pegue al tope del viewport. Para volver a verlos, scroll hacia arriba.
  // No usamos focusMode ni back arrow — todo es scroll nativo.

  // Restore filters from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('benefix:clubsFilter') || '{}')
      if (saved.city)     setFilterCity(saved.city)
      if (saved.category) setFilterCategory(saved.category)
    } catch {}
  }, [])

  // Persist filters
  useEffect(() => {
    try { localStorage.setItem('benefix:clubsFilter', JSON.stringify({ city: filterCity, category: filterCategory })) } catch {}
  }, [filterCity, filterCategory])

  const refresh = useCallback(() => { setRefreshTick(t => t + 1) }, [])

  useEffect(() => {
    if (!user?.id) return
    makeQR(`CLUB-${user.id}`, { width: 220, margin: 2, dark: '#000000', light: '#FFFFFF' })
      .then(setPassQrUrl)
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      supabase.from('memberships').select('*, commerce:commerces(id,name,img_url,slug,prog_type,prog_goal,category,city_name,brand_color,rating,promotions(id,type,value,description,days,expires_at,active,expiration_type,expiration_days),prizes(id,name,cost,img_url,system_type,active,stock)), client_promotions(id,promotion_id,expires_at,granted_at,used_at,status)').eq('user_id', user.id),
      supabase.from('visits').select('*, commerce:commerces(name, img_url)').eq('user_id', user.id).order('scanned_at', { ascending:false }).limit(20),
    ]).then(([{ data:m }, { data:v }]) => {
      setMemberships(m || [])
      setVisits(v || [])
      setLoading(false)
    })
  }, [user, refreshTick])

  // Auto-refresh: cuando la pestaña vuelve a estar visible (el cliente
  // minimizó la app, atendió otro cliente, volvió), refrescamos los clubs
  // para que los cupones, balance y descuentos reflejen lo que pasó mientras
  // tanto. Dispara el refreshTick que reactiva el useEffect de arriba.
  useEffect(() => {
    if (!user) return
    function maybeRefresh() {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        setRefreshTick(t => t + 1)
      }
    }
    document.addEventListener('visibilitychange', maybeRefresh)
    window.addEventListener('focus', maybeRefresh)
    // También escuchamos las notificaciones-push del SW: cuando llega un push
    // (visita registrada, descuento canjeado, etc.) seguramente algo cambió
    // en la DB, así que refrescamos.
    function onSwMsg(e) {
      if (e.data?.type === 'benefix:notification') setRefreshTick(t => t + 1)
    }
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', onSwMsg)
    }
    return () => {
      document.removeEventListener('visibilitychange', maybeRefresh)
      window.removeEventListener('focus', maybeRefresh)
      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', onSwMsg)
      }
    }
  }, [user])

  // Sync form when profile prop updates
  useEffect(() => {
    setAcctForm({ name: profile?.name || '', phone: profile?.phone || '' })
  }, [profile])

  // Escucha 'benefix:set-tab' — lo dispara el nav de pestañas montado en otras
  // vistas (ej: ClientQRView dentro de view='scanner') para cambiar la pestaña
  // del cliente al volver acá.
  useEffect(() => {
    function onSetTab(e) {
      const next = e.detail?.tab
      if (next) setTab(next)
    }
    window.addEventListener('benefix:set-tab', onSetTab)
    return () => window.removeEventListener('benefix:set-tab', onSetTab)
  }, [])

  // Cada vez que el tab cambia, le avisamos al Navbar global para que pueda
  // sincronizar el highlight (botón persona arriba ↔ tabs del nav inferior).
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('benefix:client-tab-changed', { detail: { tab } }))
  }, [tab])

  // Load account stats when "cuenta" tab is first opened
  useEffect(() => {
    if (tab !== 'cuenta' || acctStats || !user) return
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      if (d.ok) setAcctStats(d.profile)
    })
  }, [tab, user])

  const initials = profile?.name ? profile.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '??'

  const isMockClient = !loading && memberships.length === 0
  const mockMemberships = [
    { id:'mock-mb1', commerce_id:'mock-c1', stars:0, points:340, visits_count:8,
      commerce:{ id:'mock-c1', name:'Café Berlín', img_url:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMkExNTA4Ii8+PHBhdGggZD0iTTkgMTZoMTZsLTIgMTBIMTF6IiBmaWxsPSIjQzQ3QjM1Ii8+PHJlY3QgeD0iOSIgeT0iMTYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIzIiByeD0iMSIgZmlsbD0iI0Q5OTM0RiIvPjxwYXRoIGQ9Ik0yNSAxOCBRMzEgMTkgMzEgMjQgUTMxIDI5IDI1IDI5IiBzdHJva2U9IiNDNDdCMzUiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGVsbGlwc2UgY3g9IjE3IiBjeT0iMjciIHJ4PSI5IiByeT0iMiIgZmlsbD0iIzlBNUMxRiIvPjxwYXRoIGQ9Ik0xNCAxNCBRMTUgMTEgMTQgOSIgc3Ryb2tlPSIjQzg3OTQxIiBzdHJva2Utd2lkdGg9IjEuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTE4IDE0IFExOSAxMSAxOCA5IiBzdHJva2U9IiNDODc5NDEiIHN0cm9rZS13aWR0aD0iMS41IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMjIgMTQgUTIzIDExIDIyIDkiIHN0cm9rZT0iI0M4Nzk0MSIgc3Ryb2tlLXdpZHRoPSIxLjUiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==', slug:'cafe-berlin', prog_type:'points', prog_goal:500, category:'Cafetería', city_name:'Buenos Aires', rating:4.8,
        promotions:[{ id:'mp1', type:'discount_next', value:10, active:true, expires_at:null }] } },
    { id:'mock-mb2', commerce_id:'mock-c2', stars:3, points:0, visits_count:3,
      commerce:{ id:'mock-c2', name:'Barbería Premium', img_url:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMTExNDE5Ii8+PGNpcmNsZSBjeD0iMTMiIGN5PSIxMiIgcj0iNC41IiBzdHJva2U9IiNBMEIwQzgiIHN0cm9rZS13aWR0aD0iMS41IiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iMjciIGN5PSIxMiIgcj0iNC41IiBzdHJva2U9IiNBMEIwQzgiIHN0cm9rZS13aWR0aD0iMS41IiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iMTMiIGN5PSIxMiIgcj0iMS44IiBmaWxsPSIjQTBCMEM4Ii8+PGNpcmNsZSBjeD0iMjciIGN5PSIxMiIgcj0iMS44IiBmaWxsPSIjQTBCMEM4Ii8+PGxpbmUgeDE9IjE3IiB5MT0iMTUiIHgyPSIyOSIgeTI9IjMwIiBzdHJva2U9IiNBMEIwQzgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGxpbmUgeDE9IjIzIiB5MT0iMTUiIHgyPSIxMSIgeTI9IjMwIiBzdHJva2U9IiNBMEIwQzgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+', slug:'barberia-premium', prog_type:'stars', prog_goal:10, category:'Barbería', city_name:'Gral. Pico', rating:4.9,
        promotions:[{ id:'mp2', type:'double_points', active:true, expires_at: new Date(Date.now()+2*864e5).toISOString() }] } },
    { id:'mock-mb3', commerce_id:'mock-c3', stars:0, points:180, visits_count:4,
      commerce:{ id:'mock-c3', name:'Heladería Coppola', img_url:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMEQxRTJBIi8+PHBhdGggZD0iTTIwIDM1IEwxNCAyMSBIMjYgWiIgZmlsbD0iI0RCQTA2QSIvPjxsaW5lIHgxPSIyMCIgeTE9IjIxIiB4Mj0iMjAiIHkyPSIzNSIgc3Ryb2tlPSIjQzg4OTRFIiBzdHJva2Utd2lkdGg9IjEuMiIvPjxsaW5lIHgxPSIxNyIgeTE9IjI0IiB4Mj0iMjMiIHkyPSIyNCIgc3Ryb2tlPSIjQzg4OTRFIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iMTciIHkxPSIyOCIgeDI9IjIzIiB5Mj0iMjgiIHN0cm9rZT0iI0M4ODk0RSIgc3Ryb2tlLXdpZHRoPSIxIi8+PGVsbGlwc2UgY3g9IjIwIiBjeT0iMjEiIHJ4PSI2IiByeT0iNiIgZmlsbD0iIzVFQzhDMCIvPjxlbGxpcHNlIGN4PSIyMCIgY3k9IjE1IiByeD0iNSIgcnk9IjUiIGZpbGw9IiNGRjkwOTAiLz48Y2lyY2xlIGN4PSIyMiIgY3k9IjEyIiByPSIzIiBmaWxsPSIjRkZCMEIwIi8+PC9zdmc+', slug:'heladeria-coppola', prog_type:'points', prog_goal:300, category:'Heladería', city_name:'Buenos Aires', rating:4.7,
        promotions:[] } },
  ]
  const mockVisits = [
    { id:'mock-v1', commerce:{ name:'Café Berlín',      img_url:null }, amount_spent:850,  scanned_at: new Date(Date.now()-1*864e5).toISOString(),  prog_type:'points', points_earned:100 },
    { id:'mock-v2', commerce:{ name:'Barbería Premium', img_url:null }, amount_spent:2500, scanned_at: new Date(Date.now()-3*864e5).toISOString(),  prog_type:'stars',  points_earned:1   },
    { id:'mock-v3', commerce:{ name:'Café Berlín',      img_url:null }, amount_spent:650,  scanned_at: new Date(Date.now()-5*864e5).toISOString(),  prog_type:'points', points_earned:100 },
    { id:'mock-v4', commerce:{ name:'Heladería Coppola',img_url:null }, amount_spent:980,  scanned_at: new Date(Date.now()-8*864e5).toISOString(),  prog_type:'points', points_earned:100 },
    { id:'mock-v5', commerce:{ name:'Café Berlín',      img_url:null }, amount_spent:720,  scanned_at: new Date(Date.now()-12*864e5).toISOString(), prog_type:'points', points_earned:100 },
    { id:'mock-v6', commerce:{ name:'Barbería Premium', img_url:null }, amount_spent:2500, scanned_at: new Date(Date.now()-18*864e5).toISOString(), prog_type:'stars',  points_earned:1   },
  ]
  const displayMemberships = isMockClient ? mockMemberships : memberships
  const displayVisits      = isMockClient ? mockVisits      : visits
  const totalVisits        = displayVisits.length

  // Filter pill data — derived from real (or mock) memberships.
  // Para categorías leemos `categories` (array, nuevo) con fallback a
  // `category` (string, legacy). Un comercio con 3 categorías hace que las
  // 3 aparezcan en los pills de filtro y que cualquiera lo matchee.
  const _baseForFilters = displayMemberships
  const _allCities   = _baseForFilters.map(m => m.commerce?.city_name).filter(Boolean)
  const _allCats     = _baseForFilters.flatMap(m => {
    const arr = Array.isArray(m.commerce?.categories) && m.commerce.categories.length > 0
      ? m.commerce.categories
      : (m.commerce?.category ? [m.commerce.category] : [])
    return arr
  }).filter(Boolean)
  const _cityFreq    = {}; _allCities.forEach(c => { _cityFreq[c]  = (_cityFreq[c]  || 0) + 1 })
  const _catFreq     = {}; _allCats.forEach(c   => { _catFreq[c]   = (_catFreq[c]   || 0) + 1 })
  const _uniqueCities = [...new Set(_allCities)].sort((a,b) => (_cityFreq[b]||0) - (_cityFreq[a]||0))
  const _uniqueCats   = [...new Set(_allCats)].sort((a,b) => (_catFreq[b]||0) - (_catFreq[a]||0))
  const cityPills     = _uniqueCities.length >= 1 ? ['Todos', ..._uniqueCities] : null
  const categoryPills = _uniqueCats.length   >= 1 ? ['Todos', ..._uniqueCats]   : null

  // Validated active filters (fall back to 'Todos' if value no longer in set)
  const safeCity    = cityPills     && cityPills.includes(filterCity)     ? filterCity     : 'Todos'
  const safeCategory= categoryPills && categoryPills.includes(filterCategory) ? filterCategory : 'Todos'
  const filtersActive = safeCity !== 'Todos' || safeCategory !== 'Todos'

  // Filtered clubs for the wallet — el match de categoría busca en el array
  // completo (un comercio matchea si CUALQUIERA de sus categorías coincide).
  const filteredMemberships = displayMemberships.filter(m => {
    const cityOk = safeCity === 'Todos' || m.commerce?.city_name === safeCity
    const cats = Array.isArray(m.commerce?.categories) && m.commerce.categories.length > 0
      ? m.commerce.categories
      : (m.commerce?.category ? [m.commerce.category] : [])
    const catOk  = safeCategory === 'Todos' || cats.includes(safeCategory)
    return cityOk && catOk
  })

  function clearFilters() { setFilterCity('Todos'); setFilterCategory('Todos') }

  const glass = { background:'rgba(255,255,255,0.03)', border:'none', borderRadius:16, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.07)', position:'relative', overflow:'hidden' }

  if (!user) return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, marginBottom:12 }}>Necesitás iniciar sesión</div>
      <div style={{ color:'rgba(255,255,255,0.5)', fontSize:13, marginBottom:20 }}>Usá tu cuenta de Google para acceder a tu portal.</div>
    </div>
  )

  // ── HelpBanner por tab ──
  // El cartel siempre va inmediatamente debajo del navbar (antes del header
  // card con avatar/nombre), por eso lo declaramos arriba y centralizamos
  // el copy por pestaña. Cuando hay `details` aparece "Ver más" inline al
  // final de la 2da línea; sino se muestra solo el body en 1-2 líneas.
  const TAB_HELP = {
    'mis clubs': {
      id:    'client-mis-clubs',
      title: 'Tu billetera',
      body:  'Cada tarjeta es un negocio donde sos socio.',
      details: <>Tocá una para ver puntos, premios y promos. Si tenés varias usá los chips de arriba para filtrar por ciudad o rubro.</>,
    },
    'premios': {
      id:    'client-premios',
      title: 'Tus premios',
      body:  'Lista de todo lo que podés canjear con tu saldo en cada club.',
      details: <>Aparecen ordenados por "más cerca de canjear". Tocá uno para ver el detalle y el saldo que te queda después.</>,
    },
    'historial': {
      id:    'client-historial',
      title: 'Historial',
      body:  'Todas tus visitas, canjes y descuentos en un solo lugar.',
      details: <>Cada fila te dice cuándo, en qué local y qué pasó (ganaste estrellas/puntos, canjeaste un premio o usaste un descuento).</>,
    },
    'mi qr': {
      id:    'client-mi-qr',
      title: 'Tu QR personal',
      body:  'Único e igual para todos los clubes. Mostralo en caja para sumar visita.',
      details: <>El comerciante lo escanea desde su panel y queda registrada la visita en su sistema. No hace falta una tarjeta por club.</>,
    },
    'cuenta': {
      id:    'client-cuenta',
      title: 'Tu cuenta',
      body:  'Tus datos personales, resumen de actividad y opciones de la cuenta.',
      details: <>Cambiá tu nombre, agregá tu teléfono (te reconocen comercios donde tenías saldo precargado), cerrá sesión o eliminá tu cuenta. Más abajo está el botón para volver a ver todos los carteles de ayuda.</>,
    },
  }
  const helpForTab = TAB_HELP[tab]

  return (
    <div style={{ maxWidth:520, margin:'0 auto', padding:'58px 15px 24px' }}>

      {/* Cartel de ayuda — SIEMPRE primero, inmediatamente debajo del navbar.
          Cambia su contenido según la pestaña activa. */}
      {helpForTab && <HelpBanner {...helpForTab} />}

      {/* Header card — oculto en la pestaña "Mi Cuenta" (esa pestaña tiene
          su propio bloque de avatar + email, duplicar info acá molesta).
          En "Mis Clubs" siempre se muestra; al hacer scroll se oculta
          naturalmente y el bloque de filtros + wallet (sticky) sube al tope. */}
      {tab !== 'cuenta' && (
      <div style={{ ...glass, padding:'14px 16px', marginBottom:16 }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
            : <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#a855f7,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FN, fontSize:14, fontWeight:900, color:'#fff', flexShrink:0 }}>{initials}</div>
          }
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:FN, fontSize:15, fontWeight:700, color:'#fff', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.name || user.email}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Socio desde {new Date(user.created_at).toLocaleDateString('es-AR', { month:'short', year:'numeric' })}</div>
          </div>
          <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, background:G, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', flexShrink:0, textAlign:'right' }}>
            {memberships.length}
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'.06em', WebkitTextFillColor:'rgba(255,255,255,0.4)', background:'none' }}>clubs</div>
          </div>
        </div>
      </div>
      )}

      {loading && (
        <div className="fu">
          <SkeletonList rows={3} />
        </div>
      )}

      {/* ── Mis clubs ── */}
      {!loading && tab === 'mis clubs' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
            <DynamicGreeting name={profile?.name} type="client" />
            <InfoHint align="left" text={
              'Acá ves tu billetera de clubes — cada tarjeta es un negocio donde estás anotado.\n\n' +
              'Tocá una tarjeta para darla vuelta y ver más datos: tus puntos, premios disponibles y promos activas.\n\n' +
              'Si tenés varios clubes podés filtrarlos por ciudad o categoría con los chips de arriba.'
            } />
          </div>
          {/* HelpBanner movido al tope (TAB_HELP['mis clubs']) — ya no va acá */}

          {displayMemberships.length === 0 ? (
            /* Empty wallet state */
            <div style={{ textAlign:'center', padding:'52px 24px 32px' }}>
              <div style={{ width:76, height:76, borderRadius:24, background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.22)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                <Wallet size={34} strokeWidth={1.5} color="rgba(139,92,246,0.70)" />
              </div>
              <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:'rgba(255,255,255,0.80)', marginBottom:10 }}>Tu billetera está vacía</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.38)', maxWidth:240, margin:'0 auto 24px', lineHeight:1.65 }}>Escaneá el QR de un comercio para sumar tu primer club.</div>
              <button
                onClick={() => setTab('mi qr')}
                style={{ padding:'11px 26px', borderRadius:99, background:'linear-gradient(135deg,#8B5CF6,#EC4899)', border:'none', cursor:'pointer', fontFamily:FN, fontSize:13, fontWeight:700, color:'#fff', boxShadow:'0 4px 20px rgba(139,92,246,0.40)' }}
              >
                Escanear QR
              </button>
            </div>
          ) : (
            <>
              {/* Counter — el "Limpiar" se removió, ahora cada tag activo tiene su propia ✕ */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: (cityPills || categoryPills) ? 10 : 14 }}>
                <div style={{ fontSize:12, color:C.mist }}>
                  {filtersActive
                    ? `${filteredMemberships.length} de ${displayMemberships.length} clubs`
                    : `${displayMemberships.length} club${displayMemberships.length !== 1 ? 's' : ''} activo${displayMemberships.length !== 1 ? 's' : ''}`
                  }
                </div>
              </div>

              {/* Filter rows + wallet — sticky al tope. Cuando el usuario hace
                  scroll hacia abajo, el saludo y header se ocultan naturalmente
                  y este bloque queda anclado en el tope del viewport.
                  Para volver a verlos, scroll hacia arriba. */}
              <div style={{ position:'sticky', top:0, zIndex:5, paddingTop:8, marginTop:-8, background:'linear-gradient(to bottom, #000 0%, #000 80%, transparent 100%)' }}>
              {(cityPills || categoryPills) && (
                <div style={{ marginBottom:16, display:'flex', flexDirection:'column', gap:8 }}>
                  {cityPills && (
                    <FilterPills
                      pills={cityPills}
                      selected={safeCity}
                      onSelect={setFilterCity}
                      label="Filtrar por ciudad"
                      size="lg"
                    />
                  )}
                  {categoryPills && (
                    <FilterPills
                      pills={categoryPills}
                      selected={safeCategory}
                      onSelect={setFilterCategory}
                      label="Filtrar por categoría"
                      size="sm"
                    />
                  )}
                </div>
              )}

              {/* Wallet or empty-filter state */}
              {filteredMemberships.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 24px 24px' }}>
                  <div style={{ fontSize:14, color:'rgba(255,255,255,0.45)', marginBottom:16, lineHeight:1.6 }}>
                    No tenés clubs que coincidan con los filtros.
                  </div>
                  <button
                    onClick={clearFilters}
                    style={{ padding:'9px 22px', borderRadius:99, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.16)', cursor:'pointer', fontFamily:FN, fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.75)' }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <WalletView
                  key={filteredMemberships.map(m => m.id).join(',')}
                  clubs={filteredMemberships}
                  isMock={isMockClient}
                  userId={user?.id}
                />
              )}
              </div>
              {/* Spacer para que haya espacio scrolleable y el sticky pueda activarse */}
              <div style={{ height:'40vh' }} />
            </>
          )}
        </div>
      )}

      {/* ── Premios — lista combinada de premios disponibles en todos los clubs del cliente ── */}
      {!loading && tab === 'premios' && (
        <div>
          {/* HelpBanner movido al tope (TAB_HELP['premios']) — ya no va acá */}
          {(() => {
            // Junto todos los premios activos de todos los commerces, mantengo
            // el balance del cliente (stars o points según prog_type) y ordeno
            // por "más cerca de canjear" primero (ratio más alto), después por costo.
            const all = []
            for (const m of memberships) {
              const c = m.commerce
              if (!c) continue
              const isStars = c.prog_type === 'stars'
              const bal = isStars ? (m.stars || 0) : (m.points || 0)
              const list = (c.prizes || []).filter(p =>
                p.active && (p.system_type || c.prog_type) === c.prog_type
              )
              for (const p of list) {
                all.push({
                  prize: p,
                  commerce: c,
                  bal,
                  isStars,
                  pct: p.cost > 0 ? Math.min(100, Math.round((bal / p.cost) * 100)) : 0,
                  canRedeem: bal >= p.cost,
                })
              }
            }
            all.sort((a, b) => {
              if (a.canRedeem !== b.canRedeem) return a.canRedeem ? -1 : 1
              return b.pct - a.pct
            })

            if (all.length === 0) {
              return (
                <div style={{ textAlign:'center', padding:'52px 24px 32px' }}>
                  <div style={{ width:76, height:76, borderRadius:24, background:'rgba(236,72,153,0.10)', border:'1px solid rgba(236,72,153,0.22)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
                    <Gift size={32} strokeWidth={1.5} color='rgba(236,72,153,0.70)' />
                  </div>
                  <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:'rgba(255,255,255,0.80)', marginBottom:8 }}>Sin premios disponibles</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.50)', lineHeight:1.6, maxWidth:280, margin:'0 auto' }}>
                    Cuando tus clubs carguen premios, los vas a ver acá ordenados por los que estás más cerca de canjear.
                  </div>
                </div>
              )
            }

            return (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {all.map(({ prize, commerce, bal, isStars, pct, canRedeem }) => {
                  const unitColor = isStars ? '#8B5CF6' : '#EC4899'
                  const unitLabel = isStars ? 'estrellas' : 'puntos'
                  const unitIcon  = isStars ? Star : Gem
                  const UI = unitIcon
                  const missing = Math.max(0, prize.cost - bal)
                  return (
                    <div key={`${commerce.id}-${prize.id}`} style={{
                      background:'rgba(255,255,255,0.04)',
                      border:'1px solid rgba(255,255,255,0.08)',
                      borderRadius:14, padding:'12px 14px',
                      display:'flex', alignItems:'center', gap:12,
                    }}>
                      <div style={{ width:48, height:48, borderRadius:11, background:`${unitColor}1F`, border:`1px solid ${unitColor}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                        {prize.img_url
                          ? <img src={prize.img_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : <Gift size={20} color={unitColor} strokeWidth={2} />}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:'#fff', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{prize.name}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{commerce.name}</div>
                        <div style={{ height:4, borderRadius:99, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`, height:'100%', background:unitColor, borderRadius:99, transition:'width .35s ease' }} />
                        </div>
                      </div>
                      <div style={{ flexShrink:0, textAlign:'right' }}>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:4, fontFamily:FN, fontSize:13, fontWeight:800, color: canRedeem ? '#22c55e' : unitColor }}>
                          <UI size={11} {...(isStars ? { strokeWidth:0, fill:'currentColor' } : { strokeWidth:2 })} />
                          {prize.cost}
                        </div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', marginTop:2, whiteSpace:'nowrap' }}>
                          {canRedeem ? '¡Canjeable!' : `Faltan ${missing}`}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Historial ── */}
      {!loading && tab === 'historial' && (
        <div>
          {/* HelpBanner movido al tope (TAB_HELP['historial']) — ya no va acá */}
          {isMockClient && (
            <div style={{ marginBottom:12, padding:'9px 13px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, fontSize:11, color:'rgba(255,255,255,0.5)', display:'flex', alignItems:'center', gap:7 }}>
              <Eye size={13} strokeWidth={2} color="rgba(255,255,255,0.5)" />
              Ejemplo — así se verá tu historial de visitas.
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
            <div style={{ ...glass, padding:'14px 13px', textAlign:'center' }}>
              <div style={{ fontFamily:FN, fontSize:28, fontWeight:900, background:G, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{totalVisits}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>visitas totales</div>
            </div>
            <div style={{ ...glass, padding:'14px 13px', textAlign:'center' }}>
              <div style={{ fontFamily:FN, fontSize:28, fontWeight:900, color:'#fff' }}>{displayMemberships.length}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>clubs activos</div>
            </div>
          </div>

          {!isMockClient && displayVisits.length === 0 && (
            <EmptyState type="historial" actionLabel="Ver mis clubs" onAction={() => setTab('mis clubs')} />
          )}

          {displayVisits.map((v, i) => {
            const isStars = v.prog_type === 'stars'
            const earned  = v.points_earned || 1
            const UnitIc  = isStars ? Star : Gem
            return (
              <div key={v.id} className="fu" style={{ ...glass, display:'flex', alignItems:'center', overflow:'hidden', marginBottom:8, animationDelay:`${i*50}ms` }}>
                {v.commerce?.img_url
                  ? <img src={v.commerce.img_url} alt="" style={{ width:50, height:50, objectFit:'cover', flexShrink:0, filter:'brightness(.5)' }} />
                  : <div style={{ width:50, height:50, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Building2 size={18} strokeWidth={1.5} color="rgba(255,255,255,0.35)" />
                    </div>
                }
                <div style={{ flex:1, padding:'9px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#fff', fontFamily:FN }}>{v.commerce?.name}</span>
                    {v.amount_spent && <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>${fmt(v.amount_spent)}</span>}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>
                      {new Date(v.scanned_at).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' })}
                    </span>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', background:`${C.v}18`, border:`1px solid ${C.v}40`, borderRadius:50, fontSize:10, fontWeight:600, color:C.v }}>
                      <UnitIc size={10} strokeWidth={2} color={C.v} />
                      +{earned}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Mi QR ── */}
      {tab === 'mi qr' && (
        <div className="modal-in" style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingBottom:8 }}>
          {/* HelpBanner movido al tope (TAB_HELP['mi qr']) — ya no va acá */}

          {/* ── PASE VIP ── */}
          <div style={{ width:'100%', maxWidth:340, borderRadius:28, overflow:'hidden', boxShadow:'0 24px 64px rgba(189,75,248,0.30), 0 8px 24px rgba(0,0,0,0.50)' }}>

            {/* Cuerpo del pase */}
            <div style={{ background:'linear-gradient(145deg, #7c3aed 0%, #a855f7 45%, #ec4899 100%)', padding:'24px 24px 28px', position:'relative', overflow:'hidden' }}>

              {/* Blobs decorativos */}
              <div style={{ position:'absolute', top:-32, right:-32, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.10)', filter:'blur(24px)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:-24, left:-16, width:90, height:90, borderRadius:'50%', background:'rgba(236,72,153,0.25)', filter:'blur(20px)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', top:'40%', left:'30%', width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.04)', filter:'blur(32px)', pointerEvents:'none' }} />

              {/* Header */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, position:'relative' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.01em', lineHeight:1 }}>BENEFIX PASS</div>
                    <InfoHint align="left" color="rgba(255,255,255,0.85)" text={
                      'Tu QR personal único. Mostralo al comerciante en cada compra para que lo escanee y te sume estrellas o puntos.\n\n' +
                      'El mismo QR sirve para todos los clubes donde estés anotado — no necesitás uno por cada negocio.\n\n' +
                      'Si lo perdés o querés bloquearlo, escribinos por soporte y te ayudamos.'
                    } />
                  </div>
                  <div style={{ fontFamily:FI, fontSize:12, color:'rgba(255,255,255,0.65)', marginTop:4 }}>Tu pase de beneficios</div>
                </div>
                {/* Logo badge */}
                <div style={{ width:38, height:38, borderRadius:12, background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,0.25)' }}>
                  <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
                    <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    <rect x="16" y="5.5" width="8" height="5" rx="2.5" fill="white" opacity=".9"/>
                    <rect x="16" y="12" width="9" height="5.5" rx="2.75" fill="white"/>
                  </svg>
                </div>
              </div>

              {/* QR */}
              <div style={{ display:'flex', justifyContent:'center', position:'relative' }}>
                {/* Glow behind QR */}
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at center, rgba(255,255,255,0.18) 0%, transparent 68%)', pointerEvents:'none' }} />
                {passQrUrl
                  ? <img src={passQrUrl} alt="QR" style={{ width:200, height:200, display:'block', position:'relative', filter:'drop-shadow(0 0 14px rgba(255,255,255,0.30))' }} />
                  : <div style={{ width:200, height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.4)', fontSize:11 }}>Generando...</div>
                }
              </div>

              {/* Info usuario */}
              <div style={{ textAlign:'center', marginTop:22, position:'relative' }}>
                <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-.01em' }}>{profile?.name || 'Usuario'}</div>
                <div style={{ fontFamily:'monospace', fontSize:10, color:'rgba(255,255,255,0.50)', marginTop:5, letterSpacing:'.12em', textTransform:'uppercase' }}>
                  CLUB · {user.id.slice(0,8).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Separador tipo ticket */}
            <div style={{ position:'relative', background:'linear-gradient(to right, #5b21b6, #7c3aed)' }}>
              {/* Muescas */}
              <div style={{ position:'absolute', left:-1, top:'50%', transform:'translateY(-50%)', width:18, height:18, borderRadius:'50%', background:'#000', zIndex:2 }} />
              <div style={{ position:'absolute', right:-1, top:'50%', transform:'translateY(-50%)', width:18, height:18, borderRadius:'50%', background:'#000', zIndex:2 }} />
              <div style={{ borderTop:'1.5px dashed rgba(255,255,255,0.20)', margin:'0 22px' }} />
            </div>

            {/* Footer del pase */}
            <div style={{ background:'linear-gradient(to bottom right, #4c1d95, #3b0764)', padding:'14px 24px 16px', textAlign:'center' }}>
              <div style={{ fontFamily:FI, fontSize:11, color:'rgba(255,255,255,0.50)', letterSpacing:'.04em' }}>
                Mostrá este código en caja para acumular beneficios
              </div>
            </div>
          </div>

          {/* ── STATS ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:16, width:'100%', maxWidth:340 }}>
            {[
              { val: String(displayMemberships.length), lbl: 'clubs'   },
              { val: String(totalVisits),               lbl: 'visitas' },
              { val: String(displayMemberships.length), lbl: 'activos' },
            ].map((s, i) => (
              <div key={i} className="fu" style={{ animationDelay:`${i*50}ms`, background:'rgba(255,255,255,0.05)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:18, padding:'14px 8px', textAlign:'center' }}>
                <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:'#fff', lineHeight:1 }}>{s.val}</div>
                <div style={{ fontFamily:FI, fontSize:10, color:'rgba(255,255,255,0.40)', marginTop:5, textTransform:'uppercase', letterSpacing:'.08em' }}>{s.lbl}</div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ── Mi cuenta ── */}
      {!loading && tab === 'cuenta' && (
        <div className="fu" style={{ paddingBottom:8 }}>

          {/* HelpBanner movido al tope (TAB_HELP['cuenta']) — ya no va acá */}

          {/* Avatar + email */}
          <div style={{ ...glass, padding:'18px', marginBottom:12, display:'flex', alignItems:'center', gap:14 }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width:56, height:56, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
              : <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#a855f7,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FN, fontSize:18, fontWeight:900, color:'#fff', flexShrink:0 }}>{initials}</div>
            }
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:FN, fontSize:15, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.name || 'Sin nombre'}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.50)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.30)', marginTop:4 }}>
                Socio desde {new Date(user.created_at).toLocaleDateString('es-AR', { month:'short', year:'numeric' })}
              </div>
            </div>
          </div>

          {/* Cartel "¿Tenés un negocio?" — versión TOP (primera vista, con Sí/No).
              Aparece solo si nunca respondió. Click en Sí → expande con texto + link.
              Click en No → se oculta y reaparece en versión BOTTOM 1h después. */}
          {profile?.role !== 'commerce_owner' && (bizState === 'top-collapsed' || bizState === 'top-expanded') && (
            <div style={{
              position:'relative', overflow:'hidden',
              background:'linear-gradient(135deg, rgba(254,80,0,0.18) 0%, rgba(189,75,248,0.22) 100%)',
              border:'1px solid rgba(189,75,248,0.32)',
              borderRadius:16, marginBottom:12,
            }}>
              <div style={{
                padding:'14px 18px',
                display:'flex', alignItems:'center', gap:14,
              }}>
                <div style={{ width:46, height:46, borderRadius:12, background:G, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 18px rgba(168,85,247,0.42)' }}>
                  <Store size={22} color='#fff' strokeWidth={2} />
                </div>
                <div style={{ flex:1, minWidth:0, fontFamily:FN, fontSize:14, fontWeight:700, color:'#fff' }}>
                  ¿Tenés un negocio?
                </div>
                {bizState === 'top-collapsed' && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                    <button onClick={bizAnswerYes}
                      style={{ background:'transparent', border:'none', color:'#fff', fontFamily:FN, fontSize:14, fontWeight:700, cursor:'pointer', padding:'4px 6px' }}>
                      Sí
                    </button>
                    <span style={{ color:'rgba(255,255,255,0.35)', fontSize:14, lineHeight:1 }}>|</span>
                    <button onClick={bizAnswerNo}
                      style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.78)', fontFamily:FN, fontSize:14, fontWeight:500, cursor:'pointer', padding:'4px 6px' }}>
                      No
                    </button>
                  </div>
                )}
              </div>
              {bizState === 'top-expanded' && (
                <div style={{ padding:'0 18px 16px 78px' }}>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', lineHeight:1.5, marginBottom:12 }}>
                    Registralo y empezá a fidelizar tus clientes. Es la misma cuenta — seguís siendo cliente también.
                  </div>
                  <button onClick={() => setView('register-commerce')}
                    style={{
                      display:'inline-flex', alignItems:'center', gap:6,
                      background:G, border:'none', borderRadius:10,
                      padding:'9px 14px', color:'#fff', fontSize:13, fontWeight:700,
                      cursor:'pointer', fontFamily:FN,
                      boxShadow:'0 4px 14px rgba(168,85,247,0.35)',
                    }}>
                    Registrar mi negocio
                    <ArrowRight size={14} strokeWidth={2.4} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
            {[
              { lbl:'Clubs',   val: acctStats?.clubs_count   ?? memberships.length },
              { lbl:'Visitas', val: acctStats?.total_visits   ?? totalVisits        },
              { lbl:'Canjes',  val: acctStats?.total_redemptions ?? '–'             },
            ].map((s,i) => (
              <div key={i} style={{ ...glass, padding:'12px 8px', textAlign:'center', borderRadius:14 }}>
                <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:'#fff', lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.40)', marginTop:4, textTransform:'uppercase', letterSpacing:'.06em' }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Formulario edición */}
          <div style={{ ...glass, padding:'18px', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.mist, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:14 }}>Información personal</div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:C.dust, display:'block', marginBottom:5, fontWeight:600 }}>Nombre</label>
              <input type="text" value={acctForm.name} placeholder="Tu nombre completo"
                onChange={e => setAcctForm(p => ({ ...p, name: e.target.value }))}
                style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:'#fff', fontSize:13, fontFamily:FI, outline:'none', boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:C.dust, display:'block', marginBottom:5, fontWeight:600 }}>Teléfono</label>
              <PhoneInput
                value={acctForm.phone || ''}
                onChange={v => setAcctForm(p => ({ ...p, phone: v }))}
                size="sm"
              />
            </div>
            {(() => {
              // El botón solo se habilita si hay diferencia real entre el form
              // y el profile guardado. Evita pisadas innecesarias y le da feedback
              // visual al usuario de que sus cambios todavía no se guardaron.
              const dirty = (
                (acctForm.name || '').trim()  !== (profile?.name  || '').trim() ||
                (acctForm.phone || '').trim() !== (profile?.phone || '').trim()
              )
              const disabled = !dirty || acctSaving
              return (
                <button
                  disabled={disabled}
                  onClick={async () => {
                    setAcctSaving(true)
                    const res = await fetch('/api/user/profile', {
                      method:'PUT', headers:{ 'Content-Type':'application/json' },
                      body: JSON.stringify(acctForm),
                    })
                    setAcctSaving(false)
                    if (res.ok) showToast('success', 'Perfil actualizado')
                    else        showToast('error', 'Error al guardar')
                  }}
                  style={{ width:'100%', padding:'11px', background: disabled ? 'rgba(255,255,255,0.06)' : GV, border: disabled ? '1px solid rgba(255,255,255,0.10)' : 'none', borderRadius:12, color: disabled ? 'rgba(255,255,255,0.40)' : '#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer' }}>
                  {acctSaving ? 'Guardando...' : (dirty ? 'Guardar cambios' : 'Sin cambios')}
                </button>
              )
            })()}
          </div>

          {/* Cartel "¿Tenés un negocio?" — versión BOTTOM (compacta, persistente
              después de la primera respuesta o tras el cooldown de 1h del "No").
              Solo flecha desplegable, sin Sí/No. Ver bizState para la lógica. */}
          {profile?.role !== 'commerce_owner' && (bizState === 'bottom-collapsed' || bizState === 'bottom-expanded') && (
            <div style={{
              position:'relative', overflow:'hidden',
              background:'linear-gradient(135deg, rgba(254,80,0,0.18) 0%, rgba(189,75,248,0.22) 100%)',
              border:'1px solid rgba(189,75,248,0.32)',
              borderRadius:16, marginBottom:12,
            }}>
              <button
                onClick={bizToggleBottom}
                style={{
                  width:'100%', background:'transparent', border:'none', cursor:'pointer',
                  padding:'14px 18px',
                  display:'flex', alignItems:'center', gap:14, textAlign:'left',
                  fontFamily:'inherit',
                }}>
                <div style={{ width:46, height:46, borderRadius:12, background:G, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 18px rgba(168,85,247,0.42)' }}>
                  <Store size={22} color='#fff' strokeWidth={2} />
                </div>
                <div style={{ flex:1, minWidth:0, fontFamily:FN, fontSize:14, fontWeight:700, color:'#fff' }}>
                  ¿Tenés un negocio?
                </div>
                <ChevronDown size={18} color='rgba(255,255,255,0.65)' strokeWidth={2.4}
                  style={{ flexShrink:0, transform: bizState === 'bottom-expanded' ? 'rotate(180deg)' : 'rotate(0)', transition:'transform 220ms ease' }} />
              </button>
              {bizState === 'bottom-expanded' && (
                <div style={{ padding:'0 18px 16px 78px' }}>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', lineHeight:1.5, marginBottom:12 }}>
                    Registralo y empezá a fidelizar tus clientes. Es la misma cuenta — seguís siendo cliente también.
                  </div>
                  <button onClick={() => setView('register-commerce')}
                    style={{
                      display:'inline-flex', alignItems:'center', gap:6,
                      background:G, border:'none', borderRadius:10,
                      padding:'9px 14px', color:'#fff', fontSize:13, fontWeight:700,
                      cursor:'pointer', fontFamily:FN,
                      boxShadow:'0 4px 14px rgba(168,85,247,0.35)',
                    }}>
                    Registrar mi negocio
                    <ArrowRight size={14} strokeWidth={2.4} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Volver a ver carteles de ayuda — resetea todos los flags
              `benefix:help:*` del localStorage. Útil si descartó los carteles
              y quiere volver a verlos. */}
          <div style={{ ...glass, overflow:'hidden', borderRadius:16, marginBottom:12 }}>
            <button
              onClick={() => {
                const n = resetAllHelpBanners()
                showToast('success', n > 0 ? `Listo — vas a volver a ver los carteles de ayuda (${n})` : 'No hay carteles para reactivar')
              }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'15px 18px', background:'transparent', border:'none', color:'rgba(255,255,255,0.70)', cursor:'pointer', fontFamily:FI, fontSize:13, textAlign:'left' }}>
              <Sparkles size={16} strokeWidth={2} color="rgba(189,75,248,0.80)" />
              Volver a ver los carteles de ayuda
            </button>
          </div>

          {/* Cerrar sesión / Eliminar cuenta */}
          <div style={{ ...glass, overflow:'hidden', borderRadius:16 }}>
            <button onClick={onLogout}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'15px 18px', background:'transparent', border:'none', color:'rgba(255,255,255,0.70)', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.08)', fontFamily:FI, fontSize:13, textAlign:'left' }}>
              <LogOut size={16} strokeWidth={2} color="rgba(255,255,255,0.55)" />
              Cerrar sesión
            </button>
            <button
              onClick={async () => {
                const ok = await showConfirm({
                  title: '¿Eliminar tu cuenta?',
                  message: 'Se borrarán todos tus datos, membresías y puntos. Esta acción no se puede deshacer.',
                  confirmText: 'Sí, eliminar',
                  cancelText:  'Cancelar',
                  danger: true,
                })
                if (!ok) return
                const res = await fetch('/api/user/delete', { method:'DELETE' })
                if (res.ok) { onLogout() }
                else showToast('error', 'No se pudo eliminar la cuenta')
              }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'15px 18px', background:'transparent', border:'none', color:'rgba(248,116,68,0.85)', cursor:'pointer', fontFamily:FI, fontSize:13, textAlign:'left' }}>
              <Trash2 size={16} strokeWidth={2} color="rgba(248,116,68,0.70)" />
              Eliminar cuenta
            </button>
          </div>

        </div>
      )}

      <ClientBottomNav tab={tab} setTab={setTab} profile={profile} setView={setView} />
    </div>
  )
}

// ─── REGISTRO DE COMERCIO ─────────────────────────────────────────────────────
const FAMILY_ICONS = {
  gastronomia:  UtensilsCrossed,
  minorista:    Store,
  belleza:      Sparkles,
  salud:        HeartPulse,
  indumentaria: Shirt,
  hogar:        Home,
  servicios:    Wrench,
  automotor:    Car,
  educacion:    GraduationCap,
  otro:         MoreHorizontal,
}
const SUB_ICONS = {
  'Cafetería':        Coffee,
  'Restaurante':      UtensilsCrossed,
  'Bar':              Wine,
  'Pizzería':         Pizza,
  'Heladería':        IceCream,
  'Panadería':        Croissant,
  'Rotisería':        Drumstick,
  'Cervecería':       Beer,
  'Vinería':          Wine,
  'Food truck':       Truck,
  'Barbería':         Scissors,
  'Peluquería':       Sparkles,
  'Manicura':         Hand,
  'Estética':         Flower2,
  'Spa':              Flower2,
  'Tatuajes':         Pen,
  'Depilación':       Scissors,
  'Farmacia':         PillIcon,
  'Óptica':           Eye,
  'Kinesiología':     PersonStanding,
  'Nutrición':        Leaf,
  'Psicología':       Brain,
  'Odontología':      Smile,
  'Veterinaria':      PawPrint,
  'Indumentaria':     Shirt,
  'Calzado':          Footprints,
  'Joyería':          Gem,
  'Bijouterie':       Gem,
  'Decoración':       Sofa,
  'Vivero':           Leaf,
  'Florería':         Flower,
  'Juguetería':       Star,
  'Mueblería':        Sofa,
  'Bazar':            ShoppingBag,
  'Lavandería':       WashingMachine,
  'Tintorería':       WashingMachine,
  'Inmobiliaria':     Building2,
  'Fotografía':       Camera,
  'Imprenta':         Printer,
  'Gomería':          Car,
  'Mecánica':         Wrench,
  'Repuestos':        Package,
  'Lavadero de autos':Car,
  'Academia':         GraduationCap,
  'Yoga / Pilates':   PersonStanding,
  'Idiomas':          Languages,
  'Escuela de música':Music,
  'Gimnasio':         Dumbbell,
  // Comercio minorista
  'Kiosco':           ShoppingBag,
  'Almacén':          ShoppingBag,
  'Mini market':      ShoppingBag,
  'Supermercado':     ShoppingBag,
  'Verdulería':       Leaf,
  'Carnicería':       Drumstick,
  'Pescadería':       ShoppingBag,
  'Pollería':         Drumstick,
  'Fiambrería':       Drumstick,
  'Dietética':        Leaf,
  'Librería':         Pen,
  'Papelería':        Pen,
  'Ferretería':       Wrench,
  'Pinturería':       Palette,
  'Bicicletería':     PersonStanding,
  'Pet shop':         PawPrint,
  // Servicios extra
  'Cerrajería':       Lock,
  'Quiniela / Lotería': Star,
  'Casa de cambio':   CreditCard,
  'Tabaquería':       Flame,
  // Automotor extra
  'Estación de servicio': Truck,
}
const COMMERCE_FAMILIES = FAMILIES_DATA.map(f => ({
  ...f,
  Icon: FAMILY_ICONS[f.id],
  subs: f.subs.map(s => ({ name: s.name, aliases: s.aliases || [], Icon: SUB_ICONS[s.name] })),
}))

function findFamilyBySub(categoryName) {
  return COMMERCE_FAMILIES.find(f => f.subs.some(s => s.name === categoryName)) || null
}
function normalizeCat(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }

function RegisterCommerceView({ setView, user, onProfileRefresh, onLoginRequired }) {
  const [step,      setStep]     = useState(1)
  const [animKey,   setAnimKey]  = useState(0)
  const [form,      setForm]     = useState({
    name:'', category:'', customCategory:'',
    // Argentina pre-seleccionada — único país soportado por ahora.
    country:'argentina', province:'', city:'',
    prog_min_purchase: '',  // monto mínimo en pesos para sumar estrella (opcional, solo stars)
    // Sistema de puntos (paso 5)
    prog_type: 'stars',     // 'stars' | 'points'
    prog_goal: 10,           // visitas para estrellas, puntos para premio
    prog_pts:  1,            // 1 punto = 1 peso. Columna mantenida por compat.
    // Detalles (paso 6 — opcionales)
    phone: '', address: '', description: '',
    // Logo (paso 7 — opcional)
    img_url: '',
    // Primer premio (paso 8 — opcional)
    first_prize_name: '', first_prize_cost: '',
  })
  const [sending,   setSending]  = useState(false)
  const [error,     setError]    = useState('')
  const [done,      setDone]     = useState(false)
  const [catFamily, setCatFamily] = useState(null)
  const [catSearch, setCatSearch] = useState('')
  const [minPurchaseOpen, setMinPurchaseOpen] = useState(true)  // acordeón compra mínima — abierto por default
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Restore drill-down position when returning to step 3
  useEffect(() => {
    if (step === 3 && !catFamily) {
      if (form.category === '__otro__') { setCatFamily('otro'); return }
      const fam = findFamilyBySub(form.category)
      if (fam) setCatFamily(fam.id)
    }
  }, [step])

  function go(n) { setAnimKey(k => k + 1); setStep(n) }
  const next = () => { setError(''); go(step + 1) }
  const prev = () => { setError(''); go(Math.max(1, step - 1)) }

  // Pasos 2..9 son los del wizard (8 en total). Step 9 = confirmación final.
  const TOTAL_STEPS = 9
  const showHeader  = step >= 2 && step <= TOTAL_STEPS
  // Skip permitido en pasos opcionales: detalles (6), logo (7), primer premio (8)
  const canSkip     = step === 4 || step === 6 || step === 7 || step === 8
  const progressPct = step >= 2 && step <= TOTAL_STEPS ? ((step - 1) / (TOTAL_STEPS - 1)) * 100 : 0

  const rcProvinces = form.country ? Object.entries(LOCATIONS[form.country]?.provinces || {}) : []
  const rcCities    = form.country && form.province ? LOCATIONS[form.country]?.provinces[form.province]?.cities || [] : []

  function setRCCountry(v)  { setForm(f => ({ ...f, country: v, province: '', city: '' })) }
  function setRCProvince(v) { setForm(f => ({ ...f, province: v, city: '' })) }

  // Upload de logo del wizard — usa el bucket commerce-images (mismo que el panel).
  // Path: wizard/<userId>-<timestamp>.<ext> para no chocar con los logos
  // que se suben luego desde Configuración (que usan ${commerce.id}/logo.jpg).
  async function handleWizardLogoUpload(file) {
    if (!file || !user) return
    setUploadingLogo(true)
    try {
      const supabase = getSupabase()
      const ext  = file.name.split('.').pop()
      const path = `wizard/${user.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('commerce-images').upload(path, file, { upsert: false })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('commerce-images').getPublicUrl(path)
      setForm(f => ({ ...f, img_url: urlData.publicUrl }))
    } catch (e) {
      setError(e.message || 'No se pudo subir el logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSubmit() {
    setSending(true); setError('')
    try {
      const res = await fetch('/api/register-commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          customCategory: form.customCategory || undefined,
          city: form.city, province: form.province, country: form.country,
          // Nuevos campos
          prog_type: form.prog_type,
          prog_goal: parseInt(form.prog_goal) || 10,
          prog_pts:  1,  // 1 punto = 1 peso (siempre)
          // Compra mínima — solo se manda si stars + tiene valor numérico válido.
          // El backend igual valida (NULL si no aplica).
          prog_min_purchase: form.prog_type === 'stars' && parseInt(form.prog_min_purchase) > 0
            ? parseInt(form.prog_min_purchase)
            : null,
          phone:       form.phone?.trim()       || null,
          address:     form.address?.trim()     || null,
          description: form.description?.trim() || null,
          img_url:     form.img_url             || null,
          first_prize: form.first_prize_name?.trim() && form.first_prize_cost
            ? { name: form.first_prize_name.trim(), cost: parseInt(form.first_prize_cost) || 0 }
            : null,
        }),
      })
      const data = await res.json()
      if (data.ok) { await onProfileRefresh(); setDone(true) }
      else setError(data.error || 'Error al registrar')
    } catch { setError('Error de conexión. Intentá de nuevo.') }
    finally { setSending(false) }
  }

  if (!user) return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
        <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Lock size={24} color='rgba(255,255,255,0.50)' strokeWidth={2} />
        </div>
      </div>
      <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, marginBottom:12 }}>Primero necesitás iniciar sesión</div>
      <GBtn onClick={onLoginRequired}><span style={{ fontWeight:900 }}>G</span> Entrar con Google</GBtn>
    </div>
  )

  if (done) return (
    <div style={{ position:'fixed', inset:0, zIndex:9990, background:'#000', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 24px' }}>
      <div style={{ position:'fixed', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.40) 0%, rgba(139,92,246,0) 70%)', filter:'blur(80px)', zIndex:-1, pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.35) 0%, rgba(236,72,153,0) 70%)', filter:'blur(80px)', zIndex:-1, pointerEvents:'none' }} />
      <div className="fu" style={{ textAlign:'center', maxWidth:400, width:'100%' }}>
        <div style={{ width:88, height:88, borderRadius:'50%', background:`${C.ok}15`, border:`2px solid ${C.ok}44`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <CheckCircle size={42} color={C.ok} strokeWidth={1.5} />
        </div>
        <div style={{ fontFamily:FN, fontSize:28, fontWeight:900, color:C.white, marginBottom:10, letterSpacing:'-.02em' }}>¡Tu club está creado!</div>
        <div style={{ fontSize:14, color:C.mist, marginBottom:32, lineHeight:1.7 }}>
          Ya podés escanear QRs de clientes.<br/>Completá tu perfil cuando quieras.
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => setView('commerce-settings')}
            style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(189,75,248,0.35)' }}>
            Completar mi perfil →
          </button>
          <button onClick={() => setView('scanner')}
            style={{ width:'100%', padding:'15px', borderRadius:16, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:C.pearl, fontFamily:FN, fontSize:14, fontWeight:600, cursor:'pointer' }}>
            Ir al escáner
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9990, background:'#000', display:'flex', flexDirection:'column' }}>
      {/* Blobs */}
      <div style={{ position:'fixed', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.40) 0%, rgba(139,92,246,0) 70%)', filter:'blur(80px)', zIndex:-1, pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.35) 0%, rgba(236,72,153,0) 70%)', filter:'blur(80px)', zIndex:-1, pointerEvents:'none' }} />

      {/* Header */}
      {showHeader ? (
        <div style={{ padding:'16px 20px 10px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <button onClick={prev} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', color:'rgba(255,255,255,0.55)', fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer', padding:'4px 0' }}>
              <ChevronLeft size={18} strokeWidth={2} />Atrás
            </button>
            {canSkip && (
              <button onClick={next} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.40)', fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer', padding:'4px 0' }}>
                Saltar
              </button>
            )}
          </div>
          <div style={{ height:3, background:'rgba(255,255,255,0.10)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, background:G, width:`${progressPct}%`, transition:'width 400ms cubic-bezier(0.23,1,0.32,1)' }} />
          </div>
        </div>
      ) : (
        <div style={{ padding:'16px 20px 0', flexShrink:0, display:'flex', justifyContent:'flex-end' }}>
          <button onClick={() => setView('home')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', padding:4 }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 24px 32px', overflowY:'auto' }}>
        <div key={animKey} className="fu" style={{ maxWidth:420, width:'100%', margin:'0 auto' }}>

          {/* ── Paso 1: Bienvenida ── */}
          {step === 1 && (
            <div style={{ textAlign:'center' }}>
              <div style={{ width:96, height:96, borderRadius:28, background:G, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', boxShadow:'0 16px 48px rgba(189,75,248,0.40)' }}>
                <Store size={46} color='#fff' strokeWidth={1.5} />
              </div>
              <div style={{ fontFamily:FN, fontSize:30, fontWeight:900, color:C.white, marginBottom:10, letterSpacing:'-.02em' }}>¡Creá tu club!</div>
              <div style={{ fontSize:15, color:C.mist, lineHeight:1.6, marginBottom:36 }}>
                Fidelizá a tus clientes con<br />tu propio sistema de beneficios
              </div>
              <button onClick={next}
                style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(189,75,248,0.40)' }}>
                Empezar
              </button>
            </div>
          )}

          {/* ── Paso 2: Nombre ── */}
          {step === 2 && (
            <div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, letterSpacing:'-.02em', lineHeight:1.15 }}>¿Cómo se llama tu negocio?</div>
                <div style={{ marginTop:6 }}>
                  <InfoHint align="right" text={
                    'El nombre que ven tus clientes en la app y en sus tarjetas.\n\n' +
                    'Por seguridad, una vez creado el club solo podés cambiarlo cada 20 días, así que elegí bien.\n\n' +
                    'Tip: usá el nombre completo de tu local (ej. "Café Berlín" en vez de solo "Berlín").'
                  } />
                </div>
              </div>
              <div style={{ fontSize:14, color:C.mist, marginBottom:24, lineHeight:1.5 }}>Este nombre verán tus clientes</div>
              <input
                type="text" autoFocus value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Café Berlín"
                style={{ width:'100%', padding:'14px 16px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:14, color:C.white, fontSize:16, fontFamily:FI, marginBottom:20, boxSizing:'border-box' }}
              />
              <button onClick={next} disabled={!form.name.trim()}
                style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor: form.name.trim() ? 'pointer' : 'not-allowed', opacity: form.name.trim() ? 1 : 0.40, boxShadow: form.name.trim() ? '0 8px 32px rgba(189,75,248,0.40)' : 'none', transition:'opacity 200ms ease' }}>
                Continuar
              </button>
            </div>
          )}

          {/* ── Paso 3: Categoría ── */}
          {step === 3 && (() => {
            const step3ok = form.category && (form.category !== '__otro__' || form.customCategory?.trim())
            const q = normalizeCat(catSearch.trim())
            // Búsqueda mira nombre + aliases. Ej: "ropa" matchea Indumentaria.
            const searchResults = catSearch.trim() ? COMMERCE_FAMILIES.flatMap(fam =>
              fam.subs.filter(s =>
                normalizeCat(s.name).includes(q) ||
                (s.aliases || []).some(a => normalizeCat(a).includes(q))
              ).map(s => ({ fam, sub: s }))
            ) : []
            const activeFam = catFamily ? COMMERCE_FAMILIES.find(f => f.id === catFamily) : null

            return (
              <div>
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                  <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, letterSpacing:'-.02em', lineHeight:1.15 }}>¿Qué tipo de negocio es?</div>
                  <div style={{ marginTop:6 }}>
                    <InfoHint align="right" text={
                      'Tu rubro le sirve a los clientes para encontrarte cuando filtran por categoría en el directorio.\n\n' +
                      'Si no encontrás tu rubro exacto, podés escribirlo manualmente con la opción "Otro".\n\n' +
                      'Tip: probá escribiendo palabras clave informales (ej. "ropa", "zapatos", "verduras") — la búsqueda reconoce muchos sinónimos.'
                    } />
                  </div>
                </div>
                <div style={{ fontSize:14, color:C.mist, marginBottom:16, lineHeight:1.5 }}>Buscá tu rubro o explorá por categoría</div>

                {/* Search */}
                <div style={{ position:'relative', marginBottom:16 }}>
                  <Search size={15} color='rgba(255,255,255,0.35)' style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  <input
                    value={catSearch}
                    onChange={e => { setCatSearch(e.target.value); if (e.target.value) setCatFamily(null) }}
                    placeholder="Buscá tu rubro..."
                    style={{ width:'100%', padding:'12px 36px 12px 38px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:C.white, fontSize:14, fontFamily:FI, boxSizing:'border-box' }}
                  />
                  {catSearch && (
                    <button onClick={() => setCatSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:4 }}>
                      <X size={14} color='rgba(255,255,255,0.40)' />
                    </button>
                  )}
                </div>

                {/* Search results */}
                {catSearch.trim() && (
                  <div style={{ marginBottom:16 }}>
                    {searchResults.length > 0 ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {searchResults.map(({ fam, sub }) => {
                          const sel = form.category === sub.name
                          return (
                            <button key={`${fam.id}-${sub.name}`}
                              onClick={() => { setForm(f => ({ ...f, category: sub.name, customCategory:'' })); setCatSearch(''); setCatFamily(fam.id) }}
                              style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', background: sel ? `${C.v}22` : 'rgba(255,255,255,0.04)', border:`1.5px solid ${sel ? C.v : 'rgba(255,255,255,0.10)'}`, borderRadius:12, cursor:'pointer', textAlign:'left' }}>
                              <sub.Icon size={18} color={sel ? C.v : 'rgba(255,255,255,0.55)'} strokeWidth={1.5} />
                              <span style={{ fontSize:14, fontWeight:600, color: sel ? C.white : 'rgba(255,255,255,0.85)', flex:1 }}>{sub.name}</span>
                              <span style={{ fontSize:11, color:C.dust }}>{fam.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign:'center', padding:'18px 0 8px', color:C.mist, fontSize:13, lineHeight:1.6 }}>
                        <div style={{ marginBottom:14 }}>No encontramos ese rubro en la lista.</div>
                        <button
                          onClick={() => {
                            const term = catSearch.trim()
                            setForm(f => ({ ...f, category: '__otro__', customCategory: term }))
                            setCatFamily('otro')
                            setCatSearch('')
                          }}
                          style={{
                            display:'inline-flex', alignItems:'center', gap:8,
                            padding:'12px 20px', background:G, border:'none', borderRadius:12,
                            color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700,
                            cursor:'pointer', boxShadow:'0 4px 16px rgba(189,75,248,0.30)',
                          }}>
                          Usar "<strong>{catSearch.trim()}</strong>" como mi rubro
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Family grid */}
                {!catSearch.trim() && !catFamily && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:16 }}>
                    {COMMERCE_FAMILIES.map(fam => {
                      const hasSelection = fam.subs.some(s => s.name === form.category) || (fam.id === 'otro' && form.category === '__otro__')
                      return (
                        <button key={fam.id} onClick={() => setCatFamily(fam.id)}
                          style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:'14px 8px', background: hasSelection ? `${C.v}22` : 'rgba(255,255,255,0.04)', border:`1.5px solid ${hasSelection ? C.v : 'rgba(255,255,255,0.10)'}`, borderRadius:14, cursor:'pointer', transition:'background 130ms ease, border-color 130ms ease' }}>
                          <fam.Icon size={22} color={hasSelection ? C.v : 'rgba(255,255,255,0.50)'} strokeWidth={1.5} />
                          <span style={{ fontSize:11, fontWeight:600, color: hasSelection ? C.white : 'rgba(255,255,255,0.65)', lineHeight:1.2, textAlign:'center' }}>{fam.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Subcategory grid */}
                {!catSearch.trim() && catFamily && catFamily !== 'otro' && activeFam && (
                  <div style={{ marginBottom:16 }}>
                    <button onClick={() => setCatFamily(null)} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, background:'none', border:'none', cursor:'pointer', color:C.mist, fontSize:13, padding:0 }}>
                      <ChevronLeft size={15} /> Volver a familias
                    </button>
                    <div style={{ fontSize:12, fontWeight:700, color:C.dust, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>{activeFam.name}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
                      {activeFam.subs.map(sub => {
                        const sel = form.category === sub.name
                        return (
                          <button key={sub.name} onClick={() => setForm(f => ({ ...f, category: sub.name, customCategory:'' }))}
                            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:'14px 8px', background: sel ? `${C.v}22` : 'rgba(255,255,255,0.04)', border:`1.5px solid ${sel ? C.v : 'rgba(255,255,255,0.10)'}`, borderRadius:14, cursor:'pointer', transition:'background 130ms ease, border-color 130ms ease' }}>
                            <sub.Icon size={22} color={sel ? C.v : 'rgba(255,255,255,0.50)'} strokeWidth={1.5} />
                            <span style={{ fontSize:11, fontWeight:600, color: sel ? C.white : 'rgba(255,255,255,0.65)', lineHeight:1.2, textAlign:'center' }}>{sub.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Otro — text input */}
                {!catSearch.trim() && catFamily === 'otro' && (
                  <div style={{ marginBottom:16 }}>
                    <button onClick={() => setCatFamily(null)} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, background:'none', border:'none', cursor:'pointer', color:C.mist, fontSize:13, padding:0 }}>
                      <ChevronLeft size={15} /> Volver a familias
                    </button>
                    <div style={{ fontSize:12, fontWeight:700, color:C.dust, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>Describí tu rubro</div>
                    <input
                      type="text" maxLength={40}
                      value={form.customCategory||''}
                      onChange={e => setForm(f => ({ ...f, category:'__otro__', customCategory: e.target.value }))}
                      placeholder="Ej: Kinesiólogo, Fotocopias..."
                      style={{ width:'100%', padding:'14px 16px', background:'rgba(255,255,255,0.06)', border:`1px solid ${form.category === '__otro__' && form.customCategory ? C.rim : 'rgba(255,255,255,0.12)'}`, borderRadius:14, color:C.white, fontSize:15, fontFamily:FI, boxSizing:'border-box' }}
                    />
                    <div style={{ fontSize:11, color:C.dust, textAlign:'right', marginTop:4 }}>{(form.customCategory||'').length}/40</div>
                  </div>
                )}

                {/* Current selection chip */}
                {form.category && !catSearch.trim() && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(189,75,248,0.12)', border:'1px solid rgba(189,75,248,0.25)', borderRadius:10, marginBottom:12 }}>
                    <Check size={14} color={C.v} />
                    <span style={{ fontSize:13, color:C.white, fontWeight:600 }}>
                      {form.category === '__otro__' ? (form.customCategory || 'Escribí tu rubro arriba') : form.category}
                    </span>
                  </div>
                )}

                <button onClick={next} disabled={!step3ok}
                  style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor: step3ok ? 'pointer' : 'not-allowed', opacity: step3ok ? 1 : 0.40, boxShadow: step3ok ? '0 8px 32px rgba(189,75,248,0.40)' : 'none', transition:'opacity 200ms ease' }}>
                  Continuar
                </button>
              </div>
            )
          })()}

          {/* ── Paso 4: Ubicación ── */}
          {step === 4 && (
            <div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, letterSpacing:'-.02em', lineHeight:1.15 }}>¿Dónde está tu negocio?</div>
                <div style={{ marginTop:6 }}>
                  <InfoHint align="right" text={
                    'La ubicación se usa para que los clientes de tu zona te encuentren cuando navegan el directorio por ciudad.\n\n' +
                    'Por ahora cubrimos Argentina. Si tu ciudad no aparece en la lista, escribinos por soporte y la sumamos.\n\n' +
                    'Podés saltar este paso y completarlo después desde la pestaña Configuración.'
                  } />
                </div>
              </div>
              <div style={{ fontSize:14, color:C.mist, marginBottom:24, lineHeight:1.5 }}>Así te encuentran los clientes cercanos</div>

              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:C.dust, fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:7 }}>País</div>
                <select className="ob-select" value={form.country} onChange={e => setRCCountry(e.target.value)}
                  style={{ width:'100%', padding:'13px 44px 13px 16px', background:'rgba(255,255,255,0.06)', border:`1px solid ${form.country ? C.rim : 'rgba(255,255,255,0.12)'}`, borderRadius:14, color: form.country ? C.white : C.dust, fontSize:15, fontFamily:FI, boxSizing:'border-box', cursor:'pointer' }}>
                  <option value="" style={{ background:'#0D0818', color:C.mist }}>Seleccioná un país</option>
                  <option value="argentina" style={{ background:'#0D0818', color:C.white }}>Argentina</option>
                </select>
              </div>

              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color: form.country ? C.dust : 'rgba(255,255,255,0.20)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:7, transition:'color 180ms ease' }}>Provincia</div>
                <select className="ob-select" value={form.province} onChange={e => setRCProvince(e.target.value)} disabled={!form.country}
                  style={{ width:'100%', padding:'13px 44px 13px 16px', background:'rgba(255,255,255,0.06)', border:`1px solid ${form.province ? C.rim : 'rgba(255,255,255,0.12)'}`, borderRadius:14, color: form.province ? C.white : C.dust, fontSize:15, fontFamily:FI, boxSizing:'border-box', cursor: form.country ? 'pointer' : 'default' }}>
                  <option value="" style={{ background:'#0D0818', color:C.mist }}>Seleccioná una provincia</option>
                  {rcProvinces.map(([key, prov]) => (
                    <option key={key} value={key} style={{ background:'#0D0818', color:C.white }}>{prov.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, color: form.province ? C.dust : 'rgba(255,255,255,0.20)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:7, transition:'color 180ms ease' }}>Localidad</div>
                <select className="ob-select" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} disabled={!form.province}
                  style={{ width:'100%', padding:'13px 44px 13px 16px', background:'rgba(255,255,255,0.06)', border:`1px solid ${form.city ? C.rim : 'rgba(255,255,255,0.12)'}`, borderRadius:14, color: form.city ? C.white : C.dust, fontSize:15, fontFamily:FI, boxSizing:'border-box', cursor: form.province ? 'pointer' : 'default' }}>
                  <option value="" style={{ background:'#0D0818', color:C.mist }}>Seleccioná una localidad</option>
                  {rcCities.map(name => (
                    <option key={name} value={name} style={{ background:'#0D0818', color:C.white }}>{name}</option>
                  ))}
                </select>
              </div>

              {form.province && rcCities.length > 0 && (
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)', textAlign:'center', marginBottom:16 }}>
                  ¿No encontrás tu localidad? Elegí la más cercana.
                </div>
              )}

              <button onClick={next} disabled={!form.city}
                style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor: form.city ? 'pointer' : 'not-allowed', opacity: form.city ? 1 : 0.40, boxShadow: form.city ? '0 8px 32px rgba(189,75,248,0.40)' : 'none', transition:'opacity 200ms ease' }}>
                Continuar
              </button>
            </div>
          )}

          {/* ── Paso 5: Sistema de puntos ── */}
          {step === 5 && (
            <div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, letterSpacing:'-.02em', lineHeight:1.15 }}>¿Cómo van a ganar premios?</div>
                <div style={{ marginTop:6 }}>
                  <InfoHint align="right" text={
                    'Elegí cómo tus clientes acumulan recompensas:\n\n' +
                    '• Estrellas: simple, 1 estrella por compra. Ideal para cafeterías, barberías y rubros con tickets parecidos.\n\n' +
                    '• Puntos: flexible, 1 punto por cada peso gastado. Ideal si los tickets varían mucho (restaurantes, ropa, ferretería).\n\n' +
                    'Después podés cambiarlo desde el panel.'
                  } />
                </div>
              </div>
              <div style={{ fontSize:13, color:C.mist, marginBottom:20, lineHeight:1.5 }}>Después podés cambiarlo.</div>

              {/* Pasos visibles solo en flow Estrellas (el de Puntos es 1 sólo paso) */}
              {form.prog_type === 'stars' && (
                <div style={{ fontFamily:FN, fontSize:10, fontWeight:700, color:'#8B5CF6', letterSpacing:'.10em', textTransform:'uppercase', marginBottom:8 }}>
                  Paso 1 · Sistema
                </div>
              )}

              {/* Cards minimales — color por sistema (violeta stars / fucsia points)
                  para consistencia con el Tab Fidelización del panel y el listado
                  de premios. */}
              {(() => {
                const SYS = {
                  stars:  { color:'#8B5CF6', rgb:'139,92,246'  },  // violeta
                  points: { color:'#EC4899', rgb:'236,72,153'  },  // fucsia
                }
                return (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                    {[
                      { id:'stars',  Icon:Star, label:'Estrellas', short:'1 ★ por compra' },
                      { id:'points', Icon:Gem,  label:'Puntos',    short:'1 pto = $1' },
                    ].map(opt => {
                      const sel = form.prog_type === opt.id
                      const sys = SYS[opt.id]
                      return (
                        <button key={opt.id}
                          onClick={() => setForm(f => {
                            const next = { ...f, prog_type: opt.id }
                            if (opt.id === 'points' && (Number(f.prog_goal) || 0) < 100) next.prog_goal = 5000
                            if (opt.id === 'stars' && (Number(f.prog_goal) || 0) > 30)   next.prog_goal = 10
                            return next
                          })}
                          style={{
                            padding:'20px 14px', borderRadius:14, cursor:'pointer',
                            background: sel ? `rgba(${sys.rgb},0.14)` : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${sel ? sys.color : 'rgba(255,255,255,0.10)'}`,
                            boxShadow: sel ? `0 6px 22px rgba(${sys.rgb},0.20)` : 'none',
                            display:'flex', flexDirection:'column', alignItems:'center', gap:9,
                            transition:'background 130ms ease, border-color 130ms ease, box-shadow 220ms ease',
                          }}>
                          <opt.Icon size={28} color={sel ? sys.color : 'rgba(255,255,255,0.45)'} strokeWidth={1.6} fill={sel && opt.id==='stars' ? sys.color : 'none'} />
                          <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color: sel ? C.white : 'rgba(255,255,255,0.70)' }}>{opt.label}</div>
                          <div style={{ fontSize:11, color: sel ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.40)', textAlign:'center' }}>{opt.short}</div>
                        </button>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Preview compacto — usa el color del sistema activo */}
              {(() => {
                const sysColor = form.prog_type === 'stars' ? '#8B5CF6' : '#EC4899'
                const sysRgb   = form.prog_type === 'stars' ? '139,92,246' : '236,72,153'
                return (
                  <div style={{ marginBottom:14, padding:'10px 12px', background:`rgba(${sysRgb},0.10)`, border:`1px solid rgba(${sysRgb},0.22)`, borderRadius:10, fontSize:12, color:C.mist, lineHeight:1.5, display:'flex', alignItems:'center', gap:8 }}>
                    <Eye size={12} color={sysColor} strokeWidth={2} style={{ flexShrink:0 }} />
                    <span>Tus clientes <strong style={{ color:C.white }}>{form.prog_type === 'stars' ? 'suman 1 estrella ★ por compra' : 'suman 1 punto por cada peso gastado'}</strong>.</span>
                  </div>
                )
              })()}

              {/* Compra mínima — acordeón colapsado por default. Solo stars. */}
              {form.prog_type === 'stars' && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <div style={{ fontFamily:FN, fontSize:10, fontWeight:700, color:'#8B5CF6', letterSpacing:'.10em', textTransform:'uppercase' }}>
                    Paso 2 · Compra mínima
                  </div>
                  <InfoHint align="left" text={
                    'Solo cuentan las compras de este monto en adelante para sumar una estrella.\n\n' +
                    'Útil si vendés productos baratos: así un cliente que compra solo $100 no acumula estrellas tan rápido.\n\n' +
                    'Si lo dejás vacío, cualquier compra suma una estrella.'
                  } />
                </div>
              )}
              {form.prog_type === 'stars' && (
                <div style={{ marginBottom:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:12, overflow:'hidden' }}>
                  <button type="button" onClick={() => setMinPurchaseOpen(o => !o)}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', color:C.white, fontFamily:'inherit' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Star size={14} color="rgba(251,191,36,0.85)" fill="currentColor" strokeWidth={0} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.white }}>Compra mínima <span style={{ color:C.dust, fontWeight:400, fontSize:11 }}>(opcional)</span></div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:2 }}>
                          {parseInt(form.prog_min_purchase) > 0
                            ? `$${parseInt(form.prog_min_purchase).toLocaleString('es-AR')} mínimo`
                            : 'Sin mínimo · cualquier compra suma'}
                        </div>
                      </div>
                    </div>
                    <ChevronDown size={16} color="rgba(255,255,255,0.40)" style={{ transform: minPurchaseOpen ? 'rotate(180deg)' : 'none', transition:'transform 200ms ease', flexShrink:0 }} />
                  </button>
                  {minPurchaseOpen && (() => {
                    const noMin = !form.prog_min_purchase || Number(form.prog_min_purchase) === 0
                    return (
                      <div style={{ padding:'0 14px 14px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                        <input type="number" min={0}
                          value={form.prog_min_purchase}
                          disabled={noMin}
                          onChange={e => setForm(f => ({ ...f, prog_min_purchase: e.target.value }))}
                          placeholder="Ej: $ 10.000"
                          style={{ width:'100%', marginTop:12, padding:'11px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, color:C.white, fontSize:14, fontFamily:FI, boxSizing:'border-box', opacity: noMin ? 0.45 : 1, cursor: noMin ? 'not-allowed' : 'text' }}
                        />
                        {/* Checkbox "sin compra mínima" — al tildarlo deshabilita el input y limpia el monto */}
                        <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:10, cursor:'pointer' }}>
                          <input type="checkbox"
                            checked={noMin}
                            onChange={e => {
                              if (e.target.checked) setForm(f => ({ ...f, prog_min_purchase: '' }))
                              // Al destildar no hacemos nada — el user va a escribir un monto en el input
                            }}
                            style={{ width:16, height:16, accentColor:'#BD4BF8', cursor:'pointer', flexShrink:0 }}
                          />
                          <span style={{ fontSize:12, color:'rgba(255,255,255,0.78)', userSelect:'none' }}>
                            Sin compra mínima · cualquier compra suma estrella
                          </span>
                        </label>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:8, lineHeight:1.5 }}>
                          Útil si vendés productos baratos. Solo compras de ese monto o más suman estrella.
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Footnote compacto — info premios */}
              <div style={{ fontSize:11, color:C.dust, marginBottom:18, padding:'0 4px', display:'flex', alignItems:'center', gap:6 }}>
                <Gift size={11} strokeWidth={2} color={C.dust} />
                El costo de cada premio se define después en el catálogo. Podés tener varios.
              </div>

              <button onClick={next} disabled={!form.prog_type}
                style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor: form.prog_type ? 'pointer' : 'not-allowed', opacity: form.prog_type ? 1 : 0.40, boxShadow: '0 8px 32px rgba(189,75,248,0.40)' }}>
                Continuar
              </button>
            </div>
          )}

          {/* ── Paso 6: Detalles del local (todos opcionales) ── */}
          {step === 6 && (
            <div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, letterSpacing:'-.02em', lineHeight:1.15 }}>Datos de contacto</div>
                <div style={{ marginTop:6 }}>
                  <InfoHint align="right" text={
                    'Toda la info de este paso es opcional pero te recomendamos completarla.\n\n' +
                    'El teléfono se usa para que los clientes te contacten desde la app, y la dirección se muestra en tu ficha pública.\n\n' +
                    'Podés saltar este paso y completar todo después desde Configuración.'
                  } />
                </div>
              </div>
              <div style={{ fontSize:14, color:C.mist, marginBottom:20, lineHeight:1.5 }}>Para que tus clientes te encuentren. Podés saltar y completar después.</div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:C.mist, fontWeight:600, marginBottom:6, display:'block' }}>Teléfono / WhatsApp</label>
                <PhoneInput
                  value={form.phone}
                  onChange={v => setForm(f => ({ ...f, phone: v }))}
                  size="md"
                />
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:C.mist, fontWeight:600, marginBottom:6, display:'block' }}>Dirección (calle y número)</label>
                <input type="text" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Ej: Av. San Martín 1234"
                  style={{ width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:C.white, fontSize:14, fontFamily:FI, boxSizing:'border-box' }}
                />
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:12, color:C.mist, fontWeight:600, marginBottom:6, display:'block' }}>Descripción breve</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Contale a tus clientes qué tiene de especial tu negocio en 1-2 frases."
                  rows={3} maxLength={200}
                  style={{ width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:C.white, fontSize:14, fontFamily:FI, boxSizing:'border-box', resize:'vertical' }}
                />
                <div style={{ fontSize:10, color:C.dust, textAlign:'right', marginTop:4 }}>{form.description.length}/200</div>
              </div>

              <button onClick={next}
                style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(189,75,248,0.40)' }}>
                Continuar
              </button>
            </div>
          )}

          {/* ── Paso 7: Logo (opcional) ── */}
          {step === 7 && (
            <div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, letterSpacing:'-.02em', lineHeight:1.15 }}>Logo de tu negocio</div>
                <div style={{ marginTop:6 }}>
                  <InfoHint align="right" text={
                    'El logo aparece en la tarjeta digital del cliente, en tu ficha pública y en el header del panel.\n\n' +
                    'Idealmente subí una imagen cuadrada (1:1) en JPG, PNG o WebP, mínimo 200×200 píxeles.\n\n' +
                    'Si no tenés logo todavía, saltá el paso y la app va a usar la inicial de tu nombre como avatar provisorio.'
                  } />
                </div>
              </div>
              <div style={{ fontSize:14, color:C.mist, marginBottom:24, lineHeight:1.5 }}>Te lo van a ver tus clientes en la billetera y en tu perfil. Podés saltar y subirlo después.</div>

              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:18 }}>
                {form.img_url ? (
                  <img src={form.img_url} alt="Logo" style={{ width:120, height:120, borderRadius:24, objectFit:'cover', border:'2px solid rgba(255,255,255,0.15)', marginBottom:14 }} />
                ) : (
                  <div style={{ width:120, height:120, borderRadius:24, background:'rgba(255,255,255,0.05)', border:'2px dashed rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                    <Camera size={36} color="rgba(255,255,255,0.30)" strokeWidth={1.5} />
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" id="wizard-logo-input" style={{ display:'none' }}
                  onChange={e => { if (e.target.files[0]) handleWizardLogoUpload(e.target.files[0]); e.target.value='' }} />
                <label htmlFor="wizard-logo-input" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.rim}`, fontSize:13, color:C.pearl, cursor: uploadingLogo ? 'wait' : 'pointer', fontFamily:FN, fontWeight:600 }}>
                  <Upload size={14} strokeWidth={2} />
                  {uploadingLogo ? 'Subiendo...' : (form.img_url ? 'Cambiar logo' : 'Subir desde tu carrete')}
                </label>
              </div>

              <button onClick={next}
                style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(189,75,248,0.40)' }}>
                Continuar
              </button>
            </div>
          )}

          {/* ── Paso 8: Primer premio (opcional con skip) ── */}
          {step === 8 && (
            <div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, letterSpacing:'-.02em', lineHeight:1.15 }}>¿Tu primer premio?</div>
                <div style={{ marginTop:6 }}>
                  <InfoHint align="right" text={
                    'Los premios son lo que los clientes pueden canjear con sus estrellas o puntos acumulados.\n\n' +
                    'Sugerencias de primer premio: un café gratis, 10% de descuento, una bebida de regalo, un servicio extra.\n\n' +
                    'Después podés cargar más premios y editarlos desde la pestaña Premios del panel.'
                  } />
                </div>
              </div>
              <div style={{ fontSize:14, color:C.mist, marginBottom:20, lineHeight:1.5 }}>Para que los clientes vean qué pueden canjear. Podés saltar este paso y configurar premios más adelante desde tu panel.</div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:C.mist, fontWeight:600, marginBottom:6, display:'block' }}>Nombre del premio</label>
                <input type="text" value={form.first_prize_name}
                  onChange={e => setForm(f => ({ ...f, first_prize_name: e.target.value }))}
                  placeholder={form.prog_type === 'stars' ? 'Ej: Café gratis' : 'Ej: 20% de descuento'}
                  maxLength={60}
                  style={{ width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:C.white, fontSize:14, fontFamily:FI, boxSizing:'border-box' }}
                />
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:12, color:C.mist, fontWeight:600, marginBottom:6, display:'block' }}>
                  {form.prog_type === 'stars' ? 'Estrellas necesarias' : 'Puntos necesarios'}
                </label>
                <input type="number" min={1} value={form.first_prize_cost}
                  onChange={e => setForm(f => ({ ...f, first_prize_cost: e.target.value }))}
                  placeholder={String(form.prog_goal || (form.prog_type === 'stars' ? 10 : 500))}
                  style={{ width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:C.white, fontSize:14, fontFamily:FI, boxSizing:'border-box' }}
                />
              </div>

              <button onClick={next}
                style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(189,75,248,0.40)' }}>
                Continuar
              </button>
            </div>
          )}

          {/* ── Paso 9: Confirmación ── */}
          {step === 9 && (
            <div>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:C.white, marginBottom:6, letterSpacing:'-.02em' }}>¡Todo listo!</div>
                <div style={{ fontSize:14, color:C.mist }}>Revisá los datos de tu negocio</div>
              </div>

              <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:18, padding:20, marginBottom:20 }}>
                {[
                  { label:'Nombre',    value: form.name },
                  { label:'Categoría', value: form.category === '__otro__' ? (form.customCategory?.trim() || '—') : (form.category || '—') },
                  { label:'Ubicación', value: form.city ? `${form.city}, ${LOCATIONS[form.country]?.provinces[form.province]?.name}` : '—' },
                  { label:'Programa',  value: form.prog_type === 'stars' ? 'Estrellas (1 estrella por compra)' : 'Puntos (1 punto = 1 peso)' },
                  ...(form.phone   ? [{ label:'Teléfono',   value: form.phone }]  : []),
                  ...(form.address ? [{ label:'Dirección',  value: form.address }]: []),
                  ...(form.first_prize_name && form.first_prize_cost
                    ? [{ label:'Primer premio', value: `${form.first_prize_name} (${form.first_prize_cost})` }] : []),
                ].map(({ label, value }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize:13, color:C.dust }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:C.white, textAlign:'right', maxWidth:'60%', wordBreak:'break-word' }}>{value}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10 }}>
                  <span style={{ fontSize:13, color:C.dust }}>Plan</span>
                  <span style={{ fontSize:13, fontWeight:600, color:C.white }}>Free</span>
                </div>
              </div>

              {error && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 14px', background:'rgba(248,116,68,0.12)', border:'1px solid rgba(248,116,68,0.35)', borderRadius:12, marginBottom:14, fontSize:13, color:'#f87444', lineHeight:1.4 }}>
                  <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink:0 }} />
                  {error}
                </div>
              )}

              <button onClick={handleSubmit} disabled={sending}
                style={{ width:'100%', padding:'16px', borderRadius:16, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.60 : 1, boxShadow: sending ? 'none' : '0 8px 32px rgba(189,75,248,0.40)', transition:'opacity 200ms ease' }}>
                {sending ? 'Creando tu club...' : 'Crear mi negocio'}
              </button>

              <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)', textAlign:'center', marginTop:14, lineHeight:1.6 }}>
                Foto de tapa, horarios, redes sociales y más se configuran después en tu panel.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── TERMS ACCEPTANCE ─────────────────────────────────────────────────────────
function TermsAcceptance({ user, onAccept }) {
  const [checked,         setChecked]         = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const [saveError,       setSaveError]       = useState('')
  const scrollRef = useRef(null)
  const supabase  = getSupabase()

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
      setScrolledToBottom(true)
    }
  }

  async function handleAccept() {
    if (!checked || !scrolledToBottom || loading) return
    setLoading(true)
    setSaveError('')
    await supabase
      .from('profiles')
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq('id', user.id)
    // Proceed regardless of DB result — column may not exist yet if migration is pending
    onAccept()
  }

  const canProceed = scrolledToBottom && checked

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9995, background:'#000', display:'flex', flexDirection:'column' }}>
      {/* Background blobs */}
      <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.30) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Logo />
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 20px 20px', maxWidth:520, margin:'0 auto', width:'100%', minHeight:0 }}>

        <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:'#fff', marginBottom:4 }}>Términos y Condiciones</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.50)', marginBottom:16, fontFamily:FI }}>Leé el documento completo para poder continuar.</div>

        {/* Scrollable terms — relative wrapper for the bottom fade */}
        <div style={{ flex:1, position:'relative', minHeight:0, marginBottom:12 }}>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="liquid-glass"
            style={{ height:'100%', borderRadius:20, padding:'16px 18px', overflowY:'auto' }}
          >
            <div style={{ fontFamily:FI, fontSize:13, color:'rgba(255,255,255,0.70)', lineHeight:1.75 }}>

              <p style={{ fontFamily:FN, fontWeight:700, color:'#fff', marginBottom:6, marginTop:0 }}>1. Aceptación de los Términos</p>
              <p style={{ marginBottom:16 }}>Al acceder y utilizar Benefix, aceptás estos términos y condiciones en su totalidad. Si no estás de acuerdo con alguna parte, no podés usar la aplicación.</p>

              <p style={{ fontFamily:FN, fontWeight:700, color:'#fff', marginBottom:6 }}>2. Descripción del Servicio</p>
              <p style={{ marginBottom:16 }}>Benefix es una plataforma de fidelización que permite a los usuarios acumular puntos o estrellas en comercios adheridos y canjearlos por premios. Los comercios definen sus propios programas de beneficios.</p>

              <p style={{ fontFamily:FN, fontWeight:700, color:'#fff', marginBottom:6 }}>3. Registro y Cuenta</p>
              <p style={{ marginBottom:16 }}>Para usar Benefix necesitás una cuenta de Google. Sos responsable de mantener la confidencialidad de tu cuenta y de todas las actividades que ocurran bajo ella.</p>

              <p style={{ fontFamily:FN, fontWeight:700, color:'#fff', marginBottom:6 }}>4. Uso del Servicio</p>
              <p style={{ marginBottom:8 }}>Te comprometés a usar Benefix de manera lícita y respetuosa. Está prohibido:</p>
              <ul style={{ paddingLeft:18, marginBottom:16 }}>
                <li style={{ marginBottom:4 }}>Crear cuentas falsas o múltiples</li>
                <li style={{ marginBottom:4 }}>Manipular el sistema de puntos de forma fraudulenta</li>
                <li style={{ marginBottom:4 }}>Interferir con el funcionamiento de la plataforma</li>
                <li style={{ marginBottom:4 }}>Usar la app para fines ilegales</li>
              </ul>

              <p style={{ fontFamily:FN, fontWeight:700, color:'#fff', marginBottom:6 }}>5. Puntos y Premios</p>
              <p style={{ marginBottom:16 }}>Los puntos acumulados no tienen valor monetario y no son transferibles. Los comercios pueden modificar o cancelar sus programas de beneficios en cualquier momento. Benefix no es responsable por los premios ofrecidos por los comercios.</p>

              <p style={{ fontFamily:FN, fontWeight:700, color:'#fff', marginBottom:6 }}>6. Privacidad</p>
              <p style={{ marginBottom:16 }}>Recopilamos información necesaria para el funcionamiento del servicio: nombre, email, teléfono y ubicación. No vendemos tus datos a terceros. Los comercios pueden ver tu actividad dentro de su club (visitas, puntos, canjes).</p>

              <p style={{ fontFamily:FN, fontWeight:700, color:'#fff', marginBottom:6 }}>7. Modificaciones</p>
              <p style={{ marginBottom:16 }}>Podemos modificar estos términos en cualquier momento. Te notificaremos sobre cambios importantes. El uso continuado de la app implica aceptación de los nuevos términos.</p>

              <p style={{ fontFamily:FN, fontWeight:700, color:'#fff', marginBottom:6 }}>8. Cancelación</p>
              <p style={{ marginBottom:16 }}>Podés eliminar tu cuenta en cualquier momento desde la sección "Mi Cuenta". Al hacerlo, se eliminarán tus datos y puntos acumulados de forma permanente.</p>

              <p style={{ fontFamily:FN, fontWeight:700, color:'#fff', marginBottom:6 }}>9. Contacto</p>
              <p style={{ marginBottom:16 }}>Para consultas sobre estos términos, escribinos a soporte@benefix.app</p>

              <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:8 }}>Última actualización: Abril 2026</p>
            </div>
          </div>

          {/* Bottom fade + scroll hint — disappears once scrolled to bottom */}
          {!scrolledToBottom && (
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80, borderRadius:'0 0 20px 20px', background:'linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))', pointerEvents:'none', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:10 }}>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.50)', fontFamily:FI, display:'flex', alignItems:'center', gap:4 }}>
                <ChevronDown size={13} strokeWidth={2} /> Desplazate hasta el final
              </span>
            </div>
          )}
        </div>

        {/* Checkbox — only enabled after full scroll */}
        <label style={{ display:'flex', alignItems:'flex-start', gap:12, cursor: scrolledToBottom ? 'pointer' : 'default', marginBottom:14, opacity: scrolledToBottom ? 1 : 0.40, transition:'opacity 250ms ease' }}
          onClick={() => scrolledToBottom && setChecked(v => !v)}>
          <div style={{
            width:24, height:24, borderRadius:8, flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            background: checked ? G : 'rgba(255,255,255,0.08)',
            border: checked ? 'none' : '1px solid rgba(255,255,255,0.20)',
            transition:'background 160ms ease, border 160ms ease',
          }}>
            {checked && <Check size={14} color="#fff" strokeWidth={3} />}
          </div>
          <span style={{ fontSize:13, color:'rgba(255,255,255,0.70)', fontFamily:FI, lineHeight:1.5 }}>
            Leí y acepto los <span style={{ color:'#fff', fontWeight:600 }}>Términos y Condiciones</span> y la <span style={{ color:'#fff', fontWeight:600 }}>Política de Privacidad</span> de Benefix
          </span>
        </label>

        {/* Error */}
        {saveError && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(248,116,68,0.12)', border:'1px solid rgba(248,116,68,0.35)', borderRadius:12, marginBottom:12, fontSize:13, color:'#f87444', fontFamily:FI }}>
            <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink:0 }} />
            {saveError}
          </div>
        )}

        {/* Accept button */}
        <button
          onClick={handleAccept}
          disabled={!canProceed || loading}
          style={{
            width:'100%', padding:'15px',
            background: canProceed ? G : 'rgba(255,255,255,0.08)',
            border:'none', borderRadius:16, color:'#fff',
            fontFamily:FN, fontSize:15, fontWeight:700,
            cursor: canProceed && !loading ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1,
            marginBottom:10,
            transition:'background 250ms ease, opacity 160ms ease',
          }}>
          {loading ? 'Guardando...' : 'Aceptar y continuar'}
        </button>

        {/* Sign out link */}
        <button onClick={() => supabase.auth.signOut()}
          style={{ width:'100%', padding:'10px', background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontFamily:FI, fontSize:13, cursor:'pointer' }}>
          No acepto, cerrar sesión
        </button>
      </div>
    </div>
  )
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function OnboardingView({ commerce, onComplete }) {
  const TOTAL   = 10
  const supabase = getSupabase()

  const [step,       setStep]       = useState(1)
  const [progType,   setProgType]   = useState(commerce?.prog_type || 'stars')
  const [prize,      setPrize]      = useState({ name:'Café gratis', cost:'5' })
  const [savedPrize, setSavedPrize] = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [simState,   setSimState]   = useState('idle') // idle | scanning | done
  const [upgradeModal, setUpgradeModal] = useState(null)
  const [logoUrl,      setLogoUrl]      = useState(commerce?.img_url || null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [obCropSrc,    setObCropSrc]    = useState(null)

  const unitLabel = progType === 'stars' ? 'estrellas' : 'puntos'
  const unitIcon  = progType === 'stars' ? '★' : '◆'
  const unitColor = progType === 'stars' ? '#8B5CF6' : '#EC4899'

  function next() { setStep(s => Math.min(s + 1, TOTAL)) }
  function skip() { if (step < TOTAL) next() }

  async function saveSystem() {
    setSaving(true)
    await supabase.from('commerces').update({ prog_type: progType, prog_pts: 1 }).eq('id', commerce.id)
    setSaving(false)
    next()
  }

  async function savePrize() {
    if (!prize.name || !prize.cost) return
    setSaving(true)
    const { data } = await supabase.from('prizes')
      .insert({ commerce_id: commerce.id, name: prize.name, cost: parseInt(prize.cost) })
      .select().single()
    setSavedPrize(data)
    setSaving(false)
    next()
  }

  async function handleLogoFileSelectOb(file) {
    if (!file) return
    const err = validateImageFile(file)
    if (err) { showToast('error', err); return }
    const dimErr = await checkImageDimensions(file)
    if (dimErr) { showToast('error', dimErr); return }
    const reader = new FileReader()
    reader.onload = e => setObCropSrc(e.target.result)
    reader.readAsDataURL(file)
  }

  async function handleLogoUpload(blob) {
    setObCropSrc(null)
    setUploadingLogo(true)
    const path = `${commerce.id}/logo.jpg`
    const { error } = await supabase.storage.from('commerce-images').upload(path, blob, { contentType:'image/jpeg', upsert:true })
    if (!error) {
      const { data } = supabase.storage.from('commerce-images').getPublicUrl(path)
      await supabase.from('commerces').update({ img_url: data.publicUrl }).eq('id', commerce.id)
      setLogoUrl(data.publicUrl)
    }
    setUploadingLogo(false)
  }

  async function runSimulation() {
    setSimState('scanning')
    await new Promise(r => setTimeout(r, 1800))
    setSimState('done')
  }

  async function finish() {
    await supabase.from('commerces').update({ onboarding_done: true }).eq('id', commerce.id)
    onComplete()
  }

  // ── WRAPPER ──
  // BUG FIX: antes esto era `const Wrap = ({ children }) => (...)` y al
  // estar declarado dentro de OnboardingView, React lo veía como un
  // componente NUEVO en cada render (la referencia cambia). Eso provocaba
  // que el árbol se desmontara y se remontara con cada cambio de state,
  // haciendo que los inputs "se traben" (perdieran foco después de cada
  // keystroke). Lo convertimos en una función helper que devuelve JSX
  // directamente — React solo ve los nodos hijos, no un componente nuevo,
  // y los inputs mantienen su identidad entre renders.
  const wrap = (children) => (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', padding:'0 20px 60px' }}>
      {upgradeModal && (
        <UpgradeModal
          feature={upgradeModal}
          onUpgrade={async () => { setUpgradeModal(null) }}
          onViewPlans={() => setUpgradeModal(null)}
          onClose={() => setUpgradeModal(null)}
        />
      )}
      {/* Progress bar */}
      <div style={{ width:'100%', maxWidth:520, paddingTop:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:10, color:C.dust, letterSpacing:'.1em', textTransform:'uppercase' }}>Paso {step} de {TOTAL}</span>
          {step < TOTAL && (
            <button onClick={skip} style={{ background:'none', border:'none', color:C.dust, fontSize:11, cursor:'pointer', padding:0 }}>
              Saltar →
            </button>
          )}
        </div>
        <div style={{ height:3, background:C.rim, borderRadius:3, overflow:'hidden', marginBottom:32 }}>
          <div style={{ height:'100%', width:`${(step/TOTAL)*100}%`, background:GV, borderRadius:3, transition:'width .4s ease' }} />
        </div>
      </div>
      <div style={{ width:'100%', maxWidth:520 }}>{children}</div>
    </div>
  )

  // ── STEP 1: BIENVENIDA ──
  if (step === 1) return (
    wrap(<>
      <div style={{ textAlign:'center', paddingTop:20 }}>
        {commerce.emoji
          ? <div style={{ fontSize:56, marginBottom:20 }}>{commerce.emoji}</div>
          : <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}><div style={{ width:72, height:72, borderRadius:18, background:`${C.v}33`, display:'flex', alignItems:'center', justifyContent:'center' }}><Building2 size={36} color={C.v} strokeWidth={2} /></div></div>
        }
        <div style={{ fontFamily:FN, fontSize:28, fontWeight:900, color:C.white, lineHeight:1.15, marginBottom:12 }}>
          Activá tu sistema de<br />
          <span style={{ background:GV, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>fidelización</span>{' '}en minutos
        </div>
        <div style={{ fontSize:14, color:C.mist, marginBottom:10, lineHeight:1.7 }}>
          Hacé que tus clientes vuelvan sin esfuerzo.
        </div>
        <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.v, marginBottom:32 }}>
          {commerce.name} ·{' '}
          <span style={{ color:C.mist, fontWeight:400 }}>te va a llevar menos de 5 min</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:32, textAlign:'left' }}>
          {[
            { Icon:Star,       t:'Elegís cómo recompensar (estrellas o puntos)' },
            { Icon:Gift,       t:'Creás tu primer premio en segundos' },
            { Icon:Smartphone, t:'Simulamos un escaneo real para que veas cómo funciona' },
          ].map(({ Icon: StepIcon, t }) => (
            <div key={t} style={{ display:'flex', alignItems:'flex-start', gap:12, background:C.card, border:`1px solid ${C.rim}`, borderRadius:12, padding:'12px 14px' }}>
              <StepIcon size={18} color={C.v} strokeWidth={2} style={{ flexShrink:0, marginTop:2 }} />
              <span style={{ fontSize:13, color:C.mist, lineHeight:1.5 }}>{t}</span>
            </div>
          ))}
        </div>
        <GBtn onClick={next} style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'14px' }}>
          Empezar →
        </GBtn>
        <button onClick={finish} style={{ background:'none', border:'none', color:C.dust, fontSize:11, cursor:'pointer', marginTop:14, display:'block', margin:'14px auto 0' }}>
          Ya conozco el sistema, ir al panel
        </button>
      </div>
    </>)
  )

  // Cropper toma toda la pantalla mientras se edita
  if (obCropSrc) return <LogoCropper imageSrc={obCropSrc} onSave={handleLogoUpload} onCancel={() => setObCropSrc(null)} />

  // ── STEP 2: LOGO DEL NEGOCIO ──
  if (step === 2) return (
    wrap(<>
      <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:6 }}>La cara de tu negocio</div>
      <div style={{ fontSize:13, color:C.mist, marginBottom:28, lineHeight:1.6 }}>
        Tu logo aparece en las tarjetas de fidelización y en el directorio. Podés agregarlo ahora o después.
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, marginBottom:32 }}>
        <div style={{ width:100, height:100, borderRadius:24, background: logoUrl ? 'transparent' : C.bg3, border:`2px dashed ${logoUrl ? 'transparent' : C.rim}`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {logoUrl
            ? <img src={logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <Building2 size={36} color={C.rim} strokeWidth={1.5} />
          }
        </div>

        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" id="logo-upload-ob" style={{ display:'none' }}
          onChange={e => { if (e.target.files[0]) handleLogoFileSelectOb(e.target.files[0]); e.target.value='' }} />

        <label htmlFor="logo-upload-ob"
          style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:12, cursor: uploadingLogo ? 'default' : 'pointer', fontSize:13, color: uploadingLogo ? C.dust : C.pearl, pointerEvents: uploadingLogo ? 'none' : 'auto' }}>
          <Upload size={13} strokeWidth={2} />
          {uploadingLogo ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
        </label>

        {logoUrl && (
          <div style={{ fontSize:11, color:C.ok, display:'flex', alignItems:'center', gap:5 }}>
            <CheckCircle size={12} strokeWidth={2} color={C.ok} /> Logo guardado
          </div>
        )}
      </div>

      <GBtn onClick={next} disabled={uploadingLogo} style={{ width:'100%', justifyContent:'center', fontSize:14, padding:'13px' }}>
        {logoUrl ? 'Continuar →' : 'Continuar sin logo →'}
      </GBtn>
    </>)
  )

  // ── STEP 3: SISTEMA DE FIDELIZACIÓN ──
  if (step === 3) return (
    wrap(<>
      <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:6 }}>¿Cómo recompensás a tus clientes?</div>
      <div style={{ fontSize:13, color:C.mist, marginBottom:28, lineHeight:1.6 }}>Podés cambiarlo después. Te recomendamos empezar con estrellas.</div>
      <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:32 }}>
        {[
          { id:'stars',  Icon:Star,  label:'Estrellas', desc:'1 estrella por compra. Simple y visual. Ideal para la mayoría de negocios.', badge:'Recomendado' },
          { id:'points', Icon:Gem,   label:'Puntos',   desc:'1 punto por cada peso gastado. Flexible para ticket variable.' },
        ].map(opt => (
          <button key={opt.id} onClick={() => setProgType(opt.id)}
            style={{ display:'flex', alignItems:'flex-start', gap:14, padding:18, background: progType===opt.id ? `${opt.id==='stars'?'#8B5CF6':'#EC4899'}18` : C.card, border:`2px solid ${progType===opt.id ? (opt.id==='stars'?'#8B5CF6':'#EC4899') : C.rim}`, borderRadius:16, cursor:'pointer', textAlign:'left', position:'relative', transition:'background 130ms ease, border-color 130ms ease, color 130ms ease, transform 130ms cubic-bezier(0.23,1,0.32,1)' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`${opt.id==='stars'?'#8B5CF6':'#EC4899'}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{(() => { const I = opt.Icon; return I ? <I size={20} color={opt.id==='stars'?'#8B5CF6':'#EC4899'} strokeWidth={1.5} /> : null })()}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontFamily:FN, fontSize:15, fontWeight:700, color:C.white }}>{opt.label}</span>
                {opt.badge && <span style={{ fontSize:9, fontWeight:700, color:'#8B5CF6', background:'#8B5CF622', padding:'2px 7px', borderRadius:10, letterSpacing:'.07em' }}>{opt.badge}</span>}
              </div>
              <div style={{ fontSize:12, color:C.mist, lineHeight:1.5 }}>{opt.desc}</div>
            </div>
            {progType===opt.id && <div style={{ position:'absolute', top:14, right:16, width:18, height:18, borderRadius:'50%', background: opt.id==='stars'?'#F5A623':'#5B8DEF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }}>✓</div>}
          </button>
        ))}
      </div>
      <GBtn onClick={saveSystem} disabled={saving} style={{ width:'100%', justifyContent:'center', fontSize:14, padding:'13px' }}>
        {saving ? '⟳ Guardando...' : 'Continuar →'}
      </GBtn>
    </>)
  )

  // ── STEP 4: PRIMER PREMIO ──
  if (step === 4) return (
    wrap(<>
      <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:6 }}>Creá tu primera recompensa</div>
      <div style={{ fontSize:13, color:C.mist, marginBottom:24, lineHeight:1.6 }}>
        Esta es la recompensa que recibe el cliente al acumular {prize.cost || '?'} {unitLabel}. Ya dejamos todo listo para que sólo confirmes.
      </div>
      <PCard style={{ padding:20, marginBottom:20 }}>
        <div style={{ fontSize:10, color:C.dust, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Nombre del premio</div>
        <input value={prize.name} onChange={e => setPrize(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Café gratis, 20% OFF..."
          style={{ background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'12px 14px', fontSize:14, color:C.pearl, width:'100%', marginBottom:16 }} />
        <div style={{ fontSize:10, color:C.dust, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>
          Costo en {unitLabel}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <input type="number" min={1} value={prize.cost} onChange={e => setPrize(p => ({ ...p, cost: e.target.value }))}
            style={{ background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'12px 16px', fontSize:28, fontWeight:700, color:C.white, width:100, textAlign:'center', fontFamily:FN }} />
          {progType === 'stars' ? <Star size={28} color={unitColor} strokeWidth={1.5} /> : <Gem size={28} color={unitColor} strokeWidth={1.5} />}
          <div style={{ fontSize:12, color:C.dust, lineHeight:1.5 }}>
            El cliente necesitará {prize.cost || '?'} {unitLabel} para canjear este premio.
          </div>
        </div>
      </PCard>
      <div style={{ background:`${C.v}11`, border:`1px solid ${C.v}33`, borderRadius:12, padding:'12px 14px', marginBottom:24, fontSize:12, color:C.mist, lineHeight:1.6 }}>
        Podés editar o agregar más premios después desde la sección <strong style={{ color:C.pearl }}>Premios</strong>.
      </div>
      <GBtn onClick={savePrize} disabled={saving||!prize.name||!prize.cost} style={{ width:'100%', justifyContent:'center', fontSize:14, padding:'13px' }}>
        {saving ? 'Creando...' : 'Crear recompensa →'}
      </GBtn>
    </>)
  )

  // ── STEP 5: EXPLICACIÓN QR ──
  if (step === 5) return (
    wrap(<>
      <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:6 }}>¿Cómo funciona el escaneo?</div>
      <div style={{ fontSize:13, color:C.mist, marginBottom:28, lineHeight:1.6 }}>
        Cada cliente tiene un QR único en su celular. Vos lo escaneás en caja y el sistema hace todo automáticamente.
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
        {[
          { n:'01', t:'El cliente muestra su QR', d:'Cada usuario tiene un código único generado al registrarse.' },
          { n:'02', t:'Vos lo escaneás',           d:'Con la cámara de tu celular desde el escáner de la app.' },
          { n:'03', t:'Se acreditan los beneficios', d:`El cliente recibe ${unitLabel} automáticamente y ve su progreso en tiempo real.` },
        ].map(s => (
          <div key={s.n} style={{ display:'flex', gap:14, background:C.card, border:`1px solid ${C.rim}`, borderRadius:14, padding:'14px 16px' }}>
            <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:C.rim, lineHeight:1, flexShrink:0, width:28 }}>{s.n}</div>
            <div>
              <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, marginBottom:3 }}>{s.t}</div>
              <div style={{ fontSize:12, color:C.mist, lineHeight:1.5 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
      <GBtn onClick={next} style={{ width:'100%', justifyContent:'center', fontSize:14, padding:'13px' }}>
        Simular un escaneo →
      </GBtn>
    </>)
  )

  // ── STEP 6: SIMULACIÓN ──
  if (step === 6) return (
    wrap(<>
      <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:6 }}>Simulá un escaneo real</div>
      <div style={{ fontSize:13, color:C.mist, marginBottom:28, lineHeight:1.6 }}>
        Presioná el botón para ver cómo se ve cuando escaneás a un cliente.
      </div>

      <PCard style={{ padding:24, marginBottom:20, textAlign:'center' }}>
        {simState === 'idle' && (
          <>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
              <div style={{ width:64, height:64, borderRadius:16, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <QrCode size={32} color='rgba(255,255,255,0.50)' strokeWidth={2} />
              </div>
            </div>
            <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:C.white, marginBottom:6 }}>Cliente de prueba listo</div>
            <div style={{ fontSize:12, color:C.mist, marginBottom:20 }}>Juan Pérez · QR simulado</div>
            <GBtn onClick={runSimulation} style={{ justifyContent:'center', width:'100%', fontSize:14, padding:'13px' }}>
              <Zap size={13} strokeWidth={2} /> Simular escaneo
            </GBtn>
          </>
        )}
        {simState === 'scanning' && (
          <>
            <div style={{ width:72, height:72, borderRadius:'50%', border:`3px solid ${C.v}`, borderTopColor:'transparent', margin:'0 auto 16px', animation:'spin 0.8s linear infinite' }} />
            <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:C.white }}>Escaneando...</div>
            <div style={{ fontSize:11, color:C.mist, marginTop:4 }}>Procesando QR de Juan Pérez</div>
          </>
        )}
        {simState === 'done' && (
          <>
            <div style={{ width:60, height:60, borderRadius:'50%', background:`${C.ok}22`, border:`2px solid ${C.ok}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto 14px' }}>✓</div>
            <div style={{ fontFamily:FN, fontSize:16, fontWeight:900, color:C.ok, marginBottom:4 }}>¡Visita registrada!</div>
            <div style={{ fontSize:13, color:C.white, marginBottom:16 }}>Juan Pérez · 1ª visita</div>
            <div style={{ background:C.bg3, borderRadius:12, padding:'14px 16px', textAlign:'left', marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:12, color:C.mist }}>Progreso al premio</span>
                <span style={{ fontFamily:FN, fontSize:12, fontWeight:700, color:unitColor }}>1 / {prize.cost||5} {unitIcon}</span>
              </div>
              <div style={{ height:6, borderRadius:6, background:C.rim, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(100,(1/(parseInt(prize.cost)||5))*100)}%`, background:unitColor, borderRadius:6 }} />
              </div>
            </div>
            {savedPrize && (
              <div style={{ fontSize:11, color:C.mist }}>Falta{prize.cost>1?'n':''} {(parseInt(prize.cost)||5)-1} {unitLabel} para "{savedPrize.name}"</div>
            )}
          </>
        )}
      </PCard>

      {simState === 'done' && (
        <GBtn onClick={next} style={{ width:'100%', justifyContent:'center', fontSize:14, padding:'13px' }}>
          Continuar →
        </GBtn>
      )}
    </>)
  )

  // ── STEP 7: RESULTADO / AHA MOMENT ──
  if (step === 7) return (
    wrap(<>
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:`${C.v}22`, border:`1px solid ${C.v}44`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Rocket size={32} color={C.v} strokeWidth={2} />
          </div>
        </div>
        <div style={{ fontFamily:FN, fontSize:24, fontWeight:900, color:C.white, lineHeight:1.2, marginBottom:10 }}>
          Listo. Ya estás<br />
          <span style={{ background:GV, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>fidelizando clientes</span>
        </div>
        <div style={{ fontSize:13, color:C.mist, lineHeight:1.7 }}>
          Así se verá cada vez que un cliente visite tu negocio y vos escanees su QR.
        </div>
      </div>
      <PCard style={{ padding:20, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:`${C.v}33`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FN, fontWeight:900, fontSize:18, color:C.v }}>J</div>
          <div>
            <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:C.white }}>Juan Pérez</div>
            <div style={{ fontSize:11, color:C.ok }}>● 1 visita registrada</div>
          </div>
          <div style={{ marginLeft:'auto', textAlign:'right' }}>
            <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:unitColor }}>1 {unitIcon}</div>
            <div style={{ fontSize:10, color:C.dust }}>acumulado</div>
          </div>
        </div>
        {savedPrize && (
          <div style={{ background:C.bg3, borderRadius:10, padding:'10px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:11, color:C.mist, display:'flex', alignItems:'center', gap:4 }}><Gift size={11} color={C.mist} strokeWidth={2} />{savedPrize.name}</span>
              <span style={{ fontSize:11, color:unitColor, fontWeight:700 }}>1/{savedPrize.cost} {unitIcon}</span>
            </div>
            <div style={{ height:4, borderRadius:4, background:C.rim }}>
              <div style={{ height:'100%', width:`${Math.min(100,(1/savedPrize.cost)*100)}%`, background:unitColor, borderRadius:4 }} />
            </div>
          </div>
        )}
      </PCard>
      <GBtn onClick={next} style={{ width:'100%', justifyContent:'center', fontSize:14, padding:'13px' }}>
        Ver qué más podés hacer →
      </GBtn>
    </>)
  )

  // ── STEP 8: LÍMITES DEL PLAN ──
  if (step === 8) return (
    wrap(<>
      <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:6 }}>Tu plan actual</div>
      <div style={{ fontSize:13, color:C.mist, marginBottom:24, lineHeight:1.6 }}>
        Tu negocio está en el plan <strong style={{ color:PLANS.free.color }}>FREE</strong>. Cuando crezcas, podés desbloquear más funciones.
      </div>
      <PCard style={{ padding:20, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <span style={{ fontFamily:FN, fontSize:11, fontWeight:700, color:PLANS.free.color, background:PLANS.free.badge, padding:'3px 9px', borderRadius:6, letterSpacing:'.07em' }}>FREE</span>
          <span style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:C.white }}>Plan actual · Gratis</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { Icon: Users, label:`Hasta 30 clientes`, ok:true },
            { Icon: Gift,  label:`Hasta 2 premios activos`, ok:true },
            { Icon: Flame, label:`Promociones`, ok:false },
          ].map(f => (
            <div key={f.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <f.Icon size={14} color={f.ok ? C.mist : C.dust} strokeWidth={2} />
              <span style={{ fontSize:12, color: f.ok ? C.mist : C.dust, flex:1 }}>{f.label}</span>
              <span style={{ fontSize:11, color: f.ok ? C.ok : C.dust, display:'flex', alignItems:'center', gap:4 }}>
                {f.ok ? '✓' : <><Lock size={10} strokeWidth={2} /> STARTER</>}
              </span>
            </div>
          ))}
        </div>
      </PCard>
      <div style={{ fontSize:12, color:C.dust, marginBottom:24, lineHeight:1.6 }}>
        No te preocupes, cuando llegues al límite la app te va a avisar con tiempo.
      </div>
      <GBtn onClick={next} style={{ width:'100%', justifyContent:'center', fontSize:14, padding:'13px' }}>
        Continuar →
      </GBtn>
    </>)
  )

  // ── STEP 9: PROMOCIONES (TRIGGER DE CONVERSIÓN) ──
  if (step === 9) return (
    wrap(<>
      <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:6 }}>Una función que multiplica visitas</div>
      <div style={{ fontSize:13, color:C.mist, marginBottom:24, lineHeight:1.6 }}>
        Con promociones activas, tus clientes vuelven más seguido. Disponible en STARTER.
      </div>

      {/* Preview bloqueada */}
      <div style={{ position:'relative', marginBottom:20 }}>
        <div style={{ opacity:0.35, pointerEvents:'none', userSelect:'none' }}>
          <PCard style={{ padding:16, marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${C.o}22`, display:'flex', alignItems:'center', justifyContent:'center' }}><Zap size={18} color={C.o} strokeWidth={2} /></div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>10% OFF próxima visita</div>
                <div style={{ fontSize:10, color:C.ok }}>● Activa · vence en 3 días</div>
              </div>
            </div>
          </PCard>
          <PCard style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${C.v}22`, display:'flex', alignItems:'center', justifyContent:'center' }}><RefreshCw size={18} color={C.v} strokeWidth={2} /></div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>Suma doble esta semana</div>
                <div style={{ fontSize:10, color:C.ok }}>● Activa · vence en 7 días</div>
              </div>
            </div>
          </PCard>
        </div>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, backdropFilter:'blur(2px)', background:'rgba(13,8,24,.3)', borderRadius:14 }}>
          <Lock size={24} color='rgba(255,255,255,0.60)' strokeWidth={2} />
          <span style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>Disponible en STARTER</span>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
        {['Creá descuentos automáticos en segundos','Incentivá nuevas visitas con suma doble','Hacé que tus clientes vuelvan más seguido'].map(b => (
          <div key={b} style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, color:C.mist }}>
            <span style={{ color:PLANS.starter.color, fontWeight:700, flexShrink:0 }}>✓</span> {b}
          </div>
        ))}
      </div>

      <button onClick={() => setUpgradeModal('promotions')}
        style={{ width:'100%', padding:'13px', background:GV, border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:10, boxShadow:'0 4px 16px rgba(189,75,248,.4)' }}>
        <Zap size={13} strokeWidth={2} /> Desbloquear promociones
      </button>
      <button onClick={next}
        style={{ width:'100%', padding:'11px', background:'transparent', border:`1px solid ${C.rim}`, borderRadius:12, color:C.mist, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>
        Ahora no, ir al panel →
      </button>
    </>)
  )

  // ── STEP 10: FINAL ──
  if (step === 10) return (
    wrap(<>
      <div style={{ textAlign:'center', paddingTop:10 }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:`${C.ok}22`, border:`2px solid ${C.ok}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <CheckCircle size={30} color={C.ok} strokeWidth={2} />
          </div>
        </div>
        <div style={{ fontFamily:FN, fontSize:24, fontWeight:900, color:C.white, lineHeight:1.2, marginBottom:10 }}>
          {commerce.name} está<br />
          <span style={{ background:GV, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>listo para fidelizar</span>
        </div>
        <div style={{ fontSize:13, color:C.mist, marginBottom:32, lineHeight:1.7 }}>
          Tu sistema está configurado. Ahora probá con tu primer cliente real.
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:32 }}>
          {[
            { Icon:Star,    label:'Sistema', val: progType === 'stars' ? 'Estrellas' : 'Puntos' },
            { Icon:Gift,    label:'Premio', val: savedPrize?.name || 'Creado' },
            { Icon:Users,   label:'Clientes', val:'0 / 30' },
            { Icon:Package, label:'Plan', val:'FREE · Gratis' },
          ].map(s => (
            <div key={s.label} style={{ background:C.card, border:`1px solid ${C.rim}`, borderRadius:12, padding:'14px 12px', textAlign:'center' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:6 }}>{(() => { const I = s.Icon; return I ? <I size={18} color={C.mist} strokeWidth={1.5} /> : null })()}</div>
              <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, marginBottom:2 }}>{s.val}</div>
              <div style={{ fontSize:10, color:C.dust }}>{s.label}</div>
            </div>
          ))}
        </div>
        <GBtn onClick={finish} style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'14px' }}>
          Ir al panel →
        </GBtn>
        <div style={{ fontSize:11, color:C.dust, marginTop:14 }}>
          Desde el panel podés escanear tu primer cliente real con la cámara.
        </div>
      </div>
    </>)
  )

  return null
}

// ─── PROMO WIZARD ─────────────────────────────────────────────────────────────
function PromoWizard({ progType = 'points', onClose, onComplete, activePromos = [] }) {
  const unitLabel = progType === 'stars' ? 'estrellas' : 'puntos'
  const today     = new Date().toISOString().split('T')[0]

  const [step,      setStep]      = useState(1)
  const [promoType, setPromoType] = useState(null)  // 'discount_next' | 'double_points'
  const [form,      setForm]      = useState({ discountPct: 10, expType: 'fixed', expDate: '', expDays: 7, eventDate: '', days: [] })
  const [saving,    setSaving]    = useState(false)
  const [animKey,   setAnimKey]   = useState(0)

  function go(n) { setAnimKey(k => k + 1); setStep(n) }
  const next = () => go(step + 1)
  const prev = () => go(step - 1)

  const totalSteps   = promoType === 'discount_next' ? 4 : 3
  const progressPct  = promoType ? Math.round((step / totalSteps) * 100) : 0
  const showProgress = step > 1

  const fixedExpValid = form.expType !== 'fixed' || !!form.expDate
  const canAdvance = {
    2: promoType === 'discount_next' ? true : !!form.eventDate,
    3: promoType === 'discount_next' ? fixedExpValid : true,
  }

  function fmtDate(iso) {
    if (!iso) return '–'
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' })
  }

  async function submit() {
    setSaving(true)
    await onComplete({
      type:            promoType,
      value:           form.discountPct,
      custom_date:     form.eventDate,
      days:            form.days,
      expiration_type: form.expType,
      expiration_date: form.expDate,
      expiration_days: form.expDays,
    })
    setSaving(false)
  }

  const overlayStyle = { position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', background:'rgba(0,0,0,0.82)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)' }
  const sheetStyle   = { background:'#0d0818', border:'1px solid rgba(255,255,255,0.12)', borderRadius:24, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={sheetStyle} className="modal-in">

        {/* Header */}
        <div style={{ padding:'20px 20px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: showProgress ? 14 : 0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {step > 1 && (
                <button onClick={prev} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                  <ChevronLeft size={16} color={C.mist} strokeWidth={2} />
                </button>
              )}
              <div style={{ fontFamily:FN, fontSize:16, fontWeight:800, color:C.white }}>
                {step === 1 ? 'Nueva promoción' : (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div aria-hidden="true" style={{ width:24, height:24, borderRadius:8, background: promoType==='discount_next' ? '#7C3AED' : '#DB2777', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontFamily:FN, fontWeight:900, fontSize:9, color:'#fff', letterSpacing:'-0.02em', lineHeight:1 }}>
                        {promoType==='discount_next' ? '−%' : '×2'}
                      </span>
                    </div>
                    {promoType === 'discount_next' ? 'Descuento' : 'Suma doble'}
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <X size={14} color={C.mist} strokeWidth={2} />
            </button>
          </div>
          {showProgress && (
            <>
              <div style={{ height:3, background:'rgba(255,255,255,0.10)', borderRadius:99, overflow:'hidden', marginBottom:6 }}>
                <div style={{ height:'100%', borderRadius:99, background: promoType === 'discount_next' ? GV : promoType === 'double_points' ? 'linear-gradient(135deg,#BE185D,#ec4899)' : G, width:`${progressPct}%`, transition:'width 350ms cubic-bezier(0.23,1,0.32,1)' }} />
              </div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', fontFamily:FI }}>Paso {step} de {totalSteps}</div>
            </>
          )}
        </div>

        {/* Step content */}
        <div style={{ padding:'22px 20px 28px', minHeight:300 }}>
          <div key={animKey} className="fu">

            {/* ── Paso 1: Elegir tipo ── */}
            {step === 1 && (
              <div>
                <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:C.white, marginBottom:5 }}>¿Qué tipo de promoción?</div>
                <div style={{ fontSize:13, color:C.mist, marginBottom:20 }}>Elegí una opción para continuar</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom: activePromos.length > 0 ? 14 : 0 }}>
                  {[
                    { id:'discount_next', symbol:'−%', label:'Descuento en visita', desc:'% OFF automático en la próxima visita',    bg:'linear-gradient(135deg,#8B5CF6,#7C3AED)', shadow:'0 12px 32px -8px rgba(139,92,246,0.45)', shadowHov:'0 12px 32px -8px rgba(139,92,246,0.65)' },
                    { id:'double_points', symbol:'×2', label:'Suma doble',          desc:`Doble de ${unitLabel} por período o días`, bg:'linear-gradient(135deg,#EC4899,#DB2777)', shadow:'0 12px 32px -8px rgba(236,72,153,0.45)', shadowHov:'0 12px 32px -8px rgba(236,72,153,0.65)' },
                  ].map(t => {
                    const blocked = activePromos.some(p => p.type === t.id)
                    return (
                      <button
                        key={t.id}
                        disabled={blocked}
                        onClick={() => { if (!blocked) { setPromoType(t.id); go(2) } }}
                        aria-label={t.label}
                        style={{
                          position:'relative',
                          padding:'22px 14px 18px',
                          background: t.bg,
                          border:'1px solid rgba(255,255,255,0.10)',
                          borderRadius:18,
                          cursor: blocked ? 'not-allowed' : 'pointer',
                          textAlign:'center',
                          transition:'transform 200ms ease, box-shadow 200ms ease',
                          boxShadow: t.shadow,
                          filter: blocked ? 'saturate(0.4)' : 'none',
                          opacity: blocked ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!blocked) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=t.shadowHov } }}
                        onMouseLeave={e => { if (!blocked) { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=t.shadow } }}>
                        {blocked && (
                          <div style={{ position:'absolute', top:10, right:10, fontSize:9, fontWeight:700, color:'#FFF3CD', background:'rgba(251,191,36,0.28)', borderRadius:99, padding:'2px 7px', display:'flex', alignItems:'center', gap:3 }}>
                            <AlertCircle size={8} strokeWidth={2.5} /> Ya activa
                          </div>
                        )}
                        <div aria-hidden="true" style={{ fontFamily:FN, fontWeight:900, fontSize:'clamp(36px,9vw,48px)', color:'#fff', textShadow:'0 2px 8px rgba(0,0,0,0.20)', lineHeight:1, marginBottom:12, letterSpacing:'-0.02em' }}>
                          {t.symbol}
                        </div>
                        <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:'#fff', marginBottom:6 }}>{t.label}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.90)', lineHeight:1.5 }}>{t.desc}</div>
                      </button>
                    )
                  })}
                </div>
                {activePromos.length > 0 && (
                  <InfoBanner subtle icon={AlertCircle}>
                    {activePromos.length >= 2
                      ? <><span style={{ color:'#fff', fontWeight:600 }}>2/2 promos activas.</span>{' '}<span style={{ color:'rgba(255,255,255,0.75)', fontWeight:400 }}>Desactivá o eliminá una para crear otra.</span></>
                      : <span style={{ color:'rgba(255,255,255,0.55)', fontWeight:400 }}>Desactivá la promo marcada para crear una nueva del mismo tipo.</span>}
                  </InfoBanner>
                )}
              </div>
            )}

            {/* ── Paso 2a: Porcentaje de descuento ── */}
            {promoType === 'discount_next' && step === 2 && (
              <div>
                <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:C.white, marginBottom:5 }}>¿Cuánto descuento?</div>
                <div style={{ fontSize:13, color:C.mist, marginBottom:20 }}>Elegí el porcentaje para tus clientes</div>
                <div style={{ textAlign:'center', margin:'16px 0' }}>
                  <span style={{ fontFamily:FN, fontSize:64, fontWeight:900, background:G, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', lineHeight:1 }}>
                    {form.discountPct}%
                  </span>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginBottom:16 }}>
                  {[5,10,15,20,25,30].map(pct => (
                    <button key={pct} onClick={() => setForm(f=>({...f, discountPct:pct}))}
                      style={{ padding:'8px 16px', borderRadius:10, border:`1.5px solid ${form.discountPct===pct?C.v:C.rim}`, background:form.discountPct===pct?`${C.v}22`:C.bg3, color:form.discountPct===pct?C.white:C.mist, fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer', transition:'border-color 130ms ease, background 130ms ease, color 130ms ease' }}>
                      {pct}%
                    </button>
                  ))}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:20 }}>
                  <span style={{ fontSize:12, color:C.dust }}>o ingresá otro:</span>
                  <input type="number" min={1} max={80} value={form.discountPct}
                    onChange={e => setForm(f=>({...f, discountPct: Math.min(80, Math.max(1, parseInt(e.target.value)||1))}))}
                    style={{ width:64, background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'8px 10px', color:C.white, fontSize:15, fontFamily:FN, fontWeight:700, textAlign:'center' }} />
                  <span style={{ fontSize:13, color:C.mist }}>%</span>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={prev} style={{ flex:1, padding:'13px', background:'rgba(255,255,255,0.07)', border:`1px solid ${C.rim}`, borderRadius:13, color:C.mist, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>Atrás</button>
                  <button onClick={next} style={{ flex:2, padding:'13px', background:G, border:'none', borderRadius:13, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(254,80,0,0.35)' }}>Continuar</button>
                </div>
              </div>
            )}

            {/* ── Paso 2b: Fecha del evento (doble puntos) ── */}
            {promoType === 'double_points' && step === 2 && (
              <div>
                <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:C.white, marginBottom:5 }}>¿Cuándo aplica?</div>
                <div style={{ fontSize:13, color:C.mist, marginBottom:20 }}>Configurá los días y la fecha límite</div>

                {/* Selector de días */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:8 }}>
                    <div style={{ fontSize:11, color:C.dust, fontWeight:600 }}>Días de la semana</div>
                    <div style={{ fontSize:10, color:C.dust }}>(vacío = todos los días)</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {[{l:'Lu',v:1},{l:'Ma',v:2},{l:'Mi',v:3},{l:'Ju',v:4},{l:'Vi',v:5},{l:'Sá',v:6},{l:'Do',v:0}].map(({ l, v }) => {
                      const sel = form.days.includes(v)
                      return (
                        <button key={v}
                          onClick={() => setForm(f => ({ ...f, days: sel ? f.days.filter(d => d !== v) : [...f.days, v] }))}
                          style={{
                            flex:1, padding:'10px 0', borderRadius:10,
                            border:`1.5px solid ${sel ? '#ec4899' : C.rim}`,
                            background: sel ? 'rgba(236,72,153,0.18)' : C.bg3,
                            color: sel ? C.white : C.mist,
                            fontFamily:FN, fontSize:12, fontWeight:700,
                            cursor:'pointer', transition:'border-color 130ms ease, background 130ms ease, color 130ms ease',
                          }}>
                          {l}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, color:C.dust, fontWeight:600, marginBottom:8 }}>Fecha de vencimiento</div>
                  <input type="date" value={form.eventDate} min={today}
                    onChange={e => setForm(f=>({...f, eventDate:e.target.value}))}
                    style={{ width:'100%', background:C.bg3, border:`1px solid ${form.eventDate?C.rim:'#f8744466'}`, borderRadius:12, padding:'12px 14px', color:C.pearl, fontSize:14, boxSizing:'border-box' }} />
                  {!form.eventDate && <div style={{ fontSize:11, color:'#f87444', marginTop:6, display:'flex', alignItems:'center', gap:5 }}><AlertTriangle size={11} strokeWidth={2} /> Seleccioná una fecha</div>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ background:`${C.v}0d`, border:`1px solid ${C.v}33`, borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:10 }}>
                    <AlertCircle size={14} color={C.v} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }} />
                    <div style={{ fontSize:12, color:C.mist, lineHeight:1.6 }}>La promo de suma doble se desactivará automáticamente al vencer esta fecha.</div>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={prev} style={{ flex:1, padding:'13px', background:'rgba(255,255,255,0.07)', border:`1px solid ${C.rim}`, borderRadius:13, color:C.mist, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>Atrás</button>
                    <button onClick={next} disabled={!form.eventDate}
                      style={{ flex:2, padding:'13px', background:G, border:'none', borderRadius:13, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:form.eventDate?'pointer':'not-allowed', opacity:form.eventDate?1:0.45, boxShadow:'0 4px 16px rgba(254,80,0,0.35)', transition:'opacity 200ms ease' }}>
                      Continuar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Paso 3: Vencimiento (discount_next only) ── */}
            {promoType === 'discount_next' && step === 3 && (
              <div>
                <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:C.white, marginBottom:5 }}>¿Cuándo vence?</div>
                <div style={{ fontSize:13, color:C.mist, marginBottom:20 }}>Configurá la validez del descuento</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                  {[
                    { id:'fixed',    label:'Fecha fija',              sub:'Todos tienen el mismo límite' },
                    { id:'relative', label:'Días desde otorgamiento', sub:'Cada cliente tiene su propio plazo' },
                  ].map(opt => {
                    const sel = form.expType === opt.id
                    return (
                      <button key={opt.id} onClick={() => setForm(f=>({...f, expType:opt.id}))}
                        style={{ padding:'14px 16px', background:sel?`${C.v}18`:C.bg3, border:`1.5px solid ${sel?C.v:C.rim}`, borderRadius:14, cursor:'pointer', textAlign:'left', transition:'background 130ms ease, border-color 130ms ease', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:sel?C.white:C.mist, marginBottom:3 }}>{opt.label}</div>
                          <div style={{ fontSize:11, color:sel?C.mist:C.dust }}>{opt.sub}</div>
                        </div>
                        <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${sel?C.v:C.dust}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {sel && <div style={{ width:8, height:8, borderRadius:'50%', background:C.v }} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {form.expType === 'fixed' && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, color:C.dust, fontWeight:600, marginBottom:8 }}>Fecha de vencimiento</div>
                    <input type="date" value={form.expDate} min={today}
                      onChange={e => setForm(f=>({...f, expDate:e.target.value}))}
                      style={{ width:'100%', background:C.bg3, border:`1px solid ${form.expDate?C.rim:'#f8744466'}`, borderRadius:12, padding:'12px 14px', color:C.pearl, fontSize:14, boxSizing:'border-box' }} />
                    {!form.expDate && <div style={{ fontSize:11, color:'#f87444', marginTop:6, display:'flex', alignItems:'center', gap:5 }}><AlertTriangle size={11} strokeWidth={2} /> Seleccioná una fecha</div>}
                  </div>
                )}
                {form.expType === 'relative' && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, color:C.dust, fontWeight:600, marginBottom:8 }}>Días de validez por cliente</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                      {[3,7,14,30].map(d => (
                        <button key={d} onClick={() => setForm(f=>({...f, expDays:d}))}
                          style={{ padding:'8px 16px', borderRadius:10, border:`1.5px solid ${form.expDays===d?C.v:C.rim}`, background:form.expDays===d?`${C.v}22`:C.bg3, color:form.expDays===d?C.white:C.mist, fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer', transition:'border-color 130ms ease, background 130ms ease, color 130ms ease' }}>
                          {d}d
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:C.mist }}>
                      Cada cliente tiene <strong style={{ color:C.pearl }}>{form.expDays} días</strong> desde que recibe el descuento
                    </div>
                  </div>
                )}
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={prev} style={{ flex:1, padding:'13px', background:'rgba(255,255,255,0.07)', border:`1px solid ${C.rim}`, borderRadius:13, color:C.mist, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>Atrás</button>
                  <button onClick={next} disabled={!fixedExpValid}
                    style={{ flex:2, padding:'13px', background:G, border:'none', borderRadius:13, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:fixedExpValid?'pointer':'not-allowed', opacity:fixedExpValid?1:0.45, boxShadow:'0 4px 16px rgba(254,80,0,0.35)', transition:'opacity 200ms ease' }}>
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* ── Paso final: Confirmar ── */}
            {((promoType === 'discount_next' && step === 4) || (promoType === 'double_points' && step === 3)) && (
              <div>
                <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:C.white, marginBottom:5 }}>¡Todo listo!</div>
                <div style={{ fontSize:13, color:C.mist, marginBottom:20 }}>Revisá los detalles antes de activar</div>
                {/* Preview card */}
                <div style={{ background:'linear-gradient(135deg, rgba(63,11,120,0.50), rgba(189,75,248,0.25))', border:'1px solid rgba(189,75,248,0.35)', borderRadius:18, padding:18, marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:promoType==='discount_next'?`${C.v}30`:'rgba(236,72,153,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {promoType === 'discount_next'
                        ? <Zap size={20} color={C.v} strokeWidth={1.5} />
                        : <RefreshCw size={20} color="#ec4899" strokeWidth={1.5} />}
                    </div>
                    <div>
                      <div style={{ fontFamily:FN, fontSize:15, fontWeight:800, color:C.white }}>
                        {promoType === 'discount_next' ? `${form.discountPct}% de descuento` : 'Suma doble'}
                      </div>
                      <div style={{ fontSize:11, color:C.mist }}>Promoción activa al guardar</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {promoType === 'discount_next' && (
                      <>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                          <span style={{ color:C.mist }}>Descuento:</span>
                          <span style={{ color:C.white, fontWeight:600 }}>{form.discountPct}%</span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                          <span style={{ color:C.mist }}>Vencimiento:</span>
                          <span style={{ color:C.white, fontWeight:600 }}>
                            {form.expType === 'fixed' ? `hasta el ${fmtDate(form.expDate)}` : `${form.expDays} días por cliente`}
                          </span>
                        </div>
                      </>
                    )}
                    {promoType === 'double_points' && (
                      <>
                        {form.days.length > 0 && (
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                            <span style={{ color:C.mist }}>Días:</span>
                            <span style={{ color:C.white, fontWeight:600 }}>
                              {form.days.slice().sort((a,b)=>a-b).map(v=>(['Do','Lu','Ma','Mi','Ju','Vi','Sá'][v])).join(', ')}
                            </span>
                          </div>
                        )}
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                          <span style={{ color:C.mist }}>Fecha límite:</span>
                          <span style={{ color:C.white, fontWeight:600 }}>{fmtDate(form.eventDate)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={prev} style={{ flex:1, padding:'13px', background:'rgba(255,255,255,0.07)', border:`1px solid ${C.rim}`, borderRadius:13, color:C.mist, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>Atrás</button>
                  <button onClick={submit} disabled={saving}
                    style={{ flex:2, padding:'13px', background: promoType==='discount_next' ? GV : 'linear-gradient(135deg,#BE185D,#ec4899)', border:'none', borderRadius:13, color:'#fff', fontFamily:FN, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', opacity:saving?0.6:1, boxShadow: promoType==='discount_next' ? '0 4px 16px rgba(139,92,246,0.40)' : '0 4px 16px rgba(236,72,153,0.40)', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                    {saving ? 'Activando...' : 'Activar promoción'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

// ─── HORARIOS ESTRUCTURADOS ───────────────────────────────────────────────────
const HOURS_DEFAULT = {
  monday:    { open: false, shifts: [{ from: '09:00', to: '18:00' }] },
  tuesday:   { open: false, shifts: [{ from: '09:00', to: '18:00' }] },
  wednesday: { open: false, shifts: [{ from: '09:00', to: '18:00' }] },
  thursday:  { open: false, shifts: [{ from: '09:00', to: '18:00' }] },
  friday:    { open: false, shifts: [{ from: '09:00', to: '18:00' }] },
  saturday:  { open: false, shifts: [{ from: '09:00', to: '14:00' }] },
  sunday:    { open: false, shifts: [] },
}

function HoursEditor({ value, onChange }) {
  const DAYS = [
    ['monday','Lunes'], ['tuesday','Martes'], ['wednesday','Miércoles'],
    ['thursday','Jueves'], ['friday','Viernes'], ['saturday','Sábado'], ['sunday','Domingo'],
  ]
  function toggle(key) {
    const day = value[key] || { open: false, shifts: [] }
    const newShifts = day.shifts?.length ? day.shifts : [{ from: '09:00', to: '18:00' }]
    onChange({ ...value, [key]: { ...day, open: !day.open, shifts: newShifts } })
  }
  function setShift(key, i, field, v) {
    const shifts = (value[key].shifts || []).map((s, j) => j === i ? { ...s, [field]: v } : s)
    onChange({ ...value, [key]: { ...value[key], shifts } })
  }
  function addShift(key) {
    const shifts = [...(value[key].shifts || []), { from: '09:00', to: '18:00' }]
    onChange({ ...value, [key]: { ...value[key], shifts } })
  }
  function removeShift(key, i) {
    const shifts = (value[key].shifts || []).filter((_, j) => j !== i)
    onChange({ ...value, [key]: { ...value[key], shifts } })
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {DAYS.map(([key, label]) => {
        const day = value[key] || { open: false, shifts: [] }
        return (
          <div key={key} style={{ borderRadius:10, border:`1px solid ${day.open ? C.rimH : C.rim}`, padding:'10px 12px', background: day.open ? 'rgba(255,255,255,0.04)' : 'transparent', transition:'background .15s, border-color .15s' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
              <div style={{ fontFamily:FN, fontSize:13, fontWeight:600, color: day.open ? C.white : C.mist, minWidth:90 }}>{label}</div>
              <button onClick={() => toggle(key)} style={{ background: day.open ? C.v : C.bg3, border:`1px solid ${day.open ? C.v : C.rim}`, borderRadius:99, padding:'4px 12px', fontSize:11, fontWeight:700, color: day.open ? C.white : C.mist, cursor:'pointer', flexShrink:0, transition:'background .15s, border-color .15s, color .15s' }}>
                {day.open ? 'Abierto' : 'Cerrado'}
              </button>
            </div>
            {day.open && (
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                {(day.shifts || []).map((s, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input type="time" value={s.from||''} onChange={e => setShift(key, i, 'from', e.target.value)}
                      style={{ background:'rgba(0,0,0,0.30)', border:`1px solid ${C.rim}`, borderRadius:8, padding:'5px 8px', fontSize:12, color:C.pearl, width:90 }} />
                    <span style={{ color:C.mist, fontSize:12 }}>–</span>
                    <input type="time" value={s.to||''} onChange={e => setShift(key, i, 'to', e.target.value)}
                      style={{ background:'rgba(0,0,0,0.30)', border:`1px solid ${C.rim}`, borderRadius:8, padding:'5px 8px', fontSize:12, color:C.pearl, width:90 }} />
                    {day.shifts.length > 1 && (
                      <button onClick={() => removeShift(key, i)} style={{ background:'transparent', border:'none', color:C.dust, cursor:'pointer', fontSize:18, padding:'0 4px', lineHeight:1 }}>×</button>
                    )}
                  </div>
                ))}
                {day.shifts.length < 2 && (
                  <button onClick={() => addShift(key)} style={{ background:'transparent', border:`1px dashed ${C.rim}`, borderRadius:6, padding:'4px 10px', fontSize:11, color:C.mist, cursor:'pointer', alignSelf:'flex-start' }}>
                    + Agregar turno
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL DEL COMERCIO ───────────────────────────────────────────────────────
function CommerceSettingsView({ user, profile, setView, onLogout, onOwnerProfile }) {
  const [commerce, setCommerce]           = useState(null)
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [savingSystem, setSavingSystem]   = useState(false)
  const [tab, _setTabRaw]                 = useState('dashboard')
  const tabPersistMounted                 = useRef(false)
  // cameFromTab: rastrea desde dónde vino el usuario para mostrar
  // botones "← Volver a X" en pantallas que reciben navegación desde otra
  // pestaña específica (ej: Recompensas → Premios → ← Volver a recompensas).
  const [cameFromTab, setCameFromTab]     = useState(null)
  // Wrapper de setTab — si hay cambios sin guardar, pide confirmación antes
  // de salir del tab. Acepta un segundo arg `source` opcional para registrar
  // de qué pestaña vino el usuario (habilita el botón "Volver a X").
  const setTab = useCallback(async (next, source = null) => {
    if (next === tab) return
    if (typeof window !== 'undefined' && window.__benefixDirty) {
      const ok = await showConfirm({
        title: 'Tenés cambios sin guardar',
        message: 'Si salís ahora vas a perder los cambios. ¿Querés salir igual?',
        confirmText: 'Salir sin guardar',
        cancelText: 'Volver',
        danger: true,
      })
      if (!ok) return
      window.__benefixDirty = false
    }
    // Toda llamada sin source explícito limpia el origen — así el botón
    // "Volver a X" no aparece de forma stale en pantallas siguientes.
    setCameFromTab(source)
    _setTabRaw(next)
  }, [tab])
  const [form, setForm]                   = useState(null)
  const [promoTeaser, setPromoTeaser]     = useState(null)  // 'discount' | 'double' | null — modal marketinero del tab Promociones bloqueado
  const [isEditingSystem, setIsEditingSystem] = useState(false)
  const [switchModal,    setSwitchModal]    = useState(null) // null | { to: 'stars'|'points' }
  // Sistema "pendiente": el usuario puede tocar las flechitas para previsualizar
  // qué campos habilita cada sistema antes de comprometerse. El cambio real
  // sólo se aplica cuando aprieta "Guardar cambios" → modal de confirmación.
  const [pendingSystemType, setPendingSystemType] = useState(null)
  // Premios
  const [prizes, setPrizes]               = useState([])
  // prizeCanjes: map { [prizeId]: count } — para mostrar "Canjeados: N" en el
  // zócalo de cada card de premio.
  const [prizeCanjes, setPrizeCanjes]     = useState({})
  const [newPrize, setNewPrize]           = useState({ name:'', description:'', cost:'', img_url:'', stock:'' })
  const [addingPrize, setAddingPrize]     = useState(false)
  const [editingPrizeId, setEditingPrizeId] = useState(null)  // null = creando, id = editando existente
  const [originalPrize, setOriginalPrize] = useState(null)  // snapshot del premio al iniciar edición
  const [createPrizeOpen, setCreatePrizeOpen] = useState(false)  // accordion del form
  const [uploadingImg, setUploadingImg]   = useState(false)
  const [uploadingLogo, setUploadingLogo]   = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [prizeError, setPrizeError]       = useState('')
  // Promos
  const [promos, setPromos]               = useState([])
  const [newPromo, setNewPromo]           = useState({ type:'discount_next', value:10, duration:'today', custom_date:'', days:[], expiration_type:'fixed', expiration_date:'', expiration_days:7 })
  const [addingPromo, setAddingPromo]     = useState(false)
  const [promoError, setPromoError]       = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  // editingPromo: promo activa que el usuario está editando con el lápiz.
  // Modal sencillo para tocar la descripción y/o el vencimiento.
  const [editingPromo, setEditingPromo]   = useState(null)
  const [showPromoWizard, setShowPromoWizard] = useState(false)
  // Clientes y stats
  const [members, setMembers]             = useState([])
  const [newMember, setNewMember]         = useState({ email:'', full_name:'', phone:'', province:'', locality:'' })
  const [addingMember, setAddingMember]   = useState(false)
  const [memberError, setMemberError]     = useState('')
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showQrModal,        setShowQrModal]        = useState(false)
  const [memberSort,         setMemberSort]         = useState('last_visit')
  const [openMenuId,         setOpenMenuId]         = useState(null)
  const [dashStats, setDashStats]         = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberSearch, setMemberSearch]   = useState('')
  const [memberVisits, setMemberVisits]   = useState([])
  const [memberRedemptions, setMemberRedemptions] = useState([])
  const [redeemingPrize, setRedeemingPrize] = useState(null)  // prize id being redeemed
  const [redeemError, setRedeemError]     = useState('')
  // Otorgar beneficio: panel desplegable en la ficha de cliente que lista las
  // promos discount_next activas y permite regalárselas con un click.
  const [grantPanelOpen, setGrantPanelOpen] = useState(false)
  const [grantingPromoId, setGrantingPromoId] = useState(null)
  const [grantError, setGrantError]         = useState('')
  // Resetear el panel cuando cambia el cliente seleccionado
  useEffect(() => {
    setGrantPanelOpen(false)
    setGrantingPromoId(null)
    setGrantError('')
  }, [selectedMember?.id])
  // Historial
  const [activity, setActivity]           = useState([])
  // Canjes recientes (dashboard)
  const [recentCanjes, setRecentCanjes]   = useState([])
  // Upgrade modal
  const [upgradeModal, setUpgradeModal]   = useState(null)  // feature key | null
  // Auto-popup
  const [showAutoPopup, setShowAutoPopup] = useState(false)
  const autoPopupShown = useRef(false)
  // Automatizaciones
  const [autoDetail, setAutoDetail]       = useState(null)  // null | 'reactivacion' | 'cercaPremio' | 'primeraVisita'
  const [expandedAuto, setExpandedAuto]   = useState(null)  // card abierta en la lista
  // Acordeón de la pestaña Configuración: solo una sección abierta a la vez,
  // todas colapsadas por default para no saturar la pantalla.
  const [expandedConfigSection, setExpandedConfigSection] = useState(null)
  const [autoTeaser, setAutoTeaser]       = useState(null)  // 'reactivacion'|'cercaPremio'|'primeraVisita' — modal marketinero
  const [autoConfigs, setAutoConfigs]     = useState({
    reactivacion:  { active: true, days: 7  },
    cercaPremio:   { active: true           },
    primeraVisita: { active: true, days: 7  },
  })
  const [sentLog, setSentLog]             = useState({})
  const [copiedMsg, setCopiedMsg]         = useState(null)  // userId | null
  // Responsive
  const [isMobile, setIsMobile]           = useState(false)
  const [drawerOpen, setDrawerOpen]       = useState(false)
  // Mini-rail mobile — arranca EXPANDIDO cada vez que el usuario entra al panel.
  // El contenido detrás se desenfoca para que el menú destaque. El usuario lo
  // descarta tocando el contenido (sin navegar) o tocando un ícono (que navega).
  // Una vez colapsado se queda como "pestaña" delgada al borde hasta la próxima
  // entrada al panel.
  const [railExpanded, setRailExpanded]   = useState(true)
  // showRailHint: tooltip "Recordá que tocando esta solapa..." que aparece 5
  // segundos después de la primera vez que el user cierra el rail expandido.
  // Solo se muestra UNA VEZ por user (persistido en localStorage). El user lo
  // descarta tocando la X. Sirve como onboarding para que descubra la solapa
  // delgada como punto de re-entrada al menú.
  const [showRailHint, setShowRailHint] = useState(false)
  // railTabHandSeen: cuando el user toca la solapa fucsia, la manito que la
  // señala desaparece. NO persiste — cada vez que el user vuelve a entrar al
  // intent picker (vía el ícono "Mi Negocio"), la manito reaparece para
  // recordarle que la solapa abre el menú.
  const [railTabHandSeen, setRailTabHandSeen] = useState(false)
  const railHintFired = useRef(false)
  useEffect(() => {
    if (railExpanded || railHintFired.current) return
    if (typeof window === 'undefined') return
    try {
      if (localStorage.getItem('benefix:rail-hint-seen')) return
    } catch {}
    railHintFired.current = true
    const t = setTimeout(() => setShowRailHint(true), 5000)
    return () => clearTimeout(t)
  }, [railExpanded])
  function dismissRailHint() {
    setShowRailHint(false)
    try { localStorage.setItem('benefix:rail-hint-seen', '1') } catch {}
  }
  const [hoursForm, setHoursForm]         = useState(null)
  const [isDirty, setIsDirty]             = useState(false)
  // Sincroniza con flag global usada por setTab (wrapper) y beforeunload.
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.__benefixDirty = isDirty
    const onBeforeUnload = (e) => {
      if (window.__benefixDirty) {
        e.preventDefault()
        e.returnValue = ''  // Chrome required
        return ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false)
  // Logo crop
  const [cropSrc, setCropSrc]             = useState(null)
  // Color picker modal
  const [showColorModal, setShowColorModal] = useState(false)
  // Reportes
  const [reportsTab, setReportsTab]       = useState('visitas')
  const [reportsData, setReportsData]     = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsSearch, setReportsSearch] = useState('')
  const [reportsDateFrom, setReportsDateFrom] = useState('')
  const [reportsDateTo, setReportsDateTo]   = useState('')
  // Accordion: panel "Búsqueda" colapsable de la pestaña Análisis. Empieza
  // cerrado para no ocupar espacio. Si hay filtros aplicados se nota un
  // chip "FILTRADO" en el header así no se "olvida" oculto.
  const [analysisFiltersOpen, setAnalysisFiltersOpen] = useState(false)
  const [dateStart, setDateStart]         = useState('')
  const [dateEnd, setDateEnd]             = useState('')
  // Segmentación
  const [segments, setSegments]           = useState(null)
  const [selectedSegment, setSelectedSegment] = useState(null)
  const [segmentClients, setSegmentClients] = useState([])
  const [loadingSegments, setLoadingSegments] = useState(true)
  const [configErrors, setConfigErrors]       = useState({})

  // intentPickerActive: pantalla inicial del panel comerciante. Cada vez que
  // el dueño entra a "Mi Negocio" (sea por primera vez o re-clickeando el
  // icono del navbar), arranca en true y muestra dos botones grandes:
  // "Sumar nuevo cliente" (mostrar QR del local) o "Registrar compra"
  // (escanear QR del cliente). Una vez que elige una opción, queda en false
  // hasta el próximo click en el icono "Mi Negocio" del navbar.
  const [intentPickerActive, setIntentPickerActive] = useState(true)
  // showPanelHint: tooltip que aparece a los 5 segundos de inactividad sobre
  // el intent picker, sugiriendo ir al panel completo. Solo aparece la primera
  // vez (persistido en localStorage).
  const [showPanelHint, setShowPanelHint] = useState(false)
  // expandedIntentAction: id de la card del intent picker que está abierta.
  // Solo una abierta a la vez. null = todas colapsadas.
  const [expandedIntentAction, setExpandedIntentAction] = useState(null)
  useEffect(() => {
    if (!intentPickerActive) { setShowPanelHint(false); return }
    if (typeof window === 'undefined') return
    try {
      if (localStorage.getItem('benefix:panel-hint-seen')) return
    } catch {}
    const t = setTimeout(() => setShowPanelHint(true), 5000)
    return () => clearTimeout(t)
  }, [intentPickerActive])
  function dismissPanelHint() {
    setShowPanelHint(false)
    try { localStorage.setItem('benefix:panel-hint-seen', '1') } catch {}
  }
  // showBusinessQrModal: modal fullscreen con el QR del local. Se abre desde
  // el intent picker ("Sumar un nuevo cliente al club") y desde otros lugares
  // del panel. Vive global (fuera de cualquier tab) para que no dependa de
  // qué pestaña está activa.
  const [showBusinessQrModal, setShowBusinessQrModal] = useState(false)

  const supabase = getSupabase()

  // Listener para el evento "benefix:merchant-intent" — disparado por el
  // botón "Mi Negocio" del navbar (incluso si ya estás en commerce-settings)
  // para reabrir el intent picker. Cada re-entrada también resetea la manito
  // de la solapa fucsia para que vuelva a aparecer guiando al user.
  useEffect(() => {
    const onIntent = () => {
      setIntentPickerActive(true)
      setRailTabHandSeen(false)
    }
    window.addEventListener('benefix:merchant-intent', onIntent)
    return () => window.removeEventListener('benefix:merchant-intent', onIntent)
  }, [])

  // Restore last tab on mount
  useEffect(() => {
    // VALID_TABS — incluye los IDs nuevos (recompensas, analisis) y los viejos
    // (fidelizacion, etc.) por si quedó un valor en localStorage. Los viejos
    // se redirigen al nuevo via fallback al cargar.
    const VALID_TABS = ['dashboard','clientes','recompensas','premios','mensajes','analisis','historial','configuracion','planes','fidelizacion','promociones','reportes','segmentacion','automatizaciones']
    const saved = localStorage.getItem('benefix:commerceTab')
    if (saved && VALID_TABS.includes(saved)) setTab(saved)
  }, [])

  // Persist tab on change (skip the initial mount render)
  useEffect(() => {
    if (!tabPersistMounted.current) { tabPersistMounted.current = true; return }
    localStorage.setItem('benefix:commerceTab', tab)
  }, [tab])

  // Escucha 'benefix:set-tab' — lo dispara el buzón de sugerencias o cualquier otro
  // componente que necesite navegar a una pestaña específica del panel comerciante.
  // Algunos tabs "virtuales" (promociones) no tienen render propio, viven adentro
  // de otros (recompensas). Mapeamos para que el navigate caiga en el lugar correcto.
  useEffect(() => {
    const TAB_ALIASES = {
      promociones:   'recompensas',  // las promos viven dentro de recompensas
      promotions:    'recompensas',
      promo:         'recompensas',
      sistema:       'recompensas',
      plan:          'configuracion',
      planes:        'configuracion',
    }
    function onSetTab(e) {
      let next = e.detail?.tab
      if (!next) return
      if (TAB_ALIASES[next]) next = TAB_ALIASES[next]
      setTab(next)
    }
    window.addEventListener('benefix:set-tab', onSetTab)
    return () => window.removeEventListener('benefix:set-tab', onSetTab)
  }, [setTab])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  useEffect(() => {
    if (!user) return
    supabase.from('commerces').select('*').eq('owner_id', user.id).single()
      .then(({ data }) => {
        setCommerce(data)
        setForm({ ...data, province: data?.province || 'La Pampa', prog_pts: data?.prog_pts || 100 })
        setHoursForm(data?.hours_structured || HOURS_DEFAULT)
        if (data && !data.onboarding_done) setShowOnboardingBanner(true)
        setLoading(false)
        if (data) {
          supabase.from('prizes').select('*').eq('commerce_id', data.id).order('created_at').then(r => setPrizes(r.data||[]))
          supabase.from('promotions').select('*').eq('commerce_id', data.id).order('created_at', {ascending:false}).then(r => setPromos(r.data||[]))
          supabase.from('commerce_activity').select('*').eq('commerce_id', data.id).order('created_at', {ascending:false}).limit(60).then(r => setActivity(r.data||[]))
          // Canjes por premio (para mostrar contador en cada card)
          supabase.from('redemptions').select('prize_id').eq('commerce_id', data.id).then(r => {
            const map = {}
            ;(r.data || []).forEach(row => { if (row.prize_id) map[row.prize_id] = (map[row.prize_id] || 0) + 1 })
            setPrizeCanjes(map)
          })
        }
      })
  }, [user])

  useEffect(() => {
    if (!commerce) return
    // Pre-cargar localidad del comercio como default del formulario manual
    if (commerce.province || commerce.city_name) {
      setNewMember(m => ({
        ...m,
        province: commerce.province || 'Buenos Aires',
        locality: commerce.city_name || '',
      }))
    }
    // /api/commerce-clients usa service role para traer el join con profiles
    // bypaseando la RLS (que solo deja a cada user ver su propio profile).
    // Sin esto, los nombres de los clientes vienen como null en el panel.
    fetch(`/api/commerce-clients?commerce_id=${commerce.id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setMembers(d.items || []))
      .catch(() => setMembers([]))
    // Cargar configs de automatizaciones desde localStorage
    try {
      const saved = localStorage.getItem(`cb_auto_${commerce.id}`)
      if (saved) setAutoConfigs(JSON.parse(saved))
      const savedLog = localStorage.getItem(`cb_sent_${commerce.id}`)
      if (savedLog) setSentLog(JSON.parse(savedLog))
    } catch {}
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
    const weekAgo    = new Date(Date.now() - 7*24*60*60*1000)
    Promise.all([
      supabase.from('visits').select('id').eq('commerce_id', commerce.id).gte('scanned_at', monthStart.toISOString()),
      supabase.from('visits').select('user_id').eq('commerce_id', commerce.id).gte('scanned_at', weekAgo.toISOString()),
    ]).then(([{ data:mv }, { data:wv }]) => {
      setDashStats({ monthVisits:(mv||[]).length, activeThisWeek: new Set((wv||[]).map(v=>v.user_id)).size })
    })
    supabase.from('redemptions')
      .select('id, created_at, points_spent, kind, discount_value, prize:prizes(name), promotion:promotions(value, description), user:profiles(name, full_name)')
      .eq('commerce_id', commerce.id)
      .order('created_at', { ascending:false })
      .limit(5)
      .then(({ data }) => setRecentCanjes(data || []))
  }, [commerce])

  // Load reports data when tab changes to reportes
  useEffect(() => {
    if (tab !== 'analisis' || !commerce?.id || reportsTab === 'clientes') return
    setReportsLoading(true)
    const endpoint = reportsTab === 'visitas' ? 'visits' : reportsTab
    const url = `/api/reports/${endpoint}?commerce_id=${commerce.id}&limit=500`
    fetch(url).then(r => r.json()).then(d => {
      // Si no hay datos, mostrar mock data
      if (!d.data || d.data.length === 0) {
        const mockData = reportsTab === 'visitas' ? [
          { fecha: '20/04/2026', hora: '14:30:00', cliente: 'Juan Pérez', email: 'juan@example.com', puntos: 100, unidad: '💎', descuento: '10%' },
          { fecha: '20/04/2026', hora: '12:15:00', cliente: 'María García', email: 'maria@example.com', puntos: 100, unidad: '💎', descuento: '-' },
          { fecha: '19/04/2026', hora: '18:45:00', cliente: 'Carlos López', email: 'carlos@example.com', puntos: 100, unidad: '💎', descuento: '15%' },
          { fecha: '19/04/2026', hora: '09:20:00', cliente: 'Ana Rodríguez', email: 'ana@example.com', puntos: 300, unidad: '💎', descuento: '-' },
          { fecha: '18/04/2026', hora: '16:00:00', cliente: 'Pedro Martínez', email: 'pedro@example.com', puntos: 100, unidad: '💎', descuento: '-' },
        ] : [
          { fecha: '20/04/2026', hora: '14:30:00', cliente: 'Juan Pérez', email: 'juan@example.com', premio: 'Café Gratis', puntos_gastados: 500, unidad: '💎' },
          { fecha: '19/04/2026', hora: '11:00:00', cliente: 'María García', email: 'maria@example.com', premio: 'Descuento 20%', puntos_gastados: 750, unidad: '💎' },
          { fecha: '18/04/2026', hora: '15:30:00', cliente: 'Carlos López', email: 'carlos@example.com', premio: 'Café Gratis', puntos_gastados: 500, unidad: '💎' },
        ]
        setReportsData(mockData)
      } else {
        setReportsData(d.data)
      }
      setReportsLoading(false)
    }).catch(() => {
      // Si hay error, mostrar mock data también
      const mockData = reportsTab === 'visitas' ? [
        { fecha: '20/04/2026', hora: '14:30:00', cliente: 'Juan Pérez', email: 'juan@example.com', puntos: 100, unidad: '💎', descuento: '10%' },
        { fecha: '20/04/2026', hora: '12:15:00', cliente: 'María García', email: 'maria@example.com', puntos: 100, unidad: '💎', descuento: '-' },
      ] : []
      setReportsData(mockData)
      setReportsLoading(false)
    })
  }, [tab, reportsTab, commerce])

  // Load segments data when tab changes to segmentacion
  useEffect(() => {
    if (tab !== 'analisis' || !commerce?.id) return
    setLoadingSegments(true)
    fetch(`/api/segments?commerce_id=${commerce.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.segments && Object.values(d.segments).some(s => (s.count || 0) > 0)) {
          setSegments(d.segments)
        } else {
          // Mock data de segmentos
          setSegments({
            nuevos: { label: 'Nuevos', icon: '🌟', color: '#40C8FF', count: 5, percent: 25, description: 'Clientes que acaban de unirse' },
            frecuentes: { label: 'Frecuentes', icon: '🔥', color: '#FE5000', count: 8, percent: 40, description: 'Clientes que visitan regularmente' },
            vip: { label: 'VIP', icon: '👑', color: '#BD4BF8', count: 4, percent: 20, description: 'Clientes más leales y comprometidos' },
            inactivos: { label: 'Inactivos', icon: '😴', color: '#9B85CC', count: 3, percent: 15, description: 'Clientes sin visitas recientes' },
          })
        }
        setLoadingSegments(false)
      }).catch(() => {
        // Mock data si hay error
        setSegments({
          nuevos: { label: 'Nuevos', icon: '🌟', color: '#40C8FF', count: 5, percent: 25, description: 'Clientes que acaban de unirse' },
          frecuentes: { label: 'Frecuentes', icon: '🔥', color: '#FE5000', count: 8, percent: 40, description: 'Clientes que visitan regularmente' },
          vip: { label: 'VIP', icon: '👑', color: '#BD4BF8', count: 4, percent: 20, description: 'Clientes más leales y comprometidos' },
          inactivos: { label: 'Inactivos', icon: '😴', color: '#9B85CC', count: 3, percent: 15, description: 'Clientes sin visitas recientes' },
        })
        setLoadingSegments(false)
      })
  }, [tab, commerce])

  // Popup de automatizaciones — computa el total inline para no depender de vars declaradas después
  useEffect(() => {
    if (tab !== 'dashboard' || autoPopupShown.current) return
    // Si no hay clientes reales todavía, no disparar el popup. Los datos mock
    // del demo siguen apareciendo dentro de la pestaña "Automatizaciones",
    // pero sería engañoso anunciar "X clientes para contactar" cuando no hay ninguno real.
    if (members.length === 0) return
    const cheapest    = prizes.filter(p => p.active).sort((a,b) => a.cost - b.cost)[0]
    const nowTs       = Date.now()
    const inactiveCut = new Date(nowTs - (autoConfigs.reactivacion.days||7) * 86400000).toISOString()
    const firstCut    = new Date(nowTs - (autoConfigs.primeraVisita.days||7) * 86400000).toISOString()
    const isStars     = form?.prog_type === 'stars'
    const reactiv     = members.filter(m => m.last_visit && m.last_visit < inactiveCut).length
    const cercaPremio = cheapest
      ? members.filter(m => { const b = isStars ? (m.stars||0) : (m.points||0); return b > 0 && b >= cheapest.cost * 0.8 && b < cheapest.cost }).length
      : 0
    const primera     = members.filter(m => m.visits_count === 1 && m.last_visit && m.last_visit >= firstCut).length
    const count       = reactiv + cercaPremio + primera
    if (count > 0) {
      autoPopupShown.current = true
      setShowAutoPopup(true)
    }
  }, [tab, members, prizes, autoConfigs, form])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setIsDirty(true) }

  async function logActivity(type, description) {
    if (!commerce) return
    const { data } = await supabase.from('commerce_activity')
      .insert({ commerce_id: commerce.id, type, description })
      .select().single()
    if (data) setActivity(prev => [data, ...prev])
  }

  async function saveFidelizacion() {
    setSaving(true); setSaved(false); setSavingSystem(true)
    const update = {
      prog_type: form.prog_type,
      prog_pts:  1,
      // Solo persiste compra mínima cuando stars está activo. Si está vacío o
      // no es número válido, se guarda NULL = sin mínimo.
      prog_min_purchase: form.prog_type === 'stars' && parseInt(form.prog_min_purchase) > 0
        ? parseInt(form.prog_min_purchase)
        : null,
    }
    await supabase.from('commerces').update(update).eq('id', commerce.id)
    setCommerce(c => ({ ...c, ...update }))
    logActivity('settings', `Sistema de fidelización actualizado`)
    setSaving(false); setSaved(true); setSavingSystem(false)
    showToast('success', 'Configuración guardada.')
    setTimeout(() => setSaved(false), 3000)
  }

  async function switchSystem(newType) {
    if (!commerce || newType === commerce.prog_type) return
    setSaving(true)
    const activePrizes = prizes.filter(p => p.active)
    if (activePrizes.length > 0) {
      await supabase.from('prizes').update({ active: false }).eq('commerce_id', commerce.id)
      setPrizes(ps => ps.map(p => ({ ...p, active: false })))
    }
    const update = { prog_type: newType, prog_pts: 1 }
    await supabase.from('commerces').update(update).eq('id', commerce.id)
    setCommerce(c => ({ ...c, ...update }))
    setForm(f => ({ ...f, prog_type: newType }))
    logActivity('settings', `Sistema cambiado a ${newType === 'stars' ? 'Estrellas' : 'Puntos (1 pto = 1 peso)'}`)
    setSaving(false)
    setSwitchModal(null)
    setPendingSystemType(null)  // limpiamos el preview tras commit exitoso
    const systemName = newType === 'stars' ? 'estrellas' : 'puntos'
    showToast('success', activePrizes.length > 0
      ? `Sistema cambiado a ${systemName}. Creá nuevos premios.`
      : `Sistema de ${systemName} activado.`)
  }

  const ARGENTINA_PROVINCES = {
    'Buenos Aires': ['Adrogué', 'Avellaneda', 'Bahía Blanca', 'Bernal', 'Berazategui', 'Bragado', 'Campana', 'Cañuelas', 'Carlos Casares', 'Chacabuco', 'Chascomús', 'Chivilcoy', 'Coronel Suárez', 'Daireaux', 'Dolores', 'Don Torcuato', 'Escobar', 'Exaltación de la Cruz', 'Florentino Ameghino', 'General Belgrano', 'General Las Heras', 'General Lavalle', 'General Madariaga', 'General Pinto', 'General Villegas', 'Hipólito Yrigoyen', 'Hurlingham', 'Ituzaingó', 'Junín', 'La Matanza', 'Lanús', 'La Plata', 'Laprida', 'Las Flores', 'Las Toninas', 'Lobería', 'Lomas de Zamora', 'Luján', 'Magdalena', 'Maipú', 'Malvinas Argentinas', 'Mar del Plata', 'Marcos Paz', 'Merlo', 'Moreno', 'Morón', 'Necochea', 'Olavarría', 'Pehuajó', 'Pergamino', 'Pilar', 'Quilmes', 'Ramallo', 'Ramos Mejía', 'Rojas', 'Salto', 'San Isidro', 'San Martín', 'San Miguel', 'San Nicolás', 'San Pedro', 'Tandil', 'Tigre', 'Tres Arroyos', 'Vicente López', 'Zárate'],
    'CABA': ['Agronomía', 'Almagro', 'Balvanera', 'Barracas', 'Belgrano', 'Boedo', 'Caballito', 'Chacarita', 'Coghlan', 'Colegiales', 'Constitución', 'Flores', 'Floresta', 'La Boca', 'La Paternal', 'Liniers', 'Mataderos', 'Monserrat', 'Monte Castro', 'Nueva Pompeya', 'Núñez', 'Palermo', 'Parque Avellaneda', 'Parque Centenario', 'Parque Chacabuco', 'Parque Chas', 'Parque Patricios', 'Recoleta', 'Retiro', 'Saavedra', 'San Cristóbal', 'San Nicolás', 'San Telmo', 'Vélez Sársfield', 'Villa Crespo', 'Villa del Parque', 'Villa Devoto', 'Villa General Mitre', 'Villa Lugano', 'Villa Luro', 'Villa Ortúzar', 'Villa Pueyrredón', 'Villa Real', 'Villa Riachuelo', 'Villa Santa Rita', 'Villa Soldati', 'Villa Urquiza'],
    'Córdoba': ['Alta Gracia', 'Bell Ville', 'Canals', 'Córdoba', 'Cosquín', 'Cruz del Eje', 'Deán Funes', 'Embalse', 'Jesús María', 'La Falda', 'Laboulaye', 'Marcos Juárez', 'Mina Clavero', 'Río Cuarto', 'Río Tercero', 'San Francisco', 'Unquillo', 'Villa Allende', 'Villa Carlos Paz', 'Villa del Rosario', 'Villa Dolores', 'Villa María'],
    'Santa Fe': ['Casilda', 'Ceres', 'Coronda', 'Esperanza', 'Gálvez', 'Granadero Baigorria', 'Pérez', 'Rafaela', 'Reconquista', 'Rosario', 'San Cristóbal', 'San Jorge', 'San Lorenzo', 'Santa Fe', 'Santo Tomé', 'Sunchales', 'Totoras', 'Venado Tuerto', 'Villa Constitución'],
    'Mendoza': ['Chacras de Coria', 'Dorrego', 'General Alvear', 'Godoy Cruz', 'Guaymallén', 'Junín', 'La Paz', 'Las Heras', 'Lavalle', 'Luján de Cuyo', 'Maipú', 'Mendoza', 'Rivadavia', 'San Martín', 'San Rafael', 'Santa Rosa', 'Tunuyán', 'Uspallata'],
    'La Pampa': ['Anguil', 'Caleufú', 'Catriló', 'Doblas', 'Eduardo Castex', 'Embajador Martini', 'General Pico', 'Ingeniero Luiggi', 'Intendente Alvear', 'Macachín', 'Quemú Quemú', 'Rancul', 'Realicó', 'Santa Rosa', 'Speluzzi', 'Telén', 'Trenel', 'Victorica', 'Winifreda'],
    'Tucumán': ['Aguilares', 'Amaicha del Valle', 'Banda del Río Salí', 'Bella Vista', 'Burruyacú', 'Concepción', 'Famaillá', 'La Cocha', 'Lules', 'Monteros', 'San Miguel de Tucumán', 'Simoca', 'Tafí Viejo', 'Trancas', 'Yerba Buena'],
    'Chaco': ['Barranqueras', 'Fontana', 'General San Martín', 'Juan José Castelli', 'Las Breñas', 'Machagai', 'Napenay', 'Presidencia Roque Sáenz Peña', 'Quitilipi', 'Resistencia', 'Tres Isletas', 'Villa Ángela'],
    'Corrientes': ['Bella Vista', 'Caá Catí', 'Corrientes', 'Curuzú Cuatiá', 'Esquina', 'Goya', 'Itatí', 'Ituzaingó', 'La Cruz', 'Mburucuyá', 'Mercedes', 'Saladas', 'Santo Tomé', 'Yapeyú'],
    'Entre Ríos': ['Basavilbaso', 'Colón', 'Concordia', 'Concepción del Uruguay', 'Diamante', 'Federal', 'Gualeguaychú', 'La Paz', 'Paraná', 'San José de Feliciano', 'Seguí', 'Tala', 'Urdinarrain', 'Villaguay'],
    'Misiones': ['Apóstoles', 'Aristóbulo del Valle', 'Dos de Mayo', 'El Soberbio', 'Eldorado', 'Garupá', 'Leandro N. Alem', 'Montecarlo', 'Oberá', 'Posadas', 'Puerto Iguazú', 'San Ignacio', 'San Javier', 'San Pedro'],
    'Jujuy': ['Humahuaca', 'Iruya', 'Ledesma', 'Maimará', 'Palpalá', 'Perico', 'Pichanal', 'Purmamarca', 'San Pedro de Jujuy', 'San Salvador de Jujuy', 'Tilcara'],
    'Salta': ['Campo Quijano', 'El Carril', 'General Enrique Mosconi', 'General Güemes', 'Guachipas', 'Metán', 'Rivadavia', 'Rosario de Lerma', 'Salta', 'San Ramón de la Nueva Orán', 'Tartagal'],
    'Santiago del Estero': ['Añatuya', 'Clodomira', 'Colonia Dora', 'Felipe Ibarra', 'Frías', 'General Taboada', 'La Banda', 'Loreto', 'Monte Quemado', 'Quimilí', 'Santiago del Estero', 'Suncho Corral', 'Termas de Río Hondo'],
    'Catamarca': ['Andalgalá', 'Belén', 'El Alto', 'El Rodeo', 'Fiambalá', 'Hualfín', 'Londres', 'San Fernando del Valle de Catamarca', 'Santa María', 'Tinogasta'],
    'La Rioja': ['Aimogasta', 'Chamical', 'Chepes', 'Chilecito', 'La Rioja', 'Nonogasta', 'Patquía', 'Villa Unión', 'Vinchina'],
    'San Juan': ['Albardón', 'Angaco', 'Calingasta', 'Chimbas', 'Jáchal', 'Pocito', 'Rawson', 'Rivadavia', 'San Juan', 'Santa Lucía', 'Sarmiento', 'Ullúm', 'Valle Fértil', 'Zonda'],
    'San Luis': ['Carpintería', 'El Trapiche', 'La Punta', 'Luján', 'Merlo', 'Nogolí', 'Quines', 'San Luis', 'Tilisarao', 'Villa Mercedes'],
    'Formosa': ['Clorinda', 'El Colorado', 'Formosa', 'General Belgrano', 'Ing. Juárez', 'Las Lomitas', 'Pirané', 'Riacho He-He'],
    'Neuquén': ['Añelo', 'Caviahue', 'Centenario', 'Chos Malal', 'Cutral Có', 'Junín de los Andes', 'Loncopué', 'Neuquén', 'Picún Leufú', 'Rincón de los Sauces', 'San Martín de los Andes', 'Senillosa', 'Villa la Angostura', 'Zapala'],
    'Río Negro': ['Allen', 'Bariloche', 'Choele Choel', 'Cinco Saltos', 'Cipolletti', 'El Bolsón', 'General Roca', 'Jacobacci', 'Las Grutas', 'Los Menucos', 'Maquinchao', 'San Antonio Oeste', 'Sierra Colorada', 'Valcheta', 'Viedma'],
    'Chubut': ['Comodoro Rivadavia', 'Dolavon', 'El Bolsón', 'Epuyén', 'Esquel', 'Gaiman', 'Las Plumas', 'Paso de Indios', 'Perito Moreno', 'Puerto Madryn', 'Rawson', 'Río Mayo', 'Sarmiento', 'Tecka', 'Trelew', 'Trevelin'],
    'Santa Cruz': ['Caleta Olivia', 'Comandante Luis Piedrabuena', 'El Calafate', 'El Chaltén', 'Gobernador Gregores', 'Las Heras', 'Perito Moreno', 'Puerto Deseado', 'Puerto Santa Cruz', 'Río Gallegos'],
    'Tierra del Fuego': ['Río Grande', 'Tolhuin', 'Ushuaia'],
  }

  // CATEGORIES derived from COMMERCE_FAMILIES for the settings select
  const CATEGORIES = COMMERCE_FAMILIES.flatMap(f => f.subs.map(s => s.name))
  function validateConfiguracion() {
    const errs = {}
    if (!form.name || form.name.trim().length < 3) errs.name = 'El nombre es obligatorio (mínimo 3 caracteres)'
    if (!form.category) errs.category = 'Seleccioná una categoría'
    if (form.category === 'Otro' && !form.customCategory?.trim()) errs.customCategory = 'Ingresá tu rubro personalizado'
    if (form.phone && form.phone.replace(/\D/g,'').length < 10) errs.phone = 'Ingresá al menos 10 dígitos'
    return errs
  }

  async function saveConfiguracion() {
    const errs = validateConfiguracion()
    if (Object.keys(errs).length) { setConfigErrors(errs); return }
    setConfigErrors({})
    setSaving(true); setSaved(false)
    const instagram = form.instagram
      ? (form.instagram.startsWith('@') ? form.instagram : '@' + form.instagram.replace(/^@*/,''))
      : ''
    try {
      const res = await fetch('/api/save-commerce-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commerce_id:      commerce.id,
          name:             form.name?.trim(),
          category:         form.category,
          customCategory:   form.customCategory || undefined,
          description:      form.description || null,
          img_url:          form.img_url || null,
          cover_image:      form.cover_image || null,
          phone:            form.phone || null,
          instagram:        instagram || null,
          facebook:         form.facebook || null,
          province:         form.province || null,
          city_name:        form.city_name || null,
          address:          form.address || null,
          hours_structured: hoursForm || null,
          brand_color:      form.brand_color || null,
        }),
      })
      const data = await res.json()
      const resolvedCategory = form.category === 'Otro' ? (form.customCategory || form.category) : form.category
      if (data.ok) {
        setCommerce(c => ({
          ...c,
          name:             form.name?.trim(),
          category:         resolvedCategory,
          onboarding_done:  true,
          hours_structured: hoursForm,
          brand_color:      form.brand_color || null,
          ...(data.lat !== null ? { lat: data.lat, lng: data.lng } : {}),
        }))
        setIsDirty(false)
        setSaved(true)
        if (form.name?.trim() && resolvedCategory) setShowOnboardingBanner(false)
        logActivity('settings', 'Perfil del negocio actualizado')
        showToast('success', 'Perfil guardado correctamente')
        setTimeout(() => setSaved(false), 3000)
      } else {
        showToast('error', data.error || 'Error al guardar')
      }
    } catch (_) {
      showToast('error', 'Error de conexión')
    }
    setSaving(false)
  }

  async function uploadPrizeImg(file) {
    if (!file || !commerce) return
    setUploadingImg(true)
    const ext = file.name.split('.').pop()
    const path = `${commerce.id}/prizes/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('commerce-images').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('commerce-images').getPublicUrl(path)
      setNewPrize(p => ({ ...p, img_url: data.publicUrl }))
    }
    setUploadingImg(false)
  }

  async function handleLogoFileSelect(file) {
    if (!file) return
    const err = validateImageFile(file)
    if (err) { showToast('error', err); return }
    const dimErr = await checkImageDimensions(file)
    if (dimErr) { showToast('error', dimErr); return }
    const reader = new FileReader()
    reader.onload = e => setCropSrc(e.target.result)
    reader.readAsDataURL(file)
  }

  async function handleLogoCropSave(blob) {
    setCropSrc(null)
    setUploadingLogo(true)
    const path = `${commerce.id}/logo.jpg`
    const { error } = await supabase.storage.from('commerce-images').upload(path, blob, { contentType:'image/jpeg', upsert:true })
    if (!error) {
      const { data } = supabase.storage.from('commerce-images').getPublicUrl(path)
      set('img_url', data.publicUrl)
      await supabase.from('commerces').update({ img_url: data.publicUrl }).eq('id', commerce.id)
      showToast('success', 'Logo guardado.')
    } else {
      showToast('error', 'Error al subir el logo.')
    }
    setUploadingLogo(false)
  }

  async function uploadCover(file) {
    if (!file || !commerce) return
    setUploadingCover(true)
    const ext = file.name.split('.').pop()
    const path = `${commerce.id}/cover.${ext}`
    const { error } = await supabase.storage.from('commerce-images').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('commerce-images').getPublicUrl(path)
      set('cover_image', data.publicUrl)
    }
    setUploadingCover(false)
  }

  // savePrize — crea o actualiza según editingPrizeId.
  async function addPrize() {
    if (!newPrize.name || !newPrize.cost) return
    const isEditing = !!editingPrizeId
    // Bloquear si crea nuevo y ya está en límite (no aplica al editar uno existente)
    if (!isEditing && perms.max_rewards !== null && activeRewardsCount >= perms.max_rewards) {
      setUpgradeModal('rewards')
      return
    }
    setPrizeError('')
    setAddingPrize(true)
    const payload = {
      name:        newPrize.name,
      description: newPrize.description?.trim() || null,
      cost:        parseInt(newPrize.cost),
      img_url:     newPrize.img_url || null,
      stock:       newPrize.stock !== '' ? parseInt(newPrize.stock) : null,
    }
    if (isEditing) {
      const { data, error } = await supabase.from('prizes').update(payload).eq('id', editingPrizeId).select().single()
      if (error) { setPrizeError(error.message); setAddingPrize(false); return }
      if (data) {
        setPrizes(p => p.map(x => x.id === editingPrizeId ? { ...x, ...data } : x))
        logActivity('prize_edited', `Premio editado: "${data.name}"`)
      }
    } else {
      // Al crear un premio nuevo le marcamos el sistema actual del comercio.
      // Esto nos permite filtrar después "premios cargados con esa modalidad"
      // independientemente de si están active=true o paused.
      const { data, error } = await supabase.from('prizes').insert({
        commerce_id: commerce.id,
        system_type: commerce?.prog_type || 'stars',
        ...payload,
      }).select().single()
      if (error) { setPrizeError(error.message); setAddingPrize(false); return }
      if (data) {
        setPrizes(p => [...p, data])
        logActivity('prize_added', `Premio agregado: "${data.name}" (${data.cost} ${unitLabel})`)
      }
    }
    // Reset form + cerrar accordion
    setNewPrize({ name:'', description:'', cost:'', img_url:'', stock:'' })
    setEditingPrizeId(null)
    setOriginalPrize(null)
    setCreatePrizeOpen(false)
    setAddingPrize(false)
  }

  // Carga un premio existente al form para editarlo + abre el accordion.
  function startEditPrize(p) {
    const formShape = {
      name:        p.name || '',
      description: p.description || '',
      cost:        String(p.cost || ''),
      img_url:     p.img_url || '',
      stock:       p.stock !== null && p.stock !== undefined ? String(p.stock) : '',
    }
    setEditingPrizeId(p.id)
    setOriginalPrize(formShape)
    setNewPrize(formShape)
    setPrizeError('')
    setCreatePrizeOpen(true)
    // Scroll al form
    setTimeout(() => {
      const el = document.getElementById('prize-form-card')
      if (el) el.scrollIntoView({ behavior:'smooth', block:'center' })
    }, 100)
  }
  function cancelEditPrize() {
    setEditingPrizeId(null)
    setOriginalPrize(null)
    setNewPrize({ name:'', description:'', cost:'', img_url:'', stock:'' })
    setPrizeError('')
    setCreatePrizeOpen(false)
  }

  async function togglePrize(prize) {
    // Bloquear si intentan activar y ya están en el límite de premios activos
    if (!prize.active && perms.max_rewards !== null && activeRewardsCount >= perms.max_rewards) {
      setUpgradeModal('rewards')
      return
    }
    await supabase.from('prizes').update({ active: !prize.active }).eq('id', prize.id)
    setPrizes(p => p.map(x => x.id === prize.id ? { ...x, active: !x.active } : x))
    logActivity('prize_toggled', `Premio "${prize.name}" ${prize.active ? 'desactivado' : 'activado'}`)
  }

  async function deletePrize(id) {
    const prize = prizes.find(p => p.id === id)
    await supabase.from('prizes').delete().eq('id', id)
    setPrizes(p => p.filter(x => x.id !== id))
    if (prize) logActivity('prize_deleted', `Premio eliminado: "${prize.name}"`)
  }

  function isExpired(p) {
    if (p.expiration_type === 'relative') return false
    return p.expires_at && new Date(p.expires_at) < new Date()
  }

  function promoLabel(type, value) {
    if (type === 'discount_next') return `${value}% OFF próxima visita`
    return 'Suma doble'
  }

  async function addPromo(overrideData = null) {
    const d = overrideData || newPromo
    // Block if same type already active
    const duplicate = promos.find(p => p.active && !isExpired(p) && p.type === d.type)
    if (duplicate) {
      showToast('error', `Ya tenés una promo de ${d.type === 'discount_next' ? 'descuento' : 'suma doble'} activa`)
      return
    }
    setAddingPromo(true)
    setPromoError('')

    let expires_at = null
    let expiration_type = null
    let expiration_days = null
    let expiration_date = null

    if (d.type === 'double_points') {
      expires_at = d.custom_date ? new Date(d.custom_date + 'T23:59:59').toISOString() : null
    } else {
      expiration_type = d.expiration_type
      if (d.expiration_type === 'fixed') {
        expires_at = d.expiration_date ? new Date(d.expiration_date + 'T23:59:59').toISOString() : null
        expiration_date = expires_at
      } else {
        expiration_days = parseInt(d.expiration_days) || 7
      }
    }

    const description = promoLabel(d.type, d.value)
    const { data, error } = await supabase.from('promotions').insert({
      commerce_id: commerce.id,
      type:        d.type,
      value:       parseInt(d.value) || 0,
      description,
      expires_at,
      expiration_type,
      expiration_date,
      expiration_days,
      active: true,
    }).select().single()
    if (error) {
      console.error('addPromo error:', error)
      setPromoError(error.message || 'Error al activar la promoción')
    } else if (data) {
      setPromos(p => [data, ...p])
      setNewPromo({ type:'discount_next', value:10, duration:'today', custom_date:'', days:[], expiration_type:'fixed', expiration_date:'', expiration_days:7 })
      logActivity('promo_added', `Promo activada: "${description}"`)
      showToast('success', '¡Promoción activada!')
    }
    setAddingPromo(false)
  }

  async function togglePromo(promo) {
    await supabase.from('promotions').update({ active: !promo.active }).eq('id', promo.id)
    setPromos(p => p.map(x => x.id === promo.id ? { ...x, active: !x.active } : x))
    logActivity('promo_toggled', `Promo "${promo.description}" ${promo.active ? 'desactivada' : 'activada'}`)
  }

  // Actualiza descripción y/o vencimiento de una promo activa.
  async function updatePromo(id, patch) {
    await supabase.from('promotions').update(patch).eq('id', id)
    setPromos(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
    setEditingPromo(null)
  }

  async function deletePromo(id) {
    const promo = promos.find(p => p.id === id)
    await supabase.from('promotions').delete().eq('id', id)
    setPromos(p => p.filter(x => x.id !== id))
    setConfirmDelete(null)
    if (promo) logActivity('promo_deleted', `Promo eliminada: "${promo.description}"`)
  }

  async function viewMember(m) {
    setSelectedMember(m)
    setMemberVisits([])
    setMemberRedemptions([])
    setRedeemError('')
    if (!commerce?.id || !m.user_id) return
    const [{ data: visits }, { data: redemptions }] = await Promise.all([
      supabase.from('visits').select('id, scanned_at, points_earned')
        .eq('commerce_id', commerce.id).eq('user_id', m.user_id)
        .order('scanned_at', { ascending:false }).limit(30),
      supabase.from('redemptions').select('id, created_at, points_spent, prize:prizes(name)')
        .eq('commerce_id', commerce.id).eq('user_id', m.user_id)
        .order('created_at', { ascending:false }).limit(20),
    ])
    setMemberVisits(visits || [])
    setMemberRedemptions(redemptions || [])
  }

  async function addMemberManually() {
    const phoneDigits = (newMember.phone || '').replace(/\D/g, '')
    if (!newMember.full_name?.trim()) {
      setMemberError('El nombre es obligatorio')
      return
    }
    if (phoneDigits.length < 8) {
      setMemberError('El teléfono es obligatorio (mínimo 8 dígitos)')
      return
    }
    if (newMember.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMember.email)) {
      setMemberError('Email inválido')
      return
    }
    setMemberError('')
    setAddingMember(true)

    try {
      // 1. Buscar perfil existente por email (si hay) o por teléfono
      let existingProfile = null
      if (newMember.email) {
        const { data } = await supabase.from('profiles').select('id').eq('email', newMember.email).single()
        existingProfile = data
      }
      if (!existingProfile) {
        const { data } = await supabase.from('profiles').select('id').eq('phone', phoneDigits).single()
        existingProfile = data
      }

      let userId
      if (existingProfile) {
        userId = existingProfile.id
      } else {
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            email:     newMember.email   || null,
            full_name: newMember.full_name.trim(),
            phone:     phoneDigits,
            province:  commerce?.province || null,
            locality:  newMember.locality || commerce?.city_name || null,
          })
          .select().single()
        if (profileError) throw profileError
        userId = newProfile.id
      }

      // 2. Crear membership
      const { data: membership, error: memError } = await supabase
        .from('memberships')
        .insert({ user_id: userId, commerce_id: commerce.id, points: 0, stars: 0, visits_count: 0 })
        .select().single()
      if (memError) throw memError

      // 3. Reflejar en estado local
      const memberWithProfile = {
        ...membership,
        profiles: {
          full_name: newMember.full_name.trim(),
          email:     newMember.email   || null,
          phone:     phoneDigits,
          locality:  newMember.locality || commerce?.city_name || null,
        },
        joined_at: membership.joined_at,
      }
      setMembers(m => [...m, memberWithProfile])
      setNewMember({ email:'', full_name:'', phone:'', province: commerce?.province || '', locality: commerce?.city_name || '' })
      setShowAddMemberModal(false)
      showToast('success', `${newMember.full_name.trim()} agregado exitosamente.`)
      logActivity('member_added_manual', `Cliente agregado: ${newMember.full_name.trim()}`)
    } catch (err) {
      setMemberError(err.message)
    }

    setAddingMember(false)
  }

  async function redeemFromPanel(member, prize) {
    setRedeemingPrize(prize.id)
    setRedeemError('')
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        membership_id: member.id,
        prize_id:      prize.id,
        commerce_id:   commerce.id,
        user_id:       member.user_id,
      }),
    })
    const data = await res.json()
    if (data.ok) {
      // Actualizar saldo local
      const field = form?.prog_type === 'stars' ? 'stars' : 'points'
      const newVal = data.new_balance
      setSelectedMember(m => ({ ...m, [field]: newVal }))
      setMembers(ms => ms.map(x => x.id === member.id ? { ...x, [field]: newVal } : x))
      // Agregar al historial de canjes
      setMemberRedemptions(r => [{ id: Date.now(), created_at: new Date().toISOString(), points_spent: data.points_spent, prize: { name: data.prize_name } }, ...r])
      // Si se agotó el stock, quitar el premio del catálogo local
      if (data.stock_depleted) {
        setPrizes(ps => ps.map(p => p.id === prize.id ? { ...p, active: false, stock: 0 } : p))
      }
      logActivity('prize_redeemed', `Premio "${data.prize_name}" canjeado por ${(member.profiles?.display_name || member.profiles?.full_name || member.profiles?.name) || 'cliente'}`)
    } else {
      setRedeemError(data.error || 'Error al canjear')
    }
    setRedeemingPrize(null)
  }

  // Otorgar manualmente una promo configurada al cliente seleccionado.
  // Llama al endpoint /api/grant-promotion que hace upsert de client_promotion
  // con status='active' y notifica a ambas partes.
  async function grantPromoToMember(promoId) {
    if (!selectedMember || grantingPromoId) return
    setGrantError('')
    setGrantingPromoId(promoId)
    try {
      const res = await fetch('/api/grant-promotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commerce_id:   commerce.id,
          membership_id: selectedMember.id,
          promotion_id:  promoId,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        const promoName = promos.find(p => p.id === promoId)?.value
          ? `${promos.find(p => p.id === promoId).value}% OFF`
          : 'beneficio'
        showToast('success', `Le otorgaste ${promoName} a ${(selectedMember.profiles?.display_name || selectedMember.profiles?.full_name || selectedMember.profiles?.name)?.split(' ')[0] || 'el cliente'}`)
        setGrantPanelOpen(false)
        logActivity('promo_granted', `${promoName} otorgado manualmente a ${(selectedMember.profiles?.display_name || selectedMember.profiles?.full_name || selectedMember.profiles?.name) || 'cliente'}`)
      } else {
        setGrantError(data.error || 'No se pudo otorgar el beneficio')
      }
    } catch (e) {
      setGrantError(e?.message || 'Error de red')
    } finally {
      setGrantingPromoId(null)
    }
  }

  if (loading) return <div style={{ padding:40 }}><Spinner /></div>
  if (!commerce) return (
    <div style={{ maxWidth:480, margin:'0 auto', padding:'60px 20px', textAlign:'center' }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
        <div style={{ width:56, height:56, borderRadius:14, background:`${C.v}22`, border:`1px solid ${C.v}44`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Building2 size={26} color={C.v} strokeWidth={2} />
        </div>
      </div>
      <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:C.white, marginBottom:8 }}>Todavía no registraste tu negocio</div>
      <div style={{ fontSize:13, color:C.mist, marginBottom:24 }}>Registralo primero para poder configurarlo.</div>
      <GBtn onClick={() => setView('register-commerce')}>Registrar mi negocio →</GBtn>
    </div>
  )

  // ── ONBOARDING: mostrar hasta que esté completado ──
  if (!commerce.onboarding_done) {
    return (
      <OnboardingView
        commerce={commerce}
        onComplete={async () => {
          // Guardar en BD y actualizar estado local
          await supabase.from('commerces').update({ onboarding_done: true }).eq('id', commerce.id)
          setCommerce(c => ({ ...c, onboarding_done: true }))
        }}
      />
    )
  }

  const unitLabel = form?.prog_type === 'stars' ? 'estrellas' : 'puntos'
  const unitIcon  = form?.prog_type === 'stars' ? '★' : '◆'
  const unitColor = form?.prog_type === 'stars' ? '#8B5CF6' : '#EC4899'
  const activePrizes   = prizes.filter(p => p.active)
  const minPrizeCost   = activePrizes.length ? Math.min(...activePrizes.map(p => p.cost)) : 10

  // Plan
  const planKey     = commerce?.plan || 'free'
  const planDef     = PLANS[planKey] || PLANS.free
  const clientCount = members.length
  const atLimit     = planDef.limit !== null && clientCount >= planDef.limit
  const nearLimit   = planDef.limit !== null && !atLimit && clientCount >= Math.floor(planDef.limit * 0.8)
  const canPromote      = canUseFeature(planKey, 'promotions')
  const perms           = getPlanPermissions(planKey)
  const activeRewardsCount = prizes.filter(p => p.active).length
  const rewardsAtLimit  = perms.max_rewards !== null && activeRewardsCount >= perms.max_rewards

  async function upgradePlan(newPlan) {
    // MVP simple: en lugar de upgrade directo en DB, abrimos WhatsApp con mensaje
    // pre-armado al admin para coordinar el cobro vía Mercado Pago manual.
    // El admin después actualiza el plan a mano (vía panel admin o Supabase).
    const def      = PLANS[newPlan]
    if (!def) return
    const priceFmt = def.price ? `$${def.price.toLocaleString('es-AR')}/mes` : 'Gratis'
    const msg = `Hola Benefix! Soy ${commerce?.name || 'un comerciante'} y quiero suscribirme al plan ${def.label} (${priceFmt}). Esperando link de pago para coordinar. ¡Gracias!`
    const ADMIN_WHATSAPP = '542302351158'  // sin + ni espacios — WhatsApp del admin
    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('info', 'Te abrimos WhatsApp para coordinar tu suscripción')
    logActivity('settings', `Solicitud de upgrade a ${def.label}`)
  }

  const nearPrize = members.filter(m => {
    const val = form?.prog_type === 'stars' ? (m.stars||0) : (m.points||0)
    return val >= minPrizeCost * 0.8 && val < minPrizeCost
  })

  // ── Automatizaciones: clientes detectados por condición ──
  const isAutoStars        = form?.prog_type === 'stars'
  const cheapestActive     = prizes.filter(p => p.active).sort((a,b) => a.cost - b.cost)[0]
  const nowTs              = Date.now()
  const inactiveCutoff     = new Date(nowTs - (autoConfigs.reactivacion.days||7) * 86400000).toISOString()
  const firstVisitCutoff   = new Date(nowTs - (autoConfigs.primeraVisita.days||7) * 86400000).toISOString()
  const autoClients = {
    reactivacion:  members.filter(m => m.last_visit && m.last_visit < inactiveCutoff),
    cercaPremio:   cheapestActive
      ? members.filter(m => {
          const bal = isAutoStars ? (m.stars||0) : (m.points||0)
          return bal > 0 && bal >= cheapestActive.cost * 0.8 && bal < cheapestActive.cost
        })
      : [],
    primeraVisita: members.filter(m =>
      m.visits_count === 1 && m.last_visit && m.last_visit >= firstVisitCutoff
    ),
  }

  // Mock auto clients — se muestran cuando no hay clientes reales
  const mockPrizeCost = cheapestActive?.cost || 500
  const isMockAuto   = members.length === 0
  const mockAutoClients = {
    reactivacion: [
      { id:'mock-ra1', user_id:'mock-u1', profiles:{ full_name:'Carlos Rodríguez', email:'carlos.r@gmail.com',  phone:'+54123456791' }, points:180, stars:2, visits_count:8,  last_visit: new Date(Date.now()-15*864e5).toISOString(), joined_at: new Date(Date.now()-90*864e5).toISOString() },
      { id:'mock-ra2', user_id:'mock-u2', profiles:{ full_name:'Ana Martínez',     email:'ana.m@gmail.com',     phone:'+54123456792' }, points:95,  stars:1, visits_count:4,  last_visit: new Date(Date.now()-22*864e5).toISOString(), joined_at: new Date(Date.now()-45*864e5).toISOString() },
      { id:'mock-ra3', user_id:'mock-u6', profiles:{ full_name:'Roberto Silva',    email:'roberto.s@gmail.com', phone:'+54123456793' }, points:230, stars:3, visits_count:11, last_visit: new Date(Date.now()-10*864e5).toISOString(), joined_at: new Date(Date.now()-70*864e5).toISOString() },
    ],
    cercaPremio: [
      { id:'mock-cp1', user_id:'mock-u3', profiles:{ full_name:'María López',   email:'mlopez@hotmail.com',  phone:'+54123456790' }, points:Math.round(mockPrizeCost*.85), stars:Math.round(mockPrizeCost*.85), visits_count:12, last_visit: new Date(Date.now()-2*864e5).toISOString(), joined_at: new Date(Date.now()-60*864e5).toISOString() },
      { id:'mock-cp2', user_id:'mock-u4', profiles:{ full_name:'Pedro Sánchez', email:'pedro.s@gmail.com',   phone:'+54123456794' }, points:Math.round(mockPrizeCost*.9),  stars:Math.round(mockPrizeCost*.9),  visits_count:15, last_visit: new Date(Date.now()-1*864e5).toISOString(), joined_at: new Date(Date.now()-120*864e5).toISOString() },
    ],
    primeraVisita: [
      { id:'mock-pv1', user_id:'mock-u5', profiles:{ full_name:'Laura González', email:'laura.g@gmail.com', phone:'+54123456795' }, points:100, stars:1, visits_count:1, last_visit: new Date(Date.now()-3*864e5).toISOString(), joined_at: new Date(Date.now()-3*864e5).toISOString() },
    ],
  }
  const displayAutoClients = isMockAuto ? mockAutoClients : autoClients
  const mockCheapestActive = isMockAuto && !cheapestActive ? { name:'Premio ejemplo', cost: mockPrizeCost } : cheapestActive

  const totalDetected = Object.values(autoClients).reduce((s,arr) => s + arr.length, 0)
  const displayTotalDetected = isMockAuto
    ? Object.values(mockAutoClients).reduce((s,arr) => s + arr.length, 0)
    : totalDetected

  // ── GUARD: todos los hooks deben estar ANTES de este return ──────────────────
  if (!profile || !['commerce_owner','admin'].includes(profile.role)) return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
        <div style={{ width:48, height:48, borderRadius:12, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Lock size={22} color='rgba(255,255,255,0.50)' strokeWidth={2} />
        </div>
      </div>
      <div style={{ fontFamily:FN, fontSize:16, fontWeight:900, color:C.white }}>Solo para dueños de comercio</div>
    </div>
  )

  // ── Solapa fucsia que abre el menú lateral ──
  // Helper compartido: la usa tanto el intent picker como el panel completo.
  // Se asoma desde el borde izquierdo, está animada (tease horizontal +
  // ruedita girando en bursts) y mientras el user no la haya tocado nunca
  // tiene una manito de lucide superpuesta tocando insistentemente. Al
  // tocarla, marcamos `railTabHandSeen` y la manito ya no vuelve.
  const renderRailTab = (onActivate) => (
    <button
      onClick={() => {
        if (!railTabHandSeen) setRailTabHandSeen(true)
        onActivate()
      }}
      aria-label="Abrir menú de configuraciones"
      style={{
        position: 'fixed',
        left: -14,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 200,
        // Forma más fina y alargada — pestaña vertical estilo "lengüeta"
        // que asoma del borde izquierdo. Width angosto, height alto.
        width: 36,
        height: 84,
        padding: 0,
        border: 'none',
        borderRadius: '0 12px 12px 0',
        background: 'linear-gradient(135deg, #DB2777 0%, #EC4899 60%, #F472B6 100%)',
        boxShadow: '4px 0 18px rgba(236,72,153,0.55), inset -1px 0 0 rgba(255,255,255,0.15)',
        color: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: 6,
        animation: 'rail-tab-tease 2.2s ease-in-out infinite',
        // overflow visible para que la manito que sale por la derecha no se corte
        overflow: 'visible',
      }}
    >
      <Settings
        size={18}
        strokeWidth={2.4}
        color="#fff"
        style={{ animation: 'rail-tab-spin-burst 3.5s ease-in-out infinite' }}
      />
      {/* Manito apuntando con el dedo a la solapa, asomada desde la derecha.
          Solo se muestra mientras el user no haya tocado la solapa nunca. */}
      {!railTabHandSeen && (
        <Hand
          size={26}
          strokeWidth={2}
          color="#fff"
          style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            marginLeft: 6,
            transform: 'translateY(-50%) rotate(-90deg)',
            filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.55))',
            animation: 'rail-tab-hand 1.4s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}
      <style>{`
        @keyframes rail-tab-tease {
          0%, 100% { transform: translate(-2px, -50%); }
          50%      { transform: translate(6px,  -50%); }
        }
        /* Burst: hace un giro completo en ~1.2s acelerando y
           desacelerando (cubic-bezier ease-in-out implícito), después
           se queda quieto ~2.3s, y vuelve a girar. */
        @keyframes rail-tab-spin-burst {
          0%   { transform: rotate(0deg); }
          35%  { transform: rotate(360deg); }
          100% { transform: rotate(360deg); }
        }
        /* Manito tocando: se acerca a la solapa (translateX hacia la izquierda)
           y se aleja, rotation -90 la deja con el dedo apuntando hacia la izq. */
        @keyframes rail-tab-hand {
          0%, 100% { transform: translate(0, -50%) rotate(-90deg) scale(1);   opacity: 0.95; }
          50%      { transform: translate(-10px, -50%) rotate(-90deg) scale(0.92); opacity: 1; }
        }
      `}</style>
    </button>
  )

  // ── PANTALLA INICIAL: INTENT PICKER ──────────────────────────────────────
  // Saludo + dos botones grandes con las dos acciones más comunes que un
  // dueño hace al entrar al panel: mostrar el QR del local (para que se
  // sume un nuevo cliente) o escanear el QR de un cliente (después de una
  // compra para sumarle puntos/estrellas). Cualquier otra cosa (ver clientes,
  // configurar premios, etc.) sigue accesible una vez que descarta el picker.
  if (intentPickerActive) {
    // 4 accesos directos a las secciones más importantes del panel comerciante.
    // Las funciones de QR / cámara están todas en la pestaña "Escanear" del
    // navbar superior — no se duplican acá.
    const goToTab = (tabId) => () => {
      setIntentPickerActive(false)
      _setTabRaw(tabId)
      setRailExpanded(false)
    }
    // Estética unificada violeta — los 4 accesos tienen la misma paleta
    // (gradient violeta marca) para que se lean como hermanos. La diferencia
    // entre ellos la da el ícono y el texto, no el color.
    const VIOLET_THEME = {
      bg:         'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(168,85,247,0.10), rgba(189,75,248,0.14))',
      border:     'rgba(168,85,247,0.42)',
      iconBg:     'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #BD4BF8 100%)',
      shadow:     '0 6px 22px rgba(168,85,247,0.40)',
      descColor:  'rgba(229,221,255,0.78)',
      arrowColor: 'rgba(196,181,253,0.88)',
    }

    // Ícono "Recompensas" con flip horizontal: alterna entre una estrella
    // (cara delantera) y un símbolo "%" (cara trasera) usando rotateY 3D.
    // El backface-visibility:hidden hace que solo se vea una cara a la vez.
    const AnimatedRewardIcon = ({ size = 22, color = '#fff', strokeWidth = 2.2 }) => (
      <span style={{
        display: 'inline-flex',
        width: size, height: size,
        perspective: 100,
      }}>
        <span style={{
          position: 'relative',
          width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          animation: 'reward-flip 2.6s ease-in-out infinite',
        }}>
          <span style={{
            position:'absolute', inset:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
          }}>
            <Star size={size} color={color} strokeWidth={strokeWidth} fill={color} />
          </span>
          <span style={{
            position:'absolute', inset:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
            transform: 'rotateY(180deg)',
            color,
            fontFamily: FN,
            fontSize: size,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-.04em',
          }}>
            %
          </span>
        </span>
        <style>{`
          @keyframes reward-flip {
            0%, 38%   { transform: rotateY(0); }
            50%, 88%  { transform: rotateY(180deg); }
            100%      { transform: rotateY(360deg); }
          }
        `}</style>
      </span>
    )

    const PANEL_SHORTCUTS = [
      { id: 'clientes',     title: 'Clientes',     Icon: Users,     onClick: goToTab('clientes'),
        desc: 'Lista completa de clientes, búsqueda, fichas individuales y beneficios manuales.', ...VIOLET_THEME },
      { id: 'recompensas',  title: 'Recompensas',  Icon: AnimatedRewardIcon, onClick: goToTab('recompensas'),
        desc: 'Sistema base (estrellas/puntos), premios del catálogo y promociones extra.',       ...VIOLET_THEME },
      { id: 'analisis',     title: 'Análisis',     Icon: BarChart2, onClick: goToTab('analisis'),
        desc: 'Reportes de visitas, canjes y descuentos + segmentación de clientes por actividad.', ...VIOLET_THEME },
      { id: 'configuracion',title: 'Mi negocio',   Icon: Settings,  onClick: goToTab('configuracion'),
        desc: 'Datos del local, horarios, ubicación, plan, foto de portada y más.',               ...VIOLET_THEME },
    ]

    // Header chico para cada grupo de botones — barrita con gradient + label
    // en mayúsculas. Mismo formato que el scanner del cliente, así toda la
    // app habla el mismo idioma visual.
    const SectionHeader = ({ children }) => (
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'0 4px 10px',
        marginBottom:2,
      }}>
        <div style={{ width:3, height:14, borderRadius:99, background:'linear-gradient(135deg, #FE5000, #BD4BF8)' }} />
        <div style={{
          fontFamily:FN, fontSize:11.5, fontWeight:800,
          color:'rgba(255,255,255,0.85)',
          letterSpacing:'.10em', textTransform:'uppercase',
        }}>{children}</div>
      </div>
    )

    // Accordion card — colapsada muestra ícono + título + chevron.
    // Click expande la descripción y un botón "Ir →" que ejecuta la acción.
    // Solo una card abierta a la vez (toggle entre ids).
    const renderActionCard = opt => {
      const isOpen = expandedIntentAction === opt.id
      return (
        <div key={opt.id}
          style={{
            background: opt.bg,
            border: `1px solid ${opt.border}`,
            borderRadius:16,
            overflow:'hidden',
            transition:'border-color 160ms ease',
          }}>
          {/* Header cliqueable: ícono + título + chevron */}
          <button
            onClick={() => setExpandedIntentAction(isOpen ? null : opt.id)}
            style={{
              width:'100%', textAlign:'left',
              padding:'18px 18px',
              background:'transparent',
              border:'none',
              cursor:'pointer',
              display:'flex', alignItems:'center', gap:14,
              fontFamily:'inherit',
            }}>
            <div style={{ width:48, height:48, borderRadius:13, background: opt.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow: opt.shadow }}>
              <opt.Icon size={22} color='#fff' strokeWidth={2.2} />
            </div>
            <div style={{ flex:1, minWidth:0, fontFamily:FN, fontSize:15, fontWeight:800, color:'#fff' }}>
              {opt.title}
            </div>
            <ChevronDown
              size={18}
              color={opt.arrowColor}
              strokeWidth={2.4}
              style={{
                flexShrink:0,
                transition: 'transform 200ms ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              }}
            />
          </button>
          {/* Body: descripción a la izquierda + botón "Ir" a la derecha */}
          {isOpen && (
            <div style={{
              padding:'12px 18px 14px',
              borderTop:`1px solid ${opt.border}`,
              animation:'intent-accordion-in 240ms ease',
              display:'flex', alignItems:'center', gap:14,
            }}>
              <div style={{ flex:1, minWidth:0, fontSize:12.5, color: opt.descColor, lineHeight:1.5 }}>
                {opt.desc}
              </div>
              <button
                onClick={opt.onClick}
                style={{
                  flexShrink:0,
                  display:'inline-flex', alignItems:'center', gap:6,
                  padding:'8px 16px',
                  background:'transparent',
                  border:'1px solid rgba(168,85,247,0.45)',
                  borderRadius:10,
                  color:'#D8B4FE',
                  fontFamily:FN, fontSize:13, fontWeight:700,
                  cursor:'pointer',
                  letterSpacing:'.02em',
                  transition:'background 160ms ease, border-color 160ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(168,85,247,0.10)'
                  e.currentTarget.style.borderColor = 'rgba(168,85,247,0.65)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(168,85,247,0.45)'
                }}>
                Ir
                <ArrowRight size={14} color="#D8B4FE" strokeWidth={2.4} />
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div style={{ maxWidth:520, margin:'0 auto', padding: isMobile ? '24px 18px 80px' : '32px 28px 80px' }}>
        {/* Cartel de ayuda — primero, inmediatamente debajo del navbar */}
        <HelpBanner
          id="merchant-intent"
          title="Tu panel de negocio"
          body="Acá tenés todas las configuraciones, funciones y reportes del funcionamiento de tu negocio."
          details={<>
            Cada sección tiene su propio cartel con la explicación detallada. Para navegar entre ellas tocá la <strong style={{ color:'#fff' }}>solapa fucsia</strong> del borde izquierdo, y para mostrar/escanear QRs usá el ícono <strong style={{ color:'#fff' }}>Escanear</strong> del navbar superior.
          </>}
        />

        <h1 style={{ fontFamily:FN, fontSize:'clamp(22px,4vw,28px)', fontWeight:900, color:C.white, marginBottom:4, letterSpacing:'-.01em' }}>
          Configurá tu negocio
        </h1>
        <div style={{ fontFamily:FN, fontSize:11.5, fontWeight:700, color:C.mist, letterSpacing:'.10em', textTransform:'uppercase', marginBottom:14 }}>
          Accesos directos
        </div>

        {/* Accesos directos — 4 cards accordion. Cada una abre la pestaña
            correspondiente del panel al hacer click en "Ir →". */}
        <div style={{
          padding:'14px 12px',
          background:'rgba(255,255,255,0.025)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:18,
          display:'flex', flexDirection:'column', gap:10,
        }}>
          {PANEL_SHORTCUTS.map(renderActionCard)}
        </div>

        {/* La solapa fucsia se renderiza vía renderRailTab() — definido más
            abajo y compartido con el resto del panel para que sea consistente. */}
        {renderRailTab(() => { setIntentPickerActive(false); setRailExpanded(true) })}

        <style>{`
          @keyframes intent-accordion-in {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    )
  }

  function saveAutoConfigs(next) {
    setAutoConfigs(next)
    if (commerce) { try { localStorage.setItem(`cb_auto_${commerce.id}`, JSON.stringify(next)) } catch {} }
  }
  function markSent(type, userId) {
    const key    = `${type}_${userId}`
    const newLog = { ...sentLog, [key]: Date.now() }
    setSentLog(newLog)
    if (commerce) { try { localStorage.setItem(`cb_sent_${commerce.id}`, JSON.stringify(newLog)) } catch {} }
  }
  function wasSentRecently(type, userId) {
    const ts = sentLog[`${type}_${userId}`]
    return ts && (Date.now() - ts) < 48 * 3600 * 1000
  }
  function buildAutoMessage(type, member) {
    const firstName = ((member.profiles?.display_name || member.profiles?.full_name || member.profiles?.name) || 'cliente').split(' ')[0]
    const bal       = isAutoStars ? (member.stars||0) : (member.points||0)
    const unit      = isAutoStars ? 'estrella(s)' : 'punto(s)'
    const biz       = commerce?.name || ''
    if (type === 'reactivacion')
      return `Hola ${firstName}! Hace unos días que no venís 😄\nTe esperamos esta semana para que sigas sumando beneficios en ${biz} 🎁`
    if (type === 'cercaPremio') {
      const faltante = cheapestActive ? Math.max(1, Math.round(cheapestActive.cost - bal)) : 0
      return `Hola ${firstName}! Estás a solo ${faltante} ${unit} de tu recompensa 🎁\n¡Vení a ${biz} y aprovechala!`
    }
    if (type === 'primeraVisita')
      return `Hola ${firstName}! Gracias por tu primera visita 🙌\nYa empezaste a sumar beneficios en ${biz}. ¡Te esperamos pronto!`
    return ''
  }

  const MENU = [
    { id:'dashboard',        label:'Dashboard'        },
    { id:'clientes',         label:'Clientes'         },
    // Pestaña unificada: sistema base + promociones (sin automatizaciones).
    { id:'recompensas',      label:'Recompensas'      },
    { id:'premios',          label:'Premios'          },
    // Mensajes = automatizaciones de WhatsApp, separadas porque son
    // comunicación fuera del scan (no transaccional como recompensas).
    { id:'mensajes',         label:'Mensajes',        pro: true },
    // Análisis = reportes + segmentación mergeados.
    { id:'analisis',         label:'Análisis'         },
    { id:'historial',        label:'Historial'        },
    { id:'configuracion',    label:'Configuración'    },
    // Planes vuelve a ser pestaña propia: Configuración era demasiado larga
    // con la sección de planes adentro.
    { id:'planes',           label:'Planes'           },
  ]

  // ── DETALLE DE CLIENTE ──
  if (selectedMember) {
    const m          = selectedMember
    const name       = (m.profiles?.display_name || m.profiles?.full_name || m.profiles?.name) || 'Cliente'
    const val        = form?.prog_type === 'stars' ? (m.stars||0) : (m.points||0)
    const goal       = minPrizeCost
    const canRedeem  = val >= goal
    const eligiblePrizes = activePrizes.filter(p => p.cost <= val)
    return (
      <div style={{ maxWidth:520, margin:'0 auto', padding:'24px 18px 80px' }}>
        <button onClick={() => { setSelectedMember(null); setMemberVisits([]); setMemberRedemptions([]); setRedeemError('') }}
          style={{ background:'transparent', border:'none', color:C.mist, fontSize:12, padding:'0 0 16px', cursor:'pointer' }}>← Volver a clientes</button>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
          <div style={{ width:52, height:52, borderRadius:999, background:`${C.v}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontFamily:FN, fontWeight:900, color:C.v, flexShrink:0 }}>
            {name[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white }}>{name}</div>
            <div style={{ fontSize:12, color:C.mist }}>{m.visits_count||0} visitas · {unitIcon} {val} {unitLabel}</div>
          </div>
          {canRedeem && (
            <div style={{ marginLeft:'auto', background:`${C.ok}22`, border:`1px solid ${C.ok}44`, borderRadius:8, padding:'4px 10px', fontSize:11, color:C.ok, fontWeight:700, flexShrink:0, display:'flex', alignItems:'center', gap:4 }}>
              <CheckCircle size={11} strokeWidth={2} /> Listo
            </div>
          )}
        </div>

        {/* Datos de contacto */}
        <PCard style={{ padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:10, color:C.dust, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:12 }}>Datos del cliente</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { Icon: Mail,     label:'Email',     val: m.profiles?.email   || '–' },
              { Icon: Phone,    label:'Teléfono',  val: m.profiles?.phone   || '–' },
              { Icon: Calendar, label:'Fecha de alta', val: m.joined_at ? new Date(m.joined_at).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '–' },
            ].map(row => (
              <div key={row.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <row.Icon size={14} color='rgba(255,255,255,0.50)' strokeWidth={2} style={{ flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:9, color:C.dust, textTransform:'uppercase', letterSpacing:'.06em' }}>{row.label}</div>
                  <div style={{ fontSize:13, color: row.val === '–' ? C.dust : C.pearl, fontFamily:FN, fontWeight:600 }}>{row.val}</div>
                </div>
                {row.label === 'Teléfono' && m.profiles?.phone && (
                  <a href={`https://wa.me/${m.profiles.phone}`} target="_blank" rel="noreferrer"
                    style={{ marginLeft:'auto', background:'#25D36622', border:'1px solid #25D36644', borderRadius:8, padding:'4px 10px', color:'#25D366', fontSize:11, fontWeight:700, textDecoration:'none', flexShrink:0 }}>
                    WA
                  </a>
                )}
              </div>
            ))}
          </div>
        </PCard>

        {/* Stats */}
        <PCard style={{ padding:16, marginBottom:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { label:'Total visitas',   val: m.visits_count||0 },
              { label: unitLabel.charAt(0).toUpperCase()+unitLabel.slice(1), val: `${unitIcon} ${val}` },
              { label:'Última visita',   val: m.last_visit ? new Date(m.last_visit).toLocaleDateString('es-AR',{day:'2-digit',month:'short'}) : '–' },
              { label:'Canjes realizados', val: memberRedemptions.length },
            ].map(s => (
              <div key={s.label} style={{ background:C.bg3, borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:10, color:C.dust, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontFamily:FN, fontSize:14, fontWeight:900, color:C.white }}>{s.val}</div>
              </div>
            ))}
          </div>
        </PCard>

        {/* Sección de canje */}
        {canRedeem && eligiblePrizes.length > 0 && (
          <PCard style={{ padding:16, marginBottom:12, border:`1px solid ${C.ok}44`, background:`${C.ok}08` }}>
            <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.ok, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><Gift size={14} color={C.ok} strokeWidth={2} /> Canjear premio</div>
            {redeemError && (
              <div style={{ fontSize:11, color:'#f87', marginBottom:10 }}>{redeemError}</div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {eligiblePrizes.map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:C.bg3, borderRadius:10, padding:'10px 14px' }}>
                  <div>
                    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{p.name}</div>
                    <div style={{ fontSize:11, color:unitColor }}>{p.cost} {unitIcon} · quedarán {val - p.cost}</div>
                  </div>
                  <button onClick={() => redeemFromPanel(m, p)} disabled={!!redeemingPrize}
                    style={{ background:GV, border:'none', borderRadius:8, padding:'7px 14px', color:'#fff', fontFamily:FN, fontSize:11, fontWeight:700, cursor:'pointer', opacity: redeemingPrize === p.id ? 0.7 : 1, flexShrink:0 }}>
                    {redeemingPrize === p.id ? '⟳' : 'Canjear'}
                  </button>
                </div>
              ))}
            </div>
          </PCard>
        )}

        {/* ── Otorgar beneficio manualmente ── */}
        {/* Lista todas las promos discount_next ACTIVAS y NO vencidas del comercio.
            El dueño elige una y se la regala al cliente con un click — el endpoint
            hace upsert en client_promotions con status='active'. Útil para casos
            especiales (cliente VIP, compensación por algo, etc.). */}
        {(() => {
          const grantablePromos = (promos || []).filter(p => {
            if (!p.active) return false
            if (p.type !== 'discount_next') return false
            if (p.expires_at && new Date(p.expires_at) <= new Date()) return false
            return true
          })
          // Si el cliente ya tiene un cupón activo de la misma promo, lo marcamos
          // para mostrar "Ya tiene activo" en vez de permitir doble grant.
          // memberRedemptions no nos sirve acá, así que hacemos best-effort:
          // mostramos el botón igual y el endpoint resuelve el conflicto via upsert.
          if (grantablePromos.length === 0) return null
          return (
            <PCard style={{
              padding:16, marginBottom:12,
              // Fondo y borde con gradiente de marca naranja→violeta para que
              // se distinga visualmente del resto de las cards de la ficha y
              // se lea como una acción "destacada" del dueño.
              background:'linear-gradient(135deg, rgba(254,80,0,0.12), rgba(189,75,248,0.16))',
              border:'1px solid rgba(189,75,248,0.45)',
              boxShadow:'0 6px 22px rgba(189,75,248,0.20)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <button onClick={() => setGrantPanelOpen(o => !o)}
                  style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'space-between', background:'transparent', border:'none', padding:0, cursor:'pointer', fontFamily:'inherit' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:G, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 14px rgba(189,75,248,0.40)' }}>
                      <Sparkles size={16} color="#fff" strokeWidth={2.2} />
                    </div>
                    <div style={{ textAlign:'left' }}>
                      <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>Otorgar beneficio</div>
                      <div style={{ fontSize:11, color:C.dust, marginTop:2 }}>
                        Regalale un cupón de descuento desde tus promos vigentes
                      </div>
                    </div>
                  </div>
                  {grantPanelOpen
                    ? <ChevronUp size={16} color={C.mist} strokeWidth={2} />
                    : <ChevronDown size={16} color={C.mist} strokeWidth={2} />}
                </button>
                {/* InfoHint con el detalle de qué hace este panel — se apoya
                    en el componente reusable que ya tiene popover al click. */}
                <InfoHint align="right" text={
                  'Desde acá podés agregar beneficios a este cliente de forma manual.\n\n' +
                  'Por ejemplo: regalarle un cupón de descuento de los que tenés activos en el comercio sin que tenga que esperar a venir y escanear su QR.\n\n' +
                  'El cliente recibe el cupón al instante en su tarjeta digital y le llega notificación. La promo sigue vigente con la fecha de vencimiento que vos configuraste.'
                } />
              </div>

              {grantPanelOpen && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.rim}` }}>
                  {grantError && (
                    <div style={{ fontSize:11, color:'#f87444', marginBottom:10, padding:'7px 10px', background:'rgba(248,116,68,0.10)', border:'1px solid rgba(248,116,68,0.30)', borderRadius:8 }}>
                      {grantError}
                    </div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {grantablePromos.map(p => {
                      const valueTxt = p.value ? `${p.value}% OFF` : 'Descuento'
                      const expiresTxt = p.expiration_type === 'relative'
                        ? `Vale ${p.expiration_days || 7} día${(p.expiration_days||7) === 1 ? '' : 's'} desde que lo regales`
                        : (p.expiration_date ? `Vence el ${new Date(p.expiration_date).toLocaleDateString('es-AR')}` : 'Sin vencimiento configurado')
                      const busy = grantingPromoId === p.id
                      return (
                        <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:C.bg3, borderRadius:10, padding:'10px 14px', gap:10 }}>
                          <div style={{ minWidth:0, flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                              <Percent size={11} color={C.v} strokeWidth={2.5} />
                              <span style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{valueTxt}</span>
                            </div>
                            {p.description && (
                              <div style={{ fontSize:11, color:C.mist, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {p.description}
                              </div>
                            )}
                            <div style={{ fontSize:10, color:C.dust }}>{expiresTxt}</div>
                          </div>
                          <button onClick={() => grantPromoToMember(p.id)} disabled={!!grantingPromoId}
                            style={{ background:GV, border:'none', borderRadius:8, padding:'8px 14px', color:'#fff', fontFamily:FN, fontSize:11, fontWeight:700, cursor: grantingPromoId ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, flexShrink:0 }}>
                            {busy ? '⟳' : 'Otorgar'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </PCard>
          )
        })()}

        {/* Historial combinado: visitas + canjes */}
        <PCard style={{ padding:16 }}>
          <div style={{ fontSize:11, color:C.mist, fontWeight:700, marginBottom:12 }}>Actividad</div>
          {memberVisits.length === 0 && memberRedemptions.length === 0 ? (
            <div style={{ color:C.dust, fontSize:12, textAlign:'center', padding:'12px 0' }}>Sin actividad registrada aún</div>
          ) : (
            (() => {
              // Combinar visitas y canjes en una timeline
              const items = [
                ...memberVisits.map(v => ({ type:'visit', date: v.scanned_at, points: v.points_earned||1, id:'v'+v.id })),
                ...memberRedemptions.map(r => ({ type:'redeem', date: r.created_at, prize: r.prize?.name, spent: r.points_spent, id:'r'+r.id })),
              ].sort((a, b) => new Date(b.date) - new Date(a.date))
              return items.map(item => (
                <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.rim}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ display:'flex', alignItems:'center' }}>
                      {item.type === 'visit'
                        ? (form?.prog_type === 'stars' ? <Star size={13} color={unitColor} strokeWidth={2} /> : <Gem size={13} color={unitColor} strokeWidth={2} />)
                        : <Gift size={13} color={C.v} strokeWidth={2} />}
                    </span>
                    <div>
                      <div style={{ fontSize:12, color:C.mist }}>
                        {new Date(item.date).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'})}
                      </div>
                      <div style={{ fontSize:10, color:C.dust }}>
                        {new Date(item.date).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}
                        {item.type === 'redeem' && item.prize ? ` · ${item.prize}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontFamily:FN, fontSize:11, fontWeight:700, color: item.type === 'visit' ? unitColor : '#f87444' }}>
                    {item.type === 'visit' ? `+${item.points} ${unitLabel}` : `-${item.spent} ${unitLabel}`}
                  </div>
                </div>
              ))
            })()
          )}
        </PCard>
      </div>
    )
  }

  // ── LAYOUT PRINCIPAL ──
  return (
    <div style={{ display:'flex', minHeight:'calc(100vh - 80px)' }}>
      {upgradeModal && (
        <UpgradeModal
          feature={upgradeModal}
          onUpgrade={async (plan) => { await upgradePlan(plan); setUpgradeModal(null) }}
          onViewPlans={() => { setTab('configuracion'); setUpgradeModal(null) }}
          onClose={() => setUpgradeModal(null)}
        />
      )}

      {showAutoPopup && (
        <div onClick={() => setShowAutoPopup(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.80)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e => e.stopPropagation()} className="modal-in" style={{ background:'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)', borderRadius:28, padding:'36px 28px 28px', maxWidth:320, width:'100%', textAlign:'center', boxShadow:'0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(168,85,247,0.30)' }}>
            {/* Icon */}
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,0.20)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <Users size={30} color='#fff' strokeWidth={2} />
            </div>
            {/* Big number */}
            <div style={{ fontFamily:FN, fontSize:64, fontWeight:900, color:'#fff', lineHeight:1, marginBottom:8 }}>
              {displayTotalDetected}
            </div>
            {/* Label */}
            <div style={{ fontFamily:FN, fontSize:18, fontWeight:700, color:'#fff', marginBottom:8 }}>
              clientes para contactar
            </div>
            {/* Subtext */}
            <div style={{ fontFamily:FI, fontSize:13, color:'rgba(255,255,255,0.70)', marginBottom:28, lineHeight:1.5 }}>
              Tenés oportunidades de venta esperando
            </div>
            {/* Primary CTA */}
            <button
              onClick={() => { setShowAutoPopup(false); setTab('mensajes') }}
              style={{ width:'100%', padding:'14px 0', borderRadius:16, background:'#fff', border:'none', color:'#7c3aed', fontFamily:FN, fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:10, transition:'opacity 160ms ease' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.92'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Ver automatizaciones →
            </button>
            {/* Dismiss */}
            <button onClick={() => setShowAutoPopup(false)} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.55)', fontSize:13, fontFamily:FI, cursor:'pointer', padding:'4px 0' }}>
              Ahora no
            </button>
          </div>
        </div>
      )}

      {/* ── SIDEBAR (desktop) ── */}
      {!isMobile && (
        <div style={{ width:210, flexShrink:0, background:'rgba(0,0,0,0.60)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', borderRight:`1px solid ${C.rim}`, display:'flex', flexDirection:'column', paddingTop:28 }}>
          <div style={{ padding:'0 18px 18px', borderBottom:`1px solid ${C.rim}`, marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" id="logo-input-sidebar" style={{ display:'none' }}
              onChange={e => { if (e.target.files[0]) handleLogoFileSelect(e.target.files[0]); e.target.value='' }} />
            <label htmlFor="logo-input-sidebar" title={form?.img_url ? 'Cambiar logo' : 'Subir logo'} style={{ cursor:'pointer', position:'relative', flexShrink:0, display:'block' }}>
              {form?.img_url
                ? <img src={form.img_url} alt="" style={{ width:38, height:38, borderRadius:9, objectFit:'cover', display:'block' }} />
                : <div style={{ width:38, height:38, borderRadius:9, background:`${C.v}33`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Building2 size={18} color={C.v} strokeWidth={2} />
                  </div>
              }
              {uploadingLogo && (
                <div style={{ position:'absolute', inset:0, borderRadius:9, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                </div>
              )}
              {!form?.img_url && !uploadingLogo && (
                <div style={{ position:'absolute', bottom:-4, right:-4, width:14, height:14, borderRadius:'50%', background:G, display:'flex', alignItems:'center', justifyContent:'center', border:`1.5px solid ${C.bg}` }}>
                  <Upload size={7} strokeWidth={3} color="#fff" />
                </div>
              )}
            </label>
            <div>
              <div style={{ fontFamily:FN, fontSize:12, fontWeight:900, color:C.white, lineHeight:1.3 }}>{commerce.name}</div>
              <div style={{ fontSize:10, color:unitColor, marginTop:1 }}>{unitIcon} {unitLabel}</div>
            </div>
          </div>
          {MENU.map(m => {
            const isProLocked = m.pro && planKey !== 'pro'
            const isLocked    = m.locked
            const dimmed      = isLocked || isProLocked
            return (
              <button key={m.id} onClick={() => { if (isLocked) { setUpgradeModal('promotions'); setTab(m.id) } else setTab(m.id) }}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 18px', background:tab===m.id?`${C.v}20`:'transparent', border:'none', borderRadius:8, color: dimmed ? C.dust : tab===m.id?C.white:C.mist, fontSize:12, cursor:'pointer', textAlign:'left', width:'100%', transition:'background 130ms ease, color 130ms ease', fontFamily:'inherit', opacity: dimmed ? 0.75 : 1 }}>
                {(() => { const I = MENU_ICONS[m.id]; return I ? <I size={15} color={dimmed ? C.dust : tab===m.id ? C.white : C.mist} strokeWidth={2} style={{ flexShrink:0 }} /> : null })()}
                <span style={{ fontFamily:FN, fontWeight:tab===m.id?700:400, flex:1 }}>{m.label}</span>
                {isProLocked && <span style={{ fontSize:9, color:PLANS.pro.color, fontFamily:FN, fontWeight:700 }}>PRO</span>}
                {isLocked && !isProLocked && <Lock size={10} color={C.dust} strokeWidth={2} />}
                {m.id === 'automatizaciones' && planKey === 'pro' && displayTotalDetected > 0 && (
                  <span style={{ fontSize:10, fontWeight:700, color:'#fff', background:C.v, borderRadius:99, padding:'1px 6px', minWidth:16, textAlign:'center' }}>{displayTotalDetected}</span>
                )}
              </button>
            )
          })}
          <div style={{ flex:1 }} />
          {/* Plan widget sidebar */}
          <div
            onClick={() => setTab('configuracion')}
            style={{ margin:'0 12px 10px', padding:'10px 12px', background:planDef.badge, border:`1px solid ${planDef.color}44`, borderRadius:10, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: planDef.limit ? 6 : 0 }}>
              <span style={{ fontFamily:FN, fontSize:10, fontWeight:700, color:planDef.color, letterSpacing:'.08em' }}>{planDef.label}</span>
              {planKey !== 'pro' && <span style={{ fontSize:9, color:C.dust }}>Ver planes →</span>}
            </div>
            {planDef.limit !== null && (
              <>
                <div style={{ fontSize:10, color: atLimit ? '#f87444' : nearLimit ? C.o : C.mist, marginBottom:4 }}>
                  {clientCount} / {planDef.limit} clientes
                </div>
                <div style={{ height:3, borderRadius:3, background:C.rim, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100, (clientCount/planDef.limit)*100)}%`, background: atLimit ? '#f87444' : nearLimit ? C.o : planDef.color, borderRadius:3, transition:'width .4s' }} />
                </div>
              </>
            )}
            {planDef.limit === null && (
              <div style={{ fontSize:10, color:C.mist }}>{clientCount} clientes · ilimitado</div>
            )}
          </div>
          {/* Action buttons del sidebar removidos — ahora viven en la Navbar global arriba. */}
        </div>
      )}

      {/* Mobile navbar interno removida — ahora se usa la Navbar global. */}

      {/* ── DRAWER OVERLAY ── */}
      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:400, backdropFilter:'blur(2px)' }} />
      )}

      {/* ── DRAWER PANEL ── */}
      {isMobile && drawerOpen && (
        <div className="drawer-in" style={{ position:'fixed', top:0, left:0, bottom:0, width:288, background:'rgba(0,0,0,0.80)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', border:`1px solid ${C.rim}`, zIndex:401, display:'flex', flexDirection:'column', overflowY:'auto' }}>

          {/* Drawer header */}
          <div style={{ padding:'18px 16px 14px', borderBottom:`1px solid ${C.rim}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <Logo />
              <button onClick={() => setDrawerOpen(false)}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:C.card, border:`1px solid ${C.rim}`, cursor:'pointer', color:C.mist }}>
                <X size={16} />
              </button>
            </div>
            {/* Commerce info */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:C.card, borderRadius:12, border:`1px solid ${C.rim}` }}>
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" id="logo-input-drawer" style={{ display:'none' }}
                onChange={e => { if (e.target.files[0]) handleLogoFileSelect(e.target.files[0]); e.target.value='' }} />
              <label htmlFor="logo-input-drawer" title={form?.img_url ? 'Cambiar logo' : 'Subir logo'} style={{ cursor:'pointer', position:'relative', flexShrink:0, display:'block' }}>
                {form?.img_url
                  ? <img src={form.img_url} alt="" style={{ width:36, height:36, borderRadius:8, objectFit:'cover', display:'block' }} />
                  : <div style={{ width:36, height:36, borderRadius:8, background:`${C.v}33`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Building2 size={18} color={C.v} strokeWidth={2} />
                    </div>
                }
                {uploadingLogo && (
                  <div style={{ position:'absolute', inset:0, borderRadius:8, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                  </div>
                )}
                {!form?.img_url && !uploadingLogo && (
                  <div style={{ position:'absolute', bottom:-4, right:-4, width:14, height:14, borderRadius:'50%', background:G, display:'flex', alignItems:'center', justifyContent:'center', border:`1.5px solid ${C.card}` }}>
                    <Upload size={7} strokeWidth={3} color="#fff" />
                  </div>
                )}
              </label>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:FN, fontSize:13, fontWeight:900, color:C.white, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{commerce.name}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                  <span style={{ fontFamily:FN, fontSize:9, fontWeight:700, color:planDef.color, letterSpacing:'.06em', padding:'1px 6px', borderRadius:4, background:planDef.badge }}>{planDef.label}</span>
                  {planDef.limit !== null && (
                    <span style={{ fontSize:10, color: atLimit ? '#f87444' : nearLimit ? C.o : C.mist }}>{clientCount}/{planDef.limit} clientes</span>
                  )}
                  {planDef.limit === null && (
                    <span style={{ fontSize:10, color:C.mist }}>{clientCount} clientes</span>
                  )}
                </div>
              </div>
            </div>
            {/* Progress bar */}
            {planDef.limit !== null && (
              <div style={{ height:3, borderRadius:3, background:C.rim, overflow:'hidden', marginTop:8 }}>
                <div style={{ height:'100%', width:`${Math.min(100,(clientCount/planDef.limit)*100)}%`, background: atLimit ? '#f87444' : nearLimit ? C.o : planDef.color, borderRadius:3, transition:'width .4s' }} />
              </div>
            )}
          </div>

          {/* Nav items */}
          <div style={{ flex:1, padding:'8px 10px' }}>
            {MENU.map(m => {
              const isProLocked = m.pro && planKey !== 'pro'
              const isLocked    = m.locked
              const dimmed      = isLocked || isProLocked
              const IconComp    = MENU_ICONS[m.id]
              const active      = tab === m.id
              return (
                <button key={m.id}
                  onClick={() => {
                    if (isLocked) setUpgradeModal('promotions')
                    setTab(m.id)
                    setDrawerOpen(false)
                  }}
                  style={{ display:'flex', alignItems:'center', gap:11, width:'100%', padding:'11px 12px', borderRadius:10, background: active ? `${C.v}20` : 'transparent', border:'none', color: dimmed ? C.dust : active ? C.white : C.mist, fontSize:13, fontFamily:FN, fontWeight: active ? 700 : 400, cursor:'pointer', textAlign:'left', transition:'background 130ms ease, color 130ms ease', opacity: dimmed ? 0.65 : 1, marginBottom:2 }}>
                  {IconComp && <IconComp size={17} style={{ flexShrink:0 }} />}
                  <span style={{ flex:1 }}>{m.label}</span>
                  {isProLocked && <span style={{ fontSize:9, color:PLANS.pro.color, fontFamily:FN, fontWeight:700, letterSpacing:'.05em' }}>PRO</span>}
                  {isLocked && !isProLocked && <Lock size={11} color={C.dust} strokeWidth={2} />}
                  {m.id === 'automatizaciones' && planKey === 'pro' && displayTotalDetected > 0 && (
                    <span style={{ fontSize:10, fontWeight:700, color:'#fff', background:C.v, borderRadius:99, padding:'1px 6px', minWidth:18, textAlign:'center' }}>{displayTotalDetected}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Scanner CTA */}
          <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.rim}` }}>
            <button
              onClick={() => { setView('scanner'); setDrawerOpen(false) }}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'13px 0', borderRadius:12, background:G, border:'none', color:'#fff', fontFamily:FN, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 18px #FE500044' }}>
              <QrCode size={18} />
              Escáner QR
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={async () => {
              setDrawerOpen(false)
              await getSupabase().auth.signOut()
              setView('home')
            }}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 20px', background:'transparent', border:'none', borderTop:`1px solid ${C.rim}`, color:C.dust, fontSize:13, fontFamily:FN, fontWeight:500, cursor:'pointer', width:'100%', textAlign:'left', transition:'color .15s' }}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      )}

      {/* ── MINI-RAIL COLAPSABLE (mobile) ── 5 items principales del MENU + hamburguesa.
          Por defecto colapsado: solo se ve una pestañita angosta al borde izquierdo.
          Tap en la pestaña → se expande con animación. Tap en un ítem → navega y se auto-colapsa.
          Primera vez que un usuario entra al panel hace un "peek" (se asoma 1.3s y se cierra)
          para que descubra que existe (flag persistido en localStorage). */}
      {isMobile && (() => {
        // Rail muestra TODAS las pestañas del MENU para evitar confusión.
        // Si en pantallas chicas no entran, el contenedor scrollea verticalmente.
        const RAIL_ITEMS  = MENU.map(m => m.id)
        const collapsedW  = 14   // ancho de la "pestaña" cuando está colapsado
        const expandedW   = 52   // ancho cuando está abierto
        const railW       = railExpanded ? expandedW : collapsedW
        const handleNav = (itemId, isLocked) => {
          if (isLocked) { setUpgradeModal('promotions'); setTab(itemId) } else setTab(itemId)
          setRailExpanded(false)
        }
        return (
          <>
            {/* Backdrop con blur — solo cuando está expandido. Click cierra el rail.
                inset:0 cubre toda la pantalla incluyendo el navbar para que la atención
                quede solo en el rail.
                Encima del backdrop va un coachmark "Tocá para ver" con manito animada,
                que guía al usuario para que descubra que tiene que tocar para destrabar. */}
            {railExpanded && (
              <>
                <div onClick={() => setRailExpanded(false)}
                  style={{ position:'fixed', inset:0, zIndex:198, background:'rgba(0,0,0,0.40)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', transition:'backdrop-filter 280ms ease, background 280ms ease' }} />
                <div style={{ position:'fixed', top:0, bottom:0, left:80, right:20, zIndex:199, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, textAlign:'center' }}>
                    <Hand size={44} color="rgba(255,255,255,0.92)" strokeWidth={1.6} style={{ animation:'rail-tap 1.4s ease-in-out infinite' }} />
                    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.92)', letterSpacing:'.08em', textTransform:'uppercase' }}>Tocá para ver</div>
                  </div>
                </div>
                <style>{`
                  @keyframes rail-tap {
                    0%, 100% { transform: scale(1) translateY(0) }
                    45%, 55% { transform: scale(0.86) translateY(3px) }
                  }
                `}</style>
              </>
            )}

            {/* ── Coachmark "Recordá que tocando esta solapa..." ──
                Aparece a los 5 segundos DESPUÉS de la primera vez que el user
                cierra el rail. Apunta hacia la solapa colapsada con un chevron.
                Una sola vez por user (localStorage). Tap en la X lo descarta. */}
            {showRailHint && !railExpanded && (
              <div style={{
                position:'fixed',
                left: 30, top: '50%', transform: 'translateY(-50%)',
                zIndex: 197,
                maxWidth: 'min(280px, calc(100vw - 60px))',
                background: 'linear-gradient(135deg, rgba(254,80,0,0.96), rgba(189,75,248,0.96))',
                borderRadius: 14,
                padding: '12px 14px 12px 12px',
                boxShadow: '0 14px 40px rgba(189,75,248,0.45), 0 0 0 1px rgba(255,255,255,0.10)',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                animation: 'rail-hint-in 380ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}>
                {/* Triángulo apuntando a la solapa (a la izquierda) */}
                <div style={{
                  position: 'absolute',
                  left: -7, top: '50%', transform: 'translateY(-50%)',
                  width: 0, height: 0,
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderRight: '8px solid #FE5000',
                }} />
                <ChevronLeft size={22} color="#fff" strokeWidth={2.6}
                  style={{ flexShrink:0, marginTop:1, animation:'rail-hint-arrow 1.2s ease-in-out infinite' }} />
                <div style={{ flex:1, fontFamily:FN, fontSize:12.5, fontWeight:600, color:'#fff', lineHeight:1.4, paddingTop:1 }}>
                  Recordá que tocando esta solapa podés acceder a todas las configuraciones.
                </div>
                <button onClick={dismissRailHint} aria-label="Cerrar"
                  style={{
                    flexShrink:0,
                    width:24, height:24, borderRadius:'50%',
                    background:'rgba(255,255,255,0.20)',
                    border:'none', color:'#fff',
                    cursor:'pointer', padding:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                  <X size={13} strokeWidth={2.5} />
                </button>
                <style>{`
                  @keyframes rail-hint-in {
                    from { opacity: 0; transform: translateY(-50%) translateX(-20px); }
                    to   { opacity: 1; transform: translateY(-50%) translateX(0); }
                  }
                  @keyframes rail-hint-arrow {
                    0%, 100% { transform: translateX(0); }
                    50%      { transform: translateX(-4px); }
                  }
                `}</style>
              </div>
            )}
            {/* Cuando el rail está COLAPSADO, no renderizamos el aside angosto
                de antes — la solapa fucsia (renderRailTab) lo reemplaza y se
                renderiza más abajo. El aside con los items solo aparece cuando
                el user ya expandió el rail tocando la solapa. */}
            {!railExpanded && renderRailTab(() => setRailExpanded(true))}
            {railExpanded && (
              <aside className="liquid-glass-strong"
                style={{
                  position:'fixed', top:70, bottom:14, left:8, width:expandedW, zIndex:199,
                  borderRadius: 14,
                  overflow:'hidden',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'8px 6px',
                  boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
                  cursor:'default',
                  transition:'box-shadow 280ms ease',
                }}>

                {/* Items del rail — solo visibles cuando expandido (fade-in para evitar squishing al colapsar).
                    Contenedor con scroll vertical para que en pantallas chicas se puedan ver todas
                    las pestañas sin tener que abrir el drawer. */}
                <>
                  <div className="rail-scroll" style={{
                    flex:1, width:'100%',
                    overflowY:'auto', overflowX:'hidden',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                    paddingTop:2, paddingBottom:2,
                    // Hide scrollbar visually but keep functionality
                    scrollbarWidth:'thin',
                    scrollbarColor:'rgba(255,255,255,0.18) transparent',
                  }}>
                    {RAIL_ITEMS.map(itemId => {
                      const item        = MENU.find(m => m.id === itemId)
                      if (!item) return null
                      const I           = MENU_ICONS[item.id]
                      const active      = tab === item.id
                      const isLocked    = item.locked
                      const isProLocked = item.pro && planKey !== 'pro'
                      const dimmed      = isLocked || isProLocked
                      return (
                        <button key={item.id} title={item.label}
                          onClick={e => { e.stopPropagation(); handleNav(item.id, isLocked) }}
                          style={{
                            position:'relative', zIndex:1, flexShrink:0,
                            width:40, height:40, borderRadius:10,
                            background: active ? G : 'transparent',
                            boxShadow: active ? '0 2px 10px rgba(168,85,247,0.42)' : 'none',
                            border:'none', cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            transition:'background 220ms ease, box-shadow 220ms ease',
                            opacity: dimmed ? 0.55 : 1,
                          }}>
                          {I && <I size={18} color={active ? '#fff' : 'rgba(255,255,255,0.70)'} strokeWidth={2} />}
                          {isProLocked && (
                            <span style={{ position:'absolute', top:-2, right:-2, fontSize:7, fontWeight:800, color:'#fff', background:PLANS.pro.color, borderRadius:99, padding:'1px 4px', fontFamily:FN, letterSpacing:'.04em' }}>PRO</span>
                          )}
                          {isLocked && !isProLocked && (
                            <Lock size={9} color={C.dust} strokeWidth={2.5} style={{ position:'absolute', top:2, right:2 }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {/* Hamburguesa al fondo — abre drawer con info del comercio + scanner + logout.
                      Ya no es para "ver más pestañas" porque todas están arriba; ahora es solo
                      acceso a las acciones extra (perfil del local, escáner, cerrar sesión). */}
                  <button title="Más opciones"
                    onClick={e => { e.stopPropagation(); setDrawerOpen(true); setRailExpanded(false) }}
                    style={{
                      flexShrink:0,
                      position:'relative', zIndex:1,
                      width:40, height:40, borderRadius:10,
                      background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`,
                      cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      marginTop:6,
                    }}>
                    <Menu size={18} color="rgba(255,255,255,0.85)" strokeWidth={2} />
                  </button>
                </>
              </aside>
            )}
          </>
        )
      })()}

      {/* ── CONTENIDO ── */}
      <div style={{ flex:1, padding: isMobile ? '20px 16px 80px 30px' : '28px 28px 80px', overflowY:'auto', maxWidth:720 }}>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div>
            <DynamicGreeting name={commerce.name} type="commerce" style={{ marginBottom:4 }} />
            <div style={{ fontSize:12, color:C.mist, marginBottom:18 }}>Así va tu negocio hoy.</div>

            <HelpBanner
              id="merchant-dashboard"
              title="Tu panel de control"
              body="Resumen del día + accesos rápidos. Las secciones del panel viven en el menú lateral."
              details={<>
                Tocá la <strong style={{ color:'#fff' }}>solapa angosta del lado izquierdo</strong> para abrir el menú con todas las secciones: clientes, recompensas, premios, mensajes, análisis, historial, configuración y planes.<br/><br/>
                Si querés volver a la pantalla inicial con los dos botones grandes ("Sumar nuevo cliente" / "Registrar compra"), tocá el ícono <strong style={{ color:'#fff' }}>Mi Negocio</strong> del navbar de arriba.
              </>}
            />

            {/* Banner de completitud del perfil — solo si está incompleto.
                Lleva al tab Configuración. Le mete presión al dueño desde dashboard. */}
            {(() => {
              const checks = [
                !!commerce.img_url,
                !!commerce.cover_image,
                !!form?.description,
                !!form?.phone,
                !!form?.address,
                !!(form?.instagram || form?.facebook),
                !!(hoursForm && Object.values(hoursForm).some(d => d.open)),
              ]
              const done  = checks.filter(Boolean).length
              const total = checks.length
              const pct   = Math.round(done / total * 100)
              if (pct === 100) return null
              return (
                <button onClick={() => setTab('configuracion')}
                  style={{
                    display:'flex', alignItems:'center', gap:14,
                    padding:'13px 16px', marginBottom:16,
                    width:'100%', textAlign:'left', cursor:'pointer',
                    background:'linear-gradient(135deg, rgba(254,80,0,0.16) 0%, rgba(189,75,248,0.20) 100%)',
                    border:'1px solid rgba(189,75,248,0.32)', borderRadius:14,
                  }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.white, fontFamily:FN, marginBottom:3 }}>
                      Tu perfil está al {pct}%
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.65)', marginBottom:7 }}>
                      Completalo para que tus clientes te vean mejor.
                    </div>
                    <div style={{ height:4, background:'rgba(255,255,255,0.10)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:G, borderRadius:99, transition:'width 0.4s ease' }} />
                    </div>
                  </div>
                  <ChevronRight size={20} color="rgba(255,255,255,0.65)" strokeWidth={2.4} style={{ flexShrink:0 }} />
                </button>
              )
            })()}

            {/* Stats: fila compacta de 4 */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
              {[
                { label:'Clientes',  val: members.length                    },
                { label:'Visitas',   val: dashStats?.monthVisits ?? '–'     },
                { label:'Activos',   val: dashStats?.activeThisWeek ?? '–'  },
                { label:'Premios',   val: prizes.filter(p=>p.active).length },
              ].map(s => (
                <div key={s.label} style={{ background:C.card, border:`1px solid ${C.rim}`, borderRadius:14, padding:'12px 8px', textAlign:'center' }}>
                  <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, lineHeight:1.1 }}>{s.val}</div>
                  <div style={{ fontSize:10, color:C.mist, marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Alerta clientes cerca de premio */}
            {nearPrize.length > 0 && (
              <div style={{ padding:'12px 14px', marginBottom:14, border:`1px solid ${C.o}44`, background:`${C.o}0F`, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                  <Bell size={14} color={C.o} strokeWidth={2} style={{ flexShrink:0 }} />
                  <span style={{ fontSize:12, color:C.o, fontWeight:600 }}>
                    {nearPrize.length} cliente{nearPrize.length>1?'s':''} a punto de canjear
                  </span>
                </div>
                <button onClick={() => setTab('clientes')} style={{ background:'transparent', border:'none', color:C.o, fontSize:11, cursor:'pointer', fontWeight:700, flexShrink:0 }}>Ver →</button>
              </div>
            )}

            {/* QR del negocio — protagonista */}
            <CommerceQRCard commerce={commerce} />

            {/* Tira de info: plan · sistema · promos */}
            <PCard style={{ padding:'14px 16px', marginTop:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:0, flexWrap:'wrap' }}>

                {/* Plan + barra */}
                <div style={{ flex:'1 1 0', minWidth:0, paddingRight:14, borderRight:`1px solid ${C.rim}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom: planDef.limit !== null ? 6 : 0 }}>
                    <span style={{ fontFamily:FN, fontSize:10, fontWeight:700, color:planDef.color, background:planDef.badge, padding:'2px 7px', borderRadius:6, letterSpacing:'.07em', flexShrink:0 }}>{planDef.label}</span>
                    {planKey !== 'pro' && (
                      <button onClick={() => setTab('configuracion')} style={{ background:'transparent', border:'none', color:C.dust, fontSize:10, cursor:'pointer', fontWeight:600, padding:0 }}>cambiar →</button>
                    )}
                  </div>
                  {planDef.limit !== null ? (
                    <>
                      <div style={{ height:3, borderRadius:3, background:C.rim, overflow:'hidden', marginBottom:3 }}>
                        <div style={{ height:'100%', width:`${Math.min(100,(clientCount/planDef.limit)*100)}%`, background: atLimit ? '#f87444' : nearLimit ? C.o : planDef.color, borderRadius:3, transition:'width .4s' }} />
                      </div>
                      <div style={{ fontSize:10, color: atLimit ? '#f87444' : nearLimit ? C.o : C.dust }}>
                        {clientCount}/{planDef.limit} clientes
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize:10, color:C.dust }}>{clientCount} · ilimitados</div>
                  )}
                </div>

                {/* Sistema */}
                <div style={{ flex:'1 1 0', minWidth:0, padding:'0 14px', borderRight:`1px solid ${C.rim}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    {form?.prog_type === 'stars'
                      ? <Star size={13} color={unitColor} strokeWidth={0} fill={unitColor} />
                      : <Gem  size={13} color={unitColor} strokeWidth={2} />
                    }
                    <span style={{ fontFamily:FN, fontSize:12, fontWeight:700, color:C.white }}>{unitLabel.charAt(0).toUpperCase()+unitLabel.slice(1)}</span>
                  </div>
                  <div style={{ fontSize:10, color:C.dust }}>
                    {activePrizes.length} premio{activePrizes.length!==1?'s':''} activos
                  </div>
                </div>

                {/* Promos */}
                <div style={{ flex:'1 1 0', minWidth:0, paddingLeft:14 }}>
                  <button onClick={() => setTab('recompensas')} style={{ background:'transparent', border:'none', padding:0, cursor:'pointer', textAlign:'left', width:'100%' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <Flame size={13} color={promos.filter(p=>p.active).length > 0 ? C.o : C.dust} strokeWidth={2} />
                      <span style={{ fontFamily:FN, fontSize:12, fontWeight:700, color: promos.filter(p=>p.active).length > 0 ? C.white : C.mist }}>
                        {promos.filter(p=>p.active).length} promos
                      </span>
                    </div>
                    <div style={{ fontSize:10, color:C.v }}>gestionar →</div>
                  </button>
                </div>

              </div>

              {/* Warning de límite */}
              {atLimit && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.rim}`, display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:11, color:'#f87444', flex:1 }}>Límite alcanzado. No podés sumar más clientes.</span>
                  <button onClick={() => setUpgradeModal('clients')} style={{ background:GV, border:'none', borderRadius:8, padding:'6px 12px', color:'#fff', fontFamily:FN, fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', gap:4 }}>
                    <Zap size={11} strokeWidth={2} /> Mejorar
                  </button>
                </div>
              )}
              {nearLimit && !atLimit && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.rim}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                  <span style={{ fontSize:11, color:C.o }}>Cerca del límite ({clientCount}/{planDef.limit})</span>
                  <button onClick={() => setUpgradeModal('clients')} style={{ background:'transparent', border:`1px solid ${C.o}`, borderRadius:8, padding:'4px 10px', color:C.o, fontFamily:FN, fontSize:10, fontWeight:700, cursor:'pointer', flexShrink:0 }}>Actualizar</button>
                </div>
              )}
            </PCard>

            {/* Canjes recientes */}
            {recentCanjes.length > 0 && (
              <PCard style={{ padding:16, marginTop:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Gift size={15} color={C.ok} strokeWidth={2} />
                    <span style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>Canjes recientes</span>
                  </div>
                  <button onClick={() => setTab('historial')} style={{ background:'transparent', border:'none', color:C.v, fontSize:11, cursor:'pointer', fontWeight:600 }}>Ver todos →</button>
                </div>
                {recentCanjes.map(r => {
                  // kind='discount' → cliente usó un cupón discount_next.
                  // kind='prize' (default) → canje del catálogo de premios.
                  const isDiscount = r.kind === 'discount'
                  const discountVal = r.discount_value ?? r.promotion?.value
                  const itemLabel = isDiscount
                    ? `Descuento ${discountVal ? discountVal + '% OFF' : 'aplicado'}`
                    : (r.prize?.name || '–')
                  const Icon = isDiscount ? Percent : Gift
                  const tagColor = isDiscount ? C.o : C.ok
                  return (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${C.rim}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:`${tagColor}18`, border:`1px solid ${tagColor}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Icon size={13} color={tagColor} strokeWidth={2} />
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:12, color:C.pearl, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {r.user?.name || r.user?.full_name || 'Cliente'}
                          </div>
                          <div style={{ fontSize:10, color:C.dust }}>{itemLabel}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:8 }}>
                        {isDiscount ? (
                          <div style={{ fontSize:11, color:C.o, fontWeight:700 }}>{discountVal ? `${discountVal}%` : 'OFF'}</div>
                        ) : (
                          <div style={{ fontSize:11, color:'#f87444', fontWeight:700 }}>−{r.points_spent}</div>
                        )}
                        <div style={{ fontSize:9, color:C.dust }}>
                          {new Date(r.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'short' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </PCard>
            )}
          </div>
        )}

        {/* ── CLIENTES ── */}
        {tab === 'clientes' && (() => {
          const _helpClientes = (
            <HelpBanner
              id="merchant-clientes"
              title="Tus clientes"
              body="Cada vez que alguien escanea tu QR queda anotado acá."
              details={<>
                Podés <strong style={{ color:'#fff' }}>buscar</strong> por nombre, email o teléfono, <strong style={{ color:'#fff' }}>ordenar la lista</strong> (por última visita, nombre, balance o fecha de alta), <strong style={{ color:'#fff' }}>abrir la ficha</strong> de cada cliente para ver su actividad detallada y <strong style={{ color:'#fff' }}>otorgarle un beneficio manualmente</strong> (ej: regalarle un cupón de descuento desde tus promos vigentes).<br/><br/>
                Mientras más clientes y visitas tengas, más detalle vas a ver — el sistema va aprendiendo quién viene mucho, quién se enfrió y dónde está tu mejor oportunidad.
              </>}
            />
          )
          const sysColor = form?.prog_type === 'stars' ? '#8B5CF6' : '#EC4899'
          const isStars  = form?.prog_type === 'stars'
          const norm     = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
          const q        = norm(memberSearch.trim())
          const hasClients = members.length > 0
          const clubUrl  = typeof window !== 'undefined' ? `${window.location.origin}/club/${commerce?.slug}` : ''

          const filtered = q
            ? members.filter(m =>
                norm((m.profiles?.display_name || m.profiles?.full_name || m.profiles?.name)).includes(q) ||
                norm(m.profiles?.email).includes(q) ||
                norm(m.profiles?.phone).includes(q)
              )
            : members

          const sorted = [...filtered].sort((a,b) => {
            if (memberSort === 'name')   return ((a.profiles?.display_name || a.profiles?.full_name || a.profiles?.name)||'').localeCompare((b.profiles?.display_name || b.profiles?.full_name || b.profiles?.name)||'','es')
            if (memberSort === 'points') return (isStars?(b.stars||0):(b.points||0)) - (isStars?(a.stars||0):(a.points||0))
            if (memberSort === 'joined') return new Date(b.joined_at||0) - new Date(a.joined_at||0)
            return new Date(b.last_visit||0) - new Date(a.last_visit||0)
          })

          return (
            <div style={{ position:'relative', paddingBottom: hasClients && isMobile ? 84 : 0 }}
              onClick={() => openMenuId && setOpenMenuId(null)}>

              {_helpClientes}

              {/* Header */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom: hasClients ? 4 : 0 }}>
                <div>
                  <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, letterSpacing:'.08em', textTransform:'uppercase' }}>Clientes</div>
                  {hasClients && (
                    <div style={{ fontSize:12, color:C.mist, marginTop:2 }}>
                      {clientCount === 1 ? '1 cliente registrado' : `${clientCount} clientes registrados`}
                      {planDef.limit !== null && <span style={{ color: atLimit?'#f87444':nearLimit?C.o:C.dust }}> · {clientCount}/{planDef.limit} del plan {planDef.label}</span>}
                    </div>
                  )}
                </div>
                {hasClients && !isMobile && (
                  <button onClick={e => { e.stopPropagation(); setShowAddMemberModal(true) }}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:`${C.v}22`, border:`1px solid ${C.v}55`, borderRadius:10, color:C.v, fontFamily:FN, fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                    <Plus size={14} strokeWidth={2.5} /> Agregar cliente
                  </button>
                )}
              </div>

              {/* Banners de límite */}
              {atLimit && (
                <div style={{ marginTop:12, marginBottom:4 }}>
                  <InfoBanner type="limit" icon={Users}
                    action={
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <button onClick={() => setUpgradeModal('clients')} style={{ background:GV, border:'none', borderRadius:9, padding:'8px 18px', color:'#fff', fontFamily:FN, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                          <Zap size={12} strokeWidth={2} /> Pasar a STARTER
                        </button>
                        <button onClick={() => setTab('configuracion')} style={{ background:'transparent', border:`1px solid rgba(189,75,248,0.30)`, borderRadius:9, padding:'8px 16px', color:C.mist, fontFamily:FN, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                          Ver planes
                        </button>
                      </div>
                    }>
                    <strong style={{ fontWeight:700 }}>Alcanzaste el límite de clientes.</strong> Actualizá tu plan para seguir agregando más.
                  </InfoBanner>
                </div>
              )}
              {nearLimit && !atLimit && (
                <div style={{ marginTop:12, marginBottom:4 }}>
                  <InfoBanner type="warning" icon={AlertTriangle}
                    action={
                      <button onClick={() => setUpgradeModal('clients')} style={{ background:'transparent', border:`1px solid ${C.o}`, borderRadius:9, padding:'6px 14px', color:C.o, fontFamily:FN, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        Actualizar plan
                      </button>
                    }>
                    Te quedan pocos lugares: <strong style={{ fontWeight:700 }}>{clientCount}/{planDef.limit}</strong> del plan {planDef.label}.
                  </InfoBanner>
                </div>
              )}

              {/* ── ESTADO A: sin clientes ── */}
              {!hasClients && (
                <div style={{ textAlign:'center', padding:'44px 16px 24px' }}>
                  <div style={{ width:72, height:72, borderRadius:'50%', background:`${C.v}1A`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                    <Users size={34} color={C.v} strokeWidth={1.5} />
                  </div>
                  <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:C.white, marginBottom:8 }}>Todavía no tenés clientes</div>
                  <div style={{ fontSize:13, color:C.mist, lineHeight:1.7, maxWidth:280, margin:'0 auto 28px' }}>
                    Mostrales tu QR en el local para que se sumen a tu club.
                  </div>
                  <GBtn onClick={() => setShowQrModal(true)} style={{ justifyContent:'center', marginBottom:14, gap:7 }}>
                    <QrCode size={15} strokeWidth={2} /> Mostrar mi QR
                  </GBtn>
                  <button onClick={e => { e.stopPropagation(); setShowAddMemberModal(true) }}
                    style={{ background:'none', border:'none', color:C.dust, fontSize:12, cursor:'pointer', textDecoration:'underline', display:'block', margin:'0 auto' }}>
                    Agregar cliente manualmente
                  </button>
                </div>
              )}

              {/* ── ESTADO B: con clientes ── */}
              {hasClients && (
                <>
                  {/* Buscador + orden */}
                  <div style={{ display:'flex', gap:8, marginTop:16, marginBottom:12 }}>
                    <div style={{ position:'relative', flex:1 }}>
                      <Search size={14} color={C.dust} strokeWidth={2} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                      <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                        placeholder="Nombre, email o teléfono..."
                        style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'10px 12px 10px 34px', fontSize:12, color:C.pearl, outline:'none', boxSizing:'border-box' }} />
                      {memberSearch && (
                        <button onClick={() => setMemberSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:C.dust, fontSize:13, cursor:'pointer' }}>✕</button>
                      )}
                    </div>
                    <select value={memberSort} onChange={e => setMemberSort(e.target.value)}
                      style={{ background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'0 10px', fontSize:11, color:C.pearl, cursor:'pointer', flexShrink:0, appearance:'none', minWidth:118 }}>
                      <option value="last_visit">Última visita</option>
                      <option value="name">Nombre A-Z</option>
                      <option value="points">{isStars ? 'Más estrellas' : 'Más puntos'}</option>
                      <option value="joined">Más recientes</option>
                    </select>
                  </div>

                  {/* ESTADO C: búsqueda sin resultados */}
                  {sorted.length === 0 && q && (
                    <div style={{ textAlign:'center', padding:'24px 0' }}>
                      <div style={{ fontSize:13, color:C.dust, marginBottom:8 }}>Sin resultados para "{memberSearch}".</div>
                      <button onClick={() => setMemberSearch('')} style={{ background:'none', border:'none', color:C.v, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>Limpiar búsqueda</button>
                    </div>
                  )}

                  {/* Lista */}
                  {sorted.map(m => {
                    const name      = (m.profiles?.display_name || m.profiles?.full_name || m.profiles?.name) || 'Cliente'
                    const phone     = m.profiles?.phone || ''
                    const val       = isStars ? (m.stars||0) : (m.points||0)
                    const lastVisit = m.last_visit ? new Date(m.last_visit).toLocaleDateString('es-AR',{day:'2-digit',month:'short'}) : '–'
                    const isNew     = m.joined_at && (Date.now() - new Date(m.joined_at)) < 48*3600*1000
                    const menuOpen  = openMenuId === m.id
                    return (
                      <div key={m.id} style={{ position:'relative', marginBottom:8 }} onClick={e => e.stopPropagation()}>
                        {/* Wrapper clickeable como botón pero con <div> para poder anidar el botón del menú contextual (HTML no permite button dentro de button). */}
                        <div role="button" tabIndex={0}
                          onClick={() => viewMember(m)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); viewMember(m) } }}
                          style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:C.card, border:`1px solid ${C.rim}`, borderRadius:14, cursor:'pointer', textAlign:'left' }}>
                          {/* Avatar */}
                          <div style={{ width:40, height:40, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FN, fontSize:16, fontWeight:900, background:`${sysColor}22`, color:sysColor }}>
                            {name[0]?.toUpperCase()}
                          </div>
                          {/* Info */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                              <span style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                              {isNew && <span style={{ fontSize:8, fontWeight:700, color:sysColor, background:`${sysColor}22`, borderRadius:8, padding:'2px 6px', flexShrink:0, letterSpacing:'.05em' }}>NUEVO</span>}
                            </div>
                            {phone && <div style={{ fontSize:11, color:C.mist, marginBottom:3 }}>{phone}</div>}
                            <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:C.dust }}>
                              {isStars
                                ? <Star size={10} color={sysColor} strokeWidth={2} style={{ flexShrink:0 }} />
                                : <Gem  size={10} color={sysColor} strokeWidth={2} style={{ flexShrink:0 }} />}
                              <span style={{ color:sysColor, fontWeight:600 }}>{val}</span>
                              <span>{unitLabel}</span>
                              <span>·</span>
                              <span>{lastVisit}</span>
                            </div>
                          </div>
                          {/* Botón directo de WhatsApp — atajo al menú contextual */}
                          {phone && (
                            <button onClick={e => {
                              e.stopPropagation()
                              const msg = `¡Hola ${name.split(' ')[0]}! Te invito a unirte al club de ${commerce?.name} en Benefix. Acumulá ${unitLabel} y canjeá recompensas\n\n${clubUrl}`
                              window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank')
                            }}
                            aria-label="Enviar WhatsApp"
                            title="Enviar WhatsApp"
                            style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.30)', color:'#25D366', cursor:'pointer', flexShrink:0, padding:0 }}>
                              <MessageCircle size={14} strokeWidth={2} />
                            </button>
                          )}
                          {/* Trigger menú contextual */}
                          <button onClick={e => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : m.id) }}
                            aria-label="Opciones"
                            style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', color:C.dust, cursor:'pointer', flexShrink:0 }}>
                            <MoreHorizontal size={16} strokeWidth={2} />
                          </button>
                        </div>
                        {/* Dropdown */}
                        {menuOpen && (
                          <div style={{ position:'absolute', right:8, top:'calc(100% - 4px)', zIndex:50, background:'rgba(13,8,24,0.97)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:`1px solid ${C.rim}`, borderRadius:12, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.5)', minWidth:168 }}>
                            {[
                              { label:'Ver detalle', Icon:User,  action: () => viewMember(m) },
                              { label:'Enviar WhatsApp', Icon:Phone, action: () => {
                                const msg = `¡Hola ${name.split(' ')[0]}! Te invito a unirte al club de ${commerce?.name} en Benefix. Acumulá ${unitLabel} y canjeá recompensas 🎁\n\n${clubUrl}`
                                window.open(phone ? `https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                              }},
                            ].map(item => (
                              <button key={item.label} onClick={e => { e.stopPropagation(); setOpenMenuId(null); item.action() }}
                                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', color:C.pearl, fontSize:12, fontFamily:FN, cursor:'pointer', textAlign:'left' }}
                                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.07)'}
                                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                <item.Icon size={13} strokeWidth={2} /> {item.label}
                              </button>
                            ))}
                            <div style={{ height:1, background:C.rim }} />
                            <button onClick={async e => {
                              e.stopPropagation(); setOpenMenuId(null)
                              const ok = await showConfirm({ title:'¿Eliminar cliente?', message:`Se eliminará a ${name} del club. Su historial se conserva en la base de datos.`, confirmText:'Eliminar', cancelText:'Cancelar', danger:true })
                              if (!ok) return
                              await supabase.from('memberships').delete().eq('id', m.id)
                              setMembers(ms => ms.filter(mb => mb.id !== m.id))
                              showToast('success', `${name} eliminado del club.`)
                            }}
                              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', color:'#f87444', fontSize:12, fontFamily:FN, cursor:'pointer', textAlign:'left' }}
                              onMouseEnter={e => e.currentTarget.style.background='rgba(248,116,68,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                              <Trash2 size={13} strokeWidth={2} /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}

              {/* FAB mobile */}
              {hasClients && isMobile && (
                <button onClick={e => { e.stopPropagation(); setShowAddMemberModal(true) }}
                  style={{ position:'fixed', bottom:24, right:20, width:52, height:52, borderRadius:'50%', background:GV, border:'none', color:'#fff', cursor:'pointer', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(168,85,247,0.5)' }}>
                  <Plus size={22} strokeWidth={2.5} />
                </button>
              )}

              {/* Modal: agregar cliente */}
              {showAddMemberModal && (
                <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}
                  onClick={() => { if (!addingMember) { setShowAddMemberModal(false); setMemberError('') } }}>
                  <div style={{ background:C.card, border:`1px solid ${C.rim}`, borderTop:`2px solid ${C.v}`, borderRadius:'20px 20px 0 0', padding:'24px 20px 32px', width:'100%', maxWidth:520, maxHeight:'92vh', overflowY:'auto' }}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                      <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white }}>Agregar cliente</div>
                      <button onClick={() => { setShowAddMemberModal(false); setMemberError('') }} style={{ background:'transparent', border:'none', color:C.dust, cursor:'pointer', display:'flex' }}><X size={18} /></button>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <div>
                        <div style={{ fontSize:10, color:C.dust, marginBottom:5, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>Nombre completo <span style={{ color:'#f87444' }}>*</span></div>
                        <input type="text" value={newMember.full_name} onChange={e => setNewMember(m=>({...m,full_name:e.target.value}))} placeholder="Juan García"
                          style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'11px 13px', fontSize:13, color:C.pearl, boxSizing:'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize:10, color:C.dust, marginBottom:5, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>Teléfono / WhatsApp <span style={{ color:'#f87444' }}>*</span></div>
                        <PhoneInput
                          value={newMember.phone}
                          onChange={v => setNewMember(m => ({ ...m, phone: v }))}
                          size="sm"
                          hint={false}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize:10, color:C.dust, marginBottom:5, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>Email <span style={{ color:C.rim, fontWeight:400 }}>(opcional)</span></div>
                        <input type="email" value={newMember.email} onChange={e => setNewMember(m=>({...m,email:e.target.value}))} placeholder="juan@ejemplo.com"
                          style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'11px 13px', fontSize:13, color:C.pearl, boxSizing:'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize:10, color:C.dust, marginBottom:5, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>Provincia <span style={{ color:C.rim, fontWeight:400 }}>(opcional)</span></div>
                        <select value={newMember.province||''} onChange={e => setNewMember(m=>({...m, province:e.target.value, locality:''}))}
                          style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'11px 13px', fontSize:13, color: newMember.province ? C.pearl : C.dust, cursor:'pointer', appearance:'none', boxSizing:'border-box' }}>
                          <option value="">Seleccionar provincia...</option>
                          {Object.keys(ARGENTINA_PROVINCES).sort().map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize:10, color:C.dust, marginBottom:5, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>Localidad <span style={{ color:C.rim, fontWeight:400 }}>(opcional)</span></div>
                        {(() => {
                          const locOptions = ARGENTINA_PROVINCES[newMember.province] || []
                          return locOptions.length > 0 ? (
                            <select value={newMember.locality||''} onChange={e => setNewMember(m=>({...m, locality:e.target.value}))}
                              style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'11px 13px', fontSize:13, color: newMember.locality ? C.pearl : C.dust, cursor:'pointer', appearance:'none', boxSizing:'border-box' }}>
                              <option value="">Seleccionar localidad...</option>
                              {locOptions.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                              ))}
                            </select>
                          ) : (
                            <div style={{ fontSize:12, color:C.dust, padding:'10px 13px', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10 }}>
                              {newMember.province ? 'No hay localidades disponibles para esta provincia.' : 'Seleccioná una provincia primero.'}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                    {memberError && <div style={{ fontSize:11, color:'#f87444', marginTop:10 }}>{memberError}</div>}
                    <div style={{ display:'flex', gap:10, marginTop:20 }}>
                      <button onClick={() => { setShowAddMemberModal(false); setMemberError('') }}
                        style={{ flex:1, padding:'12px', background:'transparent', border:`1px solid ${C.rim}`, borderRadius:12, color:C.mist, fontFamily:FN, fontSize:13, cursor:'pointer' }}>Cancelar</button>
                      <GBtn onClick={addMemberManually} disabled={addingMember} style={{ flex:1, justifyContent:'center' }}>
                        {addingMember ? '⟳ Agregando...' : 'Agregar cliente'}
                      </GBtn>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal: QR */}
              {showQrModal && (() => {
                const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${commerce?.slug || commerce?.id || ''}`
                return (
                  <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
                    onClick={() => setShowQrModal(false)}>
                    <div style={{ background:C.card, border:`1px solid ${C.rim}`, borderRadius:20, padding:28, maxWidth:340, width:'100%', textAlign:'center' }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, marginBottom:4 }}>Tu QR</div>
                      <div style={{ fontSize:12, color:C.mist, marginBottom:20 }}>{commerce?.name}</div>
                      <div style={{ display:'inline-flex', background:'#ffffff', borderRadius:16, padding:16, marginBottom:16 }}>
                        <QRCodeSVG value={joinUrl} size={260} bgColor="#ffffff" fgColor="#000000" level="M" />
                      </div>
                      <div style={{ fontSize:12, color:C.dust, lineHeight:1.6, marginBottom:20 }}>
                        Mostrá este código a tus clientes para que se sumen a tu club.
                      </div>
                      <button onClick={() => setShowQrModal(false)}
                        style={{ width:'100%', padding:'12px', background:'transparent', border:`1px solid ${C.rim}`, borderRadius:12, color:C.mist, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                        Cerrar
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })()}

        {/* ── RECOMPENSAS — pestaña unificada con 3 secciones ── */}
        {savingSystem && <FullscreenLoader message="Actualizando sistema..." />}

        {tab === 'recompensas' && (
          <HelpBanner
            id="merchant-recompensas"
            title="Cómo recompensás"
            body="Elegís el sistema (estrellas o puntos), cargás los premios y sumás promos."
            details={<>
              Todo lo que configures se ve reflejado en la <strong style={{ color:'#fff' }}>tarjeta digital</strong> de tus clientes al instante. El sistema base puede ser <strong style={{ color:'#fff' }}>estrellas</strong> (1 estrella por compra, simple) o <strong style={{ color:'#fff' }}>puntos</strong> (1 punto = 1 peso, flexible para tickets variables).<br/><br/>
              Las <strong style={{ color:'#fff' }}>promociones extra</strong> (cupón de descuento próxima visita, días con doble suma) están disponibles desde el plan STARTER en adelante.
            </>}
          />
        )}

        {/* Botón "← Volver a previsualización pública" cuando el dueño llegó desde
            el preview público (ej: tocó el lápiz del banner de descuento). */}
        {tab === 'recompensas' && typeof window !== 'undefined' && localStorage.getItem('benefix:cameFromPreview') === '1' && (
          <button onClick={() => {
            try { localStorage.removeItem('benefix:cameFromPreview') } catch {}
            onOwnerProfile?.()
          }}
            style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:14, padding:'6px 12px 6px 8px', background:'rgba(189,75,248,0.10)', border:'1px solid rgba(189,75,248,0.30)', borderRadius:99, color:'#BD4BF8', fontFamily:FN, fontSize:11.5, fontWeight:700, cursor:'pointer' }}>
            <ArrowLeft size={13} strokeWidth={2.5} /> Volver a previsualización
          </button>
        )}

        {/* Header global — mini diagrama "QR → 🎁" en lugar de subtítulo
            largo. Cuenta toda la historia (escanea y recibe) con dos íconos.
            La sección "TU SISTEMA BASE" también queda absorbida: las cards
            de abajo se autoexplican.
            El color del regalo sigue al sistema seleccionado (preview o
            guardado), así si previsualizás Puntos ves el regalo en fucsia. */}
        {tab === 'recompensas' && (
          <div style={{
            background:'rgba(255,255,255,0.025)',
            border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:16,
            padding:'18px 16px 16px',
            marginBottom:14,
          }}>
        {(() => {
          const headerType = pendingSystemType ?? commerce?.prog_type ?? 'stars'
          const headerCol  = headerType === 'points' ? '#EC4899' : '#8B5CF6'
          return (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <QrCode size={17} color={C.mist} strokeWidth={2} />
                </div>
                <ArrowRight size={13} color={C.dust} strokeWidth={2.5} />
                <div style={{ width:34, height:34, borderRadius:9, background:`${headerCol}1F`, border:`1px solid ${headerCol}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Gift size={17} color={headerCol} strokeWidth={2} />
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, letterSpacing:'.08em', textTransform:'uppercase' }}>Recompensas por compra</div>
                <InfoHint align="left" text={
                  'Es el sistema base con el que tus clientes acumulan recompensas al escanear su QR.\n\n' +
                  '• Estrellas: 1 estrella por compra. Simple, ideal para tickets parecidos.\n\n' +
                  '• Puntos: 1 punto por cada peso gastado. Flexible para tickets variables.\n\n' +
                  'Podés cambiar de sistema cuando quieras. Si lo hacés, los premios viejos quedan pausados y vuelves a cargarlos en el sistema nuevo.'
                } />
              </div>
              {/* Chip FREE — para que se lea con el mismo lenguaje que el resto
                  de las secciones: título arriba, badge de plan abajo. */}
              <div style={{ display:'flex', gap:6, marginTop:8 }}>
                <span style={{ fontSize:9, fontWeight:700, color:PLANS.free.color, background:`${PLANS.free.color}22`, borderRadius:99, padding:'2px 8px', fontFamily:FN, letterSpacing:'.06em' }}>FREE</span>
              </div>
            </div>
          )
        })()}

        {(() => {
          const SYSTEMS = [
            { id:'stars',  Icon:Star, label:'Estrellas', color:'#8B5CF6', colorDark:'#7C3AED',
              desc:'1 estrella por compra. Simple y visual.' },
            { id:'points', Icon:Gem,  label:'Puntos',    color:'#EC4899', colorDark:'#DB2777',
              desc:'1 punto por cada peso gastado. Flexible para ticket variable.' },
          ]
          const savedType        = commerce?.prog_type || 'stars'
          // displayType: lo que se ve activo en el UI (preview o saved).
          // El usuario puede tocar las flechitas para cambiar el preview sin
          // committear nada; sólo "Guardar cambios" persiste el cambio.
          const currentType      = pendingSystemType ?? savedType
          const activeSys        = SYSTEMS.find(s => s.id === currentType)
          const hasPendingChange = pendingSystemType !== null && pendingSystemType !== savedType
          const activePrizeCount = prizes.filter(p => p.active).length
          // Premios cargados con la modalidad del sistema actualmente
          // mostrado (currentType). Si el premio no tiene system_type (legacy),
          // cae al prog_type guardado para no romper.
          const systemPrizeCount = prizes.filter(p =>
            (p.system_type || savedType) === currentType
          ).length
          const prefersReduced   = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

          return (
            <div>
              {/* h2 "Fidelización" + subtítulo eliminados — el section header
                  arriba ya dice "Tu sistema base". Las cards siguientes son
                  autoexplicativas con su mecánica en una línea. */}

              {/* ── Layout final: card inactiva sola arriba, conector ⇅, y un
                  contenedor único englobando la card activa + sus campos de
                  edición (compra mínima/regla + cargar premios). El borde
                  exterior del contenedor toma el color del sistema activo
                  para visualmente decir "esto es un solo sistema". ── */}
              {(() => {
                const inactiveSys = SYSTEMS.find(s => s.id !== currentType)
                const renderCard = (sys, isActive) => (
                  <div
                    onClick={() => { if (!isActive) setPendingSystemType(sys.id) }}
                    role={!isActive ? 'button' : undefined}
                    tabIndex={!isActive ? 0 : undefined}
                    onKeyDown={!isActive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPendingSystemType(sys.id) } } : undefined}
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${sys.color}CC, ${sys.colorDark}EE)`
                        : `linear-gradient(145deg, ${sys.color}10, ${sys.color}05)`,
                      border:`1px solid ${isActive ? `${sys.color}60` : `${sys.color}26`}`,
                      borderRadius:14, padding:'14px',
                      textAlign:'left', position:'relative',
                      boxShadow: isActive
                        ? `0 8px 24px -6px ${sys.color}55, inset 0 1px 0 rgba(255,255,255,0.20)`
                        : 'none',
                      transition: prefersReduced ? 'none' : 'border-color .15s ease, opacity .15s ease',
                      display:'flex', alignItems:'center', gap:12, fontFamily:'inherit',
                      width:'100%',
                      // Inactiva: clickeable como segundo disparador (además
                      // del ⇅). La activa no hace nada al clickear.
                      cursor: isActive ? 'default' : 'pointer',
                      opacity: isActive ? 1 : 0.92,
                    }}
                    onMouseEnter={!isActive ? (e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = `${sys.color}55` } : undefined}
                    onMouseLeave={!isActive ? (e) => { e.currentTarget.style.opacity = '0.92'; e.currentTarget.style.borderColor = `${sys.color}26` } : undefined}
                  >
                    {/* Ícono cuadrado */}
                    <div style={{ width:40, height:40, borderRadius:10, background: isActive ? 'rgba(255,255,255,0.22)' : `${sys.color}1F`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {(() => { const I = sys.Icon; return <I size={18} color={isActive ? '#fff' : sys.color} strokeWidth={1.8} /> })()}
                    </div>
                    {/* Nombre + descripción */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:FN, fontSize:14, fontWeight:800, color: isActive ? '#fff' : 'rgba(255,255,255,0.70)', marginBottom:2 }}>
                        {sys.label}
                      </div>
                      <div style={{ fontSize:11, color: isActive ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.40)', lineHeight:1.4 }}>
                        {sys.desc}
                      </div>
                    </div>
                    {/* Estado a la derecha — solo chip ACTIVO en la activa.
                        La inactiva no muestra CTA; el swap se hace con ⇅. */}
                    {isActive && (
                      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.22)', borderRadius:20, padding:'4px 9px' }}>
                        <Check size={10} strokeWidth={3} color="#fff" />
                        <span style={{ fontSize:9, fontWeight:700, color:'#fff', letterSpacing:'.08em', fontFamily:FN }}>ACTIVO</span>
                      </div>
                    )}
                  </div>
                )
                return (
                  <div style={{ marginBottom:14, position:'relative' }}>
                    {/* Card inactiva (arriba, sola) */}
                    {renderCard(inactiveSys, false)}

                    {/* Conector ⇅ — superpuesto sobre el borde entre ambas cards.
                        Margen negativo en el contenedor del botón colapsa el
                        espacio entre cards y deja que el botón flote sobre la
                        unión. Único disparador del cambio.
                        Las flechas hacen un loop sutil de rotación 180° que
                        sugiere que tocando se invierte el sistema. */}
                    <div style={{ display:'flex', justifyContent:'center', margin:'-18px 0', position:'relative', zIndex:5, pointerEvents:'none' }}>
                      <button
                        onClick={() => setPendingSystemType(inactiveSys.id)}
                        title={`Cambiar a ${inactiveSys.label}`}
                        aria-label={`Cambiar a ${inactiveSys.label}`}
                        style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg, ${inactiveSys.color}, ${inactiveSys.colorDark})`, border:'2px solid rgba(20,20,28,0.95)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer', padding:0, pointerEvents:'auto', boxShadow:`0 6px 16px -4px ${inactiveSys.color}88`, transition:'transform .15s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.10)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
                        <ArrowUpDown size={15} color="#fff" strokeWidth={2.5}
                          style={{ animation: prefersReduced ? 'none' : 'sysSwapFlip 2.6s ease-in-out infinite' }} />
                      </button>
                      <style>{`
                        @keyframes sysSwapFlip {
                          0%, 22%  { transform: rotate(0deg) }
                          50%, 72% { transform: rotate(180deg) }
                          100%     { transform: rotate(360deg) }
                        }
                      `}</style>
                    </div>

                    {/* Contenedor unificado: card activa + campos de edición */}
                    <div style={{
                      border:`1px solid ${activeSys.color}55`,
                      borderRadius:18,
                      background:`${activeSys.color}08`,
                      padding:6,
                      display:'flex', flexDirection:'column', gap:6,
                    }}>
                      {/* Card activa */}
                      {renderCard(activeSys, true)}

                      {/* Callout 1pto=1$ (solo points) */}
                      {currentType === 'points' && (
                        <div style={{ padding:'10px 12px', background:'rgba(236,72,153,0.10)', border:'1px solid rgba(236,72,153,0.22)', borderRadius:10, fontSize:12, color:C.mist, lineHeight:1.5, display:'flex', alignItems:'flex-start', gap:9 }}>
                          <Gem size={14} color="#EC4899" strokeWidth={2} style={{ flexShrink:0, marginTop:2 }} />
                          <div>
                            <strong style={{ color:C.white }}>1 punto = 1 peso.</strong> Al escanear el QR ingresás el monto y eso se suma directo a los puntos del cliente.
                          </div>
                        </div>
                      )}

                      {/* Stats inline: compra mínima (stars) + cargar premios */}
                      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:14, padding:'10px 12px', background:`${activeSys.color}10`, border:`1px solid ${activeSys.color}26`, borderRadius:10, fontSize:12, color:C.mist }}>
                        {currentType === 'stars' && (() => {
                          const cur = form?.prog_min_purchase
                          const has = parseInt(cur) > 0
                          const dirty = String(cur ?? '') !== String(commerce?.prog_min_purchase ?? '')
                          return (
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <span style={{ fontSize:13, fontWeight:900, color: activeSys.color, fontFamily:FN, lineHeight:1, width:12, textAlign:'center' }}>$</span>
                              <span>Monto compra mínima:</span>
                              <InfoHint align="left" size={12} text={
                                'Solo cuentan las compras de este monto en adelante para sumar una estrella.\n\n' +
                                'Útil si vendés productos baratos: así un cliente que compra solo $100 no acumula estrellas tan rápido.\n\n' +
                                'Si lo dejás vacío, cualquier compra suma una estrella.'
                              } />
                              <div style={{ position:'relative', display:'inline-block' }}>
                                <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', fontSize:12, fontWeight:700, color: activeSys.color, fontFamily:FN, pointerEvents:'none' }}>$</span>
                                <input type="number" min={0} value={cur ?? ''} onChange={e => set('prog_min_purchase', e.target.value)}
                                  placeholder="—" inputMode="numeric"
                                  disabled={hasPendingChange}
                                  style={{ background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:6, padding:'3px 8px 3px 18px', fontSize:12, color:C.white, width:90, fontFamily:'inherit', opacity: hasPendingChange ? 0.5 : 1 }} />
                              </div>
                              {dirty && !hasPendingChange && (
                                <button onClick={saveFidelizacion} disabled={saving}
                                  style={{ background:GV, border:'none', borderRadius:6, padding:'3px 9px', color:'#fff', fontSize:10, fontWeight:700, fontFamily:FN, cursor:'pointer' }}>
                                  {saving ? '⟳' : 'Guardar'}
                                </button>
                              )}
                              {!dirty && saved && <span style={{ fontSize:11, color:C.ok }}>✓</span>}
                            </div>
                          )
                        })()}
                        {currentType === 'stars' && <div style={{ width:1, height:14, background:'rgba(255,255,255,0.10)' }} />}
                        <button onClick={() => setTab('premios', 'recompensas')}
                          style={{ background:'transparent', border:'none', cursor:'pointer', padding:0, color: systemPrizeCount > 0 ? activeSys.color : C.dust, fontFamily:FN, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                          <Gift size={12} strokeWidth={2.5} />
                          {systemPrizeCount > 0
                            ? `${systemPrizeCount} ${systemPrizeCount === 1 ? 'premio cargado' : 'premios cargados'}`
                            : `Sin premios para ${currentType === 'stars' ? 'estrellas' : 'puntos'}`
                          }
                          <ArrowRight size={11} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* ── Banner "Tenés un cambio sin guardar" + botones ──
                          Aparece cuando el usuario está previewing un sistema
                          distinto al guardado. Muestra Cancelar (vuelve al
                          original) y Guardar cambios (abre modal con la
                          confirmación + warning de premios). */}
                      {hasPendingChange && (
                        <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'10px 12px', background:`${activeSys.color}18`, border:`1px dashed ${activeSys.color}66`, borderRadius:10 }}>
                          <div style={{ fontSize:11.5, color:C.pearl, lineHeight:1.5, display:'flex', alignItems:'flex-start', gap:8 }}>
                            <AlertCircle size={14} color={activeSys.color} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }} />
                            <div>Estás previsualizando <strong style={{ color:activeSys.color }}>{activeSys.label}</strong>. Tu sistema sigue siendo <strong style={{ color:C.white }}>{savedType === 'stars' ? 'Estrellas' : 'Puntos'}</strong> hasta que guardes.</div>
                          </div>
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => setPendingSystemType(null)}
                              style={{ flex:1, padding:'8px', background:'transparent', border:`1px solid ${C.rim}`, borderRadius:8, color:C.mist, fontSize:12, fontFamily:FN, fontWeight:600, cursor:'pointer' }}>
                              Cancelar
                            </button>
                            <button onClick={() => setSwitchModal({ to: pendingSystemType })}
                              style={{ flex:2, padding:'8px', background:`linear-gradient(135deg, ${activeSys.color}, ${activeSys.colorDark})`, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontFamily:FN, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                              <Check size={13} strokeWidth={2.5} /> Guardar cambios
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* ── Modal de confirmación de cambio ──
                  fromSys usa savedType (no currentType, que ahora es el preview).
                  Warning de premios pausados destacado. */}
              {switchModal && (() => {
                const fromSys = SYSTEMS.find(s => s.id === savedType)
                const toSys   = SYSTEMS.find(s => s.id === switchModal.to)
                return (
                  <div
                    style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
                    onClick={() => setSwitchModal(null)}
                  >
                    <div
                      style={{ background:C.card, border:`1px solid ${C.rim}`, borderRadius:20, padding:28, maxWidth:380, width:'100%' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, marginBottom:10 }}>
                        Confirmar cambio de sistema
                      </div>
                      <div style={{ fontSize:13, color:C.mist, lineHeight:1.6, marginBottom:14 }}>
                        Pasás de <strong style={{ color:C.pearl }}>{fromSys.label}</strong> a{' '}
                        <strong style={{ color:toSys.color }}>{toSys.label}</strong>. El método de acumulación cambia.
                      </div>
                      {activePrizeCount > 0 && (
                        <div style={{ padding:'10px 12px', marginBottom:18, background:'rgba(248,116,68,0.10)', border:'1px solid rgba(248,116,68,0.32)', borderRadius:10, display:'flex', alignItems:'flex-start', gap:9 }}>
                          <AlertTriangle size={15} color="#f87444" strokeWidth={2} style={{ flexShrink:0, marginTop:1 }} />
                          <div style={{ fontSize:12, color:C.pearl, lineHeight:1.5 }}>
                            Tus <strong>{activePrizeCount} {activePrizeCount === 1 ? 'premio activo' : 'premios activos'}</strong> quedan pausados porque están definidos en {fromSys.label.toLowerCase()}. Vas a tener que volver a crearlos en {toSys.label.toLowerCase()}.
                          </div>
                        </div>
                      )}
                      <div style={{ display:'flex', gap:10 }}>
                        <button onClick={() => setSwitchModal(null)}
                          style={{ flex:1, padding:'12px', background:'none', border:`1px solid ${C.rim}`, borderRadius:12, color:C.mist, fontFamily:FN, fontSize:13, cursor:'pointer' }}>
                          Cancelar
                        </button>
                        <button onClick={() => switchSystem(switchModal.to)} disabled={saving}
                          style={{ flex:1, padding:'12px', background:`linear-gradient(135deg, ${toSys.color}, ${toSys.colorDark})`, border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                          {saving ? '⟳ Cambiando...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })()}
          </div>
        )}

        {/* ── PREMIOS ── */}
        {tab === 'premios' && (
          <div>
            <HelpBanner
              id="merchant-premios"
              title="Tu catálogo de premios"
              body="Estos son los premios que tus clientes pueden canjear con sus estrellas o puntos. Cada uno tiene un costo, stock y se puede pausar sin borrarlo. Tocá ‘Crear premio’ para agregar uno nuevo."
            />
            {/* Botón "← Volver a recompensas" si el usuario vino de ahí. */}
            {cameFromTab === 'recompensas' && (
              <button onClick={() => setTab('recompensas')}
                style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:14, padding:'6px 12px 6px 8px', background:'rgba(255,255,255,0.04)', border:`1px solid ${C.rim}`, borderRadius:99, color:C.mist, fontFamily:FN, fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                <ArrowLeft size={13} strokeWidth={2.5} /> Volver a recompensas
              </button>
            )}
            {/* Botón "← Volver a previsualización pública" si el usuario vino del preview con el ojo. */}
            {typeof window !== 'undefined' && localStorage.getItem('benefix:cameFromPreview') === '1' && (
              <button onClick={() => {
                try { localStorage.removeItem('benefix:cameFromPreview') } catch {}
                onOwnerProfile?.()
              }}
                style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:14, marginLeft: cameFromTab === 'recompensas' ? 8 : 0, padding:'6px 12px 6px 8px', background:'rgba(189,75,248,0.10)', border:'1px solid rgba(189,75,248,0.30)', borderRadius:99, color:'#BD4BF8', fontFamily:FN, fontSize:11.5, fontWeight:700, cursor:'pointer' }}>
                <ArrowLeft size={13} strokeWidth={2.5} /> Volver a previsualización
              </button>
            )}
            {/* Header con contador de límite */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4, gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, letterSpacing:'.08em', textTransform:'uppercase' }}>Premios</div>
                <InfoHint align="left" text={
                  'Cargá los premios que tus clientes pueden canjear con sus estrellas o puntos acumulados.\n\n' +
                  'Cada premio tiene un costo (en la unidad de tu sistema activo), un nombre, una imagen opcional y stock opcional.\n\n' +
                  'Si cambiás de sistema (estrellas ↔ puntos), los premios viejos quedan pausados y los volvés a cargar en el sistema nuevo.'
                } />
              </div>
              {perms.max_rewards !== null && (
                <div style={{ display:'flex', alignItems:'center', gap:6, background: rewardsAtLimit ? '#f874441a' : `${C.v}11`, border:`1px solid ${rewardsAtLimit ? '#f8744444' : `${C.v}33`}`, borderRadius:8, padding:'4px 10px', flexShrink:0 }}>
                  <span style={{ fontFamily:FN, fontSize:11, fontWeight:700, color: rewardsAtLimit ? '#f87444' : C.v }}>
                    {activeRewardsCount}/{perms.max_rewards} activos
                  </span>
                  {rewardsAtLimit && <Lock size={10} color='#f87444' strokeWidth={2.5} />}
                </div>
              )}
            </div>
            <div style={{ fontSize:12, color:C.mist, marginBottom: rewardsAtLimit ? 12 : 20 }}>
              Definí qué puede canjear el cliente con sus {unitLabel}.
              {perms.max_rewards !== null && <span style={{ color:C.dust }}> Plan FREE: hasta {perms.max_rewards} premios activos.</span>}
            </div>

            {/* Banner de límite alcanzado */}
            {rewardsAtLimit && (
              <div style={{ marginBottom:18 }}>
                <InfoBanner type="limit" icon={Gift}
                  action={
                    <button onClick={() => setUpgradeModal('rewards')} style={{ background:GV, border:'none', borderRadius:9, padding:'8px 18px', color:'#fff', fontFamily:FN, fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                      <Zap size={11} strokeWidth={2} /> Mejorar plan
                    </button>
                  }>
                  <strong style={{ fontWeight:700 }}>Límite de premios activos alcanzado.</strong> Disponible en <strong style={{ color:PLANS.starter.color }}>STARTER</strong> y superior.
                </InfoBanner>
              </div>
            )}

            {/* Lista de premios — efecto glass tintado con el color del sistema
                (violeta para stars / fucsia para points). */}
            {prizes.map(p => {
              const sysRgb   = commerce?.prog_type === 'stars' ? '139,92,246' : '236,72,153'
              const sysColor = commerce?.prog_type === 'stars' ? '#8B5CF6' : '#EC4899'
              return (
              <div key={p.id} style={{
                position:'relative',
                marginBottom:10,
                opacity: p.active ? 1 : 0.55,
                background: `linear-gradient(135deg, rgba(${sysRgb},0.08), rgba(${sysRgb},0.03))`,
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid rgba(${sysRgb}, ${p.active ? 0.32 : 0.16})`,
                borderRadius: 14, overflow:'hidden',
                boxShadow: p.active ? `0 4px 18px -6px rgba(${sysRgb},0.25), inset 0 1px 0 rgba(255,255,255,0.06)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
                {/* Badge de estado en esquina superior derecha — reemplaza el
                    botón con luz verde. Click toggles activo/inactivo. */}
                <button onClick={() => togglePrize(p)}
                  title={p.active ? 'Tap para desactivar' : 'Tap para activar'}
                  style={{ position:'absolute', top:8, right:8, zIndex:2, display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:99, fontSize:9, fontWeight:700, fontFamily:FN, letterSpacing:'.08em', cursor:'pointer',
                    background: p.active ? `${C.ok}22` : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${p.active ? `${C.ok}66` : 'rgba(255,255,255,0.14)'}`,
                    color: p.active ? C.ok : C.dust,
                  }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background: p.active ? C.ok : 'rgba(255,255,255,0.32)', boxShadow: p.active ? `0 0 6px ${C.ok}` : 'none' }} />
                  {p.active ? 'ACTIVO' : 'INACTIVO'}
                </button>

                {/* Zona principal — botones anclados al final (bottom) y el
                    contenido del medio respeta espacio para el badge top-right
                    para que nunca se superpongan. */}
                <div style={{ display:'flex', alignItems:'flex-end', gap:12, padding:'10px 14px' }}>
                  {p.img_url
                    ? <img src={p.img_url} alt="" style={{ width:52, height:52, borderRadius:10, objectFit:'cover', flexShrink:0, alignSelf:'center' }} />
                    : <div style={{ width:52, height:52, borderRadius:10, background:C.bg3, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, alignSelf:'center' }}><Gift size={24} color={C.mist} strokeWidth={1.5} /></div>
                  }
                  <div style={{ flex:1, minWidth:0, paddingRight:6, paddingTop:22 /* hueco para el badge */ }}>
                    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                    {p.description && (
                      <div style={{ fontSize:11, color:C.mist, marginTop:2, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical' }}>{p.description}</div>
                    )}
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, color:unitColor }}>{unitIcon} {p.cost} {unitLabel}</span>
                    </div>
                  </div>
                  {/* 2 botoncitos: lápiz + bote — anclados al bottom para no
                      chocar con el badge ACTIVO/INACTIVO de arriba a la derecha. */}
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <button onClick={() => startEditPrize(p)} title="Editar premio"
                      style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.04)', border:`1px solid ${C.rim}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.mist, padding:0 }}>
                      <Pen size={13} strokeWidth={2} />
                    </button>
                    <button onClick={() => deletePrize(p.id)} title="Eliminar premio"
                      style={{ width:32, height:32, borderRadius:'50%', background:'rgba(248,116,68,0.08)', border:'1px solid rgba(248,116,68,0.25)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#f87444', padding:0 }}>
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
                {/* ── Zócalo inferior — stock + canjeados + creado ── */}
                {(() => {
                  const canjes = prizeCanjes[p.id] || 0
                  const hasStock = p.stock !== null && p.stock !== undefined
                  const stockColor = hasStock
                    ? (p.stock === 0 ? '#f87444' : p.stock === 1 ? C.o : C.mist)
                    : C.dust
                  const createdDate = p.created_at ? new Date(p.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit' }) : null
                  return (
                    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'7px 14px', background:`rgba(${sysRgb},0.06)`, borderTop:`1px solid rgba(${sysRgb}, ${p.active ? 0.18 : 0.10})`, fontSize:11, color:C.mist, flexWrap:'wrap' }}>
                      {/* Stock */}
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <Package size={11} color={stockColor} strokeWidth={2} />
                        <span style={{ color:C.dust }}>Stock:</span>
                        <span style={{ color:stockColor, fontWeight:700, fontFamily:FN }}>
                          {hasStock ? (p.stock === 0 ? 'Sin stock' : p.stock === 1 ? 'Último' : p.stock) : '∞'}
                        </span>
                      </div>
                      <div style={{ width:1, height:11, background:'rgba(255,255,255,0.10)' }} />
                      {/* Canjeados */}
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <Check size={11} color={canjes > 0 ? C.ok : C.dust} strokeWidth={2.5} />
                        <span style={{ color:C.dust }}>Canjeados:</span>
                        <span style={{ color: canjes > 0 ? C.white : C.dust, fontWeight:700, fontFamily:FN }}>{canjes}</span>
                      </div>
                      {/* Creado */}
                      {createdDate && (
                        <>
                          <div style={{ width:1, height:11, background:'rgba(255,255,255,0.10)' }} />
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <Calendar size={10} color={C.dust} strokeWidth={2} />
                            <span style={{ color:C.dust }}>Creado:</span>
                            <span style={{ color:C.mist, fontWeight:600, fontFamily:FN }}>{createdDate}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()}
              </div>
              )
            })}
            {prizes.length === 0 && <div style={{ textAlign:'center', padding:'24px 0', color:C.dust, fontSize:12 }}>No hay premios todavía. Creá el primero.</div>}

            {/* Formulario nuevo premio — bloqueado si en límite */}
            {rewardsAtLimit ? (
              <div onClick={() => setUpgradeModal('rewards')} style={{ marginTop:12, border:`1px dashed ${C.v}44`, borderRadius:14, padding:20, cursor:'pointer', opacity:0.65, display:'flex', flexDirection:'column', alignItems:'center', gap:8, background:`${C.v}08` }}>
                <Lock size={22} color={C.mist} strokeWidth={1.5} />
                <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>+ Crear premio</div>
                <div style={{ fontSize:11, color:C.mist, textAlign:'center', lineHeight:1.5 }}>
                  Disponible en <strong style={{ color:PLANS.starter.color }}>STARTER</strong>.<br/>
                  <span style={{ color:C.v, textDecoration:'underline' }}>Desbloqueá premios ilimitados →</span>
                </div>
              </div>
            ) : (
              <div id="prize-form-card" style={{ marginTop:12, border: (createPrizeOpen || editingPrizeId) ? `1px solid ${C.v}55` : 'none', borderRadius:14, background: (createPrizeOpen || editingPrizeId) ? 'rgba(189,75,248,0.04)' : 'transparent', overflow:'hidden', transition:'border-color .2s, background .2s' }}>
                {/* Header — cuando está cerrado, es un botón gradiente de marca
                    (CTA primario). Cuando está abierto/editando, se vuelve un
                    header neutro para que la jerarquía la tome el form. */}
                <button onClick={() => editingPrizeId ? null : setCreatePrizeOpen(o => !o)}
                  style={(createPrizeOpen || editingPrizeId) ? {
                    width:'100%', padding:'14px 18px', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', textAlign:'left', fontFamily:'inherit',
                  } : {
                    width:'100%', padding:'14px 18px', background:G, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', textAlign:'left', fontFamily:'inherit', borderRadius:14, boxShadow:'0 6px 20px -6px rgba(254,80,0,0.45)',
                  }}>
                  <div style={{ fontFamily:FN, fontSize:14, color:'#fff', fontWeight:800, display:'flex', alignItems:'center', gap:7 }}>
                    <Plus size={15} strokeWidth={2.8} color={(createPrizeOpen || editingPrizeId) ? C.v : '#fff'} />
                    {editingPrizeId ? `Editando: ${newPrize.name || 'premio'}` : 'Crear premio'}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {perms.max_rewards !== null && !editingPrizeId && (
                      <div style={{ fontSize:10, color: (createPrizeOpen || editingPrizeId) ? (activeRewardsCount === perms.max_rewards - 1 ? C.o : C.dust) : 'rgba(255,255,255,0.85)', fontWeight:700 }}>
                        {activeRewardsCount}/{perms.max_rewards}
                        {activeRewardsCount === perms.max_rewards - 1 && ' · último'}
                      </div>
                    )}
                    {editingPrizeId ? (
                      <button onClick={e => { e.stopPropagation(); cancelEditPrize() }}
                        style={{ background:'transparent', border:'none', color:C.dust, fontSize:11, cursor:'pointer', fontFamily:FN, fontWeight:600 }}>Cancelar</button>
                    ) : (
                      <ChevronDown size={16} color={(createPrizeOpen) ? C.mist : '#fff'} style={{ transform: createPrizeOpen ? 'rotate(180deg)' : 'none', transition:'transform .2s' }} />
                    )}
                  </div>
                </button>
                {/* Body — colapsado por default. Cuando edita un existente, siempre abierto. */}
                {(createPrizeOpen || editingPrizeId) && (
                <div style={{ padding:'4px 18px 18px', borderTop:`1px solid rgba(255,255,255,0.06)` }}>

                {/* Título */}
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontFamily:FN, fontSize:11, fontWeight:700, color:C.mist, textTransform:'uppercase', letterSpacing:'.05em', display:'block', marginBottom:5 }}>Título <span style={{ color:'#f87444', fontWeight:400 }}>·</span></label>
                  <Inp value={newPrize.name} onChange={e=>setNewPrize(p=>({...p,name:e.target.value}))} placeholder="Ej: Café gratis, 20% OFF en la cuenta..." />
                </div>

                {/* Descripción opcional */}
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontFamily:FN, fontSize:11, fontWeight:700, color:C.mist, textTransform:'uppercase', letterSpacing:'.05em', display:'block', marginBottom:5 }}>Descripción <span style={{ color:C.dust, fontWeight:400, textTransform:'none', letterSpacing:0 }}>(opcional)</span></label>
                  <textarea value={newPrize.description} onChange={e=>setNewPrize(p=>({...p,description:e.target.value}))} placeholder="Detalles para el cliente. Ej: válido de lunes a viernes, no acumulable con otras promos..."
                    rows={2}
                    style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.pearl, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box', lineHeight:1.5 }} />
                </div>

                {/* Costo + Stock en grid de 2 columnas */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  {/* Costo */}
                  <div>
                    <label style={{ fontFamily:FN, fontSize:11, fontWeight:700, color:C.mist, textTransform:'uppercase', letterSpacing:'.05em', display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
                      Costo en {unitLabel} <span style={{ color:'#f87444', fontWeight:400 }}>·</span>
                    </label>
                    <input type="number" min={1} value={newPrize.cost} onChange={e=>setNewPrize(p=>({...p,cost:e.target.value}))} placeholder={`Ej: ${commerce?.prog_type === 'stars' ? '10' : '500'}`}
                      style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.pearl, boxSizing:'border-box' }} />
                    <div style={{ fontSize:10, color:C.dust, marginTop:4 }}>Cuántos {unitLabel} cuesta canjear este premio</div>
                  </div>
                  {/* Stock */}
                  <div>
                    <label style={{ fontFamily:FN, fontSize:11, fontWeight:700, color:C.mist, textTransform:'uppercase', letterSpacing:'.05em', display:'block', marginBottom:5 }}>
                      Stock <span style={{ color:C.dust, fontWeight:400, textTransform:'none', letterSpacing:0 }}>(opcional)</span>
                    </label>
                    <div style={{ position:'relative' }}>
                      <input type="number" min={1} value={newPrize.stock} onChange={e=>setNewPrize(p=>({...p,stock:e.target.value}))} placeholder="Ilimitado"
                        style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.pearl, boxSizing:'border-box' }} />
                      {newPrize.stock !== '' && (
                        <button onClick={()=>setNewPrize(p=>({...p,stock:''}))} type="button" title="Volver a ilimitado"
                          style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:C.dust, fontSize:14, cursor:'pointer', padding:'2px 6px' }}>✕</button>
                      )}
                    </div>
                    <div style={{ fontSize:10, color:C.dust, marginTop:4 }}>Vacío = sin tope</div>
                  </div>
                </div>

                {/* Foto */}
                <div style={{ marginBottom:14 }}>
                  <input type="file" accept="image/*" id="prize-img-input" style={{ display:'none' }}
                    onChange={e => { if (e.target.files[0]) uploadPrizeImg(e.target.files[0]); e.target.value='' }} />
                  {newPrize.img_url ? (
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <img src={newPrize.img_url} alt="" style={{ width:56, height:56, borderRadius:10, objectFit:'cover', flexShrink:0 }} />
                      <button onClick={() => setNewPrize(p=>({...p,img_url:''}))}
                        style={{ background:'transparent', border:`1px solid ${C.rim}`, borderRadius:8, color:C.dust, fontSize:11, cursor:'pointer', padding:'7px 12px' }}>✕ Quitar foto</button>
                    </div>
                  ) : (
                    <label htmlFor="prize-img-input" style={{ display:'flex', alignItems:'center', gap:7, background:C.bg3, border:`1px dashed ${C.rim}`, borderRadius:10, padding:'10px 14px', fontSize:12, color:uploadingImg?C.pearl:C.mist, cursor:'pointer', width:'100%', justifyContent:'center', boxSizing:'border-box' }}>
                      <Camera size={14} strokeWidth={2} />
                      {uploadingImg ? 'Subiendo...' : 'Foto del premio (opcional)'}
                    </label>
                  )}
                </div>

                {prizeError && <div style={{ fontSize:11, color:'#f87', marginBottom:10 }}>{prizeError}</div>}
                {(() => {
                  // En modo edición, comparamos con el snapshot original para
                  // habilitar el Guardar solo si hay cambios sin guardar.
                  const isEditing = !!editingPrizeId
                  const hasFields = !!newPrize.name && !!newPrize.cost
                  const hasChanges = isEditing && originalPrize ? (
                    newPrize.name !== originalPrize.name ||
                    (newPrize.description||'') !== (originalPrize.description||'') ||
                    String(newPrize.cost) !== String(originalPrize.cost) ||
                    (newPrize.img_url||'') !== (originalPrize.img_url||'') ||
                    String(newPrize.stock||'') !== String(originalPrize.stock||'')
                  ) : true
                  const disabled = addingPrize || !hasFields || (isEditing && !hasChanges)
                  return (
                    <GBtn onClick={addPrize} disabled={disabled} sm style={{ width:'100%', justifyContent:'center' }}>
                      {addingPrize
                        ? (isEditing ? '⟳ Guardando...' : '⟳ Creando...')
                        : (isEditing
                            ? (hasChanges ? 'Guardar cambios' : 'Sin cambios')
                            : 'Crear premio')}
                    </GBtn>
                  )
                })()}
                <div style={{ fontSize:10, color:C.dust, marginTop:8, textAlign:'center' }}><span style={{ color:'#f87444' }}>·</span> Campos obligatorios</div>
                </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── SECCIÓN 2: RECOMPENSAS EXTRA (STARTER + PRO) ─── */}
        {tab === 'recompensas' && (
          <div style={{
            background:'rgba(255,255,255,0.025)',
            border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:16,
            padding:'18px 16px 16px',
            marginBottom:14,
          }}>
            {/* Título + línea divisoria */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18, fontWeight:900, color:C.white, letterSpacing:'.08em', textTransform:'uppercase' }}>Recompensas extra</span>
              <InfoHint align="left" text={
                'Beneficios adicionales que vienen ENCIMA de tu sistema de estrellas o puntos.\n\n' +
                '• Cupón próxima visita: un % OFF que el cliente recibe automáticamente y usa la próxima vez que va.\n\n' +
                '• Días con bonus ×2: los días que vos elegís, los clientes acumulan al doble. Útil para llenar días flojos.\n\n' +
                'Disponibles desde el plan STARTER.'
              } />
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
            </div>
            {/* Chips de plan debajo del título */}
            <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
              {canPromote ? (
                <span style={{ fontSize:9, fontWeight:700, color:'#22c55e', background:'rgba(34,197,94,0.15)', borderRadius:99, padding:'2px 8px', fontFamily:FN, letterSpacing:'.06em' }}>ACTIVO</span>
              ) : (
                <>
                  <span style={{ fontSize:9, fontWeight:700, color:PLANS.starter.color, background:`${PLANS.starter.color}22`, borderRadius:99, padding:'2px 8px', fontFamily:FN, letterSpacing:'.06em', display:'inline-flex', alignItems:'center', gap:3 }}>
                    <Lock size={8} strokeWidth={2.5} /> STARTER
                  </span>
                  <span style={{ fontSize:9, fontWeight:700, color:PLANS.pro.color, background:`${PLANS.pro.color}22`, borderRadius:99, padding:'2px 8px', fontFamily:FN, letterSpacing:'.06em', display:'inline-flex', alignItems:'center', gap:3 }}>
                    <Lock size={8} strokeWidth={2.5} /> PRO
                  </span>
                </>
              )}
            </div>

        {/* ── PROMOCIONES — locked ──
            Layout: rectángulos full-width apilados, con descripción colapsable
            inline (no más modal teaser). Click en la card → expande beneficios
            + ejemplo + CTA "Activar STARTER" abajo de la misma card. */}
        {!canPromote && (() => {
          const PROMOS = [
            {
              id:'discount', glyph:'-%', color:'#F59E0B', rgb:'245,158,11',
              label:'Cupón próxima visita',
              tagline:'Que vuelvan con un % OFF automático',
              benefits:[
                'Configurás el % y el cliente lo ve al escanear su QR',
                'Cupón con vencimiento — empuja a volver',
                'Reactiva clientes que dejaron de venir',
              ],
              example:'15% OFF en tu próxima visita, válido 30 días',
            },
            {
              id:'double', glyph:'×2', color:'#6366F1', rgb:'99,102,241',
              label:`Días con bonus ×2`,
              tagline:`Llená tus días flojos: ×2 ${unitLabel}`,
              benefits:[
                'Activala los días que querés traer más gente (martes, miércoles)',
                `El cliente acumula al doble — vuelve más rápido`,
                'Ideal para liquidar stock o lanzar productos nuevos',
              ],
              example:`Lunes y miércoles, ×2 ${unitLabel} todo el día`,
            },
          ]
          return (
            <div style={{
              border:`1px solid ${PLANS.starter.color}33`,
              background:`${PLANS.starter.color}08`,
              borderRadius:18,
              padding:6,
              display:'flex', flexDirection:'column', gap:6,
            }}>
              {PROMOS.map(p => {
                const isOpen = promoTeaser === p.id
                return (
                  <div key={p.id}
                    style={{ borderRadius:12, overflow:'hidden', border:`1px solid ${isOpen ? `${p.color}55` : `${p.color}26`}`, background: isOpen ? `linear-gradient(180deg, ${p.color}14, ${p.color}05)` : `linear-gradient(145deg, ${p.color}0E, ${p.color}05)`, transition:'border-color .15s ease, background .15s ease' }}>
                    {/* Cabecera clickeable — opacity bajada en glyph + texto +
                        chevron para dar sensación de "deshabilitado". El
                        candado se mantiene a opacity full (más visible) para
                        que el motivo del bloqueo lea fuerte. */}
                    <button onClick={() => setPromoTeaser(isOpen ? null : p.id)}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 14px', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                      {/* Glyph (deshabilitado) */}
                      <div style={{ width:40, height:40, borderRadius:10, border:`2px solid ${p.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FN, fontSize:16, fontWeight:900, color:p.color, letterSpacing:'-0.02em', flexShrink:0, opacity:0.55 }}>
                        {p.glyph}
                      </div>
                      {/* Título + tagline (deshabilitados) */}
                      <div style={{ flex:1, minWidth:0, opacity:0.65 }}>
                        <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, marginBottom:2 }}>{p.label}</div>
                        <div style={{ fontSize:11, color:C.mist, lineHeight:1.4 }}>{p.tagline}</div>
                      </div>
                      {/* Candado (full intensity) + chevron (deshabilitado) */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                        <Lock size={13} color="rgba(255,255,255,0.92)" strokeWidth={2.6} />
                        <ChevronDown size={16} color={C.mist} strokeWidth={2}
                          style={{ transition:'transform .2s ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity:0.55 }} />
                      </div>
                    </button>

                    {/* Cuerpo expandido */}
                    {isOpen && (
                      <div style={{ padding:'4px 14px 14px', borderTop:`1px solid ${p.color}1a` }}>
                        {/* Beneficios */}
                        <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12, marginBottom:12 }}>
                          {p.benefits.map(b => (
                            <div key={b} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:12, color:C.pearl, lineHeight:1.5 }}>
                              <Check size={13} strokeWidth={2.5} color={p.color} style={{ flexShrink:0, marginTop:2 }} />
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                        {/* Ejemplo */}
                        <div style={{ padding:'9px 11px', background:'rgba(0,0,0,0.28)', border:`1px dashed rgba(${p.rgb},0.35)`, borderRadius:9, fontSize:11.5, color:C.mist, fontFamily:FI, marginBottom:12, lineHeight:1.5 }}>
                          💡 {p.example}
                        </div>
                        {/* CTA inline */}
                        <button onClick={() => setUpgradeModal('promotions')}
                          style={{ width:'100%', padding:'10px', borderRadius:10, background:`linear-gradient(135deg, ${p.color}, ${PLANS.starter.color})`, border:'none', color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:`0 4px 16px rgba(${p.rgb},0.30)`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                          Activar con STARTER <ArrowRight size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}

        {canPromote && (() => {
          const DURATIONS = [
            { id:'today',  label:'Solo hoy'        },
            { id:'3days',  label:'3 días'           },
            { id:'7days',  label:'7 días'           },
            { id:'custom', label:'Elegir fecha'     },
          ]
          function fmtDate(iso) {
            return new Date(iso).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit'})
          }
          function expiresLabel(p) {
            if (p.expiration_type === 'relative') return `${p.expiration_days || '?'} días por cliente desde que se otorga`
            if (!p.expires_at) return 'Sin vencimiento'
            const expired = new Date(p.expires_at) < new Date()
            return expired ? 'Vencida' : `Activa hasta el ${fmtDate(p.expires_at)}`
          }
          // Preview dinámico
          const previewExpires = newPromo.type === 'double_points'
            ? (newPromo.custom_date ? new Date(newPromo.custom_date + 'T23:59:59').toISOString() : null)
            : (newPromo.expiration_type === 'fixed' && newPromo.expiration_date ? new Date(newPromo.expiration_date + 'T23:59:59').toISOString() : null)
          const previewDate    = previewExpires ? fmtDate(previewExpires) : '–'
          const previewText    = newPromo.type === 'discount_next'
            ? (newPromo.expiration_type === 'relative'
              ? `El cliente recibirá un ${newPromo.value || '?'}% de descuento en su próxima visita. Tiene ${newPromo.expiration_days || '?'} días para usarlo desde que se le otorga.`
              : `El cliente recibirá un ${newPromo.value || '?'}% de descuento en su próxima visita al escanear su QR (válido hasta el ${previewDate})`)
            : `El cliente recibirá el doble de ${unitLabel} al escanear su QR hasta el ${previewDate}`

          const activePromos      = promos.filter(p => p.active && !isExpired(p))
          const inactivePromos    = promos.filter(p => !p.active || isExpired(p))
          const hasActiveDiscount = activePromos.some(p => p.type === 'discount_next')
          const hasActiveDouble   = activePromos.some(p => p.type === 'double_points')
          const canAddMore        = !hasActiveDiscount || !hasActiveDouble

          // Mock data para promociones
          const mockActivePromos = [
            { id: 'mock1', description: 'Descuento 15% próxima visita', expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(), active: true, type: 'discount_next' },
            { id: 'mock2', description: 'Suma doble viernes a domingo', expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString(), active: true, type: 'double_points' },
          ]
          const mockInactivePromos = [
            { id: 'mock3', description: 'Descuento 10% (Vencida)', expires_at: new Date(Date.now() - 5*24*60*60*1000).toISOString(), active: false, type: 'discount_next' },
          ]

          // Usar mock data solo si no existe ninguna promo real
          const hasRealPromos = promos.length > 0
          const displayActivePromos = activePromos.length > 0 ? activePromos : (hasRealPromos ? [] : mockActivePromos)
          const displayInactivePromos = inactivePromos.length > 0 ? inactivePromos : (hasRealPromos ? [] : mockInactivePromos)

          return (
          <div>
            {/* Modal confirmación borrado */}
            {confirmDelete && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
                <PCard className="modal-in" style={{ padding:24, maxWidth:360, width:'100%' }}>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}><AlertTriangle size={22} color={C.o} strokeWidth={2} /></div>
                  <div style={{ fontFamily:FN, fontSize:15, fontWeight:700, color:C.white, marginBottom:10 }}>¿Eliminar promoción activa?</div>
                  <div style={{ fontSize:13, color:C.mist, lineHeight:1.6, marginBottom:20 }}>
                    Algunos clientes pueden haberla visto o estar esperándola. Eliminarla puede generar una mala experiencia.
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => setConfirmDelete(null)}
                      style={{ flex:1, padding:'11px', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, color:C.mist, fontSize:13, cursor:'pointer', fontFamily:FN, fontWeight:600 }}>
                      Cancelar
                    </button>
                    <button onClick={() => deletePromo(confirmDelete.id)}
                      style={{ flex:1, padding:'11px', background:'#f8744422', border:`1px solid #f87444`, borderRadius:10, color:'#f87444', fontSize:13, cursor:'pointer', fontFamily:FN, fontWeight:700 }}>
                      Eliminar
                    </button>
                  </div>
                </PCard>
              </div>
            )}

            {/* Modal edición de promo activa — descripción + vencimiento. */}
            {editingPromo && (() => {
              const ep = editingPromo
              const epColor = ep.type === 'discount_next' ? C.v : '#ec4899'
              // Date input value: si tiene expires_at, usamos su fecha (YYYY-MM-DD)
              const initialDate = ep.expires_at
                ? new Date(ep.expires_at).toISOString().slice(0,10)
                : ''
              return (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
                  onClick={() => setEditingPromo(null)}>
                  <PCard className="modal-in" style={{ padding:24, maxWidth:380, width:'100%', position:'relative' }}
                    onClick={e => e.stopPropagation()}>
                    <button onClick={() => setEditingPromo(null)} aria-label="Cerrar"
                      style={{ position:'absolute', top:12, right:12, width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, color:C.mist, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                      <X size={13} strokeWidth={2.5} />
                    </button>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <Pen size={16} color={epColor} strokeWidth={2} />
                      <div style={{ fontFamily:FN, fontSize:15, fontWeight:700, color:C.white }}>Editar promo</div>
                    </div>
                    {/* Descripción */}
                    <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.mist, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>Descripción</label>
                    <input
                      type="text"
                      defaultValue={ep.description || ''}
                      onChange={e => setEditingPromo(prev => ({ ...prev, _newDesc: e.target.value }))}
                      style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:8, padding:'9px 11px', fontSize:13, color:C.pearl, fontFamily:'inherit', boxSizing:'border-box', marginBottom:14 }}
                    />
                    {/* Fecha de vencimiento (solo si ya tiene expires_at — promos relativas no se editan acá) */}
                    {ep.expiration_type !== 'relative' && (
                      <>
                        <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.mist, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>Vence el</label>
                        <input
                          type="date"
                          defaultValue={initialDate}
                          onChange={e => setEditingPromo(prev => ({ ...prev, _newDate: e.target.value }))}
                          style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:8, padding:'9px 11px', fontSize:13, color:C.pearl, fontFamily:'inherit', boxSizing:'border-box', marginBottom:18, colorScheme:'dark' }}
                        />
                      </>
                    )}
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={() => setEditingPromo(null)}
                        style={{ flex:1, padding:'11px', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, color:C.mist, fontSize:13, cursor:'pointer', fontFamily:FN, fontWeight:600 }}>
                        Cancelar
                      </button>
                      <button onClick={() => {
                        const patch = {}
                        if (ep._newDesc !== undefined && ep._newDesc !== ep.description) patch.description = ep._newDesc
                        if (ep._newDate !== undefined && ep._newDate !== initialDate) {
                          patch.expires_at = ep._newDate ? new Date(ep._newDate + 'T23:59:59').toISOString() : null
                        }
                        if (Object.keys(patch).length > 0) updatePromo(ep.id, patch)
                        else setEditingPromo(null)
                      }}
                        style={{ flex:1, padding:'11px', background:`linear-gradient(135deg, ${epColor}, ${epColor}cc)`, border:'none', borderRadius:10, color:'#fff', fontSize:13, cursor:'pointer', fontFamily:FN, fontWeight:700 }}>
                        Guardar
                      </button>
                    </div>
                  </PCard>
                </div>
              )
            })()}

            {/* Header "Promociones / Se aplican al escanear..." quitado:
                el section header "Recompensas extra" arriba ya provee contexto.
                Solo dejamos el botón "Nueva promo" cuando se puede agregar. */}
            {canAddMore && (
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
                <GBtn sm onClick={() => setShowPromoWizard(true)} style={{ gap:5, flexShrink:0 }}>
                  <Plus size={12} strokeWidth={2.5} />
                  Nueva promo
                </GBtn>
              </div>
            )}
            {!canAddMore && (
              <div style={{ marginBottom:20 }}>
                <InfoBanner subtle icon={AlertCircle}>
                  <span style={{ color:'#fff', fontWeight:600 }}>2/2 promos activas.</span>{' '}
                  <span style={{ color:'rgba(255,255,255,0.75)', fontWeight:400 }}>Desactivá o eliminá una para crear otra.</span>
                </InfoBanner>
              </div>
            )}
            {showPromoWizard && (
              <PromoWizard
                progType={commerce?.prog_type}
                activePromos={activePromos}
                onClose={() => setShowPromoWizard(false)}
                onComplete={async (d) => { await addPromo(d); setShowPromoWizard(false) }}
              />
            )}

            {/* Aviso de ejemplo */}
            {promos.length === 0 && (
              <div style={{ marginBottom:12, padding:'8px 12px', background:`${C.info}11`, border:`1px solid ${C.info}33`, borderRadius:10, fontSize:11, color:C.info }}>
                👁 Ejemplo — así se verán tus promociones activas.
              </div>
            )}

            {/* Promos activas */}
            {displayActivePromos.length > 0 && (
              <>
                <div style={{ fontSize:10, color:C.ok, fontWeight:700, marginBottom:10, textTransform:'uppercase', letterSpacing:'.1em', display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:C.ok }} /> Activas ahora
                </div>
                {displayActivePromos.map(p => {
                  const typeCol = p.type === 'discount_next' ? C.v : '#ec4899'
                  const typeBg  = p.type === 'discount_next' ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)' : 'linear-gradient(135deg,#EC4899,#DB2777)'
                  const typeSym = p.type === 'discount_next' ? '−%' : '×2'
                  const isMock = p.id.startsWith('mock')
                  return (
                    <div key={p.id} style={{ display:'flex', marginBottom:10, borderRadius:14, overflow:'hidden', border:`1px solid ${typeCol}33`, background:`${typeCol}08` }}>
                      <div style={{ width:4, background:typeCol, flexShrink:0 }} />
                      <div style={{ flex:1, padding:'14px 14px 12px' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12 }}>
                          <div aria-hidden="true" style={{ width:36, height:36, borderRadius:10, background:typeBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 4px 10px -2px ${typeCol}55` }}>
                            <span style={{ fontFamily:FN, fontWeight:900, fontSize:12, color:'#fff', letterSpacing:'-0.02em', lineHeight:1 }}>{typeSym}</span>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:3 }}>
                              <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{p.description}</div>
                              <StatusLED active={true} />
                            </div>
                            <div style={{ fontSize:11, color:C.mist }}>{expiresLabel(p)}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
                          {/* Desactivar (texto, ocupa el espacio) */}
                          <button onClick={() => isMock ? null : togglePromo(p)}
                            style={{ flex:1, padding:'7px', background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, borderRadius:8, color:C.mist, fontSize:11, cursor:isMock?'default':'pointer', fontFamily:FN, fontWeight:600, opacity:isMock?0.5:1 }}>
                            {isMock ? 'Demo' : 'Desactivar'}
                          </button>
                          {/* Lápiz para editar (descripción + vencimiento) */}
                          <button onClick={() => isMock ? null : setEditingPromo(p)} title="Editar promo"
                            style={{ width:34, padding:0, background:'rgba(255,255,255,0.04)', border:`1px solid ${C.rim}`, borderRadius:8, color:C.mist, cursor:isMock?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:isMock?0.5:1 }}>
                            <Pen size={13} strokeWidth={2} />
                          </button>
                          {/* Tacho para eliminar */}
                          <button onClick={() => isMock ? null : setConfirmDelete(p)} title="Eliminar promo"
                            style={{ width:34, padding:0, background:'rgba(248,116,68,0.08)', border:`1px solid rgba(248,116,68,0.28)`, borderRadius:8, color:'#f87444', cursor:isMock?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:isMock?0.5:1 }}>
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Promos pausadas / vencidas */}
            {displayInactivePromos.length > 0 && (
              <>
                <div style={{ fontSize:10, color:C.dust, fontWeight:700, marginBottom:10, marginTop:18, textTransform:'uppercase', letterSpacing:'.1em' }}>Pausadas</div>
                {displayInactivePromos.map(p => {
                  const typeCol = p.type === 'discount_next' ? C.v : '#ec4899'
                  const typeSym = p.type === 'discount_next' ? '−%' : '×2'
                  const isMock = p.id.startsWith('mock')
                  return (
                    <div key={p.id} style={{ display:'flex', marginBottom:8, borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)', opacity:0.6 }}>
                      <div style={{ width:4, background:`${typeCol}55`, flexShrink:0 }} />
                      <div style={{ flex:1, padding:'12px 14px 10px' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                          <div aria-hidden="true" style={{ width:30, height:30, borderRadius:8, background:`${typeCol}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <span style={{ fontFamily:FN, fontWeight:900, fontSize:10, color:`${typeCol}aa`, letterSpacing:'-0.02em', lineHeight:1 }}>{typeSym}</span>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:2 }}>
                              <div style={{ fontFamily:FN, fontSize:12, fontWeight:600, color:C.dust }}>{p.description}</div>
                              <StatusLED active={false} />
                            </div>
                            <div style={{ fontSize:10, color:C.dust }}>{isExpired(p) ? 'Vencida' : 'Desactivada'}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => isMock ? null : togglePromo(p)}
                            style={{ flex:1, padding:'6px', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:8, color:C.mist, fontSize:11, cursor:isMock?'default':'pointer', fontFamily:FN, fontWeight:600 }}>
                            {isMock ? 'Demo' : 'Reactivar'}
                          </button>
                          <button onClick={() => isMock ? null : setConfirmDelete(p)}
                            style={{ flex:1, padding:'6px', background:'transparent', border:`1px solid rgba(255,255,255,0.08)`, borderRadius:8, color:C.dust, fontSize:11, cursor:isMock?'default':'pointer', fontFamily:FN, fontWeight:600 }}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

          </div>
          )
        })()}
          </div>
        )}

        {/* ── Cross-promo: invita a la pestaña Mensajes (PRO) ──
            Intensidad bajada (deshabilitado-style) + candado destacado + chip
            PRO al lado del título para que la condición lea sin esfuerzo. */}
        {tab === 'recompensas' && (
          <button onClick={() => setTab('mensajes', 'recompensas')}
            style={{ marginTop:24, marginBottom:8, width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'linear-gradient(135deg, rgba(34,197,94,0.05), rgba(34,197,94,0.02))', border:'1px solid rgba(34,197,94,0.16)', borderRadius:12, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(34,197,94,0.10)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity:0.65 }}>
              <MessageCircle size={18} strokeWidth={2} color="#22c55e" />
            </div>
            <div style={{ flex:1, minWidth:0, opacity:0.75 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2, flexWrap:'wrap' }}>
                <span style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>
                  Reactivá clientes
                </span>
                <span style={{ fontSize:9, fontWeight:700, color:PLANS.pro.color, background:`${PLANS.pro.color}22`, borderRadius:99, padding:'2px 7px', fontFamily:FN, letterSpacing:'.06em', display:'inline-flex', alignItems:'center', gap:3 }}>
                  <Lock size={8} strokeWidth={2.5} /> PRO
                </span>
              </div>
              <div style={{ fontSize:11, color:C.mist, lineHeight:1.4 }}>
                Mensajes automáticos por WhatsApp para los que dejaron de venir.
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <Lock size={13} color="rgba(255,255,255,0.92)" strokeWidth={2.6} />
              <ArrowRight size={13} color="#22c55e" strokeWidth={2.5} style={{ opacity:0.65 }} />
            </div>
          </button>
        )}

        {/* ── REPORTES ──
            Saqué el header grande "ANÁLISIS / Cómo va tu negocio..." y el
            sub-header "REPORTES" en mayúsculas — el HelpBanner ya cuenta de
            qué se trata la pestaña, y abajo viene el sub-titulo "Reportes"
            con el subtitle "Historial de visitas, canjes y base de clientes". */}
        {tab === 'analisis' && (
          <HelpBanner
            id="merchant-analisis"
            title="Cómo lee tu negocio"
            body="Reportes de visitas, canjes y descuentos + mapa de clientes por nivel de actividad."
            details={<>
              Te sirve para detectar quiénes vienen mucho, quiénes se enfriaron y dónde está tu mejor oportunidad. Usá los filtros (fecha, tipo de evento, segmento) para enfocarte en el dato que te importa, y el botón <strong style={{ color:'#fff' }}>"Descargar CSV / Excel"</strong> si querés trabajarlo en otro lado.
            </>}
          />
        )}
        {tab === 'analisis' && (() => {
          const today = new Date().toISOString().split('T')[0]

          // Helper: convierte 'DD/MM/YYYY' a Date para comparar con inputs type=date
          function parseFecha(str) {
            if (!str) return null
            const [d, m, y] = str.split('/')
            return new Date(`${y}-${m}-${d}`)
          }

          // ── Datos base de cada tab ──────────────────────────────────
          const mockVisitas = [
            { fecha:'20/04/2026', hora:'14:30', cliente:'Juan García',     email:'juan.garcia@gmail.com', puntos:100, unidad:unitIcon, descuento:'-'   },
            { fecha:'20/04/2026', hora:'12:15', cliente:'María López',     email:'mlopez@hotmail.com',    puntos:100, unidad:unitIcon, descuento:'10%' },
            { fecha:'19/04/2026', hora:'18:45', cliente:'Carlos Rodríguez',email:'carlos.r@gmail.com',    puntos:200, unidad:unitIcon, descuento:'-'   },
            { fecha:'19/04/2026', hora:'09:20', cliente:'Ana Martínez',    email:'ana.m@gmail.com',       puntos:100, unidad:unitIcon, descuento:'15%' },
            { fecha:'18/04/2026', hora:'16:00', cliente:'Pedro Sánchez',   email:'pedro.s@gmail.com',     puntos:100, unidad:unitIcon, descuento:'-'   },
          ]
          const mockCanjes = [
            { fecha:'20/04/2026', hora:'14:30', cliente:'Juan García',     email:'juan.garcia@gmail.com', premio:'Café Gratis',   puntos_gastados:500, unidad:unitIcon },
            { fecha:'19/04/2026', hora:'11:00', cliente:'María López',     email:'mlopez@hotmail.com',    premio:'Descuento 20%', puntos_gastados:750, unidad:unitIcon },
            { fecha:'18/04/2026', hora:'15:30', cliente:'Carlos Rodríguez',email:'carlos.r@gmail.com',    premio:'Café Gratis',   puntos_gastados:500, unidad:unitIcon },
          ]
          const mockClientRows = [
            { profiles:{ full_name:'Juan García',      email:'juan.garcia@gmail.com', phone:'+54123456789' }, joined_at: new Date(Date.now()-60*864e5).toISOString(), visits_count:8,  points:340, stars:0, last_visit: new Date(Date.now()-2*864e5).toISOString()  },
            { profiles:{ full_name:'María López',       email:'mlopez@hotmail.com',    phone:'+54123456790' }, joined_at: new Date(Date.now()-30*864e5).toISOString(), visits_count:4,  points:180, stars:0, last_visit: new Date(Date.now()-7*864e5).toISOString()  },
            { profiles:{ full_name:'Carlos Rodríguez',  email:'carlos.r@gmail.com',    phone:'+54123456791' }, joined_at: new Date(Date.now()-90*864e5).toISOString(), visits_count:12, points:500, stars:0, last_visit: new Date(Date.now()-1*864e5).toISOString()  },
          ]

          const baseVisitas = reportsData.length > 0 ? reportsData : mockVisitas
          const baseCanjes  = reportsData.length > 0 ? reportsData : mockCanjes
          const baseClients = members.length > 0 ? members : mockClientRows
          const isMockVisitas = reportsData.length === 0
          const isMockClients = members.length === 0

          // ── Aplicar filtros ─────────────────────────────────────────
          const q    = reportsSearch.toLowerCase().trim()
          const from = reportsDateFrom ? new Date(reportsDateFrom) : null
          const to   = reportsDateTo   ? new Date(reportsDateTo + 'T23:59:59') : null

          function matchesSearch(cliente, email, phone) {
            if (!q) return true
            return (cliente||'').toLowerCase().includes(q)
                || (email  ||'').toLowerCase().includes(q)
                || (phone  ||'').toLowerCase().includes(q)
          }
          function matchesDate(fechaStr) {
            const d = parseFecha(fechaStr)
            if (!d) return true
            if (from && d < from) return false
            if (to   && d > to  ) return false
            return true
          }
          function matchesDateISO(isoStr) {
            const d = isoStr ? new Date(isoStr) : null
            if (!d) return true
            if (from && d < from) return false
            if (to   && d > to  ) return false
            return true
          }

          const filteredVisitas = baseVisitas.filter(r =>
            matchesSearch(r.cliente, r.email, '') && matchesDate(r.fecha)
          )
          const filteredCanjes = baseCanjes.filter(r =>
            matchesSearch(r.cliente, r.email, '') && matchesDate(r.fecha)
          )
          const filteredClients = baseClients.filter(m =>
            matchesSearch((m.profiles?.display_name || m.profiles?.full_name || m.profiles?.name), m.profiles?.email, m.profiles?.phone)
            && matchesDateISO(m.joined_at)
          )

          // ── Export ──────────────────────────────────────────────────
          const exportClientRows = filteredClients.map(m => ({
            'Nombre':        (m.profiles?.display_name || m.profiles?.full_name || m.profiles?.name) || '–',
            'Email':         m.profiles?.email     || '–',
            'Teléfono':      m.profiles?.phone      || '–',
            'Fecha de alta': m.joined_at ? new Date(m.joined_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '–',
            'Visitas':       m.visits_count || 0,
            [unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)]: form?.prog_type === 'stars' ? (m.stars || 0) : (m.points || 0),
            'Última visita': m.last_visit ? new Date(m.last_visit).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '–',
          }))

          const filteredForExport = reportsTab === 'clientes' ? exportClientRows
            : reportsTab === 'visitas' ? filteredVisitas : filteredCanjes
          const totalFiltered = filteredForExport.length

          const stats = {
            total:  totalFiltered,
            periodo: (reportsDateFrom || reportsDateTo)
              ? `${reportsDateFrom || '…'} → ${reportsDateTo || '…'}`
              : reportsTab === 'clientes'
                ? `${baseClients.length} socios`
                : baseVisitas.length > 0 && !isMockVisitas
                  ? `${baseVisitas[baseVisitas.length-1]?.fecha||'–'} a ${baseVisitas[0]?.fecha||'–'}`
                  : '18/04 a 20/04/2026',
          }

          function handleExportCSV()   { exportToCSV(filteredForExport,   `${reportsTab}-${today}`) }
          function handleExportExcel() { exportToExcel(filteredForExport, `${reportsTab}-${today}`, reportsTab) }

          return (
            <div>
              <div style={{ marginBottom:24 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, letterSpacing:'.08em', textTransform:'uppercase' }}>Reportes</div>
                  <InfoHint align="left" text={
                    'Datos crudos de tu actividad: cada visita registrada, cada canje y la lista completa de tus clientes.\n\n' +
                    'Útil para revisar el día a día (ej. ver qué clientes vinieron hoy), exportar tu base, o cruzar números a fin de mes.\n\n' +
                    'Si querés gráficos resumidos en vez de tablas, mirá la pestaña Análisis.'
                  } />
                </div>
                <div style={{ fontSize:13, color:C.mist }}>Historial de visitas, canjes y base de clientes.</div>
              </div>

              {/* Tabs */}
              <div style={{ display:'flex', gap:8, marginBottom:20, borderBottom:`1px solid ${C.rim}`, paddingBottom:10, flexWrap:'wrap' }}>
                {[
                  { id:'clientes',     label:'Clientes'  },
                  { id:'visitas',      label:'Visitas'   },
                  { id:'redemptions',  label:'Canjes'    },
                ].map(t => (
                  <button key={t.id} onClick={() => setReportsTab(t.id)}
                    style={{ padding:'8px 16px', background: reportsTab===t.id ? `${C.v}22` : 'transparent', border: reportsTab===t.id ? `1px solid ${C.v}` : `1px solid ${C.rim}`, borderRadius:8, color: reportsTab===t.id ? C.v : C.mist, fontFamily:FN, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Filtros — colapsable. Header con ícono lupa + título "Búsqueda";
                  click expande el panel con search, fechas y limpiar. Si el user
                  tiene filtros aplicados se muestra un chip "FILTRADO" en el
                  header para que no quede "oculto" lo que se está filtrando. */}
              {(() => {
                const hasFilters = !!(reportsSearch || reportsDateFrom || reportsDateTo)
                return (
                  <PCard style={{ padding:0, marginBottom:16, overflow:'hidden' }}>
                    <button
                      onClick={() => setAnalysisFiltersOpen(o => !o)}
                      style={{
                        width:'100%',
                        display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
                        padding:'12px 16px',
                        background:'transparent', border:'none', cursor:'pointer',
                        fontFamily:'inherit',
                      }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{ width:26, height:26, borderRadius:7, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.rim}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Search size={13} color={C.mist} strokeWidth={2} />
                        </div>
                        <span style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, letterSpacing:'.02em' }}>Búsqueda</span>
                        {hasFilters && (
                          <span style={{ fontSize:9, fontWeight:800, color:C.v, background:`${C.v}22`, border:`1px solid ${C.v}40`, padding:'2px 7px', borderRadius:99, letterSpacing:'.06em' }}>FILTRADO</span>
                        )}
                      </div>
                      {analysisFiltersOpen
                        ? <ChevronUp size={15} color={C.mist} strokeWidth={2.2} />
                        : <ChevronDown size={15} color={C.mist} strokeWidth={2.2} />}
                    </button>
                    {analysisFiltersOpen && (
                      <div style={{ padding:'4px 16px 14px', borderTop:`1px solid ${C.rim}` }}>
                        {/* Búsqueda por texto */}
                        <div style={{ position:'relative', margin:'12px 0 10px' }}>
                          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', display:'flex', alignItems:'center' }}><Search size={12} color={C.dust} strokeWidth={2} /></span>
                          <input
                            type="text"
                            value={reportsSearch}
                            onChange={e => setReportsSearch(e.target.value)}
                            placeholder="Buscar por nombre, email o teléfono..."
                            style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:9, padding:'9px 30px 9px 30px', fontSize:12, color:C.pearl, fontFamily:FI, outline:'none', boxSizing:'border-box' }}
                          />
                          {reportsSearch && (
                            <button onClick={() => setReportsSearch('')}
                              style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:C.dust, fontSize:13, cursor:'pointer', lineHeight:1 }}>✕</button>
                          )}
                        </div>
                        {/* Rango de fechas */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                          <div>
                            <div style={{ fontSize:9, color:C.dust, marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em' }}>Desde</div>
                            <input type="date" value={reportsDateFrom} onChange={e => setReportsDateFrom(e.target.value)}
                              style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:9, padding:'8px 10px', fontSize:12, color: reportsDateFrom ? C.pearl : C.dust, fontFamily:FI, outline:'none', boxSizing:'border-box' }} />
                          </div>
                          <div>
                            <div style={{ fontSize:9, color:C.dust, marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em' }}>Hasta</div>
                            <input type="date" value={reportsDateTo} onChange={e => setReportsDateTo(e.target.value)}
                              style={{ width:'100%', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:9, padding:'8px 10px', fontSize:12, color: reportsDateTo ? C.pearl : C.dust, fontFamily:FI, outline:'none', boxSizing:'border-box' }} />
                          </div>
                        </div>
                        {hasFilters && (
                          <button onClick={() => { setReportsSearch(''); setReportsDateFrom(''); setReportsDateTo('') }}
                            style={{ marginTop:10, background:'transparent', border:`1px solid ${C.rim}`, borderRadius:8, padding:'6px 14px', color:C.dust, fontSize:11, cursor:'pointer', fontFamily:FN, fontWeight:600 }}>
                            ✕ Limpiar filtros
                          </button>
                        )}

                        {/* Stats — dentro del accordion para mantener todo
                            lo "informativo de la búsqueda" agrupado en un mismo lugar. */}
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginTop:14 }}>
                          <div style={{ background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'10px 12px' }}>
                            <div style={{ fontSize:9, color:C.dust, marginBottom:3, textTransform:'uppercase', letterSpacing:'.06em' }}>Resultados</div>
                            <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, lineHeight:1.1 }}>{stats.total}</div>
                          </div>
                          <div style={{ background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'10px 12px' }}>
                            <div style={{ fontSize:9, color:C.dust, marginBottom:3, textTransform:'uppercase', letterSpacing:'.06em' }}>Período</div>
                            <div style={{ fontFamily:FN, fontSize:12, fontWeight:700, color:C.white, lineHeight:1.3 }}>{stats.periodo}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </PCard>
                )
              })()}

              {/* Export buttons */}
              <div style={{ display:'flex', gap:10, marginBottom:20 }}>
                <button onClick={handleExportCSV}
                  style={{ flex:1, padding:'10px 16px', background:`${C.v}22`, border:`1px solid ${C.v}`, borderRadius:10, color:C.v, fontFamily:FN, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  Descargar CSV
                </button>
                <button onClick={handleExportExcel}
                  style={{ flex:1, padding:'10px 16px', background:`${C.v}22`, border:`1px solid ${C.v}`, borderRadius:10, color:C.v, fontFamily:FN, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  Descargar Excel
                </button>
              </div>

              {/* ── Tabla clientes ── */}
              {reportsTab === 'clientes' && (() => {
                return (
                  <>
                    {isMockClients && (
                      <div style={{ marginBottom:10, padding:'8px 12px', background:`${C.info}11`, border:`1px solid ${C.info}33`, borderRadius:10, fontSize:11, color:C.info }}>
                        👁 Ejemplo — así se verá tu base de clientes registrados.
                      </div>
                    )}
                    {filteredClients.length === 0 && (
                      <div style={{ textAlign:'center', padding:'30px 0', color:C.dust, fontSize:13 }}>Sin resultados para los filtros aplicados.</div>
                    )}
                    <div style={{ overflowX:'auto', borderRadius:12, border:`1px solid ${C.rim}` }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead>
                          <tr style={{ background:C.bg3, borderBottom:`1px solid ${C.rim}` }}>
                            <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600, whiteSpace:'nowrap' }}>Nombre</th>
                            <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600, whiteSpace:'nowrap' }}>Email</th>
                            <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600, whiteSpace:'nowrap' }}>Teléfono</th>
                            <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600, whiteSpace:'nowrap' }}>Fecha de alta</th>
                            <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600, whiteSpace:'nowrap' }}>Visitas</th>
                            <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600, whiteSpace:'nowrap' }}>{unitIcon} Saldo</th>
                            <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600, whiteSpace:'nowrap' }}>Última visita</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredClients.map((m, i) => {
                            const saldo = form?.prog_type === 'stars' ? (m.stars || 0) : (m.points || 0)
                            const alta  = m.joined_at ? new Date(m.joined_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '–'
                            const ultima = m.last_visit ? new Date(m.last_visit).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '–'
                            return (
                              <tr key={i} style={{ borderBottom:`1px solid ${C.rim}`, background: i%2 === 0 ? 'transparent' : `${C.bg3}30` }}>
                                <td style={{ padding:'10px 12px', color:C.white, fontWeight:600, whiteSpace:'nowrap' }}>{(m.profiles?.display_name || m.profiles?.full_name || m.profiles?.name) || '–'}</td>
                                <td style={{ padding:'10px 12px', color:C.mist }}>{m.profiles?.email || <span style={{ color:C.dust }}>–</span>}</td>
                                <td style={{ padding:'10px 12px', color:C.mist, whiteSpace:'nowrap' }}>{m.profiles?.phone || <span style={{ color:C.dust }}>–</span>}</td>
                                <td style={{ padding:'10px 12px', color:C.dust, whiteSpace:'nowrap' }}>{alta}</td>
                                <td style={{ padding:'10px 12px', color:C.mist, textAlign:'center' }}>{m.visits_count || 0}</td>
                                <td style={{ padding:'10px 12px', color:unitColor, fontFamily:FN, fontWeight:700, textAlign:'center' }}>{saldo}</td>
                                <td style={{ padding:'10px 12px', color:C.dust, whiteSpace:'nowrap' }}>{ultima}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              })()}

              {/* ── Tabla visitas / canjes ── */}
              {reportsTab !== 'clientes' && (() => {
                const displayData = reportsTab === 'visitas' ? filteredVisitas : filteredCanjes
                const isMockData  = reportsData.length === 0
                if (reportsLoading) return <div style={{ textAlign:'center', padding:'40px 0', color:C.dust }}>⟳ Cargando...</div>
                return (
                  <>
                    {isMockData && (
                      <div style={{ marginBottom:10, padding:'8px 12px', background:`${C.info}11`, border:`1px solid ${C.info}33`, borderRadius:10, fontSize:11, color:C.info }}>
                        👁 Ejemplo — así se verá el historial de {reportsTab === 'visitas' ? 'visitas' : 'canjes'} de tus clientes.
                      </div>
                    )}
                    {displayData.length === 0 && (
                      <div style={{ textAlign:'center', padding:'30px 0', color:C.dust, fontSize:13 }}>Sin resultados para los filtros aplicados.</div>
                    )}
                    {displayData.length > 0 && <div style={{ overflowX:'auto', borderRadius:12, border:`1px solid ${C.rim}` }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead>
                          <tr style={{ background:C.bg3, borderBottom:`1px solid ${C.rim}` }}>
                            {reportsTab === 'visitas' ? (
                              <>
                                <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Fecha</th>
                                <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Cliente</th>
                                <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Puntos</th>
                                <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Descuento</th>
                              </>
                            ) : (
                              <>
                                <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Fecha</th>
                                <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Cliente</th>
                                <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Premio</th>
                                <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Costo</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {displayData.slice(0,50).map((row, i) => (
                            <tr key={i} style={{ borderBottom:`1px solid ${C.rim}`, background: i%2 === 0 ? 'transparent' : `${C.bg3}30` }}>
                              <td style={{ padding:'10px 12px', color:C.white }}>{row.fecha} {row.hora}</td>
                              <td style={{ padding:'10px 12px', color:C.mist, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.cliente}</td>
                              <td style={{ padding:'10px 12px', color:C.white, fontFamily:FN, fontWeight:700 }}>{reportsTab === 'visitas' ? `${row.puntos} ${row.unidad}` : row.premio}</td>
                              {reportsTab === 'visitas' && <td style={{ padding:'10px 12px', color:row.descuento === '-' ? C.dust : C.o, fontFamily:FN, fontWeight:700 }}>{row.descuento}</td>}
                              {reportsTab === 'redemptions' && <td style={{ padding:'10px 12px', color:C.white, fontFamily:FN, fontWeight:700 }}>{row.puntos_gastados} {row.unidad}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>}
                  </>
                )
              })()}
            </div>
          )
        })()}

        {/* ── SEGMENTACIÓN ── */}
        {/* SECCIÓN B: Segmentación */}
        {tab === 'analisis' && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:24, marginBottom:12 }}>
            <span style={{ fontSize:13, fontWeight:800, color:C.white, letterSpacing:'.10em', textTransform:'uppercase' }}>Segmentación</span>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
          </div>
        )}
        {tab === 'analisis' && (() => {
          const handleSegmentClick = (seg) => {
            setSelectedSegment(seg)
            fetch(`/api/segments/${seg}?commerce_id=${commerce.id}&limit=200`)
              .then(r => r.json())
              .then(d => {
                if (d.data && d.data.length > 0) {
                  setSegmentClients(d.data)
                } else {
                  // Mock data de clientes por segmento
                  const mockBySegment = {
                    nuevos: [
                      { nombre: 'Sofia Mendez', email: 'sofia@example.com', visitas: 1, saldo: 5, ultima_visita: '20/04/2026' },
                      { nombre: 'Diego Alvarez', email: 'diego@example.com', visitas: 2, saldo: 8, ultima_visita: '19/04/2026' },
                      { nombre: 'Laura Ponce', email: 'laura@example.com', visitas: 1, saldo: 3, ultima_visita: '18/04/2026' },
                      { nombre: 'Roberto Silva', email: 'roberto@example.com', visitas: 2, saldo: 7, ultima_visita: '17/04/2026' },
                      { nombre: 'Valentina Ruiz', email: 'val@example.com', visitas: 1, saldo: 4, ultima_visita: '16/04/2026' },
                    ],
                    frecuentes: [
                      { nombre: 'Juan Pérez', email: 'juan@example.com', visitas: 8, saldo: 45, ultima_visita: '20/04/2026' },
                      { nombre: 'María García', email: 'maria@example.com', visitas: 12, saldo: 78, ultima_visita: '20/04/2026' },
                      { nombre: 'Carlos López', email: 'carlos@example.com', visitas: 6, saldo: 32, ultima_visita: '19/04/2026' },
                      { nombre: 'Ana Rodríguez', email: 'ana@example.com', visitas: 10, saldo: 62, ultima_visita: '20/04/2026' },
                      { nombre: 'Pedro Martínez', email: 'pedro@example.com', visitas: 7, saldo: 41, ultima_visita: '18/04/2026' },
                      { nombre: 'Isabel Sánchez', email: 'isabel@example.com', visitas: 9, saldo: 55, ultima_visita: '17/04/2026' },
                      { nombre: 'Fernando Díaz', email: 'fernando@example.com', visitas: 11, saldo: 71, ultima_visita: '19/04/2026' },
                      { nombre: 'Gabriela Torres', email: 'gabriela@example.com', visitas: 5, saldo: 28, ultima_visita: '20/04/2026' },
                    ],
                    vip: [
                      { nombre: 'Miguel Ángel Castro', email: 'miguel@example.com', visitas: 25, saldo: 180, ultima_visita: '20/04/2026' },
                      { nombre: 'Carmen Valencia', email: 'carmen@example.com', visitas: 22, saldo: 165, ultima_visita: '20/04/2026' },
                      { nombre: 'Francisco Herrera', email: 'francisco@example.com', visitas: 18, saldo: 145, ultima_visita: '19/04/2026' },
                      { nombre: 'Patricia Molina', email: 'patricia@example.com', visitas: 20, saldo: 155, ultima_visita: '20/04/2026' },
                    ],
                    inactivos: [
                      { nombre: 'Alejandro Vega', email: 'alejandro@example.com', visitas: 3, saldo: 12, ultima_visita: '02/03/2026' },
                      { nombre: 'Mariela Costa', email: 'mariela@example.com', visitas: 2, saldo: 8, ultima_visita: '28/02/2026' },
                      { nombre: 'Javier Rojas', email: 'javier@example.com', visitas: 4, saldo: 18, ultima_visita: '15/02/2026' },
                    ]
                  }
                  setSegmentClients(mockBySegment[seg] || [])
                }
              })
              .catch(() => {
                // Mock data si hay error
                const mockBySegment = {
                  nuevos: [
                    { nombre: 'Sofia Mendez', email: 'sofia@example.com', visitas: 1, saldo: 5, ultima_visita: '20/04/2026' },
                    { nombre: 'Diego Alvarez', email: 'diego@example.com', visitas: 2, saldo: 8, ultima_visita: '19/04/2026' },
                  ],
                  frecuentes: [
                    { nombre: 'Juan Pérez', email: 'juan@example.com', visitas: 8, saldo: 45, ultima_visita: '20/04/2026' },
                    { nombre: 'María García', email: 'maria@example.com', visitas: 12, saldo: 78, ultima_visita: '20/04/2026' },
                  ],
                  vip: [
                    { nombre: 'Miguel Ángel Castro', email: 'miguel@example.com', visitas: 25, saldo: 180, ultima_visita: '20/04/2026' },
                  ],
                  inactivos: [
                    { nombre: 'Alejandro Vega', email: 'alejandro@example.com', visitas: 3, saldo: 12, ultima_visita: '02/03/2026' },
                  ]
                }
                setSegmentClients(mockBySegment[seg] || [])
              })
          }

          // ── Render unificado: la grilla de segmentos NO desaparece al
          // seleccionar uno. El seleccionado se pinta "activo" (filled con su
          // color) y los demás quedan apagados. El detalle (título + tabla)
          // aparece debajo de la grilla. Toggle: tap en el activo lo desactiva. ──
          const SEGMENT_ICONS = { nuevos:UserPlus, frecuentes:Flame, vip:Star, inactivos:Clock }
          const SEGMENT_TIPS  = {
            nuevos:     'Clientes con 1-2 visitas. Son nuevos en el club — ideal para causar buena primera impresión.',
            frecuentes: 'Clientes con visitas regulares. Vuelven seguido y responden bien a premios y promos.',
            vip:        'Tus mejores clientes por cantidad de visitas acumuladas. Merecen atención especial.',
            inactivos:  'Sin visitas en los últimos 30 días. Buen momento para activarlos con una promoción.',
          }

          return (
            <div>
              <div style={{ marginBottom:24 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, letterSpacing:'.08em', textTransform:'uppercase' }}>Segmentación de clientes</div>
                  <InfoHint align="left" text={
                    'Tus clientes se agrupan automáticamente en 4 segmentos según su comportamiento:\n\n' +
                    '• Nuevos: clientes con menos de 14 días desde su primera visita.\n\n' +
                    '• Frecuentes: vienen seguido (3+ visitas en los últimos 30 días).\n\n' +
                    '• VIP: tus mejores clientes — los que más visitas o gasto acumulan.\n\n' +
                    '• Inactivos: hace más de 30 días que no escanean su QR.\n\n' +
                    'Tocá un segmento para ver el listado y enviarles mensajes.'
                  } />
                </div>
                <div style={{ fontSize:13, color:C.mist }}>Analiza comportamiento y segmenta tu base de clientes.</div>
              </div>
              {loadingSegments ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:C.dust }}>⟳ Cargando segmentos...</div>
              ) : segments ? (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                  {Object.entries(segments).map(([key, seg]) => {
                    const isActive  = selectedSegment === key
                    const hasOther  = selectedSegment && !isActive
                    const SegIcon   = SEGMENT_ICONS[key]
                    const baseStyle = {
                      padding:16, borderRadius:12, cursor:'pointer',
                      transition:'background 160ms ease, border-color 160ms ease, opacity 160ms ease',
                      textAlign:'center',
                    }
                    const activeStyle = {
                      background:`linear-gradient(145deg, ${seg.color}D9, ${seg.color}AA)`,
                      border:`1px solid ${seg.color}`,
                      boxShadow:`0 8px 24px -8px ${seg.color}80`,
                    }
                    const inactiveStyle = {
                      background: hasOther ? 'rgba(255,255,255,0.02)' : C.card,
                      border:`1px solid ${C.rim}`,
                      opacity: hasOther ? 0.45 : 1,
                    }
                    return (
                      <button key={key}
                        onClick={() => isActive
                          ? (setSelectedSegment(null), setSegmentClients([]))
                          : handleSegmentClick(key)
                        }
                        style={{ ...baseStyle, ...(isActive ? activeStyle : inactiveStyle) }}
                        onMouseEnter={(e) => { if (!isActive && !hasOther) { e.currentTarget.style.borderColor = seg.color; e.currentTarget.style.background = `${seg.color}15` } }}
                        onMouseLeave={(e) => { if (!isActive && !hasOther) { e.currentTarget.style.borderColor = C.rim; e.currentTarget.style.background = C.card } }}>
                        <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
                          {SegIcon && <SegIcon size={26} color={isActive ? '#fff' : seg.color} strokeWidth={1.5} />}
                        </div>
                        <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color: isActive ? '#fff' : seg.color, marginBottom:4 }}>
                          {seg.label}{!isActive && SEGMENT_TIPS[key] && <InfoTooltip text={SEGMENT_TIPS[key]} />}
                        </div>
                        <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color: isActive ? '#fff' : C.white, marginBottom:4 }}>{seg.count}</div>
                        <div style={{ fontSize:11, color: isActive ? 'rgba(255,255,255,0.85)' : C.dust }}>{seg.percent}% del total</div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'40px 0', color:C.dust }}>Error al cargar segmentos</div>
              )}

              {/* ── Detalle del segmento seleccionado — debajo de la grilla,
                  los botones siguen visibles arriba con el activo destacado. ── */}
              {selectedSegment && segments?.[selectedSegment] && (() => {
                const seg = segments[selectedSegment]
                const SegIcon = SEGMENT_ICONS[selectedSegment]
                const segColor = seg.color || C.white
                return (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                      {SegIcon && <SegIcon size={22} color={segColor} strokeWidth={1.8} />}
                      <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:segColor }}>{seg.label}</div>
                      <div style={{ fontSize:12, color:C.dust }}>· {seg.count} clientes</div>
                    </div>
                    <div style={{ overflowX:'auto', borderRadius:12, border:`1px solid ${segColor}33`, marginBottom:20 }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead>
                          <tr style={{ background:`${segColor}10`, borderBottom:`1px solid ${segColor}33` }}>
                            <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Cliente</th>
                            <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Visitas</th>
                            <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Saldo</th>
                            <th style={{ padding:'10px 12px', textAlign:'left', color:C.mist, fontWeight:600 }}>Última visita</th>
                          </tr>
                        </thead>
                        <tbody>
                          {segmentClients.map((c, i) => (
                            <tr key={i} style={{ borderBottom:`1px solid ${C.rim}` }}>
                              <td style={{ padding:'10px 12px', color:C.white }}>{c.nombre}</td>
                              <td style={{ padding:'10px 12px', color:C.mist }}>{c.visitas}</td>
                              <td style={{ padding:'10px 12px', color:C.white, fontFamily:FN, fontWeight:700 }}>{c.saldo}</td>
                              <td style={{ padding:'10px 12px', color:C.mist }}>{c.ultima_visita}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })()}

        {/* ── HISTORIAL ── */}
        {tab === 'historial' && (() => {
          const TYPE_META = {
            settings:      { Icon: Settings,  color: C.mist },
            prize_added:   { Icon: Gift,      color: C.mist },
            prize_toggled: { Icon: RefreshCw, color: C.mist },
            prize_deleted: { Icon: Trash2,    color: C.dust },
            promo_added:   { Icon: Flame,     color: C.mist },
            promo_toggled: { Icon: RefreshCw, color: C.mist },
            promo_deleted: { Icon: Trash2,    color: C.dust },
            member_joined: { Icon: UserPlus,  color: C.ok   },
          }
          function timeAgo(iso) {
            const d = new Date(iso)
            const fecha = d.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'})
            const hora  = d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
            return `${fecha} · ${hora}`
          }
          return (
            <div>
              <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, marginBottom:4, letterSpacing:'.08em', textTransform:'uppercase' }}>Historial</div>
              <div style={{ fontSize:12, color:C.mist, marginBottom:20 }}>Cambios recientes en tu negocio.</div>
              <HelpBanner
                id="merchant-historial"
                title="Línea de tiempo de tu club"
                body="Cada cambio importante queda registrado: cuando creás o pausás un premio, cambiás el sistema de recompensas, agregás una promoción o se suma un cliente nuevo. Te sirve para tener trazabilidad de lo que hiciste."
              />
              {activity.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:C.dust, fontSize:13 }}>
                  Aún no hay actividad registrada.<br/>
                  <span style={{ fontSize:11 }}>Los cambios que hagas aparecerán acá.</span>
                </div>
              ) : (
                <div style={{ position:'relative' }}>
                  <div style={{ position:'absolute', left:17, top:0, bottom:0, width:1, background:C.rim }} />
                  {activity.map((a, i) => {
                    const meta = TYPE_META[a.type] || { Icon: null, color: C.mist }
                    return (
                      <div key={a.id} style={{ display:'flex', gap:14, marginBottom:16, position:'relative' }}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background:C.bg3, border:`1.5px solid ${meta.color}44`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, zIndex:1 }}>
                          {(() => { const I = meta.Icon; return I ? <I size={15} color={meta.color} strokeWidth={2} /> : <span style={{ fontSize:8, color:meta.color }}>·</span>; })()}
                        </div>
                        <div style={{ flex:1, paddingTop:6 }}>
                          <div style={{ fontSize:13, color:C.white, lineHeight:1.4 }}>{a.description}</div>
                          <div style={{ fontSize:10, color:C.dust, marginTop:3 }}>{timeAgo(a.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── PLANES — pestaña propia (separada de Configuración para que esa
            no se haga eterna). El section header anterior "Plan y facturación"
            ya no hace falta porque acá es la pestaña entera. ── */}
        {tab === 'planes' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, letterSpacing:'.08em', textTransform:'uppercase' }}>Planes</div>
              <InfoHint align="left" text={
                'FREE: gratis, hasta 30 clientes, sin promociones extra ni mensajes automáticos.\n\n' +
                'STARTER: hasta 60 clientes y desbloqueás Recompensas extra (cupón próxima visita y días con bonus ×2).\n\n' +
                'PRO: clientes ilimitados, todas las promos y Automatizaciones de WhatsApp.\n\n' +
                'Podés cambiar de plan cuando quieras.'
              } />
            </div>
            <div style={{ fontSize:12, color:C.mist, marginBottom:18 }}>Elegí el plan que mejor se adapta a tu negocio.</div>

            {/* Banner del plan actual — destacado para que el usuario sepa
                exactamente qué tiene contratado y qué se está perdiendo. */}
            <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:12, background:`linear-gradient(135deg, ${planDef.color}22, ${planDef.color}10)`, border:`1px solid ${planDef.color}44`, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:10, background:`${planDef.color}33`, border:`1px solid ${planDef.color}66`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <CreditCard size={20} color={planDef.color} strokeWidth={2} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, color:C.dust, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:2 }}>Tu plan actual</div>
                <div style={{ fontFamily:FN, fontSize:16, fontWeight:900, color:planDef.color, lineHeight:1.1 }}>{planDef.label}</div>
                {planKey === 'free' && (
                  <div style={{ fontSize:11, color:C.mist, marginTop:3, lineHeight:1.4 }}>Estás perdiendo promociones, ×2 puntos y más clientes activos. Mirá abajo lo que desbloqueás.</div>
                )}
              </div>
            </div>

            {/* Alerta de límite */}
            {atLimit && (
              <div style={{ marginBottom:22 }}>
                <InfoBanner type="limit" icon={Lock}>
                  <strong style={{ fontWeight:700 }}>Límite de clientes alcanzado.</strong> Actualizá tu plan para seguir sumando clientes.
                </InfoBanner>
              </div>
            )}
            {nearLimit && !atLimit && (
              <div style={{ marginBottom:22 }}>
                <InfoBanner type="warning" icon={Bell}>
                  Estás por alcanzar el límite de tu plan (<strong style={{ fontWeight:700 }}>{clientCount}/{planDef.limit}</strong> clientes).
                </InfoBanner>
              </div>
            )}

            <PlanCards
              currentPlan={planKey}
              clientCount={clientCount}
              planLimit={planDef.limit}
              onUpgrade={upgradePlan}
            />

            <div style={{ fontSize:11, color:C.dust, textAlign:'center', marginTop:24, lineHeight:1.8 }}>
              Los planes son gestionados por el equipo de Benefix.<br />
              Los clientes existentes nunca se eliminan al cambiar de plan.
            </div>
          </div>
        )}

        {/* ── CONFIGURACIÓN ── */}
        {tab === 'configuracion' && (() => {
          const profileFields = [
            !!form?.name && form.name.trim().length >= 3,
            !!form?.category,
            !!form?.description && form.description.trim().length >= 10,
            !!form?.img_url,
            !!form?.phone && form.phone.replace(/\D/g,'').length >= 10,
            !!(form?.instagram || form?.facebook),
            !!(form?.province && form?.city_name),
            !!form?.address,
            !!(hoursForm && Object.values(hoursForm).some(d => d.open)),
          ]
          const profileDone  = profileFields.filter(Boolean).length
          const profileTotal = profileFields.length
          const profilePct   = Math.round((profileDone / profileTotal) * 100)

          const FieldLabel = ({ children, required, optional }) => (
            <div style={{ fontSize:11, color:C.mist, fontWeight:700, marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
              {children}
              {required && <span style={{ color:'#f87171', fontSize:10 }}>*</span>}
              {optional && <span style={{ color:C.dust, fontWeight:400, fontSize:10 }}>(opcional)</span>}
            </div>
          )
          const FieldError = ({ field }) => configErrors[field]
            ? <div style={{ fontSize:11, color:'#f87171', marginTop:4 }}>⚠ {configErrors[field]}</div>
            : null
          const SectionTitle = ({ Icon: SIcon, children }) => (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, marginTop:4 }}>
              {SIcon && <SIcon size={15} color='rgba(255,255,255,0.50)' strokeWidth={2} />}
              <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{children}</div>
              <div style={{ flex:1, height:1, background:C.rim, marginLeft:4 }} />
            </div>
          )
          // Helper para acordeón: por default todas las secciones colapsadas,
          // al abrir una se cierra la anterior automáticamente (un único id
          // abierto a la vez en expandedConfigSection).
          const ConfigAccordion = ({ id, Icon: AIcon, label, children }) => {
            const isOpen = expandedConfigSection === id
            return (
              <div style={{ marginBottom:10, borderRadius:14, overflow:'hidden', background:C.card, border:`1px solid ${isOpen ? `${C.v}55` : C.rim}`, transition:'border-color .2s ease' }}>
                <button onClick={() => setExpandedConfigSection(isOpen ? null : id)}
                  style={{ width:'100%', padding:'14px 18px', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, textAlign:'left', fontFamily:'inherit' }}>
                  {AIcon && <AIcon size={16} color={isOpen ? C.v : 'rgba(255,255,255,0.55)'} strokeWidth={2} style={{ flexShrink:0 }} />}
                  <span style={{ flex:1, fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{label}</span>
                  <ChevronDown size={16} color={isOpen ? C.v : C.mist} strokeWidth={2}
                    style={{ transition:'transform .2s ease', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink:0 }} />
                </button>
                {isOpen && (
                  <div style={{ padding:'4px 20px 20px', borderTop:`1px solid ${C.rim}` }}>
                    {children}
                  </div>
                )}
              </div>
            )
          }
          const iStyle = (hasErr) => ({
            background:'rgba(0,0,0,0.30)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
            border:`1px solid ${hasErr ? '#f87171' : C.rim}`,
            borderRadius:10, padding:'10px 13px', fontSize:13, color:C.pearl,
            width:'100%', fontFamily:FI, boxSizing:'border-box',
          })

          return (
            <div style={{ paddingBottom:72 }}>

              <HelpBanner
                id="merchant-configuracion"
                title="Configurás tu negocio"
                body="Acá completás los datos que ven tus clientes (foto, descripción, dirección, horarios), elegís el plan, configurás el sistema y manejás tu cuenta. Cada sección abre y cierra como un acordeón — tocá la que quieras editar."
              />

              {/* Onboarding banner */}
              {showOnboardingBanner && (
                <div style={{ background:'linear-gradient(135deg,rgba(124,92,237,0.18),rgba(254,80,0,0.10))', border:'1px solid rgba(189,75,248,0.28)', borderRadius:16, padding:'16px 18px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:C.white, marginBottom:4 }}>Completá tu perfil</div>
                    <div style={{ fontSize:12, color:C.mist, lineHeight:1.5 }}>Cuanta más info tengas, más fácil te van a encontrar tus clientes. Empezá con el nombre y la categoría.</div>
                  </div>
                  <button onClick={() => setShowOnboardingBanner(false)} style={{ background:'transparent', border:'none', color:C.dust, cursor:'pointer', padding:4, flexShrink:0 }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Progreso de perfil */}
              <div style={{ marginBottom:22 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:C.white }}>Perfil del negocio</div>
                  <div style={{ fontSize:11, color: profilePct >= 100 ? C.ok : C.mist, fontWeight:600 }}>
                    {profileDone}/{profileTotal}{profilePct >= 100 ? ' ✓ Completo' : ' completos'}
                  </div>
                </div>
                <div style={{ background:C.bg3, borderRadius:99, height:5, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, width:`${profilePct}%`, background: profilePct >= 100 ? C.ok : G, transition:'width 0.4s ease' }} />
                </div>
              </div>

              {/* ── INFORMACIÓN BÁSICA ── */}
              <ConfigAccordion id="basica" Icon={Building2} label="Información básica">

                {/* Logo */}
                <div style={{ marginBottom:16 }}>
                  <FieldLabel optional>Logo del negocio</FieldLabel>
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" id="logo-input" style={{ display:'none' }}
                    onChange={e => { if (e.target.files[0]) handleLogoFileSelect(e.target.files[0]); e.target.value='' }} />
                  {form.img_url ? (
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <img src={form.img_url} alt="" style={{ width:60, height:60, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:`2px solid ${C.rim}` }} />
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <label htmlFor="logo-input" style={{ display:'inline-flex', alignItems:'center', gap:6, background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:8, padding:'6px 12px', fontSize:11, color:C.mist, cursor:'pointer' }}>
                          <Upload size={11} strokeWidth={2} />
                          {uploadingLogo ? 'Subiendo...' : 'Cambiar logo'}
                        </label>
                        <button onClick={() => set('img_url','')} style={{ background:'transparent', border:'none', color:C.dust, fontSize:11, cursor:'pointer', padding:0, textAlign:'left' }}>Quitar</button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="logo-input" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:C.bg3, border:`1px dashed ${C.rim}`, borderRadius:10, padding:'16px', fontSize:12, color:uploadingLogo?C.pearl:C.mist, cursor:'pointer' }}>
                      <Upload size={14} strokeWidth={2} />
                      {uploadingLogo ? 'Subiendo...' : 'Subir logo desde el carrete'}
                    </label>
                  )}
                </div>

                {/* Cover image */}
                <div style={{ marginBottom:16 }}>
                  <FieldLabel optional>Foto de portada</FieldLabel>
                  <input type="file" accept="image/*" id="cover-input" style={{ display:'none' }}
                    onChange={e => { if (e.target.files[0]) uploadCover(e.target.files[0]); e.target.value='' }} />
                  {form.cover_image ? (
                    <div style={{ position:'relative', borderRadius:12, overflow:'hidden' }}>
                      <img src={form.cover_image} alt="" style={{ width:'100%', height:96, objectFit:'cover', display:'block' }} />
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, display:'flex', gap:6, padding:8, background:'linear-gradient(to top,rgba(0,0,0,.7),transparent)' }}>
                        <label htmlFor="cover-input" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:C.pearl, background:'rgba(0,0,0,.5)', borderRadius:6, padding:'4px 10px', cursor:'pointer', border:'1px solid rgba(255,255,255,.2)' }}>
                          <Upload size={11} strokeWidth={2} />
                          {uploadingCover ? 'Subiendo...' : 'Cambiar portada'}
                        </label>
                        <button onClick={() => set('cover_image','')} style={{ background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.2)', borderRadius:6, padding:'4px 10px', color:C.dust, fontSize:11, cursor:'pointer' }}>Quitar</button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="cover-input" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:C.bg3, border:`1px dashed ${C.rim}`, borderRadius:10, padding:'14px', fontSize:12, color:uploadingCover?C.pearl:C.mist, cursor:'pointer' }}>
                      <Upload size={14} strokeWidth={2} />
                      {uploadingCover ? 'Subiendo...' : 'Foto de portada (visible en tu perfil público)'}
                    </label>
                  )}
                </div>

                {/* Color de tarjeta */}
                {(() => {
                  const previewHex    = form.brand_color || hashToCardColor(form.name || '')
                  const previewColors = cardColors(previewHex)
                  return (
                    <div style={{ marginBottom:16 }}>
                      <FieldLabel optional>Color de tu tarjeta</FieldLabel>
                      <div style={{ fontSize:12, color:C.dust, marginBottom:10 }}>Así van a ver tu club en sus tarjetas.</div>

                      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                        {/* Mini card preview */}
                        <div style={{ width:160, minHeight:100, borderRadius:12, overflow:'hidden', background: previewColors.bg, padding:'14px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between', border:`1px solid ${previewColors.detail}`, flexShrink:0 }}>
                          <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color: previewColors.text, lineHeight:1 }}>+150</div>
                          <div>
                            <div style={{ fontFamily:FN, fontSize:8, fontWeight:700, color: previewColors.textSub, letterSpacing:'0.11em', marginBottom:6 }}>PUNTOS</div>
                            <div style={{ fontFamily:FN, fontSize:10, fontWeight:800, color: previewColors.text, opacity:0.85 }}>{(form.name||'Tu Negocio').slice(0,16)}</div>
                          </div>
                        </div>

                        {/* Controls column */}
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          <button
                            onClick={() => setShowColorModal(true)}
                            aria-label="Cambiar color de la tarjeta"
                            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:'rgba(255,255,255,0.07)', border:`1px solid ${C.rim}`, borderRadius:10, cursor:'pointer', fontSize:13, color:C.pearl, fontFamily:FN, fontWeight:600 }}
                          >
                            <Palette size={14} strokeWidth={1.8} />
                            Cambiar color
                            <div style={{ width:16, height:16, borderRadius:'50%', background: previewHex, border:'1.5px solid rgba(255,255,255,0.30)', flexShrink:0 }} />
                          </button>
                          {form.brand_color && (
                            <button
                              onClick={() => set('brand_color', null)}
                              style={{ fontSize:11, color:C.dust, background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:'2px 2px' }}
                            >
                              Restaurar automático
                            </button>
                          )}
                        </div>
                      </div>

                      {showColorModal && (
                        <ColorPickerModal
                          initialColor={previewHex}
                          onApply={hex => set('brand_color', hex)}
                          onClose={() => setShowColorModal(false)}
                        />
                      )}
                    </div>
                  )
                })()}

                {/* Nombre */}
                <div style={{ marginBottom:14 }}>
                  <FieldLabel required>Nombre del negocio</FieldLabel>
                  <input value={form.name||''} maxLength={50}
                    onChange={e => { set('name', e.target.value); setConfigErrors(er => ({ ...er, name:'' })) }}
                    placeholder="Ej: Café El Encuentro"
                    style={iStyle(configErrors.name)} />
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, alignItems:'flex-start' }}>
                    <FieldError field="name" />
                    <span style={{ fontSize:10, color:C.dust, marginLeft:'auto' }}>{(form.name||'').length}/50</span>
                  </div>
                </div>

                {/* Categoría */}
                <div style={{ marginBottom:14 }}>
                  <FieldLabel required>Categoría</FieldLabel>
                  <select value={form.category||''} onChange={e => { set('category', e.target.value); setConfigErrors(er => ({ ...er, category:'' })) }}
                    style={{ ...iStyle(configErrors.category), appearance:'none', cursor:'pointer' }}>
                    <option value="">Seleccioná una categoría...</option>
                    {COMMERCE_FAMILIES.filter(f => f.subs.length > 0).map(fam => (
                      <optgroup key={fam.id} label={fam.name} style={{ background:'#0D0818', color:C.dust }}>
                        {fam.subs.map(s => <option key={s.name} value={s.name} style={{ background:'#0D0818', color:C.white }}>{s.name}</option>)}
                      </optgroup>
                    ))}
                    <option value="Otro" style={{ background:'#0D0818', color:C.white }}>Otro</option>
                  </select>
                  <FieldError field="category" />
                </div>

                {form.category === 'Otro' && (
                  <div style={{ marginBottom:14 }}>
                    <FieldLabel required>¿Cuál es tu rubro?</FieldLabel>
                    <input type="text" value={form.customCategory||''}
                      onChange={e => set('customCategory', e.target.value)}
                      placeholder="Ej: Florería, Fotografía..."
                      style={iStyle(false)} />
                  </div>
                )}

                {/* Descripción */}
                <div>
                  <FieldLabel optional>Descripción</FieldLabel>
                  <textarea value={form.description||''} maxLength={200}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Contá qué hace especial a tu negocio..."
                    style={{ ...iStyle(false), minHeight:72, resize:'vertical' }} />
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:3 }}>
                    <span style={{ fontSize:10, color:C.dust }}>{(form.description||'').length}/200</span>
                  </div>
                </div>
              </ConfigAccordion>

              {/* ── CONTACTO ── */}
              <ConfigAccordion id="contacto" Icon={Phone} label="Contacto">

                <div style={{ marginBottom:14 }}>
                  <FieldLabel optional>Teléfono / WhatsApp</FieldLabel>
                  <PhoneInput
                    value={form.phone || ''}
                    onChange={v => { set('phone', v); setConfigErrors(er => ({ ...er, phone:'' })) }}
                    size="md"
                  />
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, alignItems:'flex-start' }}>
                    <FieldError field="phone" />
                    <span style={{ fontSize:10, color:C.dust, marginLeft:'auto' }}>
                      {form.phone ? `${form.phone.replace(/\D/g,'').length} dígitos` : 'Se usará para contacto y automatizaciones'}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <FieldLabel optional>Instagram</FieldLabel>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:C.mist, fontSize:13, pointerEvents:'none' }}>@</span>
                    <input value={(form.instagram||'').replace(/^@/,'')}
                      onChange={e => set('instagram', e.target.value.replace(/^@/,''))}
                      placeholder="tunegocio"
                      style={{ ...iStyle(false), paddingLeft:28 }} />
                  </div>
                </div>

                <div>
                  <FieldLabel optional>Facebook</FieldLabel>
                  <input value={form.facebook||''}
                    onChange={e => set('facebook', e.target.value)}
                    placeholder="facebook.com/tunegocio"
                    style={iStyle(false)} />
                </div>
              </ConfigAccordion>

              {/* ── UBICACIÓN ── */}
              <ConfigAccordion id="ubicacion" Icon={MapPin} label="Ubicación">

                <div style={{ marginBottom:14 }}>
                  <FieldLabel optional>Provincia</FieldLabel>
                  <select value={form.province||'La Pampa'} onChange={e => { set('province', e.target.value); set('city_name', '') }}
                    style={{ ...iStyle(false), appearance:'none', cursor:'pointer' }}>
                    {Object.keys(ARGENTINA_PROVINCES).sort().map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom:14 }}>
                  <FieldLabel optional>Localidad</FieldLabel>
                  <select value={form.city_name||''} onChange={e => { set('city_name', e.target.value); setConfigErrors(er => ({ ...er, city_name:'' })) }}
                    style={{ ...iStyle(configErrors.city_name), appearance:'none', cursor:'pointer' }}>
                    <option value="">Seleccionar localidad...</option>
                    {(ARGENTINA_PROVINCES[form.province||'La Pampa'] || []).map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  <FieldError field="city_name" />
                </div>

                <div style={{ marginBottom:8 }}>
                  <FieldLabel optional>Dirección</FieldLabel>
                  <input value={form.address||''} onChange={e => set('address', e.target.value)}
                    placeholder="Ej: Av. San Martín 450"
                    style={iStyle(false)} />
                </div>
                <div style={{ fontSize:11, color:C.dust, display:'flex', alignItems:'center', gap:5 }}>
                  <MapPin size={11} strokeWidth={2} />
                  La dirección se geolocaliza automáticamente al guardar.
                </div>
              </ConfigAccordion>

              {/* ── HORARIOS ── */}
              <ConfigAccordion id="horarios" Icon={Clock} label="Horarios de atención">
                {hoursForm && <HoursEditor value={hoursForm} onChange={v => { setHoursForm(v); setIsDirty(true) }} />}
              </ConfigAccordion>

              {/* Sticky save bar */}
              <div style={{ position:'fixed', bottom:0, left: isMobile ? 0 : 210, right:0, zIndex:100, background:'rgba(5,3,15,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderTop:`1px solid ${C.rim}`, padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <div style={{ fontSize:12, color: saved ? C.ok : isDirty ? C.mist : C.dust }}>
                  {saved ? '✓ Perfil guardado' : isDirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}
                </div>
                <GBtn onClick={saveConfiguracion} disabled={saving || !isDirty}
                  style={(!isDirty && !saving) ? { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.14)', color:'rgba(255,255,255,0.30)', boxShadow:'none', cursor:'default', opacity:1 } : {}}>
                  {saving ? '⟳ Guardando...' : 'Guardar cambios'}
                </GBtn>
              </div>

            </div>
          )
        })()}

        {/* ── MENSAJES (ex Automatizaciones) — pestaña propia. ── */}
        {tab === 'mensajes' && (() => {
          const AUTO_META = {
            reactivacion:  { Icon: RefreshCw, label:'Reactivar inactivos',   sub:'Sin visitar hace varios días',         color:'#6366F1' },
            cercaPremio:   { Icon: Target,    label:'Cerca de premio',        sub:'A punto de canjear su recompensa',     color:'#F59E0B' },
            primeraVisita: { Icon: UserPlus,  label:'Bienvenida 1ª visita',   sub:'Primera visita reciente',              color:'#22C55E' },
          }

          // Helper: header + card colapsable (shared entre locked y unlocked).
          // Locked: click abre modal teaser marketinero. Unlocked: expande.
          function AutoCard({ id, meta, count, locked, children }) {
            const isOpen = !locked && expandedAuto === id
            return (
              <div style={{
                background: C.card, borderRadius:18, overflow:'hidden',
                border:`1px solid ${isOpen ? meta.color + '55' : C.rim}`,
                transition:'border-color 200ms ease',
              }}>
                <button
                  onClick={() => locked ? setAutoTeaser(id) : setExpandedAuto(isOpen ? null : id)}
                  style={{
                    width:'100%', padding:'14px 16px', background:'transparent', border:'none',
                    cursor: 'pointer',
                    display:'flex', alignItems:'center', gap:12, textAlign:'left',
                  }}
                >
                  <div style={{ width:40, height:40, borderRadius:12, background:`${meta.color}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {(() => { const I = meta.Icon; return I ? <I size={18} color={meta.color} strokeWidth={2} /> : null })()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:C.white, marginBottom:2 }}>{meta.label}</div>
                    <div style={{ fontSize:11, color:C.mist }}>{meta.sub}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                    {locked
                      ? <span style={{ fontSize:9, fontWeight:700, color:PLANS.pro.color, background:`${PLANS.pro.color}22`, borderRadius:99, padding:'2px 8px', fontFamily:FN, letterSpacing:'.06em', display:'flex', alignItems:'center', gap:3 }}><Lock size={8} strokeWidth={2} />PRO</span>
                      : count > 0 && <span style={{ fontSize:11, fontWeight:700, color:C.ok, background:`${C.ok}22`, borderRadius:99, padding:'3px 9px', fontFamily:FN }}>{count}</span>
                    }
                    {!locked && (
                      <ChevronRight size={15} color={C.mist} strokeWidth={2}
                        style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition:'transform 200ms ease' }} />
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${C.rim}`, padding:'12px 16px 16px' }}>
                    {children}
                  </div>
                )}
              </div>
            )
          }

          // ── Locked (FREE / STARTER) ──
          if (planKey !== 'pro') return (
            <div style={{ paddingBottom:100 }}>
              {cameFromTab === 'recompensas' && (
                <button onClick={() => setTab('recompensas')}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:14, padding:'6px 12px 6px 8px', background:'rgba(255,255,255,0.04)', border:`1px solid ${C.rim}`, borderRadius:99, color:C.mist, fontFamily:FN, fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                  <ArrowLeft size={13} strokeWidth={2.5} /> Volver a recompensas
                </button>
              )}
              <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, marginBottom:4, display:'flex', alignItems:'center', gap:10, letterSpacing:'.08em', textTransform:'uppercase' }}>
                Automatizaciones
                <span style={{ fontSize:10, fontWeight:700, color:PLANS.pro.color, background:`${PLANS.pro.color}22`, borderRadius:99, padding:'2px 10px', fontFamily:FN, letterSpacing:'.06em' }}>SOLO PRO</span>
              </div>
              <div style={{ fontSize:13, color:C.mist, marginBottom:20, lineHeight:1.6 }}>
                Mensajes listos para enviar a tus clientes según su actividad.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { id:'reactivacion',  n:12 },
                  { id:'cercaPremio',   n:5  },
                  { id:'primeraVisita', n:3  },
                ].map(({ id, n }) => (
                  <AutoCard key={id} id={id} meta={AUTO_META[id]} count={n} locked />
                ))}
              </div>
              <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:30, padding:'16px 20px 24px', background:'linear-gradient(to top, rgba(0,0,0,0.85) 60%, transparent)' }}>
                <div style={{ maxWidth:480, margin:'0 auto' }}>
                  <button
                    onClick={() => setUpgradeModal('automatizaciones')}
                    style={{ width:'100%', padding:'14px 20px', background:`linear-gradient(135deg, ${PLANS.pro.color}, #f97316)`, border:'none', borderRadius:14, color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:`0 6px 24px ${PLANS.pro.color}55`, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                    <Bot size={16} strokeWidth={2} /> Desbloquear automatizaciones
                    <span style={{ fontSize:12, opacity:.8 }}>→ Plan PRO</span>
                  </button>
                </div>
              </div>

              {/* ── MODAL TEASER por automatización — color del ícono + benefits
                  marketineros + CTA al tab Planes. ── */}
              {autoTeaser && (() => {
                const TEASERS = {
                  reactivacion: {
                    Icon: RefreshCw, color:'#6366F1', rgb:'99,102,241',
                    title:'Reactivar inactivos',
                    hook:'Recuperá clientes que no vuelven hace tiempo',
                    benefits:[
                      'Detecta automáticamente clientes que no visitan hace X días',
                      'Mensaje listo para enviar por WhatsApp con un click',
                      'Recuperás entre 25% y 40% de los inactivos en promedio',
                      'Sin tener que recordar a quién falta llamar',
                    ],
                    example:'Ejemplo: "Te extrañamos. Volvé esta semana y llevate 15% OFF"',
                  },
                  cercaPremio: {
                    Icon: Target, color:'#F59E0B', rgb:'245,158,11',
                    title:'Cerca de premio',
                    hook:'Empujalos a volver cuando están a punto de canjear',
                    benefits:[
                      'Detecta clientes con 80% o más del premio',
                      'Aviso "te falta solo 1 visita para tu café gratis"',
                      'El cliente siente urgencia y acelera su próxima visita',
                      'Más canjes = más cliente comprometido con tu marca',
                    ],
                    example:'Ejemplo: "¡Estás a 1 estrella del café gratis! Te esperamos"',
                  },
                  primeraVisita: {
                    Icon: UserPlus, color:'#22C55E', rgb:'34,197,94',
                    title:'Bienvenida 1ª visita',
                    hook:'Convertí la primera visita en cliente fiel',
                    benefits:[
                      'Detecta clientes que escanearon su primer QR',
                      'Mensaje de bienvenida personalizado vía WhatsApp',
                      'Aumenta la tasa de retorno de 1ra a 2da visita',
                      'El cliente se siente especial desde el día 1',
                    ],
                    example:'Ejemplo: "¡Bienvenido al club! Tenés 200 puntos de regalo"',
                  },
                }
                const t = TEASERS[autoTeaser]
                if (!t) return null
                const Icon = t.Icon
                return (
                  <div onClick={() => setAutoTeaser(null)}
                    style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
                    <div onClick={e => e.stopPropagation()}
                      style={{ position:'relative', borderRadius:20, padding:'24px 22px', width:'100%', maxWidth:380, maxHeight:'85vh', overflowY:'auto', background:`linear-gradient(180deg, rgba(${t.rgb},0.18) 0%, rgba(${t.rgb},0.04) 60%, rgba(0,0,0,0.4) 100%)`, border:`1px solid rgba(${t.rgb},0.40)`, boxShadow:`0 32px 80px rgba(${t.rgb},0.30)`, animation:'modal-in .25s cubic-bezier(0.16,1,0.3,1)' }}>
                      {/* Cerrar */}
                      <button onClick={() => setAutoTeaser(null)} aria-label="Cerrar"
                        style={{ position:'absolute', top:14, right:14, width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.40)', border:'1px solid rgba(255,255,255,0.18)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                        <X size={14} strokeWidth={2.5} />
                      </button>
                      {/* Ícono grande del color */}
                      <div style={{ width:62, height:62, borderRadius:16, background:`rgba(${t.rgb},0.18)`, border:`1px solid rgba(${t.rgb},0.40)`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                        <Icon size={28} color={t.color} strokeWidth={2} />
                      </div>
                      {/* Hook + título */}
                      <div style={{ fontFamily:FN, fontSize:11, fontWeight:800, color:t.color, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:5 }}>{t.title}</div>
                      <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, lineHeight:1.15, marginBottom:18, letterSpacing:'-.01em' }}>{t.hook}</div>
                      {/* Beneficios */}
                      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                        {t.benefits.map(b => (
                          <div key={b} style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:13, color:C.pearl, lineHeight:1.5 }}>
                            <Check size={14} strokeWidth={2.5} color={t.color} style={{ flexShrink:0, marginTop:2 }} />
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                      {/* Ejemplo */}
                      <div style={{ padding:'10px 12px', background:'rgba(0,0,0,0.30)', border:`1px dashed rgba(${t.rgb},0.35)`, borderRadius:10, fontSize:12, color:C.mist, fontFamily:FI, marginBottom:18, lineHeight:1.5 }}>
                        💬 {t.example}
                      </div>
                      {/* Plan actual + CTA */}
                      <div style={{ fontSize:11, color:C.dust, marginBottom:8, textAlign:'center' }}>Estás en el plan <strong style={{ color:'#fff' }}>{(planDef?.label || 'FREE').toUpperCase()}</strong> · esta función se desbloquea con PRO</div>
                      <button onClick={() => { setAutoTeaser(null); setTab('configuracion') }}
                        style={{ width:'100%', padding:'13px', borderRadius:12, background:`linear-gradient(135deg, ${t.color}, ${PLANS.pro.color})`, border:'none', color:'#fff', fontFamily:FN, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:`0 6px 22px rgba(${t.rgb},0.45)`, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                        Actualizar plan →
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )

          // ── Detail view (lista de clientes de una automatización) ──
          if (autoDetail) {
            const meta    = AUTO_META[autoDetail]
            const cfg     = autoConfigs[autoDetail]
            const clients = displayAutoClients[autoDetail]
            return (
              <div>
                <button onClick={() => setAutoDetail(null)}
                  style={{ background:'transparent', border:'none', color:C.mist, cursor:'pointer', fontSize:12, fontFamily:FN, padding:0, marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
                  ← Volver
                </button>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  {(() => { const I = meta.Icon; return I ? <I size={22} color={meta.color} strokeWidth={2} /> : null })()}
                  <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:C.white }}>{meta.label}</div>
                </div>
                <div style={{ fontSize:12, color:C.mist, marginBottom:20 }}>
                  {clients.length} cliente{clients.length !== 1 ? 's' : ''} detectado{clients.length !== 1 ? 's' : ''}
                  {autoDetail === 'reactivacion' && ` · sin visitar hace más de ${cfg.days} días`}
                  {autoDetail === 'cercaPremio' && mockCheapestActive && ` · ≥80% hacia "${mockCheapestActive.name}" (${mockCheapestActive.cost} ${isAutoStars?'estrellas':'puntos'})`}
                  {autoDetail === 'primeraVisita' && ` · primera visita en los últimos ${cfg.days || 7} días`}
                </div>
                {clients.length === 0 && (
                  <PCard style={{ padding:16, textAlign:'center' }}>
                    <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
                      <div style={{ width:48, height:48, borderRadius:'50%', background:`${C.ok}22`, border:`2px solid ${C.ok}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <CheckCircle size={22} color={C.ok} strokeWidth={2} />
                      </div>
                    </div>
                    <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:C.white, marginBottom:4 }}>Sin clientes en esta condición</div>
                    <div style={{ fontSize:12, color:C.mist }}>
                      {autoDetail === 'reactivacion' && 'Todos tus clientes visitaron recientemente.'}
                      {autoDetail === 'cercaPremio'   && 'Ningún cliente está cerca de canjear aún.'}
                      {autoDetail === 'primeraVisita' && 'No hubo primeras visitas en los últimos días.'}
                    </div>
                  </PCard>
                )}
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {clients.map(m => {
                    const name      = (m.profiles?.display_name || m.profiles?.full_name || m.profiles?.name) || 'Cliente'
                    const email     = m.profiles?.email
                    const sent      = wasSentRecently(autoDetail, m.user_id)
                    const msg       = buildAutoMessage(autoDetail, m)
                    const daysSince = m.last_visit ? Math.floor((Date.now() - new Date(m.last_visit).getTime()) / 86400000) : null
                    const bal       = isAutoStars ? (m.stars||0) : (m.points||0)
                    return (
                      <PCard key={m.id} style={{ padding:'14px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:`${meta.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FN, fontSize:13, fontWeight:700, color:meta.color, flexShrink:0 }}>
                            {name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{name}</div>
                            <div style={{ fontSize:11, color:C.mist, marginTop:2 }}>
                              {autoDetail === 'reactivacion' && daysSince !== null && `Última visita: hace ${daysSince} días`}
                              {autoDetail === 'cercaPremio'   && mockCheapestActive && `${Math.round(bal)} / ${mockCheapestActive.cost} ${isAutoStars?'⭐':'💎'} (falta ${Math.max(1, Math.round(mockCheapestActive.cost - bal))})`}
                              {autoDetail === 'primeraVisita' && 'Primera visita registrada'}
                            </div>
                          </div>
                          {sent && (
                            <span style={{ fontSize:10, color:C.ok, fontFamily:FN, fontWeight:700, background:`${C.ok}18`, borderRadius:99, padding:'2px 8px', flexShrink:0 }}>✓ Enviado</span>
                          )}
                        </div>
                        <div style={{ background:C.bg3, borderRadius:10, padding:'10px 12px', fontSize:12, color:C.mist, lineHeight:1.6, marginBottom:10, whiteSpace:'pre-line', fontFamily:FI }}>
                          {msg}
                        </div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          <button
                            onClick={() => { navigator.clipboard.writeText(msg).then(() => { setCopiedMsg(m.user_id); markSent(autoDetail, m.user_id); setTimeout(() => setCopiedMsg(null), 2000) }) }}
                            style={{ flex:1, padding:'8px 10px', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:9, color:C.mist, fontFamily:FN, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                            {copiedMsg === m.user_id ? '✓ Copiado!' : 'Copiar mensaje'}
                          </button>
                          <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"
                            onClick={() => markSent(autoDetail, m.user_id)}
                            style={{ flex:1, padding:'8px 10px', background:'#25D36622', border:'1px solid #25D36644', borderRadius:9, color:'#25D366', fontFamily:FN, fontSize:11, fontWeight:700, cursor:'pointer', textDecoration:'none', textAlign:'center' }}>
                            WA
                          </a>
                          {email && (
                            <a href={`mailto:${email}?subject=Te%20esperamos%20en%20${encodeURIComponent(commerce.name)}&body=${encodeURIComponent(msg)}`}
                              onClick={() => markSent(autoDetail, m.user_id)}
                              style={{ flex:1, padding:'8px 10px', background:`${C.v}18`, border:`1px solid ${C.v}44`, borderRadius:9, color:C.v, fontFamily:FN, fontSize:11, fontWeight:700, cursor:'pointer', textDecoration:'none', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                              <Mail size={11} strokeWidth={2} /> Email
                            </a>
                          )}
                        </div>
                      </PCard>
                    )
                  })}
                </div>
              </div>
            )
          }

          // ── Lista principal (cards colapsables) ──
          return (
            <div>
              {cameFromTab === 'recompensas' && (
                <button onClick={() => setTab('recompensas')}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:14, padding:'6px 12px 6px 8px', background:'rgba(255,255,255,0.04)', border:`1px solid ${C.rim}`, borderRadius:99, color:C.mist, fontFamily:FN, fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                  <ArrowLeft size={13} strokeWidth={2.5} /> Volver a recompensas
                </button>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, letterSpacing:'.08em', textTransform:'uppercase' }}>Automatizaciones</div>
                <InfoHint align="left" text={
                  'Mensajes de WhatsApp que la app te ayuda a enviar a clientes específicos sin que tengas que pensarlo.\n\n' +
                  'La app detecta los clientes que cumplen una condición (ej. "no vinieron hace 30 días") y te muestra el mensaje listo para enviar. Vos lo revisás y lo despachás con un click.\n\n' +
                  'Disponible en plan PRO.'
                } />
              </div>
              <HelpBanner
                id="merchant-mensajes"
                title="Tus mensajes para clientes"
                body="Acá la app detecta automáticamente clientes que se merecen un mensaje (los que no vienen hace tiempo, los que están cerca de un premio, los recién llegados) y te arma el WhatsApp listo. Vos lo revisás y lo mandás con un click. Disponible en plan PRO."
              />
              <div style={{ fontSize:13, color:C.mist, marginBottom:20 }}>Mensajes listos para enviar a tus clientes.</div>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {Object.entries(AUTO_META).map(([key, meta]) => {
                  const cfg   = autoConfigs[key]
                  const count = displayAutoClients[key].length
                  return (
                    <AutoCard key={key} id={key} meta={meta} count={count}>
                      {/* Mensaje preview */}
                      <div style={{ background:C.bg3, borderRadius:10, padding:'10px 12px', marginBottom:12, fontSize:11, color:C.mist, lineHeight:1.65, whiteSpace:'pre-line', fontFamily:FI, border:`1px solid ${meta.color}22` }}>
                        {buildAutoMessage(key, {
                          profiles: { full_name: 'Juan García' },
                          stars:  key === 'cercaPremio' ? Math.round((mockCheapestActive?.cost || 10)  * 0.85) : 0,
                          points: key === 'cercaPremio' ? Math.round((mockCheapestActive?.cost || 100) * 0.85) : 0,
                        })}
                      </div>
                      {/* Config días (solo reactivación) */}
                      {key === 'reactivacion' && (
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                          <span style={{ fontSize:11, color:C.mist }}>Días sin visita:</span>
                          {[3,7,14,30].map(d => (
                            <button key={d} onClick={() => saveAutoConfigs({ ...autoConfigs, reactivacion: { ...cfg, days: d } })}
                              style={{ padding:'3px 10px', borderRadius:99, border:`1px solid ${cfg.days===d ? meta.color : C.rim}`, background: cfg.days===d ? `${meta.color}22` : 'transparent', color: cfg.days===d ? meta.color : C.mist, fontSize:11, fontFamily:FN, fontWeight:700, cursor:'pointer' }}>
                              {d}d
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Footer: toggle + CTA */}
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <button
                          onClick={() => saveAutoConfigs({ ...autoConfigs, [key]: { ...cfg, active: !cfg.active } })}
                          style={{ width:36, height:20, borderRadius:99, border:'none', cursor:'pointer', background: cfg.active ? meta.color : C.rim, position:'relative', flexShrink:0, transition:'background .2s' }}>
                          <span style={{ position:'absolute', top:2, left: cfg.active ? 18 : 2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .2s' }} />
                        </button>
                        <span style={{ fontSize:11, color: cfg.active ? meta.color : C.dust, fontFamily:FN, fontWeight:700 }}>
                          {cfg.active ? 'Activa' : 'Pausada'}
                        </span>
                        {count > 0 && (
                          <button onClick={() => setAutoDetail(key)}
                            style={{ marginLeft:'auto', padding:'8px 16px', background:`${meta.color}22`, border:`1px solid ${meta.color}55`, borderRadius:10, color:meta.color, fontFamily:FN, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            Ver {count} cliente{count !== 1 ? 's' : ''} →
                          </button>
                        )}
                      </div>
                    </AutoCard>
                  )
                })}
              </div>

              <div style={{ marginTop:24, fontSize:11, color:C.dust, textAlign:'center' }}>
                Los mensajes se copian o envían por WhatsApp
              </div>
            </div>
          )
        })()}

      </div>
      {cropSrc && <LogoCropper imageSrc={cropSrc} onSave={handleLogoCropSave} onCancel={() => setCropSrc(null)} />}

      {/* ── Modal global: QR del negocio fullscreen ──
          Se abre desde el intent picker ("Sumar un nuevo cliente") y desde
          cualquier otro CTA. Vive acá afuera (no nested en un tab) para que
          se pueda invocar siempre. */}
      {showBusinessQrModal && (() => {
        const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/club/${commerce?.slug || commerce?.id || ''}?from_qr=1`
        return (
          <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
            onClick={() => setShowBusinessQrModal(false)}>
            <div style={{ background:C.card, border:`1px solid ${C.rim}`, borderRadius:24, padding:'28px 24px 24px', maxWidth:380, width:'100%', textAlign:'center', position:'relative' }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowBusinessQrModal(false)}
                style={{ position:'absolute', top:12, right:12, background:'transparent', border:'none', color:C.mist, cursor:'pointer', padding:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={18} strokeWidth={2.2} />
              </button>
              <div style={{ fontFamily:FN, fontSize:10, fontWeight:800, color:C.v, letterSpacing:'.14em', textTransform:'uppercase', marginBottom:6 }}>QR de tu negocio</div>
              <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:C.white, marginBottom:6 }}>{commerce?.name}</div>
              <div style={{ fontSize:12.5, color:C.mist, marginBottom:22, lineHeight:1.5 }}>
                Mostralo a un cliente para que se sume al club escaneándolo desde su celular.
              </div>
              <div style={{ display:'inline-flex', background:'#ffffff', borderRadius:18, padding:18, marginBottom:14, boxShadow:'0 12px 32px rgba(189,75,248,0.20)' }}>
                <QRCodeSVG value={joinUrl} size={260} bgColor="#ffffff" fgColor="#000000" level="M" />
              </div>
              <div style={{ fontSize:11, color:C.dust, fontFamily:FI, marginBottom:18, wordBreak:'break-all' }}>
                {joinUrl.replace(/^https?:\/\//,'')}
              </div>
              <button onClick={() => setShowBusinessQrModal(false)}
                style={{ width:'100%', padding:'12px', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.rim}`, borderRadius:12, color:C.pearl, fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Listo
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── QR PERSONAL DEL CLIENTE ─────────────────────────────────────────────────
function ClientQRView({ user, profile, setView, headerExtra }) {
  const [mode,        setMode]        = useState('qr') // 'qr' | 'scanning' | 'error'
  const [doneError,   setDoneError]   = useState('')
  const [cameraError, setCameraError] = useState('')
  const scannerRef   = useRef(null)
  const processingRef = useRef(false)
  const supabase = getSupabase()

  const qrValue    = `CLUB-${user?.id || 'demo'}`
  const shortId    = (user?.id || '------').slice(-6).toUpperCase()
  const displayName = profile?.full_name || profile?.name || 'Tu cuenta'

  // QR estilo "pase" (blanco sobre transparente) — mismo render que el tab "mi qr" del bottom nav.
  const [passQrUrl, setPassQrUrl] = useState(null)
  useEffect(() => {
    if (!user?.id) return
    makeQR(`CLUB-${user.id}`, { width: 220, margin: 2, dark: '#000000', light: '#FFFFFF' })
      .then(setPassQrUrl)
  }, [user?.id])

  // Stats para el footer del pase (clubs activos + visitas totales).
  const [stats, setStats] = useState({ clubs: 0, visits: 0 })
  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('visits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(([memRes, visRes]) => {
      setStats({ clubs: memRes.count || 0, visits: visRes.count || 0 })
    }).catch(() => {})
  }, [user?.id])

  // Con jsQR el ciclo de vida del stream lo maneja el componente JsQrScanner.
  // Esta función queda como noop para compat, pero ya no toca scannerRef ni
  // arranca/detiene la cámara explícitamente — eso pasa al desmontar el scanner.
  async function stopCamera() {
    // (mantengo la firma async porque el resto del código la await-ea)
    return
  }

  async function handleClientScan(text) {
    if (processingRef.current) return

    // El QR detectado no tiene formato de Benefix (no matchea /club/[slug] ni /join/[slug])
    const match = text.match(/\/(?:join|club)\/([^/?#\s]+)/)
    if (!match) {
      processingRef.current = true
      await stopCamera()
      setDoneError('Este código QR no pertenece a un club de Benefix. Probá con el QR del local.')
      setMode('error')
      return
    }
    processingRef.current = true
    await stopCamera()

    const slug = match[1]
    const { data: commerce, error: cErr } = await supabase
      .from('commerces').select('id, name').eq('slug', slug).eq('active', true).single()

    if (cErr || !commerce) {
      setDoneError('No encontramos el negocio del QR. Capaz el comercio cerró su club o el QR no está vigente.')
      setMode('error')
      processingRef.current = false
      return
    }

    // Redirigimos al perfil público del club con flag from_qr=1 — el spotlight
    // sobre el slider solo se muestra si NO sos miembro. Si ya lo sos, ves
    // tu MemberBadge directamente (sin pasar por el modal de unirme).
    if (typeof window !== 'undefined') {
      window.location.href = `/club/${slug}?from_qr=1`
    }
    return

    // (código viejo, deshabilitado pero conservado por si volvemos al auto-join)
    // eslint-disable-next-line no-unreachable
    const res = await fetch('/api/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commerce_id: commerce.id })
    })
    const data = await res.json()
    processingRef.current = false

    if (data.ok) {
      showToast('success', data.already_member ? `Ya sos miembro de ${commerce.name}` : `¡Te sumaste a ${commerce.name}!`)
      setView('client')
    } else {
      setDoneError(
        data.error === 'plan_limit_reached'
          ? `${commerce.name} alcanzó su límite de miembros.`
          : (data.error || 'No se pudo unir al club.')
      )
      setMode('error')
    }
  }

  // ── Scanning mode ────────────────────────────────────────────────────────
  if (mode === 'scanning') return (
    <div style={{ minHeight:'100vh', padding:'16px', maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column' }}>
      <button onClick={() => setMode('qr')}
        style={{ alignSelf:'flex-start', display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:C.mist, fontSize:13, cursor:'pointer', fontFamily:FN, fontWeight:600, marginBottom:20, padding:'4px 0' }}>
        <ChevronLeft size={16} strokeWidth={2} /> Volver
      </button>
      <div style={{ fontFamily:FN, fontSize:20, fontWeight:800, color:C.white, marginBottom:6 }}>Escanear QR del negocio</div>
      <div style={{ fontSize:13, color:C.mist, lineHeight:1.6, marginBottom:24 }}>Apuntá la cámara al QR del negocio para sumarte a su club.</div>
      <div style={{ borderRadius:16, overflow:'hidden', background:'#111' }}>
        <JsQrScanner
          onDecode={(text) => handleClientScan(text)}
          onError={() => { setCameraError('No se pudo acceder a la cámara. Revisá los permisos.'); setMode('qr') }}
        />
      </div>
    </div>
  )

  // ── Error mode ───────────────────────────────────────────────────────────
  if (mode === 'error') return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', maxWidth:420, margin:'0 auto', textAlign:'center' }}>
      <div style={{ width:54, height:54, borderRadius:14, background:'rgba(248,116,68,0.14)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
        <X size={26} color='#f87444' strokeWidth={2} />
      </div>
      <div style={{ fontFamily:FN, fontSize:18, fontWeight:800, color:C.white, marginBottom:10 }}>No se pudo unir</div>
      <div style={{ fontSize:13, color:C.mist, lineHeight:1.6, marginBottom:32 }}>{doneError}</div>
      <GBtn onClick={() => { setDoneError(''); processingRef.current = false; setMode('qr') }}>← Volver</GBtn>
    </div>
  )

  // ── Default: QR personal — mismo diseño BENEFIX PASS que el tab "mi qr" del bottom nav ─────
  // Setup del nav de pestañas: marca "Mi QR" como activa y al tocar otra pestaña
  // dispara navegación a view='client' con el tab elegido.
  const handleNavTab = (next) => {
    if (next === 'mi qr') return
    window.dispatchEvent(new CustomEvent('benefix:navigate', {
      detail: { view: 'client', tab: next },
    }))
  }
  return (
    <>
      {!headerExtra && <ClientBottomNav tab="mi qr" setTab={handleNavTab} profile={profile} setView={setView} />}
    <div className="modal-in" style={{ display:'flex', flexDirection:'column', alignItems:'center', padding: headerExtra ? '24px 16px 40px' : '58px 16px 40px', maxWidth:420, margin:'0 auto' }}>

      {headerExtra}

      {cameraError && (
        <div style={{ fontSize:12, color:'#f87444', marginBottom:16, textAlign:'center' }}>{cameraError}</div>
      )}

      {/* Botón scan QR negocio — arriba del pase, porque es la acción primaria de esta vista */}
      <button
        onClick={() => { setCameraError(''); processingRef.current = false; setMode('scanning') }}
        style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, padding:'12px 24px', background:'rgba(255,255,255,0.07)', border:`1px solid ${C.rim}`, borderRadius:12, cursor:'pointer', fontSize:13, color:C.pearl, fontFamily:FN, fontWeight:600 }}
      >
        <Camera size={16} strokeWidth={1.8} />
        Escanear QR de negocio
      </button>

      {/* ── PASE VIP ── */}
      <div style={{ width:'100%', maxWidth:340, borderRadius:28, overflow:'hidden', boxShadow:'0 24px 64px rgba(189,75,248,0.30), 0 8px 24px rgba(0,0,0,0.50)' }}>

        {/* Cuerpo del pase */}
        <div style={{ background:'linear-gradient(145deg, #7c3aed 0%, #a855f7 45%, #ec4899 100%)', padding:'24px 24px 28px', position:'relative', overflow:'hidden' }}>

          {/* Blobs decorativos */}
          <div style={{ position:'absolute', top:-32, right:-32, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.10)', filter:'blur(24px)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-24, left:-16, width:90, height:90, borderRadius:'50%', background:'rgba(236,72,153,0.25)', filter:'blur(20px)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:'40%', left:'30%', width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.04)', filter:'blur(32px)', pointerEvents:'none' }} />

          {/* Header */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, position:'relative' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.01em', lineHeight:1 }}>BENEFIX PASS</div>
                <InfoHint align="left" color="rgba(255,255,255,0.85)" text={
                  'Tu QR personal único. Mostralo al comerciante en cada compra para que lo escanee y te sume estrellas o puntos.\n\n' +
                  'El mismo QR sirve para todos los clubes donde estés anotado — no necesitás uno por cada negocio.\n\n' +
                  'Si lo perdés o querés bloquearlo, escribinos por soporte y te ayudamos.'
                } />
              </div>
              <div style={{ fontFamily:FI, fontSize:12, color:'rgba(255,255,255,0.65)', marginTop:4 }}>Tu pase de beneficios</div>
            </div>
            {/* Logo badge */}
            <div style={{ width:38, height:38, borderRadius:12, background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,0.25)' }}>
              <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
                <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <rect x="16" y="5.5" width="8" height="5" rx="2.5" fill="white" opacity=".9"/>
                <rect x="16" y="12" width="9" height="5.5" rx="2.75" fill="white"/>
              </svg>
            </div>
          </div>

          {/* QR */}
          <div style={{ display:'flex', justifyContent:'center', position:'relative' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at center, rgba(255,255,255,0.18) 0%, transparent 68%)', pointerEvents:'none' }} />
            {passQrUrl
              ? <img src={passQrUrl} alt="QR" style={{ width:200, height:200, display:'block', position:'relative', filter:'drop-shadow(0 0 14px rgba(255,255,255,0.30))' }} />
              : <div style={{ width:200, height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.4)', fontSize:11 }}>Generando...</div>
            }
          </div>

          {/* Info usuario */}
          <div style={{ textAlign:'center', marginTop:22, position:'relative' }}>
            <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-.01em' }}>{displayName}</div>
            <div style={{ fontFamily:'monospace', fontSize:10, color:'rgba(255,255,255,0.50)', marginTop:5, letterSpacing:'.12em', textTransform:'uppercase' }}>
              CLUB · {(user?.id || '').slice(0,8).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Separador tipo ticket */}
        <div style={{ position:'relative', background:'linear-gradient(to right, #5b21b6, #7c3aed)' }}>
          <div style={{ position:'absolute', left:-1, top:'50%', transform:'translateY(-50%)', width:18, height:18, borderRadius:'50%', background:'#000', zIndex:2 }} />
          <div style={{ position:'absolute', right:-1, top:'50%', transform:'translateY(-50%)', width:18, height:18, borderRadius:'50%', background:'#000', zIndex:2 }} />
          <div style={{ borderTop:'1.5px dashed rgba(255,255,255,0.20)', margin:'0 22px' }} />
        </div>

        {/* Footer del pase */}
        <div style={{ background:'linear-gradient(to bottom right, #4c1d95, #3b0764)', padding:'14px 24px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:FI, fontSize:11, color:'rgba(255,255,255,0.50)', letterSpacing:'.04em' }}>
            Mostrá este código en caja para acumular beneficios
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:16, width:'100%', maxWidth:340 }}>
        {[
          { val: String(stats.clubs),  lbl: 'clubs'   },
          { val: String(stats.visits), lbl: 'visitas' },
          { val: String(stats.clubs),  lbl: 'activos' },
        ].map((s, i) => (
          <div key={i} className="fu" style={{ animationDelay:`${i*50}ms`, background:'rgba(255,255,255,0.05)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:18, padding:'14px 8px', textAlign:'center' }}>
            <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:'#fff', lineHeight:1 }}>{s.val}</div>
            <div style={{ fontFamily:FI, fontSize:10, color:'rgba(255,255,255,0.40)', marginTop:5, textTransform:'uppercase', letterSpacing:'.08em' }}>{s.lbl}</div>
          </div>
        ))}
      </div>

    </div>
    </>
  )
}

// ─── SCANNER (para staff del comercio + clientes) ────────────────────────────
// Ahora la pantalla es la misma para ambos roles. La diferencia la marca el
// filtro `isOwner`: el dueño ve las 4 opciones (registrar visita, sumarse a
// otro club, mostrar QR del negocio, mostrar QR personal). El cliente solo ve
// 2 opciones (sumarse a un club, mostrar QR personal).
function ScannerView({ user, profile, setView }) {
  const isOwner = profile && ['commerce_owner', 'admin'].includes(profile.role)
  if (!profile) return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}><div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}><Lock size={24} color='rgba(255,255,255,0.50)' strokeWidth={2} /></div></div>
      <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, marginBottom:8 }}>Iniciá sesión para usar el escáner</div>
    </div>
  )
  // Modo del scanner para owners: 'register-visit' (escanear QR del cliente que vino al local)
  // o 'join-club' (escanear QR de otro local para sumarse como cliente).
  // Default: null — la primera pantalla muestra dos botones grandes apilados
  // para que el owner elija qué hacer. Una vez elegido, modeSelected pasa a true.
  const [scanMode, setScanMode]       = useState(null)
  const [modeSelected, setModeSelected] = useState(false)
  // Accordion del scanner — qué sección está abierta (null = todas cerradas).
  // Solo una abierta a la vez. Permite a los dos grupos "Abrir escáner" y
  // "Mostrar QR" comportarse como desplegables como en el intent picker.
  const [expandedScannerSection, setExpandedScannerSection] = useState(null)
  // States del flow "Escanear nuevo Club" (modo join-club)
  const [joinScanActive, setJoinScanActive] = useState(false)
  const [joinScanError,  setJoinScanError]  = useState('')
  const [commerceId, setCommerceId]   = useState('')
  const [amount,     setAmount]       = useState('')   // monto en pesos para sistema de puntos (1:1)
  const [result, setResult]           = useState(null)
  const [processing, setProcessing]   = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [myCommerces, setMyCommerces] = useState([])
  // Pre-scan gate flow para STARS con compra mínima.
  // 'min_check' → pregunta si la compra alcanza el mínimo
  // 'no_min_with_discount' → si dijo no Y hay descuento activo, ofrece igual el descuento
  const [scanGate, setScanGate]       = useState(null)
  const [skipStar, setSkipStar]       = useState(false)  // true si dijo "no aplica" — escanea sin sumar estrella
  const [hasActiveDiscount, setHasActiveDiscount] = useState(false)  // ¿comercio tiene discount_next activo?
  // Post-scan: si el cliente usó un descuento, preguntar si renovarlo.
  const [renewDiscountPromo, setRenewDiscountPromo] = useState(null)  // { promoId, expiresAt, membershipId } | null
  // discountDecisionResult: rastrea la decisión que tomó el dueño en el modal
  // de "¿Renovar?" — null mientras el modal está abierto, 'renewed' si dijo sí,
  // 'declined' si dijo no o cerró con X. Se usa en el cartel narrativo
  // post-scan para contar la historia completa al cashier.
  const [discountDecisionResult, setDiscountDecisionResult] = useState(null)
  // Canje
  const [redeemStep,    setRedeemStep]    = useState(null)  // null | 'selecting' | 'confirming' | 'done'
  const [redeemPrizes,  setRedeemPrizes]  = useState([])
  const [selectedPrize, setSelectedPrize] = useState(null)
  const [redeeming,     setRedeeming]     = useState(false)
  const [redeemResult,  setRedeemResult]  = useState(null)
  const scannerRef = useRef(null)
  const supabase   = getSupabase()

  useEffect(() => {
    if (!user) return
    supabase.from('commerces').select('id, name, slug, prog_type, prog_min_purchase').eq('owner_id', user.id)
      .then(({ data }) => {
        const list = data || []
        setMyCommerces(list)
        if (list.length === 1) setCommerceId(list[0].id)
      })
  }, [user])

  // Cuando se selecciona un comercio, chequear si tiene promo discount_next
  // activa (afecta el flow de "no aplica" del min purchase).
  useEffect(() => {
    if (!commerceId) { setHasActiveDiscount(false); return }
    supabase.from('promotions').select('id, expires_at').eq('commerce_id', commerceId).eq('active', true).eq('type', 'discount_next')
      .then(({ data }) => {
        const now = Date.now()
        setHasActiveDiscount((data || []).some(p => !p.expires_at || new Date(p.expires_at).getTime() > now))
      })
  }, [commerceId])

  // Limpia el scanner al desmontar o al cerrar cámara
  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  async function startCamera() {
    if (!commerceId) return
    const sel = myCommerces.find(c => c.id === commerceId)
    // Puntos: monto obligatorio (1 peso = 1 punto).
    if (sel?.prog_type === 'points' && (!amount || parseInt(amount, 10) <= 0)) {
      setCameraError('Ingresá el monto de la compra antes de escanear.')
      return
    }
    // Stars con compra mínima: gate previo. Pregunta al cashier si la compra
    // alcanza el mínimo. La cámara se abre recién después del "Sí, aplica".
    if (sel?.prog_type === 'stars' && sel?.prog_min_purchase > 0 && !skipStar) {
      // Si todavía no respondió el gate, abrir el modal y abortar.
      if (scanGate !== 'confirmed') {
        setScanGate('min_check')
        return
      }
    }
    setCameraError('')
    setResult(null)
    setScanGate(null)
    // Con el nuevo JsQrScanner el componente arranca la cámara solo cuando se
    // monta (cameraActive=true). Sin imports dinámicos acá ni manejo manual del stream.
    setCameraActive(true)
  }

  async function stopCamera() {
    // El stream y el rAF loop los detiene el cleanup del JsQrScanner al desmontarse.
    setCameraActive(false)
  }

  async function handleScan(qrCode) {
    if (processing || !commerceId) return
    if (!qrCode.startsWith('CLUB-')) return
    setProcessing(true)
    await stopCamera()
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qr_code: qrCode,
        commerce_id: commerceId,
        // amount va solo cuando el comercio usa puntos. El backend lo ignora si no aplica.
        ...(amount && parseInt(amount, 10) > 0 ? { amount: parseInt(amount, 10) } : {}),
        // skip_star: cuando el cashier confirmó "no aplica" el mínimo, no sumar estrella.
        ...(skipStar ? { skip_star: true } : {}),
      }),
    })
    const data = await res.json()
    setResult({ ...data, ok: res.ok })
    setProcessing(false)
    // Si el backend reportó que se canjeó un descuento, abrir modal de renovar.
    if (data.discount_redeemed) {
      setRenewDiscountPromo({
        promoId:      data.discount_redeemed.promo_id,
        expiresAt:    data.discount_redeemed.expires_at,
        membershipId: data.membership_id,
      })
    }
  }

  async function openRedeem() {
    const { data } = await supabase
      .from('prizes')
      .select('id, name, cost')
      .eq('commerce_id', commerceId)
      .eq('active', true)
      .order('cost', { ascending: true })
    const eligible = (data || []).filter(p => p.cost <= (result?.points_now || 0))
    setRedeemPrizes(eligible)
    setRedeemStep('selecting')
  }

  async function confirmRedeem() {
    if (!selectedPrize || !result) return
    setRedeeming(true)
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        membership_id: result.membership_id,
        prize_id:      selectedPrize.id,
        commerce_id:   commerceId,
        user_id:       result.user_id,
      }),
    })
    const data = await res.json()
    // Si se agotó el stock, sacar el premio de la lista del escáner
    if (data.ok && data.stock_depleted) {
      setRedeemPrizes(ps => ps.filter(p => p.id !== selectedPrize.id))
    }
    setRedeemResult(data)
    setRedeeming(false)
    setRedeemStep('done')
  }

  function resetAll() {
    setResult(null)
    setRedeemStep(null)
    setRedeemPrizes([])
    setSelectedPrize(null)
    setRedeemResult(null)
    setAmount('')   // limpiar monto para el siguiente cliente
    setSkipStar(false)
    setScanGate(null)
    setRenewDiscountPromo(null)
    setDiscountDecisionResult(null)
    startCamera()
  }

  // Owner aceptó: la compra alcanza el mínimo → escanear normalmente.
  function handleGateYes() {
    setSkipStar(false)
    setScanGate('confirmed')
    // Reabrir camera flow con la confirmación lista.
    setTimeout(() => startCamera(), 50)
  }
  // Owner aceptó: la compra NO alcanza el mínimo. Dos caminos:
  // - Si hay descuento activo: ofrecer aplicarlo igual (modal next).
  // - Si no hay descuento: cancelar (no se escanea).
  function handleGateNo() {
    setSkipStar(true)
    if (hasActiveDiscount) {
      setScanGate('no_min_with_discount')
    } else {
      // Nada que ofrecer — cerrar todo.
      setScanGate(null)
      setSkipStar(false)
      setCameraError('Compra no alcanza el mínimo. No se sumó estrella.')
    }
  }
  // Owner aceptó aplicar descuento aunque no se sume estrella → escanear.
  function handleApplyDiscountOnly() {
    setScanGate('confirmed')
    setTimeout(() => startCamera(), 50)
  }

  // Decisión del dueño sobre el cupón canjeado: renovar o no.
  // Llama a /api/discount-decision (que dispara las notifs cruzadas) y cierra
  // el modal. Si el dueño cierra con X o backdrop, se interpreta como "decline"
  // para que el cliente igual reciba el aviso de que no le renovaron.
  async function submitDiscountDecision(decision) {
    if (!renewDiscountPromo) return
    const { promoId, membershipId } = renewDiscountPromo
    try {
      const res = await fetch('/api/discount-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commerce_id:   commerceId,
          membership_id: membershipId,
          promotion_id:  promoId,
          decision,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast('success', decision === 'renew' ? 'Descuento renovado' : 'Descuento no renovado')
        // Guardamos la decisión para que el cartel post-scan la pueda contar
        // ("Le renovaste el descuento" / "No le renovaste el descuento").
        setDiscountDecisionResult(decision === 'renew' ? 'renewed' : 'declined')
      } else {
        showToast('error', data.message || data.error || 'No se pudo procesar')
      }
    } catch (e) {
      showToast('error', e.message || 'Error de red')
    } finally {
      setRenewDiscountPromo(null)
    }
  }

  const unitIcon = result?.prog_type === 'stars' ? '★' : '◆'
  const unitLabel = result?.prog_type === 'stars' ? 'estrellas' : 'puntos'
  const unitColor = result?.prog_type === 'stars' ? '#8B5CF6' : '#EC4899'

  // Pantalla inicial — opciones agrupadas en dos secciones según la acción
  // que requieren del usuario:
  //   1) ABRIR ESCÁNER: el user apunta su cámara a un QR (de un cliente o
  //      de un comercio). Junta "Registrar visita" + "Sumarme a un club".
  //   2) MOSTRAR QR:    el user muestra su propio QR personal a un comercio
  //      para que se lo escaneen. Solo "Mostrar mi QR".
  // El agrupamiento ayuda a que el flow mental sea claro: "¿voy a escanear
  // o me van a escanear?" antes de elegir la acción específica.
  if (!modeSelected) {
    const SCAN_GROUP = [
      {
        id: 'register-visit',
        title: 'Registrar visita de cliente',
        desc: 'Escaneá el QR personal de un cliente para sumarle visita o canjear un premio.',
        Icon: ScanLine,
        bg:         'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(139,92,246,0.10))',
        border:     'rgba(139,92,246,0.40)',
        iconBg:     'linear-gradient(135deg, #7C3AED, #8B5CF6)',
        shadow:     '0 4px 18px rgba(139,92,246,0.40)',
        descColor:  'rgba(229,221,255,0.75)',
        arrowColor: 'rgba(196,181,253,0.85)',
      },
      {
        id: 'join-club',
        title: 'Quiero sumarme a un club',
        desc: 'Sumate como cliente a otro comercio escaneando su QR.',
        Icon: ScanLine,
        bg:         'linear-gradient(135deg, rgba(219,39,119,0.16), rgba(236,72,153,0.10))',
        border:     'rgba(236,72,153,0.40)',
        iconBg:     'linear-gradient(135deg, #DB2777, #EC4899)',
        shadow:     '0 4px 18px rgba(236,72,153,0.40)',
        descColor:  'rgba(255,221,236,0.75)',
        arrowColor: 'rgba(251,182,206,0.85)',
      },
    ]
    const SHOW_GROUP = [
      {
        id: 'show-business-qr',
        title: 'Mostrar QR de negocio',
        desc: 'Mostralo a un cliente para que se una al club desde su celular.',
        Icon: Store,
        // Violeta — el QR del local lleva ese color en toda la app.
        bg:         'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(139,92,246,0.10))',
        border:     'rgba(139,92,246,0.40)',
        iconBg:     'linear-gradient(135deg, #7C3AED, #A855F7)',
        shadow:     '0 4px 18px rgba(139,92,246,0.40)',
        descColor:  'rgba(229,221,255,0.78)',
        arrowColor: 'rgba(196,181,253,0.85)',
      },
      {
        id: 'show-my-qr',
        title: 'Mostrar QR personal',
        desc: 'Mostralo en comercios para sumar / canjear beneficios.',
        Icon: User,
        bg:         'linear-gradient(135deg, rgba(254,80,0,0.16), rgba(251,113,133,0.10))',
        border:     'rgba(251,113,133,0.40)',
        iconBg:     'linear-gradient(135deg, #FE5000, #FB7185)',
        shadow:     '0 4px 18px rgba(254,80,0,0.40)',
        descColor:  'rgba(255,228,222,0.78)',
        arrowColor: 'rgba(252,165,165,0.85)',
      },
    ]

    // Header reutilizable de cada sección — mismo formato (título uppercase
    // con tracking + color blanco + barrita decorativa al lado), así "Abrir
    // escáner" y "Mostrar QR" se leen como hermanos.
    const SectionHeader = ({ children }) => (
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'0 4px 10px',
        marginBottom:2,
      }}>
        <div style={{ width:3, height:14, borderRadius:99, background:'linear-gradient(135deg, #FE5000, #BD4BF8)' }} />
        <div style={{
          fontFamily:FN, fontSize:11.5, fontWeight:800,
          color:'rgba(255,255,255,0.85)',
          letterSpacing:'.10em', textTransform:'uppercase',
        }}>{children}</div>
      </div>
    )

    // Estilo simple: solo silueta del contenedor (border violeta translúcido),
    // sin fondo de color, ícono también con outline (no relleno) en violeta.
    // Todas las opciones se ven idénticas — la diferenciación queda en el
    // ícono y el texto.
    const renderOption = opt => (
      <button key={opt.id}
        onClick={() => { setScanMode(opt.id); setModeSelected(true) }}
        style={{
          width:'100%', textAlign:'left',
          padding:'16px 16px',
          background:'transparent',
          border:'1px solid rgba(168,85,247,0.35)',
          borderRadius:14,
          cursor:'pointer',
          display:'flex', alignItems:'center', gap:14,
          fontFamily:'inherit',
          transition:'transform 160ms ease, border-color 160ms ease, background 160ms ease',
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.06)'}
        onPointerLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{
          width:42, height:42, borderRadius:11,
          background:'transparent',
          border:'1px solid rgba(168,85,247,0.45)',
          display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}>
          <opt.Icon size={20} color="#D8B4FE" strokeWidth={2} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:'#fff', marginBottom:3 }}>{opt.title}</div>
          <div style={{ fontSize:12, color:'rgba(216,180,254,0.65)', lineHeight:1.45 }}>{opt.desc}</div>
        </div>
        <ArrowRight size={18} color="rgba(216,180,254,0.85)" strokeWidth={2.2} style={{ flexShrink:0 }} />
      </button>
    )

    return (
      <div style={{ maxWidth:440, margin:'0 auto', padding:'24px 18px 80px' }}>
        {/* Cartel de ayuda — primero, inmediatamente debajo del navbar.
            Reemplaza al header "Escáner QR / ¿Qué querés hacer?" — el cartel
            ya cuenta de qué se trata la pantalla, no hace falta repetirlo. */}
        <HelpBanner
          id="scanner-overview"
          title="¿Qué hacés acá?"
          body="O escaneás un QR (de un cliente o de otro local), o mostrás el tuyo para que alguien te lo escanee."
          details={<>
            <strong style={{ color:'#fff' }}>Abrir escáner</strong> prende la cámara — usalo para registrar la visita de un cliente que vino a tu local, o para sumarte vos mismo como cliente a otro club escaneando su QR.<br/><br/>
            <strong style={{ color:'#fff' }}>Mostrar QR</strong> muestra tu QR personal en pantalla para que un comerciante lo escanee y te sume visita en su sistema.
          </>}
        />

        {/* ── Dos accordions con estética violeta unificada (igual que los
            accesos directos del panel del negocio). Cada uno al expandir
            muestra los botones de acción internos. */}
        {(() => {
          // Ícono del marco de escáner con la línea horizontal animada
          // (sube y baja como el "scan beam" de un escáner real). Construido
          // como SVG inline para poder animar SOLO la línea via CSS keyframe.
          // Las 4 esquinas (corners) quedan estáticas. Acepta size/color/strokeWidth
          // como props para que se vea igual al resto de los íconos lucide.
          const AnimatedScanIcon = ({ size = 22, color = '#fff', strokeWidth = 2.2 }) => (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
                 stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
              {/* 4 esquinas del marco — estáticas */}
              <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
              <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
              <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
              {/* Línea de scan — animada con translateY infinito */}
              <line x1="7" y1="12" x2="17" y2="12" style={{ animation:'scan-line-bounce 1.6s ease-in-out infinite' }} />
              <style>{`
                @keyframes scan-line-bounce {
                  0%, 100% { transform: translateY(-3px); }
                  50%      { transform: translateY(3px); }
                }
              `}</style>
            </svg>
          )

          // Ícono QR animado: hace zoom in/out apareciendo y desapareciendo
          // en loop para refuerza la idea de "mostrar". Envuelve el QrCode de
          // lucide en un div con keyframe scale + opacity.
          const AnimatedQrIcon = ({ size = 22, color = '#fff', strokeWidth = 2.2 }) => (
            <span style={{
              display:'inline-flex',
              transformOrigin:'center',
              animation:'qr-zoom-pulse 1.8s ease-in-out infinite',
            }}>
              <QrCode size={size} color={color} strokeWidth={strokeWidth} />
              <style>{`
                @keyframes qr-zoom-pulse {
                  0%, 100% { transform: scale(0.55); opacity: 0; }
                  45%, 55% { transform: scale(1);    opacity: 1; }
                }
              `}</style>
            </span>
          )
          const VIOLET = {
            bg:         'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(168,85,247,0.10), rgba(189,75,248,0.14))',
            border:     'rgba(168,85,247,0.42)',
            iconBg:     'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #BD4BF8 100%)',
            shadow:     '0 6px 22px rgba(168,85,247,0.40)',
            arrowColor: 'rgba(196,181,253,0.88)',
          }
          // Si no es owner, las opciones de "registrar visita" y "mostrar QR
          // del negocio" no aplican — solo dejamos las de cliente.
          const ownerOnlyIds = new Set(['register-visit', 'show-business-qr'])
          const filteredScan = isOwner ? SCAN_GROUP : SCAN_GROUP.filter(o => !ownerOnlyIds.has(o.id))
          const filteredShow = isOwner ? SHOW_GROUP : SHOW_GROUP.filter(o => !ownerOnlyIds.has(o.id))
          const SECTIONS = [
            { id: 'scan',  title: 'Abrir escáner', Icon: AnimatedScanIcon, options: filteredScan },
            { id: 'show',  title: 'Mostrar QR',    Icon: AnimatedQrIcon,   options: filteredShow },
          ]
          return SECTIONS.map(sec => {
            const isOpen = expandedScannerSection === sec.id
            return (
              <div key={sec.id}
                style={{
                  background: VIOLET.bg,
                  border: `1px solid ${VIOLET.border}`,
                  borderRadius: 16,
                  marginBottom: 12,
                  overflow: 'hidden',
                  transition: 'border-color 160ms ease',
                }}>
                <button
                  onClick={() => setExpandedScannerSection(isOpen ? null : sec.id)}
                  style={{
                    width:'100%', textAlign:'left',
                    padding:'18px 18px',
                    background:'transparent', border:'none', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:14,
                    fontFamily:'inherit',
                  }}>
                  <div style={{
                    width:48, height:48, borderRadius:13,
                    background: VIOLET.iconBg,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0, boxShadow: VIOLET.shadow,
                  }}>
                    <sec.Icon size={22} color="#fff" strokeWidth={2.2} />
                  </div>
                  <div style={{ flex:1, minWidth:0, fontFamily:FN, fontSize:15, fontWeight:800, color:'#fff' }}>
                    {sec.title}
                  </div>
                  <ChevronDown
                    size={18}
                    color={VIOLET.arrowColor}
                    strokeWidth={2.4}
                    style={{
                      flexShrink:0,
                      transition:'transform 200ms ease',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                    }}
                  />
                </button>
                {isOpen && (
                  <div style={{
                    padding:'4px 12px 14px',
                    borderTop:`1px solid ${VIOLET.border}`,
                    display:'flex', flexDirection:'column', gap:10,
                    animation:'scanner-accordion-in 240ms ease',
                  }}>
                    {sec.options.map(renderOption)}
                  </div>
                )}
              </div>
            )
          })
        })()}

        <style>{`
          @keyframes scanner-accordion-in {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    )
  }

  // Link sutil para volver a la selección — se muestra arriba en ambos modos.
  const backToPicker = (
    <button onClick={() => { setScanMode(null); setModeSelected(false); stopCamera() }}
      style={{
        display:'inline-flex', alignItems:'center', gap:6, marginBottom:14,
        padding:'6px 12px 6px 8px',
        background:'rgba(255,255,255,0.04)', border:`1px solid ${C.rim}`, borderRadius:99,
        color:C.mist, fontFamily:FN, fontSize:11.5, fontWeight:600,
        cursor:'pointer',
      }}>
      <ChevronLeft size={13} strokeWidth={2.5} /> Cambiar modo
    </button>
  )

  // Si elige "Escanear nuevo Club", mostramos la misma estructura que el otro
  // modo: título + botón "Abrir cámara" → JsQrScanner que detecta QR de
  // comercio y redirige al perfil del club con flag from_qr=1.
  if (scanMode === 'join-club') {
    return (
      <div style={{ maxWidth:440, margin:'0 auto', padding:'30px 18px 80px' }}>
        {backToPicker}
        <div style={{ fontFamily:FN, fontSize:10, color:C.o, fontWeight:800, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:8 }}>✦ Escáner QR</div>
        <h1 style={{ fontFamily:FN, fontSize:'clamp(22px,4vw,32px)', fontWeight:900, color:C.white, marginBottom:4 }}>Quiero sumarme a un club</h1>
        <p style={{ fontSize:13, color:C.mist, marginBottom:22 }}>Apuntá la cámara al QR del local para sumarte como cliente.</p>

        {joinScanError && (
          <div style={{ marginBottom:14, padding:'10px 13px', background:'rgba(248,116,68,0.10)', border:'1px solid rgba(248,116,68,0.32)', borderRadius:10, fontSize:12, color:'#fca36b', display:'flex', alignItems:'flex-start', gap:8 }}>
            <span style={{ flexShrink:0 }}>⚠</span>
            <span>{joinScanError}</span>
          </div>
        )}

        <PCard style={{ overflow:'hidden', marginBottom:14 }}>
          {joinScanActive && (
            <JsQrScanner
              onDecode={async (text) => {
                const match = text.match(/\/(?:join|club)\/([^/?#\s]+)/)
                if (!match) {
                  setJoinScanError('Este QR no pertenece a un club de Benefix.')
                  setJoinScanActive(false)
                  return
                }
                const slug = match[1]
                const sb = getSupabase()
                const { data: c } = await sb.from('commerces').select('id, slug').eq('slug', slug).eq('active', true).maybeSingle()
                if (!c) {
                  setJoinScanError('No encontramos el negocio del QR.')
                  setJoinScanActive(false)
                  return
                }
                window.location.href = `/club/${slug}?from_qr=1`
              }}
              onError={() => setJoinScanError('No se pudo acceder a la cámara. Revisá los permisos.')}
            />
          )}
          {!joinScanActive && (
            <div style={{ padding:24, textAlign:'center' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
                <div style={{ width:64, height:64, borderRadius:16, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Camera size={28} color='rgba(255,255,255,0.50)' strokeWidth={2} />
                </div>
              </div>
              <GBtn onClick={() => { setJoinScanError(''); setJoinScanActive(true) }} style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'14px' }}>
                Abrir cámara
              </GBtn>
            </div>
          )}
        </PCard>
      </div>
    )
  }

  // Modo "show-my-qr" — el dueño quiere mostrar su QR personal (BENEFIX PASS)
  // a OTRO comerciante para que le sume visita en su local. Es la misma lógica
  // que el cliente: el QR codifica CLUB-{userId} y el otro comercio lo escanea
  // con su scanner para registrar visita en SU sistema.
  // Mostrar el QR del negocio para que un cliente nuevo se sume al club.
  // El QR codifica /club/{slug}?from_qr=1 — al escanearlo el cliente cae
  // directo en la página pública del comercio con el slider activado.
  if (scanMode === 'show-business-qr') {
    const selectedCommerce = myCommerces.find(c => c.id === commerceId) || myCommerces[0]
    if (!selectedCommerce) {
      return (
        <div style={{ maxWidth:440, margin:'0 auto', padding:'30px 18px 80px' }}>
          {backToPicker}
          <div style={{ textAlign:'center', padding:'40px 24px', color:C.mist }}>
            Primero registrá tu negocio para poder mostrar tu QR.
          </div>
        </div>
      )
    }
    const joinUrl = typeof window !== 'undefined' && selectedCommerce.slug
      ? `${window.location.origin}/club/${selectedCommerce.slug}?from_qr=1`
      : ''
    return (
      <div style={{ maxWidth:440, margin:'0 auto', padding:'30px 18px 80px' }}>
        {backToPicker}
        <div style={{ fontFamily:FN, fontSize:10, color:C.o, fontWeight:800, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:8 }}>✦ Escáner QR</div>
        <h1 style={{ fontFamily:FN, fontSize:'clamp(22px,4vw,32px)', fontWeight:900, color:C.white, marginBottom:4 }}>QR de tu negocio</h1>
        <p style={{ fontSize:13, color:C.mist, marginBottom:22 }}>Mostrale este código a un cliente nuevo para que se una al club desde su celular.</p>

        {/* Selector si hay múltiples comercios */}
        {myCommerces.length > 1 && (
          <PCard style={{ padding:14, marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.mist, marginBottom:6, fontFamily:FN, fontWeight:600 }}>Tu comercio</div>
            <select value={commerceId} onChange={e => setCommerceId(e.target.value)}
              style={{ background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'10px 13px', fontSize:13, color:C.pearl, width:'100%' }}>
              <option value="">Seleccioná un comercio...</option>
              {myCommerces.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </PCard>
        )}

        <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
          <div style={{ width:'100%', maxWidth:340, borderRadius:24, overflow:'hidden', boxShadow:'0 24px 64px rgba(168,85,247,0.30), 0 8px 24px rgba(0,0,0,0.50)' }}>
            <div style={{ background:'linear-gradient(135deg, #6d28d9 0%, #a855f7 50%, #BD4BF8 100%)', padding:'22px 22px 20px', position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.65)', textTransform:'uppercase', letterSpacing:'.10em', marginBottom:2 }}>Benefix</div>
                  <div style={{ fontFamily:FN, fontSize:18, fontWeight:800, color:'#fff' }}>{selectedCommerce.name}</div>
                </div>
                <div style={{ width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Store size={18} color="#fff" strokeWidth={2} />
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'center' }}>
                <div style={{ background:'#fff', borderRadius:14, padding:14 }}>
                  {joinUrl
                    ? <QRCodeSVG value={joinUrl} size={200} bgColor="#ffffff" fgColor="#000000" level="M" />
                    : <div style={{ width:200, height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'#999', fontSize:11 }}>Generando…</div>
                  }
                </div>
              </div>
              <div style={{ textAlign:'center', marginTop:14, fontSize:11, color:'rgba(255,255,255,0.70)' }}>
                Escaneá para unirte al club
              </div>
            </div>
            <div style={{ background:'#1a1132', padding:'12px 22px', textAlign:'center' }}>
              <div style={{ fontFamily:FI, fontSize:11, color:'rgba(255,255,255,0.55)', wordBreak:'break-all' }}>
                {joinUrl.replace(/^https?:\/\//, '')}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (scanMode === 'show-my-qr') {
    const passQrValue = `CLUB-${user?.id || 'demo'}`
    const displayName = profile?.full_name || profile?.name || 'Tu cuenta'
    return (
      <div style={{ maxWidth:440, margin:'0 auto', padding:'30px 18px 80px' }}>
        {backToPicker}
        <div style={{ fontFamily:FN, fontSize:10, color:C.o, fontWeight:800, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:8 }}>✦ Escáner QR</div>
        <h1 style={{ fontFamily:FN, fontSize:'clamp(22px,4vw,32px)', fontWeight:900, color:C.white, marginBottom:4 }}>Mostrá tu QR</h1>
        <p style={{ fontSize:13, color:C.mist, marginBottom:22 }}>Mostrale este código al comerciante para que te sume visita en su local.</p>

        <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
          <div style={{ width:'100%', maxWidth:340, borderRadius:28, overflow:'hidden', boxShadow:'0 24px 64px rgba(189,75,248,0.30), 0 8px 24px rgba(0,0,0,0.50)' }}>
            <div style={{ background:'linear-gradient(145deg, #7c3aed 0%, #a855f7 45%, #ec4899 100%)', padding:'24px 24px 28px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-32, right:-32, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.10)', filter:'blur(24px)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:-24, left:-16, width:90, height:90, borderRadius:'50%', background:'rgba(236,72,153,0.25)', filter:'blur(20px)', pointerEvents:'none' }} />
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, position:'relative' }}>
                <div>
                  <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.01em', lineHeight:1 }}>BENEFIX PASS</div>
                  <div style={{ fontFamily:FI, fontSize:12, color:'rgba(255,255,255,0.65)', marginTop:4 }}>Tu pase de beneficios</div>
                </div>
                <div style={{ width:38, height:38, borderRadius:12, background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,0.25)' }}>
                  <QrCode size={18} color="white" strokeWidth={2} />
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'center', position:'relative' }}>
                <div style={{ background:'#fff', borderRadius:14, padding:14 }}>
                  <QRCodeSVG value={passQrValue} size={200} bgColor="#ffffff" fgColor="#000000" level="M" />
                </div>
              </div>
              <div style={{ textAlign:'center', marginTop:22, position:'relative' }}>
                <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-.01em' }}>{displayName}</div>
                <div style={{ fontFamily:'monospace', fontSize:10, color:'rgba(255,255,255,0.50)', marginTop:5, letterSpacing:'.12em', textTransform:'uppercase' }}>
                  CLUB · {(user?.id || '').slice(0,8).toUpperCase()}
                </div>
              </div>
            </div>
            <div style={{ background:'linear-gradient(to bottom right, #4c1d95, #3b0764)', padding:'14px 24px 16px', textAlign:'center' }}>
              <div style={{ fontFamily:FI, fontSize:11, color:'rgba(255,255,255,0.55)', letterSpacing:'.04em' }}>
                Mostrá este código en caja para acumular beneficios
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth:440, margin:'0 auto', padding:'30px 18px 80px' }}>
      {backToPicker}
      <div style={{ fontFamily:FN, fontSize:10, color:C.o, fontWeight:800, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:8 }}>✦ Escáner QR</div>
      <h1 style={{ fontFamily:FN, fontSize:'clamp(22px,4vw,32px)', fontWeight:900, color:C.white, marginBottom:4 }}>Registrar visita</h1>
      <p style={{ fontSize:13, color:C.mist, marginBottom:22 }}>Apuntá la cámara al QR del socio.</p>

      <HelpBanner
        id="merchant-scanner"
        title="Escaneás a un cliente"
        body="Pedile al cliente que abra su QR (en su app, en Mi QR) y enfocá con la cámara. Si tu sistema es por puntos, primero ingresá el monto de la compra. Cuando el QR se reconoce, suma la visita y, si tiene un cupón guardado, te avisamos para aplicarlo."
      />

      {/* Selector de comercio */}
      {myCommerces.length > 1 && (
        <PCard style={{ padding:16, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.mist, marginBottom:6, fontFamily:FN, fontWeight:600 }}>Tu comercio</div>
          <select value={commerceId} onChange={e=>setCommerceId(e.target.value)}
            style={{ background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'10px 13px', fontSize:13, color:C.pearl, width:'100%' }}>
            <option value="">Seleccioná un comercio...</option>
            {myCommerces.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </PCard>
      )}

      {/* Monto de la compra — solo para PUNTOS. Para STARS con min_purchase
          ahora se usa el gate modal previo (Sí/No aplica), no hay input acá. */}
      {(() => {
        const sel = myCommerces.find(c => c.id === commerceId)
        if (!sel || cameraActive || result) return null
        if (sel.prog_type !== 'points') return null
        return (
          <PCard style={{ padding:16, marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.mist, marginBottom:6, fontFamily:FN, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
              <Gem size={11} color="#EC4899" strokeWidth={2} /> Monto de la compra (en pesos)
            </div>
            <input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Ej: 2500" inputMode="numeric"
              style={{ background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'11px 13px', fontSize:14, color:C.pearl, width:'100%', boxSizing:'border-box' }} />
            <div style={{ fontSize:10, color:C.dust, marginTop:6 }}>
              1 peso = 1 punto. Esto se suma al saldo del cliente al escanear.
            </div>
          </PCard>
        )
      })()}

      {/* ── GATE MODAL: pre-scan para STARS con compra mínima ── */}
      {scanGate === 'min_check' && (() => {
        const sel = myCommerces.find(c => c.id === commerceId)
        const min = sel?.prog_min_purchase || 0
        return (
          <div onClick={() => setScanGate(null)}
            style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ position:'relative', borderRadius:20, padding:'24px 22px', width:'100%', maxWidth:360, background:'linear-gradient(180deg, rgba(251,191,36,0.18) 0%, rgba(251,191,36,0.04) 60%, rgba(0,0,0,0.4) 100%)', border:'1px solid rgba(251,191,36,0.40)', boxShadow:'0 32px 80px rgba(251,191,36,0.20)' }}>
              <button onClick={() => setScanGate(null)} aria-label="Cerrar"
                style={{ position:'absolute', top:14, right:14, width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.40)', border:'1px solid rgba(255,255,255,0.18)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                <X size={14} strokeWidth={2.5} />
              </button>
              <div style={{ width:54, height:54, borderRadius:14, background:'rgba(251,191,36,0.22)', border:'1px solid rgba(251,191,36,0.50)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                <Star size={26} color="rgba(251,191,36,0.95)" fill="currentColor" strokeWidth={0} />
              </div>
              <div style={{ fontFamily:FN, fontSize:11, fontWeight:800, color:'rgba(251,191,36,0.95)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>Compra mínima</div>
              <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, lineHeight:1.3, marginBottom:8 }}>
                Recordá que la compra mínima para sumar estrella es de <span style={{ color:'rgba(251,191,36,1)' }}>${min.toLocaleString('es-AR')}</span>
              </div>
              <div style={{ fontSize:13, color:C.mist, marginBottom:18, lineHeight:1.55 }}>¿La compra del cliente alcanza el mínimo?</div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={handleGateNo}
                  style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:12, color:C.pearl, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>No aplica</button>
                <button onClick={handleGateYes}
                  style={{ flex:1, padding:'12px', background:'linear-gradient(135deg, rgba(251,191,36,0.95), #f59e0b)', border:'none', borderRadius:12, color:'#0a0a0a', fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer' }}>Sí, aplica ★</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── GATE MODAL 2: dijo "no aplica" pero hay descuento activo ── */}
      {scanGate === 'no_min_with_discount' && (
        <div onClick={() => { setScanGate(null); setSkipStar(false) }}
          style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position:'relative', borderRadius:20, padding:'24px 22px', width:'100%', maxWidth:360, background:'linear-gradient(180deg, rgba(254,80,0,0.18) 0%, rgba(189,75,248,0.10) 60%, rgba(0,0,0,0.4) 100%)', border:'1px solid rgba(254,80,0,0.40)', boxShadow:'0 32px 80px rgba(254,80,0,0.20)' }}>
            <button onClick={() => { setScanGate(null); setSkipStar(false) }} aria-label="Cerrar"
              style={{ position:'absolute', top:14, right:14, width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.40)', border:'1px solid rgba(255,255,255,0.18)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <X size={14} strokeWidth={2.5} />
            </button>
            <div style={{ width:54, height:54, borderRadius:14, background:'rgba(254,80,0,0.22)', border:'1px solid rgba(254,80,0,0.50)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
              <Flame size={26} color={C.o} strokeWidth={2} />
            </div>
            <div style={{ fontFamily:FN, fontSize:11, fontWeight:800, color:C.o, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>Descuento disponible</div>
            <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, lineHeight:1.3, marginBottom:10 }}>
              No suma estrella, pero el cliente igual puede sumar el <span style={{ color:C.o }}>descuento de próxima compra</span>
            </div>
            <div style={{ fontSize:12, color:C.mist, marginBottom:18, lineHeight:1.55 }}>Al escanear, no se le va a sumar estrella, pero sí va a quedar el cupón de descuento activo en su próxima visita.</div>
            <button onClick={handleApplyDiscountOnly}
              style={{ width:'100%', padding:'13px', background:`linear-gradient(135deg, ${C.o}, #f97316)`, border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:`0 6px 22px rgba(254,80,0,0.40)` }}>
              Continuar y aplicar descuento
            </button>
          </div>
        </div>
      )}

      {/* ── POST-SCAN MODAL: renovar descuento usado ──
          X y backdrop disparan 'decline' (igual que el botón "No") para que
          el cliente reciba siempre el aviso del resultado de la decisión. */}
      {renewDiscountPromo && (
        <div onClick={() => submitDiscountDecision('decline')}
          style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position:'relative', borderRadius:20, padding:'24px 22px', width:'100%', maxWidth:360, background:'linear-gradient(180deg, rgba(189,75,248,0.18) 0%, rgba(189,75,248,0.04) 60%, rgba(0,0,0,0.4) 100%)', border:'1px solid rgba(189,75,248,0.40)', boxShadow:'0 32px 80px rgba(189,75,248,0.25)' }}>
            <button onClick={() => submitDiscountDecision('decline')} aria-label="Cerrar"
              style={{ position:'absolute', top:14, right:14, width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.40)', border:'1px solid rgba(255,255,255,0.18)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <X size={14} strokeWidth={2.5} />
            </button>
            <div style={{ width:54, height:54, borderRadius:14, background:'rgba(189,75,248,0.22)', border:'1px solid rgba(189,75,248,0.50)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
              <RefreshCw size={26} color={C.v} strokeWidth={2} />
            </div>
            <div style={{ fontFamily:FN, fontSize:11, fontWeight:800, color:C.v, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>Descuento canjeado</div>
            <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, lineHeight:1.3, marginBottom:10 }}>
              ¿Renovar descuento para próxima compra?
            </div>
            <div style={{ fontSize:12, color:C.mist, marginBottom:18, lineHeight:1.55 }}>El cliente acaba de usar su descuento. Si renovás, le queda otro cupón activo con la misma fecha de vencimiento.</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => submitDiscountDecision('decline')}
                style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:12, color:C.pearl, fontFamily:FN, fontSize:13, fontWeight:600, cursor:'pointer' }}>No</button>
              <button onClick={() => submitDiscountDecision('renew')}
                style={{ flex:1, padding:'12px', background:GV, border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer' }}>Sí, renovar</button>
            </div>
          </div>
        </div>
      )}

      {/* Visor de cámara */}
      <PCard style={{ overflow:'hidden', marginBottom:14 }}>
        {cameraActive && (
          <JsQrScanner
            onDecode={(text) => handleScan(text)}
            onError={() => setCameraError('No se pudo acceder a la cámara. Revisá los permisos.')}
          />
        )}

        {!cameraActive && !processing && (
          <div style={{ padding:24, textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
              <div style={{ width:64, height:64, borderRadius:16, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Camera size={28} color='rgba(255,255,255,0.50)' strokeWidth={2} />
              </div>
            </div>
            <GBtn onClick={startCamera} disabled={!commerceId} style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'14px' }}>
              Abrir cámara
            </GBtn>
            {!commerceId && <div style={{ fontSize:11, color:C.dust, marginTop:8 }}>Primero seleccioná tu comercio</div>}
            {cameraError && <div style={{ fontSize:12, color:'#f87', marginTop:10 }}>{cameraError}</div>}
          </div>
        )}

        {processing && (
          <div style={{ padding:32, textAlign:'center' }}>
            <div style={{ fontSize:13, color:C.mist }}>⟳ Registrando visita...</div>
          </div>
        )}

        {cameraActive && (
          <div style={{ padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1px solid ${C.rim}` }}>
            <div style={{ fontSize:12, color:C.mist }}>Apuntá al QR del cliente</div>
            <button onClick={stopCamera} style={{ background:'transparent', border:`1px solid ${C.rim}`, borderRadius:8, color:C.dust, fontSize:12, padding:'5px 12px', cursor:'pointer' }}>Cerrar</button>
          </div>
        )}
      </PCard>

      {/* ── RESULTADO ESCANEO ──
          Cartel narrativo que cuenta la historia completa de lo que pasó:
          quién es el cliente, qué ganó (estrellas/puntos), si canjeó descuento,
          si vos lo renovaste o no, etc. La idea es que el cashier lea de un
          vistazo y sepa qué decirle al cliente sin tener que interpretar nada. */}
      {result && !redeemStep && (
        <PCard style={{ padding:20, background:result.ok?`${C.ok}12`:`${C.o}10`, border:`1px solid ${result.ok?`${C.ok}55`:`${C.o}55`}` }}>
          {result.ok ? (() => {
            const firstName = (result.member_name || 'Cliente').split(' ')[0]
            const isStars   = result.prog_type === 'stars'
            const earned    = result.points_earned || 0
            // Líneas narrativas — cada item es { icon, color, text }
            const narrativeLines = []

            // 1. Sumó (o no) estrellas/puntos
            if (result.star_skipped) {
              narrativeLines.push({
                icon: AlertCircle,
                color: C.o,
                text: <>La compra no alcanzó el mínimo, así que <strong>no se le sumó estrella</strong>.</>,
              })
            } else if (earned > 0) {
              if (isStars) {
                narrativeLines.push({
                  icon: Star,
                  color: '#8B5CF6',
                  text: <><strong>{firstName}</strong> ganó <strong>{earned} estrella{earned !== 1 ? 's' : ''}</strong> por su compra.</>,
                })
              } else {
                narrativeLines.push({
                  icon: Gem,
                  color: '#EC4899',
                  text: <><strong>{firstName}</strong> ganó <strong>{earned} punto{earned !== 1 ? 's' : ''}</strong> por su compra{result.double_active ? <> <span style={{ color:C.v, fontWeight:700 }}>(×2 hoy)</span></> : null}.</>,
                })
              }
            }

            // 2. Canje de descuento (si aplicó)
            if (result.discount_redeemed) {
              const dv = result.discount_redeemed.value
              const valueTxt = dv ? `${dv}% OFF` : 'su descuento'
              narrativeLines.push({
                icon: Percent,
                color: C.o,
                text: <><strong>{firstName}</strong> canjeó <strong>{valueTxt}</strong> de descuento que tenía guardado.</>,
              })
              // Sub-resultado: depende de si el dueño ya decidió renovar/no.
              if (discountDecisionResult === 'renewed') {
                narrativeLines.push({
                  icon: RefreshCw,
                  color: C.ok,
                  text: <>Le <strong>renovaste el descuento</strong> para su próxima compra.</>,
                })
              } else if (discountDecisionResult === 'declined') {
                narrativeLines.push({
                  icon: Ban,
                  color: 'rgba(255,255,255,0.55)',
                  text: <><strong>No le renovaste el descuento</strong>. Ya no tiene cupón pendiente.</>,
                })
              }
              // Si discountDecisionResult es null, el modal todavía está abierto
              // o se cerró antes de decidir — no agregamos sub-mensaje.
            }

            // 3. Suma doble (si aplica y aún no se mencionó)
            if (result.double_active && !isStars && earned === 0) {
              narrativeLines.push({
                icon: Zap,
                color: C.v,
                text: <>Hoy hay <strong>doble suma</strong> activa.</>,
              })
            }

            // 4. Cupones discount_next que le quedan al cliente.
            //    Si justo acabó de canjear uno y NO se renovó, no aparece nada.
            //    Si tiene otros activos (ej: el dueño le otorgó manualmente
            //    desde la ficha), los listamos.
            const remainingCoupons = result.active_coupons || []
            // Filtramos el que se acaba de canjear si el dueño NO lo renovó —
            // en ese caso ese cupón NO debería contarse como "lo que le queda".
            const visibleCoupons = remainingCoupons.filter(c => {
              if (!result.discount_redeemed) return true
              if (c.promotion_id !== result.discount_redeemed.promo_id) return true
              // Misma promo que se canjeó: solo lo mostramos si el dueño la renovó.
              return discountDecisionResult === 'renewed'
            })
            if (visibleCoupons.length > 0) {
              const list = visibleCoupons.map(c => c.value ? `${c.value}% OFF` : 'descuento').join(', ')
              narrativeLines.push({
                icon: Percent,
                color: C.v,
                text: <>Le {visibleCoupons.length === 1 ? 'queda' : 'quedan'} <strong>{visibleCoupons.length} cupón{visibleCoupons.length !== 1 ? 'es' : ''} pendiente{visibleCoupons.length !== 1 ? 's' : ''}</strong>: {list}.</>,
              })
            } else if (result.discount_redeemed && discountDecisionResult === 'declined') {
              // Caso explícito: canjeó y no le renovaste, no le queda nada.
              // Esto ya está cubierto por el bloque #2, no duplicamos línea.
            } else if (!result.discount_redeemed) {
              // No tenía cupón este scan ni le quedó ninguno activo. Solo lo
              // mencionamos si el comercio TIENE promos discount_next activas
              // (sino la línea es ruido).
              // No tenemos esa info en `result`, así que omitimos para evitar
              // un mensaje confuso. La ausencia de cupones se infiere del cartel.
            }

            // 5. Premios del catálogo que puede canjear
            const availablePrizes = result.available_prizes || []
            if (availablePrizes.length > 0) {
              const top3 = availablePrizes.slice(0, 3)
              const list = top3.map(p => `${p.name} (${p.cost}${unitIcon})`).join(', ')
              const more = availablePrizes.length > 3 ? ` y ${availablePrizes.length - 3} más` : ''
              narrativeLines.push({
                icon: Gift,
                color: C.ok,
                text: <>Puede canjear <strong>{availablePrizes.length} premio{availablePrizes.length !== 1 ? 's' : ''}</strong>: {list}{more}.</>,
              })
            } else if (result.next_prize) {
              // No puede canjear nada todavía, pero hay premios — le decimos cuánto le falta.
              const np = result.next_prize
              narrativeLines.push({
                icon: Target,
                color: C.dust,
                text: <>Le faltan <strong>{np.missing}{unitIcon}</strong> para canjear <strong>{np.name}</strong>.</>,
              })
            }

            return (
              <>
                <div style={{ fontFamily:FN, fontSize:18, fontWeight:700, color:C.ok, marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                  <CheckCircle size={18} color={C.ok} strokeWidth={2} /> Visita registrada
                </div>

                {/* Narrativa de eventos */}
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                  {narrativeLines.map((line, i) => {
                    const Icon = line.icon
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', background:'rgba(255,255,255,0.03)', border:`1px solid ${line.color}33`, borderRadius:10 }}>
                        <div style={{ width:24, height:24, borderRadius:7, background:`${line.color}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Icon size={13} color={line.color} strokeWidth={2.2} />
                        </div>
                        <div style={{ fontSize:13, color:C.pearl, lineHeight:1.45, paddingTop:1 }}>
                          {line.text}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Stats — visitas totales + balance actual */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                  <div style={{ background:C.bg3, borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                    <div style={{ fontFamily:FN, fontSize:22, fontWeight:700, color:C.o }}>{result.visit_count}</div>
                    <div style={{ fontSize:10, color:C.dust }}>visitas totales</div>
                  </div>
                  <div style={{ background:C.bg3, borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                    <div style={{ fontFamily:FN, fontSize:22, fontWeight:700, color:unitColor }}>{unitIcon} {result.points_now}</div>
                    <div style={{ fontSize:10, color:C.dust }}>{unitLabel}</div>
                  </div>
                </div>

                {/* CTA de canje si puede */}
                {result.can_redeem ? (
                  <div style={{ background:`${C.ok}18`, border:`1px solid ${C.ok}55`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.ok, marginBottom:6, display:'flex', alignItems:'center', gap:6 }}><CheckCircle size={13} color={C.ok} strokeWidth={2} /> ¡Listo para canjear un premio!</div>
                    <div style={{ fontSize:12, color:C.mist, marginBottom:12 }}>
                      {firstName} tiene {result.points_now} {unitLabel} y puede canjear.
                    </div>
                    <GBtn onClick={openRedeem} style={{ width:'100%', justifyContent:'center', fontSize:13 }}>
                      <Gift size={13} strokeWidth={2} /> Canjear premio
                    </GBtn>
                  </div>
                ) : null}

                <button onClick={resetAll}
                  style={{ width:'100%', padding:'10px', background:'transparent', border:`1px solid ${C.rim}`, borderRadius:10, color:C.mist, fontFamily:FN, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  Escanear otro cliente
                </button>
              </>
            )
          })() : (
            <>
              <div style={{ fontFamily:FN, fontSize:16, fontWeight:900, color:C.o, marginBottom:6 }}>⚠ Error</div>
              <div style={{ fontSize:13, color:C.mist, marginBottom:12 }}>{result.error}</div>
              <GBtn onClick={resetAll} style={{ width:'100%', justifyContent:'center' }}>
                Intentar de nuevo
              </GBtn>
            </>
          )}
        </PCard>
      )}

      {/* ── SELECCIÓN DE PREMIO ── */}
      {result?.ok && redeemStep === 'selecting' && (
        <PCard style={{ padding:20 }}>
          <button onClick={() => setRedeemStep(null)}
            style={{ background:'none', border:'none', color:C.mist, fontSize:12, cursor:'pointer', padding:'0 0 12px', display:'block' }}>
            ← Volver
          </button>
          <div style={{ fontFamily:FN, fontSize:17, fontWeight:900, color:C.white, marginBottom:4 }}>¿Qué premio canjeás?</div>
          <div style={{ fontSize:12, color:C.mist, marginBottom:18 }}>
            {result.member_name} · {result.points_now} {unitIcon} disponibles
          </div>
          {redeemPrizes.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:C.dust, fontSize:13 }}>
              No hay premios disponibles para este saldo.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
              {redeemPrizes.map(p => (
                <button key={p.id} onClick={() => { setSelectedPrize(p); setRedeemStep('confirming') }}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background: selectedPrize?.id===p.id ? `${C.v}22` : C.bg3, border:`1.5px solid ${selectedPrize?.id===p.id ? C.v : C.rim}`, borderRadius:12, cursor:'pointer', textAlign:'left', transition:'background 130ms ease, border-color 130ms ease, color 130ms ease, transform 130ms cubic-bezier(0.23,1,0.32,1)' }}>
                  <div>
                    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, marginBottom:2, display:'flex', alignItems:'center', gap:5 }}><Gift size={12} color={C.mist} strokeWidth={2} />{p.name}</div>
                    <div style={{ fontSize:11, color:unitColor }}>{p.cost} {unitLabel}</div>
                  </div>
                  <div style={{ fontSize:11, color:C.ok, fontWeight:700 }}>
                    Quedarán: {result.points_now - p.cost} {unitIcon}
                  </div>
                </button>
              ))}
            </div>
          )}
        </PCard>
      )}

      {/* ── CONFIRMACIÓN ── */}
      {result?.ok && redeemStep === 'confirming' && selectedPrize && (
        <PCard style={{ padding:24 }}>
          <button onClick={() => setRedeemStep('selecting')}
            style={{ background:'none', border:'none', color:C.mist, fontSize:12, cursor:'pointer', padding:'0 0 16px', display:'block' }}>
            ← Cambiar premio
          </button>
          <div style={{ textAlign:'center', marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
              <div style={{ width:56, height:56, borderRadius:14, background:`${C.v}22`, border:`1px solid ${C.v}44`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Gift size={26} color={C.v} strokeWidth={2} />
              </div>
            </div>
            <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, marginBottom:4 }}>{selectedPrize.name}</div>
            <div style={{ fontSize:13, color:C.mist }}>
              Se van a descontar <strong style={{ color:unitColor }}>{selectedPrize.cost} {unitIcon}</strong> de la cuenta de<br />
              <strong style={{ color:C.white }}>{result.member_name}</strong>
            </div>
          </div>
          <div style={{ background:C.bg3, borderRadius:12, padding:'12px 16px', marginBottom:20, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:C.mist }}>Saldo actual</span>
            <span style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:unitColor }}>{result.points_now} {unitIcon}</span>
          </div>
          <div style={{ background:C.bg3, borderRadius:12, padding:'12px 16px', marginBottom:20, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:C.mist }}>Saldo después del canje</span>
            <span style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{result.points_now - selectedPrize.cost} {unitIcon}</span>
          </div>
          <GBtn onClick={confirmRedeem} disabled={redeeming} style={{ width:'100%', justifyContent:'center', fontSize:14, padding:'13px', marginBottom:10 }}>
            {redeeming ? '⟳ Procesando...' : '✓ Confirmar canje'}
          </GBtn>
          <button onClick={() => setRedeemStep(null)}
            style={{ width:'100%', padding:'10px', background:'transparent', border:`1px solid ${C.rim}`, borderRadius:10, color:C.mist, fontFamily:FN, fontSize:12, cursor:'pointer' }}>
            Cancelar
          </button>
        </PCard>
      )}

      {/* ── CANJE EXITOSO ── */}
      {redeemStep === 'done' && redeemResult && (
        <PCard style={{ padding:24, background:`${C.ok}12`, border:`1px solid ${C.ok}44` }}>
          {redeemResult.ok ? (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:`${C.ok}22`, border:`2px solid ${C.ok}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}><CheckCircle size={28} color={C.ok} strokeWidth={2} /></div>
                <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:C.ok, marginBottom:6 }}>¡Premio canjeado!</div>
                <div style={{ fontSize:14, color:C.white, marginBottom:4 }}>{redeemResult.prize_name}</div>
                <div style={{ fontSize:12, color:C.mist }}>
                  Nuevo saldo: <strong style={{ color:unitColor }}>{redeemResult.new_balance} {unitIcon}</strong>
                </div>
              </div>
              <GBtn onClick={resetAll} style={{ width:'100%', justifyContent:'center', fontSize:14, padding:'13px' }}>
                Escanear otro cliente
              </GBtn>
            </>
          ) : (
            <>
              <div style={{ fontFamily:FN, fontSize:16, fontWeight:900, color:C.o, marginBottom:6 }}>⚠ Error al canjear</div>
              <div style={{ fontSize:13, color:C.mist, marginBottom:14 }}>{redeemResult.error}</div>
              <GBtn onClick={() => setRedeemStep('selecting')} style={{ width:'100%', justifyContent:'center' }}>
                Intentar de nuevo
              </GBtn>
            </>
          )}
        </PCard>
      )}
    </div>
  )
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function AdminView({ cities: initialCities, profile }) {
  const supabase = getSupabase()

  // ── State (all hooks before early-return guard) ──────────────────────────────
  const [tab, setTab]               = useState('overview')
  const [commerces, setCommerces]   = useState([])
  const [users, setUsers]           = useState([])
  const [cities, setCities]         = useState(initialCities || [])
  const [loading, setLoading]       = useState(true)
  const [stats, setStats]           = useState({ commerces:0, members:0, visits:0, redemptions:0 })
  const [search, setSearch]         = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedCommerce, setSelectedCommerce] = useState(null)
  const [actioning, setActioning]   = useState(null)
  const [newCity, setNewCity]       = useState({ name:'', province:'' })
  const [addingCity, setAddingCity] = useState(false)
  const [broadcast, setBroadcast]   = useState('')
  const [config, setConfig]         = useState({ allowSignup:true, requireApproval:false, maintenance:false })

  useEffect(() => {
    if (profile?.role !== 'admin') return
    Promise.all([
      supabase.from('commerces').select('id, name, slug, category, plan, active, featured, rating, created_at, owner_id, emoji, city:cities(id,name,province)'),
      supabase.from('profiles').select('id, name, email, phone, role, created_at', { count:'exact' }),
      supabase.from('visits').select('*', { count:'exact', head:true }),
      supabase.from('memberships').select('*', { count:'exact', head:true }),
    ]).then(([{ data:c }, { data:u, count:uc }, { count:vc }, { count:mc }]) => {
      setCommerces(c || [])
      setUsers(u || [])
      setStats({ commerces:(c||[]).length, members:uc||0, visits:vc||0, memberships:mc||0 })
      setLoading(false)
    })
  }, [profile?.role])

  // ── Access guard (AFTER hooks) ───────────────────────────────────────────────
  if (profile?.role !== 'admin') return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
        <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Lock size={24} color='rgba(255,255,255,0.50)' strokeWidth={2} />
        </div>
      </div>
      <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.white, marginBottom:8 }}>Acceso restringido</div>
      <div style={{ color:C.mist, fontSize:13 }}>Esta sección es solo para administradores.</div>
    </div>
  )

  // ── Derived ───────────────────────────────────────────────────────────────────
  const pendingCommerces = commerces.filter(c => !c.active)
  const filteredCommerces = commerces.filter(c => {
    const matchPlan   = filterPlan   === 'all' || c.plan   === filterPlan
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? c.active : !c.active)
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.city?.name?.toLowerCase().includes(search.toLowerCase())
    return matchPlan && matchStatus && matchSearch
  })

  // ── Helpers ───────────────────────────────────────────────────────────────────
  async function approveCommerce(id) {
    setActioning(id)
    await supabase.from('commerces').update({ active:true }).eq('id', id)
    setCommerces(prev => prev.map(c => c.id === id ? {...c, active:true} : c))
    if (selectedCommerce?.id === id) setSelectedCommerce(prev => ({...prev, active:true}))
    setActioning(null)
  }
  async function suspendCommerce(id) {
    setActioning(id)
    await supabase.from('commerces').update({ active:false }).eq('id', id)
    setCommerces(prev => prev.map(c => c.id === id ? {...c, active:false} : c))
    if (selectedCommerce?.id === id) setSelectedCommerce(prev => ({...prev, active:false}))
    setActioning(null)
  }
  async function changePlan(id, plan) {
    await supabase.from('commerces').update({ plan }).eq('id', id)
    setCommerces(prev => prev.map(c => c.id === id ? {...c, plan} : c))
    if (selectedCommerce?.id === id) setSelectedCommerce(prev => ({...prev, plan}))
  }
  async function handleAddCity(e) {
    e.preventDefault()
    if (!newCity.name.trim() || !newCity.province.trim()) return
    setAddingCity(true)
    const slug = newCity.name.toLowerCase().replace(/\s+/g, '-').replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]||c))
    const { data } = await supabase.from('cities').insert([{ slug, name:newCity.name.trim(), province:newCity.province.trim() }]).select().single()
    if (data) setCities(prev => [...prev, data])
    setNewCity({ name:'', province:'' })
    setAddingCity(false)
  }

  const planColor = (p) => p === 'pro' ? C.o : p === 'starter' ? C.v : C.dust
  const TABS = [
    { id:'overview',   label:'Overview',  Icon:LayoutDashboard },
    { id:'comercios',  label:'Comercios', Icon:Building2       },
    { id:'usuarios',   label:'Usuarios',  Icon:Users           },
    { id:'ciudades',   label:'Ciudades',  Icon:Globe           },
    { id:'actividad',  label:'Actividad', Icon:Activity        },
    { id:'config',     label:'Config',    Icon:Settings        },
  ]

  return (
    <div style={{ maxWidth:980, margin:'0 auto', padding:'26px 18px 80px' }}>
      {/* Header */}
      <div className="fu" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:18, flexWrap:'wrap', gap:11 }}>
        <Logo big />
        <Pill color={C.ok}>● Sistema activo</Pill>
      </div>
      <GradLine />

      {/* Pending alert banner */}
      {pendingCommerces.length > 0 && (
        <div className="fu" style={{ margin:'14px 0', padding:'12px 16px', borderRadius:12, background:'rgba(254,80,0,0.10)', border:`1px solid ${C.o}40`, display:'flex', alignItems:'center', gap:10 }}>
          <AlertTriangle size={16} color={C.o} />
          <span style={{ fontSize:12, color:C.o, fontFamily:FN, fontWeight:700 }}>
            {pendingCommerces.length} comercio{pendingCommerces.length>1?'s':''} pendiente{pendingCommerces.length>1?'s':''} de aprobación
          </span>
          <button onClick={()=>{ setTab('comercios'); setFilterStatus('inactive') }}
            style={{ marginLeft:'auto', fontSize:11, color:C.o, background:'transparent', border:`1px solid ${C.o}60`, borderRadius:7, padding:'3px 10px', cursor:'pointer', fontFamily:FN }}>
            Ver
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(175px, 1fr))', gap:10, margin:'18px 0 20px' }}>
        {[
          { Icon:Building2, label:'Comercios',     value:stats.commerces, color:C.o,    sub:`${pendingCommerces.length} pendientes` },
          { Icon:Users,     label:'Usuarios',       value:fmt(stats.members), color:C.v  },
          { Icon:Camera,    label:'Visitas',         value:fmt(stats.visits),  color:C.info },
          { Icon:Star,      label:'Membresías',      value:fmt(stats.memberships||0), color:C.ok },
        ].map((x,i) => (
          <PCard key={i} className="fu" style={{ padding:16, animationDelay:`${i*60}ms` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <x.Icon size={17} color={x.color} strokeWidth={2} />
              <TrendingUp size={13} color={C.ok} strokeWidth={2} />
            </div>
            <div style={{ fontFamily:FN, fontSize:24, fontWeight:900, color:x.color, marginBottom:2 }}>{x.value}</div>
            <div style={{ fontSize:11, color:C.mist }}>{x.label}</div>
            {x.sub && <div style={{ fontSize:10, color:C.o, marginTop:4 }}>{x.sub}</div>}
          </PCard>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.rim}`, marginBottom:20, overflowX:'auto', gap:2 }} className="scroll-hide-bar">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button key={id} onClick={()=>setTab(id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', background:'transparent', border:'none', borderBottom:`2px solid ${active?C.v:'transparent'}`, color:active?C.white:C.mist, fontSize:12, fontWeight:active?700:400, cursor:'pointer', fontFamily:FN, whiteSpace:'nowrap', flexShrink:0, transition:'color 160ms ease, border-color 160ms ease' }}>
              <Icon size={13} strokeWidth={2} />
              {label}
            </button>
          )
        })}
      </div>

      {loading && <Spinner />}

      {/* ── OVERVIEW TAB ── */}
      {!loading && tab === 'overview' && (
        <div style={{ display:'grid', gap:14 }}>
          <PCard style={{ padding:18 }}>
            <div style={{ fontFamily:FN, fontSize:10, color:C.mist, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:14 }}>Últimos comercios</div>
            {commerces.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,8).map((c,i,ar) => (
              <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:i<ar.length-1?`1px solid ${C.rim}`:'none', cursor:'pointer' }}
                onClick={()=>{ setSelectedCommerce(c); setTab('comercios') }}>
                <div style={{ display:'flex', gap:9, alignItems:'center' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:c.active?C.ok:C.o, boxShadow:`0 0 6px ${c.active?C.ok:C.o}55`, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:C.pearl, fontFamily:FN, fontWeight:600 }}>{c.name}</span>
                  <Pill color={C.dust}>{c.city?.name}</Pill>
                </div>
                <Pill color={planColor(c.plan)}>{c.plan}</Pill>
              </div>
            ))}
            {commerces.length === 0 && <div style={{ color:C.mist, fontSize:13, textAlign:'center', padding:'20px 0' }}>No hay comercios aún.</div>}
          </PCard>

          <PCard style={{ padding:18 }}>
            <div style={{ fontFamily:FN, fontSize:10, color:C.mist, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:14 }}>Distribución por plan</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {['free','starter','pro'].map(p => {
                const count = commerces.filter(c => c.plan === p).length
                const pct   = commerces.length ? Math.round(count/commerces.length*100) : 0
                return (
                  <div key={p} style={{ flex:1, minWidth:100, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'12px 14px', border:`1px solid ${planColor(p)}30` }}>
                    <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:planColor(p) }}>{count}</div>
                    <div style={{ fontSize:11, color:C.mist, marginBottom:4 }}>{p.toUpperCase()}</div>
                    <div style={{ height:4, borderRadius:99, background:'rgba(255,255,255,0.08)' }}>
                      <div style={{ height:'100%', width:`${pct}%`, borderRadius:99, background:planColor(p), transition:'width 600ms ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </PCard>
        </div>
      )}

      {/* ── COMERCIOS TAB ── */}
      {!loading && tab === 'comercios' && (
        <div style={{ display:'grid', gap:12 }}>
          {/* Filters row */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:180 }}>
              <Search size={13} color={C.mist} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }} />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar comercio…"
                style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.rim}`, borderRadius:9, padding:'8px 10px 8px 30px', color:C.white, fontSize:12, fontFamily:FI, outline:'none', boxSizing:'border-box' }} />
            </div>
            <select value={filterPlan} onChange={e=>setFilterPlan(e.target.value)}
              style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, borderRadius:9, padding:'8px 12px', color:C.mist, fontSize:11, fontFamily:FN, cursor:'pointer', outline:'none' }}>
              <option value="all">Todos los planes</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
            </select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
              style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, borderRadius:9, padding:'8px 12px', color:C.mist, fontSize:11, fontFamily:FN, cursor:'pointer', outline:'none' }}>
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <button onClick={()=>exportToCSV(filteredCommerces.map(c=>({ nombre:c.name, ciudad:c.city?.name, plan:c.plan, estado:c.active?'activo':'inactivo', creado:c.created_at?.slice(0,10) })), 'comercios')}
              style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, borderRadius:9, padding:'8px 12px', color:C.mist, fontSize:11, fontFamily:FN, cursor:'pointer' }}>
              <Download size={12} /> CSV
            </button>
          </div>

          <PCard style={{ overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.rim}` }}>
                    {['Comercio','Ciudad','Plan','Estado','Acciones'].map(h => (
                      <th key={h} style={{ padding:'10px 12px', fontSize:9, fontWeight:700, color:C.mist, textAlign:'left', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:FN, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCommerces.map(c => (
                    <tr key={c.id} style={{ borderBottom:`1px solid ${C.rim}` }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.cardH}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'10px 12px', cursor:'pointer' }} onClick={()=>setSelectedCommerce(c)}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.white, fontFamily:FN }}>{c.name}</div>
                        <div style={{ fontSize:10, color:C.mist }}>{c.category}</div>
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:12, color:C.mist, whiteSpace:'nowrap' }}>{c.city?.name}</td>
                      <td style={{ padding:'10px 12px' }}><Pill color={planColor(c.plan)}>{c.plan}</Pill></td>
                      <td style={{ padding:'10px 12px' }}><Pill color={c.active?C.ok:C.o}>{c.active?'Activo':'Pendiente'}</Pill></td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex', gap:5 }}>
                          {!c.active && (
                            <button onClick={()=>approveCommerce(c.id)} disabled={actioning===c.id}
                              style={{ display:'flex', alignItems:'center', gap:3, background:`${C.ok}18`, border:`1px solid ${C.ok}50`, borderRadius:6, padding:'4px 8px', color:C.ok, fontSize:10, fontFamily:FN, cursor:'pointer', opacity:actioning===c.id?.5:1 }}>
                              <Check size={10} /> Aprobar
                            </button>
                          )}
                          {c.active && (
                            <button onClick={()=>suspendCommerce(c.id)} disabled={actioning===c.id}
                              style={{ display:'flex', alignItems:'center', gap:3, background:`${C.o}18`, border:`1px solid ${C.o}50`, borderRadius:6, padding:'4px 8px', color:C.o, fontSize:10, fontFamily:FN, cursor:'pointer', opacity:actioning===c.id?.5:1 }}>
                              <Ban size={10} /> Suspender
                            </button>
                          )}
                          <button onClick={()=>setSelectedCommerce(c)}
                            style={{ display:'flex', alignItems:'center', gap:3, background:`${C.v}18`, border:`1px solid ${C.v}50`, borderRadius:6, padding:'4px 8px', color:C.v, fontSize:10, fontFamily:FN, cursor:'pointer' }}>
                            <Eye size={10} /> Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredCommerces.length === 0 && (
              <div style={{ padding:'30px', textAlign:'center', color:C.mist, fontSize:13 }}>No hay comercios que coincidan con los filtros.</div>
            )}
          </PCard>
        </div>
      )}

      {/* ── USUARIOS TAB ── */}
      {!loading && tab === 'usuarios' && (
        <div style={{ display:'grid', gap:12 }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={()=>exportToCSV(users.map(u=>({ nombre:u.name, email:u.email, telefono:u.phone||'', rol:u.role, registrado:u.created_at?.slice(0,10) })), 'usuarios')}
              style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, borderRadius:9, padding:'8px 12px', color:C.mist, fontSize:11, fontFamily:FN, cursor:'pointer' }}>
              <Download size={12} /> Exportar CSV
            </button>
          </div>
          <PCard style={{ overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:420 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.rim}` }}>
                    {['Usuario','Email','Teléfono','Rol','Desde'].map(h => (
                      <th key={h} style={{ padding:'10px 12px', fontSize:9, fontWeight:700, color:C.mist, textAlign:'left', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:FN, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u,i) => (
                    <tr key={u.id} style={{ borderBottom:`1px solid ${C.rim}` }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.cardH}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:28, height:28, borderRadius:'50%', background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff', flexShrink:0 }}>
                            {(u.name||u.email||'?')[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize:12, color:C.pearl, fontFamily:FN, fontWeight:600 }}>{u.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:11, color:C.mist }}>{u.email}</td>
                      <td style={{ padding:'10px 12px', fontSize:11, color:C.mist }}>{u.phone||'—'}</td>
                      <td style={{ padding:'10px 12px' }}><Pill color={u.role==='admin'?C.o:u.role==='commerce_owner'?C.v:C.dust}>{u.role}</Pill></td>
                      <td style={{ padding:'10px 12px', fontSize:11, color:C.mist, whiteSpace:'nowrap' }}>{u.created_at?.slice(0,10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <div style={{ padding:'30px', textAlign:'center', color:C.mist, fontSize:13 }}>No hay usuarios registrados.</div>
            )}
          </PCard>
        </div>
      )}

      {/* ── CIUDADES TAB ── */}
      {!loading && tab === 'ciudades' && (
        <div style={{ display:'grid', gap:14 }}>
          {/* Add city form */}
          <PCard style={{ padding:18 }}>
            <div style={{ fontFamily:FN, fontSize:10, color:C.mist, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:14 }}>Agregar ciudad</div>
            <form onSubmit={handleAddCity} style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <input value={newCity.name} onChange={e=>setNewCity(p=>({...p, name:e.target.value}))} placeholder="Nombre (ej. Córdoba)"
                style={{ flex:1, minWidth:140, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.rim}`, borderRadius:9, padding:'9px 12px', color:C.white, fontSize:12, fontFamily:FI, outline:'none' }} />
              <input value={newCity.province} onChange={e=>setNewCity(p=>({...p, province:e.target.value}))} placeholder="Provincia (ej. Córdoba)"
                style={{ flex:1, minWidth:140, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.rim}`, borderRadius:9, padding:'9px 12px', color:C.white, fontSize:12, fontFamily:FI, outline:'none' }} />
              <button type="submit" disabled={addingCity || !newCity.name.trim() || !newCity.province.trim()}
                style={{ display:'flex', alignItems:'center', gap:6, background:G, border:'none', borderRadius:9, padding:'9px 16px', color:'#fff', fontSize:12, fontFamily:FN, fontWeight:700, cursor:'pointer', opacity:addingCity?.6:1 }}>
                <Plus size={13} /> {addingCity ? 'Agregando…' : 'Agregar'}
              </button>
            </form>
          </PCard>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(185px, 1fr))', gap:10 }}>
            {cities.map((c,i) => (
              <PCard key={c.id} className="fu" style={{ padding:17, position:'relative', overflow:'hidden', animationDelay:`${i*60}ms` }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:G }} />
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:11 }}>
                  <div>
                    <div style={{ fontFamily:FN, fontSize:15, fontWeight:900, color:C.white }}>{c.name}</div>
                    <div style={{ fontSize:9, color:C.dust }}>{c.province}</div>
                  </div>
                  <Pill color={C.ok}>Activa</Pill>
                </div>
                <div style={{ height:1, background:C.rim, marginBottom:10 }} />
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, background:G, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{c.commerce_count||0}</div>
                    <div style={{ fontSize:9, color:C.dust }}>negocios</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:C.v }}>{fmtK(c.member_count||0)}</div>
                    <div style={{ fontSize:9, color:C.dust }}>socios</div>
                  </div>
                </div>
              </PCard>
            ))}
            {cities.length === 0 && (
              <div style={{ color:C.mist, fontSize:13 }}>No hay ciudades. Agregá una arriba.</div>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVIDAD TAB ── */}
      {!loading && tab === 'actividad' && (
        <PCard style={{ padding:40, textAlign:'center' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Activity size={22} color={C.mist} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontFamily:FN, fontSize:15, fontWeight:700, color:C.white, marginBottom:6 }}>Sin registros de actividad</div>
          <div style={{ color:C.mist, fontSize:13, maxWidth:320, margin:'0 auto' }}>El log de actividad del sistema estará disponible próximamente.</div>
        </PCard>
      )}

      {/* ── CONFIG TAB ── */}
      {!loading && tab === 'config' && (
        <div style={{ display:'grid', gap:14 }}>
          <PCard style={{ padding:18 }}>
            <div style={{ fontFamily:FN, fontSize:10, color:C.mist, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:14 }}>Configuración del sistema</div>
            {[
              { key:'allowSignup',      label:'Permitir registro de comercios', desc:'Habilita el formulario de alta para nuevos negocios.' },
              { key:'requireApproval',  label:'Requerir aprobación manual',     desc:'Los nuevos comercios quedan en estado pendiente hasta que un admin los apruebe.' },
              { key:'maintenance',      label:'Modo mantenimiento',              desc:'Muestra una pantalla de mantenimiento a todos los usuarios.' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:`1px solid ${C.rim}` }}>
                <div>
                  <div style={{ fontSize:13, color:C.white, fontFamily:FN, fontWeight:600, marginBottom:3 }}>{label}</div>
                  <div style={{ fontSize:11, color:C.mist }}>{desc}</div>
                </div>
                <button onClick={()=>setConfig(p=>({...p, [key]:!p[key]}))}
                  style={{ width:44, height:24, borderRadius:99, border:'none', cursor:'pointer', position:'relative', flexShrink:0, background:config[key]?C.ok:'rgba(255,255,255,0.15)', transition:'background 200ms ease' }}>
                  <span style={{ position:'absolute', top:3, left:config[key]?22:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 200ms cubic-bezier(0.23,1,0.32,1)', display:'block' }} />
                </button>
              </div>
            ))}
          </PCard>

          <PCard style={{ padding:18 }}>
            <div style={{ fontFamily:FN, fontSize:10, color:C.mist, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:14 }}>Mensaje broadcast</div>
            <textarea value={broadcast} onChange={e=>setBroadcast(e.target.value)} placeholder="Escribí un mensaje para mostrar a todos los usuarios…"
              rows={3}
              style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.rim}`, borderRadius:10, padding:'12px 14px', color:C.white, fontSize:13, fontFamily:FI, outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.5 }} />
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
              <GBtn sm onClick={()=>{ /* TODO: persist */ }}>Guardar mensaje</GBtn>
            </div>
          </PCard>
        </div>
      )}

      {/* ── COMMERCE DETAIL MODAL ── */}
      {selectedCommerce && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e=>{ if(e.target===e.currentTarget) setSelectedCommerce(null) }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }} />
          <div className="modal-in" style={{ position:'relative', width:'100%', maxWidth:520, background:'rgba(18,18,24,0.98)', borderRadius:20, border:`1px solid ${C.rim}`, overflow:'hidden', zIndex:1 }}>
            {/* Modal header */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:G }} />
            <div style={{ padding:'20px 20px 16px', borderBottom:`1px solid ${C.rim}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontFamily:FN, fontSize:17, fontWeight:900, color:C.white, marginBottom:4 }}>{selectedCommerce.name}</div>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  <Pill color={planColor(selectedCommerce.plan)}>{selectedCommerce.plan}</Pill>
                  <Pill color={selectedCommerce.active?C.ok:C.o}>{selectedCommerce.active?'Activo':'Pendiente'}</Pill>
                  {selectedCommerce.city && <Pill color={C.dust}>{selectedCommerce.city.name}</Pill>}
                </div>
              </div>
              <button onClick={()=>setSelectedCommerce(null)} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                <X size={15} color={C.mist} />
              </button>
            </div>
            {/* Modal body */}
            <div style={{ padding:'16px 20px', display:'grid', gap:10 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'11px 13px' }}>
                  <div style={{ fontSize:9, color:C.mist, fontFamily:FN, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:5 }}>Categoría</div>
                  <div style={{ fontSize:13, color:C.white, fontFamily:FN, fontWeight:600 }}>{selectedCommerce.category || '—'}</div>
                </div>
                <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'11px 13px' }}>
                  <div style={{ fontSize:9, color:C.mist, fontFamily:FN, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:5 }}>Slug</div>
                  <div style={{ fontSize:12, color:C.mist, fontFamily:FI, wordBreak:'break-all' }}>{selectedCommerce.slug || '—'}</div>
                </div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'11px 13px' }}>
                <div style={{ fontSize:9, color:C.mist, fontFamily:FN, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>Cambiar plan</div>
                <div style={{ display:'flex', gap:6 }}>
                  {['free','starter','pro'].map(p => (
                    <button key={p} onClick={()=>changePlan(selectedCommerce.id, p)}
                      style={{ flex:1, padding:'7px 0', borderRadius:8, border:`1px solid ${selectedCommerce.plan===p?planColor(p):`${planColor(p)}40`}`, background:selectedCommerce.plan===p?`${planColor(p)}20`:'transparent', color:selectedCommerce.plan===p?planColor(p):C.mist, fontSize:11, fontFamily:FN, fontWeight:700, cursor:'pointer' }}>
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'11px 13px' }}>
                <div style={{ fontSize:9, color:C.mist, fontFamily:FN, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:5 }}>Registrado</div>
                <div style={{ fontSize:12, color:C.pearl }}>{selectedCommerce.created_at?.slice(0,10) || '—'}</div>
              </div>
            </div>
            {/* Modal footer */}
            <div style={{ padding:'12px 20px 18px', borderTop:`1px solid ${C.rim}`, display:'flex', gap:8, justifyContent:'flex-end' }}>
              {!selectedCommerce.active ? (
                <button onClick={()=>approveCommerce(selectedCommerce.id)} disabled={actioning===selectedCommerce.id}
                  style={{ display:'flex', alignItems:'center', gap:6, background:C.ok, border:'none', borderRadius:9, padding:'9px 18px', color:'#000', fontSize:12, fontFamily:FN, fontWeight:700, cursor:'pointer', opacity:actioning===selectedCommerce.id?.5:1 }}>
                  <Check size={13} /> Aprobar comercio
                </button>
              ) : (
                <button onClick={()=>suspendCommerce(selectedCommerce.id)} disabled={actioning===selectedCommerce.id}
                  style={{ display:'flex', alignItems:'center', gap:6, background:`${C.o}18`, border:`1px solid ${C.o}`, borderRadius:9, padding:'9px 18px', color:C.o, fontSize:12, fontFamily:FN, fontWeight:700, cursor:'pointer', opacity:actioning===selectedCommerce.id?.5:1 }}>
                  <Ban size={13} /> Suspender
                </button>
              )}
              <button onClick={()=>setSelectedCommerce(null)}
                style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, borderRadius:9, padding:'9px 18px', color:C.mist, fontSize:12, fontFamily:FN, cursor:'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DEV TOOLBAR (solo en development) ───────────────────────────────────────
function DevToolbar({ user, profile, onRoleChange }) {
  const [switching, setSwitching] = useState(null)
  if (!user) return null
  // Solo arquitectotolosa@gmail.com puede ver el DevToolbar — en cualquier
  // entorno. Antes dependíamos de NODE_ENV pero Vercel no lo setea como
  // esperábamos, así que el guard fallaba y el toolbar aparecía en producción.
  const ADMIN_EMAILS = ['arquitectotolosa@gmail.com']
  const userEmail = (user.email || '').toLowerCase().trim()
  if (!ADMIN_EMAILS.includes(userEmail)) return null

  const ROLES = [
    { id:'client',         label:'Cliente',   color:C.info },
    { id:'commerce_owner', label:'Comercio',  color:C.o   },
    { id:'admin',          label:'Admin',     color:C.v   },
  ]

  async function switchRole(role) {
    setSwitching(role)
    const supabase = getSupabase()
    await supabase.from('profiles').update({ role }).eq('id', user.id)
    await onRoleChange()
    setSwitching(null)
  }

  const current = profile?.role || 'client'

  return (
    <div style={{ position:'fixed', bottom:16, left:'50%', transform:'translateX(-50%)', zIndex:9999, display:'flex', alignItems:'center', gap:6, background:'#000000DD', border:`1px solid ${C.rim}`, borderRadius:99, padding:'6px 10px', backdropFilter:'blur(12px)', boxShadow:'0 8px 32px rgba(0,0,0,.6)' }}>
      <span style={{ fontSize:9, color:C.dust, fontFamily:FN, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', paddingRight:4 }}>DEV</span>
      {ROLES.map(r => (
        <button key={r.id} onClick={() => switchRole(r.id)} disabled={!!switching}
          style={{ padding:'5px 12px', borderRadius:99, border:'none', cursor:switching?'wait':'pointer', fontFamily:FN, fontSize:11, fontWeight:700, transition:'background 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms cubic-bezier(0.23,1,0.32,1), box-shadow 160ms ease',
            background: current === r.id ? r.color : C.bg3,
            color:      current === r.id ? '#fff'  : C.mist,
            opacity:    switching && switching !== r.id ? .5 : 1,
            boxShadow:  current === r.id ? `0 0 10px ${r.color}66` : 'none',
          }}>
          {switching === r.id ? '...' : r.label}
        </button>
      ))}
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,     setView]     = useState('home')
  const [citySlug, setCitySlug] = useState(null)
  const [commerce, setCommerce] = useState(null)
  const [user,     setUser]     = useState(null)
  const [profile,  setProfile]  = useState(null)
  // Tab activa del ClientView (Mis Clubs / Historial / Mi QR / Cuenta).
  // El ClientView dispatcha 'benefix:client-tab-changed' cada vez que cambia,
  // y acá lo guardamos para que el Navbar pueda saber cuál tab está activa
  // y coordinar el highlight del botón persona vs los tabs del nav inferior.
  const [clientTab, setClientTab] = useState('mis clubs')
  const [cities,        setCities]        = useState([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showTerms,     setShowTerms]     = useState(false)
  const [authReady,     setAuthReady]     = useState(false)
  const [isAppLoading,  setIsAppLoading]  = useState(false)
  const prevUserRef    = useRef(null)   // tracks user present before each auth event
  const bootComplete   = useRef(false)  // true after first loadProfile(restoreView) resolves
  const supabase = getSupabase()

  // Primera visita de sesión → mostrar loading screen
  useEffect(() => {
    if (!sessionStorage.getItem('benefix:loaded')) setIsAppLoading(true)
  }, [])

  // Auth init — getSession reads from cookies immediately, no network needed
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      prevUserRef.current = session?.user ?? null
      setUser(session?.user ?? null)
      setAuthReady(true)
      if (session?.user) loadProfile(session.user.id, true, true)
      else { setProfile(null); setShowOnboarding(false) }
    }).catch(() => setAuthReady(true))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const wasLoggedIn = !!prevUserRef.current
      prevUserRef.current = session?.user ?? null
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id, event === 'SIGNED_IN')
        // Navigation is fully delegated to loadProfile (reads localStorage or applies role default).
        // Do NOT call navigate('client') here — it would race against loadProfile and overwrite
        // a valid persisted view with 'client' before loadProfile finishes reading localStorage.
      } else {
        // SIGNED_OUT (o sesión nula): limpiar todo el estado de usuario
        setProfile(null)
        setShowOnboarding(false)
        bootComplete.current = false
        localStorage.removeItem('benefix:lastView')
        localStorage.removeItem('benefix:commerceTab')
        navigate('home')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId, triggerOnboarding = false, restoreView = false) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)

    // Login intent — si el usuario llegó al login desde "Soy comercio" u otro CTA
    // que setea benefix:loginNext, lo respetamos y va a esa vista. Tiene
    // prioridad sobre el restoreView porque expresa la intención más reciente.
    let consumedLoginNext = false
    try {
      const next = sessionStorage.getItem('benefix:loginNext')
      if (next) {
        sessionStorage.removeItem('benefix:loginNext')
        setView(next)
        bootComplete.current = true
        consumedLoginNext = true
      }
    } catch {}

    if (!consumedLoginNext && restoreView && data?.role) {
      const saved = localStorage.getItem('benefix:lastView')
      const VALID = {
        client:         ['client', 'directory'],
        commerce_owner: ['commerce-settings', 'commerce', 'client', 'directory'],
        admin:          ['admin', 'commerce', 'client', 'directory'],
      }
      const defaults = { client: 'client', commerce_owner: 'commerce-settings', admin: 'admin' }
      if (saved && VALID[data.role]?.includes(saved)) {
        // Caso especial: 'commerce' (preview del ojo) requiere cargar el comercio
        // del owner antes de renderizar; sino CommerceView se queda en blanco.
        if (saved === 'commerce') {
          const { data: ownCommerce } = await supabase.from('commerces').select('*').eq('owner_id', userId).single()
          if (ownCommerce) {
            setCommerce(ownCommerce)
            setView('commerce')
          } else {
            // Sin comercio (caso raro) → fallback al default
            setView(defaults[data.role] || 'home')
          }
        } else {
          setView(saved)
        }
      } else {
        if (saved) localStorage.removeItem('benefix:lastView')
        setView(defaults[data.role] || 'home')
      }
      bootComplete.current = true
    }
    if (triggerOnboarding) {
      if (!data?.terms_accepted_at) { setShowTerms(true); return }
      if (data?.onboarding_completed === false) setShowOnboarding(true)
    }
  }

  function handleTermsAccepted() {
    setShowTerms(false)
    if (profile?.onboarding_completed === false) setShowOnboarding(true)
  }

  // Cities con conteos
  useEffect(() => {
    supabase.from('cities').select('*').eq('active', true)
      .then(async ({ data: citiesData }) => {
        if (!citiesData) { setCitiesLoading(false); return }
        // Añadir conteos
        const enriched = await Promise.all(citiesData.map(async (city) => {
          const [{ count: cCount }, { count: mCount }] = await Promise.all([
            supabase.from('commerces').select('*', { count:'exact', head:true }).eq('city_id', city.id).eq('active', true),
            supabase.from('memberships').select('*', { count:'exact', head:true }),
          ])
          return { ...city, commerce_count: cCount||0, member_count: mCount||0 }
        }))
        setCities(enriched)
        setCitiesLoading(false)
      })
  }, [])

  async function handleLogin(opts = {}) {
    // Interstitial antes de redirigir a Google. Si el usuario tocó "Entrar"
    // sin querer puede volver acá sin pasar por el picker de Google.
    const ok = await showLoginPrompt()
    if (!ok) return
    // Si el caller indicó intención de ir a una vista específica post-login
    // (ej: "Soy comercio" → register-commerce), la persistimos para que
    // loadProfile la consuma después del OAuth callback.
    if (opts && opts.nextView) {
      try { sessionStorage.setItem('benefix:loginNext', opts.nextView) } catch {}
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  async function handleLogout() {
    const ok = await showConfirm({
      title: '¿Cerrar sesión?',
      message: 'Vas a salir de tu cuenta. Podés volver a entrar cuando quieras.',
      confirmText: 'Sí, salir',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    // signOut con scope global para limpiar la sesión en TODOS los devices
    // y borrar el refresh-token del lado server. Si falla por cualquier
    // razón, igual seguimos limpiando el state local y forzando reload.
    try { await supabase.auth.signOut({ scope: 'global' }) } catch (_) {}
    try {
      localStorage.removeItem('benefix:lastView')
      localStorage.removeItem('benefix:commerceTab')
    } catch (_) {}
    // Forzar un reload completo. Sin esto, las cookies de Supabase pueden
    // quedar en estado inconsistente con el state de React y la sesión
    // "vuelve" al refrescar manualmente. window.location.replace navega a
    // home Y resetea todo el árbol de React desde cero.
    if (typeof window !== 'undefined') {
      window.location.replace('/')
    }
  }

  function navigate(v) { setView(v); window.scrollTo({ top:0, behavior:'smooth' }) }

  // Escucha 'benefix:navigate' (lo dispara el buzón de sugerencias cuando tocás un CTA).
  // Si viene { view, tab }, navega a esa view y propaga el tab al CommerceSettingsView
  // (que lo escucha como 'benefix:set-tab') una vez montado.
  useEffect(() => {
    function onNavigate(e) {
      const targetView = e.detail?.view
      const tab = e.detail?.tab
      if (!targetView) return
      if (targetView !== view) navigate(targetView)
      if (tab) {
        // Pequeño delay para asegurar que el componente destino esté montado
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('benefix:set-tab', { detail: { tab } }))
        }, 80)
      }
    }
    window.addEventListener('benefix:navigate', onNavigate)
    return () => window.removeEventListener('benefix:navigate', onNavigate)
  }, [view])

  // ClientView nos avisa cada vez que cambia su tab, para que el Navbar
  // pueda decidir si el botón persona se enciende (tab=cuenta) o no.
  useEffect(() => {
    function onClientTabChanged(e) {
      const next = e.detail?.tab
      if (next) setClientTab(next)
    }
    window.addEventListener('benefix:client-tab-changed', onClientTabChanged)
    return () => window.removeEventListener('benefix:client-tab-changed', onClientTabChanged)
  }, [])

  async function handleOwnerProfile() {
    if (!user) return
    const { data } = await supabase.from('commerces').select('*').eq('owner_id', user.id).single()
    if (data) { setCommerce(data); navigate('commerce') }
  }

  // 'commerce' SÍ se persiste — el owner espera que al refrescar el preview
  // siga viendo el preview, no que lo mande a configuración. La restauración
  // recupera el commerce del owner y lo inyecta en estado (ver loadProfile).
  const TRANSIENT_VIEWS = new Set(['home', 'scanner', 'register-commerce'])
  useEffect(() => {
    if (TRANSIENT_VIEWS.has(view)) return
    if (!bootComplete.current) return
    localStorage.setItem('benefix:lastView', view)
  }, [view])

  const currentCity = cities.find(c => c.slug === citySlug)

  if (isAppLoading) return (
    <LoadingScreen onComplete={() => {
      sessionStorage.setItem('benefix:loaded', '1')
      setIsAppLoading(false)
    }} />
  )

  if (!authReady) return <FullscreenLoader message="Iniciando..." />

  return (
    <>
      <style>{`input:focus { outline: none; border-color: #BD4BF8 !important; box-shadow: 0 0 0 3px #BD4BF818; }`}</style>
      <ToastContainer />
      <ConfirmModal />
      <LoginPromptModal />
      <SwRegister />
      <InstallPrompt />
      {showTerms && user && (
        <TermsAcceptance user={user} onAccept={handleTermsAccepted} />
      )}
      {showOnboarding && user && (
        <OnboardingFlow
          user={user}
          onComplete={async (opts) => {
            setShowOnboarding(false)
            await loadProfile(user.id)
            // Si el usuario eligió "Sí, tengo un negocio" en el último paso del
            // onboarding, lo mandamos al wizard de registrar comercio.
            if (opts?.goTo === 'register-commerce') {
              navigate('register-commerce')
            }
          }}
        />
      )}
      <Navbar setView={navigate} cityName={currentCity?.name} user={user} profile={profile} onLogin={handleLogin} onLogout={handleLogout} currentView={view} clientTab={clientTab} onOwnerProfile={handleOwnerProfile} />
      <div style={{ height:80 }} />
      {view === 'home'      && <HomeView setView={navigate} user={user} profile={profile} />}
      {view === 'directory'          && <DirectoryView citySlug={citySlug} cities={cities} setView={navigate} setCommerce={setCommerce} />}
      {view === 'commerce'           && <CommerceView commerce={commerce} setView={navigate} user={user} onLoginRequired={handleLogin} onCommerceUpdate={updates => setCommerce(prev => ({ ...prev, ...updates }))} />}
      {view === 'client'             && <ClientView setView={navigate} user={user} profile={profile} onLogout={handleLogout} />}
      {view === 'scanner'            && <ScannerView user={user} profile={profile} setView={navigate} />}
      {view === 'admin'              && <AdminView cities={cities} profile={profile} />}
      {view === 'register-commerce'  && <RegisterCommerceView setView={navigate} cities={cities} user={user} onLoginRequired={() => handleLogin({ nextView: 'register-commerce' })} onProfileRefresh={() => loadProfile(user.id)} />}
      {view === 'commerce-settings'  && <CommerceSettingsView user={user} profile={profile} setView={navigate} onLogout={handleLogout} onOwnerProfile={handleOwnerProfile} />}
      {/* Chat de soporte con IA — visible cuando hay sesión. Pasa role según
          la vista activa: comerciante en commerce-settings, cliente en el resto.
          El buzón de sugerencias va apilado encima del botón del chat. */}
      {user && view !== 'home' && view !== 'directory' && (
        <>
          {/* Stack de botones flotantes (bottom-right):
              - SupportChat       → bottom: 90  (chat de soporte con IA)
              - NotificationsBell → bottom: 156 (campana unificada con dos tabs:
                                                 Movimientos + Sistema)
              66px de gap vertical entre ambos para no superponerse en mobile.
              SuggestionsInbox quedó absorbido dentro de NotificationsBell
              como tab "Sistema" — un solo ícono = menos ruido visual. */}
          <NotificationsBell bottom={156} role={view === 'commerce-settings' ? 'merchant' : 'client'} />
          <SupportChat role={view === 'commerce-settings' ? 'merchant' : 'client'} />
          {/* Banner para activar push del navegador. Solo aparece la 1a vez
              (después de ~4s de entrar) y se descarta o acepta. */}
          <EnablePushPrompt />
        </>
      )}
      <DevToolbar user={user} profile={profile} onRoleChange={() => loadProfile(user.id)} />
    </>
  )
}
