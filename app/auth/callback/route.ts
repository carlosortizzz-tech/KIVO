import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPostHogServer } from '@/lib/posthog-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/paywall';
  const phid = searchParams.get('phid');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Cose el funnel de PostHog: la identidad anónima de antes del enlace mágico (capturada en
      // crear-cuenta/page.tsx) se funde con la cuenta real recién creada — sin esto,
      // onboarding_completado y paywall_visto quedan como 2 personas distintas (hallazgo real
      // de esta sesión, ver lib/analytics.ts).
      if (phid && data.user) {
        const ph = getPostHogServer();
        if (ph) {
          ph.alias({ distinctId: phid, alias: data.user.id });
          await ph.flush(); // la función serverless puede terminar apenas se responda el redirect
        }
      }
      const response = NextResponse.redirect(`${origin}${next}`);
      // El idioma vive en la cuenta (profiles.locale), no en el navegador — se resincroniza la
      // cookie de next-intl en cada login para que KIVO siempre hable el idioma del registro,
      // sin importar desde qué dispositivo o navegador entre el usuario.
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('locale').eq('id', data.user.id).single();
        if (profile?.locale) {
          response.cookies.set('NEXT_LOCALE', profile.locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
        }
      }
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
