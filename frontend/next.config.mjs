import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* ── Performance & Security ─────────────────────────────── */
  poweredByHeader: false, // Hide X-Powered-By header
  reactStrictMode: true, // Catch bugs early in dev

  /* ── Image optimization ─────────────────────────────────── */
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile pictures
      },
    ],
  },

  /* ── Security headers ───────────────────────────────────── */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  /* ── Logging (production) ───────────────────────────────── */
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  compress: true,
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root,
  },
}

export default nextConfig
