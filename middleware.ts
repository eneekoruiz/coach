import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isExpiredConfirmationCallback(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = (searchParams.get('error_description') ?? '').toLowerCase();

  return (
    (error === 'access_denied' && errorCode === 'otp_expired') ||
    errorCode === 'otp_expired' ||
    errorDescription.includes('expired') ||
    errorDescription.includes('invalid')
  );
}

export async function middleware(request: NextRequest) {
  // 1. Check expired confirmation callback
  if (request.nextUrl.pathname === '/' && isExpiredConfirmationCallback(request)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('error', 'email_confirmation_link_expired');
    return NextResponse.redirect(redirectUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase keys are missing, don't block access (safe demo mode fallback)
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // Create an initial response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Setup the server client with standard cookies interface
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Safe and strict validation calling getUser() instead of getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasAuthParams =
    request.nextUrl.searchParams.has('code') ||
    request.nextUrl.searchParams.has('token_hash');

  // If no user session exists, auth params are not present, and trying to access protected route, redirect to /login
  if (
    !user &&
    !hasAuthParams &&
    (request.nextUrl.pathname === '/' ||
      request.nextUrl.pathname.startsWith('/history') ||
      request.nextUrl.pathname.startsWith('/habits'))
  ) {
    const redirectUrl = new URL('/login', request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // CRITICAL: Copy updated session cookies so token refreshes or deletions are propagated to the browser during redirect
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
      });
    });
    return redirectResponse;
  }

  // If user session exists and trying to access /login, redirect to /
  if (user && request.nextUrl.pathname === '/login') {
    const redirectUrl = new URL('/', request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // CRITICAL: Copy refreshed session cookies to prevent session loss on redirect
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
      });
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ['/', '/history/:path*', '/habits/:path*', '/login'],
};