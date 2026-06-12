/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server mode: the app now hosts an admin panel, analytics and an ad system
  // backed by SQLite, so it runs as a Node server (no longer a static export).
  // File *processing* still happens client-side; only usage events + admin data
  // touch the server.
  output: 'standalone',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Workspace packages are shipped as TypeScript source and transpiled here.
  transpilePackages: [
    '@pdfshell/pdf-core',
    '@pdfshell/ocr-engine',
    '@pdfshell/compress-engine',
  ],
  // Long-cache immutable, content-hashed assets and the generated icons/OG image
  // at the edge (behind Cloudflare) so repeat visits on metered mobile data cost
  // almost nothing. NEVER applied to HTML, sitemap.xml or robots.txt.
  async headers() {
    const oneYear = 'public, max-age=31536000, immutable';
    const oneWeek = 'public, max-age=604800';
    return [
      { source: '/_next/static/:path*', headers: [{ key: 'Cache-Control', value: oneYear }] },
      { source: '/icon', headers: [{ key: 'Cache-Control', value: oneWeek }] },
      { source: '/apple-icon', headers: [{ key: 'Cache-Control', value: oneWeek }] },
      { source: '/opengraph-image', headers: [{ key: 'Cache-Control', value: oneWeek }] },
      { source: '/pwa-icon/:spec', headers: [{ key: 'Cache-Control', value: oneWeek }] },
    ];
  },
  // Legacy /favicon.ico path → the generated icon, so crawlers/clients that fetch
  // it directly get the icon instead of a 404.
  async redirects() {
    return [{ source: '/favicon.ico', destination: '/icon', permanent: false }];
  },
  // /svc/* is proxied to the in-container converter by a route handler
  // (app/svc/[...path]) rather than a rewrite — rewrites impose a ~30s proxy
  // timeout that long CPU-AI conversions exceed; the route handler doesn't.
  webpack: (config) => {
    // The workspace packages use ESM-correct ".js" specifiers in their TS
    // source. Let webpack resolve those to the real ".ts" files.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
