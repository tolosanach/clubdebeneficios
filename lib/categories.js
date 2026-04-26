import { FAMILIES_DATA } from './commerce-families-data'

export const VALID_CATEGORY_NAMES = FAMILIES_DATA.flatMap(f => f.subs)
export const VALID_CATEGORY_SET   = new Set(VALID_CATEGORY_NAMES)

/**
 * Validates and resolves a category value coming from the API body.
 * Accepts:
 *   - A known subcategory name (in VALID_CATEGORY_SET)
 *   - category='__otro__' or 'Otro' + non-empty customCategory (free text)
 * Rejects everything else with a 400-ready error message.
 *
 * @param {{ category: string, customCategory?: string }} input
 * @param {string} userId  — used for warn logging
 * @returns {{ valid: boolean, resolvedValue?: string, error?: string }}
 */
export function validateCategoryInput({ category, customCategory }, userId) {
  if (!category) return { valid: false, error: 'Falta la categoría' }

  if (VALID_CATEGORY_SET.has(category)) return { valid: true, resolvedValue: category }

  if (category === '__otro__' || category === 'Otro') {
    const text = customCategory?.trim()
    if (!text) {
      console.warn('[benefix:invalid-category]', category, '(sin customCategory)', userId)
      return { valid: false, error: 'Escribí tu rubro personalizado' }
    }
    console.log(`[benefix:custom-category] user=${userId} category="${text}"`)
    return { valid: true, resolvedValue: text }
  }

  console.warn('[benefix:invalid-category]', category, userId)
  return { valid: false, error: `Categoría inválida: "${category}". Seleccioná una de la lista.` }
}
