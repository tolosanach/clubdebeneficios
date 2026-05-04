'use client'

// Logo — wordmark unificado de Benefix.
//
// Reemplaza las dos definiciones locales (app/page.js y app/club/[slug]/page.js)
// que pintaban el logo viejo (gradient orange→fucsia + ícono infinity SVG inline).
// Ahora apunta a los SVGs nuevos del rebrand violeta sólido en /public/brand/.
//
// API:
//   variant="white"  → wordmark blanco sobre fondo OSCURO (default)
//   variant="violet" → wordmark violeta sobre fondo CLARO
//   variant="full"   → logo completo con pill CLUB (para splash, branding cards)
//
//   size="sm"  → height 20px
//   size="md"  → height 28px (default)
//   size="lg"  → height 40px
//
//   onClick / className / style → passthrough al <img>
//
// Notas:
// - Usamos <img> nativo (NO next/image) porque next/image inserta un wrapper
//   <span> que rompe layouts inline (flex/grid alignment de los call sites).
//   El SVG ya esta optimizado, no necesita lazy loading ni placeholder.
// - width:auto + height:fixed mantiene el aspect ratio del wordmark.
// - El alt es siempre "Benefix" — el wordmark es texto puro a nivel visual.

const SRC = {
  white:  '/brand/logo-benefix-wordmark-white.svg',
  violet: '/brand/logo-benefix-wordmark.svg',
  full:   '/brand/logo-benefix.svg',
}

const HEIGHT = {
  sm: 20,
  md: 28,
  lg: 40,
}

export default function Logo({
  variant = 'white',
  size    = 'md',
  onClick,
  className,
  style,
  ...rest
}) {
  const src = SRC[variant] || SRC.white
  const h   = HEIGHT[size] || HEIGHT.md
  return (
    <img
      src={src}
      alt="Benefix"
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
