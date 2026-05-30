# Clufix — Rebrand visual de la app

## Contexto

La app se llamaba "Benefix / Club de Beneficios" y ahora es **Clufix**. Este documento cubre exclusivamente la actualización visual — colores, tipografía y logo. No hay cambios de funcionalidad, rutas ni lógica de negocio.

---

## 1. Actualizar `app/globals.css` — variables CSS

Reemplazar el bloque `:root` actual por este:

```css
:root {
  /* Paleta Clufix */
  --brand-violet:        #6F30DF;   /* color principal, CTAs */
  --brand-violet-deep:   #3D0A9E;   /* hover, énfasis, testimonios */
  --brand-violet-dark:   #1A0050;   /* hero, secciones oscuras */
  --brand-violet-light:  #F0E8FF;   /* backgrounds suaves */
  --brand-pink:          #FF199F;   /* acento fucsia — botones CTA, labels */

  /* Backgrounds app */
  --bg-primary:          #0A0A0F;
  --bg-elevated:         #14141F;
  --bg-cream:            #FAF7F0;
  --bg-secondary:        #0f0820;

  /* Texto */
  --text-primary:        #FFFFFF;
  --text-secondary:      rgba(255,255,255,0.65);
  --text-tertiary:       rgba(255,255,255,0.45);

  /* Semánticos — no cambiar */
  --success:             #10B981;
  --warning:             #F59E0B;
  --danger:              #EF4444;
}
```

**Eliminar** la variable `--morfix-orange: #FF4500` — es legacy y no se usa en Clufix.

---

## 2. Actualizar constantes JS en `app/page.js` (líneas ~111–133)

Reemplazar el bloque de constantes por este:

```js
// ─── Design tokens Clufix ───────────────────────────────────────
const G  = '#6F30DF'        // color principal
const GV = '#3D0A9E'        // hover / énfasis
const GH = '#1A0050'        // hero / secciones oscuras

const C = {
  // Fondos
  bg:     'transparent',
  bg2:    'rgba(255,255,255,0.05)',
  card:   'rgba(255,255,255,0.06)',
  rim:    'rgba(255,255,255,0.10)',
  dark:   '#1A0050',
  deep:   '#3D0A9E',
  light:  '#F0E8FF',

  // Texto
  white:  '#FFFFFF',
  pearl:  '#F0E8FF',
  mist:   'rgba(255,255,255,0.55)',
  dust:   'rgba(255,255,255,0.35)',

  // Acento
  pink:   '#FF199F',        // fucsia — botones CTA, labels, highlights

  // Colores principales
  v:      '#6F30DF',
  v1:     '#3D0A9E',
  v2:     '#1A0050',

  // Semánticos
  ok:     '#22E698',
  okBg:   'rgba(0,31,16,0.8)',
  info:   '#40C8FF',
}
```

**Eliminar** `C.o` (`#FE5000`) — es el naranja legacy de Benefix. Buscar todos los usos de `C.o` en el archivo y reemplazar por `C.pink` (`#FF199F`).

---

## 3. Colores del sistema de fidelización

Buscar y reemplazar estos valores hardcodeados en `app/page.js` y todos los archivos de `lib/`:

| Valor viejo | Valor nuevo | Contexto |
|---|---|---|
| `#8B5CF6` | `#6F30DF` | Stars — color principal |
| `#7C3AED` | `#3D0A9E` | Stars — hover/énfasis |
| `#EC4899` | `#FF199F` | Points — color principal |
| `#DB2777` | `#d4007f` | Points — hover/énfasis |
| `#BD4BF8` | `#6F30DF` | Legacy violeta anterior |
| `#FE5000` | `#FF199F` | Legacy naranja — reemplazar por fucsia |
| `#FF4500` | `#FF199F` | Legacy naranja — reemplazar por fucsia |

---

## 4. Colores de planes

Reemplazar los colores de badges de planes:

```js
// Plan FREE — sin cambio (sin color especial)
// Plan STARTER
const STARTER_COLOR = '#6F30DF'   // antes: #5B8DEF (azul)
// Plan PRO  
const PRO_COLOR = '#FF199F'       // antes: #F5A623 (amarillo)
```

Buscar `#5B8DEF` y `#F5A623` en todo el código y reemplazar con los valores de arriba.

---

## 5. Logo — reemplazar `lib/Logo.js`

El archivo `lib/Logo.js` actualmente renderiza el wordmark "Benefix". Hay que reemplazarlo para que use el nuevo logo SVG de Clufix.

```jsx
// lib/Logo.js
export default function Logo({ variant = 'white', height = 32 }) {
  return (
    <img
      src="/clufix_logo.svg"
      alt="Clufix"
      height={height}
      style={{ display: 'block' }}
    />
  )
}
```

El archivo `clufix_logo.svg` debe estar en `/public/clufix_logo.svg`.

Las 3 variantes anteriores (`white`, `violet`, `full`) se reemplazan todas por el mismo SVG — el logo de Clufix ya tiene los colores correctos embebidos.

---

## 6. Tipografía — ajuste menor

La app usa `Space Grotesk` para títulos e `Inter` para cuerpo. Esto se mantiene igual — son buenas fuentes y compatibles con el estilo de Clufix.

**El único cambio** es en `app/layout.js`: agregar los pesos `700` y `900` a Inter si no están, porque la home nueva los usa:

```js
// app/layout.js — asegurarse que Inter tenga estos pesos
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '900'] })
```

---

## 7. Keyframes legacy en `globals.css`

Buscar y reemplazar estos valores de color dentro de los `@keyframes` del archivo:

```css
/* Buscar */
#BD4BF8   → reemplazar por #6F30DF
#FE5000   → reemplazar por #FF199F
#FF4500   → reemplazar por #FF199F
#7131E1   → reemplazar por #6F30DF
#6935BD   → reemplazar por #3D0A9E
```

---

## 8. Textos "Benefix" → "Clufix"

Buscar en **todos** los archivos del proyecto el string `Benefix` (y variantes: `benefix`, `BENEFIX`, `Club de Beneficios`) y reemplazar por `Clufix` (o `clufix`, `CLUFIX` según corresponda).

Excepciones — NO reemplazar en:
- Nombres de variables internas o funciones de base de datos
- Strings de configuración de Supabase
- Nombres de tablas o columnas de la DB
- Comentarios de código técnico

Solo reemplazar en:
- Textos visibles al usuario (labels, títulos, placeholders)
- Metadatos (`<title>`, `<meta name="description">`)
- Strings de UI en general

---

## 9. Metadatos del sitio

En `app/layout.js` actualizar:

```js
export const metadata = {
  title: 'Clufix — Tu club de beneficios',
  description: 'El sistema de fidelización más simple del país. Escaneá, acumulá, canjeá.',
  // mantener el resto igual
}
```

---

## 10. Verificación final

Después de aplicar todos los cambios, verificar visualmente:

- [ ] El logo de Clufix aparece en nav y footer de la app
- [ ] Los botones CTA son fucsia `#FF199F`
- [ ] El color principal de la app es violeta `#6F30DF`
- [ ] No hay naranja (`#FE5000`, `#FF4500`) ni el violeta viejo (`#7131E1`, `#BD4BF8`) en ningún elemento visible
- [ ] Las tarjetas de estrellas son violeta `#6F30DF`
- [ ] Las tarjetas de puntos son fucsia `#FF199F`
- [ ] Los badges de planes STARTER y PRO tienen los colores nuevos
- [ ] El texto "Benefix" no aparece en ninguna parte visible de la UI

---

*Este documento cubre solo el rebrand visual. No hay cambios de funcionalidad, lógica de Supabase, autenticación ni flujos de usuario.*
