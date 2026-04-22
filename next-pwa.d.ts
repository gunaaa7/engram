declare module "next-pwa" {
  import type { NextConfig } from "next";

  type RuntimeCachingRule = {
    handler?: string;
    method?: string;
    options?: Record<string, unknown>;
    urlPattern: RegExp | string;
  };

  type PwaOptions = {
    dest: string;
    disable?: boolean;
    register?: boolean;
    runtimeCaching?: RuntimeCachingRule[];
    skipWaiting?: boolean;
    [key: string]: unknown;
  };

  export default function withPWA(
    options: PwaOptions,
  ): (config: NextConfig) => NextConfig;
}
