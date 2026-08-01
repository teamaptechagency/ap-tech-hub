import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { BUSINESS_POLICY_KEYS } from "@/lib/business-content";
import {
  homeFor,
  ADMIN_ROLES,
  WORKER_ROLES,
  CLIENT_ROLES,
  PARTNER_ROLES,
  REFERRAL_ROLES,
  GROWTH_ROLES,
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
  // Android app plumbing. Chrome fetches the asset links file unauthenticated
  // to verify the Trusted Web Activity, and the APK download has to work for
  // visitors who have not signed up yet.
  "/.well-known/",
  "/api/assetlinks",
  "/api/download/",
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
  // Android app download page, plus the PWA manifest — Chrome reads the
  // manifest before any user has signed in.
  "/download",
  "/manifest.webmanifest",
  // Transparency pages. These are linked from the public nav and footer on
  // every page, so gating them behind login sent visitors and crawlers to a
  // sign-in screen.
  "/compliance",
  "/company",
  "/client-documents",
  // Legal policies, served by app/[policy]. A publicly reachable privacy
  // policy is also a hard requirement for the Play Store listing.
  ...BUSINESS_POLICY_KEYS.map((slug) => `/${slug}`),
];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const impersonatedRole =
    user?.role === "SUPER_ADMIN"
      ? req.cookies.get("ap_impersonate_user_role")?.value
      : null;
  // Self view-switch: super admin previewing the employee interface as
  // themselves. This proxy runs before any layout and must agree with
  // getEffectiveSession() (lib/auth.ts), which already treats this cookie
  // as TEAM_MEMBER — otherwise this proxy keeps bouncing /e/* to /dashboard
  // on the raw SUPER_ADMIN role while app/(admin)/layout.tsx bounces
  // /dashboard back to /e/profile on the effective TEAM_MEMBER role,
  // producing an infinite redirect loop.
  const viewingAsEmployee =
    user?.role === "SUPER_ADMIN" &&
    !impersonatedRole &&
    req.cookies.get("ap_view_mode")?.value === "EMPLOYEE";
  const effectiveRole =
    impersonatedRole || (viewingAsEmployee ? "TEAM_MEMBER" : user?.role);

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
  // Growth Roadmap is this role's entire portal — never falls through to
  // the admin catch-all below.
  if (pathname.startsWith("/g/") && !GROWTH_ROLES.includes(role)) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }
  // Admin portal = everything not /e/, /c/, /p/, /r/ or /g/
  if (
    !pathname.startsWith("/e/") &&
    !pathname.startsWith("/c/") &&
    !pathname.startsWith("/p/") &&
    !pathname.startsWith("/r/") &&
    !pathname.startsWith("/g/") &&
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
