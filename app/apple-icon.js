import { ImageResponse } from 'next/og'

// Apple touch icon (180x180). iOS no aplica border-radius — usa la
// imagen full-bleed como app tile. Mantenemos el cuadrado violeta
// solido + letra "B" blanca grande, igual que icon.js pero sin
// borderRadius para que iOS no doble-redondee.
export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#7131E1',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 130,
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
