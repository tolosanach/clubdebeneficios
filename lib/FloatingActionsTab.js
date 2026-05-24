'use client'

// FloatingActionsTab — pestaña flotante violeta sobre el borde derecho
// que agrupa los dos atajos del usuario: campana (notificaciones) y
// signo de pregunta (chat de soporte).
//
// Estados:
//   • Colapsada: solo asoma una "lengüeta" delgada del borde derecho con
//     un hint de los íconos. Si hay no-leídos, se ve un dot fucsia.
//   • Expandida: la pill se desliza hacia la izquierda y los dos íconos
//     quedan grandes y legibles. Tocar un ícono dispara su drawer
//     (NotificationsBell / SupportChat) vía custom events.
//
// Auto-colapso: pasados 5s sin interacción (sin click en la pestaña ni en
// ninguno de los dos íconos), vuelve a su estado colapsado.

import { useEffect, useRef, useState } from 'react'
import { Bell, HelpCircle } from 'lucide-react'

const FN = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const AUTO_COLLAPSE_MS = 5000

export default function FloatingActionsTab() {
  const [expanded, setExpanded] = useState(false)
  const [unread,   setUnread]   = useState(0)
  const timerRef = useRef(null)
  const pillRef  = useRef(null)

  // Click-outside: si el user tappea fuera de la pill mientras está
  // expandida, la cerramos al instante. Capture phase para que dispare
  // antes que cualquier handler que pueda hacer stopPropagation. Usa
  // pointerdown (no click) para que se sienta inmediato.
  useEffect(() => {
    if (!expanded) return
    function onPointerDown(e) {
      const el = pillRef.current
      if (!el) return
      if (e.target && el.contains(e.target)) return
      // Tap fuera → contraer y cancelar timer.
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      setExpanded(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [expanded])

  // Escucha el contador de no-leídos que dispatchea NotificationsBell.
  // Así no replicamos polling — solo reflejamos lo que la campana ya sabe.
  useEffect(() => {
    function onCount(e) {
      const c = e?.detail?.count
      if (typeof c === 'number') setUnread(c)
    }
    window.addEventListener('clufix:notifications-count', onCount)
    return () => window.removeEventListener('clufix:notifications-count', onCount)
  }, [])

  // Reset del timer de auto-colapso. Se llama cada vez que el user
  // interactúa con la pill (expand toggle, tap en algún ícono).
  function armAutoCollapse() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setExpanded(false)
      timerRef.current = null
    }, AUTO_COLLAPSE_MS)
  }

  function expand() {
    setExpanded(true)
    armAutoCollapse()
  }

  // Al tocar un ícono, además de abrir su drawer, contraemos la pill
  // inmediatamente para que vuelva a su estado de "lengüeta asomada".
  // Si después se cierra el drawer, la solapa queda discreta esperando un
  // próximo tap del user.
  function collapseNow() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setExpanded(false)
  }

  function openNotifications(e) {
    e?.stopPropagation?.()
    collapseNow()
    window.dispatchEvent(new CustomEvent('clufix:open-notifications'))
  }

  function openSupport(e) {
    e?.stopPropagation?.()
    collapseNow()
    window.dispatchEvent(new CustomEvent('clufix:open-support'))
  }

  // Cleanup
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // Cuando se colapsa la pill, los íconos quedan medio escondidos del
  // borde derecho (lengüeta asomada). Cuando se expande, se desliza hacia
  // la izquierda y los íconos crecen + se separan más.
  // El ancho de la pill en colapsada es ~34px (icono 22 + padding 12), así
  // que con right:-12 quedan ~22px visibles asomando del borde derecho —
  // mismo patrón que la solapa fucsia del rail-tab izquierdo.
  const SIZE_ICON_COLLAPSED  = 14
  const SIZE_ICON_EXPANDED   = 22
  const PILL_RIGHT_COLLAPSED = -12
  const PILL_RIGHT_EXPANDED  = 16    // pill completamente visible, con margen

  return (
    <button
      ref={pillRef}
      onClick={expanded ? armAutoCollapse : expand}
      aria-label={expanded ? 'Cerrar atajos' : 'Abrir atajos'}
      style={{
        position: 'fixed',
        right: expanded ? PILL_RIGHT_EXPANDED : PILL_RIGHT_COLLAPSED,
        // Posicionada bien abajo, cerca del bottom-right pero respetando
        // el safe-area de iOS y dejando un margen de respiración del
        // borde. Esto la baja del 68% del alto al pie de la pantalla,
        // alineada con la zona del pulgar y sin chocar con el navbar
        // superior ni con el contenido principal.
        bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        transform: 'none',
        zIndex: 1500,
        // Misma altura que el rail-tab fucsia de la izquierda (84px) para que
        // las dos lengüetas se vean simétricas en pantalla. Width auto en
        // expanded; en collapsed forzamos height fijo.
        height: expanded ? 'auto' : 84,
        // Rebrand mayo 2026 fase 2: violeta brand sólido en lugar del
        // gradient violeta-violeta. Sombras a brand rgba(113,49,225,X).
        background: '#7131E1',
        boxShadow: expanded
          ? '0 12px 32px rgba(113,49,225,0.45), inset 0 0 0 1px rgba(255,255,255,0.15)'
          : '-4px 0 18px rgba(113,49,225,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)',
        border: 'none',
        borderRadius: expanded ? 16 : '14px 0 0 14px',
        padding: expanded ? '12px 14px' : '0 6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: expanded ? 14 : 14,
        cursor: 'pointer',
        color: '#fff',
        // overflow:visible permite que el badge de no-leídos asome a la
        // izquierda (queda fuera del rect de la pill cuando está colapsada).
        overflow: 'visible',
        transition: 'right 320ms cubic-bezier(0.16,1,0.3,1), padding 220ms ease, gap 220ms ease, border-radius 220ms ease, box-shadow 220ms ease, height 220ms ease',
      }}
    >
      {/* Icono campana — tap directo abre notificaciones cuando está
          expandida. Cuando está colapsada, todo el botón "expand" gana, y
          este span actúa como visual nada más. */}
      <span
        role={expanded ? 'button' : undefined}
        onClick={expanded ? openNotifications : undefined}
        title={expanded ? 'Notificaciones' : undefined}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: expanded ? 36 : 22,
          height: expanded ? 36 : 22,
          borderRadius: '50%',
          background: expanded ? 'rgba(255,255,255,0.14)' : 'transparent',
          transition: 'width 220ms ease, height 220ms ease, background 220ms ease',
        }}
      >
        <Bell size={expanded ? SIZE_ICON_EXPANDED : SIZE_ICON_COLLAPSED} strokeWidth={2.2} color="#fff" />
        {/* Badge de no-leídos.
            • Expandida: contador a la derecha-arriba de la campana, con
              número adentro (formato clásico).
            • Colapsada: el badge se posiciona a la IZQUIERDA del icono
              porque la pill está medio escondida atrás del borde derecho —
              dejarlo a la derecha lo escondería con la pill. Asomado a la
              izquierda queda siempre visible para alertar al user. */}
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: expanded ? -5 : -5,
              right: expanded ? -5 : 'auto',
              left:  expanded ? 'auto' : -12,
              minWidth: expanded ? 22 : 20,
              height:   expanded ? 22 : 20,
              borderRadius: 99,
              // Fucsia de marca sólido (rebrand fase 2: sin gradients).
              background: '#EC4899',
              color: '#fff',
              border: '2px solid rgba(113,49,225,0.95)',
              fontFamily: FN,
              fontSize: expanded ? 12 : 11,
              fontWeight: 900,
              letterSpacing: '-.02em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 5px',
              transition: 'all 220ms ease',
              // Doble shadow: ring fucsia exterior + glow + drop sutil.
              boxShadow: '0 0 0 2px rgba(236,72,153,0.25), 0 4px 14px rgba(236,72,153,0.65), 0 2px 6px rgba(0,0,0,0.30)',
              // Pulse leve infinito para que llame la atención del user.
              animation: 'fab-badge-pulse 2.4s ease-in-out infinite',
            }}
          >
            <style>{`
              @keyframes fab-badge-pulse {
                0%, 100% { transform: scale(1); }
                50%      { transform: scale(1.08); }
              }
            `}</style>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </span>

      {/* Icono ayuda / chat */}
      <span
        role={expanded ? 'button' : undefined}
        onClick={expanded ? openSupport : undefined}
        title={expanded ? 'Soporte' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: expanded ? 36 : 22,
          height: expanded ? 36 : 22,
          borderRadius: '50%',
          background: expanded ? 'rgba(255,255,255,0.14)' : 'transparent',
          transition: 'width 220ms ease, height 220ms ease, background 220ms ease',
        }}
      >
        <HelpCircle size={expanded ? SIZE_ICON_EXPANDED : SIZE_ICON_COLLAPSED} strokeWidth={2.2} color="#fff" />
      </span>
    </button>
  )
}
