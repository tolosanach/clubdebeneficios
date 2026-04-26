-- Migración v4 — Horarios estructurados
-- Estructura JSONB esperada:
-- {
--   "monday":    { "open": true,  "shifts": [{ "from": "09:00", "to": "13:00" }, { "from": "17:00", "to": "21:00" }] },
--   "tuesday":   { "open": true,  "shifts": [{ "from": "09:00", "to": "18:00" }] },
--   "wednesday": { "open": false, "shifts": [] },
--   "thursday":  { "open": true,  "shifts": [{ "from": "09:00", "to": "18:00" }] },
--   "friday":    { "open": true,  "shifts": [{ "from": "09:00", "to": "18:00" }] },
--   "saturday":  { "open": true,  "shifts": [{ "from": "09:00", "to": "13:00" }] },
--   "sunday":    { "open": false, "shifts": [] }
-- }

ALTER TABLE commerces ADD COLUMN IF NOT EXISTS hours_structured JSONB;
