import type { NextConfig } from 'next';
import fs from 'fs';
import path from 'path';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
try {
  fs.writeFileSync(
    path.join(__dirname, 'public', 'fito6-config.json'),
    JSON.stringify({ apiUrl }, null, 2)
  );
} catch {
  // ignore if public is not writable during some tooling runs
}

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
