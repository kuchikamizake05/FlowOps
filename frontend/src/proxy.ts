import { NextResponse, type NextRequest } from "next/server";

import { sessionCookieName } from "@/lib/config";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(sessionCookieName)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/antrean/:path*", "/impor/:path*", "/pengaturan/:path*"],
};
