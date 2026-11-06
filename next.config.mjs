/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  env: {
    APP_NAME: 'Guichet Unique Dématérialisé FNPSS',
    APP_VERSION: '0.2.0',
    POLYGON_NETWORK: process.env.BLOCKCHAIN_NETWORK || 'polygon-amoy',
    PUBLIC_VERIFY_BASE_URL: process.env.PUBLIC_VERIFY_BASE_URL || 'https://guichet.fnpss.cd/verifier'
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      }
    ];
  }
};

export default nextConfig;

