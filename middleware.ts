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

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name, options) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no user session exists and trying to access protected route, redirect to /login
  if (
    !user &&
    (request.nextUrl.pathname === '/' ||
      request.nextUrl.pathname.startsWith('/history') ||
      request.nextUrl.pathname.startsWith('/habits'))
  ) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If user session exists and trying to access /login, redirect to /
  if (user && request.nextUrl.pathname === '/login') {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/', '/history/:path*', '/habits/:path*', '/login'],
};