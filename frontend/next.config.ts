import type { NextConfig } from "next";

const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:7071").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
