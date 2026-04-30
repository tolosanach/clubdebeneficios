'use client'

// LogoCropper + utilidades de logo crop. Extraído de app/page.js para que
// pueda usarse tanto desde el accordion de Configuración como desde el
// ProfileItemWizard. La lógica funcional es idéntica a la versión vieja.

import { useCallback, useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'

const G  = 'linear-gradient(135deg, #FE5000, #BD4BF8)'
const FN = "'Space Grotesk', system-ui, sans-serif"
const C = {
  white: '#FFFFFF', pearl: '#F0EAFF', mist: '#9B85CC',
  rim: 'rgba(255,255,255,0.10)',
}

// Validaciones de archivos de imagen (tamaño + formato).
export function validateImageFile(file) {
  if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type))
    return 'Formato no válido. Usá JPG, PNG o WEBP.'
  if (file.size > 5 * 1024 * 1024)
    return 'La imagen es muy grande. Máximo 5MB.'
  return null
}

// Validación deliberadamente laxa: solo exige que el lado MÁS LARGO sea
// de al menos 400px. Antes era el lado más corto ≥ 400, lo que rechazaba
// imágenes con proporción rara (ej: 1500×300 logos panorámicos) que el
// LogoCropper justamente puede arreglar via makeSquareWithPadding.
export function checkImageDimensions(file) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const longestSide = Math.max(img.naturalWidth, img.naturalHeight)
      resolve(longestSide >= 400 ? null : 'La imagen es muy chica. Necesitamos al menos 400 px en su lado más largo.')
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

function _createCropImage(url) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => res(img)
    img.onerror = rej
    img.src = url
  })
}

export async function getCroppedBlob(imageSrc, pixelCrop, outputSize = 512) {
  const image  = await _createCropImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  // Limpiamos el canvas a transparente. Si el pixelCrop pisa zonas fuera de
  // la imagen original (caso "fit con padding" para logos de proporciones
  // extremas), esas zonas quedan transparentes en el output.
  ctx.clearRect(0, 0, outputSize, outputSize)
  // Clamp del source rect a las dimensiones reales de la imagen.
  const sx = Math.max(0, pixelCrop.x)
  const sy = Math.max(0, pixelCrop.y)
  const sw = Math.min(image.width  - sx, pixelCrop.x + pixelCrop.width  - sx)
  const sh = Math.min(image.height - sy, pixelCrop.y + pixelCrop.height - sy)
  if (sw > 0 && sh > 0) {
    const scale = outputSize / pixelCrop.width
    const dx = (sx - pixelCrop.x) * scale
    const dy = (sy - pixelCrop.y) * scale
    const dw = sw * scale
    const dh = sh * scale
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
  }
  const px = ctx.getImageData(0, 0, outputSize, outputSize).data
  let hasAlpha = false
  for (let i = 3; i < px.length; i += 4) { if (px[i] < 255) { hasAlpha = true; break } }
  const fmt = hasAlpha ? 'image/png' : 'image/jpeg'
  const blob = await new Promise(res => canvas.toBlob(res, fmt, hasAlpha ? 1 : 0.85))
  if (!hasAlpha && blob.size > 200 * 1024)
    return await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.75))
  return blob
}

// Pre-procesamiento de imágenes con proporción extrema: genera un dataURL
// cuadrado con la imagen centrada y el resto en transparente. Sirve para
// logos panorámicos (ej "abba SEGURIDAD" 1800×500) que sin esto quedan
// recortados al centro.
export async function makeSquareWithPadding(imageSrc) {
  const img = await _createCropImage(imageSrc)
  const w = img.naturalWidth, h = img.naturalHeight
  const ratio = w / h
  // Si ya es ~cuadrada, no hacemos nada — devolvemos la original sin tocar.
  if (ratio >= 0.85 && ratio <= 1.15) return { src: imageSrc, padded: false }
  const size = Math.max(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, size, size)
  const dx = (size - w) / 2
  const dy = (size - h) / 2
  ctx.drawImage(img, dx, dy, w, h)
  return { src: canvas.toDataURL('image/png'), padded: true }
}

// ─── LOGO CROPPER MODAL ────────────────────────────────────────────────────────
export default function LogoCropper({ imageSrc, onSave, onCancel }) {
  const [crop,      setCrop]      = useState({ x:0, y:0 })
  const [zoom,      setZoom]      = useState(1)
  const [pixelCrop, setPixelCrop] = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [processedSrc, setProcessedSrc] = useState(null)
  const [wasPadded,    setWasPadded]    = useState(false)

  useEffect(() => {
    let cancelled = false
    setProcessedSrc(null)
    makeSquareWithPadding(imageSrc).then(({ src, padded }) => {
      if (cancelled) return
      setProcessedSrc(src)
      setWasPadded(padded)
      setCrop({ x:0, y:0 })
      setZoom(1)
    }).catch(() => { if (!cancelled) setProcessedSrc(imageSrc) })
    return () => { cancelled = true }
  }, [imageSrc])

  const onCropComplete = useCallback((_, px) => setPixelCrop(px), [])

  async function handleSave() {
    if (!pixelCrop || !processedSrc) return
    setSaving(true)
    try { onSave(await getCroppedBlob(processedSrc, pixelCrop)) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.94)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:480, marginBottom:14 }}>
        <div style={{ fontFamily:FN, fontSize:17, fontWeight:800, color:C.white, marginBottom:4 }}>Ajustá tu logo</div>
        <div style={{ fontSize:12, color:C.mist, lineHeight:1.5 }}>
          {wasPadded
            ? 'Tu logo no era cuadrado, lo encuadramos automáticamente con bordes transparentes. Igual podés mover y zoom.'
            : 'Arrastrá y hacé zoom para encuadrar. Todos los logos son cuadrados.'}
        </div>
      </div>
      <div style={{ width:'100%', maxWidth:480, aspectRatio:'1/1', position:'relative', borderRadius:16, overflow:'hidden', background:'#111', border:`1px solid ${C.rim}` }}>
        {processedSrc && (
          <Cropper
            image={processedSrc} crop={crop} zoom={zoom} aspect={1}
            cropShape="rect" showGrid={false} restrictPosition
            onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius:16 },
              cropAreaStyle: { border:'2px solid rgba(139,92,246,0.85)', borderRadius:10, boxShadow:'0 0 0 9999px rgba(0,0,0,0.55)' },
            }}
          />
        )}
        {!processedSrc && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:C.mist, fontSize:12 }}>
            Procesando imagen…
          </div>
        )}
      </div>
      <div style={{ width:'100%', maxWidth:480, marginTop:16, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:12, color:C.mist }}>−</span>
        <input type="range" min={1} max={3} step={0.01} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          style={{ flex:1, accentColor:'#8B5CF6', cursor:'pointer', height:4 }} />
        <span style={{ fontSize:12, color:C.mist }}>+</span>
      </div>
      <div style={{ width:'100%', maxWidth:480, display:'flex', gap:10, marginTop:18 }}>
        <button onClick={onCancel} disabled={saving}
          style={{ flex:1, padding:'13px', borderRadius:12, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.rim}`, color:C.pearl, fontSize:13, fontFamily:FN, fontWeight:600, cursor:'pointer' }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving || !pixelCrop}
          style={{ flex:2, padding:'13px', borderRadius:12, background:G, border:'none', color:'#fff', fontSize:13, fontFamily:FN, fontWeight:700, cursor:saving?'default':'pointer', opacity:saving||!pixelCrop?.7:1 }}>
          {saving ? 'Guardando…' : 'Guardar logo'}
        </button>
      </div>
    </div>
  )
}
