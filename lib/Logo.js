'use client'

export default function Logo({ size = 'md', height, onClick, className, style, ...rest }) {
  const h = height ?? (size === 'sm' ? 20 : size === 'lg' ? 40 : 32)
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
