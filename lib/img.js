// Imágenes de Supabase Storage a través del optimizador de Next (/_next/image):
// las fotos originales que suben los comercios pesan 1–4 MB; así el celular
// baja una versión del tamaño que realmente muestra (WebP/AVIF, cacheada en CDN).
// `w` tiene que ser uno de los anchos permitidos por Next
// (16 32 48 64 96 128 256 384 640 750 828 1080 1200 1920 2048 3840).
export function optimg(url, w = 640) {
  if (!url || typeof url !== 'string') return url
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(url)) return url
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75`
}
