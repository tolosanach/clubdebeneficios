// googlePlacesCategoryMap — traducción de Google Places `primaryType` /
// `types` a las categorías que usa Clufix en `commerces.categories`
// (text[]).
//
// Google clasifica los lugares con un `primaryType` (el más representativo)
// y un array `types` (todas las categorías que aplican). Los cubrimos a
// los dos para que el matching sea más amplio: si el primaryType no está
// en el map probamos cada elemento de types en orden hasta encontrar uno.
//
// Si nada matchea, devolvemos array vacío y el comerciante elige su rubro
// manualmente. Lista de tipos canónicos de Google:
// https://developers.google.com/maps/documentation/places/web-service/place-types
//
// Las categorías destino (los strings del map values) vienen de
// `COMMERCE_FAMILIES` en app/page.js — son las que aparecen en el wizard
// de registro y en el directorio público.

const GOOGLE_TYPE_TO_CLUFIX = {
  // ── Comida & bebida ──
  bakery:                'Panadería',
  cafe:                  'Cafetería',
  coffee_shop:           'Cafetería',
  ice_cream_shop:        'Heladería',
  restaurant:            'Restaurante',
  meal_takeaway:         'Restaurante',
  meal_delivery:         'Restaurante',
  pizza_restaurant:      'Pizzería',
  italian_restaurant:    'Restaurante',
  hamburger_restaurant:  'Restaurante',
  sushi_restaurant:      'Restaurante',
  // Nota: 'Parrilla' no existe como sub en FAMILIES_DATA, mapeamos a Restaurante
  steak_house:           'Restaurante',
  bar:                   'Bar',
  pub:                   'Bar',
  night_club:            'Bar',
  fast_food_restaurant:  'Restaurante',
  brunch_restaurant:     'Cafetería',
  food:                  'Restaurante',  // fallback genérico

  // ── Belleza & cuidado personal ──
  beauty_salon:          'Peluquería',
  hair_salon:            'Peluquería',
  hair_care:             'Peluquería',
  barber_shop:           'Barbería',
  nail_salon:            'Manicura',
  spa:                   'Spa',
  massage:               'Spa',
  skin_care_clinic:      'Estética',

  // ── Salud & deporte ──
  gym:                   'Gimnasio',
  fitness_center:        'Gimnasio',
  yoga_studio:           'Yoga / Pilates',
  pilates_studio:        'Yoga / Pilates',
  pharmacy:              'Farmacia',
  drugstore:             'Farmacia',
  dental_clinic:         'Odontología',
  dentist:               'Odontología',
  physiotherapist:       'Kinesiología',

  // ── Mascotas ──
  pet_store:             'Pet shop',
  veterinary_care:       'Veterinaria',

  // ── Retail / Tiendas ──
  clothing_store:        'Indumentaria',
  shoe_store:            'Indumentaria',
  jewelry_store:         'Joyería',
  watch_store:           'Joyería',
  cosmetics_store:       'Estética',
  perfume_store:         'Estética',
  florist:               'Florería',
  bookstore:             'Librería',
  book_store:            'Librería',
  toy_store:             'Juguetería',
  hardware_store:        'Ferretería',
  // Nota: no hay sub 'Electrónica' en FAMILIES_DATA — sin mapeo (queda vacío
  // y el dueño elige a mano). Ídem 'Tienda' / 'Hotel' / 'Agencia de viajes'.
  furniture_store:       'Mueblería',
  home_goods_store:      'Decoración',
  bicycle_store:         'Bicicletería',
  liquor_store:          'Vinería',
  wine_store:            'Vinería',
  butcher_shop:          'Carnicería',
  fish_store:            'Pescadería',
  grocery_store:         'Almacén',
  supermarket:           'Supermercado',
  convenience_store:     'Mini market',

  // ── Servicios ──
  car_wash:              'Lavadero de autos',
  car_repair:            'Mecánica',
  laundry:               'Lavandería',
  dry_cleaner:           'Tintorería',
  bicycle_repair_shop:   'Bicicletería',
  // Nota: 'Agencia de viajes' no tiene sub equivalente — sin mapeo.

  // ── Educación / formación ──
  school:                'Academia',
  preschool:             'Academia',
  language_school:       'Idiomas',
  music_school:          'Escuela de música',
  // Nota: driving_school no tiene sub equivalente — sin mapeo.

  // Nota: hotel/lodging/bed_and_breakfast no tienen subs equivalentes —
  // sin mapeo (Clufix está pensado para retail/gastro, no hospedaje).
}

/**
 * Devuelve un array (max 3) de categorías Clufix sugeridas a partir
 * de los datos de Google Places. Toma el primaryType primero, si no
 * matchea barre el array `types` en orden.
 *
 * @param {string} primaryType - place.primaryType del response de Google
 * @param {string[]} types - place.types del response de Google
 * @returns {string[]} categorías Clufix sugeridas (puede ser vacío)
 */
export function suggestClufixCategories(primaryType, types = []) {
  const seen   = new Set()
  const result = []

  const tryAdd = (googleType) => {
    if (!googleType) return
    const clufix = GOOGLE_TYPE_TO_CLUFIX[googleType]
    if (clufix && !seen.has(clufix)) {
      seen.add(clufix)
      result.push(clufix)
    }
  }

  // Primero el primaryType (es el más relevante según Google).
  tryAdd(primaryType)
  // Después barremos types[] en orden (Google los devuelve de más
  // específico amás genérico).
  if (Array.isArray(types)) {
    for (const t of types) {
      if (result.length >= 3) break
      tryAdd(t)
    }
  }
  return result
}

export default GOOGLE_TYPE_TO_CLUFIX