/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Cloudflare Pages via @cloudflare/next-on-pages
  experimental: {
    runtime: 'edge',
  },
  images: {
    remotePatterns: [
      // Printful CDN
      {
        protocol: 'https',
        hostname: 'files.cdn.printful.com',
      },
      // Cloudflare R2 public bucket (update with your custom domain)
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      // Allow any https image (can tighten this later per client)
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
