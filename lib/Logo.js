'use client'

export default function Logo({ size = 'md', height, onClick, className, style }) {
  const h = height ?? (size === 'sm' ? 24 : size === 'lg' ? 48 : 56)
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
    />
  )
}
