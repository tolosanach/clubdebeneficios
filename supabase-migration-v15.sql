-- ============================================================
-- Migración v15 — Pending grants para migración de clientes existentes
-- ============================================================
-- Una tabla auxiliar para "regalos pre-asignados" a clientes que todavía
-- no se sumaron a Benefix.
--
-- Caso de uso real: el comercio Enigma tiene 350 clientes existentes en
-- una app vieja (AppSheet con QRs). Queremos migrarlos a Benefix
-- con un descuento de bienvenida y puntos iniciales que se aplican
-- automáticamente cuando el cliente se loguea por primera vez y se suma
-- al club via /join/[slug].
--
-- Flow:
--   1) Admin importa CSV/Excel → se crean rows en pending_grants
--      (commerce_id + phone normalizado + starting_points + promo_id).
--   2) Admin manda mensajes de WhatsApp a los clientes con el link de invitación.
--   3) El cliente abre el link, se loguea con Google, se suma al club.
--   4) /api/join (o /api/scan si se sumó por QR físico) busca el pending_grant
--      por (commerce_id, profile.phone), aplica los starting_points + crea
--      el client_promotion, marca el grant como aplicado.
--   5) El grant queda con applied_at != NULL y no se aplica de nuevo.
--
-- El UNIQUE(commerce_id, phone) impide importar duplicados o aplicar
-- dos veces el mismo grant.
-- ============================================================

CREATE TABLE IF NOT EXISTS pending_grants (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commerce_id              UUID NOT NULL REFERENCES commerces(id)   ON DELETE CASCADE,
  phone                    TEXT NOT NULL,
  email                    TEXT,
  name                     TEXT,
  starting_points          INTEGER DEFAULT 0,
  promo_id                 UUID REFERENCES promotions(id)            ON DELETE SET NULL,
  applied_at               TIMESTAMPTZ,
  applied_to_membership_id UUID REFERENCES memberships(id)           ON DELETE SET NULL,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pending_grants_commerce_phone_uniq UNIQUE (commerce_id, phone)
);

-- Índice para el lookup rápido al sumarse (solo grants pendientes).
CREATE INDEX IF NOT EXISTS idx_pending_grants_pending
  ON pending_grants(commerce_id, phone)
  WHERE applied_at IS NULL;

-- RLS — service-role bypassea (que es lo único que escribe vía /api/* y admin).
-- Solo el dueño del comercio puede leer sus pending_grants (para ver el
-- estado de la migración desde su panel).
ALTER TABLE pending_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pending_grants_owner_read ON pending_grants;
CREATE POLICY pending_grants_owner_read ON pending_grants
  FOR SELECT
  USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));
