-- ============================================================
-- Migración v3 — Vencimiento de promociones configurable
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- Puntos por visita en comercios (si no existe ya)
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS prog_pts INTEGER DEFAULT 1;

-- Columnas faltantes en REDEMPTIONS
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE;
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'confirmed';  -- 'confirmed' | 'cancelled'

CREATE INDEX IF NOT EXISTS idx_redemptions_membership ON redemptions(membership_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_commerce   ON redemptions(commerce_id, created_at DESC);

-- Agregar campos de vencimiento a promociones
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS expiration_type TEXT DEFAULT 'fixed';
-- 'fixed'    = todos los clientes tienen la misma fecha límite
-- 'relative' = cada cliente tiene X días desde que recibe la promo

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMPTZ;
-- Usado cuando expiration_type = 'fixed'

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS expiration_days INTEGER;
-- Usado cuando expiration_type = 'relative' (ej: 7 = vence 7 días después del otorgamiento)

-- Tabla para trackear promociones otorgadas a cada cliente
CREATE TABLE IF NOT EXISTS client_promotions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID REFERENCES promotions(id)  ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
  granted_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  status       TEXT DEFAULT 'active', -- 'active' | 'used' | 'expired'
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(promotion_id, membership_id)
);

CREATE INDEX IF NOT EXISTS idx_client_promotions_membership
  ON client_promotions(membership_id, status);

CREATE INDEX IF NOT EXISTS idx_client_promotions_expires
  ON client_promotions(expires_at, status);

-- RLS
ALTER TABLE client_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_own_read" ON client_promotions
  FOR SELECT USING (
    membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "cp_service_insert" ON client_promotions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "cp_service_update" ON client_promotions
  FOR UPDATE USING (true);

-- Función utilitaria: marcar las vencidas (llamar periódicamente o desde la app)
CREATE OR REPLACE FUNCTION mark_expired_promotions()
RETURNS void AS $$
BEGIN
  UPDATE client_promotions
  SET    status = 'expired'
  WHERE  status = 'active'
    AND  expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Text-based location columns for commerces (set during registration wizard)
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS city_name TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS province  TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS country   TEXT;
