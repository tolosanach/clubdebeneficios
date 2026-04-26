-- ============================================================
-- Migración v9 — Reconciliación de v3 sobre redemptions
-- Aplica las partes de v3 que quedaron sin ejecutar contra la DB real:
--   - redemptions.membership_id (FK -> memberships.id ON DELETE CASCADE)
--   - redemptions.status (default 'confirmed')
--   - idx_redemptions_membership
--   - idx_redemptions_commerce
-- Idempotente: usa IF NOT EXISTS y guarda la FK con DO/EXCEPTION.
-- ============================================================

ALTER TABLE redemptions
  ADD COLUMN IF NOT EXISTS membership_id UUID;

ALTER TABLE redemptions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';

DO $$ BEGIN
  ALTER TABLE redemptions
    ADD CONSTRAINT redemptions_membership_id_fkey
    FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_redemptions_membership
  ON redemptions(membership_id);

CREATE INDEX IF NOT EXISTS idx_redemptions_commerce
  ON redemptions(commerce_id, created_at DESC);
