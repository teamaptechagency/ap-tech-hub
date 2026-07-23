import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  homeFor,
  ADMIN_ROLES,
  WORKER_ROLES,
  CLIENT_ROLES,
  PARTNER_ROLES,
} from "@/lib/roles";

// Routes anyone can visit without logging in
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/api/register-upload",
  "/api/cron",
];

const PUBLIC_EXACT_PATHS = [
  "/",
  "/landing",
  "/services",
  "/portfolio",
  "/team",
  "/testimonials",
  "/process",
  "/about",
  "/contact",
];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // Public routes
  if (
    PUBLIC_EXACT_PATHS.includes(pathname) ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    // Logged-in users skip login/register pages
    if (
      user &&
      (pathname.startsWith("/login") || pathname.startsWith("/register"))
    ) {
      return NextResponse.redirect(new URL(homeFor(user.role), req.url));
    }
    return NextResponse.next();
  }

  // Everything else requires login
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("reason", "auth");
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = user.role;

  if (pathname === "/profile" && !ADMIN_ROLES.includes(role)) {
    if (CLIENT_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/c/profile", req.url));
    }

    if (PARTNER_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/p/profile", req.url));
    }

    return NextResponse.redirect(new URL("/e/profile", req.url));
  }

  if (pathname === "/feedback" && !ADMIN_ROLES.includes(role)) {
    if (CLIENT_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/c/feedback", req.url));
    }

    if (PARTNER_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/p/feedback", req.url));
    }

    return NextResponse.redirect(new URL("/e/feedback", req.url));
  }

  // Portal guards
  if (pathname.startsWith("/e/") && !WORKER_ROLES.includes(role)) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }
  if (pathname.startsWith("/c/") && !CLIENT_ROLES.includes(role)) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }
  if (pathname.startsWith("/p/") && !PARTNER_ROLES.includes(role)) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }
  // Admin portal = everything not /e/, /c/ or /p/
  if (
    !pathname.startsWith("/e/") &&
    !pathname.startsWith("/c/") &&
    !pathname.startsWith("/p/") &&
    !ADMIN_ROLES.includes(role)
  ) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|css|js|map|txt|xml)$).*)",
  ],
};
