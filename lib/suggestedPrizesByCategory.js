// suggestedPrizesByCategory — plantillas de PREMIOS típicos por rubro.
//
// Importante: este catalogo es para PREMIOS (productos/servicios canjeables
// con estrellas o puntos del programa de fidelizacion), NO para descuentos
// %OFF ni promos. Los %OFF son `discount_next` y se gestionan aparte como
// beneficios — NO entran en el catalogo del cliente. Por eso esta lista
// solo contiene productos/servicios tangibles que se entregan a cambio
// del balance del cliente.
//
// Se usa en:
//   - Modal de bienvenida al activar el sistema (cliente nuevo recibe
//     sugerencias para cargar con un click).
//   - Boton "Ver premios sugeridos para mi rubro" del estado vacio
//     en la pestania Recompensas.
//
// Nombres de rubro deben coincidir con las `subs[].name` de
// `lib/commerce-families-data.js`.
//
// Costos por sistema:
//   - stars  -> cantidad pequena (tipico 3-15 estrellas)
//   - points -> cantidad escalada por 100 (tipico 300-1500 puntos)

export const SUGGESTED_PRIZES = {
  // ── Gastronomia ──
  'Cafetería': [
    { name: 'Café gratis',                cost: 5  },
    { name: 'Tostado gratis',             cost: 8  },
    { name: 'Medialuna gratis',           cost: 3  },
    { name: 'Combo café + medialuna gratis', cost: 7 },
  ],
  'Restaurante': [
    { name: 'Postre gratis',              cost: 5  },
    { name: 'Bebida gratis con tu plato', cost: 4  },
    { name: 'Entrada gratis',             cost: 6  },
    { name: 'Plato del día gratis',       cost: 12 },
  ],
  'Bar': [
    { name: 'Tragazo gratis',             cost: 6  },
    { name: '2x1 en cervezas',            cost: 8  },
    { name: 'Tabla de picada gratis',     cost: 12 },
  ],
  'Pizzería': [
    { name: 'Empanada gratis',            cost: 3  },
    { name: 'Bebida gratis con la pizza', cost: 4  },
    { name: 'Pizza chica gratis',         cost: 12 },
    { name: 'Postre gratis con la pizza', cost: 5  },
  ],
  'Heladería': [
    { name: 'Cucurucho de 1 sabor gratis', cost: 4  },
    { name: '1/4 kilo gratis',             cost: 10 },
    { name: 'Helado familiar gratis en tu cumpleaños', cost: 18 },
  ],
  'Panadería': [
    { name: 'Café gratis',                cost: 5  },
    { name: 'Medialuna gratis',           cost: 3  },
    { name: 'Docena de medialunas gratis', cost: 10 },
    { name: 'Torta gratis en tu cumpleaños', cost: 15 },
  ],
  'Rotisería': [
    { name: 'Empanada gratis',            cost: 3  },
    { name: 'Pollo entero gratis',        cost: 12 },
    { name: 'Bebida gratis con tu pedido', cost: 4 },
  ],
  'Cervecería': [
    { name: 'Pinta gratis',               cost: 5  },
    { name: '2x1 en chopps',              cost: 8  },
    { name: 'Tabla degustación gratis',   cost: 14 },
  ],
  'Vinería': [
    { name: 'Botella entry-level gratis', cost: 8  },
    { name: 'Botella reserva 2x1',        cost: 12 },
    { name: 'Cata guiada para 2 gratis',  cost: 20 },
  ],
  'Food truck': [
    { name: 'Bebida gratis',              cost: 3  },
    { name: 'Combo del día gratis',       cost: 10 },
    { name: 'Postre gratis',              cost: 5  },
  ],

  // ── Comercio minorista ──
  'Kiosco': [
    { name: 'Bebida fría gratis',         cost: 5  },
    { name: 'Snack del día gratis',       cost: 4  },
    { name: 'Golosina gratis',            cost: 3  },
  ],
  'Almacén': [
    { name: 'Producto del día gratis',    cost: 5  },
    { name: 'Bolsa de productos básicos gratis', cost: 12 },
  ],
  'Mini market': [
    { name: 'Producto destacado gratis',  cost: 5  },
    { name: 'Combo del día gratis',       cost: 10 },
  ],
  'Supermercado': [
    { name: '2x1 en producto del mes',    cost: 6  },
    { name: 'Bolsa de productos básicos gratis', cost: 12 },
  ],
  'Verdulería': [
    { name: 'Bolsa de manzanas gratis',   cost: 6  },
    { name: 'Bolsa de papas gratis',      cost: 5  },
    { name: 'Combo de verduras de estación gratis', cost: 10 },
  ],
  'Carnicería': [
    { name: 'Kilo de carne picada gratis', cost: 8  },
    { name: 'Kilo de pollo gratis',       cost: 10 },
    { name: 'Asado familiar gratis en tu cumpleaños', cost: 25 },
  ],
  'Pescadería': [
    { name: 'Filet de merluza gratis',    cost: 8  },
    { name: 'Combo pescado del día gratis', cost: 12 },
  ],
  'Pollería': [
    { name: 'Pollo entero gratis',        cost: 10 },
    { name: 'Pata muslo gratis',          cost: 5  },
    { name: 'Milanesas de pollo gratis',  cost: 8  },
  ],
  'Fiambrería': [
    { name: 'Picada chica gratis',        cost: 10 },
    { name: '200g de jamón cocido gratis', cost: 6 },
    { name: '200g de queso cremoso gratis', cost: 5 },
  ],
  'Dietética': [
    { name: 'Producto del mes gratis',    cost: 8  },
    { name: 'Bolsa de frutos secos gratis', cost: 6 },
  ],
  'Librería': [
    { name: 'Libro gratis',               cost: 15 },
    { name: 'Cuaderno gratis',            cost: 4  },
  ],
  'Papelería': [
    { name: 'Set escolar gratis',         cost: 12 },
    { name: 'Cuaderno gratis',            cost: 4  },
    { name: 'Birome de regalo',           cost: 2  },
  ],
  'Ferretería': [
    { name: 'Producto del mes gratis',    cost: 10 },
    { name: 'Set de tornillos gratis',    cost: 5  },
  ],
  'Pinturería': [
    { name: 'Lata de pintura 1L gratis',  cost: 12 },
    { name: 'Pincel profesional gratis',  cost: 6  },
  ],
  'Bicicletería': [
    { name: 'Service básico gratis',      cost: 12 },
    { name: 'Inflado y ajuste gratis',    cost: 4  },
    { name: 'Cámara gratis',              cost: 8  },
  ],
  'Pet shop': [
    { name: 'Bolsa de alimento gratis',   cost: 12 },
    { name: 'Baño gratis para tu mascota', cost: 10 },
    { name: 'Juguete gratis',             cost: 5  },
  ],

  // ── Belleza y estetica ──
  'Barbería': [
    { name: 'Corte gratis',               cost: 10 },
    { name: 'Arreglo de barba gratis',    cost: 5  },
    { name: 'Corte + barba gratis',       cost: 15 },
  ],
  'Peluquería': [
    { name: 'Corte gratis',               cost: 10 },
    { name: 'Tratamiento capilar gratis', cost: 12 },
    { name: 'Brushing gratis',            cost: 6  },
  ],
  'Manicura': [
    { name: 'Manicura gratis',            cost: 8  },
    { name: 'Esmaltado semi gratis',      cost: 6  },
    { name: 'Pedicura gratis',            cost: 10 },
  ],
  'Estética': [
    { name: 'Sesión facial gratis',       cost: 10 },
    { name: 'Limpieza facial gratis',     cost: 8  },
  ],
  'Spa': [
    { name: 'Masaje 30 min gratis',       cost: 12 },
    { name: 'Circuito spa para 1 gratis', cost: 18 },
  ],
  'Tatuajes': [
    { name: 'Retoque gratis',             cost: 6  },
    { name: 'Tattoo chico gratis',        cost: 18 },
  ],
  'Depilación': [
    { name: 'Sesión gratis (zona chica)', cost: 8  },
    { name: 'Sesión gratis (zona grande)', cost: 14 },
  ],

  // ── Salud y bienestar ──
  'Farmacia': [
    { name: 'Medición de presión gratis', cost: 3  },
    { name: 'Producto del mes gratis',    cost: 8  },
  ],
  'Óptica': [
    { name: 'Limpieza ultrasonido gratis', cost: 4 },
    { name: 'Estuche gratis',             cost: 5  },
  ],
  'Kinesiología': [
    { name: 'Sesión gratis',              cost: 10 },
    { name: 'Evaluación postural gratis', cost: 6  },
  ],
  'Nutrición': [
    { name: 'Consulta de seguimiento gratis', cost: 8 },
    { name: 'Plan personalizado gratis',  cost: 14 },
  ],
  'Psicología': [
    { name: 'Sesión gratis',              cost: 12 },
  ],
  'Odontología': [
    { name: 'Limpieza dental gratis',     cost: 12 },
    { name: 'Evaluación gratis',          cost: 6  },
  ],
  'Veterinaria': [
    { name: 'Consulta gratis',            cost: 10 },
    { name: 'Baño gratis para tu mascota', cost: 8  },
    { name: 'Vacuna gratis',              cost: 12 },
  ],

  // ── Indumentaria ──
  'Indumentaria': [
    { name: 'Remera gratis',              cost: 15 },
    { name: 'Accesorio gratis',           cost: 8  },
    { name: 'Producto destacado del mes gratis', cost: 18 },
  ],
  'Calzado': [
    { name: 'Plantillas gratis',          cost: 5  },
    { name: 'Service de calzado gratis',  cost: 6  },
    { name: 'Par destacado del mes gratis', cost: 20 },
  ],
  'Joyería': [
    { name: 'Limpieza de joya gratis',    cost: 6  },
    { name: 'Accesorio chico gratis',     cost: 12 },
  ],
  'Bijouterie': [
    { name: 'Aro gratis',                 cost: 6  },
    { name: 'Collar gratis',              cost: 8  },
    { name: 'Pulsera gratis',             cost: 5  },
  ],

  // ── Servicios ──
  'Lavandería': [
    { name: 'Lavado chico gratis',        cost: 6  },
    { name: 'Lavado grande gratis',       cost: 10 },
  ],
  'Tintorería': [
    { name: 'Tintura de prenda gratis',   cost: 6  },
    { name: 'Lavado a seco gratis',       cost: 8  },
  ],
  'Lavadero de autos': [
    { name: 'Lavado básico gratis',       cost: 8  },
    { name: 'Lavado completo gratis',     cost: 12 },
    { name: 'Aspirado gratis',            cost: 4  },
  ],

  // ── Automotor ──
  'Mecánica': [
    { name: 'Diagnóstico gratis',         cost: 8  },
    { name: 'Cambio de aceite gratis',    cost: 14 },
  ],
  'Gomería': [
    { name: 'Inflado y rotación gratis',  cost: 4  },
    { name: 'Alineación gratis',          cost: 12 },
  ],

  // ── Educacion y recreacion ──
  'Gimnasio': [
    { name: 'Clase gratis',               cost: 6  },
    { name: 'Mes de membresía gratis',    cost: 30 },
    { name: 'Evaluación física gratis',   cost: 8  },
  ],
  'Yoga / Pilates': [
    { name: 'Clase gratis',               cost: 6  },
    { name: 'Pack 4 clases gratis',       cost: 18 },
  ],
  'Academia': [
    { name: 'Clase de prueba gratis',     cost: 6  },
    { name: 'Material de apoyo gratis',   cost: 5  },
  ],
  'Idiomas': [
    { name: 'Clase de prueba gratis',     cost: 6  },
    { name: 'Pack 4 clases gratis',       cost: 18 },
  ],
  'Escuela de música': [
    { name: 'Clase de prueba gratis',     cost: 6  },
    { name: 'Pack 4 clases gratis',       cost: 18 },
  ],

  // ── Hogar y decoracion ──
  'Mueblería': [
    { name: 'Envío gratis dentro de la ciudad', cost: 10 },
    { name: 'Almohadón de regalo',        cost: 5  },
    { name: 'Producto destacado del mes gratis', cost: 18 },
  ],
  'Decoración': [
    { name: 'Envoltorio de regalo gratis', cost: 5  },
    { name: 'Producto destacado del mes gratis', cost: 14 },
  ],
  'Florería': [
    { name: 'Ramo chico gratis',          cost: 12 },
    { name: 'Envío gratis a domicilio',   cost: 8  },
    { name: 'Bouquet del mes gratis',     cost: 18 },
  ],
  'Juguetería': [
    { name: 'Envoltorio de regalo gratis', cost: 4  },
    { name: 'Juguete chico gratis',       cost: 12 },
    { name: 'Producto destacado del mes gratis', cost: 18 },
  ],
  'Vivero': [
    { name: 'Planta chica de regalo',     cost: 10 },
    { name: 'Bolsa de tierra fértil gratis', cost: 6 },
    { name: 'Asesoramiento personalizado', cost: 8  },
  ],
  'Bazar': [
    { name: 'Producto destacado del mes gratis', cost: 14 },
    { name: 'Vaso o taza gratis',         cost: 6  },
  ],

  // ── Default ──
  // Para cualquier rubro que no este en el map. Premios genericos
  // que aplican a la mayoria de los negocios.
  '_default': [
    { name: 'Producto del mes gratis',    cost: 12 },
    { name: 'Producto destacado gratis',  cost: 10 },
    { name: 'Sorpresa de cumpleaños',     cost: 15 },
  ],
}

/**
 * Devuelve premios sugeridos para un comercio segun sus categorias.
 * @param {string[]} categories - array de nombres de subcategoria del comercio.
 * @param {('stars'|'points')} systemType - sistema de fidelizacion del comercio.
 * @returns {{name:string, cost:number, system_type:string}[]}
 */
export function getSuggestedPrizes(categories, systemType) {
  const list = (() => {
    if (!Array.isArray(categories) || categories.length === 0) {
      return SUGGESTED_PRIZES._default
    }
    for (const cat of categories) {
      if (SUGGESTED_PRIZES[cat]) return SUGGESTED_PRIZES[cat]
    }
    return SUGGESTED_PRIZES._default
  })()
  // Para points, escalamos x100 (1 estrella = 100 puntos como heuristica).
  const multiplier = systemType === 'points' ? 100 : 1
  return list.map(p => ({
    name:         p.name,
    cost:         Math.round(p.cost * multiplier),
    system_type:  systemType === 'points' ? 'points' : 'stars',
  }))
}

export default SUGGESTED_PRIZES
