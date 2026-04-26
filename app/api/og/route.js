import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const name        = searchParams.get('name')        || 'Benefix'
  const description = searchParams.get('description') || 'Tus beneficios. Un solo QR.'
  const image       = searchParams.get('image')       || null

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0D0818 0%, #1a0d2e 40%, #2d0a4e 70%, #1a0530 100%)',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Purple blob */}
        <div style={{ position:'absolute', top:'-15%', left:'-8%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.50) 0%, transparent 70%)', filter:'blur(60px)', display:'flex' }} />
        {/* Pink blob */}
        <div style={{ position:'absolute', bottom:'-15%', right:'-8%', width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.40) 0%, transparent 70%)', filter:'blur(60px)', display:'flex' }} />

        {/* Commerce image or logo icon */}
        {image ? (
          <div style={{ display:'flex', width:96, height:96, borderRadius:24, overflow:'hidden', marginBottom:28, boxShadow:'0 16px 48px rgba(0,0,0,0.50)' }}>
            <img src={image} width={96} height={96} style={{ objectFit:'cover', width:'100%', height:'100%' }} />
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:96, height:96, borderRadius:24, background:'linear-gradient(135deg, #FE5000, #BD4BF8)', marginBottom:28, boxShadow:'0 16px 48px rgba(189,75,248,0.50)' }}>
            <svg width="52" height="52" viewBox="0 0 28 28" fill="none">
              <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <rect x="16" y="5.5" width="8" height="5" rx="2.5" fill="white" opacity=".9"/>
              <rect x="16" y="12" width="9" height="5.5" rx="2.75" fill="white"/>
            </svg>
          </div>
        )}

        {/* Club badge */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 14px', borderRadius:9999, background:'rgba(189,75,248,0.18)', border:'1px solid rgba(189,75,248,0.40)', marginBottom:16, fontSize:14, color:'rgba(255,255,255,0.70)', letterSpacing:'0.06em' }}>
          Benefix
        </div>

        {/* Name */}
        <div style={{ fontSize: name.length > 24 ? 48 : 60, fontWeight:800, color:'#fff', letterSpacing:'-1.5px', lineHeight:1.1, textAlign:'center', marginBottom:16, maxWidth:900, padding:'0 40px' }}>
          {name}
        </div>

        {/* Description */}
        {description && (
          <div style={{ fontSize:26, color:'rgba(255,255,255,0.60)', textAlign:'center', letterSpacing:'-0.3px', maxWidth:780, padding:'0 40px', lineHeight:1.4 }}>
            {description}
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
