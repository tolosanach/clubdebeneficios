// DEPRECATED: este componente fue absorbido por `lib/HelpBanner.js`.
// HelpBanner ahora usa el ícono "?" (HelpCircle) por default, gradiente
// violeta puro de marca, y soporta la prop `details` para mostrar 2 líneas
// con "Ver más" expandible — exactamente lo que hacía InfoCard.
//
// Reexportamos HelpBanner como InfoCard para no romper imports residuales,
// pero todo nuevo código debe importar `HelpBanner` directamente.

import HelpBanner from './HelpBanner'
export default HelpBanner
