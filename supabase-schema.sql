-- ============================================================
-- Club de Beneficios — Supabase Schema
-- Ejecutá este SQL en Supabase > SQL Editor
-- ============================================================

-- CITIES
CREATE TABLE cities (
  id      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug    TEXT UNIQUE NOT NULL,
  name    TEXT NOT NULL,
  province TEXT NOT NULL,
  active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- COMMERCES
CREATE TABLE commerces (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id      UUID REFERENCES cities(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,  -- cafe, barber, restaurant, health, fashion, services
  description  TEXT,
  emoji        TEXT DEFAULT '🏪',
  img_url      TEXT,
  plan         TEXT DEFAULT 'free',  -- free, starter, pro
  featured     BOOLEAN DEFAULT false,
  rating       NUMERIC(2,1) DEFAULT 5.0,
  prog_type    TEXT NOT NULL,  -- stars, points, discount
  prog_goal    INTEGER,        -- para stars/points
  prog_discount INTEGER,       -- para discount
  reward_text  TEXT NOT NULL,
  reward_color TEXT DEFAULT '#BD4BF8',
  active       BOOLEAN DEFAULT true,
  owner_id     UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- PROFILES (extiende auth.users)
CREATE TABLE profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name       TEXT,
  email      TEXT,
  avatar_url TEXT,
  role       TEXT DEFAULT 'client',  -- client, commerce_owner, admin
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MEMBERSHIPS (socio en un club)
CREATE TABLE memberships (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  commerce_id UUID REFERENCES commerces(id) ON DELETE CASCADE,
  member_number TEXT UNIQUE,
  joined_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, commerce_id)
);

-- VISITS (escaneos QR)
CREATE TABLE visits (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  commerce_id  UUID REFERENCES commerces(id) ON DELETE CASCADE,
  amount_spent NUMERIC(10,2),
  scanned_by   UUID REFERENCES auth.users(id),  -- staff que escaneó
  scanned_at   TIMESTAMPTZ DEFAULT now()
);

-- REDEMPTIONS (canjes de recompensa)
CREATE TABLE redemptions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  commerce_id  UUID REFERENCES commerces(id) ON DELETE CASCADE,
  prize_id     UUID,
  points_spent INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- PRIZES (premios canjeables por puntos/estrellas)
CREATE TABLE prizes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commerce_id UUID REFERENCES commerces(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  cost        INTEGER NOT NULL,   -- puntos/estrellas necesarios
  img_url     TEXT,
  stock       INTEGER,            -- null = sin límite
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- PROMOTIONS (descuentos y doble puntos)
CREATE TABLE promotions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commerce_id UUID REFERENCES commerces(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,       -- 'discount_next' | 'double_points'
  value       INTEGER DEFAULT 0,  -- % de descuento (para discount_next)
  description TEXT,
  days        TEXT[],             -- días activos para double_points (ej: ['lunes','viernes'])
  expires_at  TIMESTAMPTZ,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- MEMBERSHIPS: agregar columnas de progreso
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS points      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stars       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visits_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS full_name   TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT;

-- PROFILES: agregar columna full_name y phone si no existen
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone     TEXT;

-- COMMERCES: agregar columnas adicionales
ALTER TABLE commerces
  ADD COLUMN IF NOT EXISTS slug         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT false;

-- COMMERCE_ACTIVITY (log de actividad del dueño)
CREATE TABLE IF NOT EXISTS commerce_activity (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commerce_id UUID REFERENCES commerces(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE cities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerces         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Cities: todos pueden leer
CREATE POLICY "cities_public_read" ON cities FOR SELECT USING (active = true);

-- Commerces: todos pueden leer los activos
CREATE POLICY "commerces_public_read" ON commerces FOR SELECT USING (active = true);

-- Profiles: solo el propio usuario puede leer/editar su perfil
CREATE POLICY "profiles_own_read"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert"     ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Memberships: el usuario ve sus propias membresías
CREATE POLICY "memberships_own_read"   ON memberships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "memberships_own_insert" ON memberships FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Visits: el usuario ve sus propias visitas
CREATE POLICY "visits_own_read" ON visits FOR SELECT USING (auth.uid() = user_id);
-- Comercios pueden insertar visitas (via service role en API)
CREATE POLICY "visits_service_insert" ON visits FOR INSERT WITH CHECK (true);

-- Redemptions: el usuario ve sus canjes
CREATE POLICY "redemptions_own_read"   ON redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "redemptions_own_insert" ON redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Memberships: el dueño del comercio puede ver todas las membresías de su comercio
CREATE POLICY "memberships_owner_read" ON memberships FOR SELECT
  USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));

-- Prizes: todos pueden leer; solo el dueño puede crear/editar/borrar
CREATE POLICY "prizes_public_read" ON prizes FOR SELECT USING (true);
CREATE POLICY "prizes_owner_insert" ON prizes FOR INSERT
  WITH CHECK (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
CREATE POLICY "prizes_owner_update" ON prizes FOR UPDATE
  USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
CREATE POLICY "prizes_owner_delete" ON prizes FOR DELETE
  USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));

-- Promotions: todos pueden leer; solo el dueño puede crear/editar/borrar
CREATE POLICY "promotions_public_read" ON promotions FOR SELECT USING (true);
CREATE POLICY "promotions_owner_insert" ON promotions FOR INSERT
  WITH CHECK (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
CREATE POLICY "promotions_owner_update" ON promotions FOR UPDATE
  USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
CREATE POLICY "promotions_owner_delete" ON promotions FOR DELETE
  USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));

-- Commerce activity: solo el dueño del comercio
CREATE POLICY "activity_owner_read" ON commerce_activity FOR SELECT
  USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
CREATE POLICY "activity_owner_insert" ON commerce_activity FOR INSERT
  WITH CHECK (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));

-- ============================================================
-- TRIGGER: auto-crear perfil al registrarse
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCIÓN: progress del socio en un comercio
-- ============================================================

CREATE OR REPLACE FUNCTION get_member_progress(p_user_id UUID, p_commerce_id UUID)
RETURNS TABLE(visit_count INT, points_total INT, last_visit TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT AS visit_count,
    COUNT(*)::INT AS points_total,
    MAX(scanned_at) AS last_visit
  FROM visits
  WHERE user_id = p_user_id AND commerce_id = p_commerce_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DATOS INICIALES DE DEMO
-- ============================================================

INSERT INTO cities (slug, name, province) VALUES
  ('general-pico', 'General Pico', 'La Pampa'),
  ('santa-rosa',   'Santa Rosa',   'La Pampa'),
  ('cordoba',      'Córdoba',       'Córdoba'),
  ('rosario',      'Rosario',       'Santa Fe');

-- Comercios demo (city_id se actualiza con los UUIDs reales)
-- Los podés cargar desde el panel Admin de la app
