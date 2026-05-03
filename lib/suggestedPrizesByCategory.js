// suggestedPrizesByCategory — plantillas de premios típicos por rubro.
//
// Se usa en dos lugares:
//   - Modal de bienvenida al activar el sistema (cliente nuevo recibe
//     sugerencias para cargar con un click).
//   - Botón "Ver premios sugeridos para mi rubro" del estado vacío
//     en la pestaña Recompensas.
//
// Nombres de rubro deben coincidir con las `subs[].name` de
// `lib/commerce-families-data.js` (que es lo que el wizard guarda en
// `commerces.categories[]`).
//
// Costos por sistema:
//   - stars  → cantidad pequeña (típico 3-15 estrellas)
//   - points → cantidad escalada por 100 (típico 300-1500 puntos)
//
// Si una categoría no está en el map, `getSuggestedPrizes` devuelve
// el array `_default` (premios genéricos) para que igual haya algo.

export const SUGGESTED_PRIZES = {
  // ── Gastronomía ──
  'Cafetería': [
    { name: 'Café gratis',              cost: 5  },
    { name: 'Tostado gratis',           cost: 8  },
    { name: 'Medialuna gratis',         cost: 3  },
    { name: '15% OFF en tu próxima compra', cost: 6 },
  ],
  'Restaurante': [
    { name: 'Postre gratis',            cost: 5  },
    { name: 'Bebida gratis con tu plato', cost: 4 },
    { name: '20% OFF en la cuenta',     cost: 10 },
    { name: 'Entrada gratis',           cost: 6  },
  ],
  'Bar': [
    { name: 'Tragazo gratis',           cost: 6  },
    { name: '2x1 en cervezas',          cost: 8  },
    { name: 'Tabla de picada gratis',   cost: 12 },
  ],
  'Pizzería': [
    { name: 'Empanada gratis',          cost: 3  },
    { name: 'Bebida gratis con la pizza', cost: 4 },
    { name: '20% OFF la próxima visita', cost: 8 },
    { name: 'Pizza chica gratis',       cost: 12 },
  ],
  'Heladería': [
    { name: 'Cucurucho de 1 sabor gratis', cost: 4 },
    { name: '15% OFF en kilo',          cost: 8  },
    { name: 'Helado familiar gratis en tu cumpleaños', cost: 18 },
  ],
  'Panadería': [
    { name: 'Café gratis',              cost: 5  },
    { name: 'Medialuna gratis',         cost: 3  },
    { name: '20% OFF en tu próxima compra', cost: 8 },
    { name: 'Torta gratis en tu cumpleaños', cost: 15 },
  ],
  'Rotisería': [
    { name: 'Empanada gratis',          cost: 3  },
    { name: 'Pollo entero gratis',      cost: 12 },
    { name: '15% OFF la próxima visita', cost: 7 },
  ],
  'Cervecería': [
    { name: 'Pinta gratis',             cost: 5  },
    { name: '2x1 en chopps',            cost: 8  },
    { name: 'Tabla degustación gratis', cost: 14 },
  ],
  'Vinería': [
    { name: '10% OFF en tu próxima compra', cost: 5 },
    { name: 'Botella reserva 2x1',      cost: 12 },
  ],
  'Food truck': [
    { name: 'Bebida gratis',            cost: 3  },
    { name: 'Combo del día gratis',     cost: 10 },
  ],

  // ── Comercio minorista ──
  'Kiosco': [
    { name: 'Bebida fría gratis',       cost: 5  },
    { name: 'Snack del día gratis',     cost: 4  },
    { name: '10% OFF en tu próxima compra', cost: 6 },
  ],
  'Almacén': [
    { name: '10% OFF en tu próxima compra', cost: 6 },
    { name: 'Producto del día gratis',  cost: 5  },
  ],
  'Mini market': [
    { name: '10% OFF en tu próxima compra', cost: 6 },
    { name: 'Producto destacado gratis', cost: 5 },
  ],
  'Supermercado': [
    { name: '10% OFF en tu próxima compra', cost: 8 },
    { name: '2x1 en producto del mes',   cost: 6 },
  ],
  'Verdulería': [
    { name: 'Bolsa de manzanas gratis', cost: 6  },
    { name: '15% OFF en tu próxima compra', cost: 5 },
  ],
  'Carnicería': [
    { name: '10% OFF en tu próxima compra', cost: 6 },
    { name: 'Asado familiar gratis en tu cumpleaños', cost: 25 },
  ],
  'Pescadería': [
    { name: '10% OFF en tu próxima compra', cost: 6 },
  ],
  'Pollería': [
    { name: 'Pollo gratis',             cost: 10 },
    { name: '15% OFF la próxima visita', cost: 7 },
  ],
  'Fiambrería': [
    { name: '10% OFF en tu próxima compra', cost: 6 },
    { name: 'Picada chica gratis',      cost: 10 },
  ],
  'Dietética': [
    { name: '10% OFF en tu próxima compra', cost: 6 },
    { name: 'Producto del mes gratis',  cost: 8  },
  ],
  'Librería': [
    { name: '10% OFF en tu próxima compra', cost: 6 },
    { name: 'Libro gratis',             cost: 15 },
  ],
  'Papelería': [
    { name: '10% OFF en tu próxima compra', cost: 6 },
    { name: 'Set escolar gratis',       cost: 12 },
  ],
  'Ferretería': [
    { name: '10% OFF en tu próxima compra', cost: 6 },
    { name: 'Producto del mes gratis',  cost: 10 },
  ],
  'Pinturería': [
    { name: '10% OFF en tu próxima compra', cost: 8 },
    { name: 'Lata de pintura 1L gratis', cost: 12 },
  ],
  'Bicicletería': [
    { name: 'Service básico gratis',    cost: 12 },
    { name: '15% OFF en repuestos',     cost: 8  },
  ],
  'Pet shop': [
    { name: 'Bolsa de alimento gratis', cost: 12 },
    { name: '10% OFF en tu próxima compra', cost: 6 },
    { name: 'Baño gratis para tu mascota', cost: 10 },
  ],

  // ── Belleza y estética ──
  'Barbería': [
    { name: 'Corte gratis',             cost: 10 },
    { name: '30% OFF en barba',         cost: 5  },
    { name: 'Corte + barba gratis',     cost: 15 },
  ],
  'Peluquería': [
    { name: 'Corte gratis',             cost: 10 },
    { name: '20% OFF en color',         cost: 8  },
    { name: 'Tratamiento capilar gratis', cost: 12 },
  ],
  'Manicura': [
    { name: 'Manicura gratis',          cost: 8  },
    { name: 'Esmaltado semi gratis',    cost: 6  },
    { name: '20% OFF en pedicura',      cost: 5  },
  ],
  'Estética': [
    { name: 'Sesión facial gratis',     cost: 10 },
    { name: '20% OFF en tratamientos',  cost: 6  },
  ],
  'Spa': [
    { name: 'Masaje 30 min gratis',     cost: 12 },
    { name: '20% OFF en circuito spa',  cost: 8  },
  ],
  'Tatuajes': [
    { name: '15% OFF en tu próximo tatuaje', cost: 8 },
    { name: 'Retoque gratis',           cost: 6  },
  ],
  'Depilación': [
    { name: 'Sesión gratis (zona chica)', cost: 8 },
    { name: '20% OFF en pack de sesiones', cost: 10 },
  ],

  // ── Salud y bienestar ──
  'Farmacia': [
    { name: '10% OFF en perfumería',    cost: 6  },
    { name: 'Medición de presión gratis', cost: 3 },
  ],
  'Óptica': [
    { name: '15% OFF en armazones',     cost: 8  },
    { name: 'Limpieza ultrasonido gratis', cost: 4 },
  ],
  'Kinesiología': [
    { name: 'Sesión gratis',            cost: 10 },
    { name: '15% OFF en pack de sesiones', cost: 8 },
  ],
  'Nutrición': [
    { name: 'Consulta de seguimiento gratis', cost: 8 },
    { name: '15% OFF en plan trimestral', cost: 10 },
  ],
  'Psicología': [
    { name: 'Sesión gratis',            cost: 12 },
  ],
  'Odontología': [
    { name: 'Limpieza dental gratis',   cost: 12 },
    { name: '20% OFF en blanqueamiento', cost: 10 },
  ],
  'Veterinaria': [
    { name: 'Consulta gratis',          cost: 10 },
    { name: 'Baño gratis para tu mascota', cost: 8 },
    { name: '15% OFF en vacuna',        cost: 6  },
  ],

  // ── Indumentaria ──
  'Indumentaria': [
    { name: '15% OFF en tu próxima compra', cost: 8 },
    { name: 'Remera gratis',            cost: 15 },
  ],
  'Calzado': [
    { name: '15% OFF en tu próximo par', cost: 10 },
    { name: 'Plantillas gratis',        cost: 5  },
  ],

  // ── Servicios ──
  'Lavandería': [
    { name: 'Lavado chico gratis',      cost: 6  },
    { name: '20% OFF en tu próximo lavado', cost: 5 },
  ],
  'Tintorería': [
    { name: 'Limpieza prenda chica gratis', cost: 5 },
    { name: '15% OFF en tu próxima visita', cost: 6 },
  ],
  'Lavadero': [
    { name: 'Lavado básico gratis',     cost: 5  },
    { name: '20% OFF en lavado premium', cost: 6  },
  ],

  // ── Salud / fitness ──
  'Gimnasio': [
    { name: 'Mes gratis',               cost: 15 },
    { name: 'Clase de prueba gratis',   cost: 5  },
    { name: '20% OFF mensualidad',      cost: 8  },
  ],
  'Yoga/Pilates': [
    { name: 'Clase gratis',             cost: 8  },
    { name: '20% OFF mensualidad',      cost: 8  },
  ],

  // ── Educación ──
  'Idiomas': [
    { name: 'Clase de prueba gratis',   cost: 8  },
    { name: '20% OFF mensualidad',      cost: 10 },
  ],
  'Música': [
    { name: 'Clase de prueba gratis',   cost: 8  },
    { name: '15% OFF mensualidad',      cost: 8  },
  ],

  // ── Default ──
  // Para cualquier rubro que no esté en el map. Premios genéricos
  // que aplican a la mayoría de los negocios.
  '_default': [
    { name: '10% OFF en tu próxima compra', cost: 6 },
    { name: '20% OFF en tu próxima compra', cost: 10 },
    { name: 'Producto del mes gratis',  cost: 12 },
    { name: 'Beneficio especial en tu cumpleaños', cost: 15 },
  ],
}

/**
 * Devuelve premios sugeridos para un comercio según sus categorías.
 * Itera por las categories[] del comercio en orden, devuelve las del
 * primer match. Si ninguna matchea, cae al _default.
 *
 * Ajusta los costos según el sistema:
 *   - stars  → costo del map tal cual (3-15 estrellas)
 *   - points → costo × 100 (300-1500 puntos)
 *
 * Cada premio devuelto incluye `system_type` ('stars'|'points') para
 * que el insert a la tabla `prizes` ya tenga el campo listo.
 *
 * @param {string[]} categories - array de categorías del comercio
 * @param {'stars'|'points'} systemType - sistema activo
 * @returns {Array<{ name, cost, system_type }>}
 */
export function getSuggestedPrizes(categories = [], systemType = 'stars') {
  if (!Array.isArray(categories)) categories = []
  let template = null
  for (const cat of categories) {
    if (SUGGESTED_PRIZES[cat]) {
      template = SUGGESTED_PRIZES[cat]
      break
    }
  }
  if (!template) template = SUGGESTED_PRIZES._default

  const multiplier = systemType === 'points' ? 100 : 1
  return template.map(p => ({
    name:        p.name,
    cost:        Math.round((p.cost || 5) * multiplier),
    system_type: systemType,
  }))
}

export default SUGGESTED_PRIZES
