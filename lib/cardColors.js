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
  const idx = ((hash % CARD_PALETTE.length) + CARD_PALETTE.length) % CARD_PALETTE.length
  return CARD_PALETTE[idx]
}

export function cardColors(baseHex) {
  const base = baseHex || '#7D5C8A'
  const hsl  = rgbToHsl(hexToRgb(base))
  const lum  = luminanceOf(base)
  const light = lum > 0.28

  const bg       = `linear-gradient(135deg, ${darken(base, 7)} 0%, ${base} 45%, ${darken(base, 13)} 100%)`
  const text     = hslToHex({ h: hsl.h, s: Math.min(hsl.s + 8,  55), l: light ? 14 : 92 })
  const textSub  = hslToHex({ h: hsl.h, s: Math.min(hsl.s + 4,  38), l: light ? 30 : 70 })
  const watermark = `hsla(${hsl.h | 0},${hsl.s | 0}%,${light ? 12 : 90}%,0.09)`
  const detail    = `hsla(${hsl.h | 0},${hsl.s | 0}%,${light ? 12 : 88}%,0.28)`

  return { bg, text, textSub, watermark, detail, light }
}
