// Single source of truth for commerce category structure.
// No icons — safe to import in both server (API routes) and client (page.js).
//
// Cada subcategoría tiene un array de "aliases": palabras coloquiales o variantes
// que el usuario podría escribir al buscar (ej: "ropa" para "Indumentaria").
// La búsqueda en el flujo de registro de comercio mira nombre + aliases.
export const FAMILIES_DATA = [
  {
    id: 'gastronomia',
    name: 'Gastronomía',
    subs: [
      { name: 'Cafetería',  aliases: ['cafe', 'cafeteria', 'coffee', 'coffee shop'] },
      { name: 'Restaurante', aliases: ['resto', 'restaurant', 'parrilla', 'parrillada', 'comida'] },
      { name: 'Bar',        aliases: ['pub', 'cervezeria', 'bar de tragos'] },
      { name: 'Pizzería',   aliases: ['pizza', 'pizzas', 'pizzeria'] },
      { name: 'Heladería',  aliases: ['helado', 'helados', 'heladeria', 'ice cream'] },
      { name: 'Panadería',  aliases: ['pan', 'panaderia', 'panificadora', 'facturas'] },
      { name: 'Rotisería',  aliases: ['rotiseria', 'comida para llevar', 'pollos al spiedo'] },
      { name: 'Cervecería', aliases: ['cerveza', 'cervezas', 'cerveceria', 'beer', 'brewery'] },
      { name: 'Vinería',    aliases: ['vinos', 'vino', 'wine', 'vineria'] },
      { name: 'Food truck', aliases: ['foodtruck', 'comida ambulante'] },
    ],
  },
  {
    id: 'minorista',
    name: 'Comercio minorista',
    subs: [
      { name: 'Kiosco',       aliases: ['maxikiosco', 'kioskito', 'kiosko'] },
      { name: 'Almacén',      aliases: ['almacen', 'despensa', 'autoservicio'] },
      { name: 'Mini market',  aliases: ['market', 'minimarket'] },
      { name: 'Supermercado', aliases: ['super', 'hipermercado'] },
      { name: 'Verdulería',   aliases: ['verduras', 'frutas', 'fruteria', 'frutas y verduras', 'verduleria'] },
      { name: 'Carnicería',   aliases: ['carne', 'carnes', 'carniceria'] },
      { name: 'Pescadería',   aliases: ['pescado', 'pescados', 'mariscos', 'pescaderia'] },
      { name: 'Pollería',     aliases: ['pollo', 'pollos', 'polleria'] },
      { name: 'Fiambrería',   aliases: ['fiambres', 'fiambreria', 'embutidos'] },
      { name: 'Dietética',    aliases: ['dieta', 'alimentos saludables', 'organico', 'dietetica'] },
      { name: 'Librería',     aliases: ['libros', 'libreria', 'articulos escolares', 'escolar'] },
      { name: 'Papelería',    aliases: ['papel', 'regaleria', 'papeleria'] },
      { name: 'Ferretería',   aliases: ['ferreteria', 'herramientas', 'materiales construccion'] },
      { name: 'Pinturería',   aliases: ['pinturas', 'pintura', 'pintureria'] },
      { name: 'Bicicletería', aliases: ['bicicletas', 'bicis', 'bicicleteria', 'taller bici'] },
      { name: 'Pet shop',     aliases: ['mascotas', 'perros', 'gatos', 'petshop', 'accesorios mascotas'] },
    ],
  },
  {
    id: 'belleza',
    name: 'Belleza y estética',
    subs: [
      { name: 'Barbería',   aliases: ['barberia', 'barber', 'corte caballero'] },
      { name: 'Peluquería', aliases: ['peluqueria', 'peluquero', 'peluquera', 'salon de belleza'] },
      { name: 'Manicura',   aliases: ['uñas', 'unas', 'nails', 'manicure', 'manicuria'] },
      { name: 'Estética',   aliases: ['estetica', 'tratamientos faciales', 'dermatologia'] },
      { name: 'Spa',        aliases: ['masajes', 'relax', 'spa'] },
      { name: 'Tatuajes',   aliases: ['tattoo', 'tatuaje', 'tinta'] },
      { name: 'Depilación', aliases: ['depilacion', 'laser', 'cera', 'depilatoria'] },
    ],
  },
  {
    id: 'salud',
    name: 'Salud y bienestar',
    subs: [
      { name: 'Farmacia',     aliases: ['drogueria', 'medicamentos'] },
      { name: 'Óptica',       aliases: ['optica', 'anteojos', 'lentes', 'gafas'] },
      { name: 'Kinesiología', aliases: ['kinesiologia', 'kinesiologo', 'fisio', 'fisioterapia'] },
      { name: 'Nutrición',    aliases: ['nutricion', 'nutricionista', 'dietista'] },
      { name: 'Psicología',   aliases: ['psicologia', 'psicologo', 'psicologa', 'psicoterapia'] },
      { name: 'Odontología',  aliases: ['dentista', 'odontologia', 'dental', 'dientes'] },
      { name: 'Veterinaria',  aliases: ['vet', 'veterinario', 'animales'] },
    ],
  },
  {
    id: 'indumentaria',
    name: 'Indumentaria',
    subs: [
      { name: 'Indumentaria', aliases: ['ropa', 'boutique', 'roperia', 'moda', 'tienda de ropa', 'vestimenta', 'ropita', 'indumentaria femenina', 'indumentaria masculina'] },
      { name: 'Calzado',      aliases: ['zapatos', 'zapateria', 'zapatilla', 'zapatillas', 'sneakers', 'sandalias'] },
      { name: 'Joyería',      aliases: ['joyeria', 'joyas', 'oro', 'plata', 'anillos'] },
      { name: 'Bijouterie',   aliases: ['bijou', 'accesorios', 'abalorios'] },
    ],
  },
  {
    id: 'hogar',
    name: 'Hogar y decoración',
    subs: [
      { name: 'Decoración', aliases: ['decoracion', 'hogar', 'deco', 'blanqueria'] },
      { name: 'Vivero',     aliases: ['plantas', 'jardineria'] },
      { name: 'Florería',   aliases: ['floreria', 'flores', 'ramos', 'arreglo floral'] },
      { name: 'Juguetería', aliases: ['jugueteria', 'juguetes', 'niños'] },
      { name: 'Mueblería',  aliases: ['muebleria', 'muebles', 'sillon', 'sofa'] },
      { name: 'Bazar',      aliases: ['articulos hogar', 'bazares', 'vajilla'] },
    ],
  },
  {
    id: 'servicios',
    name: 'Servicios',
    subs: [
      { name: 'Lavandería',         aliases: ['lavanderia', 'lavadero ropa'] },
      { name: 'Tintorería',         aliases: ['tintoreria', 'lavar planchar'] },
      { name: 'Inmobiliaria',       aliases: ['inmuebles', 'propiedades', 'alquiler'] },
      { name: 'Fotografía',         aliases: ['fotografia', 'fotografo', 'fotos'] },
      { name: 'Imprenta',           aliases: ['impresion', 'copias', 'fotocopias'] },
      { name: 'Cerrajería',         aliases: ['cerrajeria', 'llaves', 'cerradura'] },
      { name: 'Quiniela / Lotería', aliases: ['quiniela', 'loteria', 'juegos azar', 'agencia'] },
      { name: 'Casa de cambio',     aliases: ['cambio', 'dolar', 'divisas'] },
      { name: 'Tabaquería',         aliases: ['tabaqueria', 'cigarrillos', 'tabaco'] },
    ],
  },
  {
    id: 'automotor',
    name: 'Automotor',
    subs: [
      { name: 'Gomería',             aliases: ['gomeria', 'neumaticos', 'ruedas', 'cubiertas'] },
      { name: 'Mecánica',            aliases: ['mecanica', 'taller mecanico', 'taller', 'autos'] },
      { name: 'Repuestos',           aliases: ['autopartes', 'accesorios auto'] },
      { name: 'Lavadero de autos',   aliases: ['lavadero', 'car wash', 'lavar auto'] },
      { name: 'Estación de servicio', aliases: ['estacion servicio', 'ypf', 'shell', 'axion', 'nafta', 'combustible'] },
    ],
  },
  {
    id: 'educacion',
    name: 'Educación y recreación',
    subs: [
      { name: 'Academia',          aliases: ['instituto', 'cursos'] },
      { name: 'Yoga / Pilates',    aliases: ['yoga', 'pilates', 'meditacion'] },
      { name: 'Idiomas',           aliases: ['ingles', 'frances', 'italiano', 'portugues'] },
      { name: 'Escuela de música', aliases: ['musica', 'instrumentos'] },
      { name: 'Gimnasio',          aliases: ['gym', 'gimnasio', 'fitness', 'crossfit'] },
    ],
  },
  { id: 'otro', name: 'Otro', subs: [] },
]
