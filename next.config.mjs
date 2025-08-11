/** @type {import('next').NextConfig} */
const nextConfig = {
  // If you’re using Pages Router APIs and Prisma, include Prisma engines:
  experimental: {
    outputFileTracingIncludes: {
      'pages/api/**': [
        './node_modules/.prisma/client/**',
        './node_modules/@prisma/client/**',
      ],
    },
  },
};

export default nextConfig;