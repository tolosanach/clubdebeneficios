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
export default function JsQrScanner({ onDecode, onError, active = true, resetSignal = 0 }) {
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

  // Reset del lock decodedRef. El padre incrementa `resetSignal` cuando
  // un QR fue invalidado (ej: no es de un cliente Benefix) y quiere que
  // el scanner vuelva a procesar nuevas detecciones. El tick mantiene
  // el rAF loop vivo aunque decodedRef sea true, asi al setearlo en
  // false el siguiente frame ya empieza a procesar de nuevo.
  useEffect(() => {
    if (resetSignal === 0) return
    decodedRef.current = false
  }, [resetSignal])

  useEffect(() => {
    if (!active) return
    let mounted = true
    decodedRef.current = false

    async function start() {
      try {
        let stream
        try {
          // Pedimos resolución alta. El browser negocia con la cámara real.
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width:  { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.setAttribute('playsinline', '')
        await video.play().catch(() => {})

        const jsQR = (await import('jsqr')).default
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        const tick = () => {
          if (!mounted) return
          // Lockeado: ya decodificamos un QR; esperamos a que el padre
          // libere el lock via resetSignal para volver a procesar. Pero
          // mantenemos el rAF loop vivo (re-encolamos el siguiente frame)
          // porque sino, despues del primer scan, la camara queda muerta
          // y los QRs siguientes no se detectan.
          if (decodedRef.current) {
            rafRef.current = requestAnimationFrame(tick)
            return
          }
          if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            rafRef.current = requestAnimationFrame(tick)
            return
          }
          canvas.width  = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })
          if (code && code.data) {
            decodedRef.current = true
            try { onDecodeRef.current?.(code.data) } catch {}
            // Re-encolamos igual — el chequeo del primer if se ocupa de
            // no procesar mientras decodedRef siga true.
            rafRef.current = requestAnimationFrame(tick)
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
      <canvas ref={canvasRef} style={{ display:'none' }} />
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
