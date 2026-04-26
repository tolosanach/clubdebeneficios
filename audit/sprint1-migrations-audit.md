# Sprint 1 — Auditoría de migraciones SQL

**Fecha:** 2026-04-24
**Proyecto Supabase:** `wcqhapsgwjivtzdseqjz` (Club-de-beneficios, ACTIVE_HEALTHY, Postgres 17.6)
**Org:** `sjgypwtdhyyafhqhuxzd`
**Autor del audit:** Claude (Cowork mode) — corrida contra DB real vía Supabase MCP

---

## 1. Resumen ejecutivo

- **12 archivos SQL** en el repo previos al audit (1 schema base + 11 migraciones). Todos en raíz, no hay `supabase/migrations/`.
- **11 de 11 migraciones previas** aplicadas, **una de ellas a medias** (`supabase-migration-v3.sql`).
- **1 bug crítico de producción** detectado y corregido: `app/api/redeem/route.js` insertaba `membership_id` en `redemptions`, pero esa columna nunca había llegado a la DB → todo canje fallaba con `column "membership_id" does not exist`. La tabla `redemptions` tenía 0 filas, consistente con el síntoma.
- **4 migraciones nuevas creadas y aplicadas en este audit**:
  - `supabase-migration-v9.sql` / `v9_redemptions_membership_status` — reconcilia el delta de v3.
  - `supabase-migration-v10.sql` / `v10_drop_orphan_coupons` — elimina la tabla huérfana `coupons`.
  - `supabase-migration-v11.sql` / `v11_debit_membership_balance_rpc` — RPC para débito atómico de balance (fix de race condition en `/api/redeem`).
  - `supabase-migration-v12.sql` / `v12_rls_close_holes_and_dedupe` — cierra holes RLS en `visits`/`client_promotions`, fixea premios inactivos visibles públicamente, dropea policies duplicadas.
- **5 archivos de código modificados**:
  - `app/api/scan/route.js` — UPSERT race-safe + `status='active'` al registrar visita.
  - `app/api/redeem/route.js` — débito atómico via RPC (fix de race + ya estaba el fix de la columna `membership_id`).
  - `app/api/user/delete/route.js` — chequeo previo de ownership de comercio para evitar 500 críptico (FK `commerces.owner_id` es NO ACTION).
  - `app/api/save-commerce-config/route.js` — partial-update safe: solo incluye keys presentes en el body en vez de nullear los no enviados.
  - `app/api/register-commerce/route.js` — race-recovery: retry con suffix random si otro registro ganó el slug simultáneamente (catch 23505).
- **Caso `brand_color`**: el reporte previo se equivocó. El archivo `supabase-migration-v8.sql` ya existía en el repo y la columna ya estaba en la DB. No se creó nada nuevo.
- **Dry-run end-to-end de canje**: positive + negative test passing. La FK `redemptions_membership_id_fkey` rechaza UUIDs inválidos; el INSERT con la shape de `app/api/redeem/route.js` funciona y `status` defaultea a `'confirmed'`.

---

## 2. Inventario de archivos SQL

| # | Archivo | Una línea | Estado pre-audit |
|---|---|---|---|
| 0 | `supabase-schema.sql` | Setup base: cities, commerces, profiles, memberships, visits, redemptions, prizes, promotions, commerce_activity + RLS + trigger `handle_new_user`. | ✅ Aplicado |
| 1 | `supabase-migration.sql` | Recrea prizes/promotions/commerce_activity con `IF NOT EXISTS`; agrega columnas a memberships/profiles/visits/redemptions/commerces. | ✅ Aplicado |
| 2 | `supabase-migration-v2.sql` | `commerces.cover_image/address/lat/lng/instagram/facebook`; `memberships.status`. | ✅ Aplicado |
| 3 | `supabase-migration-reviews.sql` | Tabla `reviews` + índices + RLS. | ✅ Aplicado |
| 4 | `supabase-migration-onboarding.sql` | `profiles.phone/city/province/country/onboarding_completed`. | ✅ Aplicado |
| 5 | `supabase-migration-v3.sql` | `commerces.prog_pts/city_name/province/country`; `redemptions.membership_id/status` + 2 índices; `promotions.expiration_*`; tabla `client_promotions` + indices + RLS + función `mark_expired_promotions()`. | ⚠️ **Parcial — faltaba la parte de redemptions** |
| 6 | `supabase-migration-terms.sql` | `profiles.terms_accepted_at`. | ✅ Aplicado |
| 7 | `supabase-migration-v4.sql` | `commerces.hours_structured JSONB`. | ✅ Aplicado |
| 8 | `supabase-migration-v5.sql` | `commerces.phone`. | ✅ Aplicado |
| 9 | `supabase-migration-v6.sql` | FK `redemptions.prize_id → prizes.id ON DELETE SET NULL`. | ✅ Aplicado |
| 10 | `supabase-migration-v7.sql` | Data migration: normaliza `commerces.category` a nombres display. | ✅ Aplicado |
| 11 | `supabase-migration-v8.sql` | `commerces.brand_color TEXT`. | ✅ Aplicado |
| 12 | **`supabase-migration-v9.sql`** *(nuevo en este audit)* | Reconcilia el delta de v3: `redemptions.membership_id/status` + 2 índices. | ✅ Aplicado en este audit |
| 13 | **`supabase-migration-v10.sql`** *(nuevo en este audit)* | Drop de la tabla huérfana `coupons`. | ✅ Aplicado en este audit |
| 14 | **`supabase-migration-v11.sql`** *(nuevo en este audit)* | RPC `debit_membership_balance(membership_id, amount, column)` para débito atómico. | ✅ Aplicado en este audit |
| 15 | **`supabase-migration-v12.sql`** *(nuevo en este audit)* | Cierra holes RLS (visits, client_promotions) + drop de policies duplicadas (prizes, commerce_activity) + fix de premios inactivos visibles. | ✅ Aplicado en este audit |

---

## 3. Schema verificado (post-audit)

### `cities` (4 filas)
`id, slug, name, province, active, created_at`

### `commerces` (6 filas)
`id, city_id, name, category, description, emoji, img_url, plan, featured, rating, prog_type, prog_goal, prog_discount, reward_text, reward_color, active, owner_id, created_at, slug, onboarding_done, cover_image, address, lat, lng, instagram, facebook, prog_pts, city_name, province, country, hours_structured, phone, brand_color`

FKs: `city_id → cities.id`, `owner_id → auth.users.id`.

### `profiles` (2 filas)
`id, name, email, avatar_url, role, created_at, full_name, phone, onboarding_completed, city, country, province, terms_accepted_at`

FK: `id → auth.users.id`.

### `memberships` (5 filas)
`id, user_id, commerce_id, member_number, joined_at, points, stars, visits_count, last_visit, phone, status`

FKs: `user_id → profiles.id`, `commerce_id → commerces.id`.

### `visits` (0 filas)
`id, user_id, commerce_id, amount_spent, scanned_by, scanned_at, points_earned, visited_at`

FKs: `user_id → profiles.id`, `commerce_id → commerces.id`, `scanned_by → auth.users.id`.

### `redemptions` (0 filas) — **post-v9**
`id, user_id, commerce_id, redeemed_at, prize_id, points_spent, created_at, membership_id, status`

FKs: `user_id → profiles.id`, `commerce_id → commerces.id ON DELETE CASCADE`, `prize_id → prizes.id ON DELETE SET NULL`, **`membership_id → memberships.id ON DELETE CASCADE` (nuevo)**.

Índices: `redemptions_pkey`, **`idx_redemptions_membership` (nuevo)**, **`idx_redemptions_commerce(commerce_id, created_at DESC)` (nuevo)**.

### `prizes` (11 filas)
`id, commerce_id, name, description, cost, active, created_at, img_url, stock`

FK: `commerce_id → commerces.id`.

### `promotions` (5 filas)
`id, commerce_id, description, type, value, active, expires_at, created_at, days, expiration_type, expiration_date, expiration_days`

FK: `commerce_id → commerces.id`.

### `client_promotions` (2 filas)
`id, promotion_id, membership_id, granted_at, expires_at, used_at, status, created_at`

FKs: `promotion_id → promotions.id`, `membership_id → memberships.id`.

### `reviews` (0 filas)
`id, user_id, commerce_id, membership_id, rating, comment, created_at`

FKs: `user_id → auth.users.id`, `commerce_id → commerces.id`, `membership_id → memberships.id`.

Funciones presentes: `handle_new_user`, `get_member_progress`, `mark_expired_promotions`.

---

## 4. Cambios aplicados en este audit

### 4.1 `supabase-migration-v9.sql` — reconciliación de v3 sobre `redemptions`

```sql
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS membership_id UUID;
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';

DO $$ BEGIN
  ALTER TABLE redemptions
    ADD CONSTRAINT redemptions_membership_id_fkey
    FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_redemptions_membership ON redemptions(membership_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_commerce   ON redemptions(commerce_id, created_at DESC);
```

**Aplicación:** vía `apply_migration` (Supabase MCP). Versión `20260425022538`. Resultado `success`.

**Verificación post-aplicación:**
- ✅ Columna `redemptions.membership_id` UUID nullable presente.
- ✅ Columna `redemptions.status` TEXT default `'confirmed'::text` presente.
- ✅ FK `redemptions_membership_id_fkey` → memberships(id) ON DELETE CASCADE presente.
- ✅ Índices `idx_redemptions_membership` y `idx_redemptions_commerce` presentes.

**Sin data loss:** `redemptions` estaba en 0 filas (consistente con que las inserciones fallaban hace tiempo).

### 4.2 `supabase-migration-v10.sql` — drop de tabla huérfana `coupons`

```sql
DROP TABLE IF EXISTS coupons;
```

**Aplicación:** vía `apply_migration` (Supabase MCP). Nombre `v10_drop_orphan_coupons`. Resultado `success`.

**Justificación documentada:** la tabla no estaba creada por ninguna migración del repo, no la referenciaba código alguno (`app/api/**`, ni el resto), 0 filas, 0 vistas dependientes, 0 constraints externos hacia ella. Verificación post-aplicación: `coupons` no aparece en `information_schema.tables`. Sin data loss.

### 4.3 Dry-run end-to-end del flujo de canje

Después de aplicar v9, simulé el `INSERT INTO redemptions` exacto que hace `app/api/redeem/route.js` línea 66-72:

| Test | Resultado |
|---|---|
| **Positive** — INSERT con shape real (membership existente, prize del mismo comercio, points_spent = prize.cost) | ✅ INSERT OK. `status` defaulteó a `'confirmed'`. FKs resolvieron a "Heladería Coppola" / "1/4 kg gratis" / `sitiospampa@gmail.com`. |
| **Negative** — INSERT con `membership_id = 00000000-...` | ✅ Rechazado: `ERROR 23503: violates foreign key constraint "redemptions_membership_id_fkey"`. |
| **Cleanup** | ✅ DELETE de la fila de prueba; `redemptions` vuelve a 0 filas. |

Confirmado: el bug crítico de canjes está cerrado y la integridad referencial funciona como se espera.

---

## 5. Hallazgos no accionados (flagueados para próximos sprints)

Lista intencionalmente **no** tocada en este sprint, según las reglas del audit:

- ~~**Tabla `coupons`**~~ — **Resuelto en este audit** (sección 4.2): dropeada vía `supabase-migration-v10.sql`.
- **Decisión arquitectural pendiente sobre FKs hacia `auth.users.id`** — `commerces.owner_id` y `visits.scanned_by` quedan como `NO ACTION`. La app ahora maneja graciosamente el caso de owner intentando borrar cuenta (sección 5b.5), pero falta decidir: ¿cuando un owner se borra, qué pasa con su comercio? Opciones: SET NULL (deja huérfano), CASCADE (borra comercio + memberships + visits + redemptions de todos sus clientes — destructivo), o mantener NO ACTION (forzar al owner a borrar comercio antes). Decisión en sprint siguiente.
- **Sin self-service de "eliminar comercio" para el comerciante** — Verificación de la app confirmó: no existe ningún endpoint ni UI para que un comerciante borre su propio comercio. El admin tiene "Suspender" (set `active=false`, reversible) y "Aprobar" en el panel admin, pero nada borra de verdad. **Decisión tomada (post-MVP review)**: dejarlo así durante MVP. Si un comerciante quiere irse, lo maneja manualmente el dueño del proyecto vía Supabase. Reevaluar tras el lanzamiento si aparece fricción real.
- **`redemptions.redeemed_at`** — columna legacy no contemplada por ninguna migración del repo. Coexiste con `created_at`. Inocua, queda quieta.
- **`prizes.description`** — extra en DB, no en migraciones. Inocua. Si se va a usar en la UI, conviene migración formal para futuros entornos.
- **`memberships.full_name`** — declarada en `supabase-schema.sql` línea 109, nunca aplicada (la `migration.sql` no la incluye), app no la usa (usa `profiles.full_name` por FK). Dead-code, sin acción.
- **`promotions.value` default = 10** — el default real es 10, en `migration.sql` figura 0. Cambio manual histórico. Inocuo.
- **`profiles.terms_accepted_at`** es `timestamp without time zone`, mientras todo lo demás en el schema es `timestamptz`. Coincide con la migración (`TIMESTAMP`) pero es inconsistente. Cambio futuro candidato.
- **`supabase-migration-v6.sql`** usa `ADD CONSTRAINT` sin guardia `DO/EXCEPTION` — si se vuelve a correr contra una DB que ya tenga la FK, falla. Funciona en este entorno pero conviene patron `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` en el próximo refactor.
- **Sin migration tracking pre-audit** — Supabase reportaba 0 migraciones registradas. El equipo venía aplicando SQL directo al SQL Editor. Con `apply_migration` (que se usó para v9) el proyecto empieza a tener historial. Recomendación: registrar de aquí en más todas las migraciones nuevas vía Supabase CLI o el MCP.

---

## 5b. Hardening de cierre de Sprint 1

Tras el cierre de la auditoría de migraciones se ejecutó un round de hardening adicional sobre código + RLS, autorizado por el dueño del proyecto.

### 5b.1 RLS audit — holes cerrados y limpieza

Verificación de policies con `SELECT * FROM pg_policies` reveló:

**Holes reales:**
- `visits.visits_service_insert` con `WITH CHECK (true)` aplicada a `{public}` → cualquier usuario autenticado podía hacer `supabase.from('visits').insert(...)` con anon key falseando visitas para cualquier `user_id`. Toda escritura real va por `/api/scan` con service-role, así que la policy permisiva era pura superficie de ataque.
- `client_promotions.cp_service_insert` y `cp_service_update` — mismo patrón.

**Bug de lectura:**
- `prizes` tenía dos policies SELECT PERMISSIVE OR-combinadas: `"prizes are public"` con `USING (true)` y `"prizes_public_read"` con `USING (active = true)`. El OR efectivo era `true`, dejando premios inactivos visibles públicamente.

**Duplicados (mismo efecto):**
- `prizes` tenía `"owners manage prizes"` ALL + 3 policies separadas insert/update/delete con misma condición.
- `commerce_activity` tenía `"owners insert activity"` + `activity_owner_insert` y `"owners read activity"` + `activity_owner_read`.

**Fix:** `supabase-migration-v12.sql` / `v12_rls_close_holes_and_dedupe`. DROP de las 7 policies problemáticas. Resultado: service-role sigue escribiendo (bypassea RLS), client-side anon/auth solo puede leer/insertar lo que las policies legítimas permiten.

Verificación post-aplicación: `pg_policies` confirma la limpieza. Las 4 tablas afectadas quedan con sus policies legítimas únicamente.

### 5b.2 `memberships.status` quedaba en 'pending' eternamente

Cualquier membresía creada por `/api/scan` (auto-create al primer escaneo) heredaba el default `'pending'` del schema base, y nada la pasaba a `'active'` después. Ningún componente del front lo consume hoy, pero el schema documentaba la semántica `pending = sin visitar / active = visitó al menos una vez` y la migración v2 hizo backfill *one-shot*.

**Fix (código):** en `app/api/scan/route.js` el UPDATE post-visita ahora setea `status: 'active'` (idempotente).

### 5b.3 Race condition: get-or-insert membership en `/api/scan`

Dos scans concurrentes del mismo `(user_id, commerce_id)` pasaban ambos el chequeo "no existe" y los dos intentaban INSERT. El UNIQUE rescataba (uno tiraba 23505), pero el flow del segundo cliente fallaba.

**Fix (código):** en `app/api/scan/route.js` reemplazado el `INSERT` por `UPSERT` con `onConflict: 'user_id,commerce_id'` y `.maybeSingle()` en el SELECT inicial. Bajo carrera, ambas llamadas resuelven a la misma fila ganadora.

### 5b.4 Race condition: SELECT-then-UPDATE de balance en `/api/redeem`

Dos canjes simultáneos del mismo usuario podían leer el mismo balance, calcular `newBalance`, y hacer dos UPDATEs separados — descontando una sola vez en vez de dos.

**Fix (DB):** `supabase-migration-v11.sql` / `v11_debit_membership_balance_rpc`. Crea `debit_membership_balance(p_membership_id, p_amount, p_column)` que ejecuta `UPDATE memberships SET <col> = <col> - amount WHERE id = membership_id AND <col> >= amount RETURNING <col>`. Atómico: si dos canjes llegan, solo uno cumple la guard y descuenta; el otro afecta 0 filas y la RPC retorna `[]`.

**Fix (código):** en `app/api/redeem/route.js` reemplazado SELECT-then-UPDATE por llamada a `supabase.rpc('debit_membership_balance', {...})`. Si retorna vacío → `400 Saldo insuficiente`.

### 5b.5 Audit ampliada de writers — `register-commerce`, `save-commerce-config`, `user/profile`, `user/delete`

Smoke test extendido al resto de los writers que no se habían tocado en el primer round. Verdict por writer:

| Writer | Schema match | Otros findings |
|---|---|---|
| `/api/register-commerce` | ✅ | Race en slug: dos registros simultáneos con mismo nombre. **Fix aplicado**: catch 23505 + retry con suffix random. |
| `/api/save-commerce-config` | ✅ | Partial-update con shape parcial nulleaba todos los campos no enviados. **Fix aplicado**: spread condicional, solo incluye keys presentes en body. |
| `/api/user/profile` PUT | ✅ | Sin findings. |
| `/api/user/delete` | ✅ schema; ⚠️ comportamiento | `commerces.owner_id → auth.users.id` está como `NO ACTION` (no CASCADE), así que dueños de comercios recibían 500 críptico al borrar cuenta. **Fix aplicado**: pre-check de ownership y devolver 409 con mensaje claro. La decisión arquitectural (cambiar la FK a CASCADE / SET NULL vs mantener NO ACTION) queda en backlog. |

Verificación de FKs hacia `auth.users.id`:

| FK | ON DELETE |
|---|---|
| `profiles.id` | CASCADE |
| `reviews.user_id` | CASCADE |
| `commerces.owner_id` | NO ACTION ⚠️ |
| `visits.scanned_by` | NO ACTION ⚠️ |

`visits.scanned_by` también es NO ACTION, pero en práctica está siempre null (las visitas se insertan con service-role sin pasar `scanned_by`). Si en el futuro se empieza a setear, abre el mismo problema.

### 5b.6 Verificación end-to-end del nuevo flow de redeem

Smoke test contra DB real (con cleanup completo):

| Test | Input | Resultado | Estado |
|---|---|---|---|
| RPC saldo insuficiente | balance=320, debit=1000 | retorna `[]` | ✅ |
| RPC saldo OK | balance=320, debit=100 | retorna `[{new_balance: 220}]`, fila actualizada | ✅ |
| INSERT redemption post-débito | shape exacta de `/api/redeem` | row aceptado, status default `'confirmed'` | ✅ |
| RPC carrera (post-débito de 100) | balance=220, debit=300 | retorna `[]` (no hay 300 disponibles) | ✅ |
| Cleanup | DELETE redemption + UPDATE balance back to 320 | 0 redemptions, points=320 | ✅ |

---

## 6. Estado final

| Tabla crítica | Schema vs migraciones |
|---|---|
| cities | ✅ Match |
| commerces | ✅ Match |
| profiles | ✅ Match |
| memberships | ✅ Match (`full_name` declarada en schema base pero ausente en DB y sin uso real — sin acción) |
| visits | ✅ Match |
| redemptions | ✅ Match (post-v9) |
| prizes | ✅ Match (+ `description` extra inocua) |
| promotions | ✅ Match |
| client_promotions | ✅ Match |
| reviews | ✅ Match |

Sprint 1 cierra con:

- **DB consistente** con las migraciones del repo.
- **Bug crítico de canjes resuelto** (columna `redemptions.membership_id` faltante).
- **3 race conditions cubiertas** (scan get-or-insert, redeem débito, register-commerce slug).
- **1 bug latente arreglado** (status='pending' eterno en /api/scan).
- **2 holes RLS cerrados** + **bug de premios inactivos visibles** + **5 policies duplicadas dropeadas**.
- **Tabla huérfana `coupons` eliminada**.
- **5 writers de API endurecidos** (scan, redeem, user/delete, save-commerce-config, register-commerce).
- **Migration history del proyecto Supabase** pasa de 0 a 4 tracked (v9 → v12), estableciendo la práctica de aplicar via `apply_migration` de aquí en más.

Listo para deploy. Las migraciones DB ya están aplicadas; las 5 ediciones de código entran al backend con el próximo deploy.
