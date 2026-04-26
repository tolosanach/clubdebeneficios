'use client'
import { useEffect, useRef } from 'react'

// JsQrScanner — escáner QR basado en jsQR + getUserMedia + canvas + rAF.
//
// Reemplaza al de html5-qrcode porque en navegadores sin BarcodeDetector API
// (ej. iOS Safari, Firefox), el decoder JS interno (ZXing) falla con QRs
// mostrados en pantalla. jsQR es específico para QR y mucho más confiable.
//
// Props:
//  - onDecode(text): callback cuando se decodifica un QR
//  - onError(err):   callback opcional si la cámara falla
//  - active:         si false, no arranca la cámara (default true)
//
// Internamente:
//  - El <video> reproduce el stream
//  - El <canvas> oculto pinta cada frame y extrae ImageData
//  - jsQR procesa el ImageData; si encuentra un QR, dispara onDecode una sola vez
//  - Al desmontar, cancela el rAF loop y para los tracks del stream
export default function JsQrScanner({ onDecode, onError, active = true }) {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const rafRef      = useRef(null)
  const streamRef   = useRef(null)
  const decodedRef  = useRef(false)
  // Refs a los callbacks para no reiniciar la cámara cuando el caller pasa
  // funciones inline (que cambian de identidad en cada render).
  const onDecodeRef = useRef(onDecode)
  const onErrorRef  = useRef(onError)
  useEffect(() => { onDecodeRef.current = onDecode }, [onDecode])
  useEffect(() => { onErrorRef.current  = onError  }, [onError])

  useEffect(() => {
    if (!active) return
    let mounted = true
    decodedRef.current = false

    async function start() {
      try {
        let stream
        try {
          // Pedimos resolución alta — 640x480 es muy bajo para QRs en pantalla.
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width:  { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          })
        } catch {
          // Fallback sin constraints — el browser negocia la mejor disponible.
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }
        const t = stream.getVideoTracks()[0]
        const settings = t?.getSettings?.() || {}
        console.log('[JsQrScanner] resolución obtenida:', settings.width, 'x', settings.height)
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.setAttribute('playsinline', '')   // iOS sin pasar a fullscreen
        await video.play().catch(() => {})

        // jsQR — import dinámico para no inflar el bundle inicial.
        const jsQR = (await import('jsqr')).default

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        let attempts = 0
        const tick = () => {
          if (!mounted || decodedRef.current) return
          if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            rafRef.current = requestAnimationFrame(tick)
            return
          }
          canvas.width  = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
          attempts++

          // 1er intento: imagen original (jsQR maneja su propia binarización).
          let code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })

          // Si no detectó, intentamos con threshold manual fuerte. Útil cuando
          // la cámara reprodujo una pantalla y los tonos quedaron aplanados
          // (ej: webcam apuntando a otro monitor). Convertimos a blanco/negro
          // puro para forzar contraste máximo.
          if (!code) {
            const data = img.data
            // Calculamos brillo promedio para usar como umbral adaptativo
            let sum = 0
            for (let i = 0; i < data.length; i += 4) {
              sum += data[i] * 0.3 + data[i+1] * 0.59 + data[i+2] * 0.11
            }
            const avg = sum / (data.length / 4)
            for (let i = 0; i < data.length; i += 4) {
              const gray = data[i] * 0.3 + data[i+1] * 0.59 + data[i+2] * 0.11
              const v = gray > avg ? 255 : 0
              data[i] = data[i+1] = data[i+2] = v
            }
            code = jsQR(data, img.width, img.height, { inversionAttempts: 'attemptBoth' })
          }

          if (attempts % 60 === 0) {
            // Log del brillo medio para diagnosticar si la imagen está oscura/vacía
            let s = 0
            for (let i = 0; i < img.data.length; i += 4) s += img.data[i]
            const avgBrightness = Math.round(s / (img.data.length / 4))
            console.log('[JsQrScanner] intentos sin detectar:', attempts, 'frame:', canvas.width + 'x' + canvas.height, 'brillo medio (0-255):', avgBrightness)
          }
          if (code && code.data) {
            console.log('[JsQrScanner] QR detectado al intento', attempts, ':', code.data.slice(0, 60))
            decodedRef.current = true
            try { onDecodeRef.current?.(code.data) } catch {}
            return
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } catch (err) {
        if (mounted) {
          try { onErrorRef.current?.(err) } catch {}
        }
      }
    }

    start()

    return () => {
      mounted = false
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [active])

  return (
    <div style={{ position:'relative', width:'100%', aspectRatio:'1 / 1', background:'#000', overflow:'hidden' }}>
      <video ref={videoRef} muted playsInline autoPlay
        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
      {/* DEBUG: canvas visible en esquina abajo-derecha para ver qué procesa jsQR.
          Si la imagen acá se ve oscura/rara, el problema es la captura. */}
      <canvas ref={canvasRef}
        style={{ position:'absolute', bottom:8, right:8, width:160, height:90, border:'2px solid lime', zIndex:10, background:'#000' }} />
      {/* Viewfinder overlay — cuadrado con borde violeta + máscara semitransparente afuera */}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        <div style={{
          width:'70%', aspectRatio:'1 / 1',
          border:'3px solid rgba(189,75,248,0.85)',
          borderRadius:14,
          boxShadow:'0 0 0 9999px rgba(0,0,0,0.45)',
        }} />
      </div>
    </div>
  )
}
