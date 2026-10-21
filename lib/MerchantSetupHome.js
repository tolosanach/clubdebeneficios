'use client'

// MerchantSetupHome — pantalla inicial del panel comerciante (intent picker).
// Reemplaza el bloque viejo "Configurá tu negocio" (banner + carrusel de
// chips + barra de LEDs + carpeta Pendientes/Completos + nota premium) por
// dos vistas según cuánto tenga configurado el dueño:
//
//   · cfgPct < SETUP_THRESHOLD → "Así te ven tus clientes": una vista previa
//     de la ficha pública con huecos punteados. Cada hueco es el paso que
//     falta y al tocarlo abre su wizard. Muestra POR QUÉ completar cada cosa.
//
//   · cfgPct >= SETUP_THRESHOLD → "Resumen diario": negocio + un solo aviso
//     con lo próximo que falta, beneficios en filas con acción directa y un
//     CTA grande para registrar la compra de un cliente.
//
// No tiene lógica de negocio propia: recibe los `configItems` ya calculados
// en CommerceSettingsView y delega la navegación en `onItem`
// (navigateConfigItem) y `onScan`.

import HomeCards from './HomeCards'
import {
  Camera, ChevronRight, Plus, Percent, Zap, Gift, Clock, MapPin, Phone,
  AtSign, Tag, AlignLeft, Sparkles, Bot, Pen, Lock, QrCode, Store, Check,
} from 'lucide-react'

export const SETUP_THRESHOLD = 60

const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

const T = {
  ink:     '#FFFFFF',
  soft:    'rgba(255,255,255,0.78)',
  muted:   'rgba(255,255,255,0.62)',
  surface: 'rgba(255,255,255,0.05)',
  surface2:'rgba(255,255,255,0.08)',
  rim:     'rgba(255,255,255,0.12)',
  dash:    'rgba(255,255,255,0.26)',
  violet:  '#CC3516',   // botones con texto blanco: 5,14:1
  violetL: '#FF7A59',   // acento único: íconos, vacíos, progreso (7,37:1 sobre oscuro)
  ok:      '#22E698',
  amber:   '#FF7A59',   // ya no es ámbar: todo lo que falta completar va en coral claro (el ámbar es el color del plan PRO)
  starter: '#5B8DEF',
  pro:     '#F5A623',
}

const PLAN_TAG = {
  starter: { label: 'STARTER', color: T.starter },
  pro:     { label: 'PRO',     color: T.pro },
}

function PlanTag({ plan }) {
  const p = PLAN_TAG[plan]
  if (!p) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 7px', borderRadius: 6,
      background: `${p.color}22`, color: p.color,
      fontFamily: FN, fontSize: 12, fontWeight: 800, letterSpacing: '.06em',
    }}>
      <Lock size={10} strokeWidth={2.6} />{p.label}
    </span>
  )
}

const resetBtn = {
  border: 'none', background: 'transparent', padding: 0, margin: 0,
  font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left',
}

// Hueco punteado de la vista previa: un paso pendiente con forma del dato
// que va a ocupar ese lugar en la ficha pública.
function Slot({ item, label, Icon, onItem, style }) {
  if (!item) return null
  return (
    <button
      type="button"
      onClick={() => onItem(item)}
      style={{
        ...resetBtn,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        minHeight: 48, padding: '10px 12px', borderRadius: 14,
        border: `1.5px dashed ${T.dash}`, color: T.soft,
        fontFamily: FN, fontSize: 13, fontWeight: 700,
        ...style,
      }}
    >
      <Plus size={15} color={T.violetL} strokeWidth={2.4} />
      {Icon && <Icon size={15} color={T.violetL} strokeWidth={2} />}
      <span>{label}</span>
      {item.lockedByPlan && <PlanTag plan={item.lockedByPlan} />}
    </button>
  )
}

function ProgressLine({ pct, doneCount, totalCount }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: T.surface2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: T.amber, transition: 'width 400ms ease' }} />
      </div>
      <span style={{ fontFamily: FN, fontSize: 12, fontWeight: 800, color: T.amber }}>{pct}%</span>
      <span style={{ fontFamily: FI, fontSize: 12, color: T.muted }}>{doneCount}/{totalCount}</span>
    </div>
  )
}

// ── Vista A: "Así te ven tus clientes" ──────────────────────────────────
function ClientPreview({ commerce, form, items, prizes, cfgPct, doneCount, totalCount, pendingItems, onItem }) {
  const it = (id) => items.find(i => i.id === id)
  const pending = (id) => { const i = it(id); return i && !i.done ? i : null }
  const cover = (Array.isArray(commerce?.cover_images) && commerce.cover_images[0]) || commerce?.cover_image
  const logo = commerce?.img_url
  const activePrizes = (prizes || []).filter(p => p.active).length
  const categories = (Array.isArray(commerce?.categories) && commerce.categories.length ? commerce.categories : (commerce?.category ? [commerce.category] : []))
  const initials = (commerce?.name || 'Tu negocio').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  // Pasos que no se ven en la ficha pública (configuración interna).
  const hidden = ['system', 'messages'].map(pending).filter(Boolean)

  const coverItem = pending('cover')
  const logoItem  = pending('logo')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ fontFamily: FN, fontSize: 'clamp(22px,4vw,26px)', fontWeight: 800, color: T.ink, margin: '14px 0 4px', letterSpacing: '-.01em' }}>
          Así te ven tus clientes
        </h1>
        <p style={{ fontFamily: FI, fontSize: 14, color: T.muted, margin: '0 0 12px', lineHeight: 1.45 }}>
          Tocá un espacio vacío para completarlo.
        </p>
        <ProgressLine pct={cfgPct} doneCount={doneCount} totalCount={totalCount} />
      </div>

      <section style={{ borderRadius: 22, background: T.surface, border: `1px solid ${T.rim}`, overflow: 'hidden' }}>
        {/* Portada */}
        {cover ? (
          <div style={{ height: 140, background: `center / cover no-repeat url("${cover}")` }} />
        ) : (
          <button
            type="button"
            onClick={() => coverItem && onItem(coverItem)}
            style={{
              ...resetBtn, width: '100%', height: 140,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 12px, rgba(255,255,255,0.03) 12px 24px)',
              color: T.amber, fontFamily: FN, fontSize: 14, fontWeight: 700, textAlign: 'center',
            }}
          >
            <Camera size={26} strokeWidth={1.8} />
            + Agregá fotos de tu local
          </button>
        )}

        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Logo + nombre */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: -26 }}>
            <button
              type="button"
              onClick={() => logoItem && onItem(logoItem)}
              aria-label={logo ? 'Logo del negocio' : 'Agregar logo'}
              style={{
                ...resetBtn, width: 60, height: 60, flexShrink: 0, borderRadius: 16, overflow: 'hidden',
                border: logo ? '3px solid #211710' : `2px dashed ${T.amber}`,
                background: logo ? '#211710' : '#352519',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: logo ? T.ink : T.amber, fontFamily: FN, fontWeight: 800, fontSize: 20,
                cursor: logo ? 'default' : 'pointer',
              }}
            >
              {logo
                ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <Camera size={22} strokeWidth={2} />}
            </button>
            <div style={{ minWidth: 0, paddingBottom: 4 }}>
              <div style={{ fontFamily: FN, fontSize: 18, fontWeight: 800, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {commerce?.name || initials}
              </div>
              {categories.length > 0 && (
                <div style={{ fontFamily: FI, fontSize: 12, color: T.muted }}>{categories.join(' · ')}</div>
              )}
            </div>
          </div>

          <Slot item={pending('category')} label="Elegí tu rubro" Icon={Tag} onItem={onItem} />

          {form?.description && form.description.trim().length >= 10
            ? <p style={{ margin: 0, fontFamily: FI, fontSize: 13.5, lineHeight: 1.5, color: T.soft }}>{form.description}</p>
            : <Slot item={pending('description')} label="Contá qué hacés" Icon={AlignLeft} onItem={onItem} />}

          {/* Beneficios, como los ve el cliente */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[
              { id: 'discountNext', label: 'Cupón', Icon: Percent, doneText: 'Activo' },
              { id: 'doubleDays',   label: 'Suma doble', Icon: Zap, doneText: 'Activo' },
              { id: 'firstPrize',   label: 'Premios', Icon: Gift, doneText: `${activePrizes}` },
            ].map(b => {
              const item = it(b.id)
              if (!item) return null
              if (item.done) {
                // Ya configurado: sigue siendo tocable y lleva a editarlo
                // (Premios → catálogo, Cupón/Suma doble → su sub-pestaña).
                return (
                  <button key={b.id} type="button" onClick={() => onItem(item)} aria-label={`${b.label}: ver y editar`} style={{
                    ...resetBtn, minHeight: 76, borderRadius: 14, background: T.surface2,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6, textAlign: 'center',
                  }}>
                    <span style={{ fontFamily: FN, fontSize: b.id === 'firstPrize' ? 20 : 13, fontWeight: 800, color: T.ink }}>{b.doneText}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontFamily: FI, fontSize: 12, color: T.soft }}>
                      {b.label}<ChevronRight size={12} strokeWidth={2.4} />
                    </span>
                  </button>
                )
              }
              return (
                <button key={b.id} type="button" onClick={() => onItem(item)} style={{
                  ...resetBtn, minHeight: 76, borderRadius: 14, border: `1.5px dashed ${T.dash}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 6,
                  color: T.soft, fontFamily: FN, fontSize: 12, fontWeight: 700, textAlign: 'center',
                }}>
                  {item.lockedByPlan
                    ? <PlanTag plan={item.lockedByPlan} />
                    : <Plus size={17} color={T.violetL} strokeWidth={2.4} />}
                  {b.label}
                </button>
              )
            })}
          </div>

          {/* Datos de contacto */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <Slot item={pending('hours')}   label="Horarios"  Icon={Clock}  onItem={onItem} />
            <Slot item={pending('address')} label="Ubicación" Icon={MapPin} onItem={onItem} />
            <Slot item={pending('phone')}   label="Teléfono"  Icon={Phone}  onItem={onItem} />
            <Slot item={pending('social')}  label="Redes"     Icon={AtSign} onItem={onItem} />
          </div>
        </div>
      </section>

      {/* Sugerencias: tarjetas acordeón según lo que falta */}
      <HomeCards items={items} onItem={onItem} />

      {hidden.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: FI, fontSize: 12.5, color: T.muted }}>Y por dentro (no lo ve el cliente)</div>
          {hidden.map(item => (
            <button key={item.id} type="button" onClick={() => onItem(item)} style={{
              ...resetBtn, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', minHeight: 48,
              borderRadius: 14, background: T.surface, border: `1px solid ${T.rim}`, color: T.ink,
            }}>
              {item.id === 'messages' ? <Bot size={17} color={T.violetL} /> : <Sparkles size={17} color={T.violetL} />}
              <span style={{ flex: 1, fontFamily: FN, fontSize: 14, fontWeight: 700 }}>{item.title}</span>
              {item.lockedByPlan ? <PlanTag plan={item.lockedByPlan} /> : <ChevronRight size={17} color={T.muted} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Vista B: resumen diario ─────────────────────────────────────────────
function DailySummary({ commerce, items, prizes, pendingItems, onItem, onEditPublic, onScan }) {
  const it = (id) => items.find(i => i.id === id)
  const activePrizes = (prizes || []).filter(p => p.active).length
  const next = pendingItems[0]
  const rest = pendingItems.length - 1
  const logo = commerce?.img_url

  const benefitRows = [
    { id: 'discountNext', label: 'Cupón próxima visita', Icon: Percent, doneText: 'Activo' },
    { id: 'doubleDays',   label: 'Suma doble',           Icon: Zap,     doneText: 'Activo' },
    { id: 'firstPrize',   label: 'Premios',              Icon: Gift,    doneText: `${activePrizes} activo${activePrizes === 1 ? '' : 's'}` },
  ].map(r => ({ ...r, item: it(r.id) })).filter(r => r.item)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 14 }}>
      {/* Negocio */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: T.violet, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {logo
            ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <Store size={22} color="#fff" strokeWidth={2} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: FN, fontSize: 20, fontWeight: 800, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {commerce?.name || 'Tu negocio'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FI, fontSize: 12.5, fontWeight: 600, color: T.ok }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.ok }} />Negocio activo
          </div>
        </div>
        {onEditPublic && (
          <button type="button" onClick={onEditPublic} aria-label="Editar el negocio en la vista pública" style={{
            ...resetBtn, width: 44, height: 44, borderRadius: 12, border: `1px solid ${T.rim}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.soft,
          }}>
            <Pen size={17} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Un solo aviso: lo próximo que falta */}
      {next && (
        <button type="button" onClick={() => onItem(next)} style={{
          ...resetBtn, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
          borderRadius: 16, background: 'rgba(255,122,89,0.10)', border: '1px solid rgba(255,122,89,0.35)', color: T.ink,
        }}>
          {next.Icon ? <next.Icon size={21} color={T.amber} strokeWidth={1.9} /> : <Sparkles size={21} color={T.amber} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FN, fontSize: 15, fontWeight: 800 }}>Falta: {next.title.toLowerCase()}</div>
            <div style={{ fontFamily: FI, fontSize: 12.5, color: '#FFD9CC' }}>
              {rest > 0 ? `+${rest} paso${rest === 1 ? '' : 's'} más para completar tu perfil` : 'Es el último paso'}
            </div>
          </div>
          <ChevronRight size={18} color={T.amber} strokeWidth={2.4} />
        </button>
      )}

      {/* Sugerencias: tarjetas acordeón según lo que falta */}
      <HomeCards items={items} onItem={onItem} />

      {/* Beneficios */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ margin: 0, fontFamily: FN, fontSize: 15, fontWeight: 800, color: T.ink }}>Tus beneficios</h2>
        <div style={{ borderRadius: 18, background: T.surface, border: `1px solid ${T.rim}`, overflow: 'hidden' }}>
          {benefitRows.map((r, idx) => (
            <button key={r.id} type="button" onClick={() => onItem(r.item)} style={{
              ...resetBtn, width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', minHeight: 56, color: T.ink,
              borderTop: idx === 0 ? 'none' : `1px solid ${T.rim}`,
            }}>
              <r.Icon size={19} color={r.item.done ? T.ok : T.muted} strokeWidth={1.9} />
              <span style={{ flex: 1, fontFamily: FN, fontSize: 14.5, fontWeight: 700 }}>{r.label}</span>
              {r.item.done ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FN, fontSize: 13, fontWeight: 800, color: T.ok }}>
                  <Check size={14} strokeWidth={2.6} />{r.doneText}
                </span>
              ) : r.item.lockedByPlan ? (
                <PlanTag plan={r.item.lockedByPlan} />
              ) : (
                <span style={{ padding: '7px 13px', borderRadius: 10, background: T.violet, color: '#fff', fontFamily: FN, fontSize: 12.5, fontWeight: 800 }}>
                  {r.id === 'firstPrize' ? 'Cargar' : 'Activar'}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Acción del día a día */}
      {onScan && (
        <button type="button" onClick={onScan} style={{
          ...resetBtn, display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 18,
          background: T.violet, color: '#fff',
        }}>
          <QrCode size={28} strokeWidth={1.9} />
          <div>
            <div style={{ fontFamily: FN, fontSize: 16, fontWeight: 800 }}>Registrar la compra de un cliente</div>
            <div style={{ fontFamily: FI, fontSize: 13, color: '#FDE5E0' }}>Escaneá su QR para sumarle</div>
          </div>
        </button>
      )}
    </div>
  )
}

export default function MerchantSetupHome(props) {
  const { cfgPct } = props
  return cfgPct < SETUP_THRESHOLD ? <ClientPreview {...props} /> : <DailySummary {...props} />
}
