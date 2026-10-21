/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Fotos de portada, premios y logos viven en Supabase Storage (bucket público).
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
};

export default nextConfig;
