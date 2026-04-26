-- ============================================================
-- Migración v12 — Cierre de holes RLS + limpieza de policies duplicadas
-- ============================================================
-- Ver audit/sprint1-migrations-audit.md y la sección "1. RLS audit" del
-- reporte de cierre de Sprint 1 para el contexto completo.
--
-- Cambios:
--
-- 1) HOLES de seguridad reales
--    a) visits.visits_service_insert tenía WITH CHECK (true) para {public},
--       lo que permitía a cualquier usuario autenticado insertar visitas
--       para cualquier user_id si usara el cliente con anon key. La app actual
--       solo escribe via service-role (bypassea RLS de igual manera), así que
--       borramos la policy permisiva: nadie con anon/authenticated puede
--       insertar.
--    b) client_promotions.cp_service_insert / cp_service_update tenían el mismo
--       patrón. Mismo fix.
--
-- 2) BUG DE LECTURA — premios inactivos visibles
--    prizes tenía 2 SELECT policies PERMISSIVE (OR-combinadas):
--      - "prizes are public"  USING (true)
--      - "prizes_public_read" USING (active = true)
--    El OR efectivo era TRUE, anulando el filtro active=true.
--    Borramos la policy "prizes are public".
--
-- 3) Limpieza de policies duplicadas (mismo efecto, distinto nombre)
--    - prizes: "owners manage prizes" (ALL) duplica las 3 policies separadas
--      (insert/update/delete) por owner. Borrar.
--    - commerce_activity: "owners insert activity" duplica activity_owner_insert.
--    - commerce_activity: "owners read activity" duplica activity_owner_read.
-- ============================================================

-- 1) Holes RLS
DROP POLICY IF EXISTS "visits_service_insert" ON visits;
DROP POLICY IF EXISTS "cp_service_insert"     ON client_promotions;
DROP POLICY IF EXISTS "cp_service_update"     ON client_promotions;

-- 2) Premios inactivos visibles
DROP POLICY IF EXISTS "prizes are public" ON prizes;

-- 3) Duplicados
DROP POLICY IF EXISTS "owners manage prizes"   ON prizes;
DROP POLICY IF EXISTS "owners insert activity" ON commerce_activity;
DROP POLICY IF EXISTS "owners read activity"   ON commerce_activity;
