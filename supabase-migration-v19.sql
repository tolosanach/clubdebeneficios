-- ============================================================
-- Migración v19 — Operaciones atómicas de stock y crédito de saldo
-- ============================================================
-- Cierra dos race conditions que quedaban tras v11 (que solo hizo atómico
-- el DÉBITO de saldo):
--
--   1) decrement_prize_stock — baja el stock del premio de forma atómica.
--      Antes /api/redeem y /api/redemption-confirm hacían read-then-write
--      (leer stock, escribir stock-1), así que dos canjes simultáneos del
--      mismo premio podían perder un decremento o dejar stock negativo.
--      El UPDATE con guard `stock > 0` es atómico: solo baja si hay stock,
--      y desactiva el premio cuando llega a 0. Devuelve 0 filas si el premio
--      no lleva control de stock (stock IS NULL) o si ya estaba en 0.
--
--   2) credit_membership_balance — suma saldo de forma atómica (contraparte
--      de debit_membership_balance). Se usa al DEVOLVER puntos cuando se
--      cancela/rechaza un canje pendiente. Antes el refund era read-then-write
--      y podía pisar un crédito concurrente (ej: un escaneo simultáneo).
-- ============================================================

CREATE OR REPLACE FUNCTION decrement_prize_stock(p_prize_id UUID)
RETURNS TABLE(new_stock INTEGER, depleted BOOLEAN) AS $$
BEGIN
  RETURN QUERY
    UPDATE prizes
       SET stock  = stock - 1,
           active = CASE WHEN stock - 1 <= 0 THEN false ELSE active END
     WHERE id = p_prize_id
       AND stock IS NOT NULL
       AND stock > 0
    RETURNING stock, (stock <= 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION credit_membership_balance(
  p_membership_id UUID,
  p_amount        INTEGER,
  p_column        TEXT
) RETURNS TABLE(new_balance INTEGER) AS $$
BEGIN
  IF p_column NOT IN ('points', 'stars') THEN
    RAISE EXCEPTION 'invalid column: %', p_column;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive: %', p_amount;
  END IF;

  IF p_column = 'points' THEN
    RETURN QUERY
      UPDATE memberships
         SET points = COALESCE(points, 0) + p_amount
       WHERE id = p_membership_id
      RETURNING points;
  ELSE
    RETURN QUERY
      UPDATE memberships
         SET stars = COALESCE(stars, 0) + p_amount
       WHERE id = p_membership_id
      RETURNING stars;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
