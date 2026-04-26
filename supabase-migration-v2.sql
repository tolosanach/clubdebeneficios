-- ============================================================
-- Migración v2 — ejecutar en Supabase > SQL Editor
-- ============================================================

-- Imagen de portada del comercio (diferente al logo)
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Campos de ubicación
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS lat     NUMERIC(10,7);
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS lng     NUMERIC(10,7);
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS facebook  TEXT;

-- Estado de la membresía
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Marcar como activos los socios que ya tienen visitas
UPDATE memberships SET status = 'active' WHERE visits_count > 0 AND status = 'pending';

-- RLS: el dueño puede actualizar su propio comercio (cover_image + nuevos campos)
DO $$ BEGIN
  CREATE POLICY "commerces_owner_update" ON commerces FOR UPDATE
    USING (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
