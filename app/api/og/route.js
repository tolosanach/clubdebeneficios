import { ImageResponse } from 'next/og'

// /api/og — endpoint dinámico que genera el OG image de un comercio
// (el nombre + descripción vienen como query params, opcionalmente la
// imagen del logo). Lo usa cada página de club al definir su metadata
// para que las previews en WhatsApp/IG/etc se vean ricas.
//
// Rebrand mayo 2026: violeta sólido + badge "Clufix" arriba (sin el
// cuadrado de logo gradient). Cuando NO viene imagen del comercio,
// renderea un cuadrado violeta con la letra "B" blanca en lugar del
// path infinity viejo.
export const runtime = 'edge'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const name        = searchParams.get('name')        || 'Clufix'
  const description = searchParams.get('description') || 'Tus beneficios. Un solo QR.'
  const image       = searchParams.get('image')       || null

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#7131E1',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Profundidad sutil sin romper identidad sólida. */}
        <div style={{ position:'absolute', top:'-15%', left:'-8%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(105,53,189,0.85) 0%, transparent 70%)', filter:'blur(60px)', display:'flex' }} />
        <div style={{ position:'absolute', bottom:'-15%', right:'-8%', width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)', filter:'blur(60px)', display:'flex' }} />

        {/* Imagen del comercio (preferida) o fallback con la "B" violeta-blanca */}
        {image ? (
          <div style={{ display:'flex', width:96, height:96, borderRadius:24, overflow:'hidden', marginBottom:28, boxShadow:'0 16px 48px rgba(0,0,0,0.50)' }}>
            <img src={image} width={96} height={96} style={{ objectFit:'cover', width:'100%', height:'100%' }} />
          </div>
        ) : (
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            width:96, height:96, borderRadius:24,
            background:'#ffffff',
            marginBottom:28,
            boxShadow:'0 16px 48px rgba(0,0,0,0.40)',
            fontSize: 64, fontWeight: 800, color: '#7131E1',
            letterSpacing: '-0.04em',
          }}>
            B
          </div>
        )}

        {/* Badge "Clufix" — branding sutil */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 14px', borderRadius:9999, background:'rgba(255,255,255,0.16)', border:'1px solid rgba(255,255,255,0.40)', marginBottom:16, fontSize:14, color:'rgba(255,255,255,0.85)', letterSpacing:'0.06em' }}>
          Clufix
        </div>

        {/* Name del comercio */}
        <div style={{ fontSize: name.length > 24 ? 48 : 60, fontWeight:800, color:'#fff', letterSpacing:'-1.5px', lineHeight:1.1, textAlign:'center', marginBottom:16, maxWidth:900, padding:'0 40px' }}>
          {name}
        </div>

        {/* Description */}
        {description && (
          <div style={{ fontSize:26, color:'rgba(255,255,255,0.75)', textAlign:'center', letterSpacing:'-0.3px', maxWidth:780, padding:'0 40px', lineHeight:1.4 }}>
            {description}
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
