-- ============================================================
-- Migración v10 — Drop de tabla huérfana `coupons`
-- ============================================================
-- Detectada en el audit del Sprint 1 (audit/sprint1-migrations-audit.md):
--   - Sin archivo de migración que la cree en el repo.
--   - Sin referencia en app/api/** ni en el resto del código.
--   - 0 filas, 0 vistas dependientes, 0 constraints externos hacia ella.
-- Las FKs propias de la tabla (a commerces/profiles/promotions) se borran
-- automáticamente al dropear; CASCADE no es necesario porque nada más depende.
-- ============================================================

DROP TABLE IF EXISTS coupons;
