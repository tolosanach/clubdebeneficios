// Kit de difusión: piezas para que el dueño promocione su club en redes.
//
//   launch → historia 1080×1920 "Ya tenemos club"
//   promo  → historia 1080×1920 de una promo vigente
//   prize  → historia 1080×1920 "Nuevo premio" / "Premio del catálogo"
//   post   → post cuadrado 1080×1080 para el feed
//   sticker→ sticker redondo con QR (físico, para vidriera)
//
// Mismo motor que el portarretrato: SVG con el texto convertido a curvas
// (así no depende de fuentes del servidor) rasterizado con sharp.
// Las piezas digitales NO llevan QR (nadie puede escanear su propia pantalla):
// reservan un recuadro para el sticker "Enlace" de Instagram.

import QRCode from 'qrcode'
import sharp from 'sharp'
import { textPath, textWidth, starPath, displayNameFor, PORTARETRATO_BASE_URL } from './portaretrato'
import { LOGO_PATHS, LOGO_W, LOGO_H } from './portaretrato-logo'

const CORAL = '#E03E1B'
const CREAM = '#FFF6F0'
const SOFT  = '#FFD2C2'
const SPARK = '#FFE6DC'
const DARK  = '#B82E10'
const STAR  = '#E94F2D'
const INK   = '#2A140D'
export const IG_HANDLE = '@clufix.ar'

export const PIECES = ['launch', 'promo', 'prize', 'post', 'sticker']

export function clubUrl(slug) {
  return `${PORTARETRATO_BASE_URL}/club/${slug}`
}

// ─── Primitivas ─────────────────────────────────────────────────────────────
const stars = list => list.map(([x, y, R, r]) => `<path d="${starPath(x, y, R, r)}" fill="${STAR}"/>`).join('')

// Texto en curvas. Devuelve <path>. `baseline` = línea de base.
function tx(text, size, cx, baseline, { weight = '700', spacing = 0, maxW = 960, fill = '#fff', opacity = 1, anchor = 'middle' } = {}) {
  const { d } = textPath(text, size, cx, baseline, { weight, spacing, maxW, anchor })
  return `<path d="${d}" fill="${fill}"${opacity !== 1 ? ` fill-opacity="${opacity}"` : ''}/>`
}
// Tamaño efectivo tras el ajuste a maxW (para centrar verticalmente).
function fitSize(text, size, weight, spacing, maxW) {
  const w = textWidth(text, size, weight, spacing)
  return w > maxW ? size * (maxW / w) : size
}

function logo(x, y, w) {
  const s = w / LOGO_W
  return `<g transform="translate(${x},${y}) scale(${s})" fill-rule="evenodd" clip-rule="evenodd">${LOGO_PATHS.map(p => `<path d="${p.d}" fill="${p.spark ? SPARK : '#fff'}"/>`).join('')}</g>`
}

const bg = (w, h) => `<rect width="${w}" height="${h}" fill="${CORAL}"/>`
const storyDeco = stars([[960, 420, 260, -80], [80, 980, 190, -100], [1000, 1300, 150, -70], [120, 1560, 230, -85]])

function pill(cx, y, label, { w = null } = {}) {
  const tw = textWidth(label, 34, '700', 6)
  const pw = w || Math.round(tw + 120)
  return `<rect x="${cx - pw / 2}" y="${y}" width="${pw}" height="84" rx="42" fill="none" stroke="#fff" stroke-width="4"/>` +
    tx(label, 34, cx, y + 56, { weight: '700', spacing: 6, maxW: pw - 60 })
}

// Pie: logo | @clufix.ar centrado, medido con el ancho real del texto.
function footer(y, cx = 540, scale = 1) {
  const lw = 140 * scale, gap = 34 * scale, fs = 38 * scale
  const tw = textWidth(IG_HANDLE, fs, '700')
  const total = lw + gap + 3 + gap + tw
  const x0 = cx - total / 2
  const lh = (lw * LOGO_H) / LOGO_W
  return logo(x0, y, lw) +
    `<rect x="${x0 + lw + gap}" y="${y + lh / 2 - 28 * scale}" width="3" height="${56 * scale}" rx="1.5" fill="#fff" fill-opacity=".6"/>` +
    tx(IG_HANDLE, fs, x0 + lw + gap + 3 + gap, y + lh / 2 + 13 * scale, { weight: '700', anchor: 'start', maxW: null })
}

// Recuadro del sticker "Enlace" de Instagram.
function slot(cx, y, w, h) {
  return `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="5" stroke-dasharray="20 14" stroke-linecap="round"/>` +
    tx('PEGÁ ACÁ EL LINK DE TU CLUB', 36, cx, y + h / 2 + 13, { weight: '800', spacing: 3, maxW: w - 70 })
}

// Pasos en tarjeta crema.
function steps(cx, y, w, rowH, fs) {
  const h = rowH * 3 + 44, x = cx - w / 2
  const rows = ['Tocá el enlace', 'Creá tu cuenta en 10 segundos', 'Sumá puntos en cada compra']
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="40" fill="${CREAM}"/>`
  rows.forEach((t, k) => {
    const cy = y + 22 + rowH * k + rowH / 2, r = rowH * 0.3
    out += `<circle cx="${x + 44 + r}" cy="${cy}" r="${r}" fill="${CORAL}"/>` +
      tx(String(k + 1), fs * 0.95, x + 44 + r, cy + fs * 0.34, { weight: '800' }) +
      tx(t, fs, x + 44 + r * 2 + 26, cy + fs * 0.34, { weight: '700', fill: INK, anchor: 'start', maxW: w - (44 + r * 2 + 26) - 36 })
  })
  return out
}

// Nombre grande, centrado verticalmente en la banda [top, bottom].
function bigName(name, cx, top, bottom, size, maxW = 940) {
  const s = fitSize(name, size, '800', -6, maxW)
  const base = (top + bottom) / 2 + s * 0.35
  return tx(name, size, cx, base, { weight: '800', spacing: -6, maxW })
}

const svgWrap = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`

// ─── Textos ─────────────────────────────────────────────────────────────────
const DAYS_ES = { monday: 'lunes', tuesday: 'martes', wednesday: 'miércoles', thursday: 'jueves', friday: 'viernes', saturday: 'sábados', sunday: 'domingos' }
const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function daysText(days) {
  const names = DAYS_ORDER.filter(d => (days || []).includes(d)).map(d => DAYS_ES[d])
  if (!names.length || names.length === 7) return 'Todos los días'
  if (names.length === 1) return `Los ${names[0]}`
  const txt = `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

// "Válido hasta el 31/10": solo si la promo tiene una fecha fija cargada.
// Las relativas ("X días desde que te sumás") no muestran nada.
export function promoExpiryText(promo) {
  if (!promo || promo.expiration_type === 'relative' || !promo.expires_at) return null
  const d = new Date(promo.expires_at)
  if (isNaN(d)) return null
  // Fecha en Argentina (UTC-3): el vencimiento se guarda a las 23:59:59 locales.
  const ar = new Date(d.getTime() - 3 * 3600 * 1000)
  const dd = String(ar.getUTCDate()).padStart(2, '0')
  const mm = String(ar.getUTCMonth() + 1).padStart(2, '0')
  return `Válido hasta el ${dd}/${mm}`
}

export function whatsappText({ name, slug, kind = 'launch', promo, prize, unit = 'estrellas' }) {
  const n = displayNameFor(name)
  const url = clubUrl(slug)
  if (kind === 'promo' && promo) {
    const what = promo.type === 'double_points'
      ? `${unit} dobles (×2)`
      : `${promo.value}% OFF en tu próxima visita`
    const exp = promoExpiryText(promo)
    return `¡Nueva promo en ${n}! 🎉\n${what}${exp ? ` · ${exp.replace('Válido', 'válido')}` : ''}.\nSumate gratis a nuestro club y aprovechala 👇\n${url}`
  }
  if (kind === 'prize' && prize) {
    return `¡Nuevo premio en ${n}! 🎁\n${prize.name}. Se canjea con tus ${unit}.\nSumate gratis al club 👇\n${url}`
  }
  return `¡Ya tenemos club de beneficios! 🎁\nSumá puntos con cada compra en ${n} y canjeá premios. Es gratis y se hace en 10 segundos.\n👉 ${url}`
}

const unitOf = progType => (progType === 'points' ? 'puntos' : 'estrellas')

// ─── Piezas ─────────────────────────────────────────────────────────────────
function launchSvg({ name }) {
  return svgWrap(1080, 1920, `${bg(1080, 1920)}${storyDeco}
${pill(540, 286, 'YA TENEMOS CLUB')}
${bigName(name, 540, 400, 640, 230)}
${tx('Sumá puntos con cada compra', 54, 540, 722, { weight: '700' })}
${tx('y canjeá premios', 54, 540, 790, { weight: '700' })}
${steps(540, 880, 820, 104, 40)}
${slot(540, 1286, 820, 110)}
${footer(1470)}`)
}

function promoSvg({ name, promo, progType }) {
  const unit = unitOf(progType).toUpperCase()
  const exp = promoExpiryText(promo)
  const isDouble = promo.type === 'double_points'
  const nm = displayNameFor(name)
  let head, sub1, sub2
  if (isDouble) {
    head = [tx('×2', 340, 540, 663, { weight: '800', spacing: -10 }), tx(unit, 96, 540, 776, { weight: '800', spacing: 6 })].join('')
    sub1 = `${daysText(promo.days)} en ${nm}`
  } else {
    const v = `${promo.value}%`
    head = [tx(v, 330, 540, 650, { weight: '800', spacing: -10, maxW: 820 }), tx('OFF', 96, 540, 776, { weight: '800', spacing: 6 })].join('')
    sub1 = `en tu próxima visita a ${nm}`
  }
  sub2 = exp
  const subs = tx(sub1, 50, 540, 860, { weight: '600', opacity: 0.95 }) + (sub2 ? tx(sub2, 32, 540, 912, { weight: '600', opacity: 0.8 }) : '')
  // Sin vencimiento: los pasos suben un poco para no dejar un hueco.
  const stepsY = sub2 ? 956 : 930
  const slotY = sub2 ? 1322 : 1296
  const footY = sub2 ? 1474 : 1448
  return svgWrap(1080, 1920, `${bg(1080, 1920)}${storyDeco}
${pill(540, 286, 'ESTA SEMANA')}
${head}${subs}
${steps(540, stepsY, 820, 96, 38)}
${slot(540, slotY, 820, 110)}
${footer(footY)}`)
}

function giftArt(cx, cy, u) {
  return `<g transform="translate(${cx},${cy}) scale(${u})"><rect x="-120" y="-20" width="240" height="150" rx="14" fill="${CORAL}"/><rect x="-136" y="-70" width="272" height="64" rx="14" fill="#F0603A"/><rect x="-20" y="-70" width="40" height="200" fill="${SPARK}"/><path d="M0,-70 C-30,-130 -110,-130 -90,-84 C-80,-66 -30,-70 0,-70Z" fill="${SPARK}"/><path d="M0,-70 C30,-130 110,-130 90,-84 C80,-66 30,-70 0,-70Z" fill="${SPARK}"/></g>`
}

async function prizeImageData(url) {
  if (!url) return null
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 6000)
    const res = await fetch(url, { signal: ctl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const png = await sharp(buf).rotate().resize(440, 440, { fit: 'cover' }).png().toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch { return null }
}

async function prizeSvg({ name, prize, progType }) {
  const nm = displayNameFor(name)
  const recent = prize.created_at && (Date.now() - new Date(prize.created_at).getTime()) < 28 * 86400000
  const label = recent ? 'NUEVO PREMIO' : 'PREMIO DEL CATÁLOGO'
  const isPoints = (prize.system_type || progType) === 'points'
  const cost = Number(prize.cost) || 0
  const costTxt = isPoints ? `${cost} puntos` : `${cost} ${cost === 1 ? 'estrella' : 'estrellas'}`
  const img = await prizeImageData(prize.img_url)
  const art = img
    ? `<defs><clipPath id="pz"><rect x="320" y="410" width="440" height="440" rx="48"/></clipPath></defs><image href="${img}" x="320" y="410" width="440" height="440" clip-path="url(#pz)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="320" y="410" width="440" height="440" rx="48" fill="${CREAM}"/>${giftArt(540, 630, 1.0)}`
  const costW = Math.max(320, Math.round(textWidth(costTxt, 50, '800') + 90))
  return svgWrap(1080, 1920, `${bg(1080, 1920)}${storyDeco}
${pill(540, 286, label)}
${art}
${tx(prize.name || 'Premio', 84, 540, 950, { weight: '800', maxW: 940 })}
<rect x="${540 - costW / 2}" y="990" width="${costW}" height="92" rx="46" fill="#fff"/>${tx(costTxt, 50, 540, 1052, { weight: '800', fill: CORAL, maxW: costW - 50 })}
${tx(`Ya lo podés canjear en ${nm}`, 44, 540, 1160, { weight: '600', opacity: 0.95 })}
${slot(540, 1286, 820, 110)}
${footer(1470)}`)
}

function postSvg({ name }) {
  return svgWrap(1080, 1080, `${bg(1080, 1080)}${stars([[940, 130, 190, -80], [50, 760, 140, -100], [1020, 880, 110, -70]])}
<rect x="235" y="140" width="610" height="80" rx="40" fill="none" stroke="#fff" stroke-width="4"/>${tx('YA TENEMOS CLUB', 32, 540, 194, { weight: '700', spacing: 6 })}
${bigName(name, 540, 250, 480, 200)}
${tx('Sumá puntos en cada compra', 48, 540, 544, { weight: '700' })}
${tx('y canjeá premios', 48, 540, 604, { weight: '700' })}
<rect x="280" y="680" width="520" height="100" rx="50" fill="#fff"/>${tx('Link en la bio', 40, 540, 744, { weight: '800', fill: CORAL })}
${tx('Es gratis y se hace en 10 segundos', 34, 540, 850, { weight: '600', opacity: 0.9 })}
<path d="M0 968 Q 540 933 1080 968 V1080 H0 Z" fill="${DARK}"/>${footer(986, 540, 1.0)}`)
}

function qrCard(cx, y, size, url) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' })
  const N = qr.modules.size, M = qr.modules.data
  const pad = 34, x = cx - size / 2, q = 2, u = size / (N + q * 2)
  let rects = ''
  for (let r = 0; r < N; r++) {
    let c = 0
    while (c < N) {
      if (M[r * N + c]) {
        let e = c
        while (e < N && M[r * N + e]) e++
        rects += `<rect x="${(x + (c + q) * u).toFixed(2)}" y="${(y + (r + q) * u).toFixed(2)}" width="${((e - c) * u + 0.3).toFixed(2)}" height="${(u + 0.3).toFixed(2)}"/>`
        c = e
      } else c++
    }
  }
  const L = 70, sw = 9, o = pad + 14
  return `<rect x="${x - pad}" y="${y - pad}" width="${size + pad * 2}" height="${size + pad * 2}" rx="${size * 0.06}" fill="${CREAM}"/><g fill="#111">${rects}</g>
<g stroke="${SOFT}" stroke-width="${sw}" fill="none" stroke-linecap="round">
<path d="M${x - o},${y - pad + L}V${y - o}H${x - o + L}"/><path d="M${x + size + o - L},${y - o}H${x + size + o}V${y - pad + L}"/>
<path d="M${x - o},${y + size + pad - L}V${y + size + o}H${x - o + L}"/><path d="M${x + size + o - L},${y + size + o}H${x + size + o}V${y + size + pad - L}"/></g>`
}

function stickerSvg({ slug }) {
  const url = `${clubUrl(slug)}?from_qr=1`
  return svgWrap(800, 800, `<defs><clipPath id="c"><circle cx="400" cy="400" r="392"/></clipPath></defs>
<circle cx="400" cy="400" r="396" fill="${CORAL}"/><g clip-path="url(#c)">${stars([[690, 150, 150, -80], [110, 640, 120, -100]])}</g>
<circle cx="400" cy="400" r="368" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="2 16" stroke-linecap="round"/>
${tx('SUMÁ PUNTOS ACÁ', 40, 400, 180, { weight: '800', spacing: 6, maxW: 430 })}
${qrCard(400, 252, 260, url)}
${tx('ESCANEÁ CON TU CELU', 32, 400, 616, { weight: '700', spacing: 5 })}${logo(325, 660, 150)}`)
}

// ─── Salida ─────────────────────────────────────────────────────────────────
/**
 * @param {string} piece  launch | promo | prize | post | sticker
 * @param {{ commerce: {name,slug,prog_type}, promo?: object, prize?: object }} ctx
 * @returns {Promise<{ png: Buffer, filename: string }>}
 */
export async function renderPiece(piece, { commerce, promo, prize }) {
  const name = displayNameFor(commerce.name)
  const progType = commerce.prog_type
  let svg, w
  if (piece === 'promo') { svg = promoSvg({ name, promo, progType }); w = 1080 }
  else if (piece === 'prize') { svg = await prizeSvg({ name: commerce.name, prize, progType }); w = 1080 }
  else if (piece === 'post') { svg = postSvg({ name }); w = 1080 }
  else if (piece === 'sticker') { svg = stickerSvg({ slug: commerce.slug }); w = 800 }
  else { svg = launchSvg({ name }); w = 1080 }
  const png = await sharp(Buffer.from(svg), { density: 72 }).png().toBuffer()
  const slug = String(commerce.slug || 'club').toLowerCase()
  const label = { launch: 'historia-lanzamiento', promo: 'historia-promo', prize: 'historia-premio', post: 'post', sticker: 'sticker-qr' }[piece] || piece
  return { png, filename: `clufix-${label}-${slug}.png` }
}
