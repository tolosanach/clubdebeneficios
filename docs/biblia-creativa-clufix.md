# Biblia creativa Clufix — publicidad (universo Tato y Vale)

> **Para Claude:** este archivo es la memoria durable del trabajo publicitario. Si arrancás una sesión nueva o se comprimió el contexto, leé esto ANTES de proponer nada creativo. Mantenelo actualizado cuando cambien personajes, decisiones o el estado de producción.

Última actualización: 2026-07-12

---

## Qué estamos haciendo
Comerciales animados + imágenes para la landing de Clufix e Instagram, en estilo **3D matte-clay ("plastilina/inflable")**. Nacho **genera y fija los personajes en Google Flow** para consistencia; Claude arma **guion + prompts escena por escena** y asesora dirección, sonido, música y subtítulos.

**Rol de Claude:** asesor creativo PROACTIVO. Nacho pidió explícitamente que las oportunidades se las traiga Claude ("esas oportunidades te las tengo que traer yo, no vos descubrirlas"). Trabajar estilo debate antes de producir.

## Herramientas / pipeline
- **Imagen:** Google Flow (modelo por defecto **Nano Banana Pro**). Personajes con `@`, sistema de **Ingredients**, modo Agent.
- **Video:** Veo (dentro de Flow). **Los prompts se escriben en INGLÉS** (Veo responde mejor).
- **Voz:** ElevenLabs.
- **Post:** títulos y logo se agregan en edición (el 3D-IA escribe mal el texto → **no poner texto dentro de los prompts**).
- **Formatos:** generar **16:9** para landing + una pasada **9:16** para reels, con la acción centrada.

---

## Personajes (character sheets — bloquear y no mutar)

### Vale — la clienta (color de marca: FUCSIA `#EC4899`)
`matte-clay 3D character, fuchsia tracksuit hoodie + wide pants, warm brown skin, black top bun, round black sunglasses, gold hoop earring, blowing a pink bubblegum bubble, small black crossbody belt bag, chunky white sneakers`
- Súper expresiva. Pose caminando con peace sign + chicle = ideal para llegada (escena 1) y salida (escena 6).
- **Regla:** Vale no debe "mutar" (cara/pelo/ropa) dentro de un mismo clip.
- Tip de fondo: para que el fucsia luzca, usar fondos **durazno, lavanda o menta** (no rosa/fucsia, se funde).

### Tato — el comerciante, dueño de "Café Tato" (delantal VIOLETA `#7C3AED` + remera NARANJA `#FE5000`)
`matte-clay 3D café owner, violet apron over orange t-shirt, warm smile, behind his small rounded café counter with a small espresso machine and a croissant, and a clear acrylic QR sign holder (portarretrato) on the counter`
- **Regenerar SIN la palabra "TATO" en el delantal** (titila en el video).
- Juntos, Vale + Tato pintan el **degradé completo de marca**: fucsia + violeta + naranja.

### Personajes de comercio de otros rubros (ya son ingredients en Flow)
Todos en el mismo estilo matte-clay. Entregan algo a `@Vale` y le salta una estrella dorada en el celu. Tomas snappy de ~1.5s, "cut on the beat".
- **`@Beto`** — barbero: `black barber apron, short beard`. Prop asociado: `@corte` (el corte de pelo / cliente con corte nuevo).
- **`@Gastón`** — dueño de gym: `sporty tee, towel on shoulder`. Prop asociado: `@shaker` (vaso shaker/proteína).
- **`@Heladero`** — dueño de heladería: `pastel apron, paper hat`. Prop asociado: `@helado` (cono/helado).
- **`@Farmaceutico`** — farmacéutico (para la vertical Pack Farmacias / rubro farmacia). Apariencia a definir/confirmar (típico: guardapolvo blanco). Prop asociado: `@producto`.

---

## Biblia de estilo (pegar en cada prompt)
`3D matte-clay character render, soft matte clay / inflatable look, smooth rounded tubular limbs, chunky sneakers, minimal face with glasses, soft studio lighting, soft floor shadow, shallow depth of field, subtle film grain, clean plain white background`

---

## ⚠️ Flujo REAL de Clufix (no contarlo mal en el video)
Hay DOS escaneos distintos y no son lo mismo:
1. **Unirse al club (1ª vez):** **Vale escanea con SU celular** el **portarretrato QR del mostrador** (`@QRStand`). Eso la hace socia.
2. **Sumar estrella (cada compra):** **Tato escanea el QR del celular de Vale** desde el panel del comercio.

> Decisión tomada (camino A, "fiel al producto"): mantener los dos beats. El portarretrato del mostrador es prop fijo y se usa SOLO para "unite al club"; la estrella por compra siempre es Tato escaneando a Vale.

## Orden narrativo canónico (historia principal, loopea)
1. Vale llega → 1.5 abre la puerta → 2 saludo con Tato → **2.3 se une al club** (Vale escanea el QR del mostrador con su celu) → **2.5 la compra** (Tato le da el café) → 3 Tato escanea el QR de Vale (estrella) → 4 vuelan estrellas a la tarjeta → 4.5 se llena la barra → 5 aparece el premio → 6 Vale se va feliz → **loop** (vuelve a la pose inicial).
- Loop del hero web: escenas 3→4→5→6 (~12–16s). Reel completo con sonido: las 6 (~30–40s).

---

## Librería de ingredients ya cargados en Flow (`@`-tags)
Estos ya existen y se reutilizan por `@`-tag. Bloqueados para consistencia.

**Personajes:** `@Vale` (clienta, fucsia — parada + caminando) · `@Tato` (café, con portarretrato en el mostrador) · `@Beto` (barbero) · `@Gastón` (gym) · `@Heladero` (heladería) · `@Farmaceutico` (farmacia).

**Props físicos:** `@Café` (vaso de café takeaway) · `@Tarjeta` (tarjeta de fidelidad del cliente) · `@Estrella` (estrella dorada que "pop-ea") · `@QRStand` (portarretrato acrílico con QR + logo Clufix, sobre el mostrador) · `@helado` (cono) · `@corte` (corte de pelo) · `@shaker` · `@producto` (producto genérico) · `@Fachada` (fachada del local) · disco/sticker redondo violeta 15 cm `#7C3AED` con logo Clufix.

**Teléfono:** `@Teléfono` (`@Tel`) · `@telefono_frente` · `@telefono_atras` (para que se agarre bien y se vea la cámara al escanear).

**Pantallas / marca:** `@pantalla_clufix` (celu mostrando la app — billetera "Mis clubes") · `@pantalla_tato` (panel del comercio de Tato) · `@splash_clufix` (splash/carga) · `@pantalla_blank` (pantalla en blanco para componer) · `@LogoClufix` (logo).

> Nota: los nombres con acento a veces se cargan sin él en Flow (`@Café`→`@Caf`, `@Gastón`→`@Gast`). Usar el nombre tal cual quedó cargado en tu proyecto de Flow.

## Correcciones ya aprendidas (no repetir)
- Tato escanea con **su celular**, NO con lector de supermercado.
- Ojo cómo Tato agarra el teléfono (se generó al revés una vez → usar `telefono_frente`/`telefono_atras`).
- Sacar el texto "TATO" del delantal (titila).
- En despedidas: Vale gira levemente para saludar hacia atrás; plano cerrado en Vale con fondo desenfocado que **enfoca a Tato** cuando ella saluda; que se vaya hacia la **izquierda**.

---

## Tomas / escenas ya producidas y aprobadas
- Vale caminando por la ciudad.
- Vale entrando al local.
- Vale saludando a Tato.
- Tato escaneando el celular de Vale (estrella).
- Tato con el portarretrato invitándola a unirse al club (mueve labios, sin hablar; plano de Tato atrás del mostrador, una mano con el portarretrato y con la otra señala el QR, sonriendo).
- Vale despidiéndose y yéndose con su café (saluda hacia atrás, Tato le devuelve el saludo).

## Ideas de spin-off pendientes (backlog)
- **Serie multi-rubro:** Vale visitando barbería (Beto), gym (Gastón), heladería — para que no parezca "solo para cafeterías". Tato queda como el café ancla.
- **POV Tato:** su día como comerciante — ve clientes que vuelven, le entran notificaciones ("Vale sumó una estrella", "tenés un socio nuevo"), su club crece, termina feliz.
- **Feature promo:** a Vale le llega una notif de **30% OFF** (cupón próxima compra) o **día ×2 puntos**; va, lo usa, se va contenta.

## Estado actual (dónde quedamos)
- Trabajando en la **última publicidad guionada**: abre con **Tato limpiando la barra de su negocio, pensando cómo hacer volver a sus clientes**. Pendiente: definir **sonido/música** de esa escena de apertura y **SFX** para cuando Tato apoya el portarretrato del QR sobre el mostrador.
- Decisión estratégica confirmada (2026-07): **seguir con Tato y Vale** (ya hay material producido y consistencia lograda) y **mantener café** como rubro ancla de Tato, sumando la serie multi-rubro para mostrar amplitud.

---
*Nota: existe `docs/guion-publicidad-clufix-v1.md` con un guion de 30s escrito con nombres provisorios (Ale/Meli) cuando el contexto estaba perdido. Está pendiente reescribirlo con Tato y Vale, o descartarlo a favor de retomar la publicidad de "Tato limpiando la barra".*
