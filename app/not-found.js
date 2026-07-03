// 404 — diseñada con el sistema de la landing (tokens --lx- en globals.css).
// Server component: sin estado, solo estilos inline + Link.
import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'var(--lx-bg, #FAF7F2)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'24px', textAlign:'center',
      fontFamily:"var(--lx-sans, 'Instrument Sans', system-ui, sans-serif)",
    }}>
      {/* Grid lines sutiles */}
      <div aria-hidden="true" style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:0.5 }}>
        <div style={{ position:'absolute', top:0, bottom:0, left:'25%', width:1, background:'var(--lx-line, rgba(23,16,42,0.12))' }} />
        <div style={{ position:'absolute', top:0, bottom:0, left:'75%', width:1, background:'var(--lx-line, rgba(23,16,42,0.12))' }} />
        <div style={{ position:'absolute', left:0, right:0, top:'50%', height:1, background:'var(--lx-line, rgba(23,16,42,0.12))' }} />
      </div>

      <div style={{ position:'relative', zIndex:2, maxWidth:520 }}>
        <span style={{
          display:'inline-flex', alignItems:'center', gap:12,
          fontFamily:"var(--lx-mono, 'JetBrains Mono', monospace)",
          fontSize:'0.78rem', letterSpacing:'0.06em',
          color:'var(--lx-ink-3, rgba(23,16,42,0.42))', marginBottom:18,
        }}>
          <span style={{ width:32, height:1, background:'var(--lx-ink-3, rgba(23,16,42,0.42))', display:'inline-block' }} />
          Error 404
        </span>
        <h1 style={{
          fontFamily:"var(--lx-serif, 'Instrument Serif', Georgia, serif)",
          fontWeight:700, fontSize:'clamp(4.5rem, 16vw, 8rem)', lineHeight:0.95,
          margin:'0 0 14px', color:'var(--lx-ink, #17102A)', letterSpacing:'-0.02em',
        }}>
          404
        </h1>
        <p style={{
          fontFamily:"var(--lx-serif, 'Instrument Serif', Georgia, serif)",
          fontWeight:600, fontSize:'clamp(1.3rem, 3vw, 1.7rem)', letterSpacing:'-0.02em',
          color:'var(--lx-violet, #6F30DF)', margin:'0 0 14px',
        }}>
          Esta página no existe.
        </p>
        <p style={{ fontSize:'0.95rem', color:'var(--lx-ink-2, rgba(23,16,42,0.62))', lineHeight:1.65, margin:'0 0 32px' }}>
          Puede que el enlace esté vencido o mal escrito.
          Lo que sí existe: tu club de beneficios.
        </p>
        <Link href="/" style={{
          display:'inline-block', background:'var(--lx-violet, #6F30DF)', color:'#fff',
          padding:'0.95rem 1.9rem', borderRadius:100, fontWeight:600, fontSize:'0.95rem',
          textDecoration:'none',
        }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
