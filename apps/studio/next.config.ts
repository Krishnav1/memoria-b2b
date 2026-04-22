import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@memoria/api-client', '@memoria/db'],
}

export default nextConfig