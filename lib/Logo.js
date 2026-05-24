'use client'

// El SVG /clufix_logo.svg fue exportado desde CorelDRAW con viewBox incorrecto
// (el contenido está en coordenadas x≈83000–115000 pero el viewBox es "0 0 11500 15000").
// Hasta que se re-exporte correctamente, se usa el wordmark en texto.
// Para activar el SVG: cambiar USE_SVG a true y verificar que renderice.
const USE_SVG = false

function WordMark({ h, onClick, style }) {
  const fs = Math.round(h * 0.62)
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: h,
        fontSize: fs,
        fontWeight: 800,
        letterSpacing: '-0.03em',
        fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
        lineHeight: 1,
        cursor: onClick ? 'pointer' : undefined,
        userSelect: 'none',
        ...style,
      }}
    >
      <span style={{ color: '#6F30DF' }}>Clu</span><span style={{ color: '#FF199F' }}>fix</span>
    </span>
  )
}

export default function Logo({ size = 'md', height, onClick, className, style, ...rest }) {
  const h = height ?? (size === 'sm' ? 20 : size === 'lg' ? 40 : 32)

  if (!USE_SVG) return <WordMark h={h} onClick={onClick} style={style} />

  return (
    <img
      src="/clufix_logo.svg"
      alt="Clufix"
      onClick={onClick}
      className={className}
      style={{
        height: h,
        width: 'auto',
        display: 'block',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      {...rest}
    />
  )
}
