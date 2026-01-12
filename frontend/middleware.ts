import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication on the app subdomain
const publicRoutes = [
  '/login',
  '/signup',
  '/verify',
  '/reset-password',
  '/accept-invitation',
];

// Routes that are only for the marketing site (main domain)
const marketingRoutes = [
  '/careers',
  '/privacy',
  '/terms',
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route));
}

function isMarketingRoute(pathname: string): boolean {
  return marketingRoutes.some(route => pathname.startsWith(route));
}

function isAppSubdomain(host: string): boolean {
  // Handle app.revcenter.ai in production
  if (host.startsWith('app.')) {
    return true;
  }
  // In development, treat localhost as the app subdomain
  // This allows testing the full auth flow locally
  // The marketing site would be deployed separately in production
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }
  return false;
}

function hasSessionCookie(request: NextRequest): boolean {
  // Check for better-auth session cookies
  // better-auth uses these cookie names
  const sessionToken = request.cookies.get('better-auth.session_token');
  const sessionData = request.cookies.get('better-auth.session');

  return !!(sessionToken?.value || sessionData?.value);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Static files like .css, .js, .svg, etc.
  ) {
    return NextResponse.next();
  }

  const isApp = isAppSubdomain(host);
  const isAuthenticated = hasSessionCookie(request);

  // If on the app subdomain (app.revcenter.ai)
  if (isApp) {
    // Root path on app subdomain - redirect based on auth status
    if (pathname === '/') {
      if (isAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // Marketing routes should redirect to main domain (production only)
    if (isMarketingRoute(pathname) && host.startsWith('app.')) {
      // Redirect to the main domain for marketing pages
      const mainDomain = host.replace('app.', '');
      return NextResponse.redirect(new URL(`https://${mainDomain}${pathname}`, request.url));
    }

    // Dashboard routes - require authentication
    if (pathname.startsWith('/dashboard')) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Public auth routes - redirect to dashboard if already authenticated
    if (isPublicRoute(pathname) && isAuthenticated) {
      // Exception: allow accept-invitation and verify with invitation
      const isAcceptInvitation = pathname.startsWith('/accept-invitation');
      const hasInviteParam = request.nextUrl.searchParams.has('inviteId');

      if (!isAcceptInvitation && !(pathname.startsWith('/verify') && hasInviteParam)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  } else {
    // Main domain (revcenter.ai) - marketing site
    // If someone tries to access /dashboard on main domain, redirect to app subdomain
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
      // Construct the app subdomain URL
      const appHost = 'app.' + host;
      // Handle localhost specially
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        // In local dev, just let it through since we can't easily switch subdomains
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL(`https://${appHost}${pathname}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
