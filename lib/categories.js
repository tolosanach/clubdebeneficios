import { FAMILIES_DATA } from './commerce-families-data'

// FAMILIES_DATA.subs ahora contiene objetos { name, aliases } (antes eran strings).
// Extraemos solo el name para el Set de validación.
export const VALID_CATEGORY_NAMES = FAMILIES_DATA.flatMap(f => f.subs.map(s => s.name))
export const VALID_CATEGORY_SET   = new Set(VALID_CATEGORY_NAMES)

/**
 * Validates and resolves a category value coming from the API body.
 * Accepts:
 *   - A known subcategory name (in VALID_CATEGORY_SET) → passa directo.
 *   - category='__otro__' or 'Otro' + non-empty customCategory (legacy
 *     clients que mandan el flag explícito "Otro" + texto separado).
 *   - Cualquier texto libre razonable (no vacío, ≤ 60 chars). El picker
 *     del frontend permite tipear y agregar con Enter rubros que no están
 *     en la lista — los aceptamos como categoría custom en lugar de
 *     rechazar el alta del comercio.
 *
 * @param {{ category: string, customCategory?: string }} input
 * @param {string} userId  — used for log diagnostics
 * @returns {{ valid: boolean, resolvedValue?: string, error?: string }}
 */
export function validateCategoryInput({ category, customCategory }, userId) {
  if (!category || typeof category !== 'string') {
    return { valid: false, error: 'Falta la categoría' }
  }

  if (VALID_CATEGORY_SET.has(category)) return { valid: true, resolvedValue: category }

  if (category === '__otro__' || category === 'Otro') {
    const text = customCategory?.trim()
    if (!text) {
      console.warn('[benefix:invalid-category]', category, '(sin customCategory)', userId)
      return { valid: false, error: 'Escribí tu rubro personalizado' }
    }
    if (text.length > 60) {
      return { valid: false, error: 'Categoría muy larga (máx. 60 caracteres)' }
    }
    console.log(`[benefix:custom-category] user=${userId} category="${text}"`)
    return { valid: true, resolvedValue: text }
  }

  // Texto libre — el picker permite agregar rubros que no están en la lista.
  // Los aceptamos como categoría custom siempre que pasen sanity checks.
  const trimmed = category.trim()
  if (!trimmed) {
    return { valid: false, error: 'Categoría vacía' }
  }
  if (trimmed.length > 60) {
    return { valid: false, error: 'Categoría muy larga (máx. 60 caracteres)' }
  }

  console.log(`[benefix:free-category] user=${userId} category="${trimmed}"`)
  return { valid: true, resolvedValue: trimmed }
}
