// Generador del portarretrato imprimible (13 × 18 cm) de cada comercio.
//
// Devuelve un SVG con TODO el texto convertido a curvas (no depende de
// tipografías instaladas) y helpers para sacar PNG (300 dpi) y PDF. Se usa
// desde /api/portaretrato. Corre solo en el server (Node): usa opentype.js
// para medir/trazar el texto, qrcode para la matriz del QR, sharp para
// rasterizar y pdf-lib para armar el PDF.
//
// Diseño fijo (igual para todos los comercios): coral de marca, fondo de
// estrellas infladas, nombre del negocio como protagonista, QR con esquinas de
// visor, tres pasos y firma Clufix abajo. Margen blanco de 3,5 mm y línea gris
// fina en el borde exacto de los 13 × 18 cm (guía de corte).

import * as opentype from 'opentype.js'
import QRCode from 'qrcode'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'
import { FONT_B64 } from './portaretrato-fonts'
import { LOGO_PATHS } from './portaretrato-logo'

// Los QR impresos tienen que apuntar SIEMPRE a producción, venga de donde
// venga el pedido (preview, localhost...). Mismo formato que el QR del panel.
export const PORTARETRATO_BASE_URL = 'https://www.clufix.com.ar'

const CORAL = '#E03E1B'
const CREAM = '#FFF6F0'
const SOFT  = '#FFD2C2'
const SPARK = '#FFE6DC'
const DARK  = '#B82E10'
const STAR  = '#E94F2D'

// ─── Fuentes ────────────────────────────────────────────────────────────────
let fontCache = null
function fonts() {
  if (fontCache) return fontCache
  fontCache = {}
  for (const w of Object.keys(FONT_B64)) {
    const buf = Buffer.from(FONT_B64[w], 'base64')
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    fontCache[w] = (opentype.parse ? opentype : opentype.default).parse(ab)
  }
  return fontCache
}

function glyphFor(font, ch) {
  const g = font.charToGlyph(ch)
  // Carácter que la fuente no tiene (emoji, alfabetos raros): lo reemplazo por espacio.
  if (!g || g.index === 0) return font.charToGlyph(' ')
  return g
}

export function textWidth(text, size, weight, spacing = 0) {
  const font = fonts()[weight]
  const sc = size / font.unitsPerEm
  const chars = Array.from(text)
  let w = 0
  for (const ch of chars) w += glyphFor(font, ch).advanceWidth * sc + spacing
  return Math.max(0, w - spacing)
}

// Serializo los comandos del trazo a mano: toPathData() de opentype.js 2.x
// devuelve NaN en algunas combinaciones de tamaño/posición.
const num = v => {
  const r = Math.round(v * 100) / 100
  return Object.is(r, -0) ? '0' : String(r)
}
function commandsToPath(commands) {
  let d = ''
  for (const c of commands) {
    if (c.type === 'M' || c.type === 'L') d += `${c.type}${num(c.x)} ${num(c.y)}`
    else if (c.type === 'Q') d += `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`
    else if (c.type === 'C') d += `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`
    else if (c.type === 'Z') d += 'Z'
  }
  return d
}

// Devuelve { d, size }: trazo SVG del texto, centrado en cx (o alineado a la
// derecha en cx si anchor='end'), reduciendo el tamaño si pasa de maxW.
export function textPath(text, size, cx, baseline, { weight = '700', spacing = 0, maxW = null, anchor = 'middle' } = {}) {
  const font = fonts()[weight]
  let s = size
  const w0 = textWidth(text, s, weight, spacing)
  if (maxW && w0 > maxW) s = size * (maxW / w0)
  const w = textWidth(text, s, weight, spacing)
  const sc = s / font.unitsPerEm
  let x = anchor === 'end' ? cx - w : anchor === 'start' ? cx : cx - w / 2
  let d = ''
  for (const ch of Array.from(text)) {
    const g = glyphFor(font, ch)
    d += commandsToPath(g.getPath(x, baseline, s).commands)
    x += g.advanceWidth * sc + spacing
  }
  return { d, size: s }
}

// ─── Nombre del negocio → una o dos líneas ──────────────────────────────────
// "Carolina Gutiérrez - peluquería y estética" → "Carolina Gutiérrez": lo que
// viene después de un guión/barra suele ser el rubro, que ya va debajo.
export function displayNameFor(rawName) {
  const base = String(rawName || '').split(/\s+[-–—|]\s+/)[0].trim()
  return base || String(rawName || '').trim() || 'Mi negocio'
}

function layoutName(name) {
  const words = name.split(/\s+/).filter(Boolean)
  const BIG = 235
  const MAXW = 1120
  const oneLineSize = Math.min(BIG, BIG * (MAXW / textWidth(name, BIG, '800', -6)))
  if (words.length < 2 || oneLineSize >= 170) {
    return { lines: [name], size: oneLineSize, baselines: [435], subY: 515, spacing: -6 }
  }
  // Dos líneas: busco el corte que deja las líneas más parejas.
  let best = null
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    const m = Math.max(textWidth(a, 150, '800', -3), textWidth(b, 150, '800', -3))
    if (!best || m < best.m) best = { a, b, m }
  }
  const size = Math.min(150, 150 * (MAXW / best.m))
  return { lines: [best.a, best.b], size, baselines: [345, 487], subY: 568, spacing: -3 }
}

// ─── Decoración: estrella "inflada" (brazos gordos, puntas redondeadas) ─────
export function starPath(cx, cy, R, rotDeg) {
  const r = R * 0.55
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = ((rotDeg + i * 36) * Math.PI) / 180
    const rr = i % 2 === 0 ? R : r
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
  }
  const n = pts.length
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
  let d = ''
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n]
    const k = i % 2 === 0 ? 0.30 : 0.20
    const s1 = lerp(p1, p0, k), e1 = lerp(p1, p2, k)
    d += `${i === 0 ? 'M' : 'L'}${s1[0].toFixed(1)},${s1[1].toFixed(1)} Q${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${e1[0].toFixed(1)},${e1[1].toFixed(1)} `
  }
  return d + 'Z'
}

// ─── QR ─────────────────────────────────────────────────────────────────────
function qrSvgInner(url) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const data = qr.modules.data
  const Q = 2 // zona de silencio propia; alrededor hay además el marco crema
  let d = ''
  for (let y = 0; y < n; y++) {
    let x = 0
    while (x < n) {
      if (data[y * n + x]) {
        let run = 1
        while (x + run < n && data[y * n + x + run]) run++
        d += `M${x + Q} ${y + Q}h${run}v1h-${run}z`
        x += run
      } else x++
    }
  }
  const size = n + Q * 2
  return { size, body: `<rect width="${size}" height="${size}" fill="#fff"/><path fill="#000" d="${d}"/>` }
}

// ─── SVG completo ───────────────────────────────────────────────────────────
/**
 * @param {{ name: string, categories?: string[], slug: string }} commerce
 * @returns {string} SVG (13 cm × 18 cm) con el texto en curvas
 */
export function buildPortaretratoSvg({ name, categories = [], slug }) {
  const url = `${PORTARETRATO_BASE_URL}/club/${slug}?from_qr=1`
  const shown = displayNameFor(name)
  const L = layoutName(shown)
  const cats = (Array.isArray(categories) ? categories : []).filter(Boolean).slice(0, 3)
  const sub = cats.length ? cats.join(' · ').toUpperCase() : ''

  const W = 1300, HA = 1828 // lienzo del arte (se encaja con margen en 1300 × 1800)
  const qs = 600, qy = 690, qx = (W - qs) / 2
  const q = qrSvgInner(url)

  const stars = [[1120, 230, 230, -80], [150, 640, 160, -100], [1170, 1010, 120, -70], [170, 1250, 210, -85]]
    .map(([cx, cy, R, rot]) => `<path d="${starPath(cx, cy, R, rot)}" fill="${STAR}"/>`).join('')

  const pill = textPath('SUMÁ CON CLUFIX', 28, 650, 129, { weight: '700', spacing: 5 })
  let nameSvg = ''
  L.lines.forEach((ln, i) => {
    const t = textPath(ln, L.lines.length === 1 ? 235 : 150, 650, L.baselines[i], { weight: '800', spacing: L.spacing, maxW: 1120 })
    nameSvg += `<path fill="${CREAM}" d="${t.d}"/>`
  })
  const subSvg = sub
    ? `<path fill="${SOFT}" d="${textPath(sub, 30, 650, L.subY, { weight: '700', spacing: 6, maxW: 1100 }).d}"/>`
    : ''

  const off = 56
  const brackets = `<g fill="none" stroke="${CREAM}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
<path d="M${qx - off} ${qy - 10} V${qy - off} H${qx - 10}"/><path d="M${qx + qs + 10} ${qy - off} H${qx + qs + off} V${qy - 10}"/>
<path d="M${qx - off} ${qy + qs + 10} V${qy + qs + off} H${qx - 10}"/><path d="M${qx + qs + 10} ${qy + qs + off} H${qx + qs + off} V${qy + qs + 10}"/></g>`

  const cy = 1470
  let steps = ''
  ;[[250, 'Escaneá'], [650, 'Acumulá'], [1050, 'Canjeá']].forEach(([x, label], i) => {
    if (i < 2) steps += `<line x1="${x + 75}" y1="${cy}" x2="${x + 325}" y2="${cy}" stroke="${CREAM}" stroke-opacity=".55" stroke-width="5" stroke-dasharray="2 16" stroke-linecap="round"/>`
    steps += `<circle cx="${x}" cy="${cy}" r="52" fill="${CREAM}"/>`
    steps += `<path fill="${CORAL}" d="${textPath(String(i + 1), 64, x, cy + 22, { weight: '800' }).d}"/>`
    steps += `<path fill="${CREAM}" d="${textPath(label, 44, x, cy + 112, { weight: '700', spacing: 1 }).d}"/>`
  })

  const logo = LOGO_PATHS.map(p =>
    `<path fill="${p.spark ? SPARK : '#FFFFFF'}" fill-rule="evenodd" clip-rule="evenodd" d="${p.d}"/>`).join('')
  const url2 = textPath('www.clufix.com.ar', 46, 1170, 1734, { weight: '700', spacing: 2, anchor: 'end' })

  const art = `<rect width="${W}" height="${HA}" fill="${CORAL}"/>
${stars}
<rect x="365" y="84" width="570" height="68" rx="34" fill="none" stroke="${CREAM}" stroke-width="3.5"/>
<path fill="${CREAM}" d="${pill.d}"/>
${nameSvg}
${subSvg}
<rect x="${qx - 34}" y="${qy - 34}" width="${qs + 68}" height="${qs + 68}" rx="36" fill="${CREAM}"/>
<rect x="${qx}" y="${qy}" width="${qs}" height="${qs}" rx="6" fill="#fff"/>
<svg x="${qx}" y="${qy}" width="${qs}" height="${qs}" viewBox="0 0 ${q.size} ${q.size}" shape-rendering="crispEdges">${q.body}</svg>
${brackets}
${steps}
<path d="M0 1632 Q 650 1592 1300 1632 V${HA} H0 Z" fill="${DARK}"/>
<g transform="translate(130,1646) scale(0.44)">${logo}</g>
<path fill="${CREAM}" d="${url2.d}"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1300 1800" width="13cm" height="18cm">
<rect width="1300" height="1800" fill="#FFFFFF"/>
<svg x="35" y="35" width="1230" height="1730" viewBox="0 0 ${W} ${HA}" overflow="hidden">
${art}
</svg>
<rect x="0.5" y="0.5" width="1299" height="1799" fill="none" stroke="#B5B5B5" stroke-width="1"/>
</svg>`
}

// ─── Salidas ────────────────────────────────────────────────────────────────
// PNG a `dpi` (300 → 1535 × 2125 px, listo para imprimir a 13 × 18 cm).
export async function portaretratoPng(commerce, dpi = 300) {
  const wpx = Math.round((13 / 2.54) * dpi)
  const hpx = Math.round((18 / 2.54) * dpi)
  // Rasterizo el SVG a tamaño exacto en píxeles (en el SVG las medidas van en cm).
  const svg = buildPortaretratoSvg(commerce).replace('width="13cm" height="18cm"', `width="${wpx}" height="${hpx}"`)
  return sharp(Buffer.from(svg), { density: 72 })
    .png()
    .withMetadata({ density: dpi })
    .toBuffer()
}

// PDF de una página de 13 × 18 cm con la imagen a 400 dpi.
export async function portaretratoPdf(commerce) {
  const png = await portaretratoPng(commerce, 400)
  const pdf = await PDFDocument.create()
  const pw = (13 / 2.54) * 72
  const ph = (18 / 2.54) * 72
  const page = pdf.addPage([pw, ph])
  const img = await pdf.embedPng(png)
  page.drawImage(img, { x: 0, y: 0, width: pw, height: ph })
  pdf.setTitle(`Portarretrato Clufix — ${displayNameFor(commerce.name)}`)
  pdf.setProducer('Clufix')
  return Buffer.from(await pdf.save())
}

