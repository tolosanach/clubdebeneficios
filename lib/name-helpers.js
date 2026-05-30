// Helpers para normalizar y mostrar nombres de usuarios y comercios.

/**
 * Extrae el nombre de un profile de forma segura.
 * Fallback: full_name → name → 'Usuario'
 * @param {Object} profile - Profile object from Supabase
 * @returns {string} Display name
 */
export function getDisplayName(profile) {
  if (!profile) return 'Usuario'
  return (profile.full_name || profile.name || 'Usuario').trim()
}

/**
 * Extrae el primer nombre de un profile.
 * Útil para saludos personalizados.
 * @param {Object} profile - Profile object
 * @returns {string} First name only
 */
export function getFirstName(profile) {
  const fullName = getDisplayName(profile)
  return fullName.split(' ')[0]
}

/**
 * Extrae las iniciales para avatares.
 * Ej: "Juan Pérez" → "JP"
 * @param {Object} profile - Profile object
 * @returns {string} Up to 2 characters
 */
export function getInitials(profile) {
  const name = getDisplayName(profile)
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Capitaliza la primera letra de cada palabra.
 * @param {string} text
 * @returns {string} Title-cased text
 */
export function titleCase(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .split(' ')
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}
