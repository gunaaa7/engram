import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^\/api\/.*/i,
      handler: "NetworkOnly",
      method: "GET",
    },
    {
      urlPattern: /^\/api\/.*/i,
      handler: "NetworkOnly",
      method: "POST",
    },
    {
      urlPattern: /^\/api\/.*/i,
      handler: "NetworkOnly",
      method: "DELETE",
    },
  ],
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
