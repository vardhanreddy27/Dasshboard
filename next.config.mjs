/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don’t fail builds because of ESLint in CI
  eslint: { ignoreDuringBuilds: true },

  // Ensure Prisma engines get traced into API lambdas (Pages Router)
  outputFileTracingIncludes: {
    'pages/api/**': [
      './node_modules/.prisma/client/**',
      './node_modules/@prisma/client/**'
    ]
  }
};

export default nextConfig;
