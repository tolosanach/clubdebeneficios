@AGENTS.md

# Benefix — contexto del proyecto

App argentina de fidelización para comercios. Cada comercio crea un "club" donde sus clientes acumulan recompensas al escanear su QR. Producción: **benefix.com.ar**.

## Stack

- **Next.js 16.2.3** + React 19 (Turbopack)
- **Supabase** (Postgres con RLS, Auth con Google OAuth via @supabase/ssr, Storage)
- Hosted en **Vercel**
- `app/page.js` — archivo monstruo (~13k líneas) con casi toda la app

Variables de entorno críticas en `.env.local` y Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (chat de soporte con Claude Haiku 4.5)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (web push del navegador). Las keys se generaron el 2026-04-26. Si faltan, las notifs in-app igual funcionan, solo no se dispara el push del SW.
- `GOOGLE_PLACES_API_KEY` (autocomplete de comercios en el wizard de registro). NO usar `NEXT_PUBLIC_` — todas las llamadas a Google pasan por backend para no exponer la key + rate-limit por user + auditoría.

Dependencias clave en `package.json`:
- `web-push` (server, para enviar pushes desde `lib/notify-server.js`)
- `qrcode.react`, `qrcode` (genera QRs del local y del cliente)
- `jsqr` (decoder de QR via canvas — reemplazo de html5-qrcode que fallaba en iOS Safari)
- `react-easy-crop` (cropper del logo)
- `@supabase/ssr` (auth con cookies)

## Conceptos clave

- **2 sistemas de fidelización por comercio**: `stars` (1 estrella por compra, simple) o `points` (1 punto = 1 peso, flexible).
- **Premios** (`prizes`): tienen `cost`, `system_type` ('stars'|'points'), `active`, `stock`. Al cambiar de sistema se pausan todos los premios viejos.
- **Promos** (`promotions`): tipo `discount_next` (% OFF próxima visita) o `double_points` (×2 en días).
- **Mensajes** (Automatizaciones, plan PRO): WhatsApp para reactivar inactivos, bienvenida, etc.
- **Planes**: FREE (30 clientes, sin promos), STARTER (60, promos), PRO (sin límite, promos + automatizaciones).
- **Clientes** (socios) tienen tarjeta digital con QR, se suman a varios clubes.
- **Comerciante** escanea QR del cliente desde panel → suma visita/puntos.

### Regla de oro: PREMIO ≠ DESCUENTO

Esta distinción es central a la app y se confunde fácil cuando uno escribe copy o plantillas (`lib/suggestedPrizesByCategory.js`):

- Un **PREMIO** es algo concreto que se ENTREGA o REGALA a cambio del balance del cliente. Puede ser:
  - Un **producto** físico → café, libro, pizza chica, ramo, herramienta, prenda, etc.
  - Un **servicio** regalado → corte de pelo, sesión de masaje, baño de mascota, lavado, evaluación, asesoramiento, retoque, clase de prueba, etc.
  - Vive en `prizes` (tabla de Postgres) y aparece en el catálogo del cliente con su `cost` en estrellas/puntos.

- Un **DESCUENTO** (% OFF) **NO es premio**. Vive en `promotions` con `type='discount_next'` (cupón % OFF próxima compra) o `type='double_points'` (suma ×2 en días). Aparece como BENEFICIO en otra sección (slider de Beneficios), no en el catálogo de premios.

Cuando estés cargando plantillas, copy o features, hacete la pregunta: **"¿esto se ENTREGA al cliente, o es una REBAJA sobre el precio?"** Si entrega → premio (va al catálogo). Si rebaja → descuento (va a `promotions` aparte). NO mezclar.

## Convenciones de UI vigentes

### Paleta y código de color
- **Stars** → violeta `#8B5CF6` / oscuro `#7C3AED`
- **Points** → fucsia `#EC4899` / oscuro `#DB2777`
- **STARTER plan** → azul `#5B8DEF`
- **PRO plan** → ámbar `#F5A623`
- **Marca/CTAs primarios** → gradiente naranja→violeta `linear-gradient(135deg, #FE5000, #BD4BF8)` (constante `G` en page.js)
- Stars/Points tienen color codificado en TODA la app: cards de sistema, contador de premios, badges, etc.

### Tipografía de títulos del panel comerciante
H1 de cada pestaña (Recompensas por compra, Clientes, Premios, Análisis, Historial, Automatizaciones, Promociones cuando STARTER+, Reportes/Segmentación):
```
fontSize: 18, fontWeight: 900, color: C.white,
letterSpacing: '.08em', textTransform: 'uppercase'
```
Section headers (RECOMPENSAS EXTRA): mismo formato. Debajo del título van los chips de plan (FREE/STARTER/PRO/ACTIVO) en su propia fila.

### Patrón de accordion (Configuración)
La pestaña Configuración usa el componente inline `ConfigAccordion` con state `expandedConfigSection` (un único id abierto a la vez). Por default todas las secciones colapsadas: solo se ven los headers con icon + título. Click → abre, abrir otra cierra la anterior.

### Patrón Recompensas (sistema base)
- 2 cards horizontales pegadas con un botón ⇅ flotando entre ellas (margen negativo)
- La card inactiva queda arriba, la **activa siempre abajo** (sort dinámico) para quedar pegada a sus campos de edición
- "Preview before commit" para cambio de sistema: state `pendingSystemType` permite tocar las flechitas y ver el otro sistema sin guardar. Aparece banner "Estás previsualizando X" + botones Cancelar / Guardar cambios. La confirmación final muestra warning de premios pausados.
- Wrapper unificado englobando la card activa + sus campos de edición (compra mínima, regla 1pto=1$, premios cargados) con borde del color del sistema activo.

### Patrón Premios (cards)
- Badge "ACTIVO/INACTIVO" en esquina top-right (clickeable, toggles)
- Imagen 52px centrada vertical, bloque texto con paddingTop reservando hueco para el badge
- 2 botones (Pen + Trash circulares 32px) anclados al bottom de la fila para no colisionar con el badge top
- **Zócalo inferior** dentro de la misma card: Stock + Canjeados + Creado (DD/MM/AA), separados por divisores, color del sistema en bg sutil
- Botón "Crear premio" cuando está cerrado: pill grande con gradiente de marca G. Cuando se abre el accordion, vuelve a estilo neutro.

### Patrón Promociones (cards activas)
3 botones en la fila inferior: **Desactivar** (texto, flex:1) + **Pen** (icon 34px, edita) + **Trash** (icon 34px, elimina). Edit modal permite cambiar descripción y `expires_at`.

### Patrón Recompensas extra (locked)
2 promo cards (Cupón próxima visita, Días con bonus ×2) envueltas en un contenedor general con borde STARTER. Cards con opacity baja (deshabilitadas) pero **candado destacado** a opacity full. Click expande inline con benefits + ejemplo + CTA "Activar STARTER".

### Cross-promo banners
Patrón "estás bloqueado en este plan, vení a ver lo que hay arriba": banner con bg color sutil, icono apagado, texto apagado, candado destacado, chip de plan al lado del título (no en el copy).

### Botón "Volver a recompensas"
State global `cameFromTab` que se setea al hacer `setTab(target, 'recompensas')`. Aparece como pill con ArrowLeft al tope de Premios y Mensajes cuando `cameFromTab === 'recompensas'`. Limpieza automática al navegar a otra pestaña sin source.

### Segmentación
Grid 2x2 fijo (`gridTemplateColumns: '1fr 1fr'`). Los 4 botones (Nuevos / Frecuentes / VIP / Inactivos) **siempre visibles**. Al elegir uno, ese se rellena con gradient del color del segmento, los otros 3 quedan apagados (opacity 0.45). Detalle del segmento aparece debajo. Toggle: tap en activo lo desactiva.

### Header de Recompensas
Mini diagrama `[QR icon] → [Gift icon]` arriba del título. El gift cambia de color según el sistema seleccionado (violeta/fucsia, sigue a `pendingSystemType ?? prog_type`). Debajo: H1 "RECOMPENSAS POR COMPRA" + chip "FREE".

## Migrations Supabase aplicadas (relevantes)

Schema actual en producción (proyecto `wcqhapsgwjivtzdseqjz`, "Club-de-beneficios"):
- `prizes.system_type` (text, NOT NULL, default 'stars', check stars|points) — sirve para filtrar premios por modalidad
- `commerces.prog_min_purchase` (integer, nullable) — compra mínima para sumar estrella
- `commerces.name_changed_at` (timestamptz) — lock de 20 días para cambio de nombre
- `support_conversations`, `support_messages` — chat de soporte con IA, RLS por user
- `redemptions.kind` (text, NOT NULL, default 'prize', check prize|discount), `redemptions.promotion_id` (uuid FK ON DELETE SET NULL), `redemptions.discount_value` (integer) — para que los canjes incluyan los descuentos `discount_next` aplicados, no solo los premios del catálogo. Index GIN en `kind` y `promotion_id`. `prize_id` quedó nullable.
- `notifications` (id, user_id FK ON DELETE CASCADE, type, title, body, link, metadata jsonb, read_at, created_at). RLS: select/update solo del propio user. Índices: por user+created y un partial donde read_at IS NULL para no-leídas.
- `push_subscriptions` (id, user_id FK CASCADE, endpoint UNIQUE, p256dh, auth, user_agent, last_used). RLS: select/insert/delete solo del propio user.
- `commerces.categories` (text[], default null, populada con `ARRAY[category]` para filas viejas) — soporta múltiples categorías por comercio (max 3). Index GIN en `categories`. La columna `category` (string singular) se mantiene como espejo del primer ítem para compat con código viejo.

## Soporte IA (chat)

- Backend: `app/api/support/chat/route.js` (POST) + `app/api/support/history/route.js` (GET)
- Frontend: `lib/SupportChat.js` (drawer flotante, botón redondo bottom-right `bottom: 90` para no chocar con bottom-nav mobile)
- System prompt grounded en realidad de Benefix (no inventa precios, escala a humano cuando es crítico)
- Rate limit: 30 mensajes/hora por user, in-memory
- Modelo: `claude-haiku-4-5-20251001` (~US$0.005 por conversación)
- Wireado en `app/page.js` con prop `role={view === 'commerce-settings' ? 'merchant' : 'client'}`
- Pendiente: cambiar `whatsappNumber` placeholder en `lib/SupportChat.js` por número real

## Notas de seguridad / arquitectura

- `/api/scan` y `/api/join`: auth guard estricto (RLS dueño-only)
- `/api/save-commerce-config`: lock 20 días para cambio de nombre
- Storage: bucket `commerce-assets` para logos y covers
- OAuth: redirect siempre por `/auth/callback?next=...` (PKCE con @supabase/ssr)

## Tareas pendientes (numeradas legacy)

- #67 Migrar lecturas residuales en CommerceView a endpoints server-side
- #72 Validar formato del qr_code en /api/scan antes de query
- #83 Follow-up: derivar progreso visual del cheapestPrize en lugar de prog_goal

## Próximos hitos posibles del soporte IA (Sprint 2+)

1. Streaming SSE de respuestas (palabra por palabra)
2. RAG: tabla `support_docs` con embeddings (pgvector ya disponible en Supabase)
3. Tools / function calling: que la IA consulte estado del comercio en vivo
4. Dashboard interno con conversaciones para mejorar respuestas

## Cambios recientes (sprint abr 2026)

Tanda grande de features. Lo que cambió de raíz:

### Notificaciones in-app + web push del navegador
- Tabla `notifications` y helper `lib/notify-server.js` con `notify({ userId, type, title, body, link, metadata })` y `notifyBoth({ clientUserId, ownerUserId, client, owner })`.
- Hookpoints: `/api/scan`, `/api/redeem`, `/api/join`, `/api/discount-decision`, `/api/grant-promotion` — cada evento dispara 2 notifs cruzadas (cliente + dueño).
- Tipos en uso: `visit`, `join`, `prize_redeem`, `discount_redeem`, `discount_renewed`, `discount_declined`, `discount_granted`. El componente UI mapea cada uno a un ícono+color (Star, UserPlus, Gift, Percent, RefreshCw, Ban, Sparkles).
- Endpoints API:
  - `GET /api/notifications` — lista paginada + count de unread
  - `PATCH /api/notifications` — marca todas como leídas
  - `PATCH /api/notifications/[id]` — marca una como leída
  - `GET /api/push/vapid` — devuelve la VAPID public key al cliente
  - `POST /api/push/subscribe` — guarda PushSubscription
  - `DELETE /api/push/subscribe` — desuscribe
- Frontend: `lib/NotificationsBell.js` (campana flotante UNIFICADA con dos pestañas: **Movimientos** = notifs transaccionales / **Sistema** = sugerencias del SuggestionsInbox absorbidas adentro). Stack flotante actual: SupportChat (bottom 90) + NotificationsBell (bottom 156). El SuggestionsInbox NO se monta más — su archivo queda pero todo su contenido vive ahora dentro de NotificationsBell.
- Service worker: `public/sw-push.js` con `install`/`activate`/`fetch`/`push`/`notificationclick`. Tiene un fetch handler vacío para que el navegador considere al sitio "instalable" como PWA. Lo registra `lib/sw-register.js` SIEMPRE al cargar la app (no solo cuando el user da permiso de push). El registro siempre era requisito para que `beforeinstallprompt` se dispare.
- Cliente push: `lib/push-client.js` con `registerPushIfPossible()`, `requestPushPermissionAndSubscribe()`, `unsubscribePush()`, `attachServiceWorkerMessageListener()`. El último escucha mensajes del SW y dispara `benefix:notifications-refresh` para refrescar el drawer al toque cuando llega un push.
- Banner "Activá las notificaciones" en `lib/EnablePushPrompt.js` — aparece a los 4s, se descarta vía localStorage `benefix:push-banner-dismissed`.

### Flujo del descuento "próxima compra" (discount_next)
**Bug raíz que se arregló**: antes `/api/scan` re-otorgaba el cupón `discount_next` automáticamente apenas lo marcaba como `used`. Si el cashier después decía "No renovar" en el modal, ya era tarde — el cliente conservaba el cupón.

**Flujo nuevo**:
1. Cliente se suma al club → `/api/join` le otorga UNA SOLA VEZ todas las `discount_next` activas del comercio (con `expires_at` calculado según `expiration_type`: `relative` → `today + expiration_days`, `fixed` → `expiration_date`).
2. Cliente vuelve, comercio escanea → `/api/scan` solo MARCA COMO `used` el cupón activo y devuelve `discount_redeemed: { promo_id, value, expires_at }` (también inserta una fila en `redemptions` con `kind='discount'`, `promotion_id`, `discount_value`).
3. Modal "¿Renovar?" en `ScannerView` → llama `/api/discount-decision { commerce_id, membership_id, promotion_id, decision: 'renew'|'decline' }`.
4. `decision='renew'` → upsert `client_promotions` con status `active` + `notifyBoth("renovado")`.
5. `decision='decline'` (incluye X y backdrop del modal) → no toca DB + `notifyBoth("no renovado")`.
6. El loop de auto-otorgar del scan ya NO existe — la única fuente de cupones nuevos es `/api/join` o `/api/discount-decision` con `renew` o `/api/grant-promotion` (otorgamiento manual del dueño).

### Otorgamiento manual de beneficios desde la ficha del cliente
- En el panel comerciante, ficha del cliente seleccionado, hay una card colapsable "Otorgar beneficio" con icono Sparkles. Al expandir lista todas las `discount_next` activas y vigentes del comercio. Cada una con su % OFF, descripción y vencimiento.
- Endpoint `POST /api/grant-promotion { commerce_id, membership_id, promotion_id }`. Solo permite `discount_next` (las `double_points` aplican al comercio, no al cliente). Auth: dueño/admin. Hace upsert con status `active` y notifica a ambas partes (`type='discount_granted'`).

### Lista de clientes — fix nombres
- **Bug doble**: (1) los profiles tienen el nombre en `profiles.name` (Google OAuth lo populaba ahí), pero el código leía solo `full_name`. (2) la RLS de `profiles` solo permite ver el propio profile, así que el JOIN del frontend devolvía `null` para todos los clientes.
- **Fix**: nuevo endpoint `GET /api/commerce-clients?commerce_id=X` que usa service role para bypass de RLS y trae los memberships con profile join (incluye `name`, `full_name`, `email`, `phone`, `avatar_url`). Devuelve un campo `display_name` calculado (`full_name || name`).
- En todo `app/page.js` el patrón de lectura del nombre cambió de `m.profiles?.full_name` a `(m.profiles?.display_name || m.profiles?.full_name || m.profiles?.name)`. Mismo fallback aplicado en `/api/scan`, `/api/redeem`, `/api/discount-decision`, `/api/grant-promotion`, `/api/join`, reportes y segments.

### Cartel narrativo post-scan
Reemplaza el "¡Visita registrada!" plano por una lista de "narrativeLines" — cada línea es un mini-card con icono coloreado + texto que cuenta la historia:
- "Juan ganó **1 estrella** por su compra" / "Juan ganó **200 puntos** por su compra (×2 hoy)"
- "Juan canjeó **30% OFF** que tenía guardado" + "Le **renovaste** el descuento" / "**No le renovaste** el descuento"
- "Le quedan **N cupones pendientes**: 30% OFF, 15% OFF" — filtra el que se acaba de canjear si no lo renovaron
- "Puede canjear **3 premios**: Café Gratis (5★), ..." / "Le faltan **2★** para canjear **Café Gratis**"

El backend `/api/scan` ahora devuelve adicional: `active_coupons` (los que le quedan al cliente vigentes), `available_prizes` (los que puede canjear con su balance actualizado), `next_prize` (próximo premio + cuánto le falta). Ya no devuelve solo `cheapestPrize`. El estado `discountDecisionResult` (`'renewed'|'declined'|null`) se rastrea en el frontend para sincronizar la decisión del modal con el cartel.

### Categorías múltiples por comercio
- Comercios pueden tener hasta 3 categorías (en `categories text[]`). El picker de la pestaña Configuración es multi-select con chips removibles + "Otro" para custom; toggle por click en sub-categoría.
- `/api/save-commerce-config` acepta `categories` array (preferido) o `category` string (legacy). Guarda ambas — `category` queda como espejo del primer ítem.
- En el directorio público: filtro matchea si CUALQUIERA de las categorías del comercio coincide con el filtro elegido. En "Mis Clubes" del cliente: los pills de filtro de rubro se generan desde el array completo (no solo del campo legacy).

### Mis Clubes — auto-refresh
`ClientView` agregó listener de `visibilitychange` + `focus` + mensajes del SW que dispara `setRefreshTick(t+1)`. Cuando el cliente vuelve a la app después de tenerla en background, las cards reflejan el balance/cupones reales sin tener que recargar.

También se reforzó el filtro de cupones en `WalletCard`: solo cuenta como activo si `status='active'` Y `expires_at > now`.

### UI: cambios visuales destacados
- **Pantalla "¿Qué querés hacer?" del scanner**: dos secciones agrupadas con header (barrita gradient + texto uppercase): **"Abrir escáner"** (Registrar visita + Sumarme a un club) y **"Mostrar QR"** (mi QR personal).
- **Pantalla inicial del panel comerciante (intent picker)**: aparece cada vez que se entra a "Mi Negocio". Greeting + dos botones grandes: "Sumar nuevo cliente al club" (abre modal global con QR del local) y "Registrar la compra de un cliente" (lleva al scanner). State `intentPickerActive` resetea con cada click en el icono "Mi Negocio" del navbar via evento `benefix:merchant-intent`.
- **Coachmark del rail lateral**: cuando el dueño cierra el rail por primera vez, a los 5s aparece un cartel naranja-violeta apuntando a la solapa. Se descarta con X. Persiste en localStorage `benefix:rail-hint-seen`.
- **Coachmark del intent picker**: a los 5s de inactividad, debajo de "Saltar al panel →" aparece un coachmark CHIQUITO alineado a la izquierda con flecha curva (CornerLeftUp) apuntando a "Saltar al panel" + texto "Tocá 'Saltar al panel' para ir a configuraciones". X chiquita para cerrar. Persiste en `benefix:panel-hint-seen`.
- **Banner "Instalá la app"** (`InstallPrompt`): el botón X está arriba-izquierda en posición absoluta para no cruzarse con los flotantes del bottom-right. El banner usa `right: 86` para no llegar a la columna de los flotantes. Detecta iOS y muestra mini-tutorial manual (Compartir → Añadir a inicio).
- **Botón flotante de soporte (`SupportChat`)**: gradiente violeta puro `#7C3AED → #A855F7 → #BD4BF8`, ícono `HelpCircle` (signo de pregunta). Antes era naranja-violeta con `MessageCircle`.
- **FilterPills de "Mis Clubes"**: refactor robusto — wrapper externo con `overflow-x: auto` + inner con `width: max-content` y `flex-wrap: nowrap`, garantiza una sola línea por filtro (ciudad y rubro) con scroll horizontal. Antes en Safari iOS podía wrapearse a varias líneas.

### Onboarding del comerciante — bugs resueltos
- **Input que se trababa después de una letra**: el componente `Wrap` se redeclaraba en cada render dentro de `OnboardingView`, React lo veía como nuevo y desmontaba el árbol con cada keystroke. Convertido a función helper `wrap(children)` que devuelve JSX directamente. Cada `<Wrap>...</Wrap>` se cambió a `wrap(<>...</>)`. Los inputs ya no pierden foco.
- **Validación de imagen muy estricta**: `checkImageDimensions` rechazaba imágenes donde el lado MÁS CORTO era menor a 400px. Eso bloqueaba logos panorámicos (1500×300) que el cropper SÍ podría arreglar. Ahora pide solo que el lado MÁS LARGO sea ≥400, así pasa al cropper y `makeSquareWithPadding` los cuadra.

### Endpoints API nuevos (referencia rápida)
- `GET /api/notifications`, `PATCH /api/notifications`, `PATCH /api/notifications/[id]`
- `GET /api/push/vapid`, `POST /api/push/subscribe`, `DELETE /api/push/subscribe`
- `POST /api/discount-decision { decision: 'renew'|'decline' }`
- `POST /api/grant-promotion { commerce_id, membership_id, promotion_id }`
- `GET /api/commerce-clients?commerce_id=X` (lista de clientes del dueño con profiles via service role)

### Eventos custom DOM en uso
- `benefix:navigate { view, tab }` — navegación cross-vista
- `benefix:set-tab { tab }` — cambia tab del CommerceSettingsView desde otros componentes
- `benefix:merchant-intent` — fuerza re-aparición del intent picker
- `benefix:notifications-refresh` — refresca el drawer de notifs
- `benefix:client-tab-changed`, `benefix:inbox-open`, `benefix:support-chat-open` (legacy, todavía usados en algunos cleanups)

### LocalStorage flags
- `benefix:commerceTab` — tab activo del panel
- `benefix:push-banner-dismissed` — banner de push descartado
- `benefix:rail-hint-seen` — coachmark del rail visto
- `benefix:panel-hint-seen` — coachmark del intent picker visto
- `install_dismissed` (sessionStorage) — banner instalá la app descartado en esta sesión
- `cb_auto_<commerce_id>`, `cb_sent_<commerce_id>` — configs de automatizaciones

## Cambios recientes (sprint may 2026 — home redesign)

Sesión grande de iteración sobre el HOME público (la landing pre-login):

### Nuevo `lib/HeroV2Section.js` — hero principal del home
- **Está activo** en `app/page.js > HomeView`. El `CinematicSplashSection` viejo quedó comentado como fallback (no eliminado por si querés volver). El `BigBoldRowsSection` se sacó del flow.
- **Estructura en 3 zonas** (flex column, `height: 100svh`, `minHeight: 580`, `background: #000`):
  1. **Zona superior** (sin flex, `padding: '88px 0 0'`): marquee horizontal "Integrado con Mercado Pago / WhatsApp" en una sola línea con animación slide right-to-left infinita (keyframe `hero-v2-marquee-left` 22s linear). Track con `width: max-content`, items duplicados ×4 para seamless loop. Mask lateral linear-gradient transparent→#000→transparent para fade en bordes.
  2. **Zona central** (`flex: 1`, `justifyContent: center`): headline "Tu club, tu marca." (`clamp(40px, 8vw, 80px)`, fontWeight 600, letter-spacing -0.03em) + subtext "Sumá puntos, dale beneficios y volvé a tus clientes recurrentes." + 2 CTAs (uno solid black con border blanco "Empezar gratis", uno glass "Quiero conocer más"). Vertical y horizontalmente centrado.
  3. **Zona inferior** (sin flex, `padding-bottom: 110px`): marquee horizontal con rubros (Cafeterías, Barberías, Restaurantes, Tiendas, Gimnasios, Peluquerías, Heladerías, Panaderías, Spa, Lavaderos, Pizzerías, Veterinarias) en grayscale + opacity 0.40, slide right-to-left (`hero-v2-marquee-left` 38s). El padding-bottom alto deja respirar arriba de los flotantes (SupportChat bottom 90, NotificationsBell bottom 156).
- **Background video full-bleed** (`inset: 0`): clip de Mux HLS `https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8`. Carga via subcomponente interno `HLSVideoPlayer`:
  - Para Safari/iOS native HLS: `video.src = src` directo.
  - Para Chrome/Firefox/Edge: carga `hls.js@1.5.20` desde CDN (`cdn.jsdelivr.net`) en runtime, no como dep npm — evita issues de bundler con Turbopack.
  - **Forzado agresivo de autoplay** (necesario porque Safari/iOS son inconsistentes con `autoPlay`):
    - Setea `muted/playsInline/webkit-playsinline/autoplay` programáticamente vía property + setAttribute ANTES del src
    - Llama `tryPlay()` en 4 eventos: `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`
    - Listeners globales en `document` (touchstart/click/scroll/keydown con capture) que disparan `tryPlay()` ante CUALQUIER interacción del usuario y se autodestruyen tras el primer intento. Eso garantiza que aunque el browser bloquee el autoplay inicial, apenas el user toca algo el video arranca.
    - Console.warn si `play()` se rechaza, para debug.
  - Wrapper del video tiene mask radial elíptica suave (`#000 30% → 70% → 90% → transparent`) que funde los bordes con el negro del fondo, y animación `hero-v2-water-drift` (16s alternate, scale 1→1.07 + rotación ±0.4°) que suma movimiento orgánico tipo "agua fluyendo".
- **3 capas de overlay** sobre el video (todas con `pointerEvents: none`, dentro del wrapper del video):
  1. **Gradiente de marca**: `linear-gradient(135deg, rgba(254,80,0,0.42), rgba(236,72,153,0.34), rgba(189,75,248,0.42))` con `mixBlendMode: overlay`. Tinta el video con el degradé orange→fucsia→violet sin aplastarlo (zonas claras toman color, zonas oscuras quedan oscuras).
  2. **Bloom radial de color**: 3 halos (naranja 28%/42%, violeta 72%/60%, fucsia 50%/50%) con `mixBlendMode: screen` y animación `hero-v2-color-bloom` (22s alternate, drift ±3% + scale 1→1.06). Movimiento orgánico de "líquido coloreado" independiente del water-drift.
  3. **Ruido SVG turbulence fractal** inline como data-URL (`feTurbulence baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'`), opacity 0.10, `mixBlendMode: overlay`, animación `hero-v2-noise-drift` (28s linear) que mueve `background-position` para que el grano "respire".
- Stagger fade-in-up con keyframes (`hero-v2-fade-in-up`, blur-in 12px→0 + translateY 36px→0). Disparado por IntersectionObserver con delay de 120ms para que se vea correr la animación incluso si el hero está en viewport al cargar (sino React rehidratase con revealed=true antes de que el ojo perciba el estado inicial).
- **Por qué CSS keyframes en vez de transitions React-state**: las transitions con `revealed: false → true` se mostraban "ya animadas" después del SSR rehydrate (el DOM final ya estaba en el destino). Keyframes corren siempre from→to sin importar el state.

### `FeaturesSection` (`app/page.js` ~line 3450) — refactor visual
- **Fondo**: pasó de `#07040f` con blob violeta animado a `#000` plano sin overlays. El dueño explícitamente quiere fondo NEGRO ahí — quitamos los overlays naranja/fucsia que probamos primero porque tintaban hacia vino/rojo. Si querés volver a tintarlo, agregale capas STÁTICAS (sin animación) tipo `linear-gradient(135deg, rgba(254,80,0,0.14), rgba(236,72,153,0.10), rgba(189,75,248,0.16))` con `mixBlendMode: overlay`.
- **Tipografía alineada al hero V2**:
  - Chip "Todo lo que necesitás": `liquid-glass`, fontWeight 600, color blanco 0.65.
  - H2 "Tu club, *completo.*": `fontWeight: 600` (no 900), `clamp(28px, 5vw, 48px)`, `letter-spacing: -0.03em`, `line-height: 1.05`. La palabra "completo." en italic con peso 500.
  - Subtítulo: `fontFamily: FI`, `color: rgba(255,255,255,0.70)`, `clamp(14-17px)`, `maxWidth: 480`. Mismos exact valores del subtext del hero V2.
  - Card title: `fontWeight: 600` (no 800), `letter-spacing: -0.015em`.
  - Card desc: `fontWeight: 400`, `fontFamily: FI`.
- **Composición animada de íconos por card** — reemplaza el cuadradito chico (46×46 con liquid-glass) por una composición full-width de 6 capas del MISMO ícono superpuestas. Container: `width: '100%', height: 110, position: relative, overflow: hidden, marginBottom: 4`, **sin borde propio**.
  - 6 capas del `Icon` de la feature, todas `position: absolute` y centradas con `transform: translate(-50%, -50%)` sobre su ancla `{left, top}`:
    - Background: 104px, opacity 0.08, strokeWidth 0.9, anchor 50%/50%, animación `feature-icon-float-a` 11s.
    - Top-left: 58px, opacity 0.18, strokeWidth 1.2, anchor 16%/28%, animación `feature-icon-float-b` 9s.
    - Top-right: 54px, opacity 0.16, strokeWidth 1.2, anchor 84%/32%, animación `feature-icon-float-c` 10s delay 1s.
    - Bottom-left: 42px, opacity 0.28, strokeWidth 1.5, anchor 26%/74%, animación `feature-icon-float-d` 8s delay 1.6s.
    - Bottom-right: 40px, opacity 0.26, strokeWidth 1.5, anchor 74%/72%, animación `feature-icon-float-a` 8.5s delay 0.8s.
    - **Front** (z-index 2): 40px, opacity full, strokeWidth 2.2, `filter: drop-shadow(0 0 14px ${f.color}cc)`, animación `feature-icon-float-front` 7s.
  - Cada capa usa `willChange: transform` para forzar GPU compositing (sin esto el animation se ve choppy o no corre).
- **Keyframes en `app/globals.css`** (al final del archivo, no en JSX inline porque tenía problemas de timing con SSR/Turbopack — la animación arrancaba antes de que el browser parseara el CSS y se quedaba en frame 0 estático). 5 keyframes definidos:
  ```
  @keyframes feature-icon-float-a — drift (-16px, -22px) + scale 1.20
  @keyframes feature-icon-float-b — drift (20px, 16px) + scale 0.82
  @keyframes feature-icon-float-c — drift (18px, -20px) + scale 1.12
  @keyframes feature-icon-float-d — drift (-22px, 18px) + scale 1.14
  @keyframes feature-icon-float-front — pulse scale 1.12, sin drift
  ```
  Todos chainan dos `translate()`: el primero `(-50%, -50%)` para mantener el centrado base, el segundo en píxeles para el drift. 4 direcciones distintas (NO/NE/SE/SO) hacen que las capas se muevan en parallax.

### `HowItWorksSection` (`app/page.js` ~line 3594) — sin cambios estructurales en este sprint
Ya estaba con HLS videos (3 cards con video de fondo full-bleed Mux + overlay con kicker/título/párrafo, layout asimétrico tipo Nexora). El `_HowItWorksSectionLegacy` queda comentado abajo por si volvemos al scroll-stacking sticky.

### Deploy actual
- Commit live en main: `76a9d4b` ("HeroV2 + FeaturesSection animado", May 1 2026).
- Vercel auto-deploya desde main. Si no se ven los cambios después del push, opciones:
  - Revisar `https://vercel.com/dashboard` para ver si el build pasó (a veces falla por warnings de Next 16 + React 19).
  - Hard refresh `Ctrl+Shift+R` para bypassear cache del browser.
  - **Service Worker `public/sw-push.js`** se registra siempre — puede cachear el HTML viejo. DevTools → Application → Service Workers → Unregister + Storage → Clear site data, o desde la app cerrar la PWA por completo.
  - Agregar `?v=N` al URL para bypass cache de Vercel/CDN.

### Issues conocidos
- **Hydration warning con `cz-shortcut-listen="true"`**: ColorZilla u otra extensión de Chrome modifica el `<body>` antes de que React rehidrate. NO es nuestro código — ignorable o desactivar la extensión en localhost.
- **El sandbox del agent NO puede borrar `.git/index.lock`** en Windows mounts. Si te pasa, podés `mv .git/index.lock .git/index.lock.bak` y el commit suele andar (lo hicimos en este sprint).

## Cambios recientes (sprint may 2026 — autocomplete Google Places)

Reducción de fricción del onboarding: cuando el dueño tipea el nombre de su comercio en el wizard de registro, ahora le sugerimos resultados de Google Maps y al elegir uno se prelena nombre, dirección, teléfono y categoría sugerida.

### Variables de entorno nuevas
- `GOOGLE_PLACES_API_KEY` — server only (sin `NEXT_PUBLIC_`). Va en `.env.local` y en Vercel. Las llamadas a Google se proxyan por nuestros endpoints API para evitar exponer la key, rate-limit por user, y auditar uso.

### Endpoints API
- `app/api/places/autocomplete/route.js` — `POST { input, sessionToken }` → `{ suggestions: [{ placeId, mainText, secondaryText }] }`. Auth guard supabase + rate limit 30/min in-memory por user. Llama a Places API (New) `places:autocomplete` con `X-Goog-FieldMask` (sólo `placeId`, `text`, `structuredFormat` — minimiza el costo). Sesgo a Argentina (`includedRegionCodes: ['ar']`) + locationBias centro La Pampa con 50km de radio. Devuelve lista vacía si Google falla (no rompe el flujo).
- `app/api/places/details/route.js` — `POST { placeId, sessionToken }` → `{ place: { name, address, phone, website, latitude, longitude, openingHours, googleMapsUrl, suggestedCategories, primaryType, types } }`. Auth + rate limit 60/h por user. Llama a Places API (New) `places/{id}` con FieldMask de los campos necesarios. Normaliza el response al schema de `commerces` de Benefix. Mapea `primaryType` y `types` a categorías de Benefix vía `lib/googlePlacesCategoryMap.js`.

### Mapeo de categorías Google → Benefix
`lib/googlePlacesCategoryMap.js` exporta:
- `GOOGLE_TYPE_TO_BENEFIX` — mapa estático con ~50 entries (bakery → Panadería, cafe → Cafetería, restaurant → Restaurante, beauty_salon → Peluquería, barber_shop → Barbería, gym → Gimnasio, pet_store → Pet shop, veterinary_care → Veterinaria, etc.).
- `suggestBenefixCategories(primaryType, types)` — primero intenta `primaryType`; si no matchea, barre `types[]` en orden hasta encontrar uno. Devuelve hasta 3 categorías. Si nada matchea, devuelve `[]` y el dueño elige manualmente.

### Componente frontend `lib/PlacesAutocomplete.js`
- Input con icono Search a la izquierda + spinner a la derecha cuando está cargando.
- Debounce 300ms en `onChange` antes de pegarle al endpoint.
- Dropdown de sugerencias estilo glass (bg `rgba(20,12,32,0.96)` + `backdropFilter: blur(16px) saturate(160%)`) con cada fila mostrando MapPin violeta + `mainText` (negrita) + `secondaryText` (gris) — patrón Benefix.
- **Session token**: UUID v4 generado al montar (vía `crypto.randomUUID()`). Pasa en TODAS las llamadas al backend. Se regenera tras cada selección exitosa O si pasaron > 3 minutos sin actividad. Esto agrupa autocomplete + details en una sola sesión Google → cobro mucho más barato.
- `pointerEvents: none` en el spinner para no bloquear input.
- Si Google falla, muestra mensaje suave "No pudimos buscar ahora — seguí escribiendo a mano" y el flujo manual sigue. NUNCA crashea el wizard.
- `onPlaceSelected(place)` callback al elegir una sugerencia — el padre decide qué hacer con los datos.

### Integración en `RegisterCommerceView` (wizard de registro)
- Reemplaza el `<input>` simple del Paso 2 ("¿Cómo se llama tu negocio?") por el `<PlacesAutocomplete>`.
- Al elegir una sugerencia, `handleGooglePlaceSelected` prelena `form.name`, `form.address`, `form.phone`, y si la primera categoría sugerida matchea con `COMMERCE_FAMILIES` la usa como `form.category`.
- Banner "Datos importados de Google Maps" aparece debajo del input cuando hay datos importados — bg violeta tenue + border violeta + ícono CheckCircle violeta. Tiene un botón pequeño "Empezar de cero" que limpia los campos y ese banner.
- City/province NO se prelenan automáticamente — Google los devuelve en `addressComponents` pero las listas de Benefix son enums fijos en `LOCATIONS` y los matches no son siempre 1:1; el dueño los confirma en el step 4 (ubicación).

### Tabla de auditoría `google_places_usage`
Migration aplicada:
```sql
CREATE TABLE google_places_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      text NOT NULL CHECK (endpoint IN ('autocomplete', 'details')),
  session_token text NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
)
```
Index por `(user_id, created_at DESC)` y partial por `session_token` cuando no es null. RLS: cada user ve su propio uso (`SELECT TO authenticated USING user_id = auth.uid()`). Inserts vía service role desde los endpoints (fire-and-forget, no bloquean la respuesta si fallan). Permite auditar uso real, calcular costo aproximado, detectar abusos.

### Cómo agregar la env var en Vercel
1. Ir a `vercel.com/dashboard` → proyecto Benefix → Settings → Environment Variables.
2. Añadir `GOOGLE_PLACES_API_KEY` con scope **Production + Preview + Development**.
3. Redeploy (o esperar al próximo push).

### Restricciones de seguridad
- La API key NUNCA viaja al cliente. Si en algún momento querés usar el SDK JS de Google directo (caso raro), generá una key separada con HTTP referrer restrictions a `*.benefix.com.ar` — pero hoy todo va por backend.
- El rate-limit es por user (no por IP) y vive en memoria del proceso. En multi-instancia conviene migrar a Redis o a una tabla en Postgres con TTL.
- Si Google está caído, el wizard sigue funcionando sin importar (degradación graceful).

## Cambios recientes (sprint may 2026 — user_intent + diferenciación cliente/comerciante)

Capturamos al onboarding qué quiere hacer el usuario (cliente vs comerciante vs ambos) y diferenciamos la experiencia según esa elección. Antes todos los users que crearon cuenta para registrar un comercio terminaban con `role: commerce_owner` y veían todo el chrome del dueño en el navbar — confundía a los que después querían usar la app como cliente, y a los clientes nuevos que no sabían si los íconos del ojo/comercio les servían.

### Migration aplicada
```sql
ALTER TABLE profiles
  ADD COLUMN user_intent text
    CHECK (user_intent IS NULL OR user_intent IN ('client', 'merchant', 'both'))
    DEFAULT NULL;
ALTER TABLE profiles
  ADD COLUMN intent_prompt_shown boolean NOT NULL DEFAULT false;
```
Default `NULL` para no forzar re-onboarding a users existentes. La UI los trata según sus comercios:
- Tiene comercio (role='commerce_owner') → trato como `merchant` implícito (muestra Eye + Store).
- No tiene comercio (role='client') → trato como `client` implícito.
- Si entran y `intent_prompt_shown=false` → les mostramos el step UNA vez y persistimos el resultado.

### Nuevo componente `lib/IntentPickerView.js`
Pantalla full-screen con greeting personalizado ("¡Hola, {nombre}!") + 3 cards verticales:
- **Soy cliente** (fucsia, ShoppingBag) — "Quiero acumular puntos y aprovechar beneficios."
- **Soy comerciante** (violeta de marca, Store) — "Quiero crear mi club y fidelizar a mis clientes."
- **Las dos cosas** (ámbar, Sparkles) — "Tengo un comercio y también soy cliente de otros."

Cards con gradient suave del color identidad, hover con borde más fuerte + lift de 2px, animación stagger fadeUp 80ms entre cards. Botón X arriba a la derecha y "Después decido" abajo — los dos disparan `onSkip` que persiste `intent_prompt_shown=true` sin tocar `user_intent`.

### Hookeo en `app/page.js > AppRoot`
Render condicional ANTES del return principal:
```js
if (user && profile && !profile.user_intent && !profile.intent_prompt_shown && !skipIntentForViews.includes(view)) {
  return <IntentPickerView ... />
}
```
- `skipIntentForViews = ['register-commerce', 'commerce-settings']` — no interrumpe a quien ya viene navegando explícitamente a esos flujos.
- `handleIntentChoose(intent)` → `UPDATE profiles SET user_intent=intent, intent_prompt_shown=true` + `loadProfile()` + `navigate()`:
  - `merchant` o `both` → wizard `register-commerce`
  - `client` → vista `client` (Mi billetera)
- `handleIntentSkip()` → solo setea `intent_prompt_shown=true`, no toca `user_intent`. La próxima vez no aparece más.

### Navbar: gate de Eye + Store
En `function Navbar`:
```js
const userIntent   = profile?.user_intent || null
const showOwnerKit = role === 'commerce_owner' && userIntent !== 'client'
```
- `role === 'commerce_owner' && userIntent !== 'client'` → muestra los íconos Eye + Store (kit dueño).
- Caso contrario → branch del cliente (sin Eye + Store).
- Cubre el caso "soy commerce_owner pero quiero usar la app como cliente" (auto-promoción rara): si seteas `user_intent='client'` se ocultan los íconos del kit dueño aunque tengas comercios.

### Item nuevo en `ClientView > tab='cuenta'`
Card grande arriba de "Cerrar sesión / Eliminar cuenta" cuando `profile.role !== 'commerce_owner'`:
- Background gradient violeta tenue + border violeta.
- Ícono Store en círculo gradient violeta brillante con sombra.
- Título "¿Tenés un comercio?" + subtítulo "Sumá tu club y empezá a fidelizar a tus clientes."
- ChevronRight a la derecha.
- Click → `setView('register-commerce')`.

### Auto-promoción de user_intent al crear comercio (`/api/register-commerce`)
Cuando un user toca "Sumar tu club" desde ese item del menú de perfil y completa el wizard:
- `user_intent` actual `NULL` → pasa a `'merchant'` (no había elegido nada).
- `user_intent` actual `'client'` → pasa a `'both'` (era cliente que decidió abrir su negocio).
- `user_intent` actual `'merchant'` o `'both'` → no se toca.
- También se setea `intent_prompt_shown=true` (decisión consciente).
- `role` pasa a `'commerce_owner'` como ya hacía antes.

### Restricciones cumplidas
- **No rompe users existentes**: `user_intent=NULL` + tienen comercios → siguen viendo Eye + Store sin cambios. Solo se les muestra el prompt UNA vez (siempre que no tengan `intent_prompt_shown=true`).
- **No es bloqueante eterno**: el botón X y "Después decido" cierran y marcan shown.
- **Camino de upgrade preservado**: cualquier cliente puede abrir su comercio desde el menú de perfil (independiente del intent que haya elegido).

## Cambios recientes (sprint may 2026 — premios obligatorios)

Sistema de 3 capas para empujar a los comerciantes a cargar al menos un premio cuando activan su sistema de fidelización. Síntoma a evitar: clientes acumulando estrellas/puntos en un club sin premios para canjear → frustración → churn silencioso.

### Capa 1 — Sugerencias por rubro (helper + modal)

**`lib/suggestedPrizesByCategory.js`** (helper, ~270 líneas):
- Mapa `SUGGESTED_PRIZES` con plantillas de premios típicos por categoría de Benefix. Cubre ~50 rubros (Cafetería, Restaurante, Bar, Pizzería, Heladería, Panadería, Rotisería, Cervecería, Vinería, Food truck, Kiosco, Almacén, Mini market, Supermercado, Verdulería, Carnicería, Pescadería, Pollería, Fiambrería, Dietética, Librería, Papelería, Ferretería, Pinturería, Bicicletería, Pet shop, Barbería, Peluquería, Manicura, Estética, Spa, Tatuajes, Depilación, Farmacia, Óptica, Kinesiología, Nutrición, Psicología, Odontología, Veterinaria, Indumentaria, Calzado, Lavandería, Tintorería, Lavadero, Gimnasio, Yoga/Pilates, Idiomas, Música, etc.) + `_default`.
- Cada entry: array de `{ name, cost }`. Cost expresado en estrellas (sistema base); para points se multiplica por 100 (1 estrella ≈ 100 puntos, mismo orden de magnitud que 1pto = 1$).
- `getSuggestedPrizes(categories, systemType)` — itera `categories[]` en orden, devuelve los premios del primer match. Fallback `_default`. Devuelve `{ name, cost, system_type }` — el cost ya escalado al sistema elegido.

**`lib/SuggestedPrizesModal.js`** (componente, ~210 líneas):
- Modal full-screen con overlay glass.
- Header: ícono Gift en círculo gradient sysColor + título "Tus clientes ya pueden acumular {unitLabel}" + subtítulo "¿Qué van a poder canjear?"
- Copy contextual: "Estos son premios típicos para {category}. Podés agregarlos con un click y editarlos después, o cargar los tuyos desde cero."
- Lista de cards de premios sugeridos. Cada card: ícono de unidad (★/◆), nombre, costo, botón "+ Agregar" individual (cambia a "✓ Agregado" verde una vez agregado).
- 2 botones grandes abajo: "Agregar todos los sugeridos" (gradient sysColor) + "Cargar los míos desde cero" (cierra modal).
- Props: `open, onClose, categories, systemType, onAddOne, onAddAll, busy, addedPrizeNames`. El padre maneja los inserts reales y le pasa el `Set<string>` de nombres ya agregados para deshabilitar los botones individuales sin cerrar el modal.

### Capa 2 — Estado vacío conversacional en pestaña Premios (`app/page.js`)

Cuando `prizes.filter(p => p.active && p.system_type === currentSystem).length === 0`, en lugar del placeholder plano "No hay premios todavía", aparece una card destacada:
- Ícono Gift grande en círculo gradient sysColor con sombra.
- Título: "Tu sistema de {estrellas|puntos} está activo, pero no hay premios para canjear"
- Body: "Tus clientes ya están sumando {unit} con cada compra. Cargá al menos un premio para que puedan empezar a canjear."
- **Línea de urgencia condicional**: si hay clientes con balance > 0 ("3 clientes ya acumularon estrellas en tu club."), aparece en color del sistema con peso 700.
- 2 CTAs apilados:
  1. **"Crear mi primer premio"** — gradient G de marca, abre `createPrizeOpen=true` (wizard de premio).
  2. **"Ver premios sugeridos para mi rubro"** — secundario, abre `SuggestedPrizesModal` con `addedSuggestedNames=new Set()` (reset cada vez que se abre).

State + handlers en `CommerceSettingsView`:
- `suggestedPrizesModalOpen` (bool), `addedSuggestedNames` (Set<string>), `addingSuggested` (bool).
- `addSuggestedPrizeOne(suggested)` — insert directo a `prizes` con `commerce_id, system_type, name, cost, active=true`. Actualiza `setPrizes` y agrega el nombre al Set. Respeta `perms.max_rewards`.
- `addSuggestedPrizesAll(prizesArr)` — itera y hace insert en serie. Respeta el tope del plan (sale del loop si llega al límite). Cierra el modal al final.

### Capa 3 — Cron diario `no_prizes_warning` (notif al dueño)

**`app/api/admin/check-empty-prize-clubs/route.js`** (GET y POST):
- Auth: header `Authorization: Bearer ${CRON_SECRET}`. Vercel Cron lo inyecta automáticamente cuando la env var existe.
- Lógica por cada commerce con `active=true`:
  1. Cuenta `prizes` activos del sistema actual (filtro por `system_type`). Si > 0 → skip.
  2. Cuenta `memberships` con balance > 0 (columna `stars` o `points` según `prog_type`). Si 0 → skip.
  3. Throttle: ¿ya enviamos `no_prizes_warning` al `owner_id` en los últimos 7 días? Si sí → skip.
  4. Insert en `notifications` con type `no_prizes_warning`, title "Tus clientes están acumulando sin nada para canjear", body con N clientes con balance, link `/comercio/recompensas`, metadata `{ clients_with_balance, system, commerce_id, commerce_name }`.
- Devuelve stats `{ checked, notified, skipped_throttle, skipped_no_clients, skipped_has_prizes }`.

**`vercel.json`** — agregado bloque `crons`:
```json
"crons": [
  { "path": "/api/admin/check-empty-prize-clubs", "schedule": "0 14 * * *" }
]
```
Schedule: todos los días a las 14:00 UTC (11:00 ART). Vercel garantiza ejecución at-least-once; el throttle de 7 días absorbe duplicados eventuales.

**`lib/NotificationsBell.js`** — mapeo agregado:
- `TYPE_ICON.no_prizes_warning = Gift`
- `TYPE_COLOR.no_prizes_warning = '#BD4BF8'` (violeta de marca, alerta no agresiva).

### Env vars y deploy
- Setear `CRON_SECRET` en Vercel (production). Sin ella el endpoint devuelve 401 y el cron no ejecuta nada.
- Después del primer deploy, Vercel registra el cron automáticamente. Verificación: `vercel.com/dashboard` → proyecto → Cron Jobs.
- Para correr manualmente: `curl -X POST https://benefix.com.ar/api/admin/check-empty-prize-clubs -H "Authorization: Bearer $CRON_SECRET"`.

### Lo que NO hace (intencional)
- No envía push del navegador (solo notif in-app). El push se dispara desde el componente `NotificationsBell` cuando renderea — el cron NO llama `web-push` directamente. Si querés push, hay que agregarlo al final del insert.
- No insiste todos los días: throttle de 7 días por owner. Si el dueño ignora la primera notif, espera una semana antes de la próxima.
- No bloquea la operación del comercio. El sistema sigue activo y los clientes siguen acumulando — la notif es un nudge.

## Cambios recientes (sprint jul 2026 — restyling landing)

Restyling completo de la landing pública (`lib/HomePublic.js`, rewrite total). Referencias: templates Optimus (estética general) y Homie (mecánica del hero), en `E:\clufix template web`.

### Sistema de diseño claro (tokens `--lx-*` en `app/globals.css`)
- Giro a **fondo claro**: crema `#FAF7F2`, cards blancas, lavanda `#F0E8FF` en secciones alternas. Violeta `#6F30DF` como color de acción, magenta `#FF199F` solo micro-acentos. El violeta profundo `#1A0050` queda reservado a 2 momentos: oferta fundador y CTA final + footer.
- Tipografía: **Bricolage Grotesque** (headlines, weights 600-800 — Nacho descartó el serif por falta de personalidad; OJO: no tiene itálica, los acentos van por color o `.lx-grad-text`) + **Instrument Sans** (cuerpo) + **JetBrains Mono** (eyebrows/labels). El token `--lx-serif` apunta a Bricolage (nombre legacy). Cargadas en `app/layout.js` junto a las fuentes legacy. Fin del all-caps condensed.
- Patrones Optimus: radius chico (6px), grid-lines sutiles, noise overlay (`.lx-noise`), eyebrows mono con guión, hover-lift, marquee. Keyframes: `lx-char-in`, `lx-fade-up`, `lx-rise`, `lx-marquee`, `lx-progress` (con bloque `prefers-reduced-motion`).

### Hero (mecánica Homie LITERAL — iterado con Nacho, v2)
- **Media full-bleed** que ocupa todo el viewport y se achica al scroll con los MISMOS valores de Homie: scale 1→0.85, borderRadius 0→48px, height 100svh→62.5svh (easing quad/cubic + rAF suavizado). Hoy es gradiente violeta de marca + noise; hay const **`HERO_VIDEO_URL`** (vacía) esperando el clip definitivo — al llenarla renderea `<video>` full-bleed con overlay de contraste.
- Headline blanco encima del media: "La tarjeta de fidelidad, / sin tarjeta." (acento en magenta) + línea mono con rubro rotativo (char-in por letra) + CTAs (blanco sólido + ghost).
- **Wordmark "clufix" gigante** (Bricolage 800, ~24vw) anclado al fondo del viewport, z entre el media y el contenido: cae (`translateY(p*150)`) y se apaga (`opacity 1-p*0.8`) al scrollear — calcado de Homie.
- **PhoneMock** (CSS puro: wallet card + ticket troquelado con QR falso determinístico `FakeQR`, seed fija para SSR) entra elevándose (`lx-rise`) por DELANTE del wordmark.
- Nav adaptable: texto claro sobre el hero violeta, pasa a tinta + fondo crema blur al scrollear.
- `StatsMarquee` como strip separado después del hero (+240 membresías, +100 canjes...). Actualizar números de vez en cuando.

### Estructura nueva de secciones
hero → producto en pantalla (`PanelMock` + `PhoneMock`) → cómo funciona comercio (3 pasos I/II/III) → strip cliente (lavanda, compacto) → funcionalidades (6 cards) → rubros → **fundador (oscura)** → planes → testimonios → CTA final (oscura) → footer completo.

### Fixes de conversión
- **Bug pricing anónimo arreglado**: la card Pro ya no dice "Estás en este plan / Tu plan actual" a visitantes. CTAs por plan: "Crear mi club gratis" / "Empezar con Starter" / "Empezar con Pro".
- WhatsApp real (5492302351158) como CTA secundario en hero, CTA final y footer (`WA_URL`).
- Footer completo: producto / ayuda / legal (términos, privacidad) / demo + "Hecho en La Pampa".
- **`app/not-found.js` nuevo**: 404 diseñada con el sistema de la landing (server component).
- **`InstallPrompt` diferido en home**: acepta prop `currentView`; en `home` no aparece hasta scrollear > 1.2 viewports (state `engaged`). En el resto de las vistas, comportamiento de siempre.
- El preloader `LoadingScreen` ya estaba desactivado (`isAppLoading` arranca en `false`) — no se tocó.

### ⚠️ Escritura de archivos desde el agent (Windows mount)
Los writes largos con las file-tools del agent sobre este mount **truncan archivos** (pasó con `page.js`, `layout.js` y `HomePublic.js` en este sprint, y ya había pasado antes — ver commit 0ed872f). Workaround confiable: escribir a `/tmp` del sandbox (heredoc/python) y copiar con `cp` desde el mount de bash, verificando con `cmp`. SIEMPRE verificar `wc -l` / parse después de escribir archivos grandes.

### Pendientes del restyling
- El logo script (`/clufix_logo.svg`, blanco+magenta) no lee sobre claro — en nav va dentro de un chip oscuro. Considerar variante del logo para fondo claro.
- Fotos reales para testimonios si se consiguen.
- La app interna (panel/cliente) sigue con la identidad oscura — la migración de la app al sistema claro es un sprint aparte (los tokens `--lx-*` ya quedan disponibles).
- QA visual responsive pendiente de correr en local (`npm run dev`) — el sandbox del agent no pudo ejecutar el build de Next (binario SWC de Windows).

## Cómo trabaja el dueño (Nacho)

- Itera mucho sobre UX, le gusta debatir antes de codear cuando el cambio es estructural
- Estilo conversacional, en castellano rioplatense, sin emojis salvo que él los use primero
- Prefiere coherencia visual a través de la app (mismo lenguaje en titulares, mismos patrones)
- Se mueve entre dueño-comercio y cliente-socio según contexto

# userEmail
sitiospampa@gmail.com (también tiene cuenta admin: arquitectotolosa@gmail.com)

# currentDate
Tomar fecha real del sistema vía `bash` si es relevante.
