import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const PUBLIC_PATHS = ['/', '/onboarding', '/crear-cuenta', '/paywall', '/login', '/confirmar', '/auth', '/terminos', '/privacidad', '/reembolso'];

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

type CookieToSet = { name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] };

/**
 * Corre ANTES del middleware de next-intl. Refresca la sesión de Supabase y devuelve las cookies
 * renovadas para que proxy.ts se las pegue a la respuesta final de next-intl.
 *
 * Antes se corría después y, al renovar la sesión, se creaba un `NextResponse.next()` nuevo que
 * pisaba la reescritura de idioma de next-intl: `/app/community` llegaba al servidor sin idioma,
 * "app" se leía como locale inválido y salía 404 — solo con sesión vencida, y desaparecía al
 * recargar. Aquí nunca se crea una respuesta que reemplace a la de next-intl.
 */
export async function updateSession(request: NextRequest): Promise<{ cookies: CookieToSet[]; redirect: NextResponse | null }> {
  const cookies: CookieToSet[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // En la request para que el resto del mismo pedido (next-intl y las páginas) vea la sesión nueva.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookies.push(...cookiesToSet);
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
    const redirect = NextResponse.redirect(url);
    cookies.forEach(({ name, value, options }) => redirect.cookies.set(name, value, options));
    return { cookies, redirect };
  }

  return { cookies, redirect: null };
}
