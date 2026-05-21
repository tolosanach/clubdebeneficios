export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'https://benefix.com.ar'),
  title: 'Benefix | Tus beneficios. Un solo QR.',
  description: 'Sumá puntos en tus negocios favoritos y canjeá recompensas con Benefix.',
  keywords: ['fidelización', 'puntos', 'recompensas', 'comercios', 'beneficios', 'QR', 'premios'],
  openGraph: {
    title: 'Benefix | Tus beneficios. Un solo QR.',
    description: 'Sumá puntos en tus negocios favoritos y canjeá recompensas con Benefix.',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Benefix' }],
    siteName: 'Benefix',
    locale: 'es_AR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Benefix',
    description: 'Tus beneficios. Un solo QR.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/benefix-icon.svg',
    apple: '/benefix-icon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Benefix',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#7131E1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Benefix" />
        <link rel="apple-touch-icon" href="/benefix-icon.svg" />
        <link rel="icon" type="image/svg+xml" href="/benefix-icon.svg" />
      </head>
      {/* suppressHydrationWarning silencia los mismatches que vienen de
          extensiones del browser (ColorZilla agrega `cz-shortcut-listen`,
          Grammarly agrega `data-gr-c-s-loaded`, etc.). NO afecta a
          mismatches reales del código nuestro — esos siguen apareciendo. */}
      <body suppressHydrationWarning style={{ margin: 0, padding: 0, background: '#000' }}>
        {/* Blobs ambientales — rebrand mayo 2026: los 3 ahora usan
            el violeta marca #7131E1 (rgba 113,49,225). Antes eran
            mezclados violeta-rosa (139,92,246 / 236,72,153 / 168,85,247).
            Mismas opacidades para preservar profundidad sin desviarse
            de la nueva identidad sólida. */}
        {/* Blob arriba izquierda */}
        <div style={{ position:'fixed', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(113,49,225,0.40) 0%, rgba(113,49,225,0) 70%)', filter:'blur(80px)', zIndex:-1, pointerEvents:'none' }} />
        {/* Blob abajo derecha */}
        <div style={{ position:'fixed', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(113,49,225,0.35) 0%, rgba(113,49,225,0) 70%)', filter:'blur(80px)', zIndex:-1, pointerEvents:'none' }} />
        {/* Blob secundario centro derecha */}
        <div style={{ position:'fixed', top:'40%', right:'-5%', width:'40vw', height:'40vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(113,49,225,0.22) 0%, rgba(113,49,225,0) 70%)', filter:'blur(60px)', zIndex:-1, pointerEvents:'none' }} />
        {children}
      </body>
    </html>
  )
}
