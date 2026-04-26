-- ============================================================
-- MIGRACIÓN SEGURA — solo agrega lo que falta
-- Ejecutá esto en Supabase > SQL Editor
-- ============================================================

-- PRIZES
CREATE TABLE IF NOT EXISTS prizes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commerce_id UUID REFERENCES commerces(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  cost        INTEGER NOT NULL,
  img_url     TEXT,
  stock       INTEGER,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- PROMOTIONS
CREATE TABLE IF NOT EXISTS promotions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commerce_id UUID REFERENCES commerces(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  value       INTEGER DEFAULT 0,
  description TEXT,
  days        TEXT[],
  expires_at  TIMESTAMPTZ,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- COMMERCE_ACTIVITY
CREATE TABLE IF NOT EXISTS commerce_activity (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commerce_id UUID REFERENCES commerces(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Columnas adicionales en MEMBERSHIPS
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS points       INTEGER DEFAULT 0;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS stars        INTEGER DEFAULT 0;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS visits_count INTEGER DEFAULT 0;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS last_visit   TIMESTAMPTZ;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS phone        TEXT;

-- Columnas adicionales en PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone     TEXT;

-- Columnas adicionales en VISITS
ALTER TABLE visits ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 1;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS visited_at    TIMESTAMPTZ DEFAULT now();

-- Columnas adicionales en REDEMPTIONS
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS prize_id     UUID;
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS points_spent INTEGER DEFAULT 0;
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT now();

-- Columnas adicionales en COMMERCES
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS slug             TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS onboarding_done  BOOLEAN DEFAULT false;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE prizes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_activity ENABLE ROW LEVEL SECURITY;

-- Prizes
DO $$ BEGIN
  CREATE POLICY "prizes_public_read" ON prizes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "prizes_owner_insert" ON prizes FOR INSERT
    WITH CHECK (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "prizes_owner_update" ON prizes FOR UPDATE
    USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "prizes_owner_delete" ON prizes FOR DELETE
    USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Promotions
DO $$ BEGIN
  CREATE POLICY "promotions_public_read" ON promotions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "promotions_owner_insert" ON promotions FOR INSERT
    WITH CHECK (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "promotions_owner_update" ON promotions FOR UPDATE
    USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "promotions_owner_delete" ON promotions FOR DELETE
    USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Commerce activity
DO $$ BEGIN
  CREATE POLICY "activity_owner_read" ON commerce_activity FOR SELECT
    USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "activity_owner_insert" ON commerce_activity FOR INSERT
    WITH CHECK (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Memberships: el dueño del comercio puede leer las membresías de su comercio
DO $$ BEGIN
  CREATE POLICY "memberships_owner_read" ON memberships FOR SELECT
    USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Commerces: el dueño puede actualizar su propio comercio
DO $$ BEGIN
  CREATE POLICY "commerces_owner_update" ON commerces FOR UPDATE
    USING (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "commerces_owner_insert" ON commerces FOR INSERT
    WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
