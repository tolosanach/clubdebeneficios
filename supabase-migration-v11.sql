-- ============================================================
-- Migración v11 — Débito atómico de balance de membresía
-- ============================================================
-- Fixes la race condition entre SELECT-then-UPDATE en /api/redeem.
-- La función hace UPDATE con guard (`points >= amount` o `stars >= amount`)
-- de manera atómica. Si el saldo es insuficiente o la fila no existe,
-- la query no afecta filas y la función retorna 0 rows.
--
-- Uso desde la app:
--   const { data, error } = await supabaseAdmin.rpc('debit_membership_balance', {
--     p_membership_id: '...',
--     p_amount:        100,
--     p_column:        'points',  // o 'stars'
--   })
--   // data es un array; si data[0] existe, descontó. Si está vacío, saldo insuficiente.
-- ============================================================

CREATE OR REPLACE FUNCTION debit_membership_balance(
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
         SET points = points - p_amount
       WHERE id = p_membership_id
         AND points >= p_amount
      RETURNING points;
  ELSE
    RETURN QUERY
      UPDATE memberships
         SET stars = stars - p_amount
       WHERE id = p_membership_id
         AND stars >= p_amount
      RETURNING stars;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
