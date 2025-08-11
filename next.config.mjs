/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      // include Prisma engines in API lambdas
      'pages/api/**': [
        './node_modules/.prisma/client/**',
        './node_modules/@prisma/client/**'
      ]
    }
  }
};
module.exports = nextConfig;
