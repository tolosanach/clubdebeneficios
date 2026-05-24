'use client'

// BizPromptBanner — tira persistente "¿Tenés un negocio?" que aparece arriba
// de cada vista mientras el user está logueado como cliente sin haber
// respondido todavía. Click en "Sí" abre el flujo merchant (modal 4 pasos).
// Click en "No" lo dismissea para siempre (localStorage). El localStorage
// `clufix:bizAnswer` está compartido con el card del perfil, así que
// responder en cualquiera sincroniza ambos.

import { useEffect, useState } from 'react'
import { Store } from 'lucide-react'

// G — antes era gradient orange→fucsia. Rebrand mayo 2026 fase 2:
// violeta brand sólido. Mantengo el nombre G por compat con el resto
// del archivo, aunque ya no es un gradient.
const G  = '#7131E1'
const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

const KEY = 'clufix:bizAnswer'

export default function BizPromptBanner({ profile }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!profile || profile.role !== 'client') {
      setVisible(false)
      return
    }
    try {
      const a = localStorage.getItem(KEY)
      if (a === 'yes' || a === 'no') {
        setVisible(false)
        return
      }
      setVisible(true)
    } catch {
      setVisible(true)
    }
    // Sync con cambios externos (ej. si la card del perfil setea el flag)
    function onStorage(e) {
      if (e.key === KEY && (e.newValue === 'yes' || e.newValue === 'no')) {
        setVisible(false)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [profile?.role])

  function dismiss() {
    try { localStorage.setItem(KEY, 'no') } catch {}
    setVisible(false)
    window.dispatchEvent(new CustomEvent('clufix:biz-answered'))
  }
  function accept() {
    try { localStorage.setItem(KEY, 'yes') } catch {}
    setVisible(false)
    window.dispatchEvent(new CustomEvent('clufix:biz-answered'))
    try { sessionStorage.setItem('clufix:signupAs', 'merchant') } catch {}
    window.dispatchEvent(new CustomEvent('clufix:open-signup', { detail: { mode: 'merchant' } }))
  }

  if (!visible) return null

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'rgba(113,49,225,0.10)',
        border: '1px solid rgba(113,49,225,0.32)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.30)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: G,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 3px 10px rgba(113,49,225,0.40)',
        }}>
          <Store size={15} color="#fff" strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FN, fontSize: 12.5, fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
            ¿Tenés un negocio?
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.35, marginTop: 1 }}>
            Creá tu club de beneficios.
          </div>
        </div>
        <button onClick={accept} aria-label="Sí, registrar mi negocio"
          style={{
            padding: '7px 14px', borderRadius: 9,
            background: G, border: 'none', color: '#fff',
            fontFamily: FN, fontSize: 11.5, fontWeight: 800,
            cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 3px 10px rgba(113,49,225,0.35)',
            letterSpacing: '.02em',
          }}>
          Sí
        </button>
        <button onClick={dismiss} aria-label="No tengo negocio"
          style={{
            padding: '7px 12px', borderRadius: 9,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.78)',
            fontFamily: FN, fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0,
            letterSpacing: '.02em',
          }}>
          No
        </button>
      </div>
    </div>
  )
}
