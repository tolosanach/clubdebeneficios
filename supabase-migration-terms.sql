-- ============================================================
-- MIGRACIÓN: Terms acceptance
-- Ejecutá esto en Supabase > SQL Editor
-- ============================================================

-- Agregar columna para registrar aceptación de términos
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;

-- Usuarios existentes se consideran que aceptaron (no bloquear usuarios activos)
UPDATE profiles SET terms_accepted_at = created_at WHERE terms_accepted_at IS NULL;
