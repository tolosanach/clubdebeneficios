-- Migración v6 — FK entre redemptions.prize_id y prizes.id
-- Necesaria para que PostgREST resuelva el join prize:prizes(name)
ALTER TABLE redemptions
  ADD CONSTRAINT redemptions_prize_id_fkey
  FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE SET NULL;
