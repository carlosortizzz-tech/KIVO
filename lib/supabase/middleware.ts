import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
  // Todo el funnel de venta es público; solo /app exige sesión.
  const PUBLIC_PATHS = ['/', '/onboarding', '/crear-cuenta', '/paywall', '/login', '/auth', '/terminos', '/privacidad', '/reembolso'];
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || (p !== '/' && path.startsWith(p + '/')) || (p === '/auth' && path.startsWith('/auth'))
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
