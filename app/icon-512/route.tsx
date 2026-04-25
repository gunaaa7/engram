import { ImageResponse } from "next/og";

import { BrandMark } from "@/components/BrandMark";

export async function GET() {
  return new ImageResponse(<BrandMark />, {
    width: 512,
    height: 512,
  });
}
