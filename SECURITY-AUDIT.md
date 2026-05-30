# Security Audit — RLS & Authentication Guards

## Cambios realizados (Fase 3)

### 1. ✅ FIXED: `/api/client-view` — Data leak por falta de ownership check

**Problema:** El endpoint aceptaba `user_id` como query param SIN validar que el usuario autenticado era el propietario.

```js
// ANTES (vulnerable)
const user_id = searchParams.get('u')  // ← Cualquier user autenticado podía leer otro
```

**Solución:** Agregado auth guard + ownership check.

```js
// DESPUÉS (seguro)
const { data: { user: authUser } } = await supabase.auth.getUser()
if (authUser.id !== user_id) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
}
```

**Impacto:** Impedía que un usuario `A` consultara `/api/client-view?u={user_B_id}` para leer balance y cupones de otro usuario.

---

### 2. ✅ VERIFIED: `/api/reports/client-detail` — Ownership check presente

Este endpoint YA valida correctamente:
- Verifica que el user autenticado sea dueño del comercio (línea 34)
- Solo permite ver detalles de clientes del propio comercio

---

## Endpoints auditados

| Endpoint | Guard | Ownership | Status |
|----------|-------|-----------|--------|
| `/api/client-view` | ✅ Added | ✅ Added | ✅ Fixed |
| `/api/reports/client-detail` | ✅ Present | ✅ Present | ✅ OK |
| `/api/club-profile` | N/A (public) | N/A | ✅ OK |
| `/api/commerce-clients` | ✅ Present | ✅ Present | ✅ OK |

---

## Recomendaciones para auditoría futura

1. **Rate limiting en endpoints públicos** — `/api/places/*` está en memoria, migrar a Postgres
2. **Auditoría de RLS policies en Supabase** — verificar que todas las tablas sensibles usen RLS
3. **Logging de accesos** — agregar auditlog para intentos de acceso no autorizado
4. **Test coverage** — crear tests de seguridad para ownership checks

---

**Fecha de revisión:** 2026-05-30
**Auditor:** Claude Code (security phase 3)
