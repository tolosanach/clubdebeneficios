import { ImageResponse } from 'next/og'

// Open Graph image (1200x630). Se sirve cuando alguien comparte
// clufix.com.ar en WhatsApp, Twitter, Facebook, etc.
// Rebrand mayo 2026: violeta sólido + wordmark "Clufix" grande blanco
// + tagline. Sin gradient orange-fucsia, sin blobs rosa.
export const runtime = 'edge'
export const alt = 'Clufix — Tus beneficios. Un solo QR.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#6F30DF',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}>
        {/* Acentos sutiles del mismo violeta para darle profundidad sin
            romper la identidad sólida — el deep en la esquina superior
            izquierda y un highlight casi blanco en la inferior derecha
            para evitar que se sienta plano en redes sociales. */}
        <div style={{ position:'absolute', top:'-20%', left:'-10%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle, rgba(105,53,189,0.85) 0%, transparent 70%)', filter:'blur(60px)', display:'flex' }} />
        <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)', filter:'blur(60px)', display:'flex' }} />

        {/* Wordmark gigante. La "B" en bold reemplaza al cuadrado-icon
            del rebrand viejo — el wordmark mismo es el branding. */}
        <div style={{ fontSize:120, fontWeight:800, color:'#fff', letterSpacing:'-4px', lineHeight:1, textAlign:'center', marginBottom:24 }}>
          Clufix
        </div>

        {/* Tagline */}
        <div style={{ fontSize:30, color:'rgba(255,255,255,0.78)', textAlign:'center', letterSpacing:'-0.4px', maxWidth:780, padding:'0 40px' }}>
          Tus beneficios. Un solo QR.
        </div>

        {/* Badge URL */}
        <div style={{ display:'flex', marginTop:44, padding:'10px 28px', borderRadius:9999, border:'1.5px solid rgba(255,255,255,0.40)', background:'rgba(255,255,255,0.10)', fontSize:18, color:'rgba(255,255,255,0.85)', letterSpacing:'0.06em' }}>
          clufix.com.ar
        </div>
      </div>
    ),
    { ...size }
  )
}
