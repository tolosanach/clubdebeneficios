# Auditoría de flujos core — Clufix (jul 2026)

Repo `club-beneficios` · Next.js + Supabase (proyecto `wcqhapsgwjivtzdseqjz`) + Vercel · dominio clufix.com.ar.
Alcance: escaneo QR, unión de clientes, descuentos, puntos/stars, canjes y stock, frontend, y transversales (auth, planes, fechas/timezone, races). Los hallazgos se verificaron contra el schema real de producción (no solo el repo, que está desincronizado).

---

## Resumen por gravedad

| # | Gravedad | Área | Hallazgo | Estado |
|---|----------|------|----------|--------|
| 1 | 🔴 Crítico | Auth | `/api/redeem` sin ningún guard de autenticación | ✅ Corregido |
| 2 | 🟠 Alto | Auth | 3 endpoints admin de push sin guard | ✅ Corregido |
| 3 | 🟠 Alto | Fechas | `getDay()`/`setHours()` en UTC → día y vencimientos mal para AR | ✅ Corregido |
| 4 | 🟡 Medio | Stock/Races | Decremento de stock no atómico (oversell) | ✅ Corregido |
| 5 | 🟡 Medio | Saldo/Races | Reembolso/rollback de saldo no atómico | ✅ Corregido |
| 6 | 🟡 Medio | Reportes | Conteo de "Canjeados" y reporte incluyen descuentos/cancelados | ✅ Corregido |
| 7 | 🟢 Bajo | Races | Boundary del límite de plan (MVCC) y doble aplicación de pending_grant | Documentado |
| 8 | 🟢 Bajo | Mantenimiento | Migraciones del repo desincronizadas con producción | Documentado |

---

## Detalle y fixes

### 1. 🔴 `/api/redeem` sin autenticación (crítico)
`app/api/redeem/route.js` procesaba el canje leyendo `membership_id`, `prize_id`, `commerce_id`, `user_id` del body **sin verificar sesión ni dueño**. Todos esos IDs son derivables (el QR del cliente es `CLUB-<user_id>`, el catálogo de premios es de lectura pública, el `commerce_id` sale del slug). Un request anónimo podía **vaciar el saldo de cualquier cliente** y **agotar stock** a voluntad. Todos los demás endpoints mutantes tienen guard; este era el único descubierto.

**Fix:** guard de sesión + verificación dueño/admin (mismo patrón que `/api/scan` y `/api/discount-decision`).

### 2. 🟠 Endpoints admin de push sin guard
`resend-pushes`, `resend-enigma-pushes` y `repush-discount-notifications` (utilidades de la migración Enigma) usaban service role y respondían a cualquier request anónimo → vector de spam masivo de notificaciones push.

**Fix:** guard por `Authorization: Bearer ${CRON_SECRET}` (mismo patrón que los crons). Recomendación: si ya no se usan, eliminarlos.

### 3. 🟠 Timezone: día de la semana y vencimientos en UTC
Las funciones serverless corren en UTC. Se usaba `new Date().getDay()` (matching de `double_points` por día) y `d.setHours(23,59,59)` (vencimiento de cupones) sin corregir el offset AR (UTC-3, sin DST):
- **Día de la semana:** entre las 21:00 y 24:00 ART el sistema creía que era el día siguiente → la promo "Suma doble" se aplicaba (o no) el día equivocado. Verificado: sábado 23:30 ART, `getUTCDay()`=0 (domingo).
- **Vencimiento:** "fin del día" quedaba en 23:59 UTC = 20:59 ART → cupones vencían ~3 h antes.

Afectaba `scan`, `join`, `grant-promotion`, `discount-decision`, `applyPendingGrant`.

**Fix:** nuevo `lib/tz.js` con `argentinaDow()` y `argentinaEndOfDayISO(daysFromNow)`, cableado en los 5 flujos.

### 4. 🟡 Decremento de stock no atómico
`/api/redeem` y `/api/redemption-confirm` hacían read-then-write (`stock = prize.stock - 1`). Dos canjes simultáneos del mismo premio podían perder un decremento o dejar stock inconsistente. El débito de saldo ya era atómico (v11) pero el stock no.

**Fix:** RPC `decrement_prize_stock` (migración v19) con `UPDATE ... WHERE stock > 0 RETURNING`. Desactiva el premio al llegar a 0. Cableado en ambos endpoints.

### 5. 🟡 Reembolso/rollback de saldo no atómico
`/api/redemption-cancel` (devolución) y el rollback de `/api/redeem-request` reescribían el saldo con un valor leído antes → podían pisar un crédito concurrente (p. ej. un escaneo simultáneo). El comentario "sumar es seguro contra races" era incorrecto.

**Fix:** RPC `credit_membership_balance` (migración v19), contraparte atómica de `debit_membership_balance`. Cableado en ambos.

### 6. 🟡 Conteo de "Canjeados" y reporte de canjes contaminados
- Tarjeta de premio (`page.js`): el mapa `prizeCanjes` contaba **todas** las filas de `redemptions` con `prize_id`, incluyendo `cancelled` (reembolsadas) y `pending`. En prod ya había 1 fila `cancelled` inflando un contador.
- `GET /api/reports/redemptions`: no filtraba por `kind` ni `status`, así que incluía las **104 filas `kind='discount'`** (cupones, sin premio → aparecían como "Desconocido") y las canceladas, contra solo 10 canjes reales de premio.

**Fix:** `prizeCanjes` filtra `kind='prize'` + `status='completed'`; el reporte filtra `kind='prize'` y excluye `cancelled`.

### 7. 🟢 Races residuales (documentado, sin fix)
- **Límite de plan:** el trigger `check_membership_limit` (existe en prod) cuenta bajo MVCC, así que dos inserts concurrentes exactamente en el borde podrían dejar límite+1. Impacto mínimo; requeriría constraint de exclusión para cerrarlo del todo.
- **`applyPendingGrant`:** lee grant con `applied_at IS NULL` → aplica → marca; ventana de doble aplicación si dos escaneos crean membership casi a la vez. Probabilidad muy baja (el upsert de membership serializa). Idealmente marcar el grant de forma condicional/atómica.

### 8. 🟢 Migraciones del repo desincronizadas con producción
Producción tiene cosas que **no** están en los `.sql` del repo: columna `redemptions.redeemed_at`, `status` default `'completed'` (el repo dice `'confirmed'`), el trigger `enforce_membership_limit_trigger`/`check_membership_limit`, y la función v11. No es un bug de runtime, pero el repo dejó de ser fuente de verdad. Recomendación: versionar esas migraciones (se agregó `supabase-migration-v19.sql`).

---

## Archivos modificados
- **Nuevos:** `lib/tz.js`, `supabase-migration-v19.sql` (aplicada a prod).
- **Editados:** `app/api/redeem/route.js`, `app/api/redeem-request/route.js`, `app/api/redemption-confirm/route.js`, `app/api/redemption-cancel/route.js`, `app/api/scan/route.js`, `app/api/join/route.js`, `app/api/grant-promotion/route.js`, `app/api/discount-decision/route.js`, `app/api/reports/redemptions/route.js`, `app/page.js`, `lib/applyPendingGrant.js`, y los 3 endpoints admin de push.

## Verificación
- `node --check` OK en todos los archivos tocados.
- Migración v19 aplicada y probada en prod (`decrement_prize_stock` devuelve 0 filas ante UUID inexistente; sin mutar datos).
- Helper de timezone validado con casos límite (sábado 23:30 ART).

## Pendiente / recomendado
- Setear/confirmar `CRON_SECRET` en Vercel (necesario para los endpoints admin ya guardados).
- Considerar decrementar stock **antes** del débito en `/api/redeem` para cerrar el oversell-por-uno bajo concurrencia exacta.
- Versionar en el repo las migraciones que solo viven en prod.
