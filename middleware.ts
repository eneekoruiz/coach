import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isE2EMockMode } from '@/lib/e2e';

const publicRoutes = ['/login', '/signup', '/auth/callback'];

export async function middleware(request: NextRequest) {
  if (isE2EMockMode()) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  // 1. Validación Estricta de Sesión (getUser)
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = publicRoutes.includes(pathname);

  // 2. Lógica de Redirección (El Guardián)
  // Regla A (Intrusos): Usuario NO autenticado y en ruta protegida
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url);
    return createRedirectResponse(redirectUrl, response);
  }

  // Regla B (Usuarios logueados): Usuario autenticado en rutas de acceso (login/signup)
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const redirectUrl = new URL('/', request.url);
    return createRedirectResponse(redirectUrl, response);
  }

  return response;
}

// Función helper para aplicar cookies en redirecciones
function createRedirectResponse(url: URL, originalResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  
  originalResponse.cookies.getAll().forEach((cookie) => {
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

// 3. Configuración del Matcher
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
