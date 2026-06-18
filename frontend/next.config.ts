import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { remotePatterns: [] },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-select'],
  },
};

export default nextConfig;
