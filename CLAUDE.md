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

## Cómo trabaja el dueño (Nacho)

- Itera mucho sobre UX, le gusta debatir antes de codear cuando el cambio es estructural
- Estilo conversacional, en castellano rioplatense, sin emojis salvo que él los use primero
- Prefiere coherencia visual a través de la app (mismo lenguaje en titulares, mismos patrones)
- Se mueve entre dueño-comercio y cliente-socio según contexto

# userEmail
sitiospampa@gmail.com (también tiene cuenta admin: arquitectotolosa@gmail.com)

# currentDate
Tomar fecha real del sistema vía `bash` si es relevante.
