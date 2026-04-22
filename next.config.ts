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
};

export default withPWA(nextConfig);
