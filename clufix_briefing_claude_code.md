# Clufix — Briefing completo para implementación en repo

## Contexto del proyecto

**Repo:** github.com/tolosanach/clubdebeneficios  
**Deploy:** clubdebeneficios.vercel.app  
**Stack:** React + TypeScript + Tailwind CSS + Supabase  
**Dominio:** clufix.com.ar  

El proyecto se llamaba "Club de Beneficios / Benefix" y ahora se relanza como **Clufix**. Hay que implementar una nueva home pública y 6 páginas de rubro, sin tocar la lógica de la app existente.

---

## Sistema de diseño aprobado

### Paleta de colores

```css
--v1: #1A0050;  /* violeta muy oscuro — hero, secciones principales */
--v2: #3D0A9E;  /* violeta medio — testimonios, steps secundarios */
--v3: #6F30DF;  /* violeta original — bento, CTA final, badge planes */
--v4: #F0E8FF;  /* violeta claro — secciones alternadas claras */
--pk: #FF199F;  /* fucsia — SOLO botones CTA, labels, acento puntual */
--wh: #FEFEFE;  /* blanco */
```

**Regla importante:** el fucsia `#FF199F` NO se usa como fondo de sección. Solo aparece en: botones primarios, labels de sección pequeños ("El comercio", "La plataforma"), el punto decorativo del logo, el badge "Más popular" y detalles mínimos.

### Tipografía

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
```

- Font family: `Inter`
- Títulos hero: `font-size: 4rem; font-weight: 900; letter-spacing: -2.5px`
- Títulos sección: `font-size: 2.4rem; font-weight: 900; letter-spacing: -2px`
- Body: `font-size: 1rem; font-weight: 400`
- Labels superiores: `font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #FF199F`

### Logo

```jsx
// Nav y footer
<img src="/clufix_logo.svg" alt="Clufix" height="36" />
```

El SVG del logo ya existe en el repo. En nav va a la izquierda. En footer va a la izquierda también.

### Botones

```css
/* Primario — fucsia */
background: #FF199F; color: #fff; padding: 0.9rem 2.25rem;
border-radius: 100px; font-weight: 700; font-size: 0.95rem; border: none;

/* Secundario — ghost sobre fondo oscuro */
background: transparent; color: rgba(255,255,255,0.8);
padding: 0.9rem 2.25rem; border-radius: 100px; font-weight: 500;
border: 1.5px solid rgba(255,255,255,0.2);

/* Nav login */
color: #1A0050; padding: 0.5rem 1rem; border-radius: 100px;
border: 1.5px solid #ddd;

/* Nav register */
background: #1A0050; color: #fff; padding: 0.5rem 1.25rem;
border-radius: 100px; font-weight: 700; border: none;
```

### Íconos

Usar **Tabler Icons** outline únicamente. Ya está en el proyecto o instalar con:
```bash
npm install @tabler/icons-react
```

---

## Estructura de rutas a crear

```
/                          → Home nueva (reemplaza la home actual)
/rubros/peluquerias        → Landing peluquerías
/rubros/farmacias          → Landing farmacias
/rubros/indumentaria       → Landing indumentaria
/rubros/restaurantes       → Landing restaurantes
/rubros/gimnasios          → Landing gimnasios
/rubros/jugeterias         → Landing jugueterías
```

El componente de rubro es uno solo con contenido dinámico:
```
src/pages/RubroPage.tsx    → lee el param :rubro y carga el contenido
src/data/rubros.ts         → objeto con el contenido de cada rubro
```

---

## Home — estructura de secciones en orden

### 1. Nav

```
Logo (img svg) | links: "Precios" "Rubros" | botones: "Iniciar sesión" "Registrarse"
Height: 68px, border-bottom: 1px solid #f0eaff, background: #fff
```

### 2. Hero

- Fondo: `#1A0050`
- Eyebrow: "Tu club de beneficios" — fucsia, uppercase, letter-spacing
- H1: "Tus clientes ya existen. **Hacelos volver.**" — "Hacelos volver" en fucsia
- Subtítulo: "El sistema de fidelización más simple del país. Sin hardware, sin complicaciones."
- CTAs: [Crear mi club gratis] fucsia | [Ver cómo funciona] ghost
- Tagline abajo: "Escaneá ✦ Acumulá ✦ Canjeá" — muted, uppercase, puntos en fucsia

### 3. Split intro (2 columnas)

```
IZQUIERDA (#1A0050)              DERECHA (#F0E8FF)
Label: "Para el comercio"        Label: "Para el cliente"
H2: "Vos ponés las reglas."      H2: "Ellos acumulan."
"reglas" en fucsia               "acumulan" en violeta #6F30DF
p: texto descriptivo             p: texto descriptivo
```

### 4. Flow steps (6 pasos alternados)

Cada paso: grid 2 columnas — contenido | visual. Pasos impares: contenido izquierda. Pasos pares: contenido derecha (reverse).

| Paso | Fondo | Label | Título | Visual |
|------|-------|-------|--------|--------|
| 01 | `#1A0050` | El comercio | Te registrás con Google | Ícono Google centrado |
| 02 | `#F0E8FF` | El comercio | Configurás tu club | Panel mock |
| 03 | `#3D0A9E` | El comercio | Tu kit físico está listo | QR mock |
| 04 | `#F0E8FF` | El cliente | Escanea y se suma | Phone mock — cupón bienvenida |
| 05 | `#1A0050` | El cliente | Acumula recompensas | Phone mock — progreso |
| 06 | `#6F30DF` | El cliente | Canjea su premio | Phone mock — canje |

**Switch entre comercio/cliente** (entre paso 3 y 4):
```
IZQUIERDA (#1A0050): "Club configurado." + "El QR está en el mostrador."
DERECHA (#F0E8FF): "Llega el cliente." + "Escanea el QR y empieza."
```

### 5. Bento features

Fondo: `#fff`  
Grid 3 columnas, 7 cards:

| Card | Fondo | Contenido |
|------|-------|-----------|
| 1 | `#1A0050` | Big: "30\"" / "Para registrar una visita" |
| 2 | `#F0E8FF` | Ícono users-group / "Segmentación automática" |
| 3 | `#F0E8FF` | Ícono speakerphone / "WhatsApp automático" |
| 4 (wide×2) | `#3D0A9E` | Ícono map-pin / "Directorio público de Clufix" |
| 5 | `#F0E8FF` | Ícono bell / "Notificaciones push" |
| 6 | `#1A0050` | Big: "$0" / "Para empezar hoy" |
| 7 | `#F0E8FF` | Ícono robot / "Soporte con IA" |

### 6. Sección rubros

Fondo: `#1A0050`  
H2: "¿Cuál es tu negocio?"  
Grid 3×2 de cards con íconos Tabler outline blancos:

```
Peluquerías    → ti-scissors     → /rubros/peluquerias
Farmacias      → ti-pill         → /rubros/farmacias
Indumentaria   → ti-hanger       → /rubros/indumentaria
Restaurantes   → ti-tools-kitchen-2 → /rubros/restaurantes
Gimnasios      → ti-barbell      → /rubros/gimnasios
Jugueterías    → ti-building-store  → /rubros/jugeterias
```

Cards: `background: rgba(255,255,255,0.07); border: 0.5px solid rgba(255,255,255,0.1); border-radius: 16px`  
Cada card es un Link de React Router que navega a la ruta correspondiente.

### 7. Planes

Fondo: `#F0E8FF`

| | Free | Starter | Pro |
|---|---|---|---|
| Precio | $0/mes | $25.000/mes | $45.000/mes |
| Clientes | Hasta 30 | Hasta 60 | Ilimitados |
| Premios | 2 activos | Ilimitados | Ilimitados |
| QR del local | ✓ | ✓ | ✓ |
| Directorio público | ✓ | ✓ | ✓ |
| Cupones de descuento | ✗ | ✓ | ✓ |
| Días bonus ×2 | ✗ | ✓ | ✓ |
| Soporte prioritario | ✗ | ✓ | ✓ |
| WhatsApp automático | ✗ | ✗ | ✓ |
| Reactivar inactivos | ✗ | ✗ | ✓ |

Starter tiene badge "Más popular" con `background: #6F30DF`.  
Plan destacado: `border: 2px solid #6F30DF`.

### 8. Testimonios

Fondo: `#3D0A9E`  
Grid 3 columnas:

1. "Antes usaba tarjetitas de cartón que se perdían siempre. Ahora el cliente escanea y listo." — **Marcela G.**, Farmacia, General Pico
2. "Activé los miércoles con puntos dobles y ese día se convirtió en el más movido de la semana." — **Silvia C.**, Peluquería, La Pampa
3. "El cliente puede ver sus puntos desde el celular. Me preguntan menos y vienen más seguido." — **Roberto L.**, Local de ropa, La Pampa

Avatar: círculo con iniciales, `background: #FF199F`.

### 9. CTA final

Fondo: `#6F30DF`  
H2: "Tu negocio merece clientes que **vuelven.**" — "vuelven" en fucsia  
Botón: [Crear mi club gratis] fucsia  
Nota: "Plan Free para siempre · Sin permanencia · Sin hardware"

### 10. Footer

Fondo: `#fff`, `border-top: 1px solid #f0eaff`  
Izquierda: logo SVG  
Derecha: "© 2026 · clufix.com.ar · General Pico, La Pampa"

---

## Páginas de rubro — estructura común

Cada rubro tiene la misma estructura. El contenido varía por rubro y viene del objeto `rubros.ts`.

### Estructura de secciones (en orden)

1. **Nav** — igual que home
2. **Hero** — fondo `#1A0050`, pill con nombre del rubro, H1 específico, subtítulo, CTAs
3. **Flujo 3 pasos** — adaptado al rubro
4. **Kit físico** — display mostrador + calco puerta (placeholders por ahora)
5. **Mockup celular + crops** — celular con pantallas de la app + 3 crop cards laterales
6. **Beneficios de la app** — grid 6 features con íconos Tabler
7. **Beneficios del rubro** — 4 cards específicas del rubro
8. **Directorio** — fondo `#1A0050`, texto + card de ejemplo
9. **Testimonios** — 3 cards (placeholders hasta tener reales)
10. **Planes** — igual que home
11. **FAQs** — acordeón, 5 preguntas
12. **CTA final** — copy específico del rubro
13. **Otros rubros** — chips que llevan a los otros 5 rubros
14. **Footer** — igual que home

### Animaciones de entrada

Todas las secciones entran con:
```css
opacity: 0; transform: translateY(18px);
transition: opacity 0.5s ease, transform 0.5s ease;
```
Usando `IntersectionObserver` con `threshold: 0.1`.

---

## Datos por rubro (src/data/rubros.ts)

```typescript
export const rubros = {
  peluquerias: {
    nombre: "Peluquerías y barberías",
    icono: "ti-scissors",
    pill: "✂️ Para peluquerías y barberías",
    heroTitle: "Tus clientes vienen seguido.\nHacelos volver siempre.",
    heroSub: "Benefix le da a tu peluquería un club de beneficios que premia la fidelidad sin complicaciones.",
    flujo: [
      { titulo: "El cliente se suma", desc: "Escanea el QR de tu peluquería y queda en tu club al instante. Recibe un cupón de bienvenida automático." },
      { titulo: "Acumula recompensas", desc: "Cada vez que viene, escaneás su QR en segundos. El sistema suma estrellas o puntos según configuraste tu club." },
      { titulo: "Canjea su premio", desc: "A la 10ª visita, el sistema avisa y el cliente canjea su corte, tratamiento o lo que vos definas." },
    ],
    beneficiosRubro: [
      { icono: "ti-star", titulo: "Corte gratis a la 10ª visita", desc: "El clásico que fideliza. El cliente ve su progreso en cada visita y vuelve para llegar al premio." },
      { icono: "ti-ticket", titulo: "Cupón 15% off próxima vez", desc: "Se entrega automáticamente al sumarse al club. El que vino una vez tiene razón para volver." },
      { icono: "ti-bolt", titulo: "Doble estrellas los martes", desc: "Activá los días que tenés menos trabajo y tus clientes frecuentes van a elegir venir esos días." },
      { icono: "ti-message-circle", titulo: "Reactivá clientes inactivos", desc: "Benefix detecta quién no vino en 30 días y le manda un mensaje por WhatsApp automáticamente. (Plan Pro)" },
    ],
    ctaTitle: "Tu peluquería merece clientes que vuelven solos.",
    faqs: [
      { q: "¿Mis clientes tienen que descargar una app?", a: "Clufix funciona desde el navegador del celular, sin descargar nada. El cliente escanea el QR, abre la app en el browser, y ya está dentro de tu club." },
      { q: "¿Qué pasa si ya tengo un sistema de tarjetitas?", a: "Podés migrar tus clientes existentes manualmente desde el panel, con nombre, email y teléfono." },
      { q: "¿Necesito un lector especial o algún hardware?", a: "No. Todo funciona desde el celular. Vos usás la cámara del tuyo para escanear el QR del cliente." },
      { q: "¿Puedo cambiar de plan en cualquier momento?", a: "Sí, sin permanencia ni penalidades. Subís o bajás de plan cuando quieras desde el panel de configuración." },
      { q: "¿Qué pasa con mis datos y los de mis clientes?", a: "Tus datos son tuyos. Clufix no los comparte ni los vende." },
    ],
  },

  farmacias: {
    nombre: "Farmacias y perfumerías",
    icono: "ti-pill",
    pill: "💊 Para farmacias y perfumerías",
    heroTitle: "Tus clientes vienen seguido.\nHacelos volver a vos.",
    heroSub: "Clufix le da a tu farmacia un club de beneficios que premia la fidelidad sin complicaciones.",
    flujo: [
      { titulo: "El cliente se suma", desc: "Escanea el QR de tu farmacia y queda registrado. Recibe un cupón de bienvenida automáticamente." },
      { titulo: "Acumula recompensas", desc: "Cada compra, escaneás su QR en segundos. El sistema suma estrellas o puntos según configuraste tu club." },
      { titulo: "Canjea su premio", desc: "Cuando llega al tope, elige su regalo: producto, descuento, o lo que vos definas. El stock se descuenta solo." },
    ],
    beneficiosRubro: [
      { icono: "ti-pill", titulo: "Puntos por cada receta", desc: "El cliente crónico que viene cada mes acumula puntos y los canjea en productos de perfumería o vitaminas." },
      { icono: "ti-ticket", titulo: "Cupón de bienvenida 10% off", desc: "Quien se suma al club recibe automáticamente un cupón para su próxima compra." },
      { icono: "ti-calendar", titulo: "Doble puntos los miércoles", desc: "Un día tranquilo se convierte en el favorito de tus clientes frecuentes." },
      { icono: "ti-message-circle", titulo: "Reactivá al que no vino", desc: "'Hace 30 días que no te vemos, tenés X puntos esperándote.' El mensaje lo manda Clufix solo. (Plan Pro)" },
    ],
    ctaTitle: "Tu farmacia ya tiene clientes fieles. Ahora hacelos sentir que los recordás.",
    faqs: [
      { q: "¿Mis clientes tienen que descargar una app?", a: "Clufix funciona desde el navegador del celular, sin descargar nada." },
      { q: "¿Qué pasa si ya tengo un sistema de tarjetitas?", a: "Podés migrar tus clientes existentes manualmente desde el panel." },
      { q: "¿Necesito un lector especial o algún hardware?", a: "No. Todo funciona desde el celular." },
      { q: "¿Puedo cambiar de plan en cualquier momento?", a: "Sí, sin permanencia ni penalidades." },
      { q: "¿Qué pasa con mis datos y los de mis clientes?", a: "Tus datos son tuyos. Clufix no los comparte ni los vende." },
    ],
  },

  indumentaria: {
    nombre: "Indumentaria y ropa",
    icono: "ti-hanger",
    pill: "👗 Para locales de ropa e indumentaria",
    heroTitle: "Que cada compra sea\nel inicio de la próxima.",
    heroSub: "Clufix convierte compradores ocasionales en clientes que vuelven temporada tras temporada.",
    flujo: [
      { titulo: "El cliente se suma", desc: "Escanea el QR de tu local, queda registrado y recibe un cupón de bienvenida automáticamente." },
      { titulo: "Acumula puntos", desc: "Cada peso que gasta suma puntos. Vos ingresás el importe y el sistema hace el resto." },
      { titulo: "Canjea su premio", desc: "Cuando llega al monto, elige su regalo: descuento, prenda, accesorio — lo que vos definas." },
    ],
    beneficiosRubro: [
      { icono: "ti-coin", titulo: "Puntos por cada peso gastado", desc: "1 punto = 1 peso. El cliente ve crecer su saldo en tiempo real y tiene razón para volver." },
      { icono: "ti-ticket", titulo: "Cupón 20% off al sumarse", desc: "Quien entra a tu local y se suma al club recibe un descuento automático para la próxima compra." },
      { icono: "ti-bolt", titulo: "Puntos ×2 en días clave", desc: "Activá el doble de puntos en días de nueva colección, liquidación o los que tenés menos movimiento." },
      { icono: "ti-message-circle", titulo: "WhatsApp a clientes que no vuelven", desc: "Clufix detecta quién no compró en 30 días y les manda un mensaje automático con incentivo. (Plan Pro)" },
    ],
    ctaTitle: "Tu local de ropa merece clientes que vuelven cada temporada.",
    faqs: [
      { q: "¿Mis clientes tienen que descargar una app?", a: "Clufix funciona desde el navegador del celular, sin descargar nada." },
      { q: "¿Qué pasa si ya tengo un sistema de tarjetitas?", a: "Podés migrar tus clientes existentes manualmente desde el panel." },
      { q: "¿Necesito un lector especial o algún hardware?", a: "No. Todo funciona desde el celular." },
      { q: "¿Puedo cambiar de plan en cualquier momento?", a: "Sí, sin permanencia ni penalidades." },
      { q: "¿Qué pasa con mis datos y los de mis clientes?", a: "Tus datos son tuyos. Clufix no los comparte ni los vende." },
    ],
  },

  restaurantes: {
    nombre: "Restaurantes y cafeterías",
    icono: "ti-tools-kitchen-2",
    pill: "🍽️ Para restaurantes y cafeterías",
    heroTitle: "Tus clientes comen bien.\nHacelos volver seguido.",
    heroSub: "Clufix le da a tu restaurant un programa de fidelización que llena los días flojos y fideliza a los habituales.",
    flujo: [
      { titulo: "El cliente se suma", desc: "Escanea el QR de tu local al llegar o al pagar. Queda en tu club y recibe un cupón de bienvenida." },
      { titulo: "Acumula recompensas", desc: "Cada visita suma estrellas. También podés sumar puntos por el importe del ticket." },
      { titulo: "Canjea su premio", desc: "Una entrada, un postre, un descuento — lo que vos definas. El sistema avisa cuando llega al tope." },
    ],
    beneficiosRubro: [
      { icono: "ti-star", titulo: "Postre gratis a la 10ª visita", desc: "El cliente ve su progreso y vuelve para completarlo. Simple y efectivo." },
      { icono: "ti-bolt", titulo: "Doble estrellas los martes", desc: "Convertí el día más flojo en el favorito de tus clientes frecuentes." },
      { icono: "ti-ticket", titulo: "Cupón bienvenida 15% off", desc: "El que vino una vez tiene una razón concreta para volver la próxima semana." },
      { icono: "ti-message-circle", titulo: "Reactivá clientes inactivos", desc: "'Hace 3 semanas que no te vemos, tenés X estrellas esperándote.' Lo manda Clufix solo. (Plan Pro)" },
    ],
    ctaTitle: "Tu restaurant merece clientes que vuelven solos.",
    faqs: [
      { q: "¿Mis clientes tienen que descargar una app?", a: "Clufix funciona desde el navegador del celular, sin descargar nada." },
      { q: "¿Funciona para delivery también?", a: "Sí. Podés registrar visitas manuales para pedidos por delivery o teléfono desde el panel." },
      { q: "¿Necesito un lector especial o algún hardware?", a: "No. Todo funciona desde el celular." },
      { q: "¿Puedo cambiar de plan en cualquier momento?", a: "Sí, sin permanencia ni penalidades." },
      { q: "¿Qué pasa con mis datos y los de mis clientes?", a: "Tus datos son tuyos. Clufix no los comparte ni los vende." },
    ],
  },

  gimnasios: {
    nombre: "Gimnasios y deportes",
    icono: "ti-barbell",
    pill: "💪 Para gimnasios y centros deportivos",
    heroTitle: "Tus socios entrenan duro.\nPremialos por volver.",
    heroSub: "Clufix le da a tu gimnasio un sistema de fidelización que premia la constancia y reduce la deserción.",
    flujo: [
      { titulo: "El socio se suma", desc: "Escanea el QR del gimnasio y queda en tu club. Recibe un beneficio de bienvenida automático." },
      { titulo: "Acumula por asistencia", desc: "Cada vez que viene, registrás su visita en segundos. El sistema suma estrellas por cada entrenamiento." },
      { titulo: "Canjea su premio", desc: "Clase de spinning gratis, mes descontado, producto de nutrición — lo que vos definas. El sistema avisa cuando llega." },
    ],
    beneficiosRubro: [
      { icono: "ti-star", titulo: "Clase gratis a la 20ª asistencia", desc: "El socio ve su racha y tiene un incentivo concreto para no faltar." },
      { icono: "ti-bolt", titulo: "Doble estrellas en semanas clave", desc: "Activá doble puntos en enero, después de vacaciones o cuando baja la asistencia." },
      { icono: "ti-ticket", titulo: "Mes con descuento al renovar", desc: "Premiá la renovación anticipada con un cupón automático." },
      { icono: "ti-message-circle", titulo: "Aviso al socio que no viene", desc: "'Hace 2 semanas que no te vemos, tenés X estrellas esperándote.' Lo manda Clufix solo. (Plan Pro)" },
    ],
    ctaTitle: "Tu gimnasio merece socios que no se van.",
    faqs: [
      { q: "¿Funciona con membresías mensuales?", a: "Sí. Podés configurar el sistema para sumar estrellas por asistencia independientemente de la membresía." },
      { q: "¿Mis socios tienen que descargar una app?", a: "Clufix funciona desde el navegador del celular, sin descargar nada." },
      { q: "¿Necesito un lector especial o algún hardware?", a: "No. Todo funciona desde el celular." },
      { q: "¿Puedo cambiar de plan en cualquier momento?", a: "Sí, sin permanencia ni penalidades." },
      { q: "¿Qué pasa con mis datos y los de mis clientes?", a: "Tus datos son tuyos. Clufix no los comparte ni los vende." },
    ],
  },

  jugeterias: {
    nombre: "Jugueterías",
    icono: "ti-building-store",
    pill: "🧸 Para jugueterías y tiendas infantiles",
    heroTitle: "Los chicos eligen.\nLos papás vuelven a vos.",
    heroSub: "Clufix le da a tu juguetería un programa de puntos que fideliza a las familias y potencia las fechas clave.",
    flujo: [
      { titulo: "La familia se suma", desc: "Escanea el QR de tu local y queda en tu club. Recibe un cupón de bienvenida automático." },
      { titulo: "Acumula por cada compra", desc: "Cada peso gastado suma puntos. En cumpleaños, Navidad y Día del Niño, el saldo crece más rápido." },
      { titulo: "Canjea su premio", desc: "Descuento en la próxima compra, accesorio gratis, o lo que vos definas. El sistema avisa cuando llega." },
    ],
    beneficiosRubro: [
      { icono: "ti-coin", titulo: "Puntos por cada peso gastado", desc: "Las familias acumulan en cada visita y tienen una razón para volver antes de las fechas clave." },
      { icono: "ti-bolt", titulo: "Puntos ×3 en Día del Niño", desc: "Las fechas especiales se convierten en una ventaja frente a la competencia." },
      { icono: "ti-ticket", titulo: "Cupón de bienvenida 10% off", desc: "La familia que entró una vez tiene una razón concreta para volver." },
      { icono: "ti-message-circle", titulo: "Recordatorio previo a fechas clave", desc: "'Se acerca el Día del Niño, tenés X puntos para canjear.' Lo manda Clufix solo. (Plan Pro)" },
    ],
    ctaTitle: "Tu juguetería merece familias que vuelven en cada fecha especial.",
    faqs: [
      { q: "¿Mis clientes tienen que descargar una app?", a: "Clufix funciona desde el navegador del celular, sin descargar nada." },
      { q: "¿Puedo activar puntos extra solo en algunas fechas?", a: "Sí. Desde el panel podés activar y desactivar los días bonus cuando quieras." },
      { q: "¿Necesito un lector especial o algún hardware?", a: "No. Todo funciona desde el celular." },
      { q: "¿Puedo cambiar de plan en cualquier momento?", a: "Sí, sin permanencia ni penalidades." },
      { q: "¿Qué pasa con mis datos y los de mis clientes?", a: "Tus datos son tuyos. Clufix no los comparte ni los vende." },
    ],
  },
}
```

---

## Notas de implementación

1. **No tocar** la lógica de autenticación, el panel de comercios, ni la billetera del cliente. Solo crear las páginas públicas nuevas.

2. **React Router**: las nuevas rutas van en el archivo de rutas principal. El componente `RubroPage` usa `useParams()` para leer el slug y buscar en `rubros.ts`.

3. **Logo**: el archivo `clufix_logo.svg` ya existe o hay que copiarlo a `/public/`. Usar siempre `<img src="/clufix_logo.svg" alt="Clufix" />` — no embeber el SVG inline.

4. **Animaciones**: usar `IntersectionObserver` o la librería que ya esté en el proyecto. Todas las secciones entran con `fade + translateY(18px)`.

5. **Screenshots de la app**: en los mockups del celular de las páginas de rubro hay placeholders. Cuando estén listos los screenshots reales, se reemplazan las imágenes.

6. **Mobile first**: todas las grillas de 2-3 columnas colapsan a 1 columna en mobile (`max-width: 560px`).

7. **Tailwind**: si se usa Tailwind, los colores custom van en `tailwind.config.js`:
```js
colors: {
  'v1': '#1A0050',
  'v2': '#3D0A9E', 
  'v3': '#6F30DF',
  'v4': '#F0E8FF',
  'pk': '#FF199F',
}
```

---

*Documento generado a partir del diseño aprobado en sesión con Claude — Mayo 2026*
