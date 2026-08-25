import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const PUBLIC_PATHS = ['/', '/onboarding', '/crear-cuenta', '/paywall', '/login', '/auth', '/terminos', '/privacidad', '/reembolso'];

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

/**
 * Corre DESPUÉS del middleware de next-intl (que ya resolvió el locale y puede
 * haber reescrito la request). Reutiliza esa `response` para no pisar sus
 * headers/cookies de locale — solo le añade el refresco de sesión de Supabase.
 */
export async function updateSession(request: NextRequest, baseResponse: NextResponse) {
  let supabaseResponse = baseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no poner lógica entre createServerClient y getUser().
  const { data: { user } } = await supabase.auth.getUser();

  // Modelo onboarding-first REGISTRADO: / -> /onboarding -> /crear-cuenta -> /paywall -> /app
  // Todo el funnel de venta es público; solo /app exige sesión. El chequeo se hace
  // sobre el path SIN el prefijo de locale (/en/app -> /app).
  const path = stripLocale(request.nextUrl.pathname);
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || (p !== '/' && path.startsWith(p + '/')) || (p === '/auth' && path.startsWith('/auth'))
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    const localeMatch = request.nextUrl.pathname.match(/^\/(en|fr|ko)(\/|$)/);
    url.pathname = localeMatch ? `/${localeMatch[1]}/login` : '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
