-- Migration v18: applies_to_existing en promotions
-- Control granular: el dueño puede decidir si los cambios en una promo
-- (ej: nueva fecha de vencimiento) aplican a clientes que ya la tienen,
-- o solo a clientes nuevos que la reciban después.

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS applies_to_existing BOOLEAN DEFAULT true;

COMMENT ON COLUMN promotions.applies_to_existing IS
  'Si true: cambios en la promo (expires_at, value, etc.) se aplican a todos los client_promotions activos. Si false: cambios solo aplican a nuevos clientes, los existentes quedan congelados.';

-- Índice para queries que filtren por applies_to_existing
CREATE INDEX IF NOT EXISTS idx_promotions_applies_to_existing
  ON promotions(commerce_id, applies_to_existing);
