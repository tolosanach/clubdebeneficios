// Datos de provincias + ciudades de Argentina. Compartido entre los flujos
// de signup (MinimalSignupModal) y los wizards del perfil (ProfileItemWizard)
// para evitar duplicación.

export const LOCATIONS = {
  argentina: {
    name: 'Argentina',
    provinces: {
      buenosAires:       { name: 'Buenos Aires',          cities: ['La Plata','Mar del Plata','Bahía Blanca','Tandil','Olavarría','Pergamino','Junín','Necochea','San Nicolás','Zárate','Campana','Pilar','Tigre','San Isidro','Vicente López','Avellaneda','Quilmes','Lanús','Lomas de Zamora','Morón','Merlo','Moreno','La Matanza','Florencio Varela','Berazategui'] },
      caba:              { name: 'CABA',                  cities: ['Ciudad Autónoma de Buenos Aires'] },
      cordoba:           { name: 'Córdoba',               cities: ['Córdoba','Villa Carlos Paz','Río Cuarto','Villa María','San Francisco','Jesús María','Alta Gracia','La Falda','Cosquín','Bell Ville'] },
      santaFe:           { name: 'Santa Fe',              cities: ['Rosario','Santa Fe','Rafaela','Venado Tuerto','Reconquista','Villa Gobernador Gálvez','Casilda','Esperanza','San Lorenzo'] },
      mendoza:           { name: 'Mendoza',               cities: ['Mendoza','San Rafael','Godoy Cruz','Guaymallén','Las Heras','Maipú','Luján de Cuyo','Tunuyán','San Martín'] },
      tucuman:           { name: 'Tucumán',               cities: ['San Miguel de Tucumán','Yerba Buena','Tafí Viejo','Concepción','Banda del Río Salí','Alderetes','Aguilares','Monteros'] },
      entreRios:         { name: 'Entre Ríos',            cities: ['Paraná','Concordia','Gualeguaychú','Concepción del Uruguay','Gualeguay','Villaguay','Chajarí','Victoria','Colón'] },
      salta:             { name: 'Salta',                 cities: ['Salta','San Ramón de la Nueva Orán','Tartagal','General Güemes','Metán','Cafayate','Rosario de la Frontera'] },
      misiones:          { name: 'Misiones',              cities: ['Posadas','Oberá','Eldorado','Puerto Iguazú','Apóstoles','Jardín América','Leandro N. Alem','Montecarlo'] },
      chaco:             { name: 'Chaco',                 cities: ['Resistencia','Presidencia Roque Sáenz Peña','Villa Ángela','General San Martín','Charata','Barranqueras'] },
      corrientes:        { name: 'Corrientes',            cities: ['Corrientes','Goya','Paso de los Libres','Mercedes','Curuzú Cuatiá','Santo Tomé','Bella Vista','Monte Caseros'] },
      santiagoDelEstero: { name: 'Santiago del Estero',   cities: ['Santiago del Estero','La Banda','Termas de Río Hondo','Añatuya','Frías','Fernández'] },
      sanJuan:           { name: 'San Juan',              cities: ['San Juan','Rawson','Chimbas','Rivadavia','Santa Lucía','Pocito','Caucete','Albardón'] },
      jujuy:             { name: 'Jujuy',                 cities: ['San Salvador de Jujuy','Palpalá','San Pedro','Libertador General San Martín','Perico','La Quiaca','Humahuaca','Tilcara'] },
      rioNegro:          { name: 'Río Negro',             cities: ['Viedma','San Carlos de Bariloche','General Roca','Cipolletti','Allen','Villa Regina','El Bolsón'] },
      neuquen:           { name: 'Neuquén',               cities: ['Neuquén','San Martín de los Andes','Zapala','Centenario','Plottier','Cutral Có','Villa La Angostura'] },
      formosa:           { name: 'Formosa',               cities: ['Formosa','Clorinda','Pirané','El Colorado','Ingeniero Juárez'] },
      chubut:            { name: 'Chubut',                cities: ['Rawson','Comodoro Rivadavia','Trelew','Puerto Madryn','Esquel','Sarmiento','Rada Tilly'] },
      sanLuis:           { name: 'San Luis',              cities: ['San Luis','Villa Mercedes','Merlo','La Punta','Justo Daract','Juana Koslay'] },
      catamarca:         { name: 'Catamarca',             cities: ['San Fernando del Valle de Catamarca','Recreo','Tinogasta','Andalgalá','Belén','Santa María'] },
      laRioja:           { name: 'La Rioja',              cities: ['La Rioja','Chilecito','Aimogasta','Chamical','Chepes'] },
      laPampa:           { name: 'La Pampa',              cities: ['Santa Rosa','General Pico','Toay','General Acha','Eduardo Castex','Realicó','Victorica','Intendente Alvear','25 de Mayo','Macachín'] },
      santaCruz:         { name: 'Santa Cruz',            cities: ['Río Gallegos','Caleta Olivia','El Calafate','Pico Truncado','Puerto Deseado','Las Heras','Puerto San Julián'] },
      tierraDelFuego:    { name: 'Tierra del Fuego',      cities: ['Ushuaia','Río Grande','Tolhuin'] },
    },
  },
}
