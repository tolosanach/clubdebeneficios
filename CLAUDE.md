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

## Cómo trabaja el dueño (Nacho)

- Itera mucho sobre UX, le gusta debatir antes de codear cuando el cambio es estructural
- Estilo conversacional, en castellano rioplatense, sin emojis salvo que él los use primero
- Prefiere coherencia visual a través de la app (mismo lenguaje en titulares, mismos patrones)
- Se mueve entre dueño-comercio y cliente-socio según contexto

# userEmail
sitiospampa@gmail.com (también tiene cuenta admin: arquitectotolosa@gmail.com)

# currentDate
Tomar fecha real del sistema vía `bash` si es relevante.
