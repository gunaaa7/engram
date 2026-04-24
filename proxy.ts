import type { NextRequest } from "next/server";

import { updateAuthSession } from "@/lib/supabaseAuthProxy";

export async function proxy(request: NextRequest) {
  return updateAuthSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|json)$).*)",
  ],
};
