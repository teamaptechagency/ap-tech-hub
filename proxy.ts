import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  homeFor,
  ADMIN_ROLES,
  WORKER_ROLES,
  CLIENT_ROLES,
  PARTNER_ROLES,
  REFERRAL_ROLES,
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
  // Trailing slash on purpose: "/blog" alone would also match the admin-only
  // "/blog-manager" route.
  "/blog/",
];

const PUBLIC_EXACT_PATHS = [
  "/",
  "/landing",
  "/services",
  "/portfolio",
  "/team",
  "/about",
  "/contact",
  "/blog",
  // Referral partner recruitment: the pitch and the application form are
  // public, since applicants have no account yet.
  "/partners",
  "/partners/apply",
  // Generated favicon routes. Search engines fetch these unauthenticated, so
  // redirecting them to /login would leave the site with no crawlable icon.
  "/icon",
  "/apple-icon",
];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const impersonatedRole =
    user?.role === "SUPER_ADMIN"
      ? req.cookies.get("ap_impersonate_user_role")?.value
      : null;
  const effectiveRole = impersonatedRole || user?.role;

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
      return NextResponse.redirect(new URL(homeFor(effectiveRole ?? user.role), req.url));
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

  const role = effectiveRole ?? user.role;

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
  // A referral partner is not a Special Order partner: this check keeps them
  // out of /p/ entirely, which is the whole point of the separate role.
  if (pathname.startsWith("/p/") && !PARTNER_ROLES.includes(role)) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }
  if (pathname.startsWith("/r/") && !REFERRAL_ROLES.includes(role)) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }
  // Admin portal = everything not /e/, /c/, /p/ or /r/
  if (
    !pathname.startsWith("/e/") &&
    !pathname.startsWith("/c/") &&
    !pathname.startsWith("/p/") &&
    !pathname.startsWith("/r/") &&
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
