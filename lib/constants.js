// Constantes globales — magic numbers, timeouts, y configuración hardcodeada.
// Cambios centralizados aquí evitan hunts por el codebase.

// ── TIEMPOS ──────────────────────────────────────────────────────────────
export const TIMEOUTS = {
  // Toast notifications
  toastShort: 2000,     // error, info rápido
  toastNormal: 3000,    // default success
  toastLong: 6000,      // importante o lectura larga

  // UI state transitions
  uiTransition: 200,    // modal entry, fade-in
  uiSlow: 300,          // longer reveal

  // User-initiated delays
  autoPlayDelay: 3000,  // hero auto-flip start
  autoUnflipDelay: 4000, // hero auto-unflip (2s after flip start)
  hintDelay: 4800,      // coachmark hint display

  // Background tasks
  pollingInterval: 60000,       // refresh every 60s
  pushBannerDelay: 4000,        // EnablePushPrompt
  installPromptDelay: 3000,     // InstallPrompt
  resumeFormTimeout: 10000,     // OnboardingView form restore

  // Thresholds
  debounceInput: 300,   // category search, phone input
  cooldownBetweenActions: 500,  // prevent double-submit
}

// ── CONVERSIONES DE TIEMPO ───────────────────────────────────────────────
export const TIME_UNITS = {
  msPerSecond: 1000,
  msPerMinute: 60 * 1000,
  msPerHour: 60 * 60 * 1000,
  msPerDay: 24 * 60 * 60 * 1000,
  msPerWeek: 7 * 24 * 60 * 60 * 1000,
}

export const daysToMs = (days) => days * TIME_UNITS.msPerDay
export const hoursToMs = (hours) => hours * TIME_UNITS.msPerHour

// ── LÍMITES Y VALIDACIÓN ────────────────────────────────────────────────
export const LIMITS = {
  // Plan limits
  planFree: 30,         // clientes MAX en FREE
  planStarter: 60,      // clientes MAX en STARTER
  planPro: 999999,      // "ilimitado"

  // Categorías múltiples
  maxCategories: 3,     // max categorías por comercio

  // Medidas y contenido
  maxCategoryLength: 60,       // caracteres
  maxCommerceNameLength: 100,
  maxDescriptionLength: 500,
  minCommerceNameLength: 3,

  // Premios
  maxPrizesPerCommerce: 50,
  minCost: 1,           // costo mínimo de premio
  maxCost: 9999,        // costo máximo de premio

  // Imágenes
  maxImageSizeKb: 5120, // 5MB
  minImageWidth: 400,   // px (lado más largo)

  // Rate limiting
  placesAutocompleteRateLimit: 30,  // requests/min per user
  placesDetailsRateLimit: 60,        // requests/hour per user
  apiCallsPerMinute: 100,

  // Otros
  maxHistoryItems: 40,  // visits, redemptions loaded
  phoneMinDigits: 10,
  phoneMaxDigits: 20,
  nameChangeLockDays: 20,  // days between name changes
}

// ── BREAKPOINTS (Tailwind standard) ──────────────────────────────────────
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

export const isMobile = () => typeof window !== 'undefined' && window.innerWidth < BREAKPOINTS.sm
export const isTablet = () => typeof window !== 'undefined' && window.innerWidth >= BREAKPOINTS.sm && window.innerWidth < BREAKPOINTS.lg
export const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= BREAKPOINTS.lg

// ── PLAN LIMITS ──────────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free: {
    name: 'FREE',
    membershipMax: LIMITS.planFree,
    featuresAllowed: ['basic'],
    color: 'rgba(255,255,255,0.5)',
  },
  starter: {
    name: 'STARTER',
    membershipMax: LIMITS.planStarter,
    featuresAllowed: ['basic', 'promotions'],
    color: '#5B8DEF',
  },
  pro: {
    name: 'PRO',
    membershipMax: LIMITS.planPro,
    featuresAllowed: ['basic', 'promotions', 'automations', 'reports'],
    color: '#F5A623',
  },
}

// ── STORAGE KEYS (localStorage, sessionStorage) ──────────────────────────
export const STORAGE_KEYS = {
  // UI state
  commerceTab: 'clufix:commerceTab',
  lastView: 'clufix:lastView',
  clubsFilter: 'clufix:clubsFilter',        // cities + categories
  benefitsFilter: 'clufix:benefitsFilter',  // commerce names

  // Dismissals
  pushBannerDismissed: 'clufix:push-banner-dismissed',
  installDismissed: 'install_dismissed',    // sessionStorage
  railHintSeen: 'clufix:rail-hint-seen',
  panelHintSeen: 'clufix:panel-hint-seen',
  walletFlipHintSeen: 'clufix:wallet-flip-hint-seen',

  // User choices
  bizAnswer: 'clufix:bizAnswer',  // "¿Tenés un negocio?" response
  scanIntent: 'clufix:scanIntent', // sessionStorage: 'join-club' or 'register-visit'

  // Automations
  autoConfigPrefix: 'cb_auto_',
  autoSentPrefix: 'cb_sent_',
}

// ── NOTIFICACIÓN PUSH ────────────────────────────────────────────────────
export const VAPID_CONFIG = {
  // Estas keys se generaron el 2026-04-26 y expirarán en 2027-04-26
  // Si faltan VAPID keys en .env, el sistema degrada gracefully:
  // - El SW se registra igual
  // - Push in-app continúa funcionando
  // - Web push no se dispara (user no recibe notif del navegador)
  expiryDate: '2027-04-26',
}

// ── VALIDACIÓN DE ENTRADA ────────────────────────────────────────────────
export const REGEX = {
  // UUID v4 format
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

  // Email (simple)
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Phone (digits only, 10-20 chars)
  phone: /^\d{10,20}$/,

  // Slug (alphanumeric + dashes)
  slug: /^[a-z0-9-]+$/,

  // URL (simple)
  url: /^https?:\/\/.+/i,
}

// ── DEBUG FLAGS (temporal, comentar para prod) ──────────────────────────
export const DEBUG = {
  verbose: false,
  logApiCalls: false,
  logStateChanges: false,
  simulateSlowNetwork: false,
  showErrorDetails: true,
}
