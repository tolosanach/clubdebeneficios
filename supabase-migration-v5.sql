-- Migración v5 — Teléfono del comercio
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS phone TEXT;
