import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Konfiguracja dla Vercel
  output: 'standalone',
  
  // Wyłącz niektóre funkcje podczas budowania
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Konfiguracja dla API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },

  // Brak globalnych redirectów /notes → /threads — ścieżki przeniesione na /threads
}

export default nextConfig
