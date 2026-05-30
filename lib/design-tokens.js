// Design tokens — definiciones centralizadas de colores, tipografía, y espacios.
// Importa en todos los componentes para mantener coherencia visual.

// ── COLORES ──────────────────────────────────────────────────────────────
export const COLORS = {
  // Marca principal
  brandGradient: 'linear-gradient(135deg, #FE5000, #BD4BF8)',
  brandOrange: '#FE5000',
  brandViolet: '#BD4BF8',

  // Sistema de recompensas
  starsViolet: '#8B5CF6',       // estrellas (light)
  starsDark: '#7C3AED',         // estrellas (dark)
  pointsFucsia: '#EC4899',      // puntos (light)
  pointsDark: '#DB2777',        // puntos (dark)

  // Planes
  starterBlue: '#5B8DEF',
  proAmber: '#F5A623',

  // UI base
  white: '#FFFFFF',
  black: '#000000',
  darkBg: '#0D0818',            // fondo oscuro principal
  mist: 'rgba(255,255,255,0.50)',   // secondary text
  dust: 'rgba(255,255,255,0.30)',   // tertiary text
  rim: 'rgba(255,255,255,0.12)',    // borders
  detail: 'rgba(255,255,255,0.10)', // subtle dividers

  // Status
  ok: '#10B981',                // success (green)
  error: '#EF4444',             // error (red)
  warning: '#F59E0B',           // warning (amber)

  // Glass morphism
  glassLight: 'rgba(255,255,255,0.03)',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassBackdrop: 'blur(20px)',
}

// Alias cortos para uso frecuente (C.white, C.v, C.mist, etc.)
export const C = {
  white: COLORS.white,
  black: COLORS.black,
  v: COLORS.starsViolet,       // violeta (stars default)
  vd: COLORS.starsDark,        // violeta dark
  f: COLORS.pointsFucsia,      // fucsia (points default)
  fd: COLORS.pointsDark,       // fucsia dark
  mist: COLORS.mist,
  dust: COLORS.dust,
  rim: COLORS.rim,
  detail: COLORS.detail,
  ok: COLORS.ok,
  error: COLORS.error,
  warning: COLORS.warning,
}

// ── TIPOGRAFÍA ───────────────────────────────────────────────────────────
export const FONTS = {
  // Sans-serif: "Inter" simulada con fallback
  sans: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  // Monospace de tarjeta de crédito
  creditCard: '"IBM Plex Mono", "Courier New", monospace',
  // Fallback genérico
  fallback: 'sans-serif',
}

// Alias cortos (FN = Font Name, FI = Font Italic-safe, FCC = Font Credit Card)
export const FN = FONTS.sans
export const FI = FONTS.sans
export const FCC = FONTS.creditCard

// ── TAMAÑOS Y ESPACIOS ────────────────────────────────────────────────────
export const SIZES = {
  // Breakpoints (Tailwind)
  mobile: 640,        // < 640px
  tablet: 1024,       // >= 640px
  desktop: 1280,      // >= 1024px

  // Border radius
  xs: 6,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 9999,

  // Spacing (multiples of 4px)
  gutter: 16,         // padding interno estándar
  gap: 12,            // gap entre elementos
  spacer: 8,          // pequeño espaciador
}

// ── SOMBRAS ──────────────────────────────────────────────────────────────
export const SHADOWS = {
  sm: '0 4px 10px rgba(0,0,0,0.25)',
  md: '0 8px 28px rgba(0,0,0,0.35)',
  lg: '0 12px 32px rgba(0,0,0,0.40)',
  glow: {
    violet: '0 8px 32px rgba(189,75,248,0.40)',
    orange: '0 6px 18px rgba(254,80,0,0.40)',
    ambar: '0 0 6px rgba(245,166,35,0.85)',
  },
  inset: 'inset 0 1px 1px rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.07)',
}

// ── DURACIONES DE ANIMACIÓN ───────────────────────────────────────────────
export const DURATIONS = {
  instant: 0,
  fast: 160,          // hover feedback
  normal: 200,        // transition default
  slow: 300,          // modal entry
  verySlow: 650,      // counting animation
}

// ── COMPONENTES RECURRENTES ──────────────────────────────────────────────
export const GLASS_STYLE = {
  background: COLORS.glassLight,
  border: `1px solid ${COLORS.glassBorder}`,
  borderRadius: SIZES.lg,
  backdropFilter: COLORS.glassBackdrop,
  WebkitBackdropFilter: COLORS.glassBackdrop,
  boxShadow: SHADOWS.inset,
  position: 'relative',
  overflow: 'hidden',
}

export const PILL_BUTTON = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: SIZES.gap,
  padding: `${SIZES.spacer}px ${SIZES.gutter}px`,
  borderRadius: SIZES.full,
  border: 'none',
  cursor: 'pointer',
  fontFamily: FN,
  fontWeight: 700,
  fontSize: 13,
  transition: `all ${DURATIONS.fast}ms ease`,
}
