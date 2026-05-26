export const rubros = {
  peluquerias: {
    nombre: 'Peluquerías y barberías',
    icono: 'scissors',
    pill: '✂️ Para peluquerías y barberías',
    heroTitle: 'Tus clientes vienen seguido.\nHacelos volver siempre.',
    heroSub: 'Clufix le da a tu peluquería un club de beneficios que premia la fidelidad sin complicaciones.',
    flujo: [
      { titulo: 'El cliente se suma', desc: 'Escanea el QR de tu peluquería y queda en tu club al instante. Recibe un cupón de bienvenida automático.' },
      { titulo: 'Acumula recompensas', desc: 'Cada vez que viene, escaneás su QR en segundos. El sistema suma estrellas o puntos según configuraste tu club.' },
      { titulo: 'Canjea su premio', desc: 'A la 10ª visita, el sistema avisa y el cliente canjea su corte, tratamiento o lo que vos definas.' },
    ],
    beneficiosRubro: [
      { icono: 'star',           titulo: 'Corte gratis a la 10ª visita',     desc: 'El clásico que fideliza. El cliente ve su progreso en cada visita y vuelve para llegar al premio.' },
      { icono: 'ticket',         titulo: 'Cupón 15% off próxima vez',         desc: 'Se entrega automáticamente al sumarse al club. El que vino una vez tiene razón para volver.' },
      { icono: 'bolt',           titulo: 'Doble estrellas los martes',         desc: 'Activá los días que tenés menos trabajo y tus clientes frecuentes van a elegir venir esos días.' },
      { icono: 'message-circle', titulo: 'Reactivá clientes inactivos',        desc: 'Clufix detecta quién no vino en 30 días y prepara el mensaje — vos lo enviás con un tap. (Plan Pro)' },
    ],
    ctaTitle: 'Tu peluquería merece clientes que vuelven solos.',
    faqs: [
      { q: '¿Mis clientes tienen que descargar una app?',       a: 'Clufix funciona desde el navegador del celular, sin descargar nada. El cliente escanea el QR, abre la app en el browser, y ya está dentro de tu club.' },
      { q: '¿Qué pasa si ya tengo un sistema de tarjetitas?',   a: 'Podés migrar tus clientes existentes manualmente desde el panel, con nombre, email y teléfono.' },
      { q: '¿Necesito un lector especial o algún hardware?',    a: 'No. Todo funciona desde el celular. Vos usás la cámara del tuyo para escanear el QR del cliente.' },
      { q: '¿Puedo cambiar de plan en cualquier momento?',      a: 'Sí, sin permanencia ni penalidades. Subís o bajás de plan cuando quieras desde el panel de configuración.' },
      { q: '¿Qué pasa con mis datos y los de mis clientes?',    a: 'Tus datos son tuyos. Clufix no los comparte ni los vende.' },
    ],
  },

  farmacias: {
    nombre: 'Farmacias y perfumerías',
    icono: 'pill',
    pill: '💊 Para farmacias y perfumerías',
    heroTitle: 'Tus clientes vienen seguido.\nHacelos volver a vos.',
    heroSub: 'Clufix le da a tu farmacia un club de beneficios que premia la fidelidad sin complicaciones.',
    flujo: [
      { titulo: 'El cliente se suma',    desc: 'Escanea el QR de tu farmacia y queda registrado. Recibe un cupón de bienvenida automáticamente.' },
      { titulo: 'Acumula recompensas',   desc: 'Cada compra, escaneás su QR en segundos. El sistema suma estrellas o puntos según configuraste tu club.' },
      { titulo: 'Canjea su premio',      desc: 'Cuando llega al tope, elige su regalo: producto, descuento, o lo que vos definas. El stock se descuenta solo.' },
    ],
    beneficiosRubro: [
      { icono: 'pill',           titulo: 'Puntos por cada receta',        desc: 'El cliente crónico que viene cada mes acumula puntos y los canjea en productos de perfumería o vitaminas.' },
      { icono: 'ticket',         titulo: 'Cupón de bienvenida 10% off',   desc: 'Quien se suma al club recibe automáticamente un cupón para su próxima compra.' },
      { icono: 'calendar',       titulo: 'Doble puntos los miércoles',    desc: 'Un día tranquilo se convierte en el favorito de tus clientes frecuentes.' },
      { icono: 'message-circle', titulo: 'Reactivá al que no vino',       desc: '"Hace 30 días que no te vemos, tenés X puntos esperándote." Clufix detecta el momento y prepara el mensaje — vos lo enviás con un tap. (Plan Pro)' },
    ],
    ctaTitle: 'Tu farmacia ya tiene clientes fieles. Ahora hacelos sentir que los recordás.',
    faqs: [
      { q: '¿Mis clientes tienen que descargar una app?',       a: 'Clufix funciona desde el navegador del celular, sin descargar nada.' },
      { q: '¿Qué pasa si ya tengo un sistema de tarjetitas?',   a: 'Podés migrar tus clientes existentes manualmente desde el panel.' },
      { q: '¿Necesito un lector especial o algún hardware?',    a: 'No. Todo funciona desde el celular.' },
      { q: '¿Puedo cambiar de plan en cualquier momento?',      a: 'Sí, sin permanencia ni penalidades.' },
      { q: '¿Qué pasa con mis datos y los de mis clientes?',    a: 'Tus datos son tuyos. Clufix no los comparte ni los vende.' },
    ],
  },

  indumentaria: {
    nombre: 'Indumentaria y ropa',
    icono: 'hanger',
    pill: '👗 Para locales de ropa e indumentaria',
    heroTitle: 'Que cada compra sea\nel inicio de la próxima.',
    heroSub: 'Clufix convierte compradores ocasionales en clientes que vuelven temporada tras temporada.',
    flujo: [
      { titulo: 'El cliente se suma',   desc: 'Escanea el QR de tu local, queda registrado y recibe un cupón de bienvenida automáticamente.' },
      { titulo: 'Acumula puntos',       desc: 'Cada peso que gasta suma puntos. Vos ingresás el importe y el sistema hace el resto.' },
      { titulo: 'Canjea su premio',     desc: 'Cuando llega al monto, elige su regalo: descuento, prenda, accesorio — lo que vos definas.' },
    ],
    beneficiosRubro: [
      { icono: 'coin',           titulo: 'Puntos por cada peso gastado',          desc: '1 punto = 1 peso. El cliente ve crecer su saldo en tiempo real y tiene razón para volver.' },
      { icono: 'ticket',         titulo: 'Cupón 20% off al sumarse',              desc: 'Quien entra a tu local y se suma al club recibe un descuento automático para la próxima compra.' },
      { icono: 'bolt',           titulo: 'Puntos ×2 en días clave',               desc: 'Activá el doble de puntos en días de nueva colección, liquidación o los que tenés menos movimiento.' },
      { icono: 'message-circle', titulo: 'WhatsApp a clientes que no vuelven',    desc: 'Clufix detecta quién no compró en 30 días y prepara el mensaje — vos lo enviás con un tap. (Plan Pro)' },
    ],
    ctaTitle: 'Tu local de ropa merece clientes que vuelven cada temporada.',
    faqs: [
      { q: '¿Mis clientes tienen que descargar una app?',       a: 'Clufix funciona desde el navegador del celular, sin descargar nada.' },
      { q: '¿Qué pasa si ya tengo un sistema de tarjetitas?',   a: 'Podés migrar tus clientes existentes manualmente desde el panel.' },
      { q: '¿Necesito un lector especial o algún hardware?',    a: 'No. Todo funciona desde el celular.' },
      { q: '¿Puedo cambiar de plan en cualquier momento?',      a: 'Sí, sin permanencia ni penalidades.' },
      { q: '¿Qué pasa con mis datos y los de mis clientes?',    a: 'Tus datos son tuyos. Clufix no los comparte ni los vende.' },
    ],
  },

  restaurantes: {
    nombre: 'Restaurantes y cafeterías',
    icono: 'tools-kitchen-2',
    pill: '🍽️ Para restaurantes y cafeterías',
    heroTitle: 'Tus clientes comen bien.\nHacelos volver seguido.',
    heroSub: 'Clufix le da a tu restaurant un programa de fidelización que llena los días flojos y fideliza a los habituales.',
    flujo: [
      { titulo: 'El cliente se suma',    desc: 'Escanea el QR de tu local al llegar o al pagar. Queda en tu club y recibe un cupón de bienvenida.' },
      { titulo: 'Acumula recompensas',   desc: 'Cada visita suma estrellas. También podés sumar puntos por el importe del ticket.' },
      { titulo: 'Canjea su premio',      desc: 'Una entrada, un postre, un descuento — lo que vos definas. El sistema avisa cuando llega al tope.' },
    ],
    beneficiosRubro: [
      { icono: 'star',           titulo: 'Postre gratis a la 10ª visita',   desc: 'El cliente ve su progreso y vuelve para completarlo. Simple y efectivo.' },
      { icono: 'bolt',           titulo: 'Doble estrellas los martes',       desc: 'Convertí el día más flojo en el favorito de tus clientes frecuentes.' },
      { icono: 'ticket',         titulo: 'Cupón bienvenida 15% off',         desc: 'El que vino una vez tiene una razón concreta para volver la próxima semana.' },
      { icono: 'message-circle', titulo: 'Reactivá clientes inactivos',      desc: '"Hace 3 semanas que no te vemos, tenés X estrellas esperándote." Clufix detecta el momento y prepara el mensaje — vos lo enviás con un tap. (Plan Pro)' },
    ],
    ctaTitle: 'Tu restaurant merece clientes que vuelven solos.',
    faqs: [
      { q: '¿Mis clientes tienen que descargar una app?',   a: 'Clufix funciona desde el navegador del celular, sin descargar nada.' },
      { q: '¿Funciona para delivery también?',              a: 'Sí. Podés registrar visitas manuales para pedidos por delivery o teléfono desde el panel.' },
      { q: '¿Necesito un lector especial o algún hardware?', a: 'No. Todo funciona desde el celular.' },
      { q: '¿Puedo cambiar de plan en cualquier momento?',  a: 'Sí, sin permanencia ni penalidades.' },
      { q: '¿Qué pasa con mis datos y los de mis clientes?', a: 'Tus datos son tuyos. Clufix no los comparte ni los vende.' },
    ],
  },

  gimnasios: {
    nombre: 'Gimnasios y deportes',
    icono: 'barbell',
    pill: '💪 Para gimnasios y centros deportivos',
    heroTitle: 'Tus socios entrenan duro.\nPremialos por volver.',
    heroSub: 'Clufix le da a tu gimnasio un sistema de fidelización que premia la constancia y reduce la deserción.',
    flujo: [
      { titulo: 'El socio se suma',         desc: 'Escanea el QR del gimnasio y queda en tu club. Recibe un beneficio de bienvenida automático.' },
      { titulo: 'Acumula por asistencia',    desc: 'Cada vez que viene, registrás su visita en segundos. El sistema suma estrellas por cada entrenamiento.' },
      { titulo: 'Canjea su premio',          desc: 'Clase de spinning gratis, mes descontado, producto de nutrición — lo que vos definas. El sistema avisa cuando llega.' },
    ],
    beneficiosRubro: [
      { icono: 'star',           titulo: 'Clase gratis a la 20ª asistencia',    desc: 'El socio ve su racha y tiene un incentivo concreto para no faltar.' },
      { icono: 'bolt',           titulo: 'Doble estrellas en semanas clave',    desc: 'Activá doble puntos en enero, después de vacaciones o cuando baja la asistencia.' },
      { icono: 'ticket',         titulo: 'Mes con descuento al renovar',        desc: 'Premiá la renovación anticipada con un cupón automático.' },
      { icono: 'message-circle', titulo: 'Aviso al socio que no viene',         desc: '"Hace 2 semanas que no te vemos, tenés X estrellas esperándote." Clufix detecta el momento y prepara el mensaje — vos lo enviás con un tap. (Plan Pro)' },
    ],
    ctaTitle: 'Tu gimnasio merece socios que no se van.',
    faqs: [
      { q: '¿Funciona con membresías mensuales?',           a: 'Sí. Podés configurar el sistema para sumar estrellas por asistencia independientemente de la membresía.' },
      { q: '¿Mis socios tienen que descargar una app?',     a: 'Clufix funciona desde el navegador del celular, sin descargar nada.' },
      { q: '¿Necesito un lector especial o algún hardware?', a: 'No. Todo funciona desde el celular.' },
      { q: '¿Puedo cambiar de plan en cualquier momento?',  a: 'Sí, sin permanencia ni penalidades.' },
      { q: '¿Qué pasa con mis datos y los de mis clientes?', a: 'Tus datos son tuyos. Clufix no los comparte ni los vende.' },
    ],
  },

  jugeterias: {
    nombre: 'Jugueterías',
    icono: 'building-store',
    pill: '🧸 Para jugueterías y tiendas infantiles',
    heroTitle: 'Los chicos eligen.\nLos papás vuelven a vos.',
    heroSub: 'Clufix le da a tu juguetería un programa de puntos que fideliza a las familias y potencia las fechas clave.',
    flujo: [
      { titulo: 'La familia se suma',        desc: 'Escanea el QR de tu local y queda en tu club. Recibe un cupón de bienvenida automático.' },
      { titulo: 'Acumula por cada compra',   desc: 'Cada peso gastado suma puntos. En cumpleaños, Navidad y Día del Niño, el saldo crece más rápido.' },
      { titulo: 'Canjea su premio',          desc: 'Descuento en la próxima compra, accesorio gratis, o lo que vos definas. El sistema avisa cuando llega.' },
    ],
    beneficiosRubro: [
      { icono: 'coin',           titulo: 'Puntos por cada peso gastado',         desc: 'Las familias acumulan en cada visita y tienen una razón para volver antes de las fechas clave.' },
      { icono: 'bolt',           titulo: 'Puntos ×3 en Día del Niño',            desc: 'Las fechas especiales se convierten en una ventaja frente a la competencia.' },
      { icono: 'ticket',         titulo: 'Cupón de bienvenida 10% off',          desc: 'La familia que entró una vez tiene una razón concreta para volver.' },
      { icono: 'message-circle', titulo: 'Recordatorio previo a fechas clave',   desc: '"Se acerca el Día del Niño, tenés X puntos para canjear." Clufix detecta el momento y prepara el mensaje — vos lo enviás con un tap. (Plan Pro)' },
    ],
    ctaTitle: 'Tu juguetería merece familias que vuelven en cada fecha especial.',
    faqs: [
      { q: '¿Mis clientes tienen que descargar una app?',          a: 'Clufix funciona desde el navegador del celular, sin descargar nada.' },
      { q: '¿Puedo activar puntos extra solo en algunas fechas?',  a: 'Sí. Desde el panel podés activar y desactivar los días bonus cuando quieras.' },
      { q: '¿Necesito un lector especial o algún hardware?',       a: 'No. Todo funciona desde el celular.' },
      { q: '¿Puedo cambiar de plan en cualquier momento?',         a: 'Sí, sin permanencia ni penalidades.' },
      { q: '¿Qué pasa con mis datos y los de mis clientes?',       a: 'Tus datos son tuyos. Clufix no los comparte ni los vende.' },
    ],
  },
}

export const rubroList = [
  { slug: 'peluquerias',  label: 'Peluquerías',   emoji: '✂️' },
  { slug: 'farmacias',    label: 'Farmacias',      emoji: '💊' },
  { slug: 'indumentaria', label: 'Indumentaria',   emoji: '👗' },
  { slug: 'restaurantes', label: 'Restaurantes',   emoji: '🍽️' },
  { slug: 'gimnasios',    label: 'Gimnasios',      emoji: '💪' },
  { slug: 'jugeterias',   label: 'Jugueterías',    emoji: '🧸' },
]
