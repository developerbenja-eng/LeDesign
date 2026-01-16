/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@ledesign/auth',
    '@ledesign/db',
    '@ledesign/structural',
    '@ledesign/pavement',
    '@ledesign/road',
    '@ledesign/hydraulics',
    '@ledesign/terrain',
    '@ledesign/chilean-codes',
  ],
  typescript: {
    // Ignore TypeScript errors to deploy marketing pages while app is in development
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Use webpack instead of Turbopack for better monorepo compatibility with native modules (libsql)
  outputFileTracingIncludes: {
    '/api/**/*': [
      '../../packages/auth/dist/**/*',
      '../../packages/db/dist/**/*',
      '../../packages/structural/dist/**/*',
      '../../packages/chilean-codes/dist/**/*',
    ],
  },
};

module.exports = nextConfig;
