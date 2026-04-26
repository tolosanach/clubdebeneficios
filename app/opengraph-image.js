import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Benefix — Tus beneficios. Un solo QR.'
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
          background: 'linear-gradient(135deg, #0D0818 0%, #1a0d2e 40%, #2d0a4e 70%, #1a0530 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}>
        {/* Purple blob */}
        <div style={{ position:'absolute', top:'-15%', left:'-8%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.55) 0%, transparent 70%)', filter:'blur(60px)', display:'flex' }} />
        {/* Pink blob */}
        <div style={{ position:'absolute', bottom:'-15%', right:'-8%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.45) 0%, transparent 70%)', filter:'blur(60px)', display:'flex' }} />

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:96, height:96, borderRadius:24, background:'linear-gradient(135deg, #FE5000, #BD4BF8)', marginBottom:32, boxShadow:'0 16px 48px rgba(189,75,248,0.50)' }}>
          <svg width="52" height="52" viewBox="0 0 28 28" fill="none">
            <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <rect x="16" y="5.5" width="8" height="5" rx="2.5" fill="white" opacity=".9"/>
            <rect x="16" y="12" width="9" height="5.5" rx="2.75" fill="white"/>
          </svg>
        </div>

        {/* Heading */}
        <div style={{ fontSize:64, fontWeight:800, color:'#fff', letterSpacing:'-2px', lineHeight:1.1, textAlign:'center', marginBottom:16 }}>
          Benefix
        </div>

        {/* Tagline */}
        <div style={{ fontSize:28, color:'rgba(255,255,255,0.65)', textAlign:'center', letterSpacing:'-0.5px' }}>
          Tus beneficios. Un solo QR.
        </div>

        {/* Badge */}
        <div style={{ display:'flex', marginTop:36, padding:'10px 28px', borderRadius:9999, border:'1px solid rgba(189,75,248,0.50)', background:'rgba(189,75,248,0.15)', fontSize:18, color:'rgba(255,255,255,0.80)', letterSpacing:'0.05em' }}>
          ✦ benefix.com.ar
        </div>
      </div>
    ),
    { ...size }
  )
}
