import { ImageResponse } from 'next/og'

// Icon dinámico de Next.js — runtime edge.
// Rebrand mayo 2026: violeta sólido #7131E1 + letra "B" blanca grande
// centrada (espejo del icon.svg estático). Sin gradient orange-fucsia.
// Para los PNGs de manifest se usa public/icons/icon-*.png generados
// con scripts/generate-icons.js — esto es el fallback dinámico que
// Next.js sirve cuando algún consumidor pide /icon directamente.
export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#7131E1',
        borderRadius: 115,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 380,
        fontWeight: 800,
        color: '#ffffff',
        letterSpacing: '-0.04em',
      }}>
        B
      </div>
    ),
    { ...size }
  )
}
