'use client'

// navHistory — "volver a la pantalla anterior" para toda la app.
//
// La app es una SPA con estado propio (view del AppRoot, tab + intent picker
// + ficha de cliente del panel comerciante, tab + detalle de beneficio del
// cliente) y no usaba el historial del navegador. Este módulo:
//
//   1. useNavHistory(state, keyOf, restore): cada componente declara qué
//      estado define "en qué pantalla estoy" y cómo volver a una anterior.
//      Cada cambio de pantalla apila una entrada y hace history.pushState.
//   2. popstate (botón/gesto atrás de Android, swipe nativo de Safari, o
//      nuestro gesto) desapila y restaura la pantalla anterior, con una
//      animación de deslizamiento vía View Transitions cuando hay soporte.
//   3. <SwipeBack />: gesto de deslizar desde el borde izquierdo hacia la
//      derecha (pensado para la PWA instalada en iPhone, que no tiene gesto
//      de atrás propio). Muestra una flecha que sigue al dedo y, si se
//      suelta pasado el umbral, dispara history.back().
//
// Solo se registran cambios después de la primera interacción del usuario,
// así los redirects automáticos del arranque (home → panel, restore de la
// última vista) no quedan como "pantalla anterior".

import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

const stack = [] // { alive: {current}, restore: () => void, scrollY }
let armed = false
let installed = false
let confirmFn = null

const isBrowser = () => typeof window !== 'undefined'

function isIOS() {
  if (!isBrowser()) return false
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}
function isStandalone() {
  if (!isBrowser()) return false
  return navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches
}
// En Safari dentro del navegador (no instalada) iOS ya tiene su propio gesto
// y animación de atrás: no sumamos la nuestra para no duplicar.
function nativeBackGesture() {
  return isIOS() && !isStandalone()
}
function shouldAnimate() {
  if (!isBrowser() || typeof document.startViewTransition !== 'function') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  return !nativeBackGesture()
}

function runRestore(entry) {
  const apply = () => {
    flushSync(() => entry.restore())
    try { window.scrollTo(0, entry.scrollY || 0) } catch {}
  }
  if (!shouldAnimate()) { apply(); return }
  const root = document.documentElement
  root.classList.add('clufix-nav-back')
  try {
    const t = document.startViewTransition(apply)
    t.finished.finally(() => root.classList.remove('clufix-nav-back'))
  } catch {
    root.classList.remove('clufix-nav-back')
    apply()
  }
}

function onPopState() {
  if (stack.length === 0) return
  // Cambios sin guardar en el panel: cancelamos el "atrás" (re-apilamos la
  // entrada del historial) y preguntamos. Si confirma, volvemos de nuevo.
  if (window.__clufixDirty && confirmFn) {
    try { window.history.pushState({ clufixNav: stack.length }, '') } catch {}
    confirmFn({
      title: 'Tenés cambios sin guardar',
      message: 'Si volvés ahora vas a perder los cambios. ¿Querés volver igual?',
      confirmText: 'Volver sin guardar',
      cancelText: 'Quedarme',
      danger: true,
    }).then(ok => {
      if (!ok) return
      window.__clufixDirty = false
      window.history.back()
    })
    return
  }
  const entry = stack.pop()
  // La pantalla de esa entrada ya no existe (se desmontó su componente):
  // saltamos un paso más para no gastar un "atrás" en nada.
  if (!entry.alive.current) { window.history.back(); return }
  runRestore(entry)
}

function install() {
  if (installed || !isBrowser()) return
  installed = true
  const arm = () => { armed = true }
  window.addEventListener('pointerdown', arm, { once: true, capture: true })
  window.addEventListener('keydown', arm, { once: true, capture: true })
  window.addEventListener('popstate', onPopState)
}

// Permite usar el modal de confirmación propio de la app (showConfirm).
export function setNavConfirm(fn) { confirmFn = fn }

export function canGoBack() {
  return stack.some(e => e.alive.current)
}

export function goBack() {
  if (canGoBack()) window.history.back()
}

export function useNavHistory(state, keyOf, restore) {
  const key = keyOf(state)
  const prevState = useRef(state)
  const prevKey = useRef(key)
  const alive = useRef(true)
  const skipKey = useRef(null)
  const restoreRef = useRef(restore)
  restoreRef.current = restore

  useEffect(() => {
    install()
    alive.current = true
    return () => { alive.current = false }
  }, [])

  useEffect(() => {
    if (key === prevKey.current) { prevState.current = state; return }
    const from = prevState.current
    const fromKey = prevKey.current
    prevState.current = state
    prevKey.current = key
    // Este cambio lo produjo un "atrás": no se apila.
    if (skipKey.current === key) { skipKey.current = null; return }
    skipKey.current = null
    if (!armed) return
    stack.push({
      alive,
      scrollY: lastScrollY,
      restore: () => { skipKey.current = fromKey; restoreRef.current(from) },
    })
    try { window.history.pushState({ clufixNav: stack.length }, '') } catch {}
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
}

// Posición de scroll "estable" de la pantalla actual. Se actualiza con el
// scroll del usuario y se congela un ratito tras cada cambio de pantalla
// (navigate() hace scrollTo(top) y no queremos guardar ese 0).
let lastScrollY = 0
if (isBrowser()) {
  let t = null
  window.addEventListener('scroll', () => {
    clearTimeout(t)
    t = setTimeout(() => { lastScrollY = window.scrollY }, 120)
  }, { passive: true })
}

// ── Gesto: deslizar desde el borde izquierdo ─────────────────────────────
const EDGE = 28        // px desde el borde donde puede empezar el gesto
const COMMIT = 90      // px de arrastre para confirmar
const MAX_PULL = 72    // recorrido máximo de la flecha

export function SwipeBack() {
  const bubbleRef = useRef(null)
  const edgeRef = useRef(null)

  useEffect(() => {
    if (!isBrowser() || !('ontouchstart' in window) || nativeBackGesture()) return
    install()
    let start = null   // { x, y, t }
    let engaged = false
    let crossed = false
    let lastX = 0, lastT = 0, vx = 0

    const modalOpen = () =>
      document.body.style.overflow === 'hidden' ||
      !!document.querySelector('[aria-modal="true"]')

    const paint = (dx, y) => {
      const b = bubbleRef.current, e = edgeRef.current
      if (!b || !e) return
      const p = Math.min(1, dx / COMMIT)
      const pull = Math.min(MAX_PULL, dx * 0.55)
      b.style.top = `${y - 24}px`
      b.style.opacity = String(Math.min(1, p * 1.4))
      b.style.transform = `translateX(${pull - 48}px) scale(${0.7 + p * 0.3})`
      b.dataset.ready = dx >= COMMIT ? '1' : '0'
      e.style.opacity = String(p * 0.9)
    }
    const reset = (animate) => {
      const b = bubbleRef.current, e = edgeRef.current
      if (!b || !e) return
      b.style.transition = e.style.transition = animate ? 'transform 200ms ease, opacity 200ms ease' : 'none'
      b.style.opacity = '0'
      b.style.transform = 'translateX(-48px) scale(0.7)'
      b.dataset.ready = '0'
      e.style.opacity = '0'
    }

    const onStart = (ev) => {
      if (ev.touches.length !== 1) return
      const t = ev.touches[0]
      if (t.clientX > EDGE || !canGoBack() || modalOpen()) return
      start = { x: t.clientX, y: t.clientY }
      engaged = false
      crossed = false
      lastX = t.clientX; lastT = ev.timeStamp; vx = 0
    }
    const onMove = (ev) => {
      if (!start) return
      const t = ev.touches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (!engaged) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { start = null; return }
        if (dx > 10 && dx > Math.abs(dy) * 1.4) {
          engaged = true
          const b = bubbleRef.current, e = edgeRef.current
          if (b && e) b.style.transition = e.style.transition = 'none'
        } else return
      }
      if (ev.cancelable) ev.preventDefault()
      const dt = ev.timeStamp - lastT
      if (dt > 0) vx = (t.clientX - lastX) / dt
      lastX = t.clientX; lastT = ev.timeStamp
      const d = Math.max(0, dx)
      if (!crossed && d >= COMMIT) { crossed = true; try { navigator.vibrate?.(8) } catch {} }
      if (crossed && d < COMMIT) crossed = false
      paint(d, t.clientY)
    }
    const onEnd = () => {
      if (!start) return
      const dx = lastX - start.x
      const go = engaged && (dx >= COMMIT || (dx > 40 && vx > 0.5))
      start = null
      reset(true)
      if (go) goBack()
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onEnd, { passive: true })
    reset(false)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  return (
    <>
      <div ref={edgeRef} aria-hidden="true" className="clufix-swipe-edge" />
      <div ref={bubbleRef} aria-hidden="true" className="clufix-swipe-bubble">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </div>
    </>
  )
}
