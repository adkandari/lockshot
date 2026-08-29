import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Origin-Agent-Cluster",
            value: "?1",
          },
          {
            key: "Permissions-Policy",
            value: "tools=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
