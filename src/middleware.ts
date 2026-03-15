import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/health",
  "/api/share/(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding"]);
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const { pathname } = request.nextUrl;

  // Public routes — no auth required
  if (isPublicRoute(request)) {
    if (userId && pathname === "/") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return NextResponse.next();
  }

  // Protected routes — must be signed in
  if (!userId) {
    // Share pages: redirect to sign-in with returnUrl so they come back after auth
    if (pathname.startsWith("/share/")) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect_url", pathname);
      return NextResponse.redirect(signInUrl);
    }
    await auth.protect();
    return;
  }

  // Skip onboarding check for API routes and the onboarding page itself
  if (isApiRoute(request) || isOnboardingRoute(request)) {
    return NextResponse.next();
  }

  // Check if user has completed onboarding (skip Clerk call if cookie set)
  const onboarded = request.cookies.get("onboarded")?.value === "1";
  if (!onboarded) {
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      const meta = (user.unsafeMetadata as Record<string, unknown>) || {};
      if (!meta.onboardingComplete) {
        const onboardingUrl = new URL("/onboarding", request.url);
        onboardingUrl.searchParams.set("returnUrl", pathname);
        return NextResponse.redirect(onboardingUrl);
      }
      // Set cookie so we skip Clerk call on subsequent requests
      const response = NextResponse.next();
      response.cookies.set("onboarded", "1", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 });
      return response;
    } catch {
      // If we can't check, let them through rather than block
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
