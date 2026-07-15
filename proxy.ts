import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { homeFor, ADMIN_ROLES, WORKER_ROLES, CLIENT_ROLES } from "@/lib/roles";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    // Logged-in users skip the login page
    if (user && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL(homeFor(user.role), req.url));
    }
    return NextResponse.next();
  }

  // Everything else requires login
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = user.role;

  // Portal guards
  if (pathname.startsWith("/e/") && !WORKER_ROLES.includes(role)) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }
  if (pathname.startsWith("/c/") && !CLIENT_ROLES.includes(role)) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }
  // Admin portal = everything not /e/ or /c/
  if (
    !pathname.startsWith("/e/") &&
    !pathname.startsWith("/c/") &&
    !ADMIN_ROLES.includes(role)
  ) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};