-- Migration v16: prog_min_purchase
-- Compra minima en pesos para sumar 1 estrella en sistema "stars".
-- NULL = sin minimo. Solo aplica cuando prog_type='stars'.

ALTER TABLE commerces ADD COLUMN IF NOT EXISTS prog_min_purchase INTEGER;
COMMENT ON COLUMN commerces.prog_min_purchase IS
  'Compra minima en pesos para sumar 1 estrella. NULL = sin minimo. Solo aplica cuando prog_type=stars.';
