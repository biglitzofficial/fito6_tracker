import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { remotePatterns: [] },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-select'],
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/fito6-erp.html',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
