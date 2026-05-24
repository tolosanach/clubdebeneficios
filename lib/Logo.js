'use client'

export default function Logo({ size = 'md', height, onClick, className, style }) {
  const h = height ?? (size === 'sm' ? 20 : size === 'lg' ? 40 : 32)
  const fs = Math.round(h * 0.65)
  return (
    <span
      onClick={onClick}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: h,
        fontSize: fs,
        fontWeight: 900,
        letterSpacing: '-0.03em',
        fontFamily: "'Mulish', 'Space Grotesk', system-ui, sans-serif",
        lineHeight: 1,
        cursor: onClick ? 'pointer' : undefined,
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
    >
      <span style={{ color: '#6F30DF' }}>Clu</span><span style={{ color: '#FF199F' }}>fix</span>
    </span>
  )
}
