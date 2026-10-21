'use client'

// PrizeWizardModal — modal de creación/edición de premios en 3 pasos.
// Reemplaza al accordion inline de Premios para simplificar el flujo en
// pantallas chicas. Cada paso enfoca un solo concepto:
//   1) Identidad del premio (título + descripción opcional)
//   2) Costo y stock
//   3) Foto opcional + confirmación
//
// El state (newPrize) y los handlers (addPrize, uploadPrizeImg, etc.) viven
// en el componente padre (CommerceSettingsView). Este modal es solo UI.
// Cuando el padre ejecuta addPrize() exitosamente, ya cierra el modal vía
// `setCreatePrizeOpen(false)` y limpia el form, así no hay que hacer nada
// extra acá para coordinarlo.

import { useEffect, useState } from 'react'
import { getSuggestedPrizes } from './suggestedPrizesByCategory'
import {
  X, ChevronLeft, ChevronRight, Camera, Trash2, AlertTriangle,
  Star, Coins, Tag, AlignLeft, Image as ImageIcon,
  Type, DollarSign, Pen,
} from 'lucide-react'

// G — antes era gradient orange→fucsia. Rebrand mayo 2026 fase 2:
// violeta brand sólido. Mantengo el nombre G por compat de call sites.
const G  = '#E03E1B'
const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

const C = {
  white: '#FFFFFF', pearl: '#FFEDE6', mist: '#B3A596', dust: '#9A8C7E',
  v: '#E03E1B', rim: 'rgba(255,255,255,0.10)',
}

const TOTAL_STEPS = 3

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
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 7, lineHeight: 1.5 }}>
      {children}
    </div>
  )
}
function Optional() {
  return (
    <span style={{ color: C.dust, fontWeight: 500, textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>
      (opcional)
    </span>
  )
}

export default function PrizeWizardModal({
  open,
  onClose,
  editingPrizeId,
  newPrize,
  setNewPrize,
  commerce,
  addPrize,
  addingPrize,
  prizeError,
  uploadPrizeImg,
  uploadingImg,
  originalPrize,
}) {
  const [step, setStep] = useState(1)
  // Escritorio: una sola pantalla con vista previa (≥900px). Mobile sigue en pasos.
  const [wide, setWide] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(min-width: 900px)')
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])

  // Reset al primer paso cada vez que se abre el modal.
  useEffect(() => {
    if (open) setStep(1)
  }, [open])

  if (!open) return null

  const isEditing = !!editingPrizeId
  const unitLabel = commerce?.prog_type === 'stars' ? 'estrellas' : 'puntos'
  // Rebrand mayo 2026 fase 2: stars migra a violeta brand #E03E1B.
  // Points mantiene fucsia #F0603A (color semántico del sistema).
  const unitColor = commerce?.prog_type === 'stars' ? '#E03E1B' : '#F0603A'
  const UnitIcon  = commerce?.prog_type === 'stars' ? Star : Coins

  // Cada paso lleva un icono que representa visualmente el concepto
  // (texto / precio / foto). Refuerza la jerarquia y ayuda a navegar
  // pasos rapidamente sin leer el titulo.
  const STEP_HEROES = [
    null,
    { title: '¿Qué premio vas a ofrecer?', subtitle: 'Pensá en algo que entusiasme a tus clientes', Icon: Type },
    { title: '¿Cuánto cuesta?',            subtitle: `En cuántas ${unitLabel} se canjea`,           Icon: DollarSign },
    { title: 'Sumá una foto',              subtitle: 'Opcional. Las fotos hacen tu premio más atractivo', Icon: Camera },
  ]

  function stepValid(s) {
    if (s === 1) return !!newPrize.name?.trim()
    if (s === 2) return !!newPrize.cost && parseInt(newPrize.cost) > 0
    if (s === 3) return true
    return false
  }
  function goNext() {
    if (!stepValid(step) || addingPrize) return
    if (step < TOTAL_STEPS) {
      setStep(step + 1)
    } else {
      addPrize()
    }
  }
  function goBack() {
    if (step > 1) setStep(step - 1)
  }

  // En modo edición, el botón final solo guarda si hay cambios reales.
  const hasChanges = isEditing && originalPrize ? (
    newPrize.name !== originalPrize.name ||
    (newPrize.description || '') !== (originalPrize.description || '') ||
    String(newPrize.cost) !== String(originalPrize.cost) ||
    (newPrize.img_url || '') !== (originalPrize.img_url || '') ||
    String(newPrize.stock || '') !== String(originalPrize.stock || '')
  ) : true

  const stepHero = STEP_HEROES[step]
  // En edición mostramos todo en una pantalla → un hero genérico en lugar
  // del hero por-paso.
  const heroData = isEditing
    ? { title: 'Editá tu premio', subtitle: 'Cambiá lo que quieras y guardá los cambios.', Icon: Tag }
    : stepHero
  const isLast   = step === TOTAL_STEPS
  const allFieldsValid = stepValid(1) && stepValid(2)
  const enabled  = isEditing
    ? (allFieldsValid && !addingPrize && !uploadingImg && hasChanges)
    : (stepValid(step) && !addingPrize && !uploadingImg && (!isLast || !isEditing || hasChanges))
  const progress = (step / TOTAL_STEPS) * 100

  // ── Escritorio: formulario único + vista previa ──
  if (wide) {
    const cats = commerce?.categories?.length ? commerce.categories : (commerce?.category ? [commerce.category] : [])
    let ideas = []
    try { ideas = isEditing ? [] : getSuggestedPrizes(cats, commerce?.prog_type === 'stars' ? 'stars' : 'points').slice(0, 4) } catch { ideas = [] }
    const catLabel = cats[0]
    const canSave = allFieldsValid && !addingPrize && !uploadingImg && hasChanges
    return (
      <div className="pw-panel pw-wide" style={{ position: 'fixed', inset: 0, zIndex: 9994, background: '#14100D', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 8px', flexShrink: 0 }}>
          <div style={{ fontFamily: FN, fontSize: 12, fontWeight: 800, color: C.mist, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {isEditing ? 'Editar premio' : 'Nuevo premio'}
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: 6, lineHeight: 0 }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 16px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 250px', gap: 24, alignItems: 'start' }}>
          <div>
            {ideas.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={labelStyle}>Ideas para tu rubro{catLabel ? ` (${catLabel})` : ''}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ideas.map(i => (
                    <button key={i.name} type="button"
                      onClick={() => setNewPrize(p => ({ ...p, name: i.name, cost: String(i.cost) }))}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, color: C.pearl, fontSize: 12, fontFamily: FI, padding: '6px 12px', cursor: 'pointer' }}>
                      {i.name} · {i.cost} {commerce?.prog_type === 'stars' ? '★' : 'pts'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}><Tag size={11} strokeWidth={2.4} /> Título</div>
              <input type="text" value={newPrize.name} autoComplete="off" style={inputStyle}
                onChange={e => setNewPrize(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Café gratis, Corte de pelo…" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}><AlignLeft size={11} strokeWidth={2.4} /> Descripción <Optional /></div>
              <textarea rows={3} value={newPrize.description || ''} style={{ ...inputStyle, resize: 'vertical', minHeight: 76, lineHeight: 1.5 }}
                onChange={e => setNewPrize(p => ({ ...p, description: e.target.value }))}
                placeholder="Ej: Café con leche a elección, tamaño grande" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <div style={labelStyle}><UnitIcon size={11} strokeWidth={2.4} color={unitColor} /> Costo en {unitLabel}</div>
                <input type="number" min={1} inputMode="numeric" value={newPrize.cost} style={inputStyle}
                  onChange={e => setNewPrize(p => ({ ...p, cost: e.target.value }))}
                  placeholder={commerce?.prog_type === 'stars' ? 'Ej: 10' : 'Ej: 500'} />
              </div>
              <div>
                <div style={labelStyle}>Stock <Optional /></div>
                <input type="number" min={1} inputMode="numeric" value={newPrize.stock} style={inputStyle}
                  onChange={e => setNewPrize(p => ({ ...p, stock: e.target.value }))}
                  placeholder="Sin tope" />
              </div>
            </div>
            <div>
              <div style={labelStyle}><Camera size={11} strokeWidth={2.4} /> Foto <Optional /></div>
              <input type="file" accept="image/*" id="prize-wizard-img-input" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) uploadPrizeImg(e.target.files[0]); e.target.value = '' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <label htmlFor="prize-wizard-img-input"
                  style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(224,62,27,0.4)', borderRadius: 14, color: C.pearl, fontSize: 13, fontFamily: FN, fontWeight: 600, cursor: uploadingImg ? 'progress' : 'pointer', padding: '13px 14px' }}>
                  {uploadingImg ? 'Subiendo…' : (newPrize.img_url ? 'Cambiar foto' : 'Subir una foto')}
                </label>
                {newPrize.img_url && (
                  <button type="button" onClick={() => setNewPrize(p => ({ ...p, img_url: '' }))}
                    style={{ background: 'transparent', border: '1px solid rgba(248,116,68,0.3)', borderRadius: 14, color: '#f87444', cursor: 'pointer', padding: '0 14px' }}>
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
            {prizeError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'rgba(248,116,68,0.12)', border: '1px solid rgba(248,116,68,0.35)', borderRadius: 12, marginTop: 14, fontSize: 13, color: '#f87444' }}>
                <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0 }} /> {prizeError}
              </div>
            )}
          </div>
          <div style={{ position: 'sticky', top: 0 }}>
            <div style={labelStyle}>Así lo ve tu cliente</div>
            <div style={{ background: '#FAF6F0', color: '#2A140D', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.45)' }}>
              <div style={{ height: 130, background: newPrize.img_url ? `url(${newPrize.img_url}) center/cover` : 'linear-gradient(135deg,#e9b8a4,#c4573a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                {!newPrize.img_url && 'foto del premio'}
              </div>
              <div style={{ padding: '12px 14px', display: 'grid', gap: 5 }}>
                <div style={{ fontFamily: FN, fontSize: 15, fontWeight: 800, wordBreak: 'break-word' }}>{newPrize.name?.trim() || 'Tu premio'}</div>
                {newPrize.description?.trim() && <div style={{ fontSize: 12, color: '#7a5c4e', lineHeight: 1.4, wordBreak: 'break-word' }}>{newPrize.description}</div>}
                <div style={{ display: 'inline-block', width: 'max-content', background: '#CC3516', color: '#fff', borderRadius: 99, padding: '3px 11px', fontWeight: 800, fontSize: 12 }}>
                  {newPrize.cost || '—'} {commerce?.prog_type === 'stars' ? '★' : 'pts'}
                </div>
                {newPrize.stock ? <div style={{ fontSize: 11, color: '#7a5c4e' }}>Stock: {newPrize.stock}</div> : null}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '14px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ padding: '14px 22px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: C.pearl, fontFamily: FN, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={addPrize} disabled={!canSave}
            style={{ flex: 1, padding: '14px 16px', borderRadius: 14, background: G, border: 'none', color: '#fff', fontFamily: FN, fontSize: 14, fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.42, boxShadow: canSave ? '0 8px 28px rgba(224,62,27,0.40)' : 'none' }}>
            {isEditing ? (addingPrize ? 'Guardando…' : (hasChanges ? 'Guardar cambios' : 'Sin cambios')) : (addingPrize ? 'Creando…' : 'Crear premio')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pw-panel" style={{
      position: 'fixed', inset: 0, zIndex: 9994, background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Background blobs */}
      {/* Blobs ambientales — rebrand mayo 2026 fase 2: ambos en violeta
          brand monocromo (113,49,225) en lugar de violeta+rosa viejo. */}
      <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(224,62,27,0.30) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(224,62,27,0.25) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />

      {/* Header: tag + close + barra de progreso */}
      <div style={{ padding: '14px 18px 8px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: FN, fontSize: 11, fontWeight: 700, color: C.dust, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {isEditing ? 'Editando premio' : `Nuevo premio · Paso ${step} de ${TOTAL_STEPS}`}
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 6, lineHeight: 0 }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        {!isEditing && (
        <div style={{ width: '100%', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: G,
            borderRadius: 99,
            transition: 'width 380ms cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
        )}
      </div>

      {/* Hero del paso — icono representativo arriba del titulo. */}
      <div style={{ padding: '14px 22px 6px', flexShrink: 0, position: 'relative', zIndex: 1, textAlign: 'center' }}>
        {isEditing ? (
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18,
              background: newPrize.img_url ? `url(${newPrize.img_url}) center/cover` : 'rgba(224,62,27,0.14)',
              border: '1px solid rgba(224,62,27,0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px -8px rgba(224,62,27,0.55)',
            }}>
              {!newPrize.img_url && <Tag size={26} color={C.v} strokeWidth={2.2} />}
            </div>
            {/* Lapicito para cambiar la foto — reusa el file input del paso foto */}
            <label htmlFor="prize-wizard-img-input" title="Cambiar foto" aria-label="Cambiar foto"
              style={{ position: 'absolute', bottom: -6, right: -6, width: 28, height: 28, borderRadius: '50%', background: '#E03E1B', border: '2px solid #120c08', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.45)' }}>
              <Pen size={13} color="#fff" strokeWidth={2.4} />
            </label>
            {newPrize.img_url && (
              <button type="button" onClick={() => setNewPrize(p => ({ ...p, img_url: '' }))} title="Quitar foto" aria-label="Quitar foto"
                style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: '50%', background: '#f87444', border: '2px solid #120c08', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                <Trash2 size={11} color="#fff" strokeWidth={2.4} />
              </button>
            )}
          </div>
        ) : heroData?.Icon && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(224,62,27,0.14)',
            border: '1px solid rgba(224,62,27,0.40)',
            marginBottom: 12,
            boxShadow: '0 8px 24px -8px rgba(224,62,27,0.55)',
          }}>
            <heroData.Icon size={24} color={C.v} strokeWidth={2.2} />
          </div>
        )}
        <div style={{ fontFamily: FN, fontSize: 19, fontWeight: 900, color: C.white, marginBottom: 6, letterSpacing: '-.01em' }}>
          {heroData?.title}
        </div>
        <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}>
          {heroData?.subtitle}
        </div>
      </div>

      {/* Slide track de 3 pasos */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 1 }}>
        <div style={isEditing ? {
          display: 'flex', flexDirection: 'column', width: '100%',
        } : {
          display: 'flex',
          width: `${TOTAL_STEPS * 100}%`,
          transform: `translateX(-${(step - 1) * (100 / TOTAL_STEPS)}%)`,
          transition: 'transform 380ms cubic-bezier(0.4,0,0.2,1)',
        }}>

          {/* ── Paso 1: Título + Descripción ────────────────────── */}
          <div style={{ width: isEditing ? '100%' : `${100 / TOTAL_STEPS}%`, flexShrink: 0, padding: '14px 22px 24px', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: 440, margin: '0 auto' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={labelStyle}>
                  <Tag size={11} strokeWidth={2.4} /> Título
                </div>
                <input
                  type="text"
                  value={newPrize.name}
                  onChange={e => setNewPrize(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Café gratis, 20% OFF en la cuenta…"
                  style={inputStyle}
                  autoComplete="off"
                />
                <Hint>Cómo va a aparecer en el catálogo de tus clientes.</Hint>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={labelStyle}>
                  <AlignLeft size={11} strokeWidth={2.4} /> Descripción <Optional />
                </div>
                <textarea
                  value={newPrize.description}
                  onChange={e => setNewPrize(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detalles del premio. Ej: Café con leche a elección, tamaño grande"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 90, lineHeight: 1.5, fontFamily: FI }}
                />
                <Hint>Aclará condiciones, restricciones o cualquier detalle útil.</Hint>
              </div>
            </div>
          </div>

          {/* ── Paso 2: Costo + Stock ───────────────────────────── */}
          <div style={{ width: isEditing ? '100%' : `${100 / TOTAL_STEPS}%`, flexShrink: 0, padding: '14px 22px 24px', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: 440, margin: '0 auto' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={labelStyle}>
                  <UnitIcon size={11} strokeWidth={2.4} color={unitColor} /> Costo en {unitLabel}
                </div>
                <input
                  type="number" min={1} inputMode="numeric"
                  value={newPrize.cost}
                  onChange={e => setNewPrize(p => ({ ...p, cost: e.target.value }))}
                  placeholder={commerce?.prog_type === 'stars' ? 'Ej: 10' : 'Ej: 500'}
                  style={inputStyle}
                />
                <Hint>
                  {commerce?.prog_type === 'stars'
                    ? 'Cantidad de estrellas que necesita tu cliente para canjear este premio. Cada compra suma 1 estrella.'
                    : 'Cantidad de puntos que necesita tu cliente para canjear este premio. Cada peso de la compra suma 1 punto.'}
                </Hint>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={labelStyle}>Stock <Optional /></div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" min={1} inputMode="numeric"
                    value={newPrize.stock}
                    onChange={e => setNewPrize(p => ({ ...p, stock: e.target.value }))}
                    placeholder="Sin tope"
                    style={inputStyle}
                  />
                  {newPrize.stock !== '' && (
                    <button onClick={() => setNewPrize(p => ({ ...p, stock: '' }))} type="button" title="Sin tope"
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: C.dust, fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: '4px 8px' }}>
                      ✕
                    </button>
                  )}
                </div>
                <Hint>Cantidad limitada de canjes disponibles. Dejalo vacío para que sea sin tope.</Hint>
              </div>
            </div>
          </div>

          {/* ── Paso 3: Foto + confirmación ──────────────────────── */}
          <div style={{ width: isEditing ? '100%' : `${100 / TOTAL_STEPS}%`, flexShrink: 0, padding: '14px 22px 24px', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: 440, margin: '0 auto' }}>
              <input type="file" accept="image/*" id="prize-wizard-img-input" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) uploadPrizeImg(e.target.files[0]); e.target.value = '' }} />

              {!isEditing && (<>
              {newPrize.img_url ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                  <img
                    src={newPrize.img_url}
                    alt={newPrize.name}
                    style={{
                      width: 180, height: 180, borderRadius: 22, objectFit: 'cover',
                      boxShadow: '0 16px 36px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.06) inset',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label htmlFor="prize-wizard-img-input"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, color: C.pearl, fontSize: 12, fontFamily: FN, fontWeight: 600, cursor: 'pointer', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Camera size={14} strokeWidth={2} /> Cambiar
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewPrize(p => ({ ...p, img_url: '' }))}
                      style={{ background: 'transparent', border: '1px solid rgba(248,116,68,0.30)', borderRadius: 12, color: '#f87444', fontSize: 12, fontFamily: FN, fontWeight: 600, cursor: 'pointer', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Trash2 size={14} strokeWidth={2} /> Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <label htmlFor="prize-wizard-img-input" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '2px dashed rgba(224,62,27,0.32)',
                  borderRadius: 18,
                  padding: '36px 20px',
                  cursor: uploadingImg ? 'progress' : 'pointer',
                  width: '100%', boxSizing: 'border-box',
                  marginBottom: 8,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: 'rgba(224,62,27,0.16)',
                    border: '1px solid rgba(224,62,27,0.30)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {uploadingImg
                      ? <ImageIcon size={22} color={C.v} strokeWidth={2} />
                      : <Camera     size={22} color={C.v} strokeWidth={2} />}
                  </div>
                  <div style={{ fontFamily: FN, fontSize: 14, fontWeight: 800, color: C.white, textAlign: 'center' }}>
                    {uploadingImg ? 'Subiendo…' : 'Tocá para subir una foto'}
                  </div>
                  <div style={{ fontSize: 11, color: C.dust, textAlign: 'center', lineHeight: 1.6, maxWidth: 280 }}>
                    Las fotos hacen el premio más atractivo en el catálogo. Podés saltar este paso y subirla después.
                  </div>
                </label>
              )}

              {/* Mini preview de cómo va a quedar */}
              <div style={{
                marginTop: 16, padding: '12px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: newPrize.img_url ? `url(${newPrize.img_url}) center/cover` : 'rgba(224,62,27,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {!newPrize.img_url && <Tag size={18} color={C.v} strokeWidth={2} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FN, fontSize: 13, fontWeight: 800, color: C.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {newPrize.name || 'Tu premio'}
                  </div>
                  <div style={{ fontSize: 11, color: C.mist, marginTop: 2 }}>
                    Cuesta {newPrize.cost || '—'} {unitLabel}{newPrize.stock ? ` · stock ${newPrize.stock}` : ''}
                  </div>
                </div>
              </div>
              </>)}

              {prizeError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'rgba(248,116,68,0.12)', border: '1px solid rgba(248,116,68,0.35)', borderRadius: 12, marginTop: 14, fontSize: 13, color: '#f87444', lineHeight: 1.4 }}>
                  <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
                  {prizeError}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Footer: Atrás + Continuar / Crear premio */}
      <div style={{
        padding: '14px 22px 22px',
        flexShrink: 0, position: 'relative', zIndex: 1,
        display: 'flex', gap: 10,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(14,11,9,0.55)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      }}>
        {step > 1 && (
          <button onClick={goBack}
            style={{ padding: '15px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: C.pearl, fontFamily: FN, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ChevronLeft size={16} strokeWidth={2.4} />
            Atrás
          </button>
        )}
        <button
          onClick={isEditing ? addPrize : goNext}
          disabled={!enabled}
          style={{
            flex: 1, padding: '15px 16px', borderRadius: 14,
            background: G, border: 'none', color: '#fff',
            fontFamily: FN, fontSize: 14, fontWeight: 800,
            cursor: enabled ? 'pointer' : 'not-allowed',
            opacity: enabled ? 1 : 0.42,
            boxShadow: enabled ? '0 8px 28px rgba(224,62,27,0.40)' : 'none',
            transition: 'opacity 200ms ease, box-shadow 200ms ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          {isEditing
            ? (addingPrize ? 'Guardando…' : (hasChanges ? 'Guardar cambios' : 'Sin cambios'))
            : (addingPrize && isLast
                ? 'Creando…'
                : (isLast ? 'Crear premio' : 'Continuar'))}
          {!isEditing && !addingPrize && !isLast && <ChevronRight size={16} strokeWidth={2.4} />}
        </button>
      </div>
    </div>
  )
}
