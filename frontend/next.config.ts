import type { NextConfig } from 'next';

const config: NextConfig = {
  devIndicators: false,
  // The Docker image runs the standalone server; Vercel builds without it.
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' as const } : {}),
};

export default config;
