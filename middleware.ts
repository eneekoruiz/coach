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

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/' && isExpiredConfirmationCallback(request)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('error', 'email_confirmation_link_expired');
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};