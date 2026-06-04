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
