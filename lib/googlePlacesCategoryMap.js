// googlePlacesCategoryMap — traducción de Google Places `primaryType` /
// `types` a las categorías que usa Benefix en `commerces.categories`
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

const GOOGLE_TYPE_TO_BENEFIX = {
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
  steak_house:           'Parrilla',
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
  nail_salon:            'Manicura/Pedicura',
  spa:                   'Spa',
  massage:               'Spa',
  skin_care_clinic:      'Spa',

  // ── Salud & deporte ──
  gym:                   'Gimnasio',
  fitness_center:        'Gimnasio',
  yoga_studio:           'Yoga/Pilates',
  pilates_studio:        'Yoga/Pilates',
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
  jewelry_store:         'Joyería/Bijou',
  watch_store:           'Joyería/Bijou',
  cosmetics_store:       'Perfumería',
  perfume_store:         'Perfumería',
  florist:               'Florería',
  bookstore:             'Librería',
  book_store:            'Librería',
  toy_store:             'Jugueteria',
  hardware_store:        'Ferretería',
  electronics_store:     'Electrónica',
  furniture_store:       'Mueblería',
  home_goods_store:      'Decoración',
  bicycle_store:         'Bicicletería',
  liquor_store:          'Vinotería',
  wine_store:            'Vinotería',
  butcher_shop:          'Carnicería',
  fish_store:            'Pescadería',
  grocery_store:         'Almacén',
  supermarket:           'Supermercado',
  convenience_store:     'Almacén',
  store:                 'Tienda',  // fallback genérico
  shopping_mall:         'Tienda',

  // ── Servicios ──
  car_wash:              'Lavadero',
  car_repair:            'Mecánica',
  laundry:               'Lavandería',
  dry_cleaner:           'Lavandería',
  travel_agency:         'Agencia de viajes',
  bicycle_repair_shop:   'Bicicletería',

  // ── Educación / formación ──
  school:                'Escuela',
  preschool:             'Escuela',
  language_school:       'Idiomas',
  driving_school:        'Otro',
  music_school:          'Música',

  // ── Hospedaje ──
  lodging:               'Hotel',
  hotel:                 'Hotel',
  bed_and_breakfast:     'Hotel',
}

/**
 * Devuelve un array (max 3) de categorías Benefix sugeridas a partir
 * de los datos de Google Places. Toma el primaryType primero, si no
 * matchea barre el array `types` en orden.
 *
 * @param {string} primaryType - place.primaryType del response de Google
 * @param {string[]} types - place.types del response de Google
 * @returns {string[]} categorías Benefix sugeridas (puede ser vacío)
 */
export function suggestBenefixCategories(primaryType, types = []) {
  const seen   = new Set()
  const result = []

  const tryAdd = (googleType) => {
    if (!googleType) return
    const benefix = GOOGLE_TYPE_TO_BENEFIX[googleType]
    if (benefix && !seen.has(benefix)) {
      seen.add(benefix)
      result.push(benefix)
    }
  }

  // Primero el primaryType (es el más relevante según Google).
  tryAdd(primaryType)
  // Después barremos types[] en orden (Google los devuelve de más
  // específico a más genérico).
  if (Array.isArray(types)) {
    for (const t of types) {
      if (result.length >= 3) break
      tryAdd(t)
    }
  }
  return result
}

export default GOOGLE_TYPE_TO_BENEFIX
