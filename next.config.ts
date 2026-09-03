import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Standalone builds don't carry sharp's native @img/* binaries, which breaks
  // the built-in /_next/image optimizer on the server (400s). The landing page
  // has a single screenshot — serve it as-is.
  images: { unoptimized: true },
  ...(process.env.NEXT_PUBLIC_BASE_PATH ? { basePath: process.env.NEXT_PUBLIC_BASE_PATH } : {}),
};

export default nextConfig;
