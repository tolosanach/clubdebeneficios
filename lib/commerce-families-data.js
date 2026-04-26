// Single source of truth for commerce category structure.
// No icons — safe to import in both server (API routes) and client (page.js).
export const FAMILIES_DATA = [
  { id: 'gastronomia',  name: 'Gastronomía',          subs: ['Cafetería','Restaurante','Bar','Pizzería','Heladería','Panadería','Rotisería','Cervecería','Vinería','Food truck'] },
  { id: 'minorista',    name: 'Comercio minorista',    subs: ['Kiosco','Almacén','Mini market','Supermercado','Verdulería','Carnicería','Pescadería','Pollería','Fiambrería','Dietética','Librería','Papelería','Ferretería','Pinturería','Bicicletería','Pet shop'] },
  { id: 'belleza',      name: 'Belleza y estética',    subs: ['Barbería','Peluquería','Manicura','Estética','Spa','Tatuajes','Depilación'] },
  { id: 'salud',        name: 'Salud y bienestar',     subs: ['Farmacia','Óptica','Kinesiología','Nutrición','Psicología','Odontología','Veterinaria'] },
  { id: 'indumentaria', name: 'Indumentaria',          subs: ['Indumentaria','Calzado','Joyería','Bijouterie'] },
  { id: 'hogar',        name: 'Hogar y decoración',    subs: ['Decoración','Vivero','Florería','Juguetería','Mueblería','Bazar'] },
  { id: 'servicios',    name: 'Servicios',             subs: ['Lavandería','Tintorería','Inmobiliaria','Fotografía','Imprenta','Cerrajería','Quiniela / Lotería','Casa de cambio','Tabaquería'] },
  { id: 'automotor',    name: 'Automotor',             subs: ['Gomería','Mecánica','Repuestos','Lavadero de autos','Estación de servicio'] },
  { id: 'educacion',    name: 'Educación y recreación',subs: ['Academia','Yoga / Pilates','Idiomas','Escuela de música','Gimnasio'] },
  { id: 'otro',         name: 'Otro',                  subs: [] },
]
