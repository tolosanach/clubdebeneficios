'use client'

// ProfileItemWizard — modal "amigable" que se abre cuando el dueño toca
// "Cargar ahora" en una tarjeta del intent picker (Configurá tu negocio).
// Cada itemId dispara un mini-flujo dedicado con la UI apropiada para
// ese campo (input simple, picker de presets, deep-link a UI existente
// para cosas complejas como horarios/sistema/primer premio).
//
// Diseño: una sola pantalla focalizada por item. Header con cerrar +
// hero (título + subtítulo del item), body con el input específico,
// footer con Saltar + Guardar. La idea es que el dueño NO sienta que
// cae en el formulario gigante de Configuración — cada interacción es
// puntual y fácil de entender.

import { useEffect, useMemo, useState } from 'react'
import {
  X, ChevronRight, Check, AlertTriangle, Camera, ArrowRight, Clock,
  Star, Coins, MapPin, Phone, AtSign, AlignLeft, Tag, Image as ImageIcon, Sparkles, Gift,
  Search, ChevronLeft, Trash2, Plus, Percent,
} from 'lucide-react'
import PhoneInput from './PhoneInput'
import { FAMILIES_DATA } from './commerce-families-data'
import { LOCATIONS } from './locations'
import LogoCropper, { validateImageFile, checkImageDimensions } from './LogoCropper'

// G — antes era gradient orange→fucsia. Rebrand mayo 2026 fase 2:
// violeta brand sólido. Mantengo el nombre G por compat de call sites.
const G  = '#6F30DF'
const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

const C = {
  white: '#FFFFFF', pearl: '#F0EAFF', mist: '#9B85CC', dust: '#8370AD',
  v: '#6F30DF', rim: 'rgba(255,255,255,0.10)',
}

// Configuración por item: meta-info + qué tipo de wizard usar.
// kind: 'inline' = renderea inputs adentro del wizard.
//       'deeplink' = muestra una intro amigable + CTA que cierra el wizard
//                    y abre la UI existente (accordion / modal / tab).
const ITEM_CONFIG = {
  description: {
    kind: 'inline',
    Icon: AlignLeft,
    title: 'Tu descripción',
    subtitle: 'Contale a tus clientes qué hacés y qué te diferencia.',
  },
  phone: {
    kind: 'inline',
    Icon: Phone,
    title: 'Tu teléfono',
    subtitle: 'Para que tus clientes te contacten por WhatsApp si lo necesitan.',
  },
  address: {
    kind: 'inline',
    Icon: MapPin,
    title: 'Dirección de tu local',
    subtitle: 'Para que tus clientes te encuentren en el mapa.',
  },
  social: {
    kind: 'inline',
    Icon: AtSign,
    title: 'Tus redes',
    subtitle: 'Conectá Instagram y Facebook para que tus clientes te sigan.',
  },
  logo: {
    kind: 'inline',
    Icon: Camera,
    title: 'Logo del negocio',
    subtitle: 'Tu logo es lo primero que ven tus clientes en su billetera.',
  },
  cover: {
    kind: 'inline',
    Icon: ImageIcon,
    title: 'Fotos de portada',
    subtitle: 'Hasta 5 fotos. Se muestran como slideshow en tu perfil público.',
  },
  category: {
    kind: 'inline',
    Icon: Tag,
    title: 'Rubro de tu negocio',
    subtitle: 'Para que tus clientes te encuentren en el directorio.',
  },
  system: {
    kind: 'inline',
    Icon: Sparkles,
    title: '¿Cómo recompensás?',
    subtitle: 'Elegí cómo van a sumar tus clientes para canjear premios de tu catálogo.',
  },
  hours: {
    kind: 'inline',
    Icon: Clock,
    title: 'Tus horarios',
    subtitle: 'Decile a tus clientes cuándo estás abierto.',
  },
  firstPrize: {
    kind: 'deeplink',
    Icon: Gift,
    title: 'Tu primer premio',
    subtitle: 'Cargá un premio para que tus clientes empiecen a canjear.',
    cta: 'Empezar a cargar mi premio',
    target: { tab: 'premios', openPrizeWizard: true },
    why: 'El premio es lo que motiva a tu cliente a volver. Empezá con algo concreto: un café gratis, 20% OFF, una pizza chica, etc. Vamos a abrir un asistente paso a paso.',
  },
  // Las cards "discountNext", "doubleDays" y "messages" del intent picker
  // bypass el wizard: si están lockeadas por plan abren upgrade modal
  // directo (manejado en navigateConfigItem); si están desbloqueadas
  // navegan a su tab correspondiente vía handleWizardDeepLink.
}

const inputStyle = {
  width: '100%', padding: '13px 16px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 14, color: C.white, fontSize: 15, fontFamily: FI,
  boxSizing: 'border-box', outline: 'none',
}
const labelStyle = {
  fontSize: 11, color: C.dust, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7,
  fontFamily: FN, display: 'flex', alignItems: 'center', gap: 6,
}

function Hint({ children }) {
  return (
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 7, lineHeight: 1.5 }}>
      {children}
    </div>
  )
}

export default function ProfileItemWizard({
  itemId,
  onClose,
  onSaveSuccess,    // (itemId) => void — el padre lo usa para celebrar la card
  form,
  setForm,
  onSave,        // async () => boolean — guarda el form al backend
  saving,        // boolean
  onDeepLink,    // (target) => void — cierra wizard + navega al destino
  // ── Helpers para items que no son sólo de form fields ──
  commerce,             // { id, prog_type, ... }
  hoursForm,            // estado actual de horarios
  setHoursForm,         // setter
  uploadLogoBlob,       // async (blob) => boolean — sube logo ya cropeado
  uploadingLogo,        // boolean
  uploadCover,          // async (file, slotIdx) => void
  removeCover,          // (slotIdx) => void
  uploadingCover,       // boolean
  updateSystem,         // async (type, minPurchase) => boolean — guarda prog_type + prog_min_purchase
  updatingSystem,       // boolean
}) {
  // Snapshot completo (form + hoursForm) al abrir el wizard, para rollback
  // en cancelar. tempState guarda valores transitorios que no viven en el
  // form principal (por ej. prog_type que está en commerce, no en form).
  const [snapshot, setSnapshot] = useState(null)
  const [tempState, setTempState] = useState({})
  const [error, setError]       = useState('')
  // cropSrc: dataURL del archivo elegido para el logo. Cuando es != null,
  // se renderiza LogoCropper por encima del wizard (z-index 9999 > 9994).
  const [cropSrc, setCropSrc]   = useState(null)

  // Helper para el step de logo: valida archivo + dimensiones, lee como
  // dataURL y abre el cropper. El upload final lo hace handleLogoCropped
  // cuando el cropper devuelve el blob.
  async function handleLogoFilePicked(file) {
    if (!file) return
    const errFmt = validateImageFile(file)
    if (errFmt) { setError(errFmt); return }
    const errDim = await checkImageDimensions(file)
    if (errDim) { setError(errDim); return }
    setError('')
    const reader = new FileReader()
    reader.onload = e => setCropSrc(e.target.result)
    reader.readAsDataURL(file)
  }
  async function handleLogoCropped(blob) {
    setCropSrc(null)
    if (uploadLogoBlob) {
      const ok = await uploadLogoBlob(blob)
      if (!ok) setError('No se pudo subir el logo. Probá de nuevo.')
    }
  }

  useEffect(() => {
    if (itemId) {
      setSnapshot({
        form: { ...form },
        hoursForm: hoursForm ? JSON.parse(JSON.stringify(hoursForm)) : null,
      })
      setTempState({
        progType:      commerce?.prog_type || 'stars',
        minPurchase:   commerce?.prog_min_purchase ? String(commerce.prog_min_purchase) : '',
        // Sub-step interno para el flujo de sistema (1 = elegir tipo,
        // 2 = configurar compra mínima si es estrellas).
        systemSubStep: 1,
      })
      setError('')
    }
  }, [itemId])

  if (!itemId) return null
  const cfg = ITEM_CONFIG[itemId]
  if (!cfg) return null
  const { Icon, title, subtitle, kind } = cfg

  function handleClose() {
    // Restaurar snapshot — si el dueño tocó algo pero no guardó, se descarta.
    if (snapshot) {
      setForm(snapshot.form)
      if (setHoursForm && snapshot.hoursForm !== null) setHoursForm(snapshot.hoursForm)
    }
    setTempState({})
    onClose()
  }

  async function handleSave() {
    setError('')
    let ok = false
    // Para `system`, prog_type + prog_min_purchase viven en commerce (no en
    // form), así que usamos un updater dedicado que actualiza ambas columnas
    // directo en supabase.
    if (itemId === 'system' && updateSystem) {
      ok = await updateSystem(tempState.progType || 'stars', tempState.minPurchase)
    } else {
      ok = await onSave()
    }
    if (ok) {
      onSaveSuccess?.(itemId)
      onClose()
    } else {
      setError('No se pudo guardar. Probá de nuevo.')
    }
  }

  // Para el flujo `system`, el primario del footer puede ser "Siguiente"
  // (avanza al substep 2 cuando el dueño eligió estrellas) o "Guardar".
  // Esto centraliza la lógica del botón.
  function getPrimaryActionConfig() {
    if (itemId === 'system') {
      const sub = tempState.systemSubStep || 1
      const pt  = tempState.progType || 'stars'
      if (sub === 1 && pt === 'stars') {
        return { kind: 'next', text: 'Siguiente' }
      }
    }
    return { kind: 'save', text: saving || updatingSystem ? 'Guardando…' : 'Guardar' }
  }
  function handlePrimary() {
    const cfg = getPrimaryActionConfig()
    if (cfg.kind === 'next') {
      setTempState(s => ({ ...s, systemSubStep: 2 }))
      setError('')
    } else {
      handleSave()
    }
  }
  function getSecondaryActionConfig() {
    if (itemId === 'system' && (tempState.systemSubStep || 1) === 2) {
      return { kind: 'back', text: 'Atrás' }
    }
    return { kind: 'cancel', text: 'Cancelar' }
  }
  function handleSecondary() {
    const cfg = getSecondaryActionConfig()
    if (cfg.kind === 'back') {
      setTempState(s => ({ ...s, systemSubStep: 1 }))
      setError('')
    } else {
      handleClose()
    }
  }

  function handleDeepLink() {
    // Restauramos el snapshot completo (form + hoursForm) antes de salir
    // del wizard, para que el deep-link no deje cambios parciales sin guardar.
    if (snapshot) {
      setForm(snapshot.form)
      if (setHoursForm && snapshot.hoursForm !== null) setHoursForm(snapshot.hoursForm)
    }
    setTempState({})
    onDeepLink?.(cfg.target)
    onClose()
  }

  // ── Validación per item para habilitar Guardar ──────────────────────────
  function canSave() {
    if (saving || uploadingLogo || uploadingCover || updatingSystem) return false
    if (itemId === 'description') return !!form.description?.trim() && form.description.trim().length >= 10
    if (itemId === 'phone')       return !!form.phone && form.phone.replace(/\D/g, '').length >= 10
    if (itemId === 'address')     return !!form.address?.trim() && form.address.trim().length >= 5 && !!form.province && !!form.city_name
    if (itemId === 'social')      return !!(form.instagram?.trim() || form.facebook?.trim())
    if (itemId === 'logo')        return !!form.img_url
    if (itemId === 'cover')       return Array.isArray(form.cover_images) && form.cover_images.length > 0
    if (itemId === 'category')    return !!form.category
    if (itemId === 'system') {
      const pt = tempState.progType || commerce?.prog_type
      const sub = tempState.systemSubStep || 1
      if (!pt) return false
      // Step 1 con estrellas → siempre habilitado (Siguiente). Step 2 con
      // estrellas → requiere min_purchase > 0. Puntos siempre OK.
      if (pt === 'points') return true
      if (sub === 1) return true
      return !!tempState.minPurchase && parseInt(tempState.minPurchase) > 0
    }
    if (itemId === 'hours')       return !!hoursForm && Object.values(hoursForm).some(d => d?.open)
    return true
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9994, background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Background blobs */}
      {/* Blobs ambientales — rebrand mayo 2026 fase 2: ambos en violeta
          brand monocromo (113,49,225) en lugar de violeta+rosa viejo. */}
      <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(113,49,225,0.30) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(113,49,225,0.25) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />

      {/* Header con cerrar */}
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: FN, fontSize: 11, fontWeight: 700, color: C.dust, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Configurando tu negocio
        </div>
        <button onClick={handleClose} aria-label="Cerrar"
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', padding: 6, lineHeight: 0 }}>
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Hero del paso: icono + título + subtítulo. Para `system` en
          substep 2 (compra mínima), cambiamos el hero para indicarle al
          dueño que está en otra pantalla del flujo. */}
      {(() => {
        let heroTitle = title
        let heroSubtitle = subtitle
        let HeroIcon = Icon
        if (itemId === 'system' && (tempState.systemSubStep || 1) === 2) {
          heroTitle = 'Compra mínima'
          heroSubtitle = 'Configurá cuánto tiene que gastar tu cliente para sumar 1 estrella.'
          HeroIcon = Star
        }
        return (
          <div style={{ padding: '24px 22px 4px', flexShrink: 0, position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{
              width: 62, height: 62, borderRadius: 19, background: G,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 12px 36px rgba(113,49,225,0.40)',
            }}>
              {HeroIcon && <HeroIcon size={28} color="#fff" strokeWidth={1.9} />}
            </div>
            <div style={{ fontFamily: FN, fontSize: 22, fontWeight: 900, color: C.white, marginBottom: 6, letterSpacing: '-.01em' }}>
              {heroTitle}
            </div>
            <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}>
              {heroSubtitle}
            </div>
          </div>
        )
      })()}

      {/* Body — varía según itemId */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1, padding: '20px 22px 24px' }}>
        <div style={{ maxWidth: 440, margin: '0 auto' }}>

          {/* ── Inline: descripción ─────────────────────────────────── */}
          {itemId === 'description' && (
            <>
              <div style={labelStyle}>
                <AlignLeft size={11} strokeWidth={2.4} /> Tu descripción
              </div>
              <textarea
                value={form.description || ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ej: Pizzería familiar con masa madre. Atendemos desde 1995. Hacemos delivery por la zona."
                rows={5}
                autoFocus
                style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.55, fontFamily: FI }}
              />
              <Hint>Mínimo 10 caracteres. No incluyas tu teléfono, dirección ni horarios — eso va en otros campos.</Hint>
            </>
          )}

          {/* ── Inline: teléfono ────────────────────────────────────── */}
          {itemId === 'phone' && (
            <>
              <div style={labelStyle}>
                <Phone size={11} strokeWidth={2.4} /> Teléfono / WhatsApp
              </div>
              <PhoneInput
                value={form.phone || ''}
                onChange={v => setForm(f => ({ ...f, phone: v }))}
                size="lg"
              />
              <Hint>Ingresá tu número con código de área, sin el 0 al inicio ni el 15. Mínimo 10 dígitos.</Hint>
            </>
          )}

          {/* ── Inline: ubicación (país + provincia + ciudad + dirección) ─── */}
          {itemId === 'address' && (() => {
            const provinces = Object.entries(LOCATIONS.argentina.provinces)
            const cities = form.province ? (LOCATIONS.argentina.provinces[form.province]?.cities || []) : []
            return (
              <>
                {/* País — fijado en Argentina por ahora. Lo dejamos visible
                    pero deshabilitado para que el dueño tenga claridad sobre
                    qué país está geocodificando su comercio. */}
                <div style={{ marginBottom: 14 }}>
                  <div style={labelStyle}>País</div>
                  <input
                    type="text"
                    value="Argentina"
                    disabled
                    style={{ ...inputStyle, opacity: 0.65, cursor: 'not-allowed' }}
                  />
                </div>

                {/* Provincia */}
                <div style={{ marginBottom: 14 }}>
                  <div style={labelStyle}>Provincia</div>
                  <select
                    value={form.province || ''}
                    onChange={e => setForm(f => ({ ...f, province: e.target.value, city_name: '' }))}
                    style={{ ...inputStyle, padding: '13px 14px', cursor: 'pointer' }}>
                    <option value="" style={{ background: '#0D0818' }}>Elegí tu provincia…</option>
                    {provinces.map(([key, p]) => (
                      <option key={key} value={key} style={{ background: '#0D0818' }}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Localidad */}
                <div style={{ marginBottom: 14 }}>
                  <div style={labelStyle}>Localidad</div>
                  <select
                    value={form.city_name || ''}
                    onChange={e => setForm(f => ({ ...f, city_name: e.target.value }))}
                    disabled={!form.province}
                    style={{
                      ...inputStyle, padding: '13px 14px',
                      cursor: form.province ? 'pointer' : 'not-allowed',
                      opacity: form.province ? 1 : 0.5,
                    }}>
                    <option value="" style={{ background: '#0D0818' }}>
                      {form.province ? 'Elegí tu ciudad…' : 'Elegí primero la provincia'}
                    </option>
                    {cities.map(c => (
                      <option key={c} value={c} style={{ background: '#0D0818' }}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Calle y número */}
                <div>
                  <div style={labelStyle}>
                    <MapPin size={11} strokeWidth={2.4} /> Calle y número
                  </div>
                  <input
                    type="text"
                    value={form.address || ''}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Ej: Av. Corrientes 1234"
                    autoComplete="off"
                    style={inputStyle}
                  />
                  <Hint>Con esta info geocodificamos tu negocio para que aparezca en el mapa del directorio.</Hint>
                </div>
              </>
            )
          })()}

          {/* ── Inline: social (instagram + facebook) ───────────────── */}
          {itemId === 'social' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={labelStyle}>Instagram</div>
                <input
                  type="text"
                  value={form.instagram || ''}
                  onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                  placeholder="@tunegocio"
                  autoComplete="off"
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={labelStyle}>Facebook</div>
                <input
                  type="text"
                  value={form.facebook || ''}
                  onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))}
                  placeholder="facebook.com/tunegocio"
                  autoComplete="off"
                  style={inputStyle}
                />
              </div>
              <Hint>Con uno solo alcanza. Tus clientes lo van a ver en tu perfil público.</Hint>
            </>
          )}

          {/* ── Inline: logo (subir desde galería con cropper) ───────── */}
          {itemId === 'logo' && (
            <>
              <input
                id="profile-wizard-logo-input"
                type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) handleLogoFilePicked(e.target.files[0]); e.target.value = '' }}
              />
              {form.img_url ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <img
                    src={form.img_url}
                    alt="Logo"
                    style={{
                      width: 180, height: 180, borderRadius: 28, objectFit: 'cover',
                      boxShadow: '0 16px 36px rgba(0,0,0,0.50)',
                      border: '1px solid rgba(255,255,255,0.10)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label htmlFor="profile-wizard-logo-input"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, color: C.pearl, fontSize: 12, fontFamily: FN, fontWeight: 600, cursor: uploadingLogo ? 'progress' : 'pointer', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Camera size={14} strokeWidth={2} />
                      {uploadingLogo ? 'Subiendo…' : 'Cambiar logo'}
                    </label>
                  </div>
                </div>
              ) : (
                <label htmlFor="profile-wizard-logo-input" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '2px dashed rgba(113,49,225,0.36)',
                  borderRadius: 22,
                  padding: '40px 20px',
                  cursor: uploadingLogo ? 'progress' : 'pointer',
                  width: '100%', boxSizing: 'border-box',
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'rgba(113,49,225,0.18)',
                    border: '1px solid rgba(113,49,225,0.32)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Camera size={26} color={C.v} strokeWidth={2} />
                  </div>
                  <div style={{ fontFamily: FN, fontSize: 14, fontWeight: 800, color: C.white, textAlign: 'center' }}>
                    {uploadingLogo ? 'Subiendo…' : 'Tocá para elegir tu logo'}
                  </div>
                  <div style={{ fontSize: 11, color: C.dust, textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>
                    Te abrimos un editor para que lo encuadres prolijo. Recomendado: imagen cuadrada o con fondo limpio.
                  </div>
                </label>
              )}
            </>
          )}

          {/* ── Inline: cover images (5 slots en grid) ──────────────── */}
          {itemId === 'cover' && (
            <>
              <input
                id="profile-wizard-cover-input"
                type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files[0]
                  if (f) {
                    const idx = Array.isArray(form.cover_images) ? form.cover_images.length : 0
                    if (idx < 5) uploadCover?.(f, idx)
                  }
                  e.target.value = ''
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const url = Array.isArray(form.cover_images) ? form.cover_images[i] : null
                  if (url) {
                    return (
                      <div key={i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={() => removeCover?.(i)}
                          aria-label="Quitar foto"
                          style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.62)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    )
                  }
                  // Slot vacío — solo el siguiente disponible es clickeable
                  const fillCount = Array.isArray(form.cover_images) ? form.cover_images.length : 0
                  const isNext = i === fillCount
                  return (
                    <label
                      key={i}
                      htmlFor={isNext ? 'profile-wizard-cover-input' : undefined}
                      style={{
                        aspectRatio: '1/1',
                        background: isNext ? 'rgba(113,49,225,0.06)' : 'rgba(255,255,255,0.02)',
                        border: `2px dashed ${isNext ? 'rgba(113,49,225,0.32)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 14,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 8, cursor: isNext ? (uploadingCover ? 'progress' : 'pointer') : 'default',
                        opacity: isNext ? 1 : 0.45,
                        transition: 'opacity 200ms ease',
                      }}
                    >
                      {isNext ? (
                        <>
                          <Camera size={20} color={C.v} strokeWidth={2} />
                          <div style={{ fontSize: 11, fontFamily: FN, fontWeight: 700, color: C.pearl, textAlign: 'center' }}>
                            {uploadingCover ? 'Subiendo…' : (fillCount === 0 ? 'Sumar foto' : 'Sumar otra')}
                          </div>
                        </>
                      ) : (
                        <Plus size={18} color={C.dust} strokeWidth={2} />
                      )}
                    </label>
                  )
                })}
              </div>
              <Hint>Tu primera foto se usa de fondo en tu perfil. Las otras rotan automáticamente. Vas {Array.isArray(form.cover_images) ? form.cover_images.length : 0} de 5.</Hint>
            </>
          )}

          {/* ── Inline: category (single, picker amigable) ──────────── */}
          {itemId === 'category' && (
            <CategoryStep form={form} setForm={setForm} />
          )}

          {/* ── Inline: system (multi-step: tipo → compra mínima si stars) ── */}
          {itemId === 'system' && (tempState.systemSubStep || 1) === 1 && (
            <SystemStep
              progType={tempState.progType || 'stars'}
              setProgType={(v) => setTempState(s => ({ ...s, progType: v }))}
            />
          )}
          {itemId === 'system' && (tempState.systemSubStep || 1) === 2 && (
            <SystemMinPurchaseStep
              value={tempState.minPurchase || ''}
              onChange={(v) => setTempState(s => ({ ...s, minPurchase: v }))}
            />
          )}

          {/* ── Inline: hours (preset selector + edición fina) ──────── */}
          {itemId === 'hours' && (
            <HoursStep hoursForm={hoursForm} setHoursForm={setHoursForm} />
          )}

          {/* ── Deep-link: items que delegan a una UI específica (firstPrize) ── */}
          {kind === 'deeplink' && (
            <div style={{
              padding: '20px 18px',
              background: 'rgba(113,49,225,0.06)',
              border: '1px solid rgba(113,49,225,0.20)',
              borderRadius: 18,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 12.5, color: C.pearl, lineHeight: 1.6, marginBottom: 4 }}>
                {cfg.why}
              </div>
            </div>
          )}

          {/* Error genérico de guardado */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'rgba(248,116,68,0.12)', border: '1px solid rgba(248,116,68,0.35)', borderRadius: 12, marginTop: 14, fontSize: 13, color: '#f87444', lineHeight: 1.4 }}>
              <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Footer con CTA — el wizard es full-screen, pero los botones los
          envolvemos en un container con maxWidth centrado para que en web
          no se estiren edge-to-edge (en mobile el maxWidth queda más
          ancho que el viewport, así que igual ocupa todo). */}
      <div style={{
        padding: '14px 22px 22px',
        flexShrink: 0, position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,4,18,0.55)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      }}>
        <div style={{
          maxWidth: 440, margin: '0 auto',
          display: 'flex', gap: 10,
        }}>
        <button onClick={handleSecondary}
          style={{ padding: '15px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: C.pearl, fontFamily: FN, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {getSecondaryActionConfig().kind === 'back' && <ChevronLeft size={15} strokeWidth={2.4} />}
          {getSecondaryActionConfig().text}
        </button>
        {kind === 'inline' ? (() => {
          const cfg = getPrimaryActionConfig()
          const enabled = canSave()
          return (
            <button
              onClick={handlePrimary}
              disabled={!enabled}
              style={{
                flex: 1, padding: '15px 16px', borderRadius: 14,
                background: G, border: 'none', color: '#fff',
                fontFamily: FN, fontSize: 14, fontWeight: 800,
                cursor: enabled ? 'pointer' : 'not-allowed',
                opacity: enabled ? 1 : 0.42,
                boxShadow: enabled ? '0 8px 28px rgba(113,49,225,0.40)' : 'none',
                transition: 'opacity 200ms ease, box-shadow 200ms ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              {cfg.text}
              {cfg.kind === 'next'
                ? <ChevronRight size={16} strokeWidth={2.6} />
                : (saving || updatingSystem ? null : <Check size={16} strokeWidth={2.6} />)}
            </button>
          )
        })() : (
          <button
            onClick={handleDeepLink}
            style={{
              flex: 1, padding: '15px 16px', borderRadius: 14,
              background: G, border: 'none', color: '#fff',
              fontFamily: FN, fontSize: 14, fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 8px 28px rgba(113,49,225,0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            {cfg.cta}
            <ArrowRight size={16} strokeWidth={2.6} />
          </button>
        )}
        </div>
      </div>

      {/* LogoCropper — z-index 9999 (encima del wizard 9994). Aparece cuando
          el dueño elige un archivo en el step de logo. Aplica el padding
          automático para logos panorámicos vía makeSquareWithPadding. */}
      {cropSrc && (
        <LogoCropper
          imageSrc={cropSrc}
          onSave={handleLogoCropped}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  )
}

// ─── Helpers de normalización para el picker de rubros ────────────────────
function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
const ALL_SUBS = FAMILIES_DATA.flatMap(f =>
  f.subs.map(s => ({ family: f.name, name: s.name, aliases: s.aliases || [] }))
)

// ─── CategoryStep — picker amigable single-select ─────────────────────────
// Soporta dos modos: búsqueda libre (chips abajo) y drill-down por familia.
// El user puede usar lo que escriba aunque no esté en la lista (rubro custom).
// CategoryStep — multi-select hasta 3 rubros. Toca para sumar (chip + en
// items disponibles), toca la X de un chip para quitarlo. Backfill desde
// `form.category` legacy si `form.categories` está vacío.
function CategoryStep({ form, setForm }) {
  const [search, setSearch] = useState('')
  const [familyId, setFamilyId] = useState(null)
  const MAX = 3

  // Source of truth: form.categories (array). Si está vacío y hay legacy
  // form.category, lo derivamos para mostrarlo como chip ya seleccionado.
  const selected = useMemo(() => {
    if (Array.isArray(form?.categories) && form.categories.length > 0) return form.categories
    if (form?.category) return [form.category]
    return []
  }, [form?.categories, form?.category])

  const filtered = useMemo(() => {
    const q = normalize(search).trim()
    if (!q) return []
    return ALL_SUBS.filter(s =>
      normalize(s.name).includes(q) ||
      normalize(s.family).includes(q) ||
      s.aliases.some(a => normalize(a).includes(q))
    ).slice(0, 8)
  }, [search])

  const activeFamily = useMemo(() => {
    if (!familyId) return null
    return FAMILIES_DATA.find(f => f.id === familyId)
  }, [familyId])

  function setCategories(next) {
    // Mantenemos `categories` (array) como source of truth y `category`
    // como espejo del primer item (compatibilidad con código legacy que
    // todavía lee `commerce.category` single string).
    setForm(f => ({
      ...f,
      categories: next,
      category: next[0] || '',
      customCategory: '',
    }))
  }
  function add(name) {
    if (!name) return
    if (selected.some(c => c.toLowerCase() === name.toLowerCase())) return
    if (selected.length >= MAX) return
    setCategories([...selected, name])
    setSearch('')
  }
  function remove(name) {
    setCategories(selected.filter(c => c.toLowerCase() !== name.toLowerCase()))
  }
  function isSelected(name) {
    return selected.some(c => c.toLowerCase() === name.toLowerCase())
  }
  const atMax = selected.length >= MAX

  return (
    <>
      {/* Chips de las categorías ya elegidas */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 12 }}>
        {selected.length === 0 && (
          <div style={{ fontSize: 11, color: C.dust, fontFamily: FN, fontWeight: 600, letterSpacing: '.04em' }}>
            Elegí hasta {MAX} rubros para tu negocio.
          </div>
        )}
        {selected.map(c => (
          <button
            key={c}
            onClick={() => remove(c)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 10px 7px 12px', borderRadius: 99,
              background: 'rgba(113,49,225,0.20)',
              border: '1px solid rgba(113,49,225,0.45)',
              color: '#fff', fontFamily: FI, fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
            aria-label={`Quitar ${c}`}>
            {c}
            <X size={12} strokeWidth={2.6} style={{ opacity: 0.85 }} />
          </button>
        ))}
        {selected.length > 0 && !atMax && (
          <span style={{ fontSize: 10.5, color: C.dust, fontFamily: FN, fontWeight: 600, letterSpacing: '.04em' }}>
            {selected.length}/{MAX} · podés sumar más
          </span>
        )}
        {atMax && (
          <span style={{ fontSize: 10.5, color: '#f87444', fontFamily: FN, fontWeight: 700, letterSpacing: '.04em' }}>
            Llegaste al máximo de {MAX} rubros
          </span>
        )}
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.dust, pointerEvents: 'none' }} />
        <input
          type="text" value={search}
          onChange={e => { setSearch(e.target.value); setFamilyId(null) }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const t = search.trim()
              if (!t) return
              add(t)
            }
          }}
          placeholder="Buscá tu rubro: pizza, café, peluquería…"
          disabled={atMax}
          style={{
            width: '100%', padding: '12px 14px 12px 38px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, color: C.white, fontSize: 14, fontFamily: FI,
            boxSizing: 'border-box', outline: 'none',
            opacity: atMax ? 0.5 : 1,
          }}
        />
      </div>
      <Hint>Si tu rubro no está en la lista, escribilo y dale Enter — podés sumarlo igual.</Hint>

      {/* Resultados de búsqueda */}
      {search.trim() && !atMax && (
        <div style={{
          maxHeight: 240, overflowY: 'auto',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: 6, marginTop: 10,
        }}>
          {(() => {
            const typed = search.trim()
            const exactMatch = filtered.some(s => s.name.toLowerCase() === typed.toLowerCase())
            const alreadyAdded = isSelected(typed)
            return (
              <>
                {!exactMatch && !alreadyAdded && typed && (
                  <button
                    onClick={() => add(typed)}
                    style={{
                      width: '100%', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 11px', borderRadius: 9,
                      background: 'rgba(113,49,225,0.16)',
                      border: '1px solid rgba(113,49,225,0.32)',
                      color: '#fff', fontFamily: FN, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer',
                      marginBottom: filtered.length > 0 ? 6 : 0,
                    }}>
                    <span style={{ color: C.v }}>✦</span>
                    Sumar "<span style={{ fontWeight: 800 }}>{typed}</span>" como mi rubro
                  </button>
                )}
                {filtered.map(s => {
                  const isSel = isSelected(s.name)
                  return (
                    <button
                      key={s.name}
                      onClick={() => isSel ? remove(s.name) : add(s.name)}
                      style={{
                        width: '100%', textAlign: 'left',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: 9,
                        background: isSel ? 'rgba(113,49,225,0.20)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        color: '#fff', fontFamily: FI, fontSize: 13.5,
                      }}>
                      <span><span style={{ color: C.dust, marginRight: 6 }}>{s.family} ›</span>{s.name}</span>
                      {isSel
                        ? <X size={14} color={C.mist} strokeWidth={2.5} />
                        : <Plus size={14} color={C.v} strokeWidth={2.5} />}
                    </button>
                  )
                })}
              </>
            )
          })()}
        </div>
      )}

      {/* Drill-down por familia (cuando no hay search) */}
      {!search.trim() && !familyId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 10 }}>
          {FAMILIES_DATA.map(f => (
            <button
              key={f.id}
              onClick={() => setFamilyId(f.id)}
              style={{
                padding: '11px 12px', borderRadius: 11,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: C.white, fontFamily: FN, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', textAlign: 'left',
              }}>
              {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Subcategorías de una familia */}
      {!search.trim() && familyId && activeFamily && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setFamilyId(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: C.mist, fontFamily: FN, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0', marginBottom: 8 }}>
            <ChevronLeft size={14} strokeWidth={2.5} /> Volver
          </button>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {activeFamily.subs.map(sub => {
              const isSel = isSelected(sub.name)
              const disabled = !isSel && atMax
              return (
                <button
                  key={sub.name}
                  onClick={() => isSel ? remove(sub.name) : (disabled ? null : add(sub.name))}
                  disabled={disabled}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '7px 10px 7px 12px', borderRadius: 999,
                    background: isSel ? 'rgba(113,49,225,0.22)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isSel ? 'rgba(113,49,225,0.50)' : 'rgba(255,255,255,0.10)'}`,
                    color: '#fff', fontFamily: FI, fontSize: 13, fontWeight: 600,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.45 : 1,
                  }}>
                  {sub.name}
                  {isSel
                    ? <X size={12} strokeWidth={2.6} style={{ opacity: 0.85 }} />
                    : <Plus size={12} strokeWidth={2.6} color={C.v} />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

// ─── SystemStep — radio cards de Estrellas vs Puntos ──────────────────────
function SystemStep({ progType, setProgType }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SystemOption
        active={progType === 'stars'}
        onClick={() => setProgType('stars')}
        Icon={Star}
        color="#6F30DF"
        title="Estrellas"
        desc="1 estrella por cada compra. Simple. Ideal para bares, cafés, peluquerías y comercios con tickets parecidos."
      />
      <SystemOption
        active={progType === 'points'}
        onClick={() => setProgType('points')}
        Icon={Coins}
        color="#FF199F"
        title="Puntos"
        desc="1 punto = 1 peso. Ideal para tiendas con compras de monto variable."
      />
      <Hint>Lo podés cambiar después desde el panel del comercio si no te convence.</Hint>
    </div>
  )
}

// ─── SystemMinPurchaseStep — input numérico para compra mínima en stars ──
function SystemMinPurchaseStep({ value, onChange }) {
  return (
    <>
      <div style={{
        padding: '14px 16px',
        background: 'rgba(113,49,225,0.08)',
        border: '1px solid rgba(113,49,225,0.32)',
        borderRadius: 14,
        display: 'flex', alignItems: 'flex-start', gap: 10,
        marginBottom: 16,
      }}>
        <Star size={18} color="#6F30DF" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: C.pearl, lineHeight: 1.55 }}>
          <strong style={{ color: '#fff', fontWeight: 700 }}>Compra mínima.</strong> Es el monto que debe gastar tu cliente para que sumes <strong style={{ color: '#fff', fontWeight: 700 }}>1 estrella</strong> a su saldo. Compras más chicas no suman.
        </div>
      </div>

      <div style={labelStyle}>
        Compra mínima en pesos
      </div>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontFamily: FN, fontSize: 16, fontWeight: 700, color: C.dust,
          pointerEvents: 'none',
        }}>$</span>
        <input
          type="number" min={1} inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="500"
          autoFocus
          style={{ ...inputStyle, paddingLeft: 32 }}
        />
      </div>
      <Hint>Por ejemplo: si ponés $500, una compra de $1.200 le suma 1 estrella (no se acumulan fracciones). Una compra de $400 no suma nada.</Hint>

      {/* Sugerencias rápidas */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {[500, 1000, 2000, 5000].map(amount => {
          const active = parseInt(value) === amount
          return (
            <button
              key={amount}
              onClick={() => onChange(String(amount))}
              style={{
                padding: '7px 12px', borderRadius: 99,
                background: active ? 'rgba(113,49,225,0.22)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? 'rgba(113,49,225,0.50)' : 'rgba(255,255,255,0.10)'}`,
                color: '#fff', fontFamily: FI, fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer',
              }}>
              ${amount.toLocaleString('es-AR')}
              {active && <Check size={11} color="#6F30DF" strokeWidth={2.6} style={{ marginLeft: 5, verticalAlign: '-1px' }} />}
            </button>
          )
        })}
      </div>
    </>
  )
}

function SystemOption({ active, onClick, Icon, color, title, desc }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '14px 16px', borderRadius: 14,
        background: active ? `${color}1F` : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.10)'}`,
        cursor: 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        transition: 'background 180ms ease, border 180ms ease',
      }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: active ? color : 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} color="#fff" strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FN, fontSize: 14, fontWeight: 800, color: C.white, marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: C.mist, lineHeight: 1.5 }}>
          {desc}
        </div>
      </div>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        border: `2px solid ${active ? color : 'rgba(255,255,255,0.25)'}`,
        background: active ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2,
      }}>
        {active && <Check size={11} color="#fff" strokeWidth={3} />}
      </div>
    </button>
  )
}

// ─── HoursStep — selector de presets + edición fina ───────────────────────
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = { mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom' }

function defaultHours(open = true, from = '09:00', to = '18:00') {
  const out = {}
  DAY_KEYS.forEach(k => { out[k] = { open, shifts: open ? [{ from, to }] : [{ from, to }] } })
  return out
}

function HoursStep({ hoursForm, setHoursForm }) {
  const hf = hoursForm || defaultHours(false)
  const [mode, setMode] = useState(() => {
    if (!hoursForm) return null
    const allOpen247 = DAY_KEYS.every(k => {
      const d = hoursForm[k]
      if (!d?.open) return false
      const s = d.shifts?.[0]
      return s?.from === '00:00' && (s?.to === '23:59' || s?.to === '24:00')
    })
    if (allOpen247) return 'always'
    const onlyWeekdays = DAY_KEYS.slice(0, 5).every(k => hoursForm[k]?.open) &&
                         !hoursForm.sat?.open && !hoursForm.sun?.open
    if (onlyWeekdays) return 'weekdays'
    return 'custom'
  })

  function applyPreset(preset) {
    setMode(preset)
    if (preset === 'always') {
      const next = {}
      DAY_KEYS.forEach(k => { next[k] = { open: true, shifts: [{ from: '00:00', to: '23:59' }] } })
      setHoursForm(next)
    } else if (preset === 'weekdays') {
      const next = {}
      DAY_KEYS.forEach((k, i) => {
        next[k] = i < 5
          ? { open: true,  shifts: [{ from: '09:00', to: '18:00' }] }
          : { open: false, shifts: [{ from: '09:00', to: '18:00' }] }
      })
      setHoursForm(next)
    } else if (preset === 'custom') {
      // arranca con todos abiertos 9-18 — el user va apagando los días que no
      if (!hoursForm) setHoursForm(defaultHours(true))
    }
  }

  function setDay(k, patch) {
    const cur = hf[k] || { open: false, shifts: [{ from: '09:00', to: '18:00' }] }
    setHoursForm({ ...hf, [k]: { ...cur, ...patch } })
  }
  function setShift(k, patch) {
    const cur = hf[k] || { open: true, shifts: [{ from: '09:00', to: '18:00' }] }
    const shifts = [...(cur.shifts || [{ from: '09:00', to: '18:00' }])]
    shifts[0] = { ...(shifts[0] || { from: '09:00', to: '18:00' }), ...patch }
    setHoursForm({ ...hf, [k]: { ...cur, shifts } })
  }

  return (
    <>
      <div style={{ fontSize: 11, color: C.dust, fontWeight: 700, marginBottom: 8, fontFamily: FN, textTransform: 'uppercase', letterSpacing: '.06em' }}>
        Elegí un preset y, si querés, ajustá día por día
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <PresetCard
          active={mode === 'always'}
          onClick={() => applyPreset('always')}
          title="Siempre abierto"
          desc="24 horas, los 7 días. Buena para deliveries 24/7 o servicios online."
        />
        <PresetCard
          active={mode === 'weekdays'}
          onClick={() => applyPreset('weekdays')}
          title="Lunes a viernes 9-18"
          desc="Horario clásico de oficina. Sábado y domingo cerrado."
        />
        <PresetCard
          active={mode === 'custom'}
          onClick={() => applyPreset('custom')}
          title="Personalizado"
          desc="Configurá día por día con tus horarios reales."
        />
      </div>

      {/* Edición fina cuando el modo es custom */}
      {mode === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DAY_KEYS.map(k => {
            const d = hf[k] || { open: false, shifts: [{ from: '09:00', to: '18:00' }] }
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                <button
                  onClick={() => setDay(k, { open: !d.open })}
                  style={{ width: 36, height: 22, borderRadius: 99, background: d.open ? '#22c55e' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
                  <span style={{ position: 'absolute', top: 2, left: d.open ? 16 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
                </button>
                <span style={{ width: 32, fontSize: 12, fontWeight: 700, color: d.open ? C.white : C.dust, fontFamily: FN, flexShrink: 0 }}>{DAY_LABELS[k]}</span>
                {d.open ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="time" value={d.shifts?.[0]?.from || '09:00'} onChange={e => setShift(k, { from: e.target.value })}
                      style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', fontSize: 12, color: C.white, fontFamily: 'inherit', colorScheme: 'dark' }} />
                    <span style={{ fontSize: 11, color: C.dust }}>–</span>
                    <input type="time" value={d.shifts?.[0]?.to || '18:00'} onChange={e => setShift(k, { to: e.target.value })}
                      style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', fontSize: 12, color: C.white, fontFamily: 'inherit', colorScheme: 'dark' }} />
                  </div>
                ) : (
                  <span style={{ flex: 1, fontSize: 11, color: C.dust, fontStyle: 'italic' }}>Cerrado</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function PresetCard({ active, onClick, title, desc }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '12px 14px', borderRadius: 12,
        background: active ? 'rgba(113,49,225,0.14)' : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${active ? 'rgba(113,49,225,0.50)' : 'rgba(255,255,255,0.10)'}`,
        cursor: 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        transition: 'background 180ms ease, border 180ms ease',
      }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        border: `2px solid ${active ? '#6F30DF' : 'rgba(255,255,255,0.25)'}`,
        background: active ? '#6F30DF' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2,
      }}>
        {active && <Check size={11} color="#fff" strokeWidth={3} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FN, fontSize: 13.5, fontWeight: 800, color: C.white, marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 11.5, color: C.mist, lineHeight: 1.45 }}>
          {desc}
        </div>
      </div>
    </button>
  )
}
