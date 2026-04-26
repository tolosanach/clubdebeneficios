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
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
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
  themeColor: '#BD4BF8',
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
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#000' }}>
        {/* Blob púrpura – arriba izquierda */}
        <div style={{ position:'fixed', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.40) 0%, rgba(139,92,246,0) 70%)', filter:'blur(80px)', zIndex:-1, pointerEvents:'none' }} />
        {/* Blob rosa – abajo derecha */}
        <div style={{ position:'fixed', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.35) 0%, rgba(236,72,153,0) 70%)', filter:'blur(80px)', zIndex:-1, pointerEvents:'none' }} />
        {/* Blob púrpura secundario – centro derecha */}
        <div style={{ position:'fixed', top:'40%', right:'-5%', width:'40vw', height:'40vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.22) 0%, rgba(168,85,247,0) 70%)', filter:'blur(60px)', zIndex:-1, pointerEvents:'none' }} />
        {children}
      </body>
    </html>
  )
}
