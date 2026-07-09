// lib/tz.js — Helpers de fecha/hora en horario de Argentina.
//
// Las funciones serverless de Vercel corren en UTC. Usar new Date().getDay()
// o d.setHours(23,59,59) sin corregir el offset producía dos bugs para AR:
//   1) El día de la semana (para promos double_points por día) cambiaba a la
//      medianoche UTC = 21:00 ART, así que entre las 21:00 y las 24:00 ART el
//      sistema ya "creía" que era el día siguiente.
//   2) El "fin del día" para el vencimiento de cupones quedaba en 23:59 UTC =
//      20:59 ART, cortando la vigencia ~3 horas antes de lo esperado.
//
// Argentina no observa horario de verano desde 2009: el offset es fijo UTC-3.
const AR_OFFSET_MS = 3 * 60 * 60 * 1000

// Día de la semana en horario AR (0=domingo, 1=lunes, … 6=sábado).
export function argentinaDow(base = new Date()) {
  return new Date(base.getTime() - AR_OFFSET_MS).getUTCDay()
}

// ISO (UTC) del instante 23:59:59.999 de horario AR, `daysFromNow` días
// después de la fecha AR actual. Ej: argentinaEndOfDayISO(7) → fin del día
// (hora Argentina) de dentro de una semana, expresado en UTC.
export function argentinaEndOfDayISO(daysFromNow = 0, base = new Date()) {
  const arClock = new Date(base.getTime() - AR_OFFSET_MS)
  arClock.setUTCDate(arClock.getUTCDate() + daysFromNow)
  arClock.setUTCHours(23, 59, 59, 999)
  return new Date(arClock.getTime() + AR_OFFSET_MS).toISOString()
}
