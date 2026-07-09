// Color derivation utilities for commerce wallet cards

export const CARD_PALETTE = [
  '#C9A96E', // Dorado
  '#B8B8B8', // Plata
  '#A56F47', // Bronce
  '#D4A5A5', // Rosa Gold
  '#7D5C8A', // Púrpura
  '#2D3A5B', // Azul medianoche
  '#4A6B57', // Verde esmeralda
  '#3A3D42', // Grafito
]

// Paleta CURADA para el selector de color de tarjeta. TODOS estos colores
// pasan el test de contraste con texto BLANCO (luminancia ≤ ~0.26), así el
// dueño solo puede elegir colores que se ven bien — no hace falta corregir
// después. Cubre todo el espectro de tonos en versiones ricas/profundas.
export const SAFE_CARD_COLORS = [
  '#DC2626', // Rojo
  '#9F1239', // Vino
  '#BE185D', // Rosa
  '#DB2777', // Fucsia
  '#86198F', // Ciruela
  '#6D28D9', // Púrpura
  '#7C3AED', // Violeta de marca
  '#4338CA', // Índigo
  '#1D4ED8', // Azul
  '#0369A1', // Celeste
  '#0E7490', // Teal
  '#0F766E', // Esmeralda
  '#15803D', // Verde
  '#4D7C0F', // Oliva
  '#B45309', // Ámbar
  '#EA580C', // Naranja
  '#78350F', // Café
  '#1E293B', // Medianoche
]

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const mx = Math.max(rn, gn, bn), mn = Math.min(rn, gn, bn)
  let h = 0, s = 0
  const l = (mx + mn) / 2
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    if (mx === rn)      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (mx === gn) h = ((bn - rn) / d + 2) / 6
    else                h = ((rn - gn) / d + 4) / 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToHex({ h, s, l }) {
  const hn = h / 360, sn = s / 100, ln = l / 100
  if (sn === 0) {
    const v = Math.round(ln * 255).toString(16).padStart(2, '0')
    return `#${v}${v}${v}`
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const toHex = x => Math.round(hue2rgb(p, q, x) * 255).toString(16).padStart(2, '0')
  return `#${toHex(hn + 1 / 3)}${toHex(hn)}${toHex(hn - 1 / 3)}`
}

function luminanceOf(hex) {
  const { r, g, b } = hexToRgb(hex)
  const lin = c => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function darken(hex, amt) {
  const hsl = rgbToHsl(hexToRgb(hex))
  return hslToHex({ ...hsl, l: Math.max(0, hsl.l - amt) })
}

export function hashToCardColor(str) {
  let hash = 0
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }
  // Usamos la paleta CURADA (blanco-safe) también para el color "automático"
  // (cuando el dueño no eligió uno), así toda tarjeta se ve intencional.
  const idx = ((hash % SAFE_CARD_COLORS.length) + SAFE_CARD_COLORS.length) % SAFE_CARD_COLORS.length
  return SAFE_CARD_COLORS[idx]
}

// Umbral de luminancia máximo para el color de la tarjeta. Por encima de esto
// el blanco empieza a perder contraste. Elegimos 0.26 (un poco más exigente
// que el viejo 0.28) para que los títulos/saldo BLANCOS siempre se lean bien.
const LUM_CAP = 0.26

// Oscurece un color (manteniendo tono y saturación) hasta que su luminancia
// caiga bajo LUM_CAP. Así el usuario puede elegir CUALQUIER color: si es muy
// claro, lo bajamos de a poco hasta que el blanco encima quede legible. El
// tono se conserva — un amarillo claro se vuelve mostaza, no gris.
export function clampCardBase(hex) {
  let base = hex || '#7D5C8A'
  let guard = 0
  while (luminanceOf(base) > LUM_CAP && guard < 80) {
    base = darken(base, 2)
    guard++
  }
  return base
}

// Dado un TONO (0–360), devuelve el color de ese tono a la luminosidad que lo
// deja siempre legible con texto blanco. Recorre lightness y elige el que más
// se acerca a la luminancia objetivo. Es el motor del slider acotado: girás el
// tono y el control NUNCA puede producir un color ilegible.
export function hueToSafeColor(hue, sat = 68, targetLum = 0.145) {
  let best = null
  for (let L = 8; L <= 72; L++) {
    const hex = hslToHex({ h: hue, s: sat, l: L })
    const d = Math.abs(luminanceOf(hex) - targetLum)
    if (best === null || d < best.d) best = { d, hex }
  }
  return best.hex
}

// Extrae el tono (0–360) de un hex — para inicializar el slider desde el color
// guardado del comercio.
export function hexToHue(hex) {
  return Math.round(rgbToHsl(hexToRgb(hex || '#7C3AED')).h)
}

export function cardColors(baseHex) {
  // Clampeamos SIEMPRE el color al rango oscuro seguro. Consecuencia: toda la
  // app usa títulos, saldo y unidad en BLANCO — nunca texto negro. El número
  // de tarjeta es lo único apagado (un tono más oscuro del propio color).
  const base = clampCardBase(baseHex || '#7D5C8A')
  const hsl  = rgbToHsl(hexToRgb(base))

  const bg       = `linear-gradient(135deg, ${darken(base, 7)} 0%, ${base} 45%, ${darken(base, 13)} 100%)`
  // Info importante (logo/nombre/saldo/unidad/CTA) → blanco puro, siempre.
  const strong   = '#FFFFFF'
  const text     = '#FFFFFF'
  const textSub  = 'rgba(255,255,255,0.72)'
  // Número de tarjeta → un tono MÁS OSCURO del color de la tarjeta: presente
  // pero apagado frente a lo importante.
  const faint     = hslToHex({ h: hsl.h, s: Math.min(hsl.s + 8, 60), l: Math.max(4, hsl.l - 16) })
  const watermark = `hsla(${hsl.h | 0},${hsl.s | 0}%,90%,0.09)`
  const detail    = `hsla(${hsl.h | 0},${hsl.s | 0}%,88%,0.28)`
  const light     = false

  return { bg, text, textSub, watermark, detail, light, strong, faint }
}
