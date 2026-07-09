import { createClient } from '@supabase/supabase-js'
import { argentinaEndOfDayISO } from './tz'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Normaliza un número de teléfono a formato wa.me (solo dígitos).
 * Ejemplos:
 *   "+54 9 2302 351158" → "5492302351158"
 *   "(02302) 35-1158"   → "02302351158"  (10-11 dígitos locales, sin código país)
 *   "2302351158"        → "2302351158"
 *
 * IMPORTANTE: para matching con pending_grants importados, vamos a guardar
 * los teléfonos en la forma con código de país (549 + número). Esta función
 * los limpia pero NO agrega prefijo automáticamente — eso lo hace el importer
 * para garantizar consistencia.
 */
export function normalizePhone(phone) {
  if (!phone) return ''
  return String(phone).replace(/[^\d]/g, '')
}

/**
 * Genera todas las variantes posibles de un teléfono argentino para hacer match
 * con pending_grants. Cubre los casos comunes:
 *   - "5492302351158" (con país + 9)
 *   - "542302351158"  (con país sin 9)
 *   - "2302351158"    (sin país, 10 dígitos)
 *   - "02302351158"   (con 0 prefijo, 11 dígitos)
 */
function phoneVariants(phone) {
  const clean = normalizePhone(phone)
  if (!clean) return []
  const variants = new Set([clean])

  // Si arranca con 549 (13 dígitos, formato WA): variantes sin 549, sin 54, con 0
  if (clean.length >= 13 && clean.startsWith('549')) {
    const base = clean.slice(3) // 10 dígitos sin 549
    variants.add(base)
    variants.add('0' + base)
    variants.add('54' + base)
  }
  // Si arranca con 54 sin 9 (12 dígitos)
  if (clean.length === 12 && clean.startsWith('54')) {
    const base = clean.slice(2)
    variants.add(base)
    variants.add('0' + base)
    variants.add('549' + base)
  }
  // Si tiene 10 dígitos (formato local sin 0 ni código país)
  if (clean.length === 10) {
    variants.add('549' + clean)
    variants.add('54' + clean)
    variants.add('0' + clean)
  }
  // Si tiene 11 dígitos y arranca con 0 (formato local con 0)
  if (clean.length === 11 && clean.startsWith('0')) {
    const base = clean.slice(1)
    variants.add(base)
    variants.add('549' + base)
    variants.add('54' + base)
  }

  return Array.from(variants)
}

/**
 * Busca un pending_grant para (commerce_id, phone) y, si lo encuentra y no está
 * aplicado, lo aplica a la membership recién creada:
 *   - suma starting_points al balance correcto (points o stars)
 *   - crea client_promotion si el grant tiene promo_id (con el vencimiento de la promo)
 *   - marca el grant como aplicado
 *
 * Es idempotente: si el grant ya está aplicado, retorna null.
 *
 * @param {Object} args
 * @param {string} args.commerceId
 * @param {string} args.membershipId
 * @param {string} args.phone — formato libre, se normaliza internamente
 * @returns {Object|null} { grant_id, points_applied, promo_applied } o null si no hay grant
 */
export async function applyPendingGrant({ commerceId, membershipId, phone }) {
  if (!phone || !commerceId || !membershipId) return null

  const variants = phoneVariants(phone)
  if (variants.length === 0) return null

  // Buscar grant pendiente — probamos todas las variantes
  const { data: grant } = await supabaseAdmin
    .from('pending_grants')
    .select('id, starting_points, promo_id')
    .eq('commerce_id', commerceId)
    .in('phone', variants)
    .is('applied_at', null)
    .maybeSingle()

  if (!grant) return null

  // RECLAMO ATÓMICO del grant: lo marcamos como aplicado ANTES de otorgar
  // nada, condicionando a que siga sin reclamar (`applied_at IS NULL`). Si el
  // UPDATE no devuelve fila, otra ejecución concurrente (ej: dos escaneos que
  // crean la membership casi a la vez) ya lo reclamó → abortamos para no
  // duplicar el crédito de starting_points ni la promo.
  const { data: claimed } = await supabaseAdmin
    .from('pending_grants')
    .update({ applied_at: new Date().toISOString(), applied_to_membership_id: membershipId })
    .eq('id', grant.id)
    .is('applied_at', null)
    .select('id, starting_points, promo_id')
    .maybeSingle()
  if (!claimed) return null

  // Cargar el commerce para saber qué tipo de programa es
  const { data: commerce } = await supabaseAdmin
    .from('commerces').select('prog_type').eq('id', commerceId).single()
  if (!commerce) return null

  const isStars = commerce.prog_type === 'stars'

  // Aplicar starting_points de forma atómica (crédito con RPC).
  if (claimed.starting_points && claimed.starting_points > 0) {
    await supabaseAdmin.rpc('credit_membership_balance', {
      p_membership_id: membershipId,
      p_amount:        claimed.starting_points,
      p_column:        isStars ? 'stars' : 'points',
    })
  }

  // Aplicar la promo si existe
  let promoApplied = false
  if (claimed.promo_id) {
    const { data: promo } = await supabaseAdmin
      .from('promotions')
      .select('expires_at, expiration_type, expiration_date, expiration_days')
      .eq('id', claimed.promo_id)
      .single()
    if (promo) {
      let expiresAt
      if (promo.expiration_type === 'relative') {
        expiresAt = argentinaEndOfDayISO(promo.expiration_days || 30)
      } else {
        expiresAt = promo.expiration_date || promo.expires_at
      }
      if (expiresAt) {
        await supabaseAdmin.from('client_promotions').upsert({
          promotion_id:  claimed.promo_id,
          membership_id: membershipId,
          granted_at:    new Date().toISOString(),
          expires_at:    expiresAt,
          status:        'active',
        }, { onConflict: 'promotion_id,membership_id', ignoreDuplicates: true })
        promoApplied = true
      }
    }
  }

  // El grant ya quedó marcado como aplicado en el reclamo atómico de arriba.
  return {
    grant_id:       claimed.id,
    points_applied: claimed.starting_points || 0,
    promo_applied:  promoApplied,
  }
}
