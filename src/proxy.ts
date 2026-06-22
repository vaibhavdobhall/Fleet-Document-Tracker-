import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Proxy — protect admin pages and the documents API
//
// Next.js 16 uses "proxy.ts" instead of "middleware.ts".  This file intercepts
// all incoming requests and checks for a valid admin session cookie.
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Routes that are ALWAYS public ───────────────────────────────────────
  const publicPaths = [
    '/login',
    '/api/login',
    '/api/cron',     // has its own Bearer-token auth
  ];

  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // ── Static assets & Next.js internals are always public ─────────────────
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // ── Check authentication ───────────────────────────────────────────────
  const authenticated = await isAuthenticated(request);

  if (!authenticated) {
    // API calls → 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in at /login.' },
        { status: 401 },
      );
    }

    // Page requests → redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// ── Matcher config (runs on every request except ignored paths) ────────────
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico / sitemap.xml / robots.txt (SEO files)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
  ],
};