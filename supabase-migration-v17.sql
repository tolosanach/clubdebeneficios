-- Migration v17: name_changed_at
-- Tracking del cambio de nombre del comercio para imponer un lock de 20 dias
-- entre cambios. Evita que un dueno cambie el nombre repetidamente y los
-- clientes pierdan referencia del lugar al que se sumaron.

ALTER TABLE commerces ADD COLUMN IF NOT EXISTS name_changed_at TIMESTAMPTZ;
COMMENT ON COLUMN commerces.name_changed_at IS
  'Ultima vez que el dueno cambio el nombre del comercio. NULL = nunca cambio. Lock de 20 dias entre cambios.';
